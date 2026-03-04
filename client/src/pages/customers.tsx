import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTransactions, type Transaction } from "@/lib/transaction-context";
import { useAuth } from "@/lib/auth-context";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Phone, HandCoins, CheckCircle2, AlertTriangle, Clock, Banknote, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface DebtInfo {
  transactionId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  date: string;
  dueDate: string | null;
  debtStatus: string;
  items: any[];
  customerInfo?: Record<string, string>;
}

interface CustomerSummary {
  name: string;
  phone: string;
  totalSpent: number;
  totalTransactions: number;
  lastDate: string;
  totalDebt: number;
  debts: DebtInfo[];
}

export default function CustomersPage() {
  const { transactions, syncTransactions } = useTransactions();
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "debtors" | "paid" | "upcoming">("all");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtInfo | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const customers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    const active = (transactions || []).filter(t => t.status !== "voided");

    for (const t of active) {
      if (!t.customerPhone && !t.customerName) continue;
      const key = t.customerPhone || t.customerName || "";
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          name: t.customerName || "",
          phone: t.customerPhone || "",
          totalSpent: 0,
          totalTransactions: 0,
          lastDate: t.date,
          totalDebt: 0,
          debts: [],
        });
      }

      const c = map.get(key)!;
      c.totalSpent += t.totalAmount;
      c.totalTransactions += 1;
      if (t.customerName && !c.name) c.name = t.customerName;
      if (new Date(t.date) > new Date(c.lastDate)) c.lastDate = t.date;

      if (t.paymentMethod === "nasiya" && t.debtStatus !== "paid") {
        const remaining = t.totalAmount - (t.paidAmount || 0);
        if (remaining > 0) {
          c.totalDebt += remaining;
          c.debts.push({
            transactionId: t.id,
            customerName: t.customerName || "",
            customerPhone: t.customerPhone || "",
            totalAmount: t.totalAmount,
            paidAmount: t.paidAmount || 0,
            remaining,
            date: t.date,
            dueDate: t.dueDate || null,
            debtStatus: t.debtStatus || "pending",
            items: t.items || [],
            customerInfo: t.customerInfo,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [transactions]);

  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    }

    if (activeTab === "debtors") {
      list = list.filter(c => c.totalDebt > 0);
    } else if (activeTab === "paid") {
      list = list.filter(c => c.totalDebt === 0 && c.debts.length === 0);
      const paidCustomers = customers.filter(c => {
        const active = (transactions || []).filter(t =>
          t.status !== "voided" &&
          t.paymentMethod === "nasiya" &&
          (t.customerPhone === c.phone || t.customerName === c.name)
        );
        return active.some(t => t.debtStatus === "paid");
      });
      const paidPhones = new Set(paidCustomers.map(c => c.phone));
      list = customers.filter(c => paidPhones.has(c.phone) && c.totalDebt === 0);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
      }
    } else if (activeTab === "upcoming") {
      const now = new Date();
      list = list.filter(c =>
        c.debts.some(d => {
          if (!d.dueDate) return false;
          const days = differenceInDays(new Date(d.dueDate), now);
          return days >= 0 && days <= 7;
        })
      );
    }

    return list;
  }, [customers, search, activeTab, transactions]);

  const stats = useMemo(() => {
    const debtors = customers.filter(c => c.totalDebt > 0);
    const totalDebt = debtors.reduce((s, c) => s + c.totalDebt, 0);
    const now = new Date();
    const upcoming = customers.filter(c =>
      c.debts.some(d => {
        if (!d.dueDate) return false;
        const days = differenceInDays(new Date(d.dueDate), now);
        return days >= 0 && days <= 7;
      })
    ).length;
    const overdue = customers.filter(c =>
      c.debts.some(d => {
        if (!d.dueDate) return false;
        return differenceInDays(new Date(d.dueDate), now) < 0;
      })
    ).length;
    return { debtorsCount: debtors.length, totalDebt, upcoming, overdue };
  }, [customers]);

  const handlePay = async () => {
    if (!selectedDebt || !payAmount) return;
    const amount = Number(payAmount);
    if (amount <= 0 || amount > selectedDebt.remaining) {
      toast({ title: "Noto'g'ri summa", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/debts/${selectedDebt.transactionId}/pay`, {
        method: "POST",
        headers,
        body: JSON.stringify({ amount, note: payNote }),
      });
      if (res.ok) {
        toast({
          title: "To'lov qabul qilindi!",
          description: `${amount.toLocaleString()} so'm to'landi`,
          className: "bg-green-500 text-white border-none",
        });
        setPayDialogOpen(false);
        setPayAmount("");
        setPayNote("");
        setSelectedDebt(null);
        await syncTransactions();
      } else {
        toast({ title: "Xatolik", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const tabs = [
    { id: "all" as const, label: "Hammasi", count: customers.length, icon: User },
    { id: "debtors" as const, label: "Qarzdorlar", count: stats.debtorsCount, icon: HandCoins },
    { id: "paid" as const, label: "To'lganlar", count: null, icon: CheckCircle2 },
    { id: "upcoming" as const, label: "Muddati yaqin", count: stats.upcoming, icon: AlertTriangle },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900" data-testid="text-customers-title">Mijozlar</h1>
            <p className="text-slate-500 text-sm">Qarzdorlar, to'lovlar va mijozlar bazasi</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="bg-blue-500 text-white border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 opacity-80" />
                  <span className="text-xs opacity-80">Jami mijozlar</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-total-customers">{customers.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-500 text-white border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <HandCoins className="h-4 w-4 opacity-80" />
                  <span className="text-xs opacity-80">Qarzdorlar</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-debtors-count">{stats.debtorsCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500 text-white border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="h-4 w-4 opacity-80" />
                  <span className="text-xs opacity-80">Jami qarz</span>
                </div>
                <p className="text-xl font-bold" data-testid="text-total-debt">{stats.totalDebt.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500 text-white border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 opacity-80" />
                  <span className="text-xs opacity-80">Muddati yaqin / O'tgan</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-upcoming-count">{stats.upcoming} / {stats.overdue}</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b space-y-3">
              <div className="flex flex-wrap gap-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.count !== null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? "bg-white/20" : "bg-gray-200"
                      }`}>{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Ism yoki telefon..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-customer-search"
                />
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Mijoz topilmadi</p>
                <p className="text-sm mt-1">Bu bo'limda hali ma'lumot yo'q</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredCustomers.map((customer) => {
                  const isExpanded = expandedCustomer === customer.phone;
                  return (
                    <div key={customer.phone} data-testid={`customer-row-${customer.phone}`}>
                      <div
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setExpandedCustomer(isExpanded ? null : customer.phone)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                            customer.totalDebt > 0 ? "bg-orange-500" : "bg-indigo-500"
                          }`}>
                            {customer.name ? customer.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{customer.name || "Nomsiz"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right shrink-0">
                          <div className="hidden md:block">
                            <p className="text-xs text-muted-foreground">Savdolar</p>
                            <p className="text-sm font-semibold">{customer.totalTransactions}</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-xs text-muted-foreground">Jami xarid</p>
                            <p className="text-sm font-semibold">{customer.totalSpent.toLocaleString()}</p>
                          </div>
                          {customer.totalDebt > 0 && (
                            <div>
                              <p className="text-xs text-orange-600">Qarz</p>
                              <p className="text-sm font-bold text-orange-600">{customer.totalDebt.toLocaleString()}</p>
                            </div>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 bg-gray-50/50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                            <div className="bg-white rounded-lg p-2 border">
                              <span className="text-muted-foreground">Jami xarid</span>
                              <p className="font-bold">{customer.totalSpent.toLocaleString()} so'm</p>
                            </div>
                            <div className="bg-white rounded-lg p-2 border">
                              <span className="text-muted-foreground">Savdolar</span>
                              <p className="font-bold">{customer.totalTransactions} ta</p>
                            </div>
                            <div className="bg-white rounded-lg p-2 border">
                              <span className="text-muted-foreground">Qarz</span>
                              <p className="font-bold text-orange-600">{customer.totalDebt.toLocaleString()} so'm</p>
                            </div>
                            <div className="bg-white rounded-lg p-2 border">
                              <span className="text-muted-foreground">Oxirgi xarid</span>
                              <p className="font-bold">{format(new Date(customer.lastDate), "dd.MM.yyyy")}</p>
                            </div>
                          </div>

                          {customer.debts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Nasiya tarixi</h4>
                              {customer.debts.map((debt) => {
                                const now = new Date();
                                const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
                                const daysLeft = dueDate ? differenceInDays(dueDate, now) : null;
                                const isOverdue = daysLeft !== null && daysLeft < 0;
                                const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
                                const paidPercent = Math.round((debt.paidAmount / debt.totalAmount) * 100);

                                return (
                                  <div key={debt.transactionId} className="bg-white rounded-lg border p-3" data-testid={`debt-card-${debt.transactionId}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs text-muted-foreground">
                                            {format(new Date(debt.date), "dd.MM.yyyy")}
                                          </span>
                                          {dueDate && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                              isOverdue ? "bg-red-100 text-red-700" :
                                              isUrgent ? "bg-yellow-100 text-yellow-700" :
                                              "bg-gray-100 text-gray-600"
                                            }`}>
                                              <Calendar className="h-3 w-3 inline mr-0.5" />
                                              {isOverdue
                                                ? `${Math.abs(daysLeft!)} kun o'tgan`
                                                : daysLeft === 0 ? "Bugun"
                                                : `${daysLeft} kun qoldi`}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-sm font-bold">{debt.totalAmount.toLocaleString()} so'm</span>
                                          {debt.paidAmount > 0 && (
                                            <span className="text-xs text-green-600">({debt.paidAmount.toLocaleString()} to'langan)</span>
                                          )}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                          <div
                                            className={`h-1.5 rounded-full transition-all ${paidPercent >= 100 ? "bg-green-500" : "bg-orange-500"}`}
                                            style={{ width: `${Math.min(paidPercent, 100)}%` }}
                                          />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Qoldiq: <span className="font-semibold text-orange-600">{debt.remaining.toLocaleString()} so'm</span>
                                        </p>
                                      </div>
                                      <Button
                                        size="sm"
                                        className="bg-green-500 hover:bg-green-600 shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedDebt(debt);
                                          setPayAmount(debt.remaining.toString());
                                          setPayDialogOpen(true);
                                        }}
                                        data-testid={`button-pay-debt-${debt.transactionId}`}
                                      >
                                        <Banknote className="h-4 w-4 mr-1" />
                                        To'lash
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-500" />
              Qarz to'lash
            </DialogTitle>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mijoz:</span>
                  <span className="font-medium">{selectedDebt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Umumiy qarz:</span>
                  <span className="font-medium">{selectedDebt.totalAmount.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To'langan:</span>
                  <span className="font-medium text-green-600">{selectedDebt.paidAmount.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground font-medium">Qoldiq:</span>
                  <span className="font-bold text-orange-600">{selectedDebt.remaining.toLocaleString()} so'm</span>
                </div>
              </div>
              <div>
                <Label className="text-sm">To'lov summasi *</Label>
                <Input
                  type="number"
                  placeholder="Summa kiriting"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1"
                  data-testid="input-pay-amount"
                />
                <div className="flex gap-1 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPayAmount(selectedDebt.remaining.toString())}
                  >
                    To'liq
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPayAmount(Math.round(selectedDebt.remaining / 2).toString())}
                  >
                    Yarmini
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm">Izoh</Label>
                <Input
                  placeholder="Qo'shimcha izoh..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="mt-1"
                  data-testid="input-pay-note"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Bekor</Button>
            <Button className="bg-green-500 hover:bg-green-600" onClick={handlePay} data-testid="button-confirm-pay">
              To'lovni tasdiqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
