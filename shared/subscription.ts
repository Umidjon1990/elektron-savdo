export const SUBSCRIPTION_WARNING_MS = 3 * 24 * 60 * 60 * 1000;
const DAY = 86_400_000;
export type SubscriptionTenant = {trialEnd?: Date|string|null; status?: string; plan?: string};
export function subscriptionState(tenant: SubscriptionTenant, now = Date.now()) {
  const end = tenant.trialEnd ? new Date(tenant.trialEnd).getTime() : null;
  const invalid = end !== null && !Number.isFinite(end);
  const suspended = tenant.status === 'suspended';
  const expired = invalid || (end !== null && end <= now);
  const remainingMs = end === null || invalid ? null : Math.max(0, end - now);
  return {blocked:suspended||expired,suspended,expired,invalid,
    unlimited:end===null,expiresAt:end===null||invalid?null:new Date(end).toISOString(),
    remainingMs,warning:!suspended&&!expired&&remainingMs!==null&&remainingMs<=SUBSCRIPTION_WARNING_MS};
}
export function countdown(ms: number|null) {
  if(ms===null)return 'Cheksiz';
  const seconds=Math.max(0,Math.ceil(ms/1000));
  return `${Math.floor(seconds/86400)} kun ${String(Math.floor(seconds/3600)%24).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
export function tashkentInput(value: Date|string) {
  return new Date(new Date(value).getTime()+5*3600000).toISOString().slice(0,16);
}
export function fromTashkentInput(value: string) {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new RangeError('Sana va vaqtni to‘liq kiriting');
  const date=new Date(value+':00+05:00');
  if(!Number.isFinite(date.getTime())||tashkentInput(date)!==value)throw new RangeError('Sana noto‘g‘ri');
  return date.toISOString();
}
export function subscriptionUpdate(body: Record<string,any>, current: SubscriptionTenant, now=new Date()) {
  const action=body.subscriptionAction??(body.subscriptionDays!==undefined?'reset':'keep');
  if(!['keep','set','extend','unlimited','reset'].includes(action))throw new RangeError('Muddat amali noto‘g‘ri');
  if(action==='keep')return {};
  if(Object.hasOwn(body,'expectedSubscriptionEnd')){
    const actual=current.trialEnd?new Date(current.trialEnd).toISOString():null;
    if(body.expectedSubscriptionEnd!==actual)throw Object.assign(new Error('Obuna muddati boshqa oynada o‘zgargan. Ma’lumotni yangilang.'),{status:409});
  }
  if(action==='unlimited')return {trialEnd:null,subscriptionDays:0};
  let end:number;
  if(action==='set'){
    if(typeof body.subscriptionExpiresAt!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(body.subscriptionExpiresAt))throw new RangeError('Tugash sanasi va vaqt mintaqasi kerak');
    end=new Date(body.subscriptionExpiresAt).getTime();
    if(!Number.isFinite(end)||end<=now.getTime()||end>now.getTime()+3650*DAY)throw new RangeError('Tugash sanasi kelajakda, 10 yil chegarasida bo‘lsin');
  }else{
    const days=Number(body.subscriptionDays);
    if(!Number.isInteger(days)||days<0||days>3650||(action==='extend'&&days===0))throw new RangeError('Muddat 1–3650 butun kun bo‘lsin');
    if(days===0){
      if(body.subscriptionAction===undefined)return {trialEnd:null,subscriptionDays:0};
      throw new RangeError('Cheksiz muddat uchun alohida amalni tanlang');
    }
    if(action==='extend'&&!current.trialEnd)throw new RangeError('Cheksiz obunaga aniq tugash sanasini belgilang');
    const previous=current.trialEnd?new Date(current.trialEnd).getTime():now.getTime();
    if(!Number.isFinite(previous))throw new RangeError('Avval tugash sanasini to‘g‘rilang');
    end=(action==='extend'?Math.max(now.getTime(),previous):now.getTime())+days*DAY;
    if(end>now.getTime()+3650*DAY)throw new RangeError('Obuna muddati 10 yildan oshmasin');
  }
  return {trialEnd:new Date(end),subscriptionDays:Math.ceil((end-now.getTime())/DAY)};
}
