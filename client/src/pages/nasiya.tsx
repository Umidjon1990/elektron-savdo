import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, getAuthHeaders } from "@/lib/auth-context";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Banknote, CalendarDays, Check, ChevronRight, CircleDollarSign, Edit3, FileText, HandCoins, Loader2, Plus, RotateCcw, Search, ShieldAlert, UserRound, X } from "lucide-react";

export interface IndependentDebt {
  id: string; tenantId: string; debtorName: string; phone: string; itemDescription: string;
  totalAmount: number; paidAmount: number; dueDate: string; status: "pending" | "partial" | "paid" | "voided";
  note?: string; createdAt: string; updatedAt: string;
}
export interface IndependentDebtPayment { id: string; tenantId: string; debtId: string; amount: number; date: string; note?: string; }
type DebtDetail = IndependentDebt & { payments: IndependentDebtPayment[] };
type FormState = { debtorName: string; phone: string; itemDescription: string; totalAmount: string; dueDate: string; note: string };

const emptyForm: FormState = { debtorName: "", phone: "", itemDescription: "", totalAmount: "", dueDate: "", note: "" };
const money = (value: number) => `${Math.round(value || 0).toLocaleString("uz-UZ")} so'm`;
const date = (value?: string) => value ? new Date(value).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Muddat belgilanmagan";
const isOverdue = (debt: IndependentDebt) => {
  if (debt.status === "paid" || debt.status === "voided" || !debt.dueDate) return false;
  const dueDay = new Date(debt.dueDate);
  dueDay.setHours(23, 59, 59, 999);
  return dueDay.getTime() < Date.now();
};

function statusMeta(debt: IndependentDebt) {
  if (debt.status === "voided") return { label: "Bekor qilingan", cls: "bg-slate-100 text-slate-500 border-slate-200" };
  if (debt.status === "paid") return { label: "To'langan", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (isOverdue(debt)) return { label: "Muddati o'tgan", cls: "bg-rose-50 text-rose-700 border-rose-200" };
  if (debt.status === "partial") return { label: "Qisman", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Kutilmoqda", cls: "bg-sky-50 text-sky-700 border-sky-200" };
}

export default function NasiyaPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "paid" | "voided">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IndependentDebt | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
  const debtsQuery = useQuery({
    queryKey: ["independent-debts"],
    queryFn: async () => {
      const response = await fetch("/api/independent-debts", { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Qarzlar yuklanmadi");
      return response.json() as Promise<IndependentDebt[]>;
    },
    enabled: !!token,
  });
  const detailQuery = useQuery({
    queryKey: ["independent-debt", selectedId],
    queryFn: async () => {
      const response = await fetch(`/api/independent-debts/${selectedId}`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Ma'lumot yuklanmadi");
      return response.json() as Promise<DebtDetail>;
    },
    enabled: !!selectedId && sheetOpen,
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["independent-debts"] });
    if (selectedId) queryClient.invalidateQueries({ queryKey: ["independent-debt", selectedId] });
  };
  const createMutation = useMutation({
    mutationFn: async (body: FormState) => {
      const response = await fetch("/api/independent-debts", { method: "POST", headers, body: JSON.stringify({ ...body, totalAmount: Number(body.totalAmount), note: body.note || undefined }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Qarz qo'shilmadi");
      return response.json();
    },
    onSuccess: () => { invalidate(); setFormOpen(false); setForm(emptyForm); toast({ title: "Qarz daftarga qo'shildi" }); },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: FormState }) => {
      const response = await fetch(`/api/independent-debts/${id}`, { method: "PATCH", headers, body: JSON.stringify({ ...body, totalAmount: Number(body.totalAmount), note: body.note }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Qarz yangilanmadi");
      return response.json();
    },
    onSuccess: () => { invalidate(); setFormOpen(false); setEditing(null); toast({ title: "Qarz ma'lumotlari saqlandi" }); },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });
  const paymentMutation = useMutation({
    mutationFn: async ({ id, amount, note }: { id: string; amount: number; note: string }) => {
      const response = await fetch(`/api/independent-debts/${id}/payments`, { method: "POST", headers, body: JSON.stringify({ amount, note: note || undefined }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "To'lov qabul qilinmadi");
      return response.json();
    },
    onSuccess: () => { invalidate(); setPaymentOpen(false); setPaymentAmount(""); setPaymentNote(""); toast({ title: "To'lov qayd etildi" }); },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });
  const voidMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/independent-debts/${id}/void`, { method: "POST", headers });
      if (!response.ok) throw new Error("Yozuv bekor qilinmadi");
      return response.json();
    },
    onSuccess: () => { invalidate(); setSheetOpen(false); toast({ title: "Yozuv bekor qilindi" }); },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });

  const debts = debtsQuery.data || [];
  const activeDebts = useMemo(() => debts.filter((debt) => debt.status !== "voided"), [debts]);
  const filtered = useMemo(() => debts.filter((debt) => {
    const q = search.toLowerCase().trim();
    const matches = !q || `${debt.debtorName} ${debt.phone} ${debt.itemDescription}`.toLowerCase().includes(q);
    const byFilter = filter === "all" && debt.status !== "voided" || filter === "paid" && debt.status === "paid" || filter === "overdue" && isOverdue(debt) || filter === "open" && debt.status !== "paid" && debt.status !== "voided" || filter === "voided" && debt.status === "voided";
    return matches && byFilter;
  }).sort((a, b) => (isOverdue(a) ? -1 : 1) - (isOverdue(b) ? -1 : 1) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [debts, search, filter]);
  const stats = useMemo(() => ({ total: activeDebts.reduce((sum, d) => sum + d.totalAmount, 0), remaining: activeDebts.reduce((sum, d) => sum + Math.max(0, d.totalAmount - d.paidAmount), 0), open: activeDebts.filter(d => d.status === "pending" || d.status === "partial").length, overdue: activeDebts.filter(isOverdue).length }), [activeDebts]);
  const selected = detailQuery.data || debts.find(d => d.id === selectedId);
  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (debt: IndependentDebt) => { setEditing(debt); setForm({ debtorName: debt.debtorName, phone: debt.phone || "", itemDescription: debt.itemDescription, totalAmount: String(debt.totalAmount), dueDate: debt.dueDate ? debt.dueDate.slice(0, 10) : "", note: debt.note || "" }); setFormOpen(true); };
  const submitForm = (event: React.FormEvent) => { event.preventDefault(); if (!form.debtorName.trim() || !form.itemDescription.trim() || Number(form.totalAmount) <= 0 || !form.dueDate) { toast({ title: "Majburiy maydonlarni to'ldiring", variant: "destructive" }); return; } editing ? updateMutation.mutate({ id: editing.id, body: form }) : createMutation.mutate(form); };
  const submitPayment = (event: React.FormEvent) => { event.preventDefault(); const amount = Number(paymentAmount); const remaining = selected ? selected.totalAmount - selected.paidAmount : 0; if (!selected || amount <= 0 || amount > remaining) { toast({ title: `Summa 0 dan katta va ${money(remaining)} dan oshmasin`, variant: "destructive" }); return; } paymentMutation.mutate({ id: selected.id, amount, note: paymentNote }); };

  return (
    <div className="flex min-h-[100dvh] bg-[#f4f7f6] text-slate-800">
      <SidebarNav />
      <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 mb-2"><BookMarkIcon /> Qarz daftari</div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900" data-testid="text-nasiya-title">Mustaqil Nasiya</h1>
              <p className="text-slate-500 mt-1">Do'kon tashqarisidagi qarzlarni tez va aniq nazorat qiling.</p>
            </div>
            <Button onClick={openCreate} className="bg-teal-700 hover:bg-teal-800 shadow-sm" data-testid="button-add-independent-debt"><Plus className="h-4 w-4 mr-2" /> Qarz qo'shish</Button>
          </header>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Stat label="Jami qarz" value={money(stats.total)} icon={CircleDollarSign} tone="teal" />
            <Stat label="Qoldiq" value={money(stats.remaining)} icon={HandCoins} tone="rose" />
            <Stat label="Ochiq yozuvlar" value={String(stats.open)} icon={FileText} tone="amber" />
            <Stat label="Muddati o'tgan" value={String(stats.overdue)} icon={AlertTriangle} tone="slate" />
          </div>
          <section className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgba(22,45,42,0.05)] overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="relative flex-1 max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ism, telefon yoki mahsulot bo'yicha qidiring" className="pl-10 bg-slate-50/70 border-slate-200" data-testid="input-nasiya-search" /></div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {([["all", "Hammasi"], ["open", "Ochiq"], ["overdue", "Muddati o'tgan"], ["paid", "To'langan"], ["voided", "Bekor qilingan"]] as const).map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === key ? "bg-teal-700 text-white" : "text-slate-500 hover:bg-slate-100"}`} data-testid={`filter-nasiya-${key}`}>{label}</button>)}
              </div>
            </div>
            {debtsQuery.isLoading ? <SkeletonRows /> : debtsQuery.isError ? <State icon={ShieldAlert} title="Ma'lumot yuklanmadi" text="Internet aloqasini tekshirib, qayta urinib ko'ring." action={<Button variant="outline" onClick={() => debtsQuery.refetch()}><RotateCcw className="h-4 w-4 mr-2" /> Qayta urinish</Button>} /> : filtered.length === 0 ? <State icon={HandCoins} title={debts.length ? "Qidiruv bo'yicha yozuv topilmadi" : "Nasiya daftari hozircha bo'sh"} text={debts.length ? "Filtr yoki qidiruv so'zini o'zgartiring." : "Birinchi qarz yozuvini qo'shing — keyin to'lovlar tarixini shu yerda ko'rasiz."} action={!debts.length ? <Button onClick={openCreate} className="bg-teal-700"><Plus className="h-4 w-4 mr-2" /> Birinchi qarzni qo'shish</Button> : undefined} /> : <div className="divide-y divide-slate-100">{filtered.map(debt => <DebtRow key={debt.id} debt={debt} onClick={() => { setSelectedId(debt.id); setSheetOpen(true); }} />)}</div>}
          </section>
        </div>
      </main>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0"><div className="p-6"><SheetHeader className="pb-5 border-b"><div className="flex justify-between gap-3"><div><SheetTitle className="text-2xl text-slate-900">{selected?.debtorName || "Qarz tafsiloti"}</SheetTitle><p className="text-sm text-slate-500 mt-1">{selected?.phone || "Telefon ko'rsatilmagan"}</p></div>{selected && <Badge variant="outline" className={statusMeta(selected).cls}>{statusMeta(selected).label}</Badge>}</div></SheetHeader>{detailQuery.isLoading ? <div className="py-16 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Yuklanmoqda...</div> : selected ? <div className="space-y-6 pt-5">
        <div className="rounded-2xl bg-[#e8f3f0] p-5"><p className="text-xs uppercase tracking-wider font-semibold text-teal-800">Qoldiq summa</p><p className="text-3xl font-bold text-slate-900 mt-1">{money(Math.max(0, selected.totalAmount - selected.paidAmount))}</p><div className="flex justify-between text-xs text-slate-500 mt-3"><span>Jami {money(selected.totalAmount)}</span><span>To'langan {money(selected.paidAmount)}</span></div><div className="h-1.5 bg-white/80 rounded-full mt-2 overflow-hidden"><div className="h-full bg-teal-700 rounded-full transition-all" style={{ width: `${Math.min(100, selected.totalAmount ? selected.paidAmount / selected.totalAmount * 100 : 0)}%` }} /></div></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Kelishuv</p><div className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-800">{selected.itemDescription}</p><p className={`text-sm mt-2 flex items-center gap-2 ${isOverdue(selected) ? "text-rose-600 font-medium" : "text-slate-500"}`}><CalendarDays className="h-4 w-4" /> {isOverdue(selected) ? "Muddati o'tgan · " : "Muddat: "}{date(selected.dueDate)}</p>{selected.note && <p className="text-sm text-slate-500 mt-3 border-t pt-3">{selected.note}</p>}</div></div>
        {selected.status !== "paid" && selected.status !== "voided" && <Button className="w-full bg-teal-700 hover:bg-teal-800" onClick={() => setPaymentOpen(true)} data-testid="button-record-payment"><Banknote className="h-4 w-4 mr-2" /> To'lov qayd etish</Button>}
        <div><div className="flex justify-between items-center mb-2"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">To'lovlar tarixi</p><span className="text-xs text-slate-400">{detailQuery.data?.payments?.length || 0} ta</span></div>{!detailQuery.data?.payments?.length ? <p className="text-sm text-slate-400 border rounded-xl p-4 text-center">Hali to'lov qayd etilmagan</p> : <div className="space-y-2">{detailQuery.data.payments.map(payment => <div key={payment.id} className="flex justify-between items-center border rounded-xl p-3"><div><p className="font-semibold text-emerald-700">+ {money(payment.amount)}</p><p className="text-xs text-slate-400">{date(payment.date)}{payment.note ? ` · ${payment.note}` : ""}</p></div><Check className="h-4 w-4 text-emerald-600" /></div>)}</div>}</div>
        {selected.status !== "voided" && <div className="flex gap-2 pt-2 border-t"><Button variant="outline" className="flex-1" onClick={() => openEdit(selected)} data-testid="button-edit-independent-debt"><Edit3 className="h-4 w-4 mr-2" /> Tahrirlash</Button><Button variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => { if (window.confirm("Bu yozuvni bekor qilishni tasdiqlaysizmi?")) voidMutation.mutate(selected.id); }} data-testid="button-void-independent-debt"><X className="h-4 w-4 mr-2" /> Bekor qilish</Button></div>}
      </div> : null}</div></SheetContent></Sheet>
      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Qarz yozuvini tahrirlash" : "Yangi qarz yozuvi"}</DialogTitle></DialogHeader><form onSubmit={submitForm} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Qarzdor ismi *"><Input required value={form.debtorName} onChange={e => setForm({ ...form, debtorName: e.target.value })} placeholder="Masalan, Dilshod Karimov" data-testid="input-debtor-name" /></Field><Field label="Telefon"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 000 00 00" data-testid="input-debtor-phone" /></Field></div><Field label="Nima olingan? *"><Input required value={form.itemDescription} onChange={e => setForm({ ...form, itemDescription: e.target.value })} placeholder="Mahsulot yoki xizmat" data-testid="input-debt-item" /></Field><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Jami summa *"><Input required type="number" min="1" step="1" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} placeholder="0" data-testid="input-debt-total" /></Field><Field label="Qaytarish muddati *"><Input required type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} data-testid="input-debt-due-date" /></Field></div><Field label="Izoh"><Textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Qo'shimcha kelishuv yoki eslatma" rows={3} data-testid="input-debt-note" /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Bekor qilish</Button><Button type="submit" className="bg-teal-700 hover:bg-teal-800" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Saqlash</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}><DialogContent><DialogHeader><DialogTitle>To'lov qayd etish</DialogTitle></DialogHeader><form onSubmit={submitPayment} className="space-y-4"><div className="rounded-xl bg-slate-50 p-4 text-sm">Qoldiq: <strong className="text-teal-700">{selected ? money(selected.totalAmount - selected.paidAmount) : ""}</strong></div><Field label="To'lov summasi *"><Input type="number" min="1" max={selected ? selected.totalAmount - selected.paidAmount : undefined} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} autoFocus placeholder="0" data-testid="input-payment-amount" /></Field><Field label="Izoh"><Input value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="Masalan, naqd" data-testid="input-payment-note" /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Bekor qilish</Button><Button type="submit" className="bg-teal-700" disabled={paymentMutation.isPending}>Qayd etish</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}

function BookMarkIcon() { return <span className="inline-block w-2 h-2 rounded-full bg-teal-600" />; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label className="text-sm text-slate-600">{label}</Label>{children}</div>; }
function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof HandCoins; tone: string }) { const styles: Record<string, string> = { teal: "bg-teal-50 text-teal-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700", slate: "bg-slate-100 text-slate-600" }; return <Card className="border-slate-200/80 shadow-none"><CardContent className="p-4"><div className={`w-8 h-8 rounded-lg ${styles[tone]} flex items-center justify-center mb-3`}><Icon className="h-4 w-4" /></div><p className="text-xs text-slate-500">{label}</p><p className="font-bold text-slate-900 mt-1 text-base md:text-lg truncate">{value}</p></CardContent></Card>; }
function DebtRow({ debt, onClick }: { debt: IndependentDebt; onClick: () => void }) { const meta = statusMeta(debt); const remaining = Math.max(0, debt.totalAmount - debt.paidAmount); return <button onClick={onClick} className="w-full text-left p-4 md:p-5 hover:bg-[#f7fbfa] transition-colors group" data-testid={`row-independent-debt-${debt.id}`}><div className="flex items-center gap-3"><div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isOverdue(debt) ? "bg-rose-100 text-rose-700" : "bg-teal-50 text-teal-700"}`}><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900 truncate">{debt.debtorName}</p><Badge variant="outline" className={`text-[11px] ${meta.cls}`}>{meta.label}</Badge></div><p className="text-sm text-slate-500 truncate mt-0.5">{debt.itemDescription}{debt.phone ? ` · ${debt.phone}` : ""}</p></div><div className="text-right shrink-0"><p className="font-bold text-slate-900">{money(remaining)}</p><p className={`text-xs mt-1 ${isOverdue(debt) ? "text-rose-600" : "text-slate-400"}`}>{isOverdue(debt) ? "Muddati o'tgan" : date(debt.dueDate)}</p></div><ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-600 transition-colors" /></div></button>; }
function SkeletonRows() { return <div className="divide-y divide-slate-100">{[1, 2, 3, 4].map(i => <div key={i} className="p-5 flex gap-3 animate-pulse"><div className="w-10 h-10 rounded-xl bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-2/5" /><div className="h-3 bg-slate-100 rounded w-1/3" /></div><div className="w-24 h-5 bg-slate-100 rounded" /></div>)}</div>; }
function State({ icon: Icon, title, text, action }: { icon: typeof HandCoins; title: string; text: string; action?: React.ReactNode }) { return <div className="py-16 px-6 text-center"><div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4"><Icon className="h-6 w-6" /></div><p className="font-semibold text-slate-800">{title}</p><p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto mb-5">{text}</p>{action}</div>; }