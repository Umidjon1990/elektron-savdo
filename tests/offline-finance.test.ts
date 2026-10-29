import 'fake-indexeddb/auto';
import {test,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
const values=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)},configurable:true});
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
localStorage.setItem('kitoblar_tenant_id','a');localStorage.setItem('kitoblar_token','synthetic-only');
const {db,clearAllData}=await import('../client/src/lib/db/index');
const {syncTransactionsFromServer,syncPendingTransactions,syncProductsFromServer,syncCategoriesFromServer}=await import('../client/src/lib/db/sync');
const {financialFetch}=await import('../client/src/lib/financial-fetch');
const originalFetch=globalThis.fetch;
const pending=(id:string,extra:any={})=>({id,tenantId:'a',date:'2026-01-01T00:00:00Z',items:[],totalAmount:10,totalProfit:1,paymentMethod:'cash',status:'completed' as const,synced:false,...extra});
after(async()=>{globalThis.fetch=originalFetch;await db.delete();});
afterEach(()=>{localStorage.setItem('kitoblar_tenant_id','a');localStorage.setItem('kitoblar_token','synthetic-only');});
test('48-hour and older unsent sales survive server reconciliation and logout clearing',async()=>{
 await db.transactions.clear();await db.transactions.bulkPut([pending('pending'),pending('synced',{synced:true})]);
 globalThis.fetch=async()=>new Response('[]',{status:200,headers:{'Content-Type':'application/json'}});
 await syncTransactionsFromServer();assert.ok(await db.transactions.get('pending'));
 await clearAllData();assert.ok(await db.transactions.get('pending'));assert.equal(await db.transactions.get('synced'),undefined);
});
test('a tenant never uploads another tenant or an unassigned legacy sale',async()=>{
 await db.transactions.clear();await db.transactions.bulkPut([pending('mine'),pending('foreign',{tenantId:'b'}),pending('unknown',{tenantId:undefined})]);let ids:string[]=[];
 globalThis.fetch=async(_u,init)=>{ids.push(JSON.parse(String(init!.body)).id);return new Response('{}',{status:200});};
 await syncPendingTransactions();assert.deepEqual(ids,['mine']);assert.equal((await db.transactions.get('foreign'))?.synced,false);assert.equal((await db.transactions.get('unknown'))?.synced,false);
});
test('pending void survives old server state, then replays sale and explicit reversal once',async()=>{
 await db.transactions.clear();await db.transactions.put(pending('void',{status:'voided',pendingOperation:'void',refundConfirmed:true}));
 globalThis.fetch=async()=>new Response(JSON.stringify([{...pending('void'),status:'completed'}]),{status:200});
 await syncTransactionsFromServer();assert.equal((await db.transactions.get('void'))?.pendingOperation,'void');
 let urls:string[]=[];globalThis.fetch=async u=>{urls.push(String(u));return new Response('{}',{status:200});};
 await syncPendingTransactions();await syncPendingTransactions();assert.deepEqual(urls,['/api/transactions','/api/transactions/void/void']);assert.equal((await db.transactions.get('void'))?.synced,true);
});
test('same-status server refresh still updates paid balance and frozen sale items',async()=>{
 await db.transactions.clear();await db.transactions.put(pending('paid',{synced:true,paidAmount:0}));
 globalThis.fetch=async()=>new Response(JSON.stringify([{...pending('paid'),paidAmount:5}]),{status:200});
 await syncTransactionsFromServer();assert.equal((await db.transactions.get('paid'))?.paidAmount,5);
});
test('a lost acknowledgement retains the idempotency key; next acknowledged action gets a new one',async()=>{
 const keys:string[]=[];let first=true;
 globalThis.fetch=async(_u,init)=>{keys.push(new Headers(init?.headers).get('Idempotency-Key')!);if(first){first=false;throw new Error('Lost response');}return new Response('{}',{status:200});};
 const init={method:'POST',body:'{"amount":10}'};
 await assert.rejects(financialFetch('/api/expenses',init));await financialFetch('/api/expenses',init);await financialFetch('/api/expenses',init);
 assert.equal(keys[0],keys[1]);assert.notEqual(keys[1],keys[2]);
});

test('online attempts retain current pricing and percentage intent during retry',async()=>{
 await db.transactions.clear();
 const items=[{product:{id:'p',price:80,costPrice:50},quantity:2,discount:16,adjustmentInputType:'percent',adjustmentType:'skidka',adjustmentValue:10}];
 await db.transactions.put(pending('online',{pricingMode:'current',items,totalAmount:144}));
 let sent:any;
 globalThis.fetch=async(_u,init)=>{sent=JSON.parse(String(init!.body));return new Response('{}',{status:409});};
 await syncPendingTransactions();
 assert.equal(sent.pricingMode,'current');assert.equal(sent.items[0].adjustmentValue,10);assert.equal(sent.items[0].adjustmentInputType,'percent');
 assert.equal((await db.transactions.get('online'))?.synced,false);
});

test('late catalog responses cannot populate a different tenant cache',async()=>{
 for(const [sync,table] of [[syncProductsFromServer,db.products],[syncCategoriesFromServer,db.categories]] as const){
  localStorage.setItem('kitoblar_tenant_id','a');await table.clear();
  globalThis.fetch=async()=>{localStorage.setItem('kitoblar_tenant_id','b');return new Response(JSON.stringify([{id:'foreign',name:'Old tenant'}]),{status:200});};
  await sync().catch(()=>undefined);assert.equal(await table.count(),0);
 }
 localStorage.setItem('kitoblar_tenant_id','a');
});

test('a void queued while sale upload is in flight is replayed before acknowledgement',async()=>{
 await db.transactions.clear();await db.transactions.put(pending('in-flight'));
 const urls:string[]=[];
 globalThis.fetch=async u=>{
  urls.push(String(u));
  if(urls.length===1)await db.transactions.update('in-flight',{status:'voided',pendingOperation:'void',refundConfirmed:true});
  return new Response('{}',{status:200});
 };
 await syncPendingTransactions();
 assert.deepEqual(urls,['/api/transactions','/api/transactions/in-flight/void']);
 assert.equal((await db.transactions.get('in-flight'))?.synced,true);
});

test('an acknowledged nasiya sale replays only its reversal after later debt payments',async()=>{
 await db.transactions.clear();await db.transactions.put(pending('settled-debt',{serverAcknowledged:true,status:'voided',pendingOperation:'void',refundConfirmed:true,paidAmount:10,paymentSplits:[{method:'nasiya',amount:10}]}));
 const urls:string[]=[];globalThis.fetch=async u=>{urls.push(String(u));return new Response('{}',{status:200});};
 await syncPendingTransactions();assert.deepEqual(urls,['/api/transactions/settled-debt/void']);
 assert.equal((await db.transactions.get('settled-debt'))?.synced,true);
});

test('a failed reversal retry does not recreate a newly acknowledged offline sale',async()=>{
 await db.transactions.clear();await db.transactions.put(pending('retry-void',{status:'voided',pendingOperation:'void',refundConfirmed:true}));
 const urls:string[]=[];let attempt=0;
 globalThis.fetch=async u=>{urls.push(String(u));return new Response('{}',{status:++attempt===2?503:200});};
 await syncPendingTransactions();assert.equal((await db.transactions.get('retry-void'))?.synced,false);
 await syncPendingTransactions();assert.deepEqual(urls,['/api/transactions','/api/transactions/retry-void/void','/api/transactions/retry-void/void']);
 assert.equal((await db.transactions.get('retry-void'))?.synced,true);
});

test('legacy database upgrade keeps unattributed sales out of the active tenant',async()=>{
 await db.delete();
 const {default:Dexie}=await import('dexie');const legacy=new Dexie('kitoblar_pos_db');
 legacy.version(1).stores({products:'id, name, barcode, category',categories:'id, name',transactions:'id, date, synced',syncMeta:'key'});
 await legacy.table('transactions').put(pending('legacy',{tenantId:undefined}));legacy.close();
 await db.open();assert.equal((await db.transactions.get('legacy'))?.tenantId,undefined);
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}',{status:200});};
 await syncPendingTransactions();assert.equal(calls,0);
});
