import { useState, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuthHeaders } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

type DeliveryStatus = "pending" | "delivered" | "failed" | "returned" | "cancelled";

interface DeliveryItem {
  id: string;
  orderId: string;
  customerId: string;
  address: string;
  courier: string;
  scheduledAt: string | null;
  completedAt: string | null;
  status: DeliveryStatus;
  note: string;
  createdAt: string;
  order?: {
    id: string;
    customerName: string;
    customerPhone: string;
    items: any[];
    totalAmount: number;
    status: string;
    paymentMethod: string;
  };
}

const statusConfig: Record<DeliveryStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Kutilmoqda", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200" },
  delivered: { label: "Yetkazildi", color: "text-green-700", bg: "bg-green-100 border-green-200" },
  failed: { label: "Muvaffaqiyatsiz", color: "text-red-700", bg: "bg-red-100 border-red-200" },
  returned: { label: "Qaytarildi", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  cancelled: { label: "Bekor qilingan", color: "text-gray-700", bg: "bg-gray-100 border-gray-200" },
};

const dateRanges = [
  { value: "today", label: "Bugun" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
];

const statusFilters = [
  { value: "all", label: "Hammasi" },
  { value: "pending", label: "Kutilmoqda" },
  { value: "delivered", label: "Yetkazildi" },
  { value: "failed", label: "Muvaffaqiyatsiz" },
  { value: "returned", label: "Qaytarildi" },
  { value: "cancelled", label: "Bekor" },
];

function getDateRange(range: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (range) {
    case "week": {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    }
    case "month": {
      from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      break;
    }
    default: {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
  }

  return { from: from.toISOString(), to };
}

export function DeliveriesTab() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courierSearch, setCourierSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { from, to } = getDateRange(dateRange);

  const { data: deliveries = [], isLoading } = useQuery<DeliveryItem[]>({
    queryKey: ["deliveries", statusFilter, courierSearch, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (courierSearch) params.set("courier", courierSearch);
      params.set("from", from);
      params.set("to", to);
      const res = await fetch(`/api/deliveries?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliveryItem> }) => {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update delivery");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });

  const totalCount = deliveries.length;
  const pendingCount = deliveries.filter((d) => d.status === "pending").length;
  const deliveredCount = deliveries.filter((d) => d.status === "delivered").length;
  const failedCount = deliveries.filter((d) => d.status === "failed").length;

  const kpiCards = [
    { label: "Jami", value: totalCount, icon: Package, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    { label: "Kutilmoqda", value: pendingCount, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
    { label: "Yetkazildi", value: deliveredCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    { label: "Muvaffaqiyatsiz", value: failedCount, icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="deliveries-kpi-cards">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className={`border ${kpi.border}`} data-testid={`kpi-card-${kpi.label.toLowerCase()}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className={`text-xl font-bold ${kpi.color}`} data-testid={`kpi-value-${kpi.label.toLowerCase()}`}>
                    {kpi.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="deliveries-filters">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-2">
              {dateRanges.map((range) => (
                <Button
                  key={range.value}
                  variant={dateRange === range.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateRange(range.value)}
                  data-testid={`filter-delivery-date-${range.value}`}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  {range.label}
                </Button>
              ))}
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="filter-delivery-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((sf) => (
                  <SelectItem key={sf.value} value={sf.value} data-testid={`filter-delivery-status-${sf.value}`}>
                    {sf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Kuryer qidirish..."
                value={courierSearch}
                onChange={(e) => setCourierSearch(e.target.value)}
                className="pl-9"
                data-testid="input-courier-search"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="deliveries-table">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400" data-testid="deliveries-loading">
              Yuklanmoqda...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center" data-testid="deliveries-empty">
              <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Yetkazib berishlar topilmadi</p>
              <p className="text-slate-400 text-sm mt-1">Tanlangan filtrlar bo'yicha ma'lumot yo'q</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-deliveries">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Sana</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Buyurtma#</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Mijoz</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Manzil</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Kuryer</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => {
                    const config = statusConfig[delivery.status] || statusConfig.pending;
                    const isExpanded = expandedId === delivery.id;

                    return (
                      <Fragment key={delivery.id}>
                        <tr
                          className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                          data-testid={`row-delivery-${delivery.id}`}
                        >
                          <td className="px-4 py-3 text-sm text-slate-600" data-testid={`text-date-${delivery.id}`}>
                            {delivery.createdAt ? format(new Date(delivery.createdAt), "dd.MM.yyyy HH:mm") : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900" data-testid={`text-order-${delivery.id}`}>
                            #{delivery.orderId?.slice(-6) || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600" data-testid={`text-customer-${delivery.id}`}>
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              {delivery.order?.customerName || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600" data-testid={`text-address-${delivery.id}`}>
                            <div className="flex items-center gap-1.5 max-w-[200px]">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{delivery.address || "-"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600" data-testid={`text-courier-${delivery.id}`}>
                            {delivery.courier || "-"}
                          </td>
                          <td className="px-4 py-3" data-testid={`badge-status-${delivery.id}`}>
                            <Badge variant="outline" className={`${config.bg} ${config.color} border text-xs`}>
                              {config.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500" data-testid={`text-note-${delivery.id}`}>
                            {delivery.note || "-"}
                          </td>
                        </tr>
                        {isExpanded && delivery.order && (
                          <tr data-testid={`row-delivery-details-${delivery.id}`}>
                            <td colSpan={7} className="bg-slate-50 px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Mijoz ma'lumotlari</p>
                                  <p className="text-sm font-medium">{delivery.order.customerName}</p>
                                  <p className="text-sm text-slate-500">{delivery.order.customerPhone}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Buyurtma</p>
                                  <p className="text-sm">
                                    {Array.isArray(delivery.order.items) ? delivery.order.items.length : 0} ta mahsulot
                                  </p>
                                  <p className="text-sm font-medium">
                                    {(delivery.order.totalAmount || 0).toLocaleString()} so'm
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Statusni o'zgartirish</p>
                                  <Select
                                    value={delivery.status}
                                    onValueChange={(val) =>
                                      updateMutation.mutate({
                                        id: delivery.id,
                                        data: { status: val as DeliveryStatus },
                                      })
                                    }
                                  >
                                    <SelectTrigger className="w-full" data-testid={`select-status-${delivery.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Kutilmoqda</SelectItem>
                                      <SelectItem value="delivered">Yetkazildi</SelectItem>
                                      <SelectItem value="failed">Muvaffaqiyatsiz</SelectItem>
                                      <SelectItem value="returned">Qaytarildi</SelectItem>
                                      <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
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
  );
}