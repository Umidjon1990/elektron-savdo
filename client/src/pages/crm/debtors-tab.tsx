import { useState, useMemo, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, getAuthHeaders } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  User,
  Phone,
  HandCoins,
  Banknote,
  Calendar,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Transaction {
  id: string;
  date: string;
  items: any[];
  totalAmount: number;
  totalProfit: number;
  paymentMethod: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  customerInfo: Record<string, string> | null;
  dueDate: string | null;
  paidAmount: number;
  debtStatus: string | null;
}

interface DebtorGroup {
  customerName: string;
  customerPhone: string;
  totalDebt: number;
  totalPaid: number;
  remaining: number;
  lastPaymentDate: string | null;
  nextDueDate: string | null;
  status: "UPCOMING" | "OVERDUE" | "ACTIVE";
  transactions: Transaction[];
}

function getDebtorStatus(transactions: Transaction[]): "UPCOMING" | "OVERDUE" | "ACTIVE" {
  const now = new Date();
  let hasOverdue = false;
  let hasUpcoming = false;

  for (const t of transactions) {
    if (t.dueDate) {
      const due = new Date(t.dueDate);
      const diff = differenceInDays(due, now);
      if (diff < 0) hasOverdue = true;
      else if (diff <= 7) hasUpcoming = true;
    }
  }

  if (hasOverdue) return "OVERDUE";
  if (hasUpcoming) return "UPCOMING";
  return "ACTIVE";
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("uz-UZ") + " so'm";
}

export function DebtorsTab() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<number | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    debtor: DebtorGroup | null;
    transaction: Transaction | null;
  }>({ open: false, debtor: null, transaction: null });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const res = await fetch("/api/transactions", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const debtTransactions = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.paymentMethod === "nasiya" &&
          t.status !== "voided" &&
          t.debtStatus !== "paid"
      ),
    [transactions]
  );

  const debtors = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    for (const t of debtTransactions) {
      const key = t.customerPhone || t.customerName || "unknown";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    }

    const result: DebtorGroup[] = [];
    grouped.forEach((txns) => {
      const totalDebt = txns.reduce((s: number, t: Transaction) => s + t.totalAmount, 0);
      const totalPaid = txns.reduce((s: number, t: Transaction) => s + (t.paidAmount || 0), 0);
      const remaining = totalDebt - totalPaid;

      const dueDates = txns
        .filter((t: Transaction) => t.dueDate)
        .map((t: Transaction) => new Date(t.dueDate!).getTime());
      const nextDueDate = dueDates.length
        ? new Date(Math.min(...dueDates)).toISOString()
        : null;

      const sortedByDate = [...txns].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      result.push({
        customerName: txns[0].customerName || "Noma'lum",
        customerPhone: txns[0].customerPhone || "",
        totalDebt,
        totalPaid,
        remaining,
        lastPaymentDate: sortedByDate[0]?.date || null,
        nextDueDate,
        status: getDebtorStatus(txns),
        transactions: txns,
      });
    });

    return result;
  }, [debtTransactions]);

  const filteredDebtors = useMemo(() => {
    let result = debtors;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.customerName.toLowerCase().includes(q) ||
          d.customerPhone.includes(q)
      );
    }

    if (overdueOnly) {
      result = result.filter((d) => d.status === "OVERDUE");
    }

    if (periodFilter !== null) {
      const now = new Date();
      result = result.filter((d) => {
        if (!d.nextDueDate) return false;
        const diff = differenceInDays(new Date(d.nextDueDate), now);
        return diff <= periodFilter;
      });
    }

    if (minAmount) {
      const min = parseInt(minAmount);
      if (!isNaN(min)) result = result.filter((d) => d.remaining >= min);
    }
    if (maxAmount) {
      const max = parseInt(maxAmount);
      if (!isNaN(max)) result = result.filter((d) => d.remaining <= max);
    }

    return result;
  }, [debtors, search, overdueOnly, periodFilter, minAmount, maxAmount]);

  const kpis = useMemo(() => {
    const now = new Date();
    const totalDebt = debtors.reduce((s, d) => s + d.remaining, 0);
    const debtorCount = debtors.length;
    const upcoming = debtors.filter((d) => {
      if (!d.nextDueDate) return false;
      const diff = differenceInDays(new Date(d.nextDueDate), now);
      return diff >= 0 && diff <= 7;
    }).length;
    const overdue = debtors.filter((d) => d.status === "OVERDUE").length;
    return { totalDebt, debtorCount, upcoming, overdue };
  }, [debtors]);

  const payMutation = useMutation({
    mutationFn: async ({
      transactionId,
      amount,
      note,
    }: {
      transactionId: string;
      amount: number;
      note: string;
    }) => {
      const res = await fetch(`/api/debts/${transactionId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ amount, note }),
      });
      if (!res.ok) throw new Error("Payment failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setPaymentDialog({ open: false, debtor: null, transaction: null });
      setPaymentAmount("");
      setPaymentNote("");
    },
  });

  const openPaymentDialog = (debtor: DebtorGroup, transaction?: Transaction) => {
    const tx = transaction || debtor.transactions[0];
    setPaymentDialog({ open: true, debtor, transaction: tx });
    setPaymentAmount("");
    setPaymentNote("");
  };

  const handlePay = () => {
    if (!paymentDialog.transaction || !paymentAmount) return;
    payMutation.mutate({
      transactionId: paymentDialog.transaction.id,
      amount: parseInt(paymentAmount),
      note: paymentNote,
    });
  };

  const currentRemaining = paymentDialog.transaction
    ? paymentDialog.transaction.totalAmount -
      (paymentDialog.transaction.paidAmount || 0)
    : 0;

  const statusBadge = (status: string) => {
    switch (status) {
      case "OVERDUE":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100" data-testid="badge-overdue">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Muddati o'tgan
          </Badge>
        );
      case "UPCOMING":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100" data-testid="badge-upcoming">
            <Clock className="w-3 h-3 mr-1" />
            Muddati yaqin
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100" data-testid="badge-active">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Faol
          </Badge>
        );
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-red-200 bg-red-50" data-testid="kpi-total-debt">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-red-600">Jami qarz</span>
              </div>
              <p className="text-lg font-bold text-red-700" data-testid="text-total-debt">
                {formatMoney(kpis.totalDebt)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50" data-testid="kpi-debtor-count">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-600">Qarzdorlar soni</span>
              </div>
              <p className="text-lg font-bold text-orange-700" data-testid="text-debtor-count">
                {kpis.debtorCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50" data-testid="kpi-upcoming">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700">Muddati yaqin</span>
              </div>
              <p className="text-lg font-bold text-yellow-800" data-testid="text-upcoming-count">
                {kpis.upcoming}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-300 bg-red-100" data-testid="kpi-overdue">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-red-700">Muddati o'tgan</span>
              </div>
              <p className="text-lg font-bold text-red-800" data-testid="text-overdue-count">
                {kpis.overdue}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-slate-600">Muddat:</span>
              {[
                { label: "3 kun", value: 3 },
                { label: "7 kun", value: 7 },
                { label: "14 kun", value: 14 },
                { label: "Hammasi", value: null },
              ].map((p) => (
                <Button
                  key={p.label}
                  variant={periodFilter === p.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriodFilter(p.value)}
                  data-testid={`filter-period-${p.value ?? "all"}`}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                variant={overdueOnly ? "destructive" : "outline"}
                size="sm"
                onClick={() => setOverdueOnly(!overdueOnly)}
                data-testid="filter-overdue-toggle"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Muddati o'tganlar
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Min summa"
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-28 h-8"
                  data-testid="input-min-amount"
                />
                <span className="text-slate-400">-</span>
                <Input
                  placeholder="Max summa"
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-28 h-8"
                  data-testid="input-max-amount"
                />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Mijoz nomi yoki telefon raqami..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-debtors-search"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500" data-testid="debtors-loading">
                Yuklanmoqda...
              </div>
            ) : filteredDebtors.length === 0 ? (
              <div className="p-8 text-center text-slate-500" data-testid="debtors-empty">
                <HandCoins className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Qarzdorlar topilmadi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="debtors-table">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase">
                      <th className="p-3">Mijoz</th>
                      <th className="p-3">Telefon</th>
                      <th className="p-3">Umumiy qarz</th>
                      <th className="p-3">To'langan</th>
                      <th className="p-3">Qoldiq</th>
                      <th className="p-3 hidden md:table-cell">Oxirgi to'lov</th>
                      <th className="p-3 hidden md:table-cell">Keyingi to'lov</th>
                      <th className="p-3">Status</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDebtors.map((debtor, idx) => {
                      const isExpanded = expandedRow === debtor.customerPhone;
                      const paidPercent =
                        debtor.totalDebt > 0
                          ? Math.round((debtor.totalPaid / debtor.totalDebt) * 100)
                          : 0;
                      return (
                        <Fragment key={debtor.customerPhone || idx}>
                          <tr
                            className="border-b hover:bg-slate-50 cursor-pointer"
                            onClick={() =>
                              setExpandedRow(isExpanded ? null : debtor.customerPhone)
                            }
                            data-testid={`row-debtor-${idx}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                  <User className="w-4 h-4 text-slate-500" />
                                </div>
                                <span className="font-medium text-sm" data-testid={`text-debtor-name-${idx}`}>
                                  {debtor.customerName}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Phone className="w-3 h-3" />
                                <span data-testid={`text-debtor-phone-${idx}`}>
                                  {debtor.customerPhone || "-"}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-sm font-medium" data-testid={`text-debtor-total-${idx}`}>
                              {formatMoney(debtor.totalDebt)}
                            </td>
                            <td className="p-3">
                              <div className="space-y-1">
                                <span className="text-sm text-green-600" data-testid={`text-debtor-paid-${idx}`}>
                                  {formatMoney(debtor.totalPaid)}
                                </span>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className="bg-green-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${paidPercent}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sm font-semibold text-red-600" data-testid={`text-debtor-remaining-${idx}`}>
                              {formatMoney(debtor.remaining)}
                            </td>
                            <td className="p-3 hidden md:table-cell text-sm text-slate-500" data-testid={`text-debtor-last-payment-${idx}`}>
                              {debtor.lastPaymentDate
                                ? format(new Date(debtor.lastPaymentDate), "dd.MM.yyyy")
                                : "-"}
                            </td>
                            <td className="p-3 hidden md:table-cell text-sm text-slate-500" data-testid={`text-debtor-next-due-${idx}`}>
                              {debtor.nextDueDate
                                ? format(new Date(debtor.nextDueDate), "dd.MM.yyyy")
                                : "-"}
                            </td>
                            <td className="p-3" data-testid={`status-debtor-${idx}`}>
                              {statusBadge(debtor.status)}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPaymentDialog(debtor);
                                  }}
                                  data-testid={`button-pay-${idx}`}
                                >
                                  <Banknote className="w-3 h-3 mr-1" />
                                  To'lov
                                </Button>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr data-testid={`expanded-row-${idx}`}>
                              <td colSpan={9} className="bg-slate-50 p-0">
                                <div className="p-4 space-y-2">
                                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                                    Nasiya tranzaksiyalari ({debtor.transactions.length})
                                  </p>
                                  {debtor.transactions.map((t, tIdx) => {
                                    const tRemaining = t.totalAmount - (t.paidAmount || 0);
                                    const tPercent =
                                      t.totalAmount > 0
                                        ? Math.round(((t.paidAmount || 0) / t.totalAmount) * 100)
                                        : 0;
                                    return (
                                      <div
                                        key={t.id}
                                        className="flex flex-wrap items-center gap-4 p-3 bg-white rounded-lg border"
                                        data-testid={`debt-item-${idx}-${tIdx}`}
                                      >
                                        <div className="flex-1 min-w-[120px]">
                                          <p className="text-xs text-slate-500">
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            {format(new Date(t.date), "dd.MM.yyyy")}
                                          </p>
                                          <p className="text-sm font-medium mt-0.5">
                                            {formatMoney(t.totalAmount)}
                                          </p>
                                        </div>
                                        <div className="flex-1 min-w-[100px]">
                                          <p className="text-xs text-slate-500">To'langan</p>
                                          <p className="text-sm text-green-600">
                                            {formatMoney(t.paidAmount || 0)}
                                          </p>
                                          <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                                            <div
                                              className="bg-green-500 h-1 rounded-full"
                                              style={{ width: `${tPercent}%` }}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-[100px]">
                                          <p className="text-xs text-slate-500">Qoldiq</p>
                                          <p className="text-sm font-semibold text-red-600">
                                            {formatMoney(tRemaining)}
                                          </p>
                                        </div>
                                        <div className="min-w-[80px]">
                                          <p className="text-xs text-slate-500">Muddat</p>
                                          <p className="text-sm">
                                            {t.dueDate
                                              ? format(new Date(t.dueDate), "dd.MM.yyyy")
                                              : "-"}
                                          </p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-green-600 border-green-200 hover:bg-green-50"
                                          onClick={() => openPaymentDialog(debtor, t)}
                                          data-testid={`button-pay-item-${idx}-${tIdx}`}
                                        >
                                          To'lov
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={paymentDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentDialog({ open: false, debtor: null, transaction: null });
            setPaymentAmount("");
            setPaymentNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="payment-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-green-600" />
              To'lov qilish
            </DialogTitle>
          </DialogHeader>
          {paymentDialog.debtor && paymentDialog.transaction && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-medium" data-testid="dialog-customer-name">
                    {paymentDialog.debtor.customerName}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span data-testid="dialog-customer-phone">
                      {paymentDialog.debtor.customerPhone || "-"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Umumiy</p>
                  <p className="text-sm font-semibold" data-testid="dialog-total-amount">
                    {formatMoney(paymentDialog.transaction.totalAmount)}
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">To'langan</p>
                  <p className="text-sm font-semibold text-green-700" data-testid="dialog-paid-amount">
                    {formatMoney(paymentDialog.transaction.paidAmount || 0)}
                  </p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">Qoldiq</p>
                  <p className="text-sm font-semibold text-red-700" data-testid="dialog-remaining">
                    {formatMoney(currentRemaining)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>To'lov summasi</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Summani kiriting..."
                  data-testid="input-payment-amount"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount(String(currentRemaining))}
                    data-testid="button-full-amount"
                  >
                    To'liq
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPaymentAmount(String(Math.round(currentRemaining / 2)))
                    }
                    data-testid="button-half-amount"
                  >
                    Yarmini
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Izoh</Label>
                <Textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Izoh yozing..."
                  rows={2}
                  data-testid="input-payment-note"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPaymentDialog({ open: false, debtor: null, transaction: null })
              }
              data-testid="button-cancel-payment"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handlePay}
              disabled={
                !paymentAmount ||
                parseInt(paymentAmount) <= 0 ||
                payMutation.isPending
              }
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-submit-payment"
            >
              {payMutation.isPending ? "Yuklanmoqda..." : "To'lovni tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}