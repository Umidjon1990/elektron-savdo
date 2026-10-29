import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createServer} from 'node:http';
import {subscriptionState,subscriptionUpdate,countdown,tashkentInput,fromTashkentInput} from '../shared/subscription';
import {subscriptionGate} from '../server/subscription-gate';
import {registerSubscriptionRoutes} from '../server/subscription-routes';

const now=new Date('2026-10-29T05:00:00Z'),future='2026-11-10T05:00:00.000Z';
test('all paid plans expire at the exact instant independently of the old day-count field',()=>{
 for(const plan of ['free','starter','professional','premium']){
  assert.equal(subscriptionState({plan,trialEnd:now,subscriptionDays:0} as any,now.getTime()-1).blocked,false);
  assert.equal(subscriptionState({plan,trialEnd:now},now.getTime()).expired,true);
 }
});
test('warning starts at 72 hours; unlimited, suspended and invalid deadlines remain distinct',()=>{
 assert.equal(subscriptionState({trialEnd:new Date(now.getTime()+72*3600000)},now.getTime()).warning,true);
 assert.equal(subscriptionState({trialEnd:new Date(now.getTime()+72*3600000+1)},now.getTime()).warning,false);
 assert.equal(subscriptionState({trialEnd:null},now.getTime()).unlimited,true);
 assert.equal(subscriptionState({trialEnd:null,status:'suspended'},now.getTime()).blocked,true);
 assert.equal(subscriptionState({trialEnd:'bad-date'},now.getTime()).blocked,true);
 assert.equal(countdown(90061000),'1 kun 01:01:01');assert.equal(countdown(-1),'0 kun 00:00:00');
});
test('ordinary tenant editing leaves the original subscription deadline unchanged',()=>{
 assert.deepEqual(subscriptionUpdate({name:'Renamed'}, {trialEnd:future},now),{});
 assert.deepEqual(subscriptionUpdate({subscriptionAction:'keep',subscriptionDays:30}, {trialEnd:future},now),{});
});
test('renewal extends a live term from its end and an expired term from now',()=>{
 assert.equal(subscriptionUpdate({subscriptionAction:'extend',subscriptionDays:30}, {trialEnd:future},now).trialEnd?.toISOString(),'2026-12-10T05:00:00.000Z');
 assert.equal(subscriptionUpdate({subscriptionAction:'extend',subscriptionDays:7}, {trialEnd:'2026-10-01'},now).trialEnd?.toISOString(),'2026-11-05T05:00:00.000Z');
 assert.throws(()=>subscriptionUpdate({subscriptionAction:'extend',subscriptionDays:30}, {trialEnd:null},now));
});
test('subtracting days corrects the saved deadline and reverses an accidental active renewal exactly',()=>{
 const current={trialEnd:future};
 const renewed=subscriptionUpdate({subscriptionAction:'extend',subscriptionDays:30},current,now);
 const corrected=subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays:30,expectedSubscriptionEnd:renewed.trialEnd!.toISOString()},renewed,now);
 assert.equal(corrected.trialEnd?.toISOString(),future);
 assert.equal(subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays:'2'},current,now).trialEnd?.toISOString(),'2026-11-08T05:00:00.000Z');
 // Correction across the leap day preserves the time of day.
 assert.equal(subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays:2},{trialEnd:'2028-03-01T13:24:56.789Z'},now).trialEnd?.toISOString(),'2028-02-28T13:24:56.789Z');
});
test('a reduction may expire an account and never resets an already expired deadline to now',()=>{
 const expired=subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays:20},{trialEnd:future},now);
 assert.equal(expired.trialEnd?.toISOString(),'2026-10-21T05:00:00.000Z');
 assert.equal(expired.subscriptionDays,0);
 assert.equal(subscriptionState(expired,now.getTime()).blocked,true);
 assert.equal(subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays:1},{trialEnd:now},now).trialEnd?.toISOString(),'2026-10-28T05:00:00.000Z');
 assert.equal(subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays:3},{trialEnd:'2026-10-01T05:00:00.000Z'},now).trialEnd?.toISOString(),'2026-09-28T05:00:00.000Z');
});
test('reductions validate day counts, require a dated term, and reject stale duplicate corrections',()=>{
 for(const subscriptionDays of [-1,0,'',1.5,Infinity,NaN,3651,undefined,'abc'])assert.throws(()=>subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays},{trialEnd:future},now));
 for(const trialEnd of [null,undefined,'bad-date'])assert.throws(()=>subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays:1},{trialEnd},now));
 const body={subscriptionAction:'reduce',subscriptionDays:2,expectedSubscriptionEnd:future};
 const corrected=subscriptionUpdate(body,{trialEnd:future},now);
 assert.throws(()=>subscriptionUpdate(body,corrected,now),(e:any)=>e.status===409);
 assert.equal(subscriptionUpdate({subscriptionAction:'reduce',subscriptionDays:3650},{trialEnd:future},now).subscriptionDays,0);
});
test('exact Toshkent expiry is independent of browser/server timezone and checks revision',()=>{
 const iso=fromTashkentInput('2026-11-10T10:30');assert.equal(iso,'2026-11-10T05:30:00.000Z');assert.equal(tashkentInput(iso),'2026-11-10T10:30');
 assert.equal(subscriptionUpdate({subscriptionAction:'set',subscriptionExpiresAt:iso,expectedSubscriptionEnd:future},{trialEnd:future},now).trialEnd?.toISOString(),iso);
 assert.throws(()=>subscriptionUpdate({subscriptionAction:'set',subscriptionExpiresAt:iso,expectedSubscriptionEnd:null},{trialEnd:future},now),(e:any)=>e.status===409);
 assert.throws(()=>fromTashkentInput('2026-02-31T12:00'));
});
test('unlimited is explicit; malformed, fractional, past or excessive terms are rejected',()=>{
 assert.deepEqual(subscriptionUpdate({subscriptionAction:'unlimited'},{trialEnd:future},now),{trialEnd:null,subscriptionDays:0});
 for(const subscriptionDays of [-1,0,0.5,Infinity,NaN,4000])assert.throws(()=>subscriptionUpdate({subscriptionAction:'reset',subscriptionDays},{},now));
 assert.deepEqual(subscriptionUpdate({subscriptionDays:0},{},now),{trialEnd:null,subscriptionDays:0});
 for(const subscriptionExpiresAt of ['bad','2026-11-10T10:00','2026-10-29T05:00:00Z'])assert.throws(()=>subscriptionUpdate({subscriptionAction:'set',subscriptionExpiresAt},{},now));
});
test('server gate blocks reads and writes for expired paid accounts, while renewal polling stays reachable',async()=>{
 let tenant:any={plan:'premium',trialEnd:now};
 const gate=subscriptionGate(async()=>tenant,()=>now.getTime());
 const invoke=async(path:string,method='GET',isSuper=false)=>{
  let code=200,passed=false,body:any;
  const res:any={status(n:number){code=n;return this;},json(v:any){body=v;return this;}};
  await gate({path,method,tenantId:'a',user:{isSuper}} as any,res,(e?:any)=>{if(e)throw e;passed=true;});return {code,passed,body};
 };
 for(const [path,method] of [['/api/products','GET'],['/api/transactions','POST'],['/api/auth/subscription','POST']])assert.equal((await invoke(path,method)).code,403);
 assert.equal((await invoke('/api/auth/me')).passed,true);assert.equal((await invoke('/api/auth/subscription')).passed,true);
 assert.equal((await invoke('/api/admin/tenants','GET',true)).passed,true);
 tenant={plan:'premium',trialEnd:future};assert.equal((await invoke('/api/transactions','POST')).passed,true);
 tenant=null;assert.equal((await invoke('/api/products')).code,403);
});
test('subscription endpoints isolate tenants and expose persistent derived admin alerts without credentials',async t=>{
 const app=express();
 const tenants:any[]=[{id:'a',name:'Expired',slug:'expired',plan:'premium',trialEnd:new Date(Date.now()-1000),telegramBotToken:'secret',ownerPassword:'secret'},
 {id:'b',name:'Soon',slug:'soon',trialEnd:new Date(Date.now()+3600000)}, {id:'c',name:'Unlimited',slug:'unlimited',trialEnd:null}];
 const auth:any=(req:any,_res:any,next:any)=>{req.tenantId='a';req.user={isSuper:req.headers['x-super']==='true'};next();};
 const superOnly:any=(req:any,res:any,next:any)=>req.user.isSuper?next():res.status(403).json({error:'Forbidden'});
 registerSubscriptionRoutes(app,{auth,superOnly,getTenant:async id=>tenants.find(t=>t.id===id),getTenants:async()=>tenants});
 const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const own=await fetch(base+'/api/auth/subscription?tenantId=b');assert.equal(own.headers.get('cache-control'),'no-store');const data=await own.json();assert.equal(data.tenant.id,'a');assert.equal(data.subscription.expired,true);assert.equal(data.tenant.ownerPassword,undefined);assert.equal(data.tenant.telegramBotToken,true);
 assert.equal((await fetch(base+'/api/admin/subscription-alerts')).status,403);
 const alerts=await(await fetch(base+'/api/admin/subscription-alerts',{headers:{'x-super':'true'}})).json();assert.deepEqual(alerts.alerts.map((a:any)=>a.tenantId),['a','b']);assert.equal(alerts.alerts[0].ownerPassword,undefined);
});
