import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useLiveQuery} from 'dexie-react-hooks';
import {CalendarDays,TrendingUp,Receipt,Package,RefreshCw,ChevronRight,AlertTriangle,Eye} from 'lucide-react';
import {useAuth} from '@/lib/auth-context';
import {db} from '@/lib/db';
import {useServerTime} from '@/hooks/use-server-time';
import {localDay} from '@shared/finance';
import {salesRange,posSummary,mergeSales,type SalesPeriod} from '@shared/pos-report';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {ReceiptDialog} from './receipt-dialog';

const money=(n:number)=>n.toLocaleString('uz-UZ',{maximumFractionDigits:2});
const methodName=(m:string)=>({cash:'Naqd',naqd:'Naqd',card:'Karta',karta:'Karta',nasiya:'Nasiya',mixed:'Aralash'}[m]||m);
type Detail='revenue'|'profit'|'receipts'|'items';
export function SalesOverview(){
  const {tenant,token}=useAuth(),now=useServerTime(30000);
  const today=localDay(new Date(now));
  const [period,setPeriod]=useState<SalesPeriod>('today'),[day,setDay]=useState(today),[month,setMonth]=useState(today.slice(0,7)),[endDay,setEndDay]=useState(today);
  const [detail,setDetail]=useState<Detail|null>(null),[receipt,setReceipt]=useState<any>(null),[showVoids,setShowVoids]=useState(false);
  let range:ReturnType<typeof salesRange>|null=null,rangeError='';
  try{range=salesRange(period,day,month,endDay,new Date(now));}catch(e){rangeError=(e as Error).message;}
  const query=useQuery<any>({queryKey:['pos-report',tenant?.id,range?.from,range?.to],enabled:!!token&&!!range,
    queryFn:async({signal})=>{
      const r=await fetch(`/api/pos/report?${new URLSearchParams({from:range!.from,to:range!.to})}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal});
      if(!r.ok)throw new Error('Serverdan hisobot olinmadi');return r.json();
    },staleTime:10000,refetchInterval:30000,refetchOnWindowFocus:true});
  const cached=useLiveQuery(()=>db.transactions.filter(t=>t.tenantId===tenant?.id).toArray(),[tenant?.id])||[];
  const server=query.data?.transactions;
  const rows=range?mergeSales(server||cached,cached,tenant?.id||'',range.from,range.to):[];
  const summary=posSummary(rows),pending=rows.filter(t=>t.synced===false).length;
  const known=!!server||cached.length>0||query.isSuccess;
  const unitText=Object.entries(summary.units).map(([unit,n])=>`${money(n)} ${unit}`).join(' · ')||'0 dona';
  const cards=[{id:'revenue' as const,label:period==='today'?'Bugun':'Savdo',value:money(summary.revenue),sub:'Savdo summasi · so‘m',icon:CalendarDays,color:'from-green-500 to-emerald-600'},
    {id:'profit' as const,label:'Daromad',value:money(summary.grossProfit),sub:'Yalpi foyda · so‘m',icon:TrendingUp,color:'from-emerald-600 to-teal-600'},
    {id:'receipts' as const,label:'Cheklar',value:String(summary.receiptCount),sub:'Amaldagi cheklar',icon:Receipt,color:'from-blue-500 to-blue-600'},
    {id:'items' as const,label:'Sotildi',value:unitText,sub:`${summary.products.length} xil mahsulot`,icon:Package,color:'from-purple-500 to-purple-600'}];
  const filters=<div className="flex flex-wrap items-end gap-2" data-testid="sales-date-filter">
    <label className="text-xs font-medium text-slate-600">Davr<select className="mt-1 block h-9 rounded-lg border bg-white px-3 text-sm" value={period} onChange={e=>setPeriod(e.target.value as SalesPeriod)} aria-label="Savdo davri"><option value="today">Bugun</option><option value="yesterday">Kecha</option><option value="day">Sana bo‘yicha</option><option value="month">Oy bo‘yicha</option><option value="range">Sana oralig‘i</option></select></label>
    {(period==='day'||period==='range')&&<label className="text-xs text-slate-600">{period==='range'?'Boshlanish':'Sana'}<Input className="mt-1 h-9 w-40" type="date" value={day} onChange={e=>setDay(e.target.value)} aria-label="Boshlanish sanasi"/></label>}
    {period==='range'&&<label className="text-xs text-slate-600">Tugash<Input className="mt-1 h-9 w-40" type="date" value={endDay} onChange={e=>setEndDay(e.target.value)} aria-label="Tugash sanasi"/></label>}
    {period==='month'&&<label className="text-xs text-slate-600">Oy<Input className="mt-1 h-9 w-40" type="month" value={month} onChange={e=>setMonth(e.target.value)} aria-label="Hisobot oyi"/></label>}
    <Button size="sm" variant="outline" className="h-9" disabled={!range||query.isFetching} onClick={()=>query.refetch()} aria-label="Hisobotni yangilash"><RefreshCw className={`h-4 w-4 ${query.isFetching?'animate-spin':''}`}/></Button>
  </div>;
  return <section className="mb-4 space-y-3" aria-label="Savdo ko‘rsatkichlari">
    <div className="flex flex-wrap items-end justify-between gap-2">{filters}<p className="text-[11px] text-slate-500">Toshkent vaqti · {range?.label}<br/>{query.data?.serverNow?`Yangilandi: ${new Date(query.data.serverNow).toLocaleTimeString('uz-UZ',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit'})}`:'Ma’lumot kutilmoqda'}</p></div>
    {rangeError&&<p role="alert" className="text-sm text-red-600">{rangeError}</p>}
    {(query.isError||pending>0)&&<p role="status" className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4"/>{query.isError?'Mahalliy nusxa ko‘rsatilmoqda. Server bilan solishtirilmaguncha yakuniy emas. ':''}{pending>0?`${pending} ta amal sinxronlanishi kutilmoqda.`:''}</p>}
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">{cards.map(c=><button key={c.id} disabled={!range||!known} onClick={()=>setDetail(c.id)} className={`relative rounded-xl bg-gradient-to-br ${c.color} p-3 text-left text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 md:p-4`} data-testid={`sales-card-${c.id}`}>
      <div className="mb-2 flex items-center justify-between"><c.icon className="h-5 w-5 opacity-85"/><ChevronRight className="h-4 w-4 opacity-70"/></div><p className="text-xs font-medium opacity-90">{c.label}</p><p className="my-1 break-words text-lg font-bold tabular-nums md:text-xl">{!range?'—':!known?'…':c.value}</p><p className="text-[10px] opacity-80">{c.sub}</p>
    </button>)}</div>
    <Dialog open={detail!==null} onOpenChange={open=>{if(!open)setDetail(null);}}>
      <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader><DialogTitle>{detail==='revenue'?'Savdo tushumi':detail==='profit'?'Daromad tahlili':detail==='receipts'?'Cheklar':'Sotilgan mahsulotlar'}</DialogTitle><DialogDescription>{range?.label} · Toshkent vaqti. Bekor qilingan va qaytarilgan savdolar ko‘rsatkichlarga kirmaydi.</DialogDescription></DialogHeader>
        {filters}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div>Jami savdo<strong className="mt-1 block">{money(summary.revenue)} so‘m</strong></div><div>Tannarx<strong className="mt-1 block">{money(summary.cost)} so‘m</strong></div><div>Yalpi foyda<strong className="mt-1 block">{money(summary.grossProfit)} so‘m</strong></div></div>
        {detail==='profit'&&<p className="text-xs text-slate-600">Yalpi foyda = savdo summasi − savdo paytida saqlangan tannarx. Chegirma va ustamalar hisobga olingan. Operatsion xarajatlar Moliya bo‘limida hisoblanadi.</p>}
        {detail==='revenue'&&<div className="flex flex-wrap gap-2">{Object.entries(summary.payments).map(([m,n])=><span key={m} className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">{methodName(m)}: <b>{money(n)} so‘m</b></span>)}<p className="w-full text-[11px] text-slate-500">Nasiya ham savdo summasiga kiradi. Qarzning keyingi to‘lovi yangi savdo emas.</p></div>}
        {summary.reconciliationIssues>0&&<p role="alert" className="text-xs text-amber-700">{summary.reconciliationIssues} ta eski yozuv tafsilotini solishtirish zarur.</p>}
        {detail==='receipts'&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showVoids} onChange={e=>setShowVoids(e.target.checked)}/>Bekor qilinganlarni ham ko‘rsatish ({summary.voidedCount})</label>}
        <div className="min-h-0 flex-1 overflow-auto">
          {(detail==='profit'||detail==='items')?<table className="w-full text-left text-xs"><thead className="sticky top-0 bg-white"><tr><th className="p-2">Mahsulot</th><th className="p-2 text-right">Miqdor</th><th className="p-2 text-right">Savdo</th>{detail==='profit'&&<><th className="p-2 text-right">Tannarx</th><th className="p-2 text-right">Foyda</th></>}</tr></thead><tbody>{summary.products.map(p=><tr key={p.id} className="border-t"><td className="p-2">{p.name}</td><td className="whitespace-nowrap p-2 text-right">{money(p.quantity)} {p.unit}</td><td className="p-2 text-right">{money(p.revenue)}</td>{detail==='profit'&&<><td className="p-2 text-right">{money(p.cost)}</td><td className="p-2 text-right">{money(p.profit)}</td></>}</tr>)}</tbody></table>:<div className="space-y-2">{rows.filter(t=>t.status==='completed'||(detail==='receipts'&&showVoids&&t.status==='voided')).map(t=><div key={t.id} className="flex items-center gap-2 rounded-xl border p-3"><div className="min-w-0 flex-1"><b className="text-xs">#{t.id.slice(0,8)}</b><p className="text-[11px] text-slate-500">{new Date(t.date).toLocaleString('uz-UZ',{timeZone:'Asia/Tashkent',dateStyle:'short',timeStyle:'short'})} · {methodName(t.paymentMethod)}</p>{t.status==='voided'&&<span className="text-xs text-red-600">Bekor qilingan</span>}{t.synced===false&&<span className="text-xs text-amber-700"> Sinxronlanmagan</span>}</div><b className="text-sm">{money(t.totalAmount)} so‘m</b><Button variant="ghost" size="icon" aria-label="Chekni ko‘rish" onClick={()=>setReceipt(t)}><Eye className="h-4 w-4"/></Button></div>)}</div>}
          {!summary.receiptCount&&<p className="py-8 text-center text-sm text-slate-500">Tanlangan davrda amaldagi savdo yo‘q.</p>}
        </div>
      </DialogContent>
    </Dialog>
    <ReceiptDialog transaction={receipt} isOpen={!!receipt} onClose={()=>setReceipt(null)}/>
  </section>;
}
