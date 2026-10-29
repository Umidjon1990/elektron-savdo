import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'wouter';
import {Bell,Clock,ChevronRight} from 'lucide-react';
import {useAuth} from '@/lib/auth-context';
import {useServerTime} from '@/hooks/use-server-time';
import {subscriptionState,countdown} from '@shared/subscription';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
export function SubscriptionNotice(){
  const {user,tenant,token}=useAuth(),now=useServerTime(),[ack,setAck]=useState(''),[expanded,setExpanded]=useState(false);
  const notices=useQuery<any>({queryKey:['subscription-alerts',user?.id],enabled:!!user?.isSuper,
    queryFn:async()=>{const r=await fetch('/api/admin/subscription-alerts',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});if(!r.ok)throw new Error('Bildirishnoma olinmadi');return r.json();},refetchInterval:30000,refetchOnWindowFocus:true});
  if(user?.isSuper){
    const alerts=(notices.data?.alerts||[]).map((a:any)=>({...a,expired:a.expired||(a.expiresAt&&Date.parse(a.expiresAt)<=now),remainingMs:a.expiresAt?Math.max(0,Date.parse(a.expiresAt)-now):a.remainingMs}));
    if(!alerts.length)return null;
    return <aside className="fixed bottom-20 left-3 z-40 max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-200 bg-white p-3 shadow-lg md:bottom-4 md:left-56" data-testid="admin-subscription-notices">
      <button className="flex items-center gap-2 text-sm font-semibold text-amber-800" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}><Bell className="h-4 w-4"/>{alerts.filter((a:any)=>a.expired).length} ta obuna tugagan · {alerts.filter((a:any)=>!a.expired).length} ta yaqinlashmoqda</button>
      {expanded&&<div className="mt-3 max-h-60 space-y-2 overflow-y-auto">{alerts.map((a:any)=><Link key={a.tenantId} href={`${tenant?.slug?`/store/${tenant.slug}/admin/super`:'/admin/super'}?tenantId=${encodeURIComponent(a.tenantId)}`} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-2 text-xs"><span>{a.name}<span className={`block ${a.expired?'text-red-600':'text-amber-700'}`}>{a.expired?'Muddati tugagan':countdown(a.remainingMs)}</span></span><ChevronRight className="h-4 w-4"/></Link>)}</div>}
    </aside>;
  }
  if(!tenant||!user)return null;
  const state=subscriptionState(tenant,now);
  if(state.unlimited||state.blocked)return null;
  const key=`subscription-warning:${user.id}:${tenant.id}:${state.expiresAt}`;
  const acknowledged=ack===key||localStorage.getItem(key)==='seen';
  const understand=()=>{localStorage.setItem(key,'seen');setAck(key);};
  return <>
    <aside className={`fixed bottom-20 left-3 z-30 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm md:bottom-3 md:left-56 ${state.warning?'border-amber-300 bg-amber-50 text-amber-900':'border-slate-200 bg-white/95 text-slate-600'}`} data-testid="subscription-countdown">
      <Clock className="h-4 w-4 shrink-0"/><div><span className="block font-semibold">Obuna: {countdown(state.remainingMs)}</span><span className="text-[10px]">Tugashi: {new Date(state.expiresAt!).toLocaleString('uz-UZ',{timeZone:'Asia/Tashkent',dateStyle:'medium',timeStyle:'short'})}</span></div>
    </aside>
    <Dialog open={state.warning&&!acknowledged} onOpenChange={()=>{}}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col items-center justify-center rounded-none border-0 p-6 text-center sm:rounded-none" onEscapeKeyDown={e=>e.preventDefault()} onPointerDownOutside={e=>e.preventDefault()} hideClose>
        <Clock className="mb-3 h-16 w-16 text-amber-500"/>
        <DialogHeader><DialogTitle className="text-center text-2xl">Obuna muddati tugashiga 3 kun yoki undan kam qoldi</DialogTitle><DialogDescription className="mx-auto max-w-md text-center">Ishingiz uzilmasligi uchun to‘lovni amalga oshirib, admin bilan bog‘laning. Hozir ishlashda davom etishingiz mumkin.</DialogDescription></DialogHeader>
        <p className="my-5 font-mono text-2xl font-bold text-amber-700">{countdown(state.remainingMs)}</p>
        <Button size="lg" onClick={understand} data-testid="button-subscription-understood">Tushundim, davom etaman</Button>
      </DialogContent>
    </Dialog>
  </>;
}
