import {test} from 'node:test';
import assert from 'node:assert/strict';
import {salesRange,posSummary,mergeSales,validateSalesRange} from '../shared/pos-report';
const row=(id:string,extra:any={})=>({id,tenantId:'a',status:'completed',date:'2026-10-29T05:00:00Z',totalAmount:150000,totalProfit:50000,paymentMethod:'cash',items:[{product:{id:'book',name:'Book',unit:'dona',price:80000,costPrice:50000},quantity:2,discount:10000}],...extra});
test('all four POS cards use the same completed receipt set, historical cost and discount',()=>{
 const result=posSummary([row('a'),row('void',{status:'voided'}),row('return',{status:'refunded'})]);
 assert.equal(result.revenue,150000);assert.equal(result.grossProfit,50000);assert.equal(result.cost,100000);assert.equal(result.receiptCount,1);assert.equal(result.voidedCount,1);assert.deepEqual(result.units,{dona:2});assert.equal(result.products[0].revenue,150000);assert.equal(result.products[0].profit,50000);assert.equal(result.reconciliationIssues,0);
});
test('fractional quantities are exact and different units remain separate',()=>{
 const result=posSummary([row('kg',{totalAmount:0.02,totalProfit:0.01,items:[{product:{id:'weight',name:'Weight',unit:'kg',price:0.2,costPrice:0.1},quantity:0.1}]}),row('piece')]);
 assert.equal(result.revenue,150000.02);assert.deepEqual(result.units,{kg:0.1,dona:2});assert.equal(result.products.length,2);
});
test('mixed payment and credit are sales, while debt collection cannot create additional revenue',()=>{
 const result=posSummary([row('mixed',{paymentMethod:'mixed',paymentSplits:[{method:'cash',amount:50000},{method:'card',amount:70000},{method:'nasiya',amount:30000}],paidAmount:140000})]);
 assert.deepEqual(result.payments,{cash:50000,card:70000,nasiya:30000});assert.equal(result.revenue,150000);
});
test('Toshkent midnight and leap-year month ranges have inclusive, device-independent bounds',()=>{
 const r=salesRange('today','','','',new Date('2026-10-28T20:00Z'));assert.equal(r.from,'2026-10-28T19:00:00.000Z');assert.equal(r.to,'2026-10-29T18:59:59.999Z');
 const feb=salesRange('month','','2024-02');assert.equal(feb.to,'2024-02-29T18:59:59.999Z');
 assert.throws(()=>salesRange('day','2026-02-31',''));assert.throws(()=>salesRange('range','2026-10-29','','2026-10-01'));assert.throws(()=>salesRange('month','','2026-13'));
 assert.throws(()=>validateSalesRange(new Date('invalid'),new Date()));
});
test('server and outbox merge once; foreign tenant and out-of-range records are excluded',()=>{
 const range=salesRange('today','','','',new Date('2026-10-29T05:00Z'));
 const rows=mergeSales([row('ack')],[row('ack',{synced:false}),row('offline',{synced:false}),row('foreign',{tenantId:'b',synced:false}),row('old',{date:'2026-10-01',synced:false})],'a',range.from,range.to);
 assert.equal(rows.length,2);assert.equal(posSummary(rows).revenue,300000);
 const reversed=mergeSales([row('ack')],[row('ack',{synced:false,status:'voided',pendingOperation:'void'})],'a',range.from,range.to);assert.equal(posSummary(reversed).revenue,0);
});

test('product detail display allocates document rounding without changing the card totals',()=>{
 const result=posSummary([row('rounded',{totalAmount:0.03,totalProfit:0.03,items:['a','b'].map(id=>({product:{id,name:id,price:0.015,costPrice:0,unit:'dona'},quantity:1}))})]);
 assert.equal(result.reconciliationIssues,0);assert.equal(result.products.reduce((s,p)=>s+p.revenue,0),0.03);assert.equal(result.products.reduce((s,p)=>s+p.profit,0),0.03);
});
