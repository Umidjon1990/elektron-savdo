import { Money, localDay, periodBounds, paymentAccount, TASHKENT_OFFSET } from './finance';
export function salesAnalytics(transactions:any[],period:string,now=new Date()) {
 const {dateFrom,dateTo}=periodBounds(period,undefined,now),active=transactions.filter(t=>t.status==='completed');
 const rows=active.filter(t=>new Date(t.date)>=dateFrom&&new Date(t.date)<=dateTo);
 const days=new Map<string,any>();for(let t=dateFrom.getTime();t<=dateTo.getTime();t+=86400000){const day=localDay(new Date(t));days.set(day,{name:day.slice(5),total:0,orders:0});}
 const hours=Array.from({length:24},(_,i)=>({hour:`${i}:00`,sales:0})),months=new Map<string,number>(),categories=new Map<string,number>(),products=new Map<string,any>(),payments:Record<string,number>={};
 for(const t of rows){const day=days.get(localDay(t.date));if(day){day.total=new Money(day.total).add(t.totalAmount).toNumber();day.orders++;}const hour=new Date(new Date(t.date).getTime()+TASHKENT_OFFSET).getUTCHours();hours[hour].sales=new Money(hours[hour].sales).add(t.totalAmount).toNumber();const month=localDay(t.date).slice(0,7);months.set(month,new Money(months.get(month)||0).add(t.totalAmount).toNumber());
  for(const l of t.items||[]){if(!l.product)continue;const value=new Money(l.product.price).mul(l.quantity).sub(l.discount||0).toNumber(),category=l.product.category||'Boshqa';categories.set(category,new Money(categories.get(category)||0).add(value).toNumber());const key=l.product.id,p=products.get(key)||{name:l.product.name,sold:0,revenue:0,unit:l.product.unit||'dona'};p.sold=new Money(p.sold).add(l.quantity).toNumber();p.revenue=new Money(p.revenue).add(value).toNumber();products.set(key,p);}
  for(const p of t.paymentSplits?.length?t.paymentSplits:[{method:t.paymentMethod,amount:t.totalAmount}]){const k=paymentAccount(p.method);payments[k]=new Money(payments[k]||0).add(p.amount).toNumber();}
 }
 const total=rows.reduce((s,t)=>s.add(t.totalAmount),new Money(0));
 const prevDay=localDay(new Date(now.getTime()-86400000)),previous=active.filter(t=>localDay(t.date)===prevDay).reduce((s,t)=>s.add(t.totalAmount),new Money(0)).toNumber();
 return {chartData:[...days.values()],hourlyData:hours,monthlyData:[...months].map(([name,total])=>({name,total})),categoryData:[...categories].map(([name,v])=>({name,value:total.gt(0)?new Money(v).div(total).mul(100).toDecimalPlaces(2).toNumber():0})),topProducts:[...products.values()].sort((a,b)=>b.revenue-a.revenue).slice(0,5),cashShare:total.gt(0)?new Money(payments.cash||0).div(total).mul(100).toDecimalPlaces(1).toNumber():0,cardShare:total.gt(0)?new Money(payments.card||0).div(total).mul(100).toDecimalPlaces(1).toNumber():0,customerCount:new Set(rows.map(t=>t.customerPhone||t.customerName).filter(Boolean)).size,prevDayTotal:previous};
}
