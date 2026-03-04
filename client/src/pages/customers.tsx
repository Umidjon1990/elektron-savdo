import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, getAuthHeaders } from "@/lib/auth-context";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search, User, Phone, HandCoins, Banknote, Plus, Edit, Trash2,
  MapPin, Clock, ShoppingCart, Truck, Calendar, AlertTriangle, CheckCircle2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { OrdersTab } from "./crm/orders-tab";
import { DeliveriesTab } from "./crm/deliveries-tab";
import { DebtorsTab } from "./crm/debtors-tab";

interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  addresses: Array<{ label: string; address: string }>;
  notes: string;
  createdAt: string;
  ordersCount?: number;
  totalRevenue?: number;
  totalDebt?: number;
  lastOrderDate?: string;
}

interface DebtItem {
  transactionId: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  date: string;
  dueDate: string | null;
  debtStatus: string;
  items: any[];
}

interface CustomerDetail extends CustomerListItem {
  ordersCount: number;
  totalRevenue: number;
  totalDebt: number;
  deliveriesCount: number;
  lastOrder: any;
  orders: any[];
  deliveries: any[];
  debts: DebtItem[];
}

const crmTabs = [
  { id: "customers", label: "Mijozlar", icon: User },
  { id: "orders", label: "Buyurtmalar", icon: ShoppingCart },
  { id: "deliveries", label: "Yetkazish", icon: Truck },
  { id: "debtors", label: "Qarzdorlar", icon: HandCoins },
];

export default function CustomersPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeCrmTab, setActiveCrmTab] = useState("customers");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", notes: "" });
  const [editCustomer, setEditCustomer] = useState({ name: "", phone: "", notes: "", addresses: [] as Array<{ label: string; address: string }> });

  const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
  const limit = 50;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchDebounced(val);
      setPage(1);
    }, 300);
  }, []);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ["customers", searchDebounced, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchDebounced) params.set("search", searchDebounced);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/customers?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ customers: CustomerListItem[]; total: number }>;
    },
    enabled: !!token,
  });

  const customers = customersData?.customers || [];
  const total = customersData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: customerDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["customers", selectedCustomerId],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${selectedCustomerId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<CustomerDetail>;
    },
    enabled: !!selectedCustomerId && sheetOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; notes: string }) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Xatolik");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setAddDialogOpen(false);
      setNewCustomer({ name: "", phone: "", notes: "" });
      toast({ title: "Mijoz qo'shildi!", className: "bg-green-500 text-white border-none" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; phone: string; notes: string; addresses: Array<{ label: string; address: string }> }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Xatolik");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditDialogOpen(false);
      toast({ title: "Mijoz yangilandi!", className: "bg-green-500 text-white border-none" });
    },
    onError: () => {
      toast({ title: "Xatolik", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Xatolik");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSheetOpen(false);
      setSelectedCustomerId(null);
      toast({ title: "Mijoz o'chirildi", className: "bg-green-500 text-white border-none" });
    },
  });

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
        toast({ title: "To'lov qabul qilindi!", description: `${amount.toLocaleString()} so'm to'landi`, className: "bg-green-500 text-white border-none" });
        setPayDialogOpen(false);
        setPayAmount("");
        setPayNote("");
        setSelectedDebt(null);
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        toast({ title: "Xatolik", variant: "destructive" });
      }
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (activeTab === "debtors") return (c.totalDebt || 0) > 0;
    if (activeTab === "paid") return (c.totalDebt || 0) === 0;
    if (activeTab === "upcoming") return false;
    return true;
  });

  const stats = {
    total: total,
    debtors: customers.filter((c) => (c.totalDebt || 0) > 0).length,
    totalDebt: customers.reduce((s, c) => s + (c.totalDebt || 0), 0),
    upcoming: 0,
  };

  const openCustomerSheet = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSheetOpen(true);
  };

  const openEditDialog = () => {
    if (!customerDetail) return;
    setEditCustomer({
      name: customerDetail.name,
      phone: customerDetail.phone,
      notes: customerDetail.notes || "",
      addresses: customerDetail.addresses || [],
    });
    setEditDialogOpen(true);
  };

  const customerFilterTabs = [
    { id: "all", label: "Hammasi", count: total, icon: User },
    { id: "debtors", label: "Qarzdorlar", count: stats.debtors, icon: HandCoins },
    { id: "paid", label: "To'lganlar", count: null, icon: CheckCircle2 },
    { id: "upcoming", label: "Muddati yaqin", count: stats.upcoming, icon: AlertTriangle },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900" data-testid="text-crm-title">Mijozlar va CRM</h1>
              <p className="text-slate-500 text-sm">Mijozlar, buyurtmalar, yetkazish va qarzlar</p>
            </div>
            {activeCrmTab === "customers" && (
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-add-customer"
              >
                <Plus className="h-4 w-4 mr-1" />
                Mijoz qo'shish
              </Button>
            )}
          </div>

          <div className="flex gap-1 mb-6 bg-white rounded-xl border p-1 shadow-sm overflow-x-auto">
            {crmTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCrmTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeCrmTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                data-testid={`crm-tab-${tab.id}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeCrmTab === "customers" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card className="bg-blue-500 text-white border-none" data-testid="card-kpi-total">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 opacity-80" />
                      <span className="text-xs opacity-80">Jami mijozlar</span>
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-total-customers">{stats.total}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-500 text-white border-none" data-testid="card-kpi-debtors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <HandCoins className="h-4 w-4 opacity-80" />
                      <span className="text-xs opacity-80">Qarzdorlar</span>
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-debtors-count">{stats.debtors}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500 text-white border-none" data-testid="card-kpi-debt">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Banknote className="h-4 w-4 opacity-80" />
                      <span className="text-xs opacity-80">Jami qarz</span>
                    </div>
                    <p className="text-xl font-bold" data-testid="text-total-debt">{stats.totalDebt.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-500 text-white border-none" data-testid="card-kpi-upcoming">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 opacity-80" />
                      <span className="text-xs opacity-80">Muddati yaqin</span>
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-upcoming-count">{stats.upcoming}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {customerFilterTabs.map((tab) => (
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
                      onChange={(e) => handleSearch(e.target.value)}
                      data-testid="input-customer-search"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p>Yuklanmoqda...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Mijoz topilmadi</p>
                    <p className="text-sm mt-1">Bu bo'limda hali ma'lumot yo'q</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => openCustomerSheet(customer.id)}
                        data-testid={`customer-row-${customer.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                            (customer.totalDebt || 0) > 0 ? "bg-orange-500" : "bg-indigo-500"
                          }`}>
                            {customer.name ? customer.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate" data-testid={`text-customer-name-${customer.id}`}>{customer.name || "Nomsiz"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone || "\u2014"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right shrink-0">
                          <div className="hidden md:block">
                            <p className="text-xs text-muted-foreground">Buyurtmalar</p>
                            <p className="text-sm font-semibold">{customer.ordersCount || 0}</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-xs text-muted-foreground">Jami xarid</p>
                            <p className="text-sm font-semibold">{(customer.totalRevenue || 0).toLocaleString()}</p>
                          </div>
                          {customer.lastOrderDate && (
                            <div className="hidden lg:block">
                              <p className="text-xs text-muted-foreground">Oxirgi</p>
                              <p className="text-sm font-semibold">{format(new Date(customer.lastOrderDate), "dd.MM.yyyy")}</p>
                            </div>
                          )}
                          {(customer.totalDebt || 0) > 0 && (
                            <Badge variant="destructive" className="bg-orange-100 text-orange-700 hover:bg-orange-100" data-testid={`badge-debt-${customer.id}`}>
                              {(customer.totalDebt || 0).toLocaleString()} qarz
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      data-testid="button-prev-page"
                    >
                      Oldingi
                    </Button>
                    <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      data-testid="button-next-page"
                    >
                      Keyingi
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeCrmTab === "orders" && <OrdersTab />}
          {activeCrmTab === "deliveries" && <DeliveriesTab />}
          {activeCrmTab === "debtors" && <DebtorsTab />}
        </div>
      </main>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-customer-detail">
          {detailLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : customerDetail ? (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      customerDetail.totalDebt > 0 ? "bg-orange-500" : "bg-indigo-500"
                    }`}>
                      {customerDetail.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <SheetTitle className="text-lg" data-testid="text-detail-name">{customerDetail.name}</SheetTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customerDetail.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" onClick={openEditDialog} data-testid="button-edit-customer">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (confirm("Mijozni o'chirishni tasdiqlaysizmi?")) {
                          deleteMutation.mutate(customerDetail.id);
                        }
                      }}
                      data-testid="button-delete-customer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-bold" data-testid="text-detail-orders">{customerDetail.ordersCount}</p>
                    <p className="text-xs text-muted-foreground">Buyurtmalar</p>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <Banknote className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="text-lg font-bold" data-testid="text-detail-revenue">{customerDetail.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Daromad</p>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <HandCoins className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                    <p className="text-lg font-bold text-orange-600" data-testid="text-detail-debt">{customerDetail.totalDebt.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Qarz</p>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <Truck className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-lg font-bold" data-testid="text-detail-deliveries">{customerDetail.deliveriesCount}</p>
                    <p className="text-xs text-muted-foreground">Yetkazish</p>
                  </CardContent>
                </Card>
              </div>

              {customerDetail.addresses && customerDetail.addresses.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Manzillar</p>
                  {customerDetail.addresses.map((addr, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm mb-1">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{addr.label ? `${addr.label}: ` : ""}{addr.address}</span>
                    </div>
                  ))}
                </div>
              )}

              {customerDetail.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded-lg text-sm text-muted-foreground">
                  {customerDetail.notes}
                </div>
              )}

              <Tabs defaultValue="orders" className="mt-4">
                <TabsList className="w-full" data-testid="tabs-customer-detail">
                  <TabsTrigger value="orders" className="flex-1" data-testid="tab-detail-orders">Buyurtmalar</TabsTrigger>
                  <TabsTrigger value="deliveries" className="flex-1" data-testid="tab-detail-deliveries">Yetkazish</TabsTrigger>
                  <TabsTrigger value="debts" className="flex-1" data-testid="tab-detail-debts">Qarzlar</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="mt-3 space-y-2">
                  {customerDetail.orders.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-6">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Buyurtmalar yo'q
                    </div>
                  ) : (
                    customerDetail.orders.map((order: any) => (
                      <div key={order.id} className="bg-gray-50 rounded-lg p-3 border" data-testid={`order-item-${order.id}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold">{order.totalAmount?.toLocaleString()} so'm</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {order.createdAt ? format(new Date(order.createdAt), "dd.MM.yyyy HH:mm") : "\u2014"}
                            </p>
                          </div>
                          <Badge variant={order.status === "completed" ? "default" : "secondary"} data-testid={`badge-order-status-${order.id}`}>
                            {order.status}
                          </Badge>
                        </div>
                        {order.items && Array.isArray(order.items) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(order.items as any[]).map((it: any) => it.name || it.productName).filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="deliveries" className="mt-3 space-y-2">
                  {customerDetail.deliveries.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-6">
                      <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Yetkazishlar yo'q
                    </div>
                  ) : (
                    customerDetail.deliveries.map((delivery: any) => (
                      <div key={delivery.id} className="bg-gray-50 rounded-lg p-3 border" data-testid={`delivery-item-${delivery.id}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {delivery.address || "Manzil ko'rsatilmagan"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {delivery.scheduledAt ? format(new Date(delivery.scheduledAt), "dd.MM.yyyy HH:mm") : "\u2014"}
                            </p>
                          </div>
                          <Badge variant={delivery.status === "completed" ? "default" : "secondary"}>
                            {delivery.status}
                          </Badge>
                        </div>
                        {delivery.courier && (
                          <p className="text-xs text-muted-foreground mt-1">Kuryer: {delivery.courier}</p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="debts" className="mt-3 space-y-2">
                  {customerDetail.debts.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-6">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                      Qarz yo'q
                    </div>
                  ) : (
                    customerDetail.debts.map((debt) => {
                      const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
                      const daysLeft = dueDate ? differenceInDays(dueDate, new Date()) : null;
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
                              onClick={() => {
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
                    })
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-sm" data-testid="dialog-add-customer">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-500" />
              Yangi mijoz
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Ism *</Label>
              <Input
                placeholder="Mijoz ismi"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="mt-1"
                data-testid="input-new-customer-name"
              />
            </div>
            <div>
              <Label className="text-sm">Telefon *</Label>
              <Input
                placeholder="+998901234567"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="mt-1"
                data-testid="input-new-customer-phone"
              />
            </div>
            <div>
              <Label className="text-sm">Izoh</Label>
              <Textarea
                placeholder="Qo'shimcha ma'lumot..."
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                className="mt-1"
                data-testid="input-new-customer-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add">
              Bekor qilish
            </Button>
            <Button
              onClick={() => createMutation.mutate(newCustomer)}
              disabled={!newCustomer.name || !newCustomer.phone || createMutation.isPending}
              data-testid="button-save-customer"
            >
              {createMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-edit-customer">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-500" />
              Mijozni tahrirlash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Ism *</Label>
              <Input
                value={editCustomer.name}
                onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                className="mt-1"
                data-testid="input-edit-customer-name"
              />
            </div>
            <div>
              <Label className="text-sm">Telefon *</Label>
              <Input
                value={editCustomer.phone}
                onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })}
                className="mt-1"
                data-testid="input-edit-customer-phone"
              />
            </div>
            <div>
              <Label className="text-sm">Izoh</Label>
              <Textarea
                value={editCustomer.notes}
                onChange={(e) => setEditCustomer({ ...editCustomer, notes: e.target.value })}
                className="mt-1"
                data-testid="input-edit-customer-notes"
              />
            </div>
            <div>
              <Label className="text-sm">Manzillar</Label>
              {editCustomer.addresses.map((addr, i) => (
                <div key={i} className="flex gap-2 mt-1">
                  <Input
                    placeholder="Label"
                    value={addr.label}
                    onChange={(e) => {
                      const addrs = [...editCustomer.addresses];
                      addrs[i] = { ...addrs[i], label: e.target.value };
                      setEditCustomer({ ...editCustomer, addresses: addrs });
                    }}
                    className="w-24"
                    data-testid={`input-edit-addr-label-${i}`}
                  />
                  <Input
                    placeholder="Manzil"
                    value={addr.address}
                    onChange={(e) => {
                      const addrs = [...editCustomer.addresses];
                      addrs[i] = { ...addrs[i], address: e.target.value };
                      setEditCustomer({ ...editCustomer, addresses: addrs });
                    }}
                    className="flex-1"
                    data-testid={`input-edit-addr-address-${i}`}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-red-500"
                    onClick={() => {
                      const addrs = editCustomer.addresses.filter((_, idx) => idx !== i);
                      setEditCustomer({ ...editCustomer, addresses: addrs });
                    }}
                    data-testid={`button-remove-addr-${i}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => setEditCustomer({ ...editCustomer, addresses: [...editCustomer.addresses, { label: "", address: "" }] })}
                data-testid="button-add-address"
              >
                <Plus className="h-3 w-3 mr-1" />
                Manzil qo'shish
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                if (customerDetail) {
                  updateMutation.mutate({ id: customerDetail.id, ...editCustomer });
                }
              }}
              disabled={!editCustomer.name || !editCustomer.phone || updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-sm" data-testid="dialog-pay-debt">
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
                    data-testid="button-pay-full"
                  >
                    To'liq
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPayAmount(Math.round(selectedDebt.remaining / 2).toString())}
                    data-testid="button-pay-half"
                  >
                    Yarmini
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm">Izoh</Label>
                <Textarea
                  placeholder="Izoh..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="mt-1"
                  data-testid="input-pay-note"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)} data-testid="button-cancel-pay">
              Bekor qilish
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={handlePay}
              disabled={!payAmount || Number(payAmount) <= 0}
              data-testid="button-confirm-pay"
            >
              <Banknote className="h-4 w-4 mr-1" />
              To'lash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}