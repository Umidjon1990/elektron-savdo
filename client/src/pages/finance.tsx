import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useTransactions } from "@/lib/transaction-context";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Plus, Pencil, Trash2,
  DollarSign, ArrowDownCircle, ArrowUpCircle, Receipt,
  Home, Briefcase, Truck, Zap, ShoppingBag, Megaphone, MoreHorizontal,
  Users, Printer, Tag, Settings, ChevronDown, Banknote, CreditCard,
  Clock, TrendingUp, ShoppingCart, HandCoins, ArrowDown, ArrowUp,
  AlertTriangle, Calendar, FileText, CircleDollarSign, Landmark,
  UserCheck, Phone, ChevronRight, X, Building
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const ICON_MAP: Record<string, any> = {
  Home, Briefcase, Truck, Zap, ShoppingBag, Megaphone, Receipt, Users, Tag, Settings, MoreHorizontal, Wallet, Building, Landmark, HandCoins, ArrowDown, CreditCard, DollarSign, CircleDollarSign
};

const DEFAULT_CATEGORIES = [
  { name: "Ijara", icon: "Home", color: "#ef4444" },
  { name: "Maosh", icon: "Users", color: "#f59e0b" },
  { name: "Transport", icon: "Truck", color: "#3b82f6" },
  { name: "Elektr/Gaz/Suv", icon: "Zap", color: "#8b5cf6" },
  { name: "Maxsulot xarid", icon: "ShoppingBag", color: "#10b981" },
  { name: "Reklama", icon: "Megaphone", color: "#ec4899" },
  { name: "Boshqa", icon: "MoreHorizontal", color: "#6b7280" },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Inkassatsiya qaytimi", icon: "Landmark", color: "#3b82f6" },
  { name: "Qarz qaytdi", icon: "HandCoins", color: "#f59e0b" },
  { name: "Investor pul kiritdi", icon: "Briefcase", color: "#8b5cf6" },
  { name: "Bank o'tkazma", icon: "Building", color: "#14b8a6" },
  { name: "Boshqa kirim", icon: "MoreHorizontal", color: "#6b7280" },
];

const PAYMENT_COLORS: Record<string, string> = {
  "Naqd": "#22c55e", "naqd": "#22c55e", "cash": "#22c55e",
  "Karta": "#3b82f6", "karta": "#3b82f6", "card": "#3b82f6",
  "Nasiya": "#f59e0b", "nasiya": "#f59e0b",
};

const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#6b7280", "#14b8a6", "#f97316", "#06b6d4"];

type SubMenu = "kassa" | "kirim" | "chiqim" | "nasiya" | "hisobot" | "topshirish" | "tovarberuvchi";

function formatSum(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
  if (val >= 1000) return (val / 1000).toFixed(0) + "k";
  return val.toLocaleString();
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(d: string | Date): string {
  const date = new Date(d);
  return `${date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" })} ${date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function daysUntil(d: string | Date): number {
  const target = new Date(d);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function FinancePage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { transactions: allTransactions, syncTransactions, voidTransaction } = useTransactions();
  const [activeMenu, setActiveMenu] = useState<SubMenu>("kassa");
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [showIncomeCategories, setShowIncomeCategories] = useState(false);
  const [incomeCatDialogOpen, setIncomeCatDialogOpen] = useState(false);
  const [editingIncomeCat, setEditingIncomeCat] = useState<any>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [saleDetailTx, setSaleDetailTx] = useState<any>(null);
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const getDateRange = () => {
    const now = new Date();
    let dateFrom: Date;
    if (period === "week") {
      const d = now.getDay() || 7;
      dateFrom = new Date(now);
      dateFrom.setDate(now.getDate() - d + 1);
      dateFrom.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      dateFrom = new Date(now);
      dateFrom.setHours(0, 0, 0, 0);
    }
    const dateTo = new Date(now);
    dateTo.setHours(23, 59, 59, 999);
    return { dateFrom, dateTo };
  };

  const { data: balance } = useQuery<any>({
    queryKey: ["cash-balance", period],
    queryFn: async () => {
      const { dateFrom, dateTo } = getDateRange();
      const res = await fetch(`/api/cash-register/balance?from=${dateFrom.toISOString()}&to=${dateTo.toISOString()}`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: cashEntries = [] } = useQuery<any[]>({
    queryKey: ["cash-entries", period],
    queryFn: async () => {
      const { dateFrom, dateTo } = getDateRange();
      const res = await fetch(`/api/cash-register/entries?from=${dateFrom.toISOString()}&to=${dateTo.toISOString()}`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: serverSummary } = useQuery<any>({
    queryKey: ["finance-summary", period],
    queryFn: async () => {
      // Send the user's local-day boundaries so server returns the same window
      // the client expects (avoids mobile vs desktop mismatch when server TZ ≠ user TZ).
      const { dateFrom, dateTo } = getDateRange();
      const tz = new Date().getTimezoneOffset();
      const res = await fetch(`/api/finance/summary?period=${period}&from=${dateFrom.toISOString()}&to=${dateTo.toISOString()}&tzOffsetMinutes=${tz}`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: supplierSummary } = useQuery<any>({
    queryKey: ["supplier-summary"],
    queryFn: async () => {
      const res = await fetch("/api/supplier-summary", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token && (activeMenu === "tovarberuvchi" || activeMenu === "hisobot"),
  });

  const { data: tenantSettings } = useQuery<any>({
    queryKey: ["tenant-settings"],
    queryFn: async () => {
      const res = await fetch("/api/tenant-settings", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });
  const debtsInUsdOnly = !!tenantSettings?.debtsInUsdOnly;

  const summary = useMemo(() => {
    // Server is the source of truth (keeps phone and desktop identical).
    // We add unsynced local txns on top, and subtract any locally-voided
    // (but already-synced) txns so offline cashier actions are reflected.
    // If the server query failed (true offline), we fall back to the local
    // cache so the user still sees historical totals.
    const { dateFrom, dateTo } = getDateRange();
    const inRange = (t: any) => {
      const d = new Date(t.date);
      return d >= dateFrom && d <= dateTo;
    };
    const addToBreakdown = (bd: Record<string, number>, t: any, sign: 1 | -1) => {
      const splits = t.paymentSplits as Array<{ method: string; amount: number }> | undefined;
      if (splits && splits.length > 0) {
        for (const s of splits) {
          const m = s.method || "Naqd";
          bd[m] = (bd[m] || 0) + sign * (Number(s.amount) || 0);
        }
      } else {
        const method = t.paymentMethod || "Naqd";
        bd[method] = (bd[method] || 0) + sign * t.totalAmount;
      }
    };

    if (!serverSummary) {
      // Offline / failed query: use local cache as best-effort fallback.
      let revenue = 0, totalProfit = 0, count = 0;
      const paymentBreakdown: Record<string, number> = {};
      for (const t of (allTransactions || [])) {
        if (t.status === "voided") continue;
        if (!inRange(t)) continue;
        revenue += t.totalAmount;
        totalProfit += t.totalProfit || 0;
        count += 1;
        addToBreakdown(paymentBreakdown, t, 1);
      }
      return { revenue, expensesTotal: 0, profit: totalProfit, totalProfit, paymentBreakdown, transactionCount: count, prevRevenue: 0, prevExpenses: 0 };
    }

    let revenue = serverSummary.revenue || 0;
    let totalProfit = serverSummary.totalProfit || 0;
    const expensesTotal = serverSummary.expensesTotal || 0;
    const paymentBreakdown: Record<string, number> = { ...(serverSummary.paymentBreakdown || {}) };
    let transactionCount = serverSummary.transactionCount || 0;

    for (const t of (allTransactions || [])) {
      if (!inRange(t)) continue;
      const synced = (t as any).synced !== false;
      if (!synced && t.status !== "voided") {
        revenue += t.totalAmount;
        totalProfit += t.totalProfit || 0;
        transactionCount += 1;
        addToBreakdown(paymentBreakdown, t, 1);
      } else if (synced && t.status === "voided") {
        // Server may not yet reflect this void — subtract it.
        revenue -= t.totalAmount;
        totalProfit -= t.totalProfit || 0;
        transactionCount = Math.max(0, transactionCount - 1);
        addToBreakdown(paymentBreakdown, t, -1);
      }
    }

    return {
      revenue,
      expensesTotal,
      profit: totalProfit - expensesTotal,
      totalProfit,
      paymentBreakdown,
      transactionCount,
      prevRevenue: serverSummary.prevRevenue || 0,
      prevExpenses: serverSummary.prevExpenses || 0,
    };
  }, [allTransactions, serverSummary, period]);

  const { data: serverDailyData = [] } = useQuery<any[]>({
    queryKey: ["finance-daily", period],
    queryFn: async () => {
      const { dateFrom, dateTo } = getDateRange();
      const tz = new Date().getTimezoneOffset();
      const res = await fetch(`/api/finance/daily-breakdown?from=${dateFrom.toISOString()}&to=${dateTo.toISOString()}&tzOffsetMinutes=${tz}`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const dailyData = useMemo(() => {
    // Server is the single source of truth — keeps mobile/desktop charts identical.
    return (serverDailyData || []).map((srv: any) => ({
      date: srv.date,
      revenue: srv.revenue || 0,
      expenses: srv.expenses || 0,
      profit: (srv.totalProfit || 0) - (srv.expenses || 0),
      payments: srv.payments || {},
    }));
  }, [serverDailyData]);

  const { data: expensesList = [] } = useQuery<any[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch("/api/expenses", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const res = await fetch("/api/expense-categories", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: incomeCats = [] } = useQuery<any[]>({
    queryKey: ["income-categories"],
    queryFn: async () => {
      const res = await fetch("/api/income-categories", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: debtTransactions = [] } = useQuery<any[]>({
    queryKey: ["debts"],
    queryFn: async () => {
      const res = await fetch("/api/debts", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (token && categories.length === 0) {
      const initDefaults = async () => {
        const res = await fetch("/api/expense-categories", { headers });
        const existing = await res.json();
        if (existing.length === 0) {
          for (const cat of DEFAULT_CATEGORIES) {
            await fetch("/api/expense-categories", { method: "POST", headers, body: JSON.stringify(cat) });
          }
          queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
        }
      };
      initDefaults().catch(console.error);
    }
  }, [token, categories.length]);

  useEffect(() => {
    if (token && incomeCats.length === 0) {
      const initDefaults = async () => {
        const res = await fetch("/api/income-categories", { headers });
        const existing = await res.json();
        if (existing.length === 0) {
          for (const cat of DEFAULT_INCOME_CATEGORIES) {
            await fetch("/api/income-categories", { method: "POST", headers, body: JSON.stringify(cat) });
          }
          queryClient.invalidateQueries({ queryKey: ["income-categories"] });
        }
      };
      initDefaults().catch(console.error);
    }
  }, [token, incomeCats.length]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    queryClient.invalidateQueries({ queryKey: ["finance-daily"] });
    queryClient.invalidateQueries({ queryKey: ["cash-balance"] });
    queryClient.invalidateQueries({ queryKey: ["cash-entries"] });
    queryClient.invalidateQueries({ queryKey: ["debts"] });
    queryClient.invalidateQueries({ queryKey: ["income-categories"] });
  };

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/expenses", { method: "POST", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setExpenseDialogOpen(false); setEditingExpense(null); toast({ title: "Xarajat qo'shildi" }); },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setExpenseDialogOpen(false); setEditingExpense(null); toast({ title: "Xarajat yangilandi" }); },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Xarajat o'chirildi" }); },
  });

  const createCat = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/expense-categories", { method: "POST", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expense-categories"] }); setCatDialogOpen(false); setEditingCat(null); toast({ title: "Kategoriya qo'shildi" }); },
  });

  const updateCat = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/expense-categories/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expense-categories"] }); setCatDialogOpen(false); setEditingCat(null); toast({ title: "Kategoriya yangilandi" }); },
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expense-categories/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expense-categories"] }); toast({ title: "Kategoriya o'chirildi" }); },
  });

  const createIncome = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/cash-register/entries", { method: "POST", headers, body: JSON.stringify({ ...data, type: "income" }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setIncomeDialogOpen(false); setEditingIncome(null); toast({ title: "Kirim qo'shildi" }); },
  });

  const updateIncomeEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/cash-register/entries/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setIncomeDialogOpen(false); setEditingIncome(null); toast({ title: "Kirim yangilandi" }); },
  });

  const createIncomeCat = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/income-categories", { method: "POST", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income-categories"] }); setIncomeCatDialogOpen(false); setEditingIncomeCat(null); toast({ title: "Kategoriya qo'shildi" }); },
  });

  const updateIncomeCat = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/income-categories/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income-categories"] }); setIncomeCatDialogOpen(false); setEditingIncomeCat(null); toast({ title: "Kategoriya yangilandi" }); },
  });

  const deleteIncomeCat = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/income-categories/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income-categories"] }); toast({ title: "Kategoriya o'chirildi" }); },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cash-register/entries/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Yozuv o'chirildi" }); },
  });

  const handleDebtPay = async () => {
    if (!selectedDebt || !payAmount) return;
    const amount = parseInt(payAmount);
    if (!amount || amount <= 0) return;
    try {
      const res = await fetch(`/api/debts/${selectedDebt.id}/pay`, {
        method: "POST", headers,
        body: JSON.stringify({ amount, note: payNote }),
      });
      if (res.ok) {
        toast({ title: "To'lov qabul qilindi!", description: `${amount.toLocaleString()} so'm`, className: "bg-green-500 text-white border-none" });
        setPayDialogOpen(false);
        setPayAmount("");
        setPayNote("");
        setSelectedDebt(null);
        invalidateAll();
        await syncTransactions();
      } else {
        toast({ title: "Xatolik", variant: "destructive" });
      }
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  };

  const revenue = summary?.revenue || 0;
  const expTotal = summary?.expensesTotal || 0;
  const profit = summary?.profit || 0;
  const paymentBreakdown = summary?.paymentBreakdown || {};
  const periodLabel = period === "day" ? "Bugun" : period === "week" ? "Hafta" : "Oy";
  const getCatById = (id: string) => categories.find((c: any) => c.id === id);

  const kassaJournal = useMemo(() => {
    const { dateFrom, dateTo } = getDateRange();
    const active = (allTransactions || []).filter(t => t.status !== "voided");
    const txns = active.filter(t => {
      const d = new Date(t.date);
      return d >= dateFrom && d <= dateTo;
    }).map(t => ({
      id: t.id,
      type: "savdo" as const,
      amount: t.totalAmount,
      paymentMethod: t.paymentMethod || "Naqd",
      date: t.date,
      note: t.customerName || "",
      customerName: t.customerName,
    }));

    const entries = (cashEntries || []).map((e: any) => ({
      id: e.id,
      type: e.type as string,
      amount: e.amount,
      paymentMethod: e.paymentType || "cash",
      date: e.date,
      note: e.note || e.categoryName || "",
      counterparty: e.counterparty,
    }));

    const expItems = (expensesList || []).filter((e: any) => {
      const d = new Date(e.date);
      return d >= dateFrom && d <= dateTo;
    }).map((e: any) => {
      const cat = getCatById(e.categoryId);
      return {
        id: "exp-" + e.id,
        type: "expense" as const,
        amount: e.amount,
        paymentMethod: "naqd",
        date: e.date,
        note: (cat?.name || "Xarajat") + (e.description ? ": " + e.description : ""),
      };
    });

    return [...txns, ...entries, ...expItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, cashEntries, expensesList, categories, period]);

  const debtStats = useMemo(() => {
    const debts = debtTransactions || [];
    const totalDebt = debts.reduce((s: number, d: any) => s + d.totalAmount, 0);
    const totalPaid = debts.reduce((s: number, d: any) => s + (d.paidAmount || 0), 0);
    const remaining = totalDebt - totalPaid;
    const overdue = debts.filter((d: any) => d.dueDate && daysUntil(d.dueDate) < 0 && d.debtStatus !== "paid").length;
    const pending = debts.filter((d: any) => d.debtStatus === "pending" || d.debtStatus === "partial").length;
    return { totalDebt, totalPaid, remaining, overdue, pending };
  }, [debtTransactions]);

  const catExpenses = categories.map((cat: any) => {
    const total = expensesList.filter((e: any) => e.categoryId === cat.id).reduce((sum: number, e: any) => sum + e.amount, 0);
    return { name: cat.name, value: total, color: cat.color };
  }).filter((c: any) => c.value > 0);

  const subMenuItems: { key: SubMenu; label: string; icon: any }[] = [
    { key: "kassa", label: "Kassa", icon: Wallet },
    { key: "kirim", label: "Kirim", icon: ArrowDownCircle },
    { key: "chiqim", label: "Chiqim", icon: ArrowUpCircle },
    { key: "nasiya", label: "Nasiya", icon: HandCoins },
    { key: "hisobot", label: "Hisobot", icon: FileText },
    { key: "topshirish", label: "Topshirish", icon: UserCheck },
    { key: "tovarberuvchi", label: "Tovar beruvchi", icon: Truck },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans bg-gray-50">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold" data-testid="text-page-title">Moliya</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(["day", "week", "month"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p ? "bg-white shadow text-primary" : "text-gray-500 hover:text-gray-700"}`}
                  data-testid={`button-period-${p}`}>
                  {p === "day" ? "Bugun" : p === "week" ? "Hafta" : "Oy"}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="border-b bg-white px-4 md:px-6 overflow-x-auto">
          <div className="flex gap-1 py-1">
            {subMenuItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.key} onClick={() => setActiveMenu(item.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    activeMenu === item.key ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  data-testid={`submenu-${item.key}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

          {activeMenu === "kassa" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><Wallet className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">MAVJUD SUMMA</span></div>
                    <p className="text-xl font-bold" data-testid="text-total-balance">{(balance?.total || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-400 to-emerald-500 text-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><Banknote className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">NAQD</span></div>
                    <p className="text-xl font-bold">{(balance?.cash || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><CreditCard className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">KARTA</span></div>
                    <p className="text-xl font-bold">{(balance?.card || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><Clock className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">NASIYADA</span></div>
                    <p className="text-xl font-bold">{(balance?.nasiya || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-400 to-rose-500 text-white col-span-2 lg:col-span-1">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><ArrowUp className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">CHIQARILGAN</span></div>
                    <p className="text-xl font-bold">{(balance?.withdrawn || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Kassa harakatlari — {periodLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {kassaJournal.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">Hali tranzaksiya yo'q</div>
                  ) : (
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {kassaJournal.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`journal-${item.id}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            item.type === "savdo" ? "bg-green-50" : item.type === "income" ? "bg-blue-50" : "bg-red-50"
                          }`}>
                            {item.type === "savdo" ? <ShoppingCart className="h-4 w-4 text-green-600" /> :
                             item.type === "income" ? <ArrowDown className="h-4 w-4 text-blue-600" /> :
                             <ArrowUp className="h-4 w-4 text-red-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{item.type === "savdo" ? "Sotuv" : item.type === "income" ? "Kirim" : item.type === "withdrawal" ? "Chiqarilgan" : "Chiqim"}</p>
                            <p className="text-[10px] text-gray-400 truncate">{item.note || item.counterparty || "-"}</p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            {item.type === "savdo" && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    const tx = (allTransactions || []).find((t: any) => t.id === item.id);
                                    if (tx) setSaleDetailTx(tx);
                                  }}
                                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600"
                                  title="Batafsil"
                                  data-testid={`button-view-sale-${item.id}`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setVoidConfirmId(item.id)}
                                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600"
                                  title="Bekor qilish"
                                  data-testid={`button-void-sale-${item.id}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                            {(item.type === "income" || item.type === "withdrawal") && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    const entry = (cashEntries || []).find((e: any) => e.id === item.id);
                                    if (entry) { setEditingIncome(entry); setIncomeDialogOpen(true); }
                                  }}
                                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600"
                                  data-testid={`button-edit-journal-${item.id}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => { if (confirm("Ushbu yozuvni o'chirishni tasdiqlaysizmi?")) deleteEntry.mutate(item.id); }}
                                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600"
                                  data-testid={`button-delete-journal-${item.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                            <div>
                              <p className={`text-sm font-bold ${item.type === "savdo" || item.type === "income" ? "text-green-600" : "text-red-600"}`}>
                                {item.type === "savdo" || item.type === "income" ? "+" : "-"}{item.amount.toLocaleString()}
                              </p>
                              <div className="flex items-center gap-1 justify-end">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                  (item.paymentMethod || "").toLowerCase() === "mixed" ? "bg-indigo-50 text-indigo-600" :
                                  (item.paymentMethod || "").toLowerCase().includes("karta") || (item.paymentMethod || "").toLowerCase().includes("card") ? "bg-blue-50 text-blue-600" :
                                  (item.paymentMethod || "").toLowerCase().includes("nasiya") ? "bg-amber-50 text-amber-600" :
                                  "bg-green-50 text-green-600"
                                }`}>{(item.paymentMethod || "").toLowerCase() === "mixed" ? "Aralash" : item.paymentMethod}</span>
                                <span className="text-[10px] text-gray-400">{formatDateTime(item.date)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "kirim" && (() => {
            const incomeEntries = cashEntries.filter((e: any) => e.type === "income");
            const getIncomeCatById = (id: string) => incomeCats.find((c: any) => c.id === id);
            const catIncomes = incomeCats.map((cat: any) => {
              const total = incomeEntries.filter((e: any) => e.categoryName === cat.name).reduce((s: number, e: any) => s + e.amount, 0);
              return { name: cat.name, value: total, color: cat.color };
            }).filter((c: any) => c.value > 0);
            const incTotal = incomeEntries.reduce((s: number, e: any) => s + e.amount, 0);
            return (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-green-600" />
                  Kirimlar — {periodLabel}
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowIncomeCategories(!showIncomeCategories)} className="text-xs gap-1" data-testid="button-toggle-income-categories">
                    <Settings className="h-3 w-3" /> Kategoriyalar
                    <ChevronDown className={`h-3 w-3 transition-transform ${showIncomeCategories ? "rotate-180" : ""}`} />
                  </Button>
                  <Button size="sm" onClick={() => { setEditingIncome(null); setIncomeDialogOpen(true); }} className="gap-1" data-testid="button-add-income">
                    <Plus className="h-4 w-4" /> Kirim qo'shish
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] opacity-80 font-medium">Savdodan tushum</p>
                    <p className="text-xl font-bold">{revenue.toLocaleString()}</p>
                    <p className="text-[10px] opacity-70">{summary?.transactionCount || 0} ta sotuv</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] opacity-80 font-medium">Qo'shimcha kirim</p>
                    <p className="text-xl font-bold">{incTotal.toLocaleString()}</p>
                    <p className="text-[10px] opacity-70">{incomeEntries.length} ta kirim</p>
                  </CardContent>
                </Card>
                {catIncomes.slice(0, 1).map((c: any, i: number) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <p className="text-[10px] text-gray-500 font-medium">{c.name}</p>
                      <p className="text-lg font-bold">{c.value.toLocaleString()}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                        <div className="h-full rounded-full" style={{ width: `${incTotal > 0 ? Math.round((c.value / incTotal) * 100) : 0}%`, backgroundColor: c.color }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {showIncomeCategories && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600">Kirim kategoriyalari</p>
                      <Button size="sm" variant="outline" onClick={() => { setEditingIncomeCat(null); setIncomeCatDialogOpen(true); }} className="text-xs gap-1 h-7" data-testid="button-add-income-category">
                        <Plus className="h-3 w-3" /> Yangi
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {incomeCats.map((cat: any) => {
                        const IconComp = ICON_MAP[cat.icon] || ArrowDown;
                        return (
                          <div key={cat.id} className="flex items-center gap-1.5 bg-gray-50 border rounded-lg px-2.5 py-1.5 text-xs group" data-testid={`income-category-${cat.id}`}>
                            <IconComp className="h-3.5 w-3.5" style={{ color: cat.color }} />
                            <span className="font-medium">{cat.name}</span>
                            <button onClick={() => { setEditingIncomeCat(cat); setIncomeCatDialogOpen(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-edit-income-category-${cat.id}`}>
                              <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                            </button>
                            <button onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deleteIncomeCat.mutate(cat.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-delete-income-category-${cat.id}`}>
                              <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {catIncomes.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Kirim taqsimoti</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={catIncomes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={32}>
                            {catIncomes.map((entry: any, index: number) => (
                              <Cell key={index} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => value.toLocaleString() + " so'm"} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  {incomeEntries.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">Qo'shimcha kirim yo'q</div>
                  ) : (
                    <div className="divide-y">
                      {incomeEntries.map((entry: any) => {
                        const cat = incomeCats.find((c: any) => c.name === entry.categoryName);
                        const IconComp = cat ? (ICON_MAP[cat.icon] || ArrowDown) : ArrowDown;
                        return (
                        <div key={entry.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 group transition-colors" data-testid={`income-${entry.id}`}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (cat?.color || "#22c55e") + "15" }}>
                            <IconComp className="h-4 w-4" style={{ color: cat?.color || "#22c55e" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{entry.categoryName || "Kirim"}</p>
                            <p className="text-xs text-gray-500 truncate">{entry.counterparty && `${entry.counterparty} • `}{entry.note || ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">+{entry.amount.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400">{formatDateTime(entry.date)}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingIncome(entry); setIncomeDialogOpen(true); }}
                              className="p-1.5 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors"
                              data-testid={`button-edit-income-${entry.id}`}
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </button>
                            <button
                              onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deleteEntry.mutate(entry.id); }}
                              className="p-1.5 rounded-md hover:bg-red-50 active:bg-red-100 transition-colors"
                              data-testid={`button-delete-income-${entry.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
            );
          })()}

          {activeMenu === "chiqim" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-red-600" />
                  Xarajatlar
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCategories(!showCategories)} className="text-xs gap-1" data-testid="button-toggle-categories">
                    <Settings className="h-3 w-3" /> Kategoriyalar
                    <ChevronDown className={`h-3 w-3 transition-transform ${showCategories ? "rotate-180" : ""}`} />
                  </Button>
                  <Button size="sm" onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true); }} className="gap-1" data-testid="button-add-expense">
                    <Plus className="h-4 w-4" /> Xarajat qo'shish
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500 to-rose-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] opacity-80 font-medium">Jami xarajat</p>
                    <p className="text-xl font-bold">{expTotal.toLocaleString()}</p>
                  </CardContent>
                </Card>
                {catExpenses.slice(0, 2).map((c: any, i: number) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <p className="text-[10px] text-gray-500 font-medium">{c.name}</p>
                      <p className="text-lg font-bold">{c.value.toLocaleString()}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                        <div className="h-full rounded-full" style={{ width: `${expTotal > 0 ? Math.round((c.value / expTotal) * 100) : 0}%`, backgroundColor: c.color }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {showCategories && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600">Xarajat kategoriyalari</p>
                      <Button size="sm" variant="outline" onClick={() => { setEditingCat(null); setCatDialogOpen(true); }} className="text-xs gap-1 h-7" data-testid="button-add-category">
                        <Plus className="h-3 w-3" /> Yangi
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat: any) => {
                        const IconComp = ICON_MAP[cat.icon] || Receipt;
                        return (
                          <div key={cat.id} className="flex items-center gap-1.5 bg-gray-50 border rounded-lg px-2.5 py-1.5 text-xs group" data-testid={`category-${cat.id}`}>
                            <IconComp className="h-3.5 w-3.5" style={{ color: cat.color }} />
                            <span className="font-medium">{cat.name}</span>
                            <button onClick={() => { setEditingCat(cat); setCatDialogOpen(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-edit-category-${cat.id}`}>
                              <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                            </button>
                            <button onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deleteCat.mutate(cat.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-delete-category-${cat.id}`}>
                              <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {catExpenses.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Xarajat taqsimoti</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={catExpenses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={32}>
                            {catExpenses.map((entry: any, index: number) => (
                              <Cell key={index} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => value.toLocaleString() + " so'm"} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  {expensesList.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">Hali xarajat kiritilmagan</div>
                  ) : (
                    <div className="divide-y">
                      {expensesList.map((exp: any) => {
                        const cat = getCatById(exp.categoryId);
                        const IconComp = cat ? (ICON_MAP[cat.icon] || Receipt) : Receipt;
                        return (
                          <div key={exp.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 group transition-colors" data-testid={`expense-${exp.id}`}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (cat?.color || "#6b7280") + "15" }}>
                              <IconComp className="h-4 w-4" style={{ color: cat?.color || "#6b7280" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cat?.name || "Boshqa"}</p>
                              {exp.description && <p className="text-xs text-gray-500 truncate">{exp.description}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-600">-{exp.amount.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">{formatDate(exp.date)}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingExpense(exp); setExpenseDialogOpen(true); }}
                                className="p-1.5 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors"
                                data-testid={`button-edit-expense-${exp.id}`}
                              >
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </button>
                              <button
                                onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deleteExpense.mutate(exp.id); }}
                                className="p-1.5 rounded-md hover:bg-red-50 active:bg-red-100 transition-colors"
                                data-testid={`button-delete-expense-${exp.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "nasiya" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><HandCoins className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">JAMI QARZ</span></div>
                    <p className="text-xl font-bold">{debtStats.remaining.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><DollarSign className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">TO'LANGAN</span></div>
                    <p className="text-xl font-bold">{debtStats.totalPaid.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500 to-rose-600 text-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><AlertTriangle className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">MUDDATI O'TGAN</span></div>
                    <p className="text-xl font-bold">{debtStats.overdue}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 mb-1 opacity-80"><Users className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">QARZDORLAR</span></div>
                    <p className="text-xl font-bold">{debtStats.pending}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold">Qarzdorlar ro'yxati</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {debtTransactions.filter((d: any) => d.debtStatus !== "paid").length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">Qarzdor yo'q</div>
                  ) : (
                    <div className="space-y-2">
                      {debtTransactions.filter((d: any) => d.debtStatus !== "paid").sort((a: any, b: any) => {
                        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                        return 0;
                      }).map((debt: any) => {
                        const remaining = debt.totalAmount - (debt.paidAmount || 0);
                        const pct = debt.totalAmount > 0 ? Math.round(((debt.paidAmount || 0) / debt.totalAmount) * 100) : 0;
                        const days = debt.dueDate ? daysUntil(debt.dueDate) : null;
                        const isOverdue = days !== null && days < 0;
                        return (
                          <div key={debt.id} className={`p-3 rounded-lg border ${isOverdue ? "border-red-200 bg-red-50/50" : "border-gray-100 bg-white"}`} data-testid={`debt-${debt.id}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isOverdue ? "bg-red-500" : "bg-amber-500"}`}>
                                  {(debt.customerName || "?")[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">{debt.customerName || "Noma'lum"}</p>
                                  {debt.customerPhone && <p className="text-[10px] text-gray-500 flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{debt.customerPhone}</p>}
                                </div>
                              </div>
                              <Button size="sm" variant={isOverdue ? "destructive" : "default"} onClick={() => { setSelectedDebt(debt); setPayAmount(""); setPayNote(""); setPayDialogOpen(true); }}
                                className="text-xs h-7 gap-1" data-testid={`button-pay-${debt.id}`}>
                                <Banknote className="h-3 w-3" /> To'lash
                              </Button>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-gray-500">Qoldiq: <span className="font-bold text-red-600">{remaining.toLocaleString()}</span> / {debt.totalAmount.toLocaleString()}</span>
                              {days !== null && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isOverdue ? "bg-red-100 text-red-700" : days <= 3 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                                  {isOverdue ? `${Math.abs(days)} kun o'tgan` : `${days} kun qoldi`}
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all bg-green-500" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">{formatDate(debt.date)}{debt.dueDate && ` • Muddat: ${formatDate(debt.dueDate)}`}</p>
                          </div>
                        );
                      })}

                      {debtTransactions.filter((d: any) => d.debtStatus === "paid").length > 0 && (
                        <div className="pt-3 border-t mt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2">To'liq to'langan ({debtTransactions.filter((d: any) => d.debtStatus === "paid").length})</p>
                          {debtTransactions.filter((d: any) => d.debtStatus === "paid").slice(0, 5).map((debt: any) => (
                            <div key={debt.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-50/50 mb-1">
                              <UserCheck className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-medium flex-1">{debt.customerName || "Noma'lum"}</span>
                              <span className="text-xs text-green-600 font-bold">{debt.totalAmount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "hisobot" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <CardContent className="p-3">
                    <p className="text-[10px] opacity-80 font-medium">Tushum</p>
                    <p className="text-lg font-bold">{revenue.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500 to-rose-600 text-white">
                  <CardContent className="p-3">
                    <p className="text-[10px] opacity-80 font-medium">Xarajat</p>
                    <p className="text-lg font-bold">{expTotal.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                  <CardContent className="p-3">
                    <p className="text-[10px] opacity-80 font-medium">Tovar xarid</p>
                    <p className="text-lg font-bold">{(supplierSummary?.totals?.totalAmount || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className={`border-0 shadow-sm text-white ${profit >= 0 ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-orange-500 to-red-600"}`}>
                  <CardContent className="p-3">
                    <p className="text-[10px] opacity-80 font-medium">Sof foyda</p>
                    <p className="text-lg font-bold">{profit.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {Object.keys(paymentBreakdown).length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <HandCoins className="h-4 w-4 text-gray-500" />To'lov usullari
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(paymentBreakdown).map(([name, value]) => {
                        const pct = revenue > 0 ? Math.round(((value as number) / revenue) * 100) : 0;
                        const color = PAYMENT_COLORS[name] || "#6b7280";
                        return (
                          <div key={name} className="flex items-center gap-3 p-3 rounded-lg border bg-white" data-testid={`payment-${name}`}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "15" }}>
                              <Banknote className="h-5 w-5" style={{ color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 font-medium">{name}</p>
                              <p className="text-sm font-bold">{(value as number).toLocaleString()}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden" style={{ maxWidth: 60 }}>
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tushum vs Xarajat</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-52">
                      {dailyData.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dailyData.map((d: any) => ({ ...d, date: d.date.slice(5) }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatSum} />
                            <Tooltip formatter={(value: number) => value.toLocaleString() + " so'm"} />
                            <Bar dataKey="revenue" name="Tushum" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expenses" name="Xarajat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-xs text-gray-400 mb-2">Tushum</p>
                            <p className="text-2xl font-bold text-green-600">{revenue.toLocaleString()}</p>
                            <p className="text-xs text-gray-400 mt-3 mb-2">Xarajat</p>
                            <p className="text-2xl font-bold text-red-500">{expTotal.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {catExpenses.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Xarajat taqsimoti</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={catExpenses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={32}>
                              {catExpenses.map((_: any, i: number) => <Cell key={i} fill={catExpenses[i].color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => value.toLocaleString() + " so'm"} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card className="border-0 shadow-sm" id="finance-report">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Kunlik hisobot — {periodLabel}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1 no-print" data-testid="button-print-report">
                    <Printer className="h-4 w-4" /> Chop etish
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-semibold text-gray-600">Sana</th>
                          <th className="text-right py-2 px-2 font-semibold text-green-600">Tushum</th>
                          <th className="text-right py-2 px-2 font-semibold text-red-600">Xarajat</th>
                          <th className="text-right py-2 px-2 font-semibold text-blue-600">Sof foyda</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.map((d: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium">{d.date}</td>
                            <td className="py-2 px-2 text-right text-green-600 font-medium">{d.revenue.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-red-600 font-medium">{d.expenses.toLocaleString()}</td>
                            <td className={`py-2 px-2 text-right font-bold ${d.profit >= 0 ? "text-blue-600" : "text-orange-600"}`}>{d.profit.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-bold">
                          <td className="py-2 px-2">Jami</td>
                          <td className="py-2 px-2 text-right text-green-600">{revenue.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-red-600">{expTotal.toLocaleString()}</td>
                          <td className={`py-2 px-2 text-right ${profit >= 0 ? "text-blue-600" : "text-orange-600"}`}>{profit.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "topshirish" && <ShiftHandoverTab token={token} period={period} balance={balance} headers={headers} />}

          {activeMenu === "tovarberuvchi" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-700 font-medium">Jami xarid</span>
                    </div>
                    <p className="text-xl font-bold text-blue-800" data-testid="text-supplier-total">{(supplierSummary?.totals?.totalAmount || 0).toLocaleString()} so'm</p>
                    {(supplierSummary?.totals?.totalAmountUsd || 0) > 0 && (
                      <p className="text-sm font-semibold text-blue-600">${(supplierSummary?.totals?.totalAmountUsd || 0).toLocaleString()}</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-700 font-medium">Naqd</span>
                    </div>
                    <p className="text-xl font-bold text-green-800" data-testid="text-supplier-naqd">{(supplierSummary?.totals?.totalNaqd || 0).toLocaleString()} so'm</p>
                    {(supplierSummary?.totals?.totalNaqdUsd || 0) > 0 && (
                      <p className="text-sm font-semibold text-green-600">${(supplierSummary?.totals?.totalNaqdUsd || 0).toLocaleString()}</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs text-indigo-700 font-medium">Karta</span>
                    </div>
                    <p className="text-xl font-bold text-indigo-800" data-testid="text-supplier-karta">{(supplierSummary?.totals?.totalKarta || 0).toLocaleString()} so'm</p>
                    {(supplierSummary?.totals?.totalKartaUsd || 0) > 0 && (
                      <p className="text-sm font-semibold text-indigo-600">${(supplierSummary?.totals?.totalKartaUsd || 0).toLocaleString()}</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <HandCoins className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-amber-700 font-medium">Qarz</span>
                    </div>
                    {debtsInUsdOnly ? (
                      <p className="text-xl font-bold text-amber-800" data-testid="text-supplier-nasiya">${(supplierSummary?.totals?.totalNasiyaUsd || 0).toLocaleString()}</p>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-amber-800" data-testid="text-supplier-nasiya">{(supplierSummary?.totals?.totalNasiya || 0).toLocaleString()} so'm</p>
                        {(supplierSummary?.totals?.totalNasiyaUsd || 0) > 0 && (
                          <p className="text-sm font-semibold text-amber-600">${(supplierSummary?.totals?.totalNasiyaUsd || 0).toLocaleString()}</p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Tovar beruvchilar ro'yxati ({supplierSummary?.suppliers?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(supplierSummary?.suppliers || []).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Tovar beruvchilar topilmadi</p>
                  ) : (
                    (supplierSummary?.suppliers || []).map((s: any, idx: number) => (
                      <SupplierCard
                        key={idx}
                        supplier={s}
                        token={token}
                        categories={categories}
                        debtsInUsdOnly={debtsInUsdOnly}
                        onUpdate={() => {
                          queryClient.invalidateQueries({ queryKey: ["supplier-summary"] });
                          queryClient.invalidateQueries({ queryKey: ["expenses"] });
                          queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
                          queryClient.invalidateQueries({ queryKey: ["finance-daily"] });
                          queryClient.invalidateQueries({ queryKey: ["cash-balance"] });
                          queryClient.invalidateQueries({ queryKey: ["cash-entries"] });
                          queryClient.invalidateQueries({ queryKey: ["debts"] });
                        }}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              {(supplierSummary?.totals?.totalAmount || 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">To'lov usullari bo'yicha</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Naqd", value: supplierSummary?.totals?.totalNaqd || 0 },
                              { name: "Karta", value: supplierSummary?.totals?.totalKarta || 0 },
                              { name: "Nasiya", value: supplierSummary?.totals?.totalNasiya || 0 },
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" outerRadius={80} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {[
                              { name: "Naqd", value: supplierSummary?.totals?.totalNaqd || 0, color: "#22c55e" },
                              { name: "Karta", value: supplierSummary?.totals?.totalKarta || 0, color: "#3b82f6" },
                              { name: "Nasiya", value: supplierSummary?.totals?.totalNasiya || 0, color: "#f59e0b" },
                            ].filter(d => d.value > 0).map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} so'm`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <ExpenseDialog
        isOpen={expenseDialogOpen}
        onClose={() => { setExpenseDialogOpen(false); setEditingExpense(null); }}
        expense={editingExpense}
        categories={categories}
        onSave={(data: any) => { editingExpense ? updateExpense.mutate({ id: editingExpense.id, data }) : createExpense.mutate(data); }}
        isLoading={createExpense.isPending || updateExpense.isPending}
      />

      <CategoryDialog
        isOpen={catDialogOpen}
        onClose={() => { setCatDialogOpen(false); setEditingCat(null); }}
        category={editingCat}
        onSave={(data: any) => { editingCat ? updateCat.mutate({ id: editingCat.id, data }) : createCat.mutate(data); }}
        isLoading={createCat.isPending || updateCat.isPending}
      />

      <IncomeDialog
        isOpen={incomeDialogOpen}
        onClose={() => { setIncomeDialogOpen(false); setEditingIncome(null); }}
        onSave={(data: any) => createIncome.mutate(data)}
        onUpdate={({ id, data }: { id: string; data: any }) => updateIncomeEntry.mutate({ id, data })}
        isLoading={createIncome.isPending || updateIncomeEntry.isPending}
        income={editingIncome}
        categories={incomeCats}
      />

      <CategoryDialog
        isOpen={incomeCatDialogOpen}
        onClose={() => { setIncomeCatDialogOpen(false); setEditingIncomeCat(null); }}
        category={editingIncomeCat}
        onSave={(data: any) => { editingIncomeCat ? updateIncomeCat.mutate({ id: editingIncomeCat.id, data }) : createIncomeCat.mutate(data); }}
        isLoading={createIncomeCat.isPending || updateIncomeCat.isPending}
      />

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Qarz to'lash</DialogTitle>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold">{selectedDebt.customerName}</p>
                <p className="text-xs text-gray-500">Qoldiq: <span className="font-bold text-red-600">{(selectedDebt.totalAmount - (selectedDebt.paidAmount || 0)).toLocaleString()} so'm</span></p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPayAmount(String(selectedDebt.totalAmount - (selectedDebt.paidAmount || 0)))} className="text-xs">To'liq</Button>
                <Button size="sm" variant="outline" onClick={() => setPayAmount(String(Math.floor((selectedDebt.totalAmount - (selectedDebt.paidAmount || 0)) / 2)))} className="text-xs">Yarmini</Button>
              </div>
              <div>
                <Label>To'lov summasi (so'm)</Label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" data-testid="input-pay-amount" />
              </div>
              <div>
                <Label>Izoh</Label>
                <Input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Ixtiyoriy izoh" data-testid="input-pay-note" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Bekor</Button>
            <Button onClick={handleDebtPay} disabled={!payAmount || parseInt(payAmount) <= 0} data-testid="button-confirm-pay">To'lash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!saleDetailTx} onOpenChange={(open) => { if (!open) setSaleDetailTx(null); }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sotuv tafsilotlari
            </DialogTitle>
          </DialogHeader>
          {saleDetailTx && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sana:</span>
                  <span className="font-medium">{formatDateTime(saleDetailTx.date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">To'lov usuli:</span>
                  <span className="font-medium">{(saleDetailTx.paymentMethod || "").toLowerCase() === "mixed" ? "Aralash" : (saleDetailTx.paymentMethod || "Naqd")}</span>
                </div>
                {(saleDetailTx as any).paymentSplits && (saleDetailTx as any).paymentSplits.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-md p-2 space-y-1">
                    {((saleDetailTx as any).paymentSplits as Array<{method:string;amount:number}>).map((s, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-indigo-700 font-medium capitalize">{s.method}</span>
                        <span className="text-indigo-800 font-bold font-mono">{Number(s.amount || 0).toLocaleString()} so'm</span>
                      </div>
                    ))}
                  </div>
                )}
                {saleDetailTx.customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Mijoz:</span>
                    <span className="font-medium">{saleDetailTx.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Jami:</span>
                  <span className="font-bold text-green-600">{saleDetailTx.totalAmount.toLocaleString()} so'm</span>
                </div>
                {(saleDetailTx.totalProfit || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Foyda:</span>
                    <span className="font-medium text-blue-600">{(saleDetailTx.totalProfit || 0).toLocaleString()} so'm</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase">Tovarlar</p>
                {(saleDetailTx.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border bg-white">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.product?.name || "Noma'lum"}</p>
                      <p className="text-[10px] text-gray-400">{(item.product?.price || item.price || 0).toLocaleString()} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold shrink-0">{((item.product?.price || item.price || 0) * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSaleDetailTx(null)}>Yopish</Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-1"
                  onClick={() => {
                    setVoidConfirmId(saleDetailTx.id);
                    setSaleDetailTx(null);
                  }}
                  data-testid="button-void-from-detail"
                >
                  <X className="h-3.5 w-3.5" /> Bekor qilish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidConfirmId} onOpenChange={(open) => { if (!open) setVoidConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Sotuvni bekor qilish
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bu sotuvni bekor qilsangiz, sotilgan tovarlar omborga qaytariladi va tranzaksiya "bekor qilingan" deb belgilanadi. Bu amalni ortga qaytarib bo'lmaydi.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVoidConfirmId(null)} data-testid="button-cancel-void">Yopish</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!voidConfirmId) return;
                try {
                  await voidTransaction(voidConfirmId);
                  toast({
                    title: "Sotuv bekor qilindi",
                    description: "Tovarlar omborga qaytarildi",
                    className: "bg-green-500 text-white border-none",
                  });
                  syncTransactions();
                } catch (err: any) {
                  toast({
                    title: "Xato",
                    description: err.message || "Bekor qilishda xatolik",
                    variant: "destructive",
                  });
                }
                setVoidConfirmId(null);
              }}
              data-testid="button-confirm-void"
            >
              Ha, bekor qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpenseDialog({ isOpen, onClose, expense, categories, onSave, isLoading }: any) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setCategoryId(expense.categoryId || "");
      setDescription(expense.description || "");
      setDate(new Date(expense.date).toISOString().split("T")[0]);
    } else {
      setAmount("");
      setCategoryId(categories?.[0]?.id || "");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [expense, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Xarajatni tahrirlash" : "Yangi xarajat"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nimaga (kategoriya)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger data-testid="select-expense-category"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
              <SelectContent>
                {categories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Summa (so'm)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" data-testid="input-expense-amount" />
          </div>
          <div>
            <Label>Sana</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-expense-date" />
          </div>
          <div>
            <Label>Izoh</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Izoh yozing..." rows={2} data-testid="input-expense-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={() => { const amt = parseInt(amount); if (!amt || amt <= 0 || !categoryId) return; onSave({ amount: amt, categoryId, description, date }); }} disabled={isLoading || !amount || parseInt(amount) <= 0} data-testid="button-save-expense">
            {expense ? "Saqlash" : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncomeDialog({ isOpen, onClose, onSave, onUpdate, isLoading, income, categories }: any) {
  const [amount, setAmount] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (income) {
      setAmount(String(income.amount));
      setCategoryName(income.categoryName || (categories?.[0]?.name || ""));
      setCounterparty(income.counterparty || "");
      setPaymentType(income.paymentType || "cash");
      setNote(income.note || "");
      setDate(new Date(income.date).toISOString().split("T")[0]);
    } else {
      setAmount("");
      setCategoryName(categories?.[0]?.name || "");
      setCounterparty("");
      setPaymentType("cash");
      setNote("");
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [income, isOpen, categories]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowDownCircle className="h-5 w-5 text-green-600" /> {income ? "Kirimni tahrirlash" : "Yangi kirim"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nimadan (kategoriya)</Label>
            <Select value={categoryName} onValueChange={setCategoryName}>
              <SelectTrigger data-testid="select-income-category"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
              <SelectContent>
                {(categories || []).map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kimdan</Label>
            <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Ism yoki kompaniya" data-testid="input-income-from" />
          </div>
          <div>
            <Label>Summa (so'm)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" data-testid="input-income-amount" />
          </div>
          <div>
            <Label>To'lov turi</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger data-testid="select-income-payment"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Naqd</SelectItem>
                <SelectItem value="card">Karta</SelectItem>
                <SelectItem value="bank">Bank o'tkazma</SelectItem>
                <SelectItem value="other">Boshqa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sana</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-income-date" />
          </div>
          <div>
            <Label>Izoh</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ixtiyoriy izoh" data-testid="input-income-note" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={() => {
            const amt = parseInt(amount);
            if (!amt || amt <= 0 || !categoryName) return;
            const data = { amount: amt, categoryName, counterparty, paymentType, note, date };
            if (income) {
              onUpdate({ id: income.id, data });
            } else {
              onSave(data);
            }
          }} disabled={isLoading || !amount || parseInt(amount) <= 0} data-testid="button-save-income">
            {income ? "Saqlash" : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ isOpen, onClose, category, onSave, isLoading }: any) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Receipt");
  const [color, setColor] = useState("#6b7280");

  const iconOptions = ["Home", "Briefcase", "Truck", "Zap", "ShoppingBag", "Megaphone", "Receipt", "Users", "Tag", "Wallet", "Building", "MoreHorizontal"];
  const colorOptions = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#6b7280", "#14b8a6", "#f97316", "#06b6d4"];

  useEffect(() => {
    if (category) { setName(category.name); setIcon(category.icon || "Receipt"); setColor(category.color || "#6b7280"); }
    else { setName(""); setIcon("Receipt"); setColor("#6b7280"); }
  }, [category, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nomi</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Kategoriya nomi..." data-testid="input-category-name" />
          </div>
          <div>
            <Label>Ikonka</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {iconOptions.map(ic => {
                const IconComp = ICON_MAP[ic] || Receipt;
                return (
                  <button key={ic} onClick={() => setIcon(ic)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-colors ${icon === ic ? "border-primary bg-primary/10" : "border-gray-200 hover:border-gray-300"}`}
                    data-testid={`button-icon-${ic}`}>
                    <IconComp className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Rang</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {colorOptions.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} data-testid={`button-color-${c}`} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={() => { if (!name.trim()) return; onSave({ name: name.trim(), icon, color }); }} disabled={isLoading || !name.trim()} data-testid="button-save-category">
            {category ? "Saqlash" : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupplierCard({ supplier, token, categories, debtsInUsdOnly, onUpdate }: { supplier: any; token: string | null; categories?: any[]; debtsInUsdOnly?: boolean; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const [payDialogProduct, setPayDialogProduct] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<"add" | "edit">("add");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Bulk debt-payment dialog state
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [bulkCurrency, setBulkCurrency] = useState<"uzs" | "usd">("uzs");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMethod, setBulkMethod] = useState<"naqd" | "karta">("naqd");
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkRecordExpense, setBulkRecordExpense] = useState(true);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const nasiyaProducts = (supplier.products || []).filter((p: any) => p.paymentMethod === "nasiya");
  const nasiyaTotal = nasiyaProducts.reduce((s: number, p: any) => s + p.amount, 0);
  const nasiyaPaid = nasiyaProducts.reduce((s: number, p: any) => s + (p.paidAmount || 0), 0);
  const nasiyaRemaining = nasiyaTotal - nasiyaPaid;

  // USD-currency nasiya breakdown — computed per-product so we can offer USD
  // payment when the supplier's debt was originally entered in USD.
  // We require a positive supplierCurrencyRate to be eligible for USD
  // payment; without a rate the backend cannot convert the USD amount into
  // a UZS expense / supplierPaidAmount and rejects the product. Keeping the
  // same rule on the frontend ensures the displayed "USD remaining" matches
  // what the user can actually pay.
  const nasiyaUsdProducts = nasiyaProducts.filter(
    (p: any) => p.supplierCurrency === "usd" && (p.supplierCurrencyRate || 0) > 0
  );
  const nasiyaUsdTotal = nasiyaUsdProducts.reduce((s: number, p: any) => s + (p.amountUsd || 0), 0);
  const nasiyaUsdPaid = nasiyaUsdProducts.reduce((s: number, p: any) =>
    s + ((p.paidAmount || 0) > 0
      ? (p.paidAmount || 0) / p.supplierCurrencyRate
      : 0), 0);
  const nasiyaUsdRemaining = Math.max(0, nasiyaUsdTotal - nasiyaUsdPaid);
  const hasUsdDebt = nasiyaUsdRemaining > 0.01;

  // UZS-only debt (i.e. nasiya products whose supplier currency is NOT usd).
  // Used to decide which currency the dialog opens in: if every nasiya entry
  // is USD, we default the form to USD; otherwise UZS. We can't reuse
  // nasiyaRemaining here because it is the total UZS-equivalent of ALL nasiya
  // (including USD products converted), so it would be > 0 even when the
  // supplier truly has no UZS-only debt.
  const nasiyaUzsOnlyProducts = nasiyaProducts.filter((p: any) => p.supplierCurrency !== "usd");
  const nasiyaUzsOnlyRemaining = Math.max(0,
    nasiyaUzsOnlyProducts.reduce((s: number, p: any) => s + (p.amount - (p.paidAmount || 0)), 0)
  );
  const hasUzsOnlyDebt = nasiyaUzsOnlyRemaining > 0;

  // Approximate USD→UZS rate weighted by remaining USD per product (so the
  // preview shown to the user roughly matches what the cash register will
  // actually show after the payment).
  const weightedUsdRate = (() => {
    let totalUsd = 0;
    let totalUzs = 0;
    for (const p of nasiyaUsdProducts) {
      const rate = p.supplierCurrencyRate || 0;
      const owedUsd = Math.max(0, (p.amountUsd || 0) - ((p.paidAmount || 0) && rate > 0 ? p.paidAmount / rate : 0));
      if (owedUsd > 0 && rate > 0) {
        totalUsd += owedUsd;
        totalUzs += owedUsd * rate;
      }
    }
    return totalUsd > 0 ? totalUzs / totalUsd : 0;
  })();

  // When paying in UZS, the cap is the UZS-only remaining if any USD debt
  // exists (so a user can't accidentally over-pay against USD debts in
  // so'm). When the supplier has no USD debt, fall back to nasiyaRemaining
  // so existing UZS-only suppliers behave exactly as before.
  const remainingForCurrency = bulkCurrency === "usd"
    ? nasiyaUsdRemaining
    : (hasUsdDebt ? nasiyaUzsOnlyRemaining : nasiyaRemaining);
  const currencyLabel = bulkCurrency === "usd" ? "$" : "so'm";

  const openBulkPay = () => {
    // If the supplier has NO UZS-only debt remaining and has USD debt,
    // default the dialog to USD. Otherwise UZS. We compare on
    // hasUzsOnlyDebt rather than nasiyaRemaining because nasiyaRemaining is
    // the total UZS-equivalent and would be > 0 for USD-only suppliers too.
    const startCurrency: "uzs" | "usd" = (!hasUzsOnlyDebt && hasUsdDebt) ? "usd" : "uzs";
    setBulkCurrency(startCurrency);
    setBulkAmount(startCurrency === "usd" ? String(Math.round(nasiyaUsdRemaining * 100) / 100) : String(nasiyaUzsOnlyRemaining || nasiyaRemaining));
    setBulkMethod("naqd");
    // Pre-select a "Tovar" / "Yetkazib beruvchi" themed category if one exists,
    // otherwise the first category.
    const cats = categories || [];
    const preferred = cats.find((c: any) =>
      /tovar|yetkaz|tov|qarz|maxsulot|mahsulot/i.test(c.name || "")
    );
    setBulkCategoryId(preferred?.id || cats[0]?.id || "");
    setBulkRecordExpense(true);
    setBulkPayOpen(true);
  };

  // Switching currency mid-dialog: refill amount with the new currency's
  // remaining debt so user gets a sensible default + the "Hammasi" target.
  const switchBulkCurrency = (next: "uzs" | "usd") => {
    if (next === bulkCurrency) return;
    setBulkCurrency(next);
    setBulkAmount(
      next === "usd"
        ? String(Math.round(nasiyaUsdRemaining * 100) / 100)
        : String(hasUsdDebt ? nasiyaUzsOnlyRemaining : nasiyaRemaining)
    );
  };

  const submitBulkPay = async () => {
    const amt = Number(bulkAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Miqdorni kiriting", variant: "destructive" });
      return;
    }
    if (amt > remainingForCurrency + (bulkCurrency === "usd" ? 0.01 : 0)) {
      toast({ title: "Miqdor qarzdan ko'p bo'la olmaydi", variant: "destructive" });
      return;
    }
    if (bulkRecordExpense && !bulkCategoryId) {
      toast({ title: "Xarajat kategoriyasini tanlang yoki yozuvni o'chiring", variant: "destructive" });
      return;
    }
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/suppliers/pay-debt", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName: supplier.name,
          amount: amt,
          currency: bulkCurrency,
          paymentMethod: bulkMethod,
          recordExpense: bulkRecordExpense,
          expenseCategoryId: bulkRecordExpense ? bulkCategoryId : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Xato");
      }
      const data = await res.json();
      const desc = bulkCurrency === "usd"
        ? `$${data.used.toLocaleString()} ≈ ${(data.usedUzs || 0).toLocaleString()} so'm taqsimlandi (${data.productsUpdated} tovar)`
        : `${data.used.toLocaleString()} so'm taqsimlandi (${data.productsUpdated} tovar)`;
      toast({
        title: "To'lov amalga oshirildi",
        description: desc,
        className: "bg-green-500 text-white border-none",
      });
      setBulkPayOpen(false);
      onUpdate();
    } catch (e: any) {
      toast({ title: e?.message || "Xato", variant: "destructive" });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const updateDebtStatus = async (productId: string, status: string, paidAmt?: number) => {
    try {
      await fetch(`/api/products/${productId}/supplier-debt`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status, paidAmount: paidAmt }),
      });
      toast({ title: "Yangilandi", className: "bg-green-500 text-white border-none" });
      onUpdate();
    } catch {
      toast({ title: "Xato", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden" data-testid={`supplier-card-${supplier.name}`}>
        <div className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
            data-testid={`btn-toggle-supplier-${supplier.name}`}
          >
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{supplier.name}</p>
              {supplier.phone && <p className="text-xs text-gray-500">{supplier.phone}</p>}
              <p className="text-xs text-gray-400">{supplier.totalProducts} tovar, {supplier.totalItems} birlik</p>
            </div>
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              {debtsInUsdOnly ? (
                supplier.totalAmountUsd > 0 ? (
                  <p className="font-bold text-sm text-blue-600">${supplier.totalAmountUsd.toLocaleString()}</p>
                ) : (
                  <p className="font-bold text-sm">{supplier.totalAmount.toLocaleString()} so'm</p>
                )
              ) : (
                <>
                  <p className="font-bold text-sm">{supplier.totalAmount.toLocaleString()} so'm</p>
                  {supplier.totalAmountUsd > 0 && (
                    <p className="font-semibold text-xs text-blue-600">${supplier.totalAmountUsd.toLocaleString()}</p>
                  )}
                  <div className="flex gap-2 text-[10px]">
                    {supplier.naqd > 0 && <span className="text-green-600">Naqd: {supplier.naqd.toLocaleString()}</span>}
                    {supplier.karta > 0 && <span className="text-blue-600">Karta: {supplier.karta.toLocaleString()}</span>}
                    {supplier.nasiya > 0 && <span className="text-amber-600">Nasiya: {supplier.nasiya.toLocaleString()}</span>}
                  </div>
                </>
              )}
              {nasiyaRemaining > 0 && (
                debtsInUsdOnly ? (
                  nasiyaUsdRemaining > 0.01 ? (
                    <p className="text-[10px] text-red-500 font-medium mt-0.5">Qarz: ${nasiyaUsdRemaining.toLocaleString()}</p>
                  ) : (
                    <p className="text-[10px] text-red-500 font-medium mt-0.5">Qarz: {nasiyaRemaining.toLocaleString()} so'm</p>
                  )
                ) : (
                  <p className="text-[10px] text-red-500 font-medium mt-0.5">Qarz: {nasiyaRemaining.toLocaleString()} so'm</p>
                )
              )}
            </div>
            {nasiyaRemaining > 0 && (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); openBulkPay(); }}
                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1"
                data-testid={`btn-pay-supplier-${supplier.name}`}
              >
                <HandCoins className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">To'lash</span>
              </Button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-gray-200"
              data-testid={`btn-expand-supplier-${supplier.name}`}
            >
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {expanded && (
          <div className="border-t bg-gray-50 p-3 space-y-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left pb-1">Tovar</th>
                  <th className="text-right pb-1">Jami</th>
                  <th className="text-right pb-1">To'lov</th>
                  <th className="text-right pb-1">Holat</th>
                  <th className="text-right pb-1"></th>
                </tr>
              </thead>
              <tbody>
                {(supplier.products || []).map((p: any) => {
                  const isNasiya = p.paymentMethod === "nasiya";
                  const remaining = p.amount - (p.paidAmount || 0);
                  const statusLabel = !isNasiya ? "" :
                    p.debtStatus === "paid" ? "To'langan" :
                    p.debtStatus === "partial" ? `Qisman (${(p.paidAmount || 0).toLocaleString()})` :
                    "To'lanmagan";
                  const statusColor = !isNasiya ? "" :
                    p.debtStatus === "paid" ? "bg-green-100 text-green-700" :
                    p.debtStatus === "partial" ? "bg-orange-100 text-orange-700" :
                    "bg-red-100 text-red-700";

                  return (
                    <tr key={p.id} className="border-t border-gray-200">
                      <td className="py-1.5 pr-2">
                        <div className="truncate max-w-[100px]">{p.name}</div>
                        <div className="text-[10px] text-gray-400">
                          {p.supplierCurrency === "usd" 
                            ? `$${p.supplierOriginalPrice.toLocaleString()} × ${p.stock}` 
                            : `${p.costPrice.toLocaleString()} × ${p.stock}`}
                        </div>
                      </td>
                      <td className="py-1.5 text-right font-medium">
                        {p.amount.toLocaleString()}
                        {p.supplierCurrency === "usd" && p.amountUsd > 0 && (
                          <div className="text-[10px] text-blue-600">${p.amountUsd.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="py-1.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p.paymentMethod === "karta" ? "bg-blue-100 text-blue-700" :
                          p.paymentMethod === "nasiya" ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {p.paymentMethod === "karta" ? "Karta" : p.paymentMethod === "nasiya" ? "Nasiya" : "Naqd"}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">
                        {isNasiya && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>
                            {statusLabel}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-right">
                        {isNasiya && p.debtStatus !== "paid" && (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); updateDebtStatus(p.id, "paid", p.amount); }}
                              className="p-1 hover:bg-green-100 rounded text-green-600" title="To'landi"
                              data-testid={`btn-paid-${p.id}`}
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setPayDialogProduct(p); setPayAmount(""); setPayMode("add"); }}
                              className="p-1 hover:bg-orange-100 rounded text-orange-600" title="Qisman to'lov"
                              data-testid={`btn-partial-${p.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                              className="p-1 hover:bg-red-100 rounded text-red-600" title="O'chirish"
                              data-testid={`btn-delete-debt-${p.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {isNasiya && p.debtStatus === "paid" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateDebtStatus(p.id, "pending", 0); }}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Qaytarish"
                            data-testid={`btn-unpaid-${p.id}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {nasiyaProducts.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-xs">
                  <span className="text-amber-700 font-medium">Nasiya jami: </span>
                  <span className="font-bold text-amber-800">{nasiyaTotal.toLocaleString()} so'm</span>
                </div>
                <div className="text-xs">
                  <span className="text-green-600">To'langan: {nasiyaPaid.toLocaleString()}</span>
                  {nasiyaRemaining > 0 && <span className="text-red-600 ml-2">Qoldiq: {nasiyaRemaining.toLocaleString()}</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!payDialogProduct} onOpenChange={(open) => { if (!open) setPayDialogProduct(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{payMode === "edit" ? "To'lov summasini to'g'rilash" : "Qisman to'lov"}</DialogTitle></DialogHeader>
          {payDialogProduct && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setPayMode("add"); setPayAmount(""); }}
                  className={`py-1.5 text-xs font-medium rounded-md transition ${payMode === "add" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                  data-testid="btn-pay-mode-add"
                >
                  Qo'shish
                </button>
                <button
                  type="button"
                  onClick={() => { setPayMode("edit"); setPayAmount(String(payDialogProduct.paidAmount || 0)); }}
                  className={`py-1.5 text-xs font-medium rounded-md transition ${payMode === "edit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                  data-testid="btn-pay-mode-edit"
                >
                  To'g'rilash
                </button>
              </div>
              <p className="text-sm text-gray-600">{payDialogProduct.name}</p>
              <p className="text-sm">Jami: <b>{payDialogProduct.amount.toLocaleString()}</b> so'm</p>
              <p className="text-sm">Oldin to'langan: <b>{(payDialogProduct.paidAmount || 0).toLocaleString()}</b> so'm</p>
              <p className="text-sm">Qoldiq: <b>{(payDialogProduct.amount - (payDialogProduct.paidAmount || 0)).toLocaleString()}</b> so'm</p>
              <Input
                type="number"
                placeholder={payMode === "edit" ? "Yangi jami to'langan summa (so'm)" : "To'lov miqdori (so'm)"}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                data-testid="input-supplier-pay-amount"
              />
              {payMode === "edit" && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  Diqqat: kiritilgan summa avvalgi to'lovni to'liq <b>almashtiradi</b>. Xato kiritilgan summani to'g'rilash uchun ishlating.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (!payDialogProduct || payAmount === "") return;
                const entered = Number(payAmount);
                if (isNaN(entered) || entered < 0) return;
                const newPaid = payMode === "edit"
                  ? Math.min(entered, payDialogProduct.amount)
                  : Math.min((payDialogProduct.paidAmount || 0) + entered, payDialogProduct.amount);
                const newStatus = newPaid <= 0 ? "pending" : newPaid >= payDialogProduct.amount ? "paid" : "partial";
                updateDebtStatus(payDialogProduct.id, newStatus, newPaid);
                setPayDialogProduct(null);
              }}
              disabled={payAmount === "" || Number(payAmount) < 0 || isNaN(Number(payAmount))}
              data-testid="btn-confirm-partial-pay"
            >
              {payMode === "edit" ? "Saqlash" : "To'lash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkPayOpen} onOpenChange={(open) => { if (!open && !bulkSubmitting) setBulkPayOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yetkazib beruvchiga to'lov</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
              <p className="text-sm font-semibold text-amber-900">{supplier.name}</p>
              {supplier.phone && <p className="text-xs text-amber-700">{supplier.phone}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-amber-700">So'm qarzi:</span>
                <span className="text-sm font-bold text-amber-900" data-testid="text-bulk-debt-total">
                  {nasiyaRemaining.toLocaleString()} so'm
                </span>
              </div>
              {hasUsdDebt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-700">Dollar qarzi:</span>
                  <span className="text-sm font-bold text-blue-700" data-testid="text-bulk-debt-total-usd">
                    ${nasiyaUsdRemaining.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {/* Currency selector — only shown when supplier has USD debt; otherwise
                we default to UZS and skip the toggle to keep the dialog simple. */}
            {hasUsdDebt && (
              <div>
                <Label>To'lov valyutasi</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => switchBulkCurrency("uzs")}
                    disabled={!hasUzsOnlyDebt}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      bulkCurrency === "uzs"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                    data-testid="btn-bulk-currency-uzs"
                  >
                    So'm
                  </button>
                  <button
                    type="button"
                    onClick={() => switchBulkCurrency("usd")}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      bulkCurrency === "usd"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    data-testid="btn-bulk-currency-usd"
                  >
                    Dollar ($)
                  </button>
                </div>
              </div>
            )}

            <div>
              <Label>To'lov miqdori ({currencyLabel})</Label>
              <Input
                type="number"
                step={bulkCurrency === "usd" ? "0.01" : "1"}
                placeholder="0"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                className="mt-1"
                data-testid="input-bulk-pay-amount"
              />
              <div className="flex gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => setBulkAmount(
                    bulkCurrency === "usd"
                      ? String(Math.round((nasiyaUsdRemaining / 2) * 100) / 100)
                      : String(Math.round(remainingForCurrency / 2))
                  )}
                  className="text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Yarmi
                </button>
                <button
                  type="button"
                  onClick={() => setBulkAmount(
                    bulkCurrency === "usd"
                      ? String(Math.round(nasiyaUsdRemaining * 100) / 100)
                      : String(remainingForCurrency)
                  )}
                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium"
                >
                  Hammasi
                </button>
              </div>
              {bulkCurrency === "usd" && Number(bulkAmount) > 0 && weightedUsdRate > 0 && (
                <p className="text-[11px] text-blue-600 mt-1.5" data-testid="text-bulk-usd-preview">
                  ≈ {Math.round(Number(bulkAmount) * weightedUsdRate).toLocaleString()} so'm
                  {" "}(har bir tovar o'z kursiga ko'ra hisoblanadi)
                </p>
              )}
            </div>

            <div>
              <Label>To'lov usuli</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setBulkMethod("naqd")}
                  className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    bulkMethod === "naqd"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                  data-testid="btn-bulk-method-naqd"
                >
                  Naqd
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMethod("karta")}
                  className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    bulkMethod === "karta"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                  data-testid="btn-bulk-method-karta"
                >
                  Karta
                </button>
              </div>
            </div>

            <div className="rounded-lg border p-2.5 space-y-2 bg-gray-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkRecordExpense}
                  onChange={(e) => setBulkRecordExpense(e.target.checked)}
                  className="h-4 w-4"
                  data-testid="checkbox-bulk-record-expense"
                />
                <span className="text-xs font-medium text-gray-700">Xarajat sifatida yozilsin (kassadan ayrilsin)</span>
              </label>
              {bulkRecordExpense && (
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-bulk-category">
                    <SelectValue placeholder="Xarajat kategoriyasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              To'lov eng eski qarzdan boshlab tarqatiladi. Tovarlar ro'yxatidagi qarz holati avtomatik yangilanadi.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkPayOpen(false)}
              disabled={bulkSubmitting}
              data-testid="btn-bulk-cancel"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={submitBulkPay}
              disabled={bulkSubmitting || !bulkAmount || Number(bulkAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="btn-bulk-confirm"
            >
              {bulkSubmitting ? "Saqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nasiya yozuvini o'chirish</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Bu tovarning nasiya ma'lumotini o'chirib, to'lov usulini naqd ga o'zgartirasizmi?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="btn-cancel-delete-debt">Bekor qilish</Button>
            <Button variant="destructive" onClick={async () => {
              if (!deleteConfirm) return;
              try {
                await fetch(`/api/products/${deleteConfirm}/supplier-debt`, {
                  method: "PATCH",
                  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "paid", paidAmount: 0 }),
                });
                await fetch(`/api/products/${deleteConfirm}`, {
                  method: "PATCH",
                  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ supplierPaymentMethod: "naqd" }),
                });
                toast({ title: "O'chirildi", className: "bg-green-500 text-white border-none" });
                onUpdate();
              } catch {
                toast({ title: "Xato", variant: "destructive" });
              }
              setDeleteConfirm(null);
            }} data-testid="btn-confirm-delete-debt">
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShiftHandoverTab({ token, period, balance, headers }: { token: string | null; period: string; balance: any; headers: Record<string, string> }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [handedBy, setHandedBy] = useState(() => localStorage.getItem("shift_handed_by") || "");
  const [receivedBy, setReceivedBy] = useState(() => localStorage.getItem("shift_received_by") || "");
  const [note, setNote] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getDateRange = () => {
    const now = new Date();
    let dateFrom: Date;
    if (period === "week") {
      const d = now.getDay() || 7;
      dateFrom = new Date(now);
      dateFrom.setDate(now.getDate() - d + 1);
      dateFrom.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      dateFrom = new Date(now);
      dateFrom.setHours(0, 0, 0, 0);
    }
    const dateTo = new Date(now);
    dateTo.setHours(23, 59, 59, 999);
    return { dateFrom, dateTo };
  };

  const { data: handovers = [] } = useQuery<any[]>({
    queryKey: ["shift-handovers"],
    queryFn: async () => {
      const res = await fetch("/api/shift-handovers", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const createHandover = useMutation({
    mutationFn: async () => {
      const { dateFrom, dateTo } = getDateRange();
      localStorage.setItem("shift_handed_by", handedBy);
      localStorage.setItem("shift_received_by", receivedBy);
      const res = await fetch("/api/shift-handovers", {
        method: "POST", headers,
        body: JSON.stringify({
          periodType: period,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
          handedByName: handedBy,
          receivedByName: receivedBy,
          note,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-handovers"] });
      setNote("");
      toast({ title: "Topshirish yaratildi!", description: "Qabul qiluvchi tasdiqlashi kerak", className: "bg-green-500 text-white border-none" });
    },
    onError: () => toast({ title: "Xatolik yuz berdi", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/shift-handovers/${id}/status`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["shift-handovers"] });
      toast({
        title: vars.status === "confirmed" ? "Qabul qilindi!" : "Rad etildi",
        className: vars.status === "confirmed" ? "bg-green-500 text-white border-none" : "bg-red-500 text-white border-none",
      });
    },
    onError: () => toast({ title: "Xatolik", variant: "destructive" }),
  });

  const periodLabel = period === "day" ? "Bugun" : period === "week" ? "Hafta" : "Oy";
  const cashAmount = balance?.cash || 0;
  const cardAmount = balance?.card || 0;
  const nasiyaAmount = balance?.nasiya || 0;
  const expensesAmount = balance?.totalExpense || 0;
  const totalAmount = cashAmount + cardAmount;

  const stats = useMemo(() => {
    const pending = handovers.filter((h: any) => h.status === "pending").length;
    const confirmed = handovers.filter((h: any) => h.status === "confirmed").length;
    const rejected = handovers.filter((h: any) => h.status === "rejected").length;
    return { total: handovers.length, pending, confirmed, rejected };
  }, [handovers]);

  const statusBadge = (status: string) => {
    if (status === "confirmed") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Tasdiqlangan</span>;
    if (status === "rejected") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Rad etilgan</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Kutilmoqda</span>;
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Smena topshirish — {periodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-[10px] text-green-600 font-medium">Naqd</p>
              <p className="text-lg font-bold text-green-700" data-testid="text-handover-cash">{cashAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-[10px] text-blue-600 font-medium">Karta</p>
              <p className="text-lg font-bold text-blue-700" data-testid="text-handover-card">{cardAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-[10px] text-amber-600 font-medium">Nasiya</p>
              <p className="text-lg font-bold text-amber-700" data-testid="text-handover-nasiya">{nasiyaAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-[10px] text-red-600 font-medium">Chiqimlar</p>
              <p className="text-lg font-bold text-red-700" data-testid="text-handover-expenses">{expensesAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 col-span-2 md:col-span-1">
              <p className="text-[10px] text-indigo-600 font-medium">Jami tushum</p>
              <p className="text-lg font-bold text-indigo-700" data-testid="text-handover-total">{totalAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Topshiruvchi</Label>
              <Input
                value={handedBy}
                onChange={e => setHandedBy(e.target.value)}
                placeholder="Ism kiriting (masalan: Yordamchi)"
                data-testid="input-handed-by"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Qabul qiluvchi</Label>
              <Input
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                placeholder="Ism kiriting (masalan: Boshliq)"
                data-testid="input-received-by"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Izoh (ixtiyoriy)</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Qo'shimcha ma'lumot..."
              className="h-16 resize-none"
              data-testid="input-handover-note"
            />
          </div>
          <Button
            onClick={() => createHandover.mutate()}
            disabled={!handedBy.trim() || !receivedBy.trim() || createHandover.isPending}
            className="w-full gap-2"
            data-testid="button-create-handover"
          >
            <UserCheck className="h-4 w-4" />
            {createHandover.isPending ? "Yaratilmoqda..." : "Topshirish yaratish"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1"><FileText className="h-3.5 w-3.5 text-gray-400" /><span className="text-[10px] text-gray-500 font-medium">JAMI</span></div>
            <p className="text-xl font-bold" data-testid="text-handover-count-total">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1"><Clock className="h-3.5 w-3.5 text-amber-500" /><span className="text-[10px] text-amber-600 font-medium">KUTILMOQDA</span></div>
            <p className="text-xl font-bold text-amber-600" data-testid="text-handover-count-pending">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1"><UserCheck className="h-3.5 w-3.5 text-green-500" /><span className="text-[10px] text-green-600 font-medium">TASDIQLANGAN</span></div>
            <p className="text-xl font-bold text-green-600" data-testid="text-handover-count-confirmed">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1"><X className="h-3.5 w-3.5 text-red-500" /><span className="text-[10px] text-red-600 font-medium">RAD ETILGAN</span></div>
            <p className="text-xl font-bold text-red-600" data-testid="text-handover-count-rejected">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" />
            Topshirishlar tarixi
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {handovers.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">Hali topshirish yo'q</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {handovers.map((h: any) => (
                <div key={h.id} className="border rounded-lg overflow-hidden" data-testid={`handover-${h.id}`}>
                  <div
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      h.status === "confirmed" ? "bg-green-50" : h.status === "rejected" ? "bg-red-50" : "bg-amber-50"
                    }`}>
                      {h.status === "confirmed" ? <UserCheck className="h-4 w-4 text-green-600" /> :
                       h.status === "rejected" ? <X className="h-4 w-4 text-red-600" /> :
                       <Clock className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{h.handedByName} → {h.receivedByName}</p>
                        {statusBadge(h.status)}
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {formatDateTime(h.createdAt)} · {h.periodType === "day" ? "Kunlik" : h.periodType === "week" ? "Haftalik" : "Oylik"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{(h.totalAmount || 0).toLocaleString()}</p>
                      <ChevronDown className={`h-3 w-3 text-gray-400 ml-auto transition-transform ${expandedId === h.id ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedId === h.id && (
                    <div className="border-t bg-gray-50 p-3 space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        <div className="p-2 bg-white rounded border">
                          <span className="text-gray-500">Naqd:</span>
                          <span className="font-bold text-green-600 ml-1">{(h.totalCash || 0).toLocaleString()}</span>
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <span className="text-gray-500">Karta:</span>
                          <span className="font-bold text-blue-600 ml-1">{(h.totalCard || 0).toLocaleString()}</span>
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <span className="text-gray-500">Nasiya:</span>
                          <span className="font-bold text-amber-600 ml-1">{(h.totalNasiya || 0).toLocaleString()}</span>
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <span className="text-gray-500">Chiqim:</span>
                          <span className="font-bold text-red-600 ml-1">{(h.totalExpenses || 0).toLocaleString()}</span>
                        </div>
                        <div className="p-2 bg-white rounded border col-span-2 md:col-span-1">
                          <span className="text-gray-500">Jami:</span>
                          <span className="font-bold text-indigo-600 ml-1">{(h.totalAmount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      {h.note && <p className="text-xs text-gray-500 italic">Izoh: {h.note}</p>}
                      {h.confirmedAt && <p className="text-[10px] text-gray-400">{h.status === "confirmed" ? "Tasdiqlangan" : "Rad etilgan"}: {formatDateTime(h.confirmedAt)}</p>}

                      {h.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: h.id, status: "confirmed" })}
                            disabled={updateStatus.isPending}
                            className="gap-1 bg-green-600 hover:bg-green-700"
                            data-testid={`button-confirm-${h.id}`}
                          >
                            <UserCheck className="h-3 w-3" /> Qabul qilish
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateStatus.mutate({ id: h.id, status: "rejected" })}
                            disabled={updateStatus.isPending}
                            className="gap-1"
                            data-testid={`button-reject-${h.id}`}
                          >
                            <X className="h-3 w-3" /> Rad etish
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
