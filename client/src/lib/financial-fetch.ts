/** Keep the attempt ID through network failures and double clicks, until an
 * acknowledged response. A subsequent deliberate operation gets a new ID. */
export async function financialFetch(input:RequestInfo|URL, init?:RequestInit) {
 const method=(init?.method||'GET').toUpperCase();
 if(!['POST','PATCH','DELETE','PUT'].includes(method))return globalThis.fetch(input,init);
 const tenant=localStorage.getItem('kitoblar_tenant_id')||'unknown';
 const body=String(init?.body||'');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(tenant+method+String(input)+body));
 const key='finance-attempt:'+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const id=localStorage.getItem(key)||crypto.randomUUID();localStorage.setItem(key,id);
 const headers=new Headers(init?.headers);headers.set('Idempotency-Key',id);
 const response=await globalThis.fetch(input,{...init,headers});
 if(response.ok||(response.status>=400&&response.status<500&&response.status!==401))localStorage.removeItem(key);
 return response;
}
