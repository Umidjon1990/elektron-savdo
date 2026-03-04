import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
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
  Wallet, TrendingUp, TrendingDown, Plus, Pencil, Trash2,
  DollarSign, ArrowDownCircle, ArrowUpCircle, Receipt,
  Home, Briefcase, Truck, Zap, ShoppingBag, Megaphone, MoreHorizontal,
  Users, Printer, Tag, Settings, ChevronDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const ICON_MAP: Record<string, any> = {
  Home, Briefcase, Truck, Zap, ShoppingBag, Megaphone, Receipt, Users, Tag, Settings, MoreHorizontal, Wallet
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

const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#6b7280", "#14b8a6", "#f97316", "#06b6d4"];

export default function FinancePage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data: summary } = useQuery<any>({
    queryKey: ["finance-summary", period],
    queryFn: async () => {
      const res = await fetch(`/api/finance/summary?period=${period}`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: dailyData = [] } = useQuery<any[]>({
    queryKey: ["finance-daily", period],
    queryFn: async () => {
      const now = new Date();
      let from: Date;
      if (period === "month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === "week") {
        const d = now.getDay() || 7;
        from = new Date(now);
        from.setDate(now.getDate() - d + 1);
        from.setHours(0, 0, 0, 0);
      } else {
        from = new Date(now);
        from.setDate(now.getDate() - 6);
        from.setHours(0, 0, 0, 0);
      }
      const res = await fetch(`/api/finance/daily-breakdown?from=${from.toISOString()}&to=${now.toISOString()}`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

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

  useEffect(() => {
    if (token && categories.length === 0) {
      const initDefaults = async () => {
        const res = await fetch("/api/expense-categories", { headers });
        const existing = await res.json();
        if (existing.length === 0) {
          for (const cat of DEFAULT_CATEGORIES) {
            await fetch("/api/expense-categories", {
              method: "POST",
              headers,
              body: JSON.stringify(cat),
            });
          }
          queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
        }
      };
      initDefaults().catch(console.error);
    }
  }, [token, categories.length]);

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/expenses", { method: "POST", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-daily"] });
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      toast({ title: "Xarajat qo'shildi" });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-daily"] });
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      toast({ title: "Xarajat yangilandi" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-daily"] });
      toast({ title: "Xarajat o'chirildi" });
    },
  });

  const createCat = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/expense-categories", { method: "POST", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setCatDialogOpen(false);
      setEditingCat(null);
      toast({ title: "Kategoriya qo'shildi" });
    },
  });

  const updateCat = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/expense-categories/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setCatDialogOpen(false);
      setEditingCat(null);
      toast({ title: "Kategoriya yangilandi" });
    },
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expense-categories/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast({ title: "Kategoriya o'chirildi" });
    },
  });

  const revenue = summary?.revenue || 0;
  const expTotal = summary?.expensesTotal || 0;
  const profit = summary?.profit || 0;
  const prevRevenue = summary?.prevRevenue || 0;
  const prevExpenses = summary?.prevExpenses || 0;
  const prevProfit = summary?.prevProfit || 0;

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const revChange = pctChange(revenue, prevRevenue);
  const expChange = pctChange(expTotal, prevExpenses);
  const profitChange = pctChange(profit, prevProfit);

  const catExpenses = categories.map((cat: any) => {
    const total = expensesList
      .filter((e: any) => e.categoryId === cat.id)
      .reduce((sum: number, e: any) => sum + e.amount, 0);
    return { name: cat.name, value: total, color: cat.color };
  }).filter((c: any) => c.value > 0);

  const chartData = dailyData.map((d: any) => ({
    ...d,
    date: d.date.slice(5),
  }));

  const periodLabel = period === "day" ? "Bugun" : period === "week" ? "Hafta" : "Oy";

  const getCatById = (id: string) => categories.find((c: any) => c.id === id);

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
              {(["day", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    period === p ? "bg-white shadow text-primary" : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid={`button-period-${p}`}
                >
                  {p === "day" ? "Bugun" : p === "week" ? "Hafta" : "Oy"}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => setShowReport(!showReport)}
              variant={showReport ? "default" : "outline"}
              className="hidden md:flex gap-1"
              data-testid="button-toggle-report"
            >
              <Printer className="h-4 w-4" />
              Hisobot
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <ArrowDownCircle className="h-5 w-5 opacity-80" />
                  {revChange !== 0 && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${revChange > 0 ? "bg-white/20" : "bg-red-500/30"}`}>
                      {revChange > 0 ? "+" : ""}{revChange}%
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-80 font-medium">Tushum</p>
                <p className="text-lg md:text-xl font-bold" data-testid="text-revenue">{revenue.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500 to-rose-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <ArrowUpCircle className="h-5 w-5 opacity-80" />
                  {expChange !== 0 && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${expChange > 0 ? "bg-red-300/30" : "bg-white/20"}`}>
                      {expChange > 0 ? "+" : ""}{expChange}%
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-80 font-medium">Xarajat</p>
                <p className="text-lg md:text-xl font-bold" data-testid="text-expenses">{expTotal.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={`border-0 shadow-sm text-white ${profit >= 0 ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-orange-500 to-red-600"}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-5 w-5 opacity-80" />
                  {profitChange !== 0 && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${profitChange > 0 ? "bg-white/20" : "bg-red-500/30"}`}>
                      {profitChange > 0 ? "+" : ""}{profitChange}%
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-80 font-medium">Sof foyda</p>
                <p className="text-lg md:text-xl font-bold" data-testid="text-profit">{profit.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {!showReport && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tushum vs Xarajat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                          <Tooltip formatter={(value: number) => value.toLocaleString() + " so'm"} />
                          <Bar dataKey="revenue" name="Tushum" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Xarajat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Xarajat taqsimoti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {catExpenses.length > 0 ? (
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={catExpenses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                              {catExpenses.map((entry: any, index: number) => (
                                <Cell key={index} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => value.toLocaleString() + " so'm"} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-52 flex items-center justify-center text-sm text-gray-400">
                        Xarajat yo'q
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Xarajatlar</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCategories(!showCategories)}
                      className="text-xs gap-1"
                      data-testid="button-toggle-categories"
                    >
                      <Settings className="h-3 w-3" />
                      Kategoriyalar
                      <ChevronDown className={`h-3 w-3 transition-transform ${showCategories ? "rotate-180" : ""}`} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true); }}
                      className="gap-1"
                      data-testid="button-add-expense"
                    >
                      <Plus className="h-4 w-4" />
                      Xarajat qo'shish
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showCategories && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">Xarajat kategoriyalari</p>
                        <Button size="sm" variant="outline" onClick={() => { setEditingCat(null); setCatDialogOpen(true); }} className="text-xs gap-1 h-7" data-testid="button-add-category">
                          <Plus className="h-3 w-3" /> Yangi
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat: any) => {
                          const IconComp = ICON_MAP[cat.icon] || Receipt;
                          return (
                            <div key={cat.id} className="flex items-center gap-1.5 bg-white border rounded-lg px-2.5 py-1.5 text-xs group" data-testid={`category-${cat.id}`}>
                              <IconComp className="h-3.5 w-3.5" style={{ color: cat.color }} />
                              <span className="font-medium">{cat.name}</span>
                              <button onClick={() => { setEditingCat(cat); setCatDialogOpen(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-edit-category-${cat.id}`}>
                                <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                              </button>
                              <button onClick={() => { if (confirm("Kategoriyani o'chirishni tasdiqlaysizmi?")) deleteCat.mutate(cat.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-delete-category-${cat.id}`}>
                                <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {expensesList.length === 0 ? (
                      <div className="text-center py-8 text-sm text-gray-400">
                        Hali xarajat kiritilmagan
                      </div>
                    ) : (
                      expensesList.slice(0, 20).map((exp: any) => {
                        const cat = getCatById(exp.categoryId);
                        const IconComp = cat ? (ICON_MAP[cat.icon] || Receipt) : Receipt;
                        return (
                          <div key={exp.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 group transition-colors" data-testid={`expense-${exp.id}`}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (cat?.color || "#6b7280") + "15" }}>
                              <IconComp className="h-4 w-4" style={{ color: cat?.color || "#6b7280" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cat?.name || "Boshqa"}</p>
                              {exp.description && <p className="text-xs text-gray-500 truncate">{exp.description}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-600">-{exp.amount.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">{new Date(exp.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingExpense(exp); setExpenseDialogOpen(true); }} data-testid={`button-edit-expense-${exp.id}`}>
                                <Pencil className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500" />
                              </button>
                              <button onClick={() => { if (confirm("Xarajatni o'chirishni tasdiqlaysizmi?")) deleteExpense.mutate(exp.id); }} data-testid={`button-delete-expense-${exp.id}`}>
                                <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {showReport && (
            <Card className="border-0 shadow-sm" id="finance-report">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Kunlik hisobot - {periodLabel}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1 no-print" data-testid="button-print-report">
                  <Printer className="h-4 w-4" />
                  Chop etish
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
          )}
        </div>
      </div>

      <ExpenseDialog
        isOpen={expenseDialogOpen}
        onClose={() => { setExpenseDialogOpen(false); setEditingExpense(null); }}
        expense={editingExpense}
        categories={categories}
        onSave={(data: any) => {
          if (editingExpense) {
            updateExpense.mutate({ id: editingExpense.id, data });
          } else {
            createExpense.mutate(data);
          }
        }}
        isLoading={createExpense.isPending || updateExpense.isPending}
      />

      <CategoryDialog
        isOpen={catDialogOpen}
        onClose={() => { setCatDialogOpen(false); setEditingCat(null); }}
        category={editingCat}
        onSave={(data: any) => {
          if (editingCat) {
            updateCat.mutate({ id: editingCat.id, data });
          } else {
            createCat.mutate(data);
          }
        }}
        isLoading={createCat.isPending || updateCat.isPending}
      />
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

  const handleSubmit = () => {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return;
    if (!categoryId) return;
    onSave({ amount: amt, categoryId, description, date });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Xarajatni tahrirlash" : "Yangi xarajat"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Kategoriya</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger data-testid="select-expense-category">
                <SelectValue placeholder="Tanlang..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Summa (so'm)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              data-testid="input-expense-amount"
            />
          </div>
          <div>
            <Label>Sana</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="input-expense-date"
            />
          </div>
          <div>
            <Label>Izoh</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Izoh yozing..."
              rows={2}
              data-testid="input-expense-description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !amount || parseInt(amount) <= 0} data-testid="button-save-expense">
            {expense ? "Saqlash" : "Qo'shish"}
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

  const iconOptions = ["Home", "Briefcase", "Truck", "Zap", "ShoppingBag", "Megaphone", "Receipt", "Users", "Tag", "Wallet", "MoreHorizontal"];
  const colorOptions = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#6b7280", "#14b8a6", "#f97316", "#06b6d4"];

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon || "Receipt");
      setColor(category.color || "#6b7280");
    } else {
      setName("");
      setIcon("Receipt");
      setColor("#6b7280");
    }
  }, [category, isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon, color });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nomi</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kategoriya nomi..."
              data-testid="input-category-name"
            />
          </div>
          <div>
            <Label>Ikonka</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {iconOptions.map((ic) => {
                const IconComp = ICON_MAP[ic] || Receipt;
                return (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-colors ${
                      icon === ic ? "border-primary bg-primary/10" : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`button-icon-${ic}`}
                  >
                    <IconComp className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Rang</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? "border-gray-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  data-testid={`button-color-${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim()} data-testid="button-save-category">
            {category ? "Saqlash" : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
