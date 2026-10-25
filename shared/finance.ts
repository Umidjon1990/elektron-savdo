import Decimal from "decimal.js";
import {salePrice} from './pricing';

/** UZS documents have two decimal places; quantities six. Never round lines. */
export const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const MAX_DOCUMENT = 1_000_000_000_000;
export function cartTotal(items:Array<{product:any;quantity:number;discount?:number}>) {
 return items.reduce((sum,l)=>sum.add(new Money(salePrice(l.product)).mul(l.quantity).sub(l.discount||0)),new Money(0)).toDecimalPlaces(2).toNumber();
}
export function amount(value: unknown, zero = false, scale=2): number {
  const n = new Money(String(value));
  if (!n.isFinite() || (zero ? n.lt(0) : n.lte(0)) || n.gt(MAX_DOCUMENT) || n.decimalPlaces() > scale) throw new RangeError("Summa musbat, valyuta aniqligi va ruxsat etilgan chegarada bo‘lsin");
  return n.toNumber();
}
export function paymentAccount(method: string): string {
  const m = (method || '').trim().toLowerCase();
  if (['cash','naqd'].includes(m)) return 'cash';
  if (['card','karta'].includes(m)) return 'card';
  if (m === 'nasiya') return 'nasiya';
  return m || 'unknown';
}
export function paymentParts(total: number, method: string, raw?: Array<{method:string;amount:number}>, initialPaid = 0) {
  const parts = raw?.length ? raw.map(s => ({ method: paymentAccount(s.method), amount: amount(s.amount) }))
    : method === 'nasiya' ? [{method:'cash',amount:amount(initialPaid,true)},{method:'nasiya',amount:new Money(total).sub(initialPaid).toNumber()}].filter(s=>s.amount>0)
    : [{method:paymentAccount(method),amount:total}];
  if (parts.some(p=>['mixed','unknown'].includes(p.method)) || new Set(parts.map(p=>p.method)).size !== parts.length) throw new Error('To‘lov usullari takrorlanmasin');
  if (!parts.reduce((s,p)=>s.add(p.amount),new Money(0)).eq(total)) throw new Error('To‘lovlar jami savdo summasiga aniq teng bo‘lsin');
  return { parts, paid: parts.filter(p=>p.method!=='nasiya').reduce((s,p)=>s.add(p.amount),new Money(0)).toNumber(), debt:parts.find(p=>p.method==='nasiya')?.amount || 0 };
}
export function adjustment(price: number, quantity: number, input: number, type: 'summa'|'percent', sign: 'skidka'|'ustama') {
  const base = new Money(price).mul(quantity);
  const n = type === 'percent' ? base.mul(Math.min(100,Math.max(0,input))).div(100) : new Money(Math.max(0,input));
  return (sign === 'ustama' ? n.neg() : Money.min(n,base)).toDecimalPlaces(2).toNumber();
}
export const TASHKENT_OFFSET = 5*60*60*1000;
export function localDay(value: Date|string) { return new Date(new Date(value).getTime()+TASHKENT_OFFSET).toISOString().slice(0,10); }
export function periodBounds(period: string, selectedMonth?: string, now=new Date()) {
  const local=new Date(now.getTime()+TASHKENT_OFFSET), y=local.getUTCFullYear(),m=local.getUTCMonth(),d=local.getUTCDate();
  let start=Date.UTC(y,m,d),end=Date.UTC(y,m,d+1)-1;
  if(period==='week')start=Date.UTC(y,m,d-((local.getUTCDay()+6)%7));
  if(period==='month')start=Date.UTC(y,m,1);
  if(period==='lastmonth'){start=Date.UTC(y,m-1,1);end=Date.UTC(y,m,1)-1;}
  if(period==='custom'&&/^\d{4}-\d{2}$/.test(selectedMonth||'')){const [yy,mm]=selectedMonth!.split('-').map(Number);start=Date.UTC(yy,mm-1,1);end=Date.UTC(yy,mm,1)-1;}
  return {dateFrom:new Date(start-TASHKENT_OFFSET),dateTo:new Date(end-TASHKENT_OFFSET)};
}

export interface CashEvent { date: Date|string; account: string; amount: number; source: string }
/** A balance includes opening movements; the period controls turnover only. */
export function cashSummary(events: CashEvent[], from?: Date, to?: Date) {
  const opening:Record<string,Decimal>={},accounts:Record<string,Decimal>={};let income=new Money(0),expense=new Money(0);
  for(const e of events){const t=new Date(e.date).getTime();if(to&&t>to.getTime())continue;const n=new Money(e.amount),a=e.account||'unknown';accounts[a]=(accounts[a]||new Money(0)).add(n);
    if(from&&t<from.getTime())opening[a]=(opening[a]||new Money(0)).add(n);
    else if(n.gte(0))income=income.add(n);else expense=expense.sub(n);
  }
  const out=Object.fromEntries(Object.entries(accounts).map(([k,v])=>[k,v.toNumber()]));
  return {cash:out.cash||0,card:out.card||0,otherAccounts:out,opening:Object.fromEntries(Object.entries(opening).map(([k,v])=>[k,v.toNumber()])),total:Object.values(accounts).reduce((s,v)=>s.add(v),new Money(0)).toNumber(),totalIncome:income.toNumber(),totalExpense:expense.toNumber(),uncertain:!!out.unknown};
}
