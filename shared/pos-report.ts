import {Money,localDay,TASHKENT_OFFSET} from './finance';
import {salePrice} from './pricing';
export type SalesPeriod = 'today'|'yesterday'|'day'|'month'|'range';
function calendarDate(value:string) {
  const parsed=new Date(value+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)throw new RangeError('Sana noto‘g‘ri');
  return Date.parse(value+'T00:00:00Z');
}
export function salesRange(mode:SalesPeriod,day:string,month:string,endDay=day,now=new Date()) {
  let first:number,last:number;
  if(mode==='today'||mode==='yesterday')first=last=calendarDate(localDay(new Date(now.getTime()-(mode==='yesterday'?86400000:0))));
  else if(mode==='month'){
    if(!/^\d{4}-\d{2}$/.test(month))throw new RangeError('Oyni tanlang');
    first=calendarDate(month+'-01');const d=new Date(first);last=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0);
  }else{first=calendarDate(day);last=mode==='range'?calendarDate(endDay):first;}
  if(last<first||last-first>366*86400000)throw new RangeError('Davr 1–367 kun oralig‘ida bo‘lsin');
  return {from:new Date(first-TASHKENT_OFFSET).toISOString(),to:new Date(last+86400000-TASHKENT_OFFSET-1).toISOString(),label:mode==='today'?'Bugun':mode==='yesterday'?'Kecha':mode==='month'?month:mode==='range'?`${day} — ${endDay}`:day};
}
export function validateSalesRange(from:Date,to:Date) {
  if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||from>to||to.getTime()-from.getTime()>367*86400000)throw new RangeError('Hisobot oralig‘i noto‘g‘ri yoki juda katta');
}
export function mergeSales(server:any[],local:any[],tenantId:string,from:string,to:string) {
  const map=new Map(server.map(t=>[t.id,t]));
  for(const t of local)if(t.tenantId===tenantId&&!t.synced&&(!map.has(t.id)||t.pendingOperation==='void'))map.set(t.id,t);
  return [...map.values()].filter(t=>new Date(t.date)>=new Date(from)&&new Date(t.date)<=new Date(to)).sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
}
export function posSummary(transactions:any[]) {
  const active=transactions.filter(t=>t.status==='completed');
  let revenue=new Money(0),profit=new Money(0),cost=new Money(0),issues=0;
  const payments:Record<string,number>={},units:Record<string,number>={},products=new Map<string,any>();
  for(const t of active){
    revenue=revenue.add(t.totalAmount);profit=profit.add(t.totalProfit||0);cost=cost.add(new Money(t.totalAmount).sub(t.totalProfit||0));
    let lineSum=new Money(0),lineCostSum=new Money(0);
    for(const l of t.items||[]){
      if(!l?.product||!Number.isFinite(l.quantity)||l.quantity<=0){issues++;continue;}
      const unit=l.product.unit||'dona',value=new Money(salePrice(l.product)).mul(l.quantity).sub(l.discount||0),lineCost=new Money(l.product.costPrice||0).mul(l.quantity);
      lineSum=lineSum.add(value);lineCostSum=lineCostSum.add(lineCost);units[unit]=new Money(units[unit]||0).add(l.quantity).toNumber();
      const key=l.product.id+':'+unit,row=products.get(key)||{id:key,productId:l.product.id,name:l.product.name,unit,quantity:new Money(0),revenue:new Money(0),cost:new Money(0)};
      row.quantity=row.quantity.add(l.quantity);row.revenue=row.revenue.add(value);row.cost=row.cost.add(lineCost);products.set(key,row);
    }
    if(!lineSum.toDecimalPlaces(2).eq(t.totalAmount))issues++;
    if(!lineCostSum.toDecimalPlaces(2).eq(new Money(t.totalAmount).sub(t.totalProfit||0)))issues++;
    const parts=t.paymentSplits?.length?t.paymentSplits:[{method:t.paymentMethod,amount:t.totalAmount}];
    for(const part of parts)payments[part.method]=new Money(payments[part.method]||0).add(part.amount).toNumber();
  }
  const productRows=[...products.values()].map(p=>({...p,quantity:p.quantity.toNumber(),revenue:p.revenue.toDecimalPlaces(2).toNumber(),cost:p.cost.toDecimalPlaces(2).toNumber(),profit:0})).sort((a,b)=>b.revenue-a.revenue);
  // Documents round once. Allocate only the rounding remainder to the first
  // product so displayed product totals exactly reconcile to the cards.
  if(!issues&&productRows.length){
    const salesDelta=revenue.sub(productRows.reduce((s,p)=>s.add(p.revenue),new Money(0))),costDelta=cost.sub(productRows.reduce((s,p)=>s.add(p.cost),new Money(0)));
    productRows[0].revenue=new Money(productRows[0].revenue).add(salesDelta).toNumber();
    productRows[0].cost=new Money(productRows[0].cost).add(costDelta).toNumber();
  }
  for(const p of productRows)p.profit=new Money(p.revenue).sub(p.cost).toNumber();
  return {revenue:revenue.toNumber(),grossProfit:profit.toNumber(),cost:cost.toNumber(),receiptCount:active.length,
    voidedCount:transactions.filter(t=>t.status==='voided').length,units,payments,reconciliationIssues:issues,
    products:productRows};
}
