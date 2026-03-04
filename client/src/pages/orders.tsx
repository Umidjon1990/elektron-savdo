import { useState, useMemo } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Phone,
  MapPin,
  Calendar,
  CircleDot,
} from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { useAuth, getAuthHeaders } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Yangi", color: "text-blue-700", bg: "bg-blue-100" },
  confirmed: { label: "Tasdiqlangan", color: "text-indigo-700", bg: "bg-indigo-100" },
  preparing: { label: "Tayyorlanmoqda", color: "text-yellow-700", bg: "bg-yellow-100" },
  out_for_delivery: { label: "Yo'lda", color: "text-purple-700", bg: "bg-purple-100" },
  delivered: { label: "Yetkazildi", color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "Bekor", color: "text-red-700", bg: "bg-red-100" },
};

const paymentStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "To'langan", color: "text-green-700", bg: "bg-green-100" },
  partial: { label: "Qisman", color: "text-yellow-700", bg: "bg-yellow-100" },
  unpaid: { label: "To'lanmagan", color: "text-red-700", bg: "bg-red-100" },
};

const nextStatuses: Record<string, string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

interface OrderItem {
  productId?: string;
  productName?: string;
  name?: string;
  quantity: number;
  qty?: number;
  price?: number;
  product?: { id: string; name: string; price: number };
}

interface OrderType {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryType: string;
  courier: string;
  statusHistory?: Array<{ status: string; date: string; userId?: string; note?: string }>;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  changes?: Record<string, any>;
  userId?: string;
  createdAt: string;
}

export default function OrdersPage() {
  const { } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [courierInput, setCourierInput] = useState("");

  const dateParams = useMemo(() => {
    const now = new Date();
    if (dateRange === "today") return { from: startOfDay(now).toISOString(), to: now.toISOString() };
    if (dateRange === "week") return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: now.toISOString() };
    if (dateRange === "month") return { from: startOfMonth(now).toISOString(), to: now.toISOString() };
    return {};
  }, [dateRange]);

  const { data: orders = [], isLoading } = useQuery<OrderType[]>({
    queryKey: ["orders-filtered", statusFilter, paymentFilter, deliveryFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
      if (deliveryFilter !== "all") params.set("deliveryType", deliveryFilter);
      if (dateParams.from) params.set("from", dateParams.from);
      if (dateParams.to) params.set("to", dateParams.to);
      const res = await fetch(`/api/orders-filtered?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const { data: selectedOrder } = useQuery<OrderType>({
    queryKey: ["order-detail", selectedOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${selectedOrderId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch order");
      return res.json();
    },
    enabled: !!selectedOrderId,
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", selectedOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?entityType=order&entityId=${selectedOrderId}`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedOrderId,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders-filtered"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs", selectedOrderId] });
    },
  });

  const courierMutation = useMutation({
    mutationFn: async ({ id, courier }: { id: string; courier: string }) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ courier }),
      });
      if (!res.ok) throw new Error("Failed to update courier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders-filtered"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", selectedOrderId] });
    },
  });

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const s = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(s) ||
        o.customerPhone.includes(s)
    );
  }, [orders, search]);

  const kpi = useMemo(() => {
    return {
      total: orders.length,
      new: orders.filter((o) => o.status === "new").length,
      delivering: orders.filter((o) => o.status === "out_for_delivery").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    };
  }, [orders]);

  const detail = selectedOrder || orders.find((o) => o.id === selectedOrderId);
  const items = (detail?.items as OrderItem[]) || [];
  const history = detail?.statusHistory || [];
  const validNext = detail ? (nextStatuses[detail.status] || []) : [];

  const openSheet = (id: string) => {
    setSelectedOrderId(id);
    const order = orders.find((o) => o.id === id);
    if (order) setCourierInput(order.courier || "");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900" data-testid="text-page-title">Buyurtmalar</h1>
            <p className="text-slate-500 text-sm">Barcha buyurtmalarni boshqaring</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-blue-500" data-testid="kpi-total">
              <div className="text-sm text-slate-500">Jami</div>
              <div className="text-2xl font-bold text-blue-600">{kpi.total}</div>
            </Card>
            <Card className="p-4 border-l-4 border-l-indigo-500" data-testid="kpi-new">
              <div className="text-sm text-slate-500">Yangi</div>
              <div className="text-2xl font-bold text-indigo-600">{kpi.new}</div>
            </Card>
            <Card className="p-4 border-l-4 border-l-purple-500" data-testid="kpi-delivering">
              <div className="text-sm text-slate-500">Yetkazilayotgan</div>
              <div className="text-2xl font-bold text-purple-600">{kpi.delivering}</div>
            </Card>
            <Card className="p-4 border-l-4 border-l-green-500" data-testid="kpi-delivered">
              <div className="text-sm text-slate-500">Yetkazilgan</div>
              <div className="text-2xl font-bold text-green-600">{kpi.delivered}</div>
            </Card>
          </div>

          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 flex flex-wrap items-center gap-3 border-b">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Ism yoki telefon orqali qidirish..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search"
                />
              </div>

              <div className="flex gap-1">
                {[
                  { key: "all", label: "Barchasi" },
                  { key: "today", label: "Bugun" },
                  { key: "week", label: "Hafta" },
                  { key: "month", label: "Oy" },
                ].map((d) => (
                  <Button
                    key={d.key}
                    variant={dateRange === d.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange(d.key)}
                    data-testid={`filter-date-${d.key}`}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha status</SelectItem>
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-payment-filter">
                  <SelectValue placeholder="To'lov" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha to'lov</SelectItem>
                  {Object.entries(paymentStatusConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-delivery-filter">
                  <SelectValue placeholder="Yetkazish" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha tur</SelectItem>
                  <SelectItem value="delivery">Yetkazish</SelectItem>
                  <SelectItem value="pickup">Olib ketish</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#ID</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Manzil</TableHead>
                    <TableHead>Summa</TableHead>
                    <TableHead>To'lov</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sana</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                        Yuklanmoqda...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400" data-testid="text-empty">
                        Buyurtmalar topilmadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const sc = statusConfig[order.status] || statusConfig.new;
                      const pc = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.unpaid;
                      return (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => openSheet(order.id)}
                          data-testid={`row-order-${order.id}`}
                        >
                          <TableCell className="font-mono text-sm" data-testid={`text-order-id-${order.id}`}>
                            #{order.id.slice(0, 6)}
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-customer-${order.id}`}>
                            {order.customerName}
                          </TableCell>
                          <TableCell className="text-slate-500" data-testid={`text-phone-${order.id}`}>
                            {order.customerPhone}
                          </TableCell>
                          <TableCell className="text-slate-500 max-w-[150px] truncate" data-testid={`text-address-${order.id}`}>
                            {order.address || "—"}
                          </TableCell>
                          <TableCell className="font-semibold" data-testid={`text-amount-${order.id}`}>
                            {order.totalAmount?.toLocaleString()} so'm
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${pc.bg} ${pc.color}`} data-testid={`badge-payment-${order.id}`}>
                              {pc.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${sc.bg} ${sc.color}`} data-testid={`badge-status-${order.id}`}>
                              {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm" data-testid={`text-date-${order.id}`}>
                            {order.createdAt ? format(new Date(order.createdAt), "dd.MM.yyyy HH:mm") : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      <Sheet open={!!selectedOrderId} onOpenChange={(open) => { if (!open) setSelectedOrderId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-order-detail">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3" data-testid="text-sheet-title">
              <ShoppingCart className="h-5 w-5" />
              Buyurtma #{detail?.id?.slice(0, 6)}
            </SheetTitle>
          </SheetHeader>

          {detail && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {detail.createdAt ? format(new Date(detail.createdAt), "dd.MM.yyyy HH:mm") : "—"}
                </div>
                <Badge
                  variant="secondary"
                  className={`${(statusConfig[detail.status] || statusConfig.new).bg} ${(statusConfig[detail.status] || statusConfig.new).color}`}
                  data-testid="badge-detail-status"
                >
                  {(statusConfig[detail.status] || statusConfig.new).label}
                </Badge>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Mahsulotlar ({items.length})
                </h3>
                <div className="bg-slate-50 rounded-lg divide-y">
                  {items.map((item, i) => {
                    const name = item.name || item.productName || item.product?.name || "Noma'lum";
                    const qty = item.quantity || item.qty || 0;
                    const price = item.price || item.product?.price || 0;
                    return (
                      <div key={i} className="flex items-center justify-between p-3" data-testid={`item-row-${i}`}>
                        <div>
                          <div className="font-medium text-sm">{name}</div>
                          <div className="text-xs text-slate-400">{qty} × {price.toLocaleString()} so'm</div>
                        </div>
                        <div className="font-semibold text-sm">{(qty * price).toLocaleString()} so'm</div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between p-3 bg-slate-100 rounded-b-lg">
                    <span className="font-semibold text-sm">Jami:</span>
                    <span className="font-bold text-green-600" data-testid="text-detail-total">
                      {detail.totalAmount?.toLocaleString()} so'm
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Mijoz ma'lumotlari
                </h3>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-slate-400" />
                    <span data-testid="text-detail-customer">{detail.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span data-testid="text-detail-phone">{detail.customerPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span data-testid="text-detail-address">{detail.address || "Ko'rsatilmagan"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Kuryer
                </h3>
                <div className="flex gap-2">
                  <Input
                    value={courierInput}
                    onChange={(e) => setCourierInput(e.target.value)}
                    placeholder="Kuryer ismi..."
                    data-testid="input-courier"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (detail) courierMutation.mutate({ id: detail.id, courier: courierInput });
                    }}
                    disabled={courierMutation.isPending}
                    data-testid="button-save-courier"
                  >
                    Saqlash
                  </Button>
                </div>
              </div>

              {validNext.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-slate-700">Statusni o'zgartirish</h3>
                  <div className="flex flex-wrap gap-2">
                    {validNext.map((s) => {
                      const sc = statusConfig[s];
                      return (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          className={`${sc.bg} ${sc.color} border-0 hover:opacity-80`}
                          onClick={() => statusMutation.mutate({ id: detail.id, status: s })}
                          disabled={statusMutation.isPending}
                          data-testid={`button-status-${s}`}
                        >
                          {sc.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status tarixi
                </h3>
                <div className="space-y-0 relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />
                  {history.length > 0 ? (
                    history.map((h, i) => {
                      const hc = statusConfig[h.status] || statusConfig.new;
                      return (
                        <div key={i} className="flex items-start gap-3 relative pl-5 py-2" data-testid={`timeline-entry-${i}`}>
                          <CircleDot className={`h-4 w-4 absolute left-0 ${hc.color}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={`${hc.bg} ${hc.color} text-xs`}>
                                {hc.label}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {h.date ? format(new Date(h.date), "dd.MM.yyyy HH:mm") : ""}
                              </span>
                            </div>
                            {h.note && <p className="text-xs text-slate-500 mt-1">{h.note}</p>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-400 pl-5">Tarix mavjud emas</p>
                  )}

                  {auditLogs.length > 0 && (
                    <>
                      <div className="border-t mt-3 pt-3">
                        <p className="text-xs font-medium text-slate-400 mb-2 pl-5">Audit log</p>
                      </div>
                      {auditLogs.map((log, i) => (
                        <div key={log.id} className="flex items-start gap-3 relative pl-5 py-2" data-testid={`audit-entry-${i}`}>
                          <CircleDot className="h-4 w-4 absolute left-0 text-slate-400" />
                          <div>
                            <div className="text-xs text-slate-600">{log.action}</div>
                            <span className="text-xs text-slate-400">
                              {log.createdAt ? format(new Date(log.createdAt), "dd.MM.yyyy HH:mm") : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}