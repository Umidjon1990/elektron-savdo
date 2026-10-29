import {countdown,fromTashkentInput,subscriptionState,tashkentInput} from '@shared/subscription';
import {useServerTime} from '@/hooks/use-server-time';
import {Input} from '@/components/ui/input';
export type TermDraft={action:'keep'|'extend'|'set'|'unlimited'|'reset';days:string;date:string};
export function initialTerm(end?:string|null,create=false):TermDraft{return {action:create?'reset':'keep',days:'30',date:tashkentInput(end||new Date(Date.now()+30*86400000))};}
export function termRequest(value:TermDraft,end?:string|null){
  return {subscriptionAction:value.action,...(end!==undefined?{expectedSubscriptionEnd:end}:{}),
    ...(value.action==='set'?{subscriptionExpiresAt:fromTashkentInput(value.date)}:{}),
    ...(['extend','reset'].includes(value.action)?{subscriptionDays:Number(value.days)}:{})};
}
export function SubscriptionTermEditor({value,onChange,end,create=false}:{value:TermDraft;onChange:(value:TermDraft)=>void;end?:string|null;create?:boolean}){
  const now=useServerTime(),state=subscriptionState({trialEnd:end},now);
  return <fieldset className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
    <legend className="px-1 text-sm font-semibold text-slate-800">Obuna muddati</legend>
    {!create&&<p className="text-xs text-slate-600">Hozirgi holat: <b className={state.expired?'text-red-600':'text-blue-700'}>{state.expired?'Muddati tugagan':countdown(state.remainingMs)}</b>{end&&<span className="mt-1 block">Tugashi: {new Date(end).toLocaleString('uz-UZ',{timeZone:'Asia/Tashkent',dateStyle:'medium',timeStyle:'short'})}</span>}</p>}
    <label className="block text-xs font-medium text-slate-700">Amal<select className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm" value={value.action} onChange={e=>onChange({...value,action:e.target.value as TermDraft['action']})} aria-label="Obuna muddatini boshqarish">
      {!create&&<option value="keep">Hozirgi muddatni saqlash</option>}
      {create?<option value="reset">Bugundan kun belgilash</option>:end&&<option value="extend">Mavjud muddatga kun qo‘shish</option>}
      <option value="set">Aniq sana va vaqt belgilash</option><option value="unlimited">Cheksiz muddat</option>
    </select></label>
    {['reset','extend'].includes(value.action)&&<><div className="flex gap-2">{[7,30,90,365].map(n=><button key={n} type="button" className={`rounded-lg border px-2 py-1 text-xs ${value.days===String(n)?'border-blue-500 bg-blue-600 text-white':'bg-white'}`} onClick={()=>onChange({...value,days:String(n)})}>{n} kun</button>)}</div><label className="block text-xs text-slate-700">Kunlar soni<Input type="number" min="1" max="3650" step="1" className="mt-1" value={value.days} onChange={e=>onChange({...value,days:e.target.value})} aria-label="Obuna kunlari"/></label><p className="text-xs text-slate-500">{value.action==='extend'?'Faol obuna tugashidan, tugagan bo‘lsa hozirgi vaqtdan uzaytiriladi.':'Muddat serverning hozirgi vaqtidan boshlanadi.'}</p></>}
    {value.action==='set'&&<label className="block text-xs text-slate-700">Tugash sanasi va vaqti · Toshkent (UTC+5)<Input type="datetime-local" className="mt-1" value={value.date} onChange={e=>onChange({...value,date:e.target.value})} aria-label="Obuna tugash sanasi va vaqti"/></label>}
    {value.action==='unlimited'&&<p className="text-xs text-amber-800">Saqlangandan keyin bu do‘kon uchun muddat chegarasi olib tashlanadi.</p>}
    {value.action==='keep'&&<p className="text-xs text-slate-500">Nom, tarif va limitlarni tahrirlash obuna muddatini o‘zgartirmaydi.</p>}
  </fieldset>;
}
export function TenantCountdown({tenant}:{tenant:{trialEnd:string|null;status:string}}){
  const now=useServerTime(),s=subscriptionState(tenant,now);
  return <div className={`text-xs ${s.blocked?'text-red-600':s.warning?'text-amber-700':'text-emerald-700'}`}>
    <b className="block whitespace-nowrap font-mono tabular-nums">{s.suspended?'To‘xtatilgan':s.expired?'Muddati tugagan':countdown(s.remainingMs)}</b>
    {tenant.trialEnd&&<span className="mt-1 block whitespace-nowrap text-[10px] text-slate-500">{new Date(tenant.trialEnd).toLocaleString('uz-UZ',{timeZone:'Asia/Tashkent',dateStyle:'short',timeStyle:'short'})}</span>}
  </div>;
}
