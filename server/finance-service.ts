import { createHash, randomUUID } from 'node:crypto';
import { Money, amount, paymentParts, paymentAccount, cashSummary, localDay, type CashEvent } from '@shared/finance';
import { priceTransaction } from './sale-pricing';
import {posSummary,validateSalesRange} from '@shared/pos-report';

type Client = { query: (sql:string, values?:any[])=>Promise<any>; release?:()=>void };
type Pool = { connect:()=>Promise<Client>; query:Client['query'] };
const numericKeys=new Set(['price','discountPrice','costPrice','stock','supplierOriginalPrice','supplierCurrencyRate','supplierPaidAmount','wholesalePrice','barcodePrice','totalAmount','totalProfit','paidAmount','initialPaidAmount','debtAmount','amount']);
export function camel(row:any):any { if(!row)return row;return Object.fromEntries(Object.entries(row).map(([k,v])=>{const key=k.replace(/_([a-z])/g,(_,x)=>x.toUpperCase());return [key,v!=null&&numericKeys.has(key)?Number(v):v]})); }
export class FinanceError extends Error {constructor(message:string,public status=400){super(message)}}
function ensure(test:unknown,message:string,status=400):asserts test {if(!test)throw new FinanceError(message,status)}
const snake=(s:string)=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
function json(v:any){return JSON.stringify(v??null)}
export class FinanceService {
 constructor(private pool:Pool){}
 async posReport(tenant:string,from:Date,to:Date){
  validateSalesRange(from,to);
  return this.snapshot(async c=>{
   const rows=(await c.query('SELECT * FROM transactions WHERE tenant_id=$1 AND date >= $2 AND date <= $3 ORDER BY date DESC,id',[tenant,from,to])).rows.map(camel);
   return {transactions:rows,summary:posSummary(rows),from:from.toISOString(),to:to.toISOString(),serverNow:new Date().toISOString()};
  });
 }
 private async snapshot(fn:(c:Client)=>Promise<any>){const c=await this.pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release?.();}}
 async operation(tenant:string,user:string,kind:string,id:string,body:any,fn:(c:Client)=>Promise<any>) {
  ensure(tenant&&id&&id.length<=200,'Amal identifikatori kerak');
  const fingerprint=createHash('sha256').update(json(body)).digest('hex'),c=await this.pool.connect();
  try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['finance:'+tenant]);
   const old=(await c.query('SELECT fingerprint,response FROM finance_operations WHERE tenant_id=$1 AND kind=$2 AND id=$3',[tenant,kind,id])).rows[0];
   if(old){ensure(old.fingerprint===fingerprint,'Shu amal IDsi boshqa ma’lumot bilan ishlatilgan',409);await c.query('COMMIT');return old.response;}
   const result=await fn(c);
   await c.query('INSERT INTO finance_operations(tenant_id,kind,id,fingerprint,response) VALUES($1,$2,$3,$4,$5)',[tenant,kind,id,fingerprint,json(result)]);
   await c.query('INSERT INTO finance_audit(tenant_id,user_id,kind,operation_id,after_value,reason) VALUES($1,$2,$3,$4,$5,$6)',[tenant,user,kind,id,json(result),String(body.reason||body.note||kind)]);
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release?.()}
 }
 private async before(c:Client,tenant:string,kind:string,id:string,value:any){await c.query('INSERT INTO finance_audit(tenant_id,user_id,kind,operation_id,before_value,reason) VALUES($1,$2,$3,$4,$5,$6)',[tenant,'system',kind,id,json(value),'Oldingi holat']);}
 private async insert(c:Client,table:string,data:Record<string,any>){const pairs=Object.entries(data).filter(([,v])=>v!==undefined);return camel((await c.query(`INSERT INTO ${table} (${pairs.map(([k])=>snake(k)).join(',')}) VALUES (${pairs.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,pairs.map(([k,v])=>['items','paymentSplits','customerInfo','allocations','metadata'].includes(k)?json(v):v))).rows[0]);}
 private async movement(c:Client,tenant:string,id:string,productId:string,quantity:number,reason:string){await c.query('INSERT INTO stock_movements(tenant_id,operation_id,product_id,quantity,reason) VALUES($1,$2,$3,$4,$5)',[tenant,id,productId,quantity,reason]);}
 private async cash(c:Client,tenant:string,value:number,account:string,source:string,note:string){if(value===0)return;await this.insert(c,'cash_register_entries',{tenantId:tenant,type:value>0?'income':'expense',amount:Math.abs(value),paymentType:account,source,note,date:new Date()});}
 private async purchase(c:Client,tenant:string,p:any,qty:number,source='purchase',opening?:number){
  ensure(p.supplierCurrency==='uzs'||p.supplierCurrency==='usd','Kirim valyutasi aniqlanmagan');
  const principal=opening??new Money(p.supplierCurrency==='usd'?p.supplierOriginalPrice:p.costPrice).mul(qty).toDecimalPlaces(p.supplierCurrency==='usd'?8:2).toNumber();
  ensure(Number.isFinite(principal)&&principal>=0&&principal<=1e12,'Kirim qiymati ruxsat etilgan chegarada bo‘lsin');
  if(p.supplierCurrency==='usd'&&principal>0)ensure(p.supplierCurrencyRate>0,'USD uchun kirim kursini kiriting');
  const paid=source==='opening'||p.supplierPaymentMethod==='nasiya'?0:principal;
  if(p.supplierPaymentMethod==='nasiya')ensure(String(p.supplier||'').trim(),'Nasiya kirimida ta’minotchi nomi kerak');
  const row=await this.insert(c,'supplier_purchases',{tenantId:tenant,productId:p.id,supplier:p.supplier||'Noma’lum ta’minotchi',currency:p.supplierCurrency,rate:p.supplierCurrencyRate||null,quantity:qty,principal,paid,paymentMethod:source==='opening'?'nasiya':paymentAccount(p.supplierPaymentMethod),source});
  if(paid)await this.cash(c,tenant,-new Money(paid).mul(p.supplierCurrency==='usd'?p.supplierCurrencyRate:1).toDecimalPlaces(2).toNumber(),paymentAccount(p.supplierPaymentMethod),'purchase',`Kirim: ${p.name}; ${principal} ${p.supplierCurrency}, kurs ${p.supplierCurrencyRate||1}`);
  return row;
 }
 async createProduct(tenant:string,user:string,id:string,data:any){return this.operation(tenant,user,'product-create',id,data,async c=>{const p=await this.insert(c,'products',{...data,tenantId:tenant,financeTracked:true});await this.movement(c,tenant,id,p.id,p.stock,'initial');await this.purchase(c,tenant,p,p.stock);return p;});}
 async editProduct(tenant:string,user:string,id:string,productId:string,data:any,expectedStock?:number){return this.operation(tenant,user,'product-edit',id,{productId,data,expectedStock},async c=>{
  const p=camel((await c.query('SELECT * FROM products WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[productId,tenant])).rows[0]);ensure(p,'Mahsulot topilmadi',404);
  if(data.stock!==undefined&&data.stock!==p.stock){ensure(expectedStock!==undefined&&new Money(expectedStock).eq(p.stock),'Qoldiq o‘zgardi. Sahifani yangilang.',409);await this.movement(c,tenant,id,p.id,new Money(data.stock).sub(p.stock).toNumber(),'count-adjustment');}
  const pairs=Object.entries(data);ensure(pairs.length,'Tahrir maydoni yo‘q');await this.before(c,tenant,'product-edit',id,p);
  return camel((await c.query(`UPDATE products SET ${pairs.map(([k],i)=>snake(k)+'=$'+(i+3)).join(',')} WHERE id=$1 AND tenant_id=$2 RETURNING *`,[productId,tenant,...pairs.map(([k,v])=>k==='metadata'?json(v):v)])).rows[0]);
 });}
 async restock(tenant:string,user:string,id:string,productId:string,quantity:number,data:any){return this.operation(tenant,user,'restock',id,{productId,quantity,data},async c=>{
  ensure(Number.isFinite(quantity)&&quantity>0&&quantity<=1e9&&new Money(quantity).decimalPlaces()<=6,'Kirim miqdori noto‘g‘ri');
  const p=camel((await c.query('SELECT * FROM products WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[productId,tenant])).rows[0]);ensure(p,'Mahsulot topilmadi',404);
  await this.before(c,tenant,'restock',id,p);const next={...p,...data};
  const pairs=Object.entries(data);const assignments=pairs.map(([k],i)=>snake(k)+'=$'+(i+4));
  const updated=camel((await c.query(`UPDATE products SET stock=stock+$3${assignments.length?','+assignments.join(','):''} WHERE id=$1 AND tenant_id=$2 RETURNING *`,[productId,tenant,quantity,...pairs.map(([,v])=>v)])).rows[0]);
  await this.movement(c,tenant,id,productId,quantity,'receipt');await this.purchase(c,tenant,next,quantity);return updated;
 });}
 async opening(tenant:string,user:string,id:string,body:any){return this.operation(tenant,user,'supplier-opening',id,body,async c=>{
  ensure(String(body.reason||'').trim().length>=5,'Tasdiqlash uchun asos yozing');
  const p=camel((await c.query('SELECT * FROM products WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[body.productId,tenant])).rows[0]);ensure(p,'Mahsulot topilmadi',404);
  ensure(!p.financeTracked,'Yangi kirim uchun eski ochilish qarzi kerak emas',409);
  ensure(!(await c.query("SELECT id FROM supplier_purchases WHERE product_id=$1 AND tenant_id=$2 AND source='opening'",[p.id,tenant])).rows.length,'Ochilish avval tasdiqlangan',409);
  const currency=body.currency;ensure(currency==='usd'||currency==='uzs','Valyutani tanlang');const balance=amount(body.amount,true,currency==='usd'?8:2);
  return this.purchase(c,tenant,{...p,supplierCurrency:currency,supplierCurrencyRate:Number(body.rate)||0},0,'opening',balance);
 });}
 async sale(tenant:string,user:string,body:any){
  ensure(Array.isArray(body.items)&&body.items.length>0&&body.items.length<=1000,'Savat tarkibi noto‘g‘ri');
  const id=String(body.id||''),date=new Date(body.date);
  ensure(Number.isFinite(date.getTime())&&date.getTime()<=Date.now()+300000,'Savdo sanasi noto‘g‘ri');
  const intent={id,date:date.toISOString(),items:(body.items||[]).map((l:any)=>({id:l.product?.id,quantity:l.quantity,discount:l.discount||0})),total:Number(body.totalAmount),method:body.paymentMethod,splits:body.paymentSplits||null,initialPaid:amount(body.paidAmount??0,true),customerName:body.customerName||null,customerPhone:body.customerPhone||null,customerInfo:body.customerInfo||null,dueDate:body.dueDate||null,delivery:body.delivery||null};
  return this.operation(tenant,user,'sale',id,intent,async c=>{
   const prior=camel((await c.query('SELECT * FROM transactions WHERE id=$1 AND tenant_id=$2',[id,tenant])).rows[0]);if(prior){ensure(prior.totalAmount===Number(body.totalAmount),'Shu savdo IDsi boshqa summa bilan ishlatilgan',409);return prior;}
   const priced=await priceTransaction(body.items,tenant,async productId=>camel((await c.query('SELECT * FROM products WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[productId,tenant])).rows[0]),body.pricingMode==='snapshot');
   const total=amount(new Money(priced.totalAmount).toDecimalPlaces(2).toNumber(),true);
   if(!new Money(total).eq(body.totalAmount))throw Object.assign(new FinanceError('Narx o‘zgargan. Yangilangan savatni tekshirib qayta tasdiqlang.',409),{items:priced.items});
   const method=paymentAccount(body.paymentMethod),parts=paymentParts(total,method,body.paymentSplits,Number(body.paidAmount)||0);
   if(parts.debt)ensure(body.customerName&&body.customerPhone&&body.dueDate,'Qarz uchun mijoz va muddat kerak');
   const byId=new Map<string,DecimalLike>();
   for(const line of priced.items){ensure(new Money(line.quantity).decimalPlaces()<=6,'Miqdor ko‘pi bilan 6 kasrli bo‘lsin');byId.set(line.product.id,(byId.get(line.product.id)||new Money(0)).add(line.quantity));}
   for(const [pid,q] of [...byId].sort(([a],[b])=>a.localeCompare(b))){const r=await c.query('UPDATE products SET stock=stock-$3 WHERE id=$1 AND tenant_id=$2 AND stock >= $3 RETURNING id',[pid,tenant,q.toString()]);ensure(r.rows.length,'Omborda yetarli qoldiq yo‘q',409);await this.movement(c,tenant,id,pid,q.neg().toNumber(),'sale');}
   const result=await this.insert(c,'transactions',{id,tenantId:tenant,date,items:priced.items,totalAmount:total,totalProfit:new Money(priced.totalProfit).toDecimalPlaces(2).toNumber(),paymentMethod:parts.parts.length>1?'mixed':method,paymentSplits:parts.parts,initialPaidAmount:parts.paid,paidAmount:parts.paid,debtStatus:parts.debt?'pending':'none',status:'completed',customerName:body.customerName||null,customerPhone:body.customerPhone||null,customerInfo:body.customerInfo||null,dueDate:body.dueDate?new Date(body.dueDate):null});
   if(body.delivery){const d=body.delivery;if(d.courierId)ensure((await c.query('SELECT id FROM staff_members WHERE id=$1 AND tenant_id=$2',[d.courierId,tenant])).rows.length,'Kuryer topilmadi');
    const order=await this.insert(c,'orders',{tenantId:tenant,customerName:d.customerName,customerPhone:d.customerPhone,address:d.address||'',items:priced.items.map(l=>({productId:l.product.id,productName:l.product.name,quantity:l.quantity,price:new Money(l.product.price).sub(new Money(l.discount).div(l.quantity)).toNumber()})),totalAmount:total,status:'confirmed',paymentMethod:result.paymentMethod,paymentStatus:parts.debt?(parts.paid?'partial':'unpaid'):'paid',debtAmount:parts.debt,deliveryType:'delivery',courier:d.courierName||'',courierId:d.courierId||null});
    await this.insert(c,'deliveries',{tenantId:tenant,orderId:order.id,address:d.address||'',courier:d.courierName||'',courierId:d.courierId||null,status:'pending'});await c.query('UPDATE transactions SET order_id=$2 WHERE id=$1',[id,order.id]);result.orderId=order.id;
   }return result;
  });
 }
 async payDebt(tenant:string,user:string,id:string,transactionId:string,body:any){return this.operation(tenant,user,'debt-payment',id,{transactionId,...body},async c=>{
  const t=camel((await c.query('SELECT * FROM transactions WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[transactionId,tenant])).rows[0]);ensure(t&&t.status==='completed'&&t.debtStatus!=='none','Faol savdo qarzi topilmadi',404);
  const journal=(await c.query('SELECT COALESCE(SUM(amount),0) AS paid FROM debt_payments WHERE transaction_id=$1 AND tenant_id=$2',[transactionId,tenant])).rows[0];
  ensure(new Money(journal.paid).lte(t.paidAmount),'Eski qarz to‘lovlari va qoldig‘i mos emas. Avval hujjatlar bilan solishtiring.',409);
  const a=amount(body.amount),paid=new Money(t.paidAmount).add(a);ensure(paid.lte(t.totalAmount),'To‘lov qolgan qarzdan katta');
  const method=paymentAccount(body.paymentMethod||'cash');ensure(!['nasiya','mixed','unknown'].includes(method),'Pul hisobini tanlang');
  await this.before(c,tenant,'debt-payment',id,t);await this.insert(c,'debt_payments',{id,tenantId:tenant,transactionId,amount:a,paymentMethod:method,date:new Date(),note:body.note||null});
  const row=camel((await c.query('UPDATE transactions SET paid_amount=$3,debt_status=$4 WHERE id=$1 AND tenant_id=$2 RETURNING *',[transactionId,tenant,paid.toString(),paid.eq(t.totalAmount)?'paid':'partial'])).rows[0]);
  if(t.orderId)await c.query('UPDATE orders SET debt_amount=$3,payment_status=$4 WHERE id=$1 AND tenant_id=$2',[t.orderId,tenant,new Money(t.totalAmount).sub(paid).toString(),paid.eq(t.totalAmount)?'paid':'partial']);return row;
 });}
 async voidSale(tenant:string,user:string,id:string,body:any){return this.operation(tenant,user,'sale-void',id,body,async c=>{
  const t=camel((await c.query('SELECT * FROM transactions WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenant])).rows[0]);ensure(t,'Savdo topilmadi',404);if(t.status==='voided')return {transaction:t,alreadyVoided:true};
  ensure(t.status==='completed','Eski qaytarish holatini avval solishtiring',409);
  ensure(body.refundConfirmed===true,'Qabul qilingan pulni qaytarishni tasdiqlang');
  const payments=(await c.query('SELECT * FROM debt_payments WHERE transaction_id=$1 AND tenant_id=$2',[id,tenant])).rows.map(camel);
  const initial=t.paymentSplits?.length?t.paymentSplits:paymentParts(t.totalAmount,t.paymentMethod,undefined,t.initialPaidAmount??new Money(t.paidAmount||0).sub(payments.reduce((s:any,p:any)=>s.add(p.amount),new Money(0))).toNumber()).parts;
  ensure(payments.every((p:any)=>p.paymentMethod),'Eski qarz to‘lovining usuli noma’lum. Avval hisobni solishtiring.',409);
  for(const p of [...initial.filter((p:any)=>p.method!=='nasiya').map((p:any)=>({amount:p.amount,paymentMethod:p.method})),...payments])await this.cash(c,tenant,-p.amount,paymentAccount(p.paymentMethod),'refund',`Savdo bekor qilindi: ${id}`);
  const quantities=new Map<string,DecimalLike>();for(const l of t.items)quantities.set(l.product.id,(quantities.get(l.product.id)||new Money(0)).add(l.quantity));
  for(const [pid,q] of quantities){const r=await c.query('UPDATE products SET stock=stock+$3 WHERE id=$1 AND tenant_id=$2 RETURNING id',[pid,tenant,q.toString()]);ensure(r.rows.length,'Qaytariladigan mahsulot o‘chirilgan; avval solishtiring',409);await this.movement(c,tenant,id,pid,q.toNumber(),'void');}
  await this.before(c,tenant,'sale-void',id,t);const row=camel((await c.query("UPDATE transactions SET status='voided',voided_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING *",[id,tenant])).rows[0]);
  if(t.orderId){await c.query("UPDATE orders SET status='cancelled',payment_status='refunded',debt_amount=0 WHERE id=$1 AND tenant_id=$2",[t.orderId,tenant]);await c.query("UPDATE deliveries SET status='cancelled' WHERE order_id=$1 AND tenant_id=$2",[t.orderId,tenant]);}return {transaction:row,alreadyVoided:false};
 });}
 async paySupplier(tenant:string,user:string,id:string,body:any){return this.operation(tenant,user,'supplier-payment',id,body,async c=>{
  const currency=body.currency==='usd'?'usd':'uzs',a=amount(body.amount,false,body.currency==='usd'?8:2),account=paymentAccount(body.paymentMethod||'cash');ensure(!['nasiya','mixed','unknown'].includes(account),'To‘lov hisobi noto‘g‘ri');
  const rows=(await c.query('SELECT * FROM supplier_purchases WHERE tenant_id=$1 AND supplier=$2 AND currency=$3 AND paid<principal ORDER BY date,id FOR UPDATE',[tenant,body.supplierName,currency])).rows;
  const owed=rows.reduce((s:any,r:any)=>s.add(new Money(r.principal).sub(r.paid)),new Money(0));ensure(new Money(a).lte(owed),'To‘lov tasdiqlangan qarzdan katta. Eski qarzni avval solishtiring.');let left=new Money(a),uzs=new Money(0);const allocations=[];
  for(const r of rows){if(left.lte(0))break;const part=Money.min(left,new Money(r.principal).sub(r.paid));ensure(currency!=='usd'||Number(r.rate)>0,'Tarixiy kurs noma’lum');await c.query('UPDATE supplier_purchases SET paid=paid+$2 WHERE id=$1',[r.id,part.toString()]);allocations.push({purchaseId:r.id,amount:part.toString(),rate:r.rate});uzs=uzs.add(part.mul(currency==='usd'?r.rate:1));left=left.sub(part);}
  await this.insert(c,'supplier_payments',{id,tenantId:tenant,supplier:body.supplierName,currency,amount:a,account,allocations});
  await this.cash(c,tenant,-uzs.toDecimalPlaces(2).toNumber(),account,'supplier-principal',`${body.supplierName}: ${a} ${currency}; kirimdagi kurslar bilan`);
  return {success:true,currency,used:a,usedUzs:uzs.toDecimalPlaces(2).toNumber(),leftover:0,productsUpdated:allocations.length};
 });}
 async cashBalance(tenant:string,from?:Date,to?:Date) { return this.snapshot(async c=>{
  ensure((!from||Number.isFinite(from.getTime()))&&(!to||Number.isFinite(to.getTime()))&&(!from||!to||from<=to),'Hisobot sanasi noto‘g‘ri');
  const [tr,dp,exp,en]=await Promise.all(['transactions','debt_payments','expenses','cash_register_entries'].map(table=>c.query(`SELECT * FROM ${table} WHERE tenant_id=$1${['expenses','cash_register_entries'].includes(table)?' AND voided_at IS NULL':''}`,[tenant])));
  const txns=tr.rows.map(camel),payments=dp.rows.map(camel),events:CashEvent[]=[];let issues=0;
  for(const t of txns){if(!['completed','voided'].includes(t.status))issues++;if(t.status==='voided'&&!t.voidedAt){issues++;continue;}const ps=payments.filter((p:any)=>p.transactionId===t.id);let parts;
   try{parts=t.paymentSplits?.length?t.paymentSplits:paymentParts(t.totalAmount,t.paymentMethod,undefined,t.initialPaidAmount??(t.paymentMethod==='nasiya'?new Money(t.paidAmount||0).sub(ps.reduce((s:any,p:any)=>s.add(p.amount),new Money(0))).toNumber():0)).parts;}catch{issues++;continue;}
   for(const p of parts)if(paymentAccount(p.method)!=='nasiya')events.push({date:t.date,account:paymentAccount(p.method),amount:p.amount,source:'sale'});
  }
  for(const p of payments){if(!p.paymentMethod)issues++;events.push({date:p.date,account:p.paymentMethod?paymentAccount(p.paymentMethod):'unknown',amount:p.amount,source:'debt-payment'});}
  for(const e of exp.rows.map(camel)){if(!e.paymentMethod)issues++;events.push({date:e.date,account:e.paymentMethod?paymentAccount(e.paymentMethod):'unknown',amount:-e.amount,source:'expense'});}
  for(const e of en.rows.map(camel))events.push({date:e.date,account:paymentAccount(e.paymentType),amount:e.type==='income'?e.amount:-e.amount,source:e.source});
  const result=cashSummary(events,from,to);return {...result,uncertain:result.uncertain||issues>0,reconciliationIssues:issues,nasiya:txns.filter((t:any)=>t.status==='completed').reduce((s:any,t:any)=>s.add(new Money(t.totalAmount).sub(t.paidAmount||0)),new Money(0)).toNumber(),withdrawn:en.rows.filter((e:any)=>e.type==='withdrawal'&&(!from||new Date(e.date)>=from)&&(!to||new Date(e.date)<=to)).reduce((s:any,e:any)=>s.add(e.amount),new Money(0)).toNumber()};
 }); }
 async supplierSummary(tenant:string) { return this.snapshot(async c=>{
  const [prods,ps,sups]=await Promise.all([c.query('SELECT * FROM products WHERE tenant_id=$1',[tenant]),c.query('SELECT * FROM supplier_purchases WHERE tenant_id=$1 ORDER BY date,id',[tenant]),c.query('SELECT * FROM suppliers WHERE tenant_id=$1',[tenant])]);
  const map=new Map<string,any>();const get=(name:string)=>{if(!map.has(name))map.set(name,{name,phone:'',products:[],totalAmount:0,totalAmountUsd:0,totalProducts:0,totalItems:0,naqd:0,karta:0,nasiya:0,naqdUsd:0,kartaUsd:0,nasiyaUsd:0,unknownDebtCount:0});return map.get(name)};
  for(const s of sups.rows)get(s.name).phone=s.phone||'';
  for(const p of prods.rows.map(camel)){
   const purchases=ps.rows.filter((r:any)=>r.product_id===p.id),sup=get(p.supplier||'Noma’lum ta’minotchi');
   if(!p.financeTracked&&!purchases.some((r:any)=>r.source==='opening')&&p.supplierPaymentMethod==='nasiya'){
    sup.unknownDebtCount++;sup.products.push({...p,paymentMethod:'nasiya',amount:null,amountUsd:null,paidAmount:null,debtStatus:'unknown',needsReconciliation:true});
   }
  }
  for(const r of ps.rows){const p=prods.rows.map(camel).find((p:any)=>p.id===r.product_id);const sup=get(r.supplier),principal=new Money(r.principal),paid=new Money(r.paid),rate=r.currency==='usd'?Number(r.rate):1,uzs=principal.mul(rate||0),paidUzs=paid.mul(rate||0);
   const row={id:r.id,productId:r.product_id,name:p?.name||'O‘chirilgan mahsulot',costPrice:p?.costPrice||0,stock:Number(r.quantity),amount:uzs.toNumber(),amountUsd:r.currency==='usd'?principal.toNumber():0,supplierCurrency:r.currency,supplierOriginalPrice:p?.supplierOriginalPrice||0,supplierCurrencyRate:rate,paidAmount:paidUzs.toNumber(),paymentMethod:r.payment_method==='nasiya'?'nasiya':r.payment_method==='card'?'karta':'naqd',debtStatus:paid.eq(principal)?'paid':paid.gt(0)?'partial':'pending',purchase:true};
   sup.products.push(row);sup.totalAmount+=row.amount;sup.totalAmountUsd+=row.amountUsd;sup.totalProducts++;sup.totalItems+=row.stock;sup.nasiya+=uzs.sub(paidUzs).toNumber();sup.nasiyaUsd+=r.currency==='usd'?principal.sub(paid).toNumber():0;if(r.payment_method!=='nasiya'){const key=r.payment_method==='card'?'karta':'naqd';sup[key]+=row.amount;sup[key+'Usd']+=row.amountUsd;}
  }
  const suppliers=[...map.values()];const totals:any={supplierCount:suppliers.length,legacyProductsCount:prods.rows.filter((p:any)=>!p.finance_tracked).length,unknownDebtCount:suppliers.reduce((s,r)=>s+r.unknownDebtCount,0)};for(const [k,f] of Object.entries({totalAmount:'totalAmount',totalAmountUsd:'totalAmountUsd',totalNaqd:'naqd',totalKarta:'karta',totalNasiya:'nasiya',totalNaqdUsd:'naqdUsd',totalKartaUsd:'kartaUsd',totalNasiyaUsd:'nasiyaUsd'}))totals[k]=suppliers.reduce((s,r)=>new Money(s).add(r[f]).toNumber(),0);return {suppliers,totals};
 }); }
 async entry(tenant:string,user:string,id:string,table:'expenses'|'cash_register_entries',body:any,entryId?:string,remove=false){return this.operation(tenant,user,table+(remove?'-void':entryId?'-edit':'-create'),id,{...body,entryId,remove},async c=>{
  const old=entryId?camel((await c.query(`SELECT * FROM ${table} WHERE id=$1 AND tenant_id=$2 AND voided_at IS NULL FOR UPDATE`,[entryId,tenant])).rows[0]):undefined;
  if(entryId)ensure(old,'Yozuv topilmadi',404);if(old?.source)ensure(old.source==='manual','Bog‘langan pul harakatini to‘g‘ridan-to‘g‘ri o‘zgartirib bo‘lmaydi');
  if(old)await this.before(c,tenant,table,id,old);
  if(remove){await c.query(`UPDATE ${table} SET voided_at=now() WHERE id=$1 AND tenant_id=$2`,[entryId,tenant]);return {success:true};}
  const keys=table==='expenses'?['amount','categoryId','description','date','paymentMethod','classification']:['type','amount','paymentType','categoryName','counterparty','note','date'];
  const data:any={};for(const key of keys)if(body[key]!==undefined)data[key]=body[key];
  const merged={...old,...data};amount(merged.amount);const date=new Date(merged.date||Date.now());ensure(Number.isFinite(date.getTime()),'Sana noto‘g‘ri');data.date=date;
  if(table==='expenses'){
   if(body.classification!==undefined)ensure(['principal','operating','unclassified'].includes(body.classification),'Xarajat tasnifi noto‘g‘ri');
   data.paymentMethod=paymentAccount(merged.paymentMethod||(old?'unknown':'cash'));data.classification=['principal','operating','unclassified'].includes(merged.classification)?merged.classification:'operating';
   if(merged.categoryId)ensure((await c.query('SELECT id FROM expense_categories WHERE id=$1 AND tenant_id=$2',[merged.categoryId,tenant])).rows.length,'Xarajat kategoriyasi topilmadi');
  }else{ensure(['income','expense','withdrawal'].includes(merged.type),'Kassa amali noto‘g‘ri');data.paymentType=paymentAccount(merged.paymentType||'cash');}
  ensure(!['nasiya','mixed','unknown'].includes(data.paymentMethod||data.paymentType),'Pul hisobini tanlang');
  if(!entryId)return this.insert(c,table,{...data,tenantId:tenant,...(table==='cash_register_entries'?{createdBy:user}:{} )});
  const pairs=Object.entries(data);return camel((await c.query(`UPDATE ${table} SET ${pairs.map(([k],i)=>snake(k)+'=$'+(i+3)).join(',')} WHERE id=$1 AND tenant_id=$2 RETURNING *`,[entryId,tenant,...pairs.map(([,v])=>v)])).rows[0]);
 });}
 async financialSummary(tenant:string,from:Date,to:Date) { return this.snapshot(async c=>{
  const [tx,ex]=await Promise.all([c.query("SELECT total_amount,total_profit,payment_splits,payment_method FROM transactions WHERE tenant_id=$1 AND status='completed' AND date >= $2 AND date <= $3",[tenant,from,to]),c.query('SELECT * FROM expenses WHERE tenant_id=$1 AND voided_at IS NULL AND date >= $2 AND date <= $3',[tenant,from,to])]);
  const rows=tx.rows.map(camel),expenses=ex.rows.map(camel);const revenue=rows.reduce((s:any,t:any)=>s.add(t.totalAmount),new Money(0)),gross=rows.reduce((s:any,t:any)=>s.add(t.totalProfit),new Money(0)),cost=expenses.filter((e:any)=>e.classification==='operating').reduce((s:any,e:any)=>s.add(e.amount),new Money(0));
  const unclassifiedCount=expenses.filter((e:any)=>e.classification==='unclassified').length,paymentBreakdown:Record<string,number>={};
  for(const t of rows)for(const part of t.paymentSplits?.length?t.paymentSplits:[{method:t.paymentMethod,amount:t.totalAmount}]){const key=paymentAccount(part.method);paymentBreakdown[key]=new Money(paymentBreakdown[key]||0).add(part.amount).toNumber();}
  return {revenue:revenue.toNumber(),totalProfit:gross.toNumber(),expensesTotal:cost.toNumber(),profit:unclassifiedCount?null:gross.sub(cost).toNumber(),unclassifiedCount,profitKnown:!unclassifiedCount,paymentBreakdown,transactionCount:rows.length};
 }); }
 async daily(tenant:string,from:Date,to:Date){
  ensure(Number.isFinite(from.getTime())&&Number.isFinite(to.getTime())&&from<=to&&to.getTime()-from.getTime()<=3660*86400000,'Hisobot oralig‘i noto‘g‘ri yoki juda katta');
  return this.snapshot(async c=>{
   const [tx,ex]=await Promise.all([c.query("SELECT date,total_amount,total_profit,payment_splits,payment_method FROM transactions WHERE tenant_id=$1 AND status='completed' AND date >= $2 AND date <= $3",[tenant,from,to]),c.query('SELECT date,amount,classification FROM expenses WHERE tenant_id=$1 AND voided_at IS NULL AND date >= $2 AND date <= $3',[tenant,from,to])]);
   const map=new Map<string,any>();
   const firstDay=Date.parse(localDay(from)),lastDay=Date.parse(localDay(to));
   for(let t=firstDay;t<=lastDay;t+=86400000){const date=new Date(t).toISOString().slice(0,10);map.set(date,{date,revenue:new Money(0),totalProfit:new Money(0),expenses:new Money(0),profitKnown:true,payments:{}});}
   for(const t of tx.rows.map(camel)){const row=map.get(localDay(t.date));if(!row)continue;row.revenue=row.revenue.add(t.totalAmount);row.totalProfit=row.totalProfit.add(t.totalProfit);for(const part of t.paymentSplits?.length?t.paymentSplits:[{method:t.paymentMethod,amount:t.totalAmount}]){const key=paymentAccount(part.method);row.payments[key]=new Money(row.payments[key]||0).add(part.amount).toNumber();}}
   for(const e of ex.rows.map(camel)){const row=map.get(localDay(e.date));if(!row)continue;if(e.classification==='unclassified')row.profitKnown=false;if(e.classification==='operating')row.expenses=row.expenses.add(e.amount);}
   return [...map.values()].map(r=>({...r,revenue:r.revenue.toNumber(),totalProfit:r.totalProfit.toNumber(),expenses:r.expenses.toNumber(),profit:r.profitKnown?r.totalProfit.sub(r.expenses).toNumber():null}));
  });
 }

 async payIndependent(tenant:string,user:string,id:string,debtId:string,body:any){return this.operation(tenant,user,'independent-payment',id,{debtId,...body},async c=>{
  const old=camel((await c.query('SELECT * FROM independent_debts WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[debtId,tenant])).rows[0]);ensure(old&&old.status!=='voided','Nasiya topilmadi',404);
  const a=amount(body.amount),paid=new Money(old.paidAmount).add(a);ensure(paid.lte(old.totalAmount),'To‘lov qarzdan katta');
  await this.before(c,tenant,'independent-payment',id,old);await this.insert(c,'independent_debt_payments',{id,tenantId:tenant,debtId,amount:a,note:body.note||'',date:new Date()});
  return camel((await c.query('UPDATE independent_debts SET paid_amount=$3,status=$4 WHERE id=$1 AND tenant_id=$2 RETURNING *',[debtId,tenant,paid.toString(),paid.eq(old.totalAmount)?'paid':'partial'])).rows[0]);
 });}
 async references(tenant:string,body:any){
  for(const [field,table] of Object.entries({orderId:'orders',customerId:'customers',courierId:'staff_members'})){
   if(body[field]&&!((await this.pool.query(`SELECT id FROM ${table} WHERE id=$1 AND tenant_id=$2`,[body[field],tenant])).rows.length))return false;
  }return true;
 }
 async deleteProduct(tenant:string,user:string,id:string,productId:string){return this.operation(tenant,user,'product-delete',id,{productId},async c=>{
  const p=camel((await c.query('SELECT * FROM products WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[productId,tenant])).rows[0]);ensure(p,'Mahsulot topilmadi',404);
  ensure(p.stock===0,'Qoldig‘i bor mahsulot o‘chirilmaydi. Avval qoldiqni hujjat asosida solishtiring.',409);
  ensure(!(await c.query('SELECT id FROM supplier_purchases WHERE tenant_id=$1 AND product_id=$2 AND paid<principal',[tenant,productId])).rows.length,'Mahsulotning ta’minotchi qarzi yopilmagan',409);
  if(!p.financeTracked&&p.supplierPaymentMethod==='nasiya')ensure((await c.query("SELECT id FROM supplier_purchases WHERE tenant_id=$1 AND product_id=$2 AND source='opening'",[tenant,productId])).rows.length,'Eski qarzni avval tasdiqlang',409);
  await this.before(c,tenant,'product-delete',id,p);await c.query('DELETE FROM products WHERE id=$1 AND tenant_id=$2',[productId,tenant]);return {success:true};
 });}
 async linkedOrder(tenant:string,orderId:string){return (await this.pool.query('SELECT id,status FROM transactions WHERE tenant_id=$1 AND order_id=$2',[tenant,orderId])).rows[0];}

 async auditTrail(tenant:string,entityType?:string,entityId?:string){return (await this.pool.query("SELECT * FROM finance_audit WHERE tenant_id=$1 AND ($2::text IS NULL OR kind LIKE $2||'%') AND ($3::text IS NULL OR operation_id=$3 OR after_value->>'id'=$3 OR before_value->>'id'=$3) ORDER BY date DESC LIMIT 200",[tenant,entityType||null,entityId||null])).rows.map((r:any)=>({id:r.id,tenantId:tenant,entityType:r.kind,entityId:r.operation_id,action:r.kind,userId:r.user_id,createdAt:r.date,changes:{before:r.before_value,after:r.after_value,reason:r.reason}}));}
 async independent(tenant:string,user:string,id:string,body:any,debtId?:string,voided=false){return this.operation(tenant,user,'independent-'+(voided?'void':debtId?'edit':'create'),id,{body,debtId,voided},async c=>{
  const old=debtId?camel((await c.query('SELECT * FROM independent_debts WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[debtId,tenant])).rows[0]):null;
  if(debtId)ensure(old,'Nasiya topilmadi',404);if(old?.status==='voided'){ensure(voided,'Bekor qilingan qarzni tahrirlab bo‘lmaydi');return old;}
  if(old)await this.before(c,tenant,'independent',id,old);
  if(voided)return camel((await c.query("UPDATE independent_debts SET status='voided',updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING *",[debtId,tenant])).rows[0]);
  const fields=['debtorName','phone','itemDescription','totalAmount','dueDate','note'];const data:any=Object.fromEntries(fields.filter(k=>body[k]!==undefined).map(k=>[k,body[k]])),merged={...old,...data};
  amount(merged.totalAmount);ensure(merged.totalAmount>=(old?.paidAmount||0),'Jami to‘langan summadan kam bo‘lmasin');ensure(merged.debtorName&&merged.itemDescription&&Number.isFinite(new Date(merged.dueDate).getTime()),'Nasiya ma’lumotlarini to‘ldiring');
  data.dueDate=new Date(merged.dueDate);data.status=merged.totalAmount===(old?.paidAmount||0)?'paid':old?.paidAmount?'partial':'pending';
  if(!old)return this.insert(c,'independent_debts',{...data,tenantId:tenant});
  const pairs=Object.entries(data);return camel((await c.query(`UPDATE independent_debts SET ${pairs.map(([k],i)=>snake(k)+'=$'+(i+3)).join(',')},updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING *`,[debtId,tenant,...pairs.map(([,v])=>v)])).rows[0]);
 });}
}
type DecimalLike=InstanceType<typeof Money>;
