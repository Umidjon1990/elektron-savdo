import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Store, Plus, Users, Package, ShoppingCart, Crown, ArrowLeft, Trash2, Eye, EyeOff, Copy, Check, ExternalLink, Link2, Clock, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface TenantWithStats {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  brandColor: string;
  plan: string;
  status: string;
  trialEnd: string | null;
  subscriptionDays: number;
  maxProducts: number;
  maxUsers: number;
  createdAt: string;
  productsCount: number;
  ordersCount: number;
  usersCount: number;
  ownerUsername: string | null;
  ownerPassword: string | null;
}

const planConfig: Record<string, { label: string; color: string; maxProducts: number; maxUsers: number }> = {
  free: { label: "Bepul sinov", color: "bg-gray-100 text-gray-700", maxProducts: 50, maxUsers: 1 },
  starter: { label: "Boshlang'ich", color: "bg-blue-100 text-blue-700", maxProducts: 200, maxUsers: 2 },
  professional: { label: "Professional", color: "bg-purple-100 text-purple-700", maxProducts: 1000, maxUsers: 5 },
  premium: { label: "Premium", color: "bg-amber-100 text-amber-700", maxProducts: 10000, maxUsers: 20 },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Faol", color: "bg-green-100 text-green-700" },
  suspended: { label: "To'xtatilgan", color: "bg-red-100 text-red-700" },
  trial: { label: "Sinov", color: "bg-yellow-100 text-yellow-700" },
};

export default function SuperAdminPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<TenantWithStats | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdStore, setCreatedStore] = useState<{ slug: string; name: string; username: string; password: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [resetPasswordTenant, setResetPasswordTenant] = useState<TenantWithStats | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [newStore, setNewStore] = useState({
    storeName: "",
    slug: "",
    username: "",
    password: "",
    plan: "free",
    subscriptionDays: "30",
  });

  if (!user?.isSuper) {
    return <Redirect to="/admin" />;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const { data: tenantsList = [], isLoading } = useQuery<TenantWithStats[]>({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tenants", { headers });
      if (!res.ok) throw new Error("Xatolik");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newStore) => {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Xatolik");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setCreateOpen(false);
      setCreatedStore({ slug: newStore.slug, name: newStore.storeName, username: newStore.username, password: newStore.password });
      setNewStore({ storeName: "", slug: "", username: "", password: "", plan: "free", subscriptionDays: "30" });
    },
    onError: (err: Error) => {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Xatolik");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setEditTenant(null);
      toast({ title: "O'zgartirildi" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/admin/tenants/${id}/reset-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Xatolik");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setResetPasswordTenant(null);
      setNewPassword("");
      toast({ title: "Parol yangilandi" });
    },
    onError: (err: Error) => {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Xatolik");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast({ title: "Do'kon o'chirildi" });
    },
    onError: (err: Error) => {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const getDaysLeft = (t: TenantWithStats) => {
    if (!t.trialEnd || t.subscriptionDays === 0) return null;
    const end = new Date(t.trialEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const totalProducts = tenantsList.reduce((s, t) => s + t.productsCount, 0);
  const totalOrders = tenantsList.reduce((s, t) => s + t.ordersCount, 0);
  const totalUsers = tenantsList.reduce((s, t) => s + t.usersCount, 0);
  const activeStores = tenantsList.filter((t) => t.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-super-admin-title">Super Admin</h1>
                <p className="text-slate-400 text-sm">Barcha do'konlarni boshqarish</p>
              </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-store">
                  <Plus className="h-4 w-4 mr-2" />
                  Yangi do'kon
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Yangi do'kon yaratish</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Do'kon nomi</label>
                    <Input
                      placeholder="Masalan: Kitob Dunyosi"
                      value={newStore.storeName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setNewStore((s) => ({ ...s, storeName: name, slug: generateSlug(name) }));
                      }}
                      data-testid="input-store-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Slug (URL manzili)</label>
                    <Input
                      placeholder="kitob-dunyosi"
                      value={newStore.slug}
                      onChange={(e) => setNewStore((s) => ({ ...s, slug: e.target.value }))}
                      data-testid="input-store-slug"
                    />
                    <p className="text-xs text-slate-500 mt-1">Faqat kichik harflar, raqamlar va tire (-)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Egasi (login)</label>
                    <Input
                      placeholder="admin_username"
                      value={newStore.username}
                      onChange={(e) => setNewStore((s) => ({ ...s, username: e.target.value }))}
                      data-testid="input-owner-username"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Parol</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Kamida 6 ta belgi"
                        value={newStore.password}
                        onChange={(e) => setNewStore((s) => ({ ...s, password: e.target.value }))}
                        data-testid="input-owner-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Obuna rejasi</label>
                    <Select value={newStore.plan} onValueChange={(v) => setNewStore((s) => ({ ...s, plan: v }))}>
                      <SelectTrigger data-testid="select-plan">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(planConfig).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Muddat (kun)</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="30"
                      value={newStore.subscriptionDays}
                      onChange={(e) => setNewStore((s) => ({ ...s, subscriptionDays: e.target.value }))}
                      data-testid="input-subscription-days"
                    />
                    <p className="text-xs text-slate-500 mt-1">0 = cheksiz muddat</p>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!newStore.storeName || !newStore.slug || !newStore.username || newStore.password.length < 6 || createMutation.isPending}
                    onClick={() => createMutation.mutate(newStore)}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending ? "Yaratilmoqda..." : "Do'kon yaratish"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-stores">{tenantsList.length}</p>
                <p className="text-xs text-slate-500">Do'konlar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-products">{totalProducts}</p>
                <p className="text-xs text-slate-500">Mahsulotlar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-orders">{totalOrders}</p>
                <p className="text-xs text-slate-500">Buyurtmalar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-users">{totalUsers}</p>
                <p className="text-xs text-slate-500">Foydalanuvchilar</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Do'konlar ro'yxati ({tenantsList.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50/80">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Do'kon</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Login / Parol</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Link</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Reja</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Muddat</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Status</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Mahsulot</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Buyurtma</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantsList.map((t) => {
                      const plan = planConfig[t.plan] || planConfig.free;
                      const status = statusConfig[t.status] || statusConfig.active;
                      return (
                        <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors" data-testid={`row-tenant-${t.id}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{t.name}</div>
                            <div className="text-xs text-slate-500">{t.slug}</div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="text-slate-900 font-medium text-xs">{t.ownerUsername || "—"}</div>
                            {t.ownerPassword ? (
                              <div className="text-slate-500 text-xs font-mono">{t.ownerPassword}</div>
                            ) : (
                              <button
                                onClick={() => { setResetPasswordTenant(t); setNewPassword(""); }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline mt-0.5"
                                data-testid={`button-set-password-${t.id}`}
                              >
                                Parol o'rnatish
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/store/${t.slug}`);
                                  toast({ title: "Link nusxalandi!" });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                                data-testid={`button-copy-link-${t.id}`}
                              >
                                <Link2 className="h-3 w-3" />
                                Nusxalash
                              </button>
                              <a
                                href={`/store/${t.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-600"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${plan.color} border-0 font-medium`} data-testid={`badge-plan-${t.id}`}>{plan.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const daysLeft = getDaysLeft(t);
                              if (daysLeft === null) {
                                return <span className="text-xs text-slate-400">Cheksiz</span>;
                              }
                              if (daysLeft <= 0) {
                                return (
                                  <div className="flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                    <span className="text-xs font-semibold text-red-600">Tugagan</span>
                                  </div>
                                );
                              }
                              if (daysLeft <= 3) {
                                return (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="text-xs font-semibold text-orange-600">{daysLeft} kun</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-green-500" />
                                  <span className="text-xs font-medium text-green-700">{daysLeft} kun</span>
                                </div>
                              );
                            })()}
                            {t.subscriptionDays > 0 && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{t.subscriptionDays} kunlik</div>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge className={`${status.color} border-0`}>{status.label}</Badge>
                          </td>
                          <td className="text-center px-4 py-3 hidden md:table-cell text-slate-600">{t.productsCount}</td>
                          <td className="text-center px-4 py-3 hidden lg:table-cell text-slate-600">{t.ordersCount}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditTenant(t)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                data-testid={`button-edit-tenant-${t.id}`}
                              >
                                Tahrirlash
                              </Button>
                              {t.id !== "default-tenant" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`"${t.name}" do'konini o'chirmoqchimisiz? Bu qaytarib bo'lmaydi!`)) {
                                      deleteMutation.mutate(t.id);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`button-delete-tenant-${t.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!createdStore} onOpenChange={(open) => { if (!open) { setCreatedStore(null); setLinkCopied(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Check className="h-5 w-5" />
              Do'kon muvaffaqiyatli yaratildi!
            </DialogTitle>
          </DialogHeader>
          {createdStore && (
            <div className="space-y-4 pt-2">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Do'kon nomi</p>
                  <p className="font-semibold text-slate-900">{createdStore.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Do'kon linki (mijozlar uchun)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 break-all" data-testid="text-store-link">
                      {window.location.origin}/store/{createdStore.slug}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0 border-green-300 hover:bg-green-100"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/store/${createdStore.slug}`);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      data-testid="button-copy-store-link"
                    >
                      {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Admin kirish linki</p>
                  <code className="block bg-white border border-green-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 break-all">
                    {window.location.origin}/store/{createdStore.slug}/login
                  </code>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-slate-500">Kirish ma'lumotlari</p>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Login:</span>
                  <span className="text-sm font-semibold text-slate-900">{createdStore.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Parol:</span>
                  <span className="text-sm font-semibold text-slate-900">{createdStore.password}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setCreatedStore(null); setLinkCopied(false); }}
                  data-testid="button-close-created"
                >
                  Yopish
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => window.open(`/store/${createdStore.slug}`, "_blank")}
                  data-testid="button-open-store"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Do'konni ochish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetPasswordTenant} onOpenChange={(open) => { if (!open) { setResetPasswordTenant(null); setNewPassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Parolni yangilash</DialogTitle>
          </DialogHeader>
          {resetPasswordTenant && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xs text-slate-500">Do'kon</p>
                <p className="font-semibold text-slate-900">{resetPasswordTenant.name}</p>
                <p className="text-xs text-slate-500 mt-1">Login: <span className="font-medium text-slate-800">{resetPasswordTenant.ownerUsername || "—"}</span></p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Yangi parol</label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  data-testid="input-new-password"
                />
              </div>
              <Button
                className="w-full"
                disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                onClick={() => resetPasswordMutation.mutate({ id: resetPasswordTenant.id, password: newPassword })}
                data-testid="button-save-password"
              >
                {resetPasswordMutation.isPending ? "Saqlanmoqda..." : "Parolni saqlash"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Do'konni tahrirlash: {editTenant?.name}</DialogTitle>
          </DialogHeader>
          {editTenant && (
            <EditTenantForm
              tenant={editTenant}
              onSave={(data) => updateMutation.mutate({ id: editTenant.id, data })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditTenantForm({
  tenant,
  onSave,
  isPending,
}: {
  tenant: TenantWithStats;
  onSave: (data: Record<string, any>) => void;
  isPending: boolean;
}) {
  const [plan, setPlan] = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.status);
  const [name, setName] = useState(tenant.name);
  const [maxProducts, setMaxProducts] = useState(String(tenant.maxProducts));
  const [maxUsers, setMaxUsers] = useState(String(tenant.maxUsers));
  const [subscriptionDays, setSubscriptionDays] = useState(String(tenant.subscriptionDays || 0));

  const handlePlanChange = (newPlan: string) => {
    setPlan(newPlan);
    const cfg = planConfig[newPlan];
    if (cfg) {
      setMaxProducts(String(cfg.maxProducts));
      setMaxUsers(String(cfg.maxUsers));
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Do'kon nomi</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-name" />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Obuna rejasi</label>
        <Select value={plan} onValueChange={handlePlanChange}>
          <SelectTrigger data-testid="select-edit-plan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(planConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-edit-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Muddat (kun)</label>
        <Input
          type="number"
          min="0"
          value={subscriptionDays}
          onChange={(e) => setSubscriptionDays(e.target.value)}
          data-testid="input-edit-subscription-days"
        />
        <p className="text-xs text-slate-500 mt-1">0 = cheksiz muddat. Yangi muddat bugundan boshlab hisoblanadi.</p>
        {tenant.trialEnd && (
          <p className="text-xs text-slate-500 mt-1">
            Hozirgi muddat tugashi: {new Date(tenant.trialEnd).toLocaleDateString("uz-UZ")}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Max mahsulot</label>
          <Input type="number" value={maxProducts} onChange={(e) => setMaxProducts(e.target.value)} data-testid="input-edit-max-products" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Max foydalanuvchi</label>
          <Input type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} data-testid="input-edit-max-users" />
        </div>
      </div>
      <Button
        className="w-full"
        disabled={isPending}
        onClick={() => onSave({ name, plan, status, maxProducts: Number(maxProducts), maxUsers: Number(maxUsers), subscriptionDays: Number(subscriptionDays) })}
        data-testid="button-save-edit"
      >
        {isPending ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </div>
  );
}
