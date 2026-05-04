import { useState, useRef, useEffect } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { useUpload } from "@/hooks/use-upload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Bell, Printer, Database, Shield, Palette, Receipt, Link2, Copy, Check, ExternalLink, Bot, Send, CreditCard, Plus, Trash2, Edit2, X, Package, Users, Image as ImageIcon, Upload, Loader2, Eye, QrCode, Download, Share2, ShoppingCart, ToggleLeft, ChevronDown, ChevronRight, DollarSign } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

interface PaymentMethod {
  id: string;
  name: string;
}

interface ProductField {
  key: string;
  label: string;
  required?: boolean;
}

interface CustomerField {
  key: string;
  label: string;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash", name: "Naqd" },
  { id: "card", name: "Karta" },
  { id: "nasiya", name: "Nasiya" },
];

const DEFAULT_PRODUCT_FIELDS: ProductField[] = [
  { key: "name", label: "Tovar nomi", required: true },
  { key: "description", label: "Tavsif", required: false },
];

const DEFAULT_CUSTOMER_FIELDS: CustomerField[] = [
  { key: "name", label: "Ism familiya" },
  { key: "phone", label: "Tel raqam" },
  { key: "address", label: "MFY (Manzil)" },
  { key: "note", label: "Izoh" },
];

interface FieldOption {
  id: string;
  label: string;
  type?: "delivery" | "pickup";
}

interface OrderFormField {
  key: string;
  label: string;
  enabled: boolean;
  required: boolean;
  options?: FieldOption[];
}

const DEFAULT_ORDER_FORM_FIELDS: OrderFormField[] = [
  { key: "name", label: "Ism Familiya", enabled: true, required: true },
  { key: "phone", label: "Aloqa uchun telefon", enabled: true, required: true },
  { key: "telegramPhone", label: "Telegram telefon", enabled: true, required: true },
  { key: "deliveryType", label: "Yetkazib berish turi", enabled: true, required: false, options: [
    { id: "delivery_paid", label: "Kuryer (pullik)", type: "delivery" },
    { id: "pickup", label: "Olib ketish", type: "pickup" },
  ]},
  { key: "address", label: "Manzil", enabled: true, required: false },
  { key: "shippingType", label: "Pochta turi", enabled: true, required: false, options: [
    { id: "BTS", label: "BTS" },
    { id: "Starex", label: "Starex" },
  ]},
  { key: "postalAddress", label: "Pochta manzili", enabled: true, required: false },
  { key: "paymentMethod", label: "To'lov turi", enabled: true, required: false },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { tenant, token } = useAuth();
  const queryClient = useQueryClient();
  const [darkMode, setDarkMode] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_PAYMENT_METHODS);
  const [newPaymentName, setNewPaymentName] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentName, setEditingPaymentName] = useState("");

  const [productFields, setProductFields] = useState<ProductField[]>(DEFAULT_PRODUCT_FIELDS);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState("");

  const [customerFields, setCustomerFields] = useState<CustomerField[]>(DEFAULT_CUSTOMER_FIELDS);
  const [newCustomerFieldLabel, setNewCustomerFieldLabel] = useState("");
  const [defaultDollarRate, setDefaultDollarRate] = useState("");
  const [orderFormFields, setOrderFormFields] = useState<OrderFormField[]>(DEFAULT_ORDER_FORM_FIELDS);
  const [newOrderFieldLabel, setNewOrderFieldLabel] = useState("");
  const [editingOrderFieldKey, setEditingOrderFieldKey] = useState<string | null>(null);
  const [editingOrderFieldLabel, setEditingOrderFieldLabel] = useState("");
  const [expandedOrderField, setExpandedOrderField] = useState<string | null>(null);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionLabel, setEditingOptionLabel] = useState("");

  const defaultFormVisibility: Record<string, boolean> = {
    costPrice: true,
    price: true,
    barcodePrice: true,
    wholesalePrice: true,
    description: true,
    videoUrl: true,
    isNew: true,
    category: true,
    author: true,
  };
  const [productFormVisibility, setProductFormVisibility] = useState<Record<string, boolean>>(defaultFormVisibility);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [debtsInUsdOnly, setDebtsInUsdOnly] = useState(false);

  const FORM_VISIBILITY_OPTIONS = [
    { key: "costPrice", label: "Tan narxi (kelish narxi)" },
    { key: "price", label: "Sotish narxi" },
    { key: "barcodePrice", label: "Barkod narxi" },
    { key: "wholesalePrice", label: "Ulgurchi narx" },
    { key: "description", label: "Izoh / Tavsif" },
    { key: "videoUrl", label: "YouTube video" },
    { key: "isNew", label: "\"YANGI\" belgisi" },
    { key: "category", label: "Kategoriya" },
    { key: "author", label: "Muallif / Brend" },
    { key: "supplier", label: "Tovar beruvchi" },
  ];

  const [receiptLogo, setReceiptLogo] = useState<string>("");

  const logoInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setReceiptLogo(response.objectPath);
      toast({ title: "Logo saqlandi ✓", duration: 2000, className: "bg-green-500 text-white border-none" });
    },
    onError: () => {
      toast({ title: "Logo yuklanmadi", variant: "destructive" });
    }
  });

  const { data: tenantSettings } = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: async () => {
      const res = await fetch("/api/tenant-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.telegramBotToken) setTelegramBotToken(data.telegramBotToken);
      if (data.telegramChatId) setTelegramChatId(data.telegramChatId);
      if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
      if (data.productFields) setProductFields(data.productFields);
      if (data.customerFields) setCustomerFields(data.customerFields);
      if (data.receiptLogo) setReceiptLogo(data.receiptLogo);
      if (data.productFormVisibility) setProductFormVisibility({ ...defaultFormVisibility, ...data.productFormVisibility });
      if (data.orderFormFields) setOrderFormFields(data.orderFormFields);
      if (data.defaultDollarRate !== undefined && data.defaultDollarRate !== null) setDefaultDollarRate(data.defaultDollarRate.toString());
      if (data.deliveryEnabled !== undefined) setDeliveryEnabled(data.deliveryEnabled);
      if (data.debtsInUsdOnly !== undefined) setDebtsInUsdOnly(data.debtsInUsdOnly);
      return data;
    },
    enabled: !!token,
  });

  const saveTelegramMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ telegramBotToken: telegramBotToken.trim(), telegramChatId: telegramChatId.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast({ title: "Saqlandi", description: "Telegram sozlamalari saqlandi" });
    },
    onError: () => {
      toast({ title: "Xatolik", description: "Telegram sozlamalarini saqlashda xatolik", variant: "destructive" });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/tenant-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast({ title: "Saqlandi ✓", className: "bg-green-500 text-white border-none", duration: 2000 });
    },
    onError: () => {
      toast({ title: "Xatolik", variant: "destructive" });
    },
  });

  const addPaymentMethod = () => {
    if (!newPaymentName.trim()) return;
    const id = newPaymentName.trim().toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const updated = [...paymentMethods, { id, name: newPaymentName.trim() }];
    setPaymentMethods(updated);
    setNewPaymentName("");
    saveConfigMutation.mutate({ paymentMethods: updated });
  };

  const removePaymentMethod = (id: string) => {
    const updated = paymentMethods.filter(m => m.id !== id);
    setPaymentMethods(updated);
    saveConfigMutation.mutate({ paymentMethods: updated });
  };

  const saveEditingPayment = () => {
    if (!editingPaymentId || !editingPaymentName.trim()) return;
    const updated = paymentMethods.map(m => m.id === editingPaymentId ? { ...m, name: editingPaymentName.trim() } : m);
    setPaymentMethods(updated);
    setEditingPaymentId(null);
    saveConfigMutation.mutate({ paymentMethods: updated });
  };

  const addProductField = () => {
    if (!newFieldLabel.trim()) return;
    const key = "custom_" + Date.now();
    const updated = [...productFields, { key, label: newFieldLabel.trim(), required: false }];
    setProductFields(updated);
    setNewFieldLabel("");
    saveConfigMutation.mutate({ productFields: updated });
  };

  const removeProductField = (key: string) => {
    if (key === "name") return;
    const updated = productFields.filter(f => f.key !== key);
    setProductFields(updated);
    saveConfigMutation.mutate({ productFields: updated });
  };

  const saveEditingField = () => {
    if (!editingFieldKey || !editingFieldLabel.trim()) return;
    const updated = productFields.map(f => f.key === editingFieldKey ? { ...f, label: editingFieldLabel.trim() } : f);
    setProductFields(updated);
    setEditingFieldKey(null);
    saveConfigMutation.mutate({ productFields: updated });
  };

  const addCustomerField = () => {
    if (!newCustomerFieldLabel.trim()) return;
    const key = "custom_" + Date.now();
    const updated = [...customerFields, { key, label: newCustomerFieldLabel.trim() }];
    setCustomerFields(updated);
    setNewCustomerFieldLabel("");
    saveConfigMutation.mutate({ customerFields: updated });
  };

  const removeCustomerField = (key: string) => {
    const updated = customerFields.filter(f => f.key !== key);
    setCustomerFields(updated);
    saveConfigMutation.mutate({ customerFields: updated });
  };

  const toggleOrderField = (key: string) => {
    const updated = orderFormFields.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f);
    setOrderFormFields(updated);
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const toggleOrderFieldRequired = (key: string) => {
    const updated = orderFormFields.map(f => f.key === key ? { ...f, required: !f.required } : f);
    setOrderFormFields(updated);
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const addOrderField = () => {
    if (!newOrderFieldLabel.trim()) return;
    const key = "custom_" + Date.now();
    const updated = [...orderFormFields, { key, label: newOrderFieldLabel.trim(), enabled: true, required: false }];
    setOrderFormFields(updated);
    setNewOrderFieldLabel("");
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const removeOrderField = (key: string) => {
    const builtIn = ["name", "phone", "telegramPhone", "deliveryType", "address", "shippingType", "postalAddress", "paymentMethod"];
    if (builtIn.includes(key)) return;
    const updated = orderFormFields.filter(f => f.key !== key);
    setOrderFormFields(updated);
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const saveEditingOrderField = () => {
    if (!editingOrderFieldKey || !editingOrderFieldLabel.trim()) return;
    const updated = orderFormFields.map(f => f.key === editingOrderFieldKey ? { ...f, label: editingOrderFieldLabel.trim() } : f);
    setOrderFormFields(updated);
    setEditingOrderFieldKey(null);
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const addFieldOption = (fieldKey: string, optionType?: "delivery" | "pickup") => {
    if (!newOptionLabel.trim()) return;
    const optId = newOptionLabel.trim().toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const newOpt: FieldOption = { id: optId, label: newOptionLabel.trim() };
    if (fieldKey === "deliveryType") newOpt.type = optionType || "delivery";
    const updated = orderFormFields.map(f => {
      if (f.key !== fieldKey) return f;
      const opts = f.options ? [...f.options, newOpt] : [newOpt];
      return { ...f, options: opts };
    });
    setOrderFormFields(updated);
    setNewOptionLabel("");
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const removeFieldOption = (fieldKey: string, optionId: string) => {
    const updated = orderFormFields.map(f => {
      if (f.key !== fieldKey || !f.options) return f;
      return { ...f, options: f.options.filter(o => o.id !== optionId) };
    });
    setOrderFormFields(updated);
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const saveEditingOption = (fieldKey: string) => {
    if (!editingOptionId || !editingOptionLabel.trim()) return;
    const updated = orderFormFields.map(f => {
      if (f.key !== fieldKey || !f.options) return f;
      return { ...f, options: f.options.map(o => o.id === editingOptionId ? { ...o, label: editingOptionLabel.trim() } : o) };
    });
    setOrderFormFields(updated);
    setEditingOptionId(null);
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const toggleOptionType = (fieldKey: string, optionId: string) => {
    const updated = orderFormFields.map(f => {
      if (f.key !== fieldKey || !f.options) return f;
      return { ...f, options: f.options.map(o => o.id === optionId ? { ...o, type: o.type === "pickup" ? "delivery" : "pickup" } : o) };
    });
    setOrderFormFields(updated);
    saveConfigMutation.mutate({ orderFormFields: updated });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Rasm hajmi juda katta", description: "5MB dan kichik rasm yuklang", variant: "destructive" });
        return;
      }
      await uploadFile(file);
    }
  };

  const saveReceiptLogo = () => {
    saveConfigMutation.mutate({ receiptLogo });
  };

  const handleSave = () => {
    toast({
      title: "Saqlandi",
      description: "Sozlamalar muvaffaqiyatli saqlandi",
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />
      
      <main className="flex-1 min-w-0 p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Sozlamalar</h1>
            <p className="text-slate-500">Tizim sozlamalarini boshqaring</p>
          </div>

          <div className="space-y-6">
            {tenant?.slug && (<>
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Link2 className="h-5 w-5" />
                    Do'kon linki
                  </CardTitle>
                  <CardDescription>Bu linkni mijozlaringizga ulashing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-blue-600 mb-1 block">Mijozlar uchun do'kon linki</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${window.location.origin}/store/${tenant.slug}`}
                        className="bg-white font-mono text-sm"
                        data-testid="input-store-link"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0 border-blue-300 hover:bg-blue-100"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/store/${tenant.slug}`);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                          toast({ title: "Link nusxalandi!" });
                        }}
                        data-testid="button-copy-my-link"
                      >
                        {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0 border-blue-300 hover:bg-blue-100"
                        onClick={() => window.open(`/store/${tenant.slug}`, "_blank")}
                        data-testid="button-open-my-store"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <QrCode className="h-5 w-5" />
                    Do'kon QR kodi
                  </CardTitle>
                  <CardDescription>QR kodni mijozlarga ulashing yoki chop eting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border" id="qr-code-container">
                      <div className="text-center mb-3">
                        <p className="text-lg font-bold text-gray-800">{tenant.name}</p>
                        <p className="text-xs text-gray-500">{window.location.origin}/store/{tenant.slug}</p>
                      </div>
                      <QRCodeCanvas
                        value={`${window.location.origin}/store/${tenant.slug}`}
                        size={200}
                        level="H"
                        includeMargin={true}
                        id="store-qr-code"
                      />
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        className="flex-1 border-purple-300 hover:bg-purple-100"
                        onClick={() => {
                          const canvas = document.getElementById("store-qr-code") as HTMLCanvasElement;
                          if (!canvas) return;
                          const url = canvas.toDataURL("image/png");
                          const a = document.createElement("a");
                          a.download = `${tenant.slug}-qr-code.png`;
                          a.href = url;
                          a.click();
                        }}
                        data-testid="button-download-qr"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Yuklab olish
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-purple-300 hover:bg-purple-100"
                        onClick={async () => {
                          const storeUrl = `${window.location.origin}/store/${tenant.slug}`;
                          if (navigator.share) {
                            try {
                              await navigator.share({ title: tenant.name, text: `${tenant.name} do'koniga xush kelibsiz!`, url: storeUrl });
                            } catch {}
                          } else {
                            navigator.clipboard.writeText(storeUrl);
                            toast({ title: "Link nusxalandi!" });
                          }
                        }}
                        data-testid="button-share-qr"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Ulashish
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>)}

            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CreditCard className="h-5 w-5" />
                  To'lov usullari
                </CardTitle>
                <CardDescription>Kassada ko'rinadigan to'lov usullarini sozlang</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {paymentMethods.map(method => (
                    <div key={method.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg" data-testid={`payment-method-${method.id}`}>
                      {editingPaymentId === method.id ? (
                        <>
                          <Input
                            value={editingPaymentName}
                            onChange={(e) => setEditingPaymentName(e.target.value)}
                            className="h-8 flex-1"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && saveEditingPayment()}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={saveEditingPayment}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingPaymentId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium text-sm">{method.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                            onClick={() => { setEditingPaymentId(method.id); setEditingPaymentName(method.name); }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                            onClick={() => removePaymentMethod(method.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Yangi to'lov usuli nomi..."
                    value={newPaymentName}
                    onChange={(e) => setNewPaymentName(e.target.value)}
                    className="h-9"
                    onKeyDown={(e) => e.key === "Enter" && addPaymentMethod()}
                    data-testid="input-new-payment-method"
                  />
                  <Button size="sm" className="h-9 gap-1" onClick={addPaymentMethod} disabled={!newPaymentName.trim()}>
                    <Plus className="h-4 w-4" />
                    Qo'shish
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <DollarSign className="h-5 w-5" />
                  Dollar kursi
                </CardTitle>
                <CardDescription>Tovar beruvchidan dollar bilan olinganda ishlatiladigan standart kurs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">1 dollar = ? so'm</Label>
                    <Input
                      type="number"
                      placeholder="12200"
                      value={defaultDollarRate}
                      onChange={(e) => setDefaultDollarRate(e.target.value)}
                      className="h-10"
                      data-testid="input-default-dollar-rate"
                    />
                  </div>
                  <Button
                    className="h-10"
                    onClick={() => {
                      saveConfigMutation.mutate({ defaultDollarRate: Number(defaultDollarRate) || 0 });
                    }}
                    disabled={saveConfigMutation.isPending}
                    data-testid="button-save-dollar-rate"
                  >
                    Saqlash
                  </Button>
                </div>
                {Number(defaultDollarRate) > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Misol: $100 tovar = {(100 * Number(defaultDollarRate)).toLocaleString()} so'm
                  </p>
                )}

                <div className="mt-4 pt-4 border-t flex items-start justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="debts-in-usd-only" className="cursor-pointer">
                      Qarzlarni faqat dollarda ko'rsatish
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Yoqilganda Moliya → Tovar beruvchi sahifasida qarz so'mlarda emas, faqat dollarda ($) ko'rinadi.
                    </p>
                  </div>
                  <Switch
                    id="debts-in-usd-only"
                    checked={debtsInUsdOnly}
                    onCheckedChange={(checked: boolean) => {
                      setDebtsInUsdOnly(checked);
                      saveConfigMutation.mutate({ debtsInUsdOnly: checked });
                    }}
                    data-testid="switch-debts-in-usd-only"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Package className="h-5 w-5" />
                  Mahsulot maydonlari
                </CardTitle>
                <CardDescription>Mahsulot qo'shish formasidagi maydonlarni sozlang. Birinchi maydon (nomi) o'chirilmaydi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {productFields.map(field => (
                    <div key={field.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg" data-testid={`product-field-${field.key}`}>
                      {editingFieldKey === field.key ? (
                        <>
                          <Input
                            value={editingFieldLabel}
                            onChange={(e) => setEditingFieldLabel(e.target.value)}
                            className="h-8 flex-1"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && saveEditingField()}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={saveEditingField}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingFieldKey(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium text-sm">{field.label}</span>
                          {field.required && <span className="text-xs text-orange-500 px-1.5 py-0.5 bg-orange-50 rounded">majburiy</span>}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                            onClick={() => { setEditingFieldKey(field.key); setEditingFieldLabel(field.label); }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {field.key !== "name" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              onClick={() => removeProductField(field.key)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Yangi maydon nomi..."
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="h-9"
                    onKeyDown={(e) => e.key === "Enter" && addProductField()}
                    data-testid="input-new-product-field"
                  />
                  <Button size="sm" className="h-9 gap-1" onClick={addProductField} disabled={!newFieldLabel.trim()}>
                    <Plus className="h-4 w-4" />
                    Qo'shish
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-teal-800">
                  <Eye className="h-5 w-5" />
                  Tovar formasining ko'rinishi
                </CardTitle>
                <CardDescription>Tovar qo'shish/tahrirlash formasida qaysi maydonlar ko'rinishini belgilang</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {FORM_VISIBILITY_OPTIONS.map(opt => (
                  <div key={opt.key} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg" data-testid={`visibility-${opt.key}`}>
                    <span className="text-sm font-medium">{opt.label}</span>
                    <Switch
                      checked={productFormVisibility[opt.key] !== false}
                      onCheckedChange={(checked) => {
                        const updated = { ...productFormVisibility, [opt.key]: checked };
                        setProductFormVisibility(updated);
                        saveConfigMutation.mutate({ productFormVisibility: updated });
                      }}
                      data-testid={`switch-visibility-${opt.key}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Package className="h-5 w-5" />
                  Yetkazib berish xizmati
                </CardTitle>
                <CardDescription>Kassa sahifasida yetkazib berish imkoniyatini yoqish/o'chirish</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg" data-testid="visibility-delivery">
                  <div>
                    <span className="text-sm font-medium">Yetkazib berish xizmati</span>
                    <p className="text-xs text-gray-500 mt-0.5">Kassada tovar tanlangandan keyin yetkazib berish kartochkasi ko'rinadi</p>
                  </div>
                  <Switch
                    checked={deliveryEnabled}
                    onCheckedChange={(checked) => {
                      setDeliveryEnabled(!!checked);
                      saveConfigMutation.mutate({ deliveryEnabled: !!checked });
                    }}
                    data-testid="switch-delivery-enabled"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <Users className="h-5 w-5" />
                  Mijoz maydonlari
                </CardTitle>
                <CardDescription>Har bir haridda ixtiyoriy to'ldiriladigan mijoz ma'lumotlari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {customerFields.map(field => (
                    <div key={field.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg" data-testid={`customer-field-${field.key}`}>
                      <span className="flex-1 font-medium text-sm">{field.label}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => removeCustomerField(field.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Yangi maydon nomi..."
                    value={newCustomerFieldLabel}
                    onChange={(e) => setNewCustomerFieldLabel(e.target.value)}
                    className="h-9"
                    onKeyDown={(e) => e.key === "Enter" && addCustomerField()}
                    data-testid="input-new-customer-field"
                  />
                  <Button size="sm" className="h-9 gap-1" onClick={addCustomerField} disabled={!newCustomerFieldLabel.trim()}>
                    <Plus className="h-4 w-4" />
                    Qo'shish
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-teal-800">
                  <ShoppingCart className="h-5 w-5" />
                  Onlayn buyurtma formasi
                </CardTitle>
                <CardDescription>Onlayn do'kon buyurtma formasida qaysi maydonlar ko'rinishini sozlang</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {orderFormFields.map(field => {
                    const builtIn = ["name", "phone", "telegramPhone", "deliveryType", "address", "shippingType", "postalAddress", "paymentMethod"];
                    const isBuiltIn = builtIn.includes(field.key);
                    const hasOptions = field.options && field.options.length > 0;
                    const isExpanded = expandedOrderField === field.key;
                    return (
                      <div key={field.key} className="space-y-1" data-testid={`order-field-${field.key}`}>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <Switch
                            checked={field.enabled}
                            onCheckedChange={() => toggleOrderField(field.key)}
                            data-testid={`switch-order-field-${field.key}`}
                          />
                          {editingOrderFieldKey === field.key ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={editingOrderFieldLabel}
                                onChange={(e) => setEditingOrderFieldLabel(e.target.value)}
                                className="h-8 text-sm"
                                onKeyDown={(e) => e.key === "Enter" && saveEditingOrderField()}
                                autoFocus
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEditingOrderField}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingOrderFieldKey(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              {(hasOptions || ["deliveryType", "shippingType"].includes(field.key)) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-muted-foreground"
                                  onClick={() => setExpandedOrderField(isExpanded ? null : field.key)}
                                >
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                              <span className={`flex-1 font-medium text-sm ${!field.enabled ? "text-muted-foreground line-through" : ""}`}>
                                {field.label}
                                {hasOptions && <span className="text-xs text-muted-foreground ml-1">({field.options!.length} variant)</span>}
                              </span>
                              <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={() => toggleOrderFieldRequired(field.key)}
                                  disabled={!field.enabled}
                                  className="rounded"
                                  data-testid={`checkbox-required-${field.key}`}
                                />
                                Majburiy
                              </label>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={() => { setEditingOrderFieldKey(field.key); setEditingOrderFieldLabel(field.label); }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              {!isBuiltIn && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                  onClick={() => removeOrderField(field.key)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="ml-10 p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">Variantlar:</p>
                            {(field.options || []).map(opt => (
                              <div key={opt.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded" data-testid={`option-${field.key}-${opt.id}`}>
                                {editingOptionId === opt.id ? (
                                  <div className="flex-1 flex gap-2">
                                    <Input
                                      value={editingOptionLabel}
                                      onChange={(e) => setEditingOptionLabel(e.target.value)}
                                      className="h-7 text-xs"
                                      onKeyDown={(e) => e.key === "Enter" && saveEditingOption(field.key)}
                                      autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEditingOption(field.key)}>
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingOptionId(null)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    {field.key === "deliveryType" && (
                                      <button
                                        className={`text-xs px-1.5 py-0.5 rounded ${opt.type === "pickup" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}
                                        onClick={() => toggleOptionType(field.key, opt.id)}
                                        title="Turini o'zgartirish"
                                      >
                                        {opt.type === "pickup" ? "🏢" : "🚚"}
                                      </button>
                                    )}
                                    <span className="flex-1 text-sm">{opt.label}</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground"
                                      onClick={() => { setEditingOptionId(opt.id); setEditingOptionLabel(opt.label); }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                      onClick={() => removeFieldOption(field.key, opt.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Input
                                placeholder="Yangi variant..."
                                value={newOptionLabel}
                                onChange={(e) => setNewOptionLabel(e.target.value)}
                                className="h-8 text-xs"
                                onKeyDown={(e) => e.key === "Enter" && addFieldOption(field.key)}
                                data-testid={`input-new-option-${field.key}`}
                              />
                              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => addFieldOption(field.key)} disabled={!newOptionLabel.trim()}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Yangi maydon nomi..."
                    value={newOrderFieldLabel}
                    onChange={(e) => setNewOrderFieldLabel(e.target.value)}
                    className="h-9"
                    onKeyDown={(e) => e.key === "Enter" && addOrderField()}
                    data-testid="input-new-order-field"
                  />
                  <Button size="sm" className="h-9 gap-1" onClick={addOrderField} disabled={!newOrderFieldLabel.trim()}>
                    <Plus className="h-4 w-4" />
                    Qo'shish
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-pink-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-800">
                  <ImageIcon className="h-5 w-5" />
                  Chek logotipi
                </CardTitle>
                <CardDescription>Sotuv chekida ko'rinadigan logotipni yuklang</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors relative group"
                    onClick={() => !isUploading && logoInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center text-blue-500">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-[9px] mt-1">Yuklanmoqda</span>
                      </div>
                    ) : receiptLogo ? (
                      <img src={receiptLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-[9px] mt-1">Logo yuklash</span>
                      </div>
                    )}
                    {!isUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={logoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">PNG yoki JPEG, 5MB gacha</p>
                    {receiptLogo && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={saveReceiptLogo}>
                          <Check className="h-3 w-3 mr-1" />
                          Saqlash
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-red-600" onClick={() => { setReceiptLogo(""); saveConfigMutation.mutate({ receiptLogo: "" }); }}>
                          <Trash2 className="h-3 w-3 mr-1" />
                          O'chirish
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Do'kon ma'lumotlari
                </CardTitle>
                <CardDescription>Do'kon haqida asosiy ma'lumotlar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Do'kon nomi</Label>
                    <Input 
                      id="storeName" 
                      value={settings.storeName} 
                      onChange={(e) => updateSettings({ storeName: e.target.value })}
                      data-testid="input-store-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Telefon raqam</Label>
                    <Input 
                      id="storePhone" 
                      value={settings.storePhone} 
                      onChange={(e) => updateSettings({ storePhone: e.target.value })}
                      data-testid="input-store-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Manzil</Label>
                  <Input 
                    id="storeAddress" 
                    value={settings.storeAddress} 
                    onChange={(e) => updateSettings({ storeAddress: e.target.value })}
                    data-testid="input-store-address"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Bildirishnomalar
                </CardTitle>
                <CardDescription>Bildirishnomalar sozlamalari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bildirishnomalar</Label>
                    <p className="text-sm text-slate-500">Yangi buyurtmalar haqida xabar olish</p>
                  </div>
                  <Switch 
                    checked={settings.notifications} 
                    onCheckedChange={(checked) => updateSettings({ notifications: checked })}
                    data-testid="switch-notifications"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ovozli signal</Label>
                    <p className="text-sm text-slate-500">Yangi sotuv uchun ovozli signal</p>
                  </div>
                  <Switch 
                    checked={settings.soundEnabled} 
                    onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                    data-testid="switch-sound"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Printer sozlamalari
                </CardTitle>
                <CardDescription>Chek chiqarish sozlamalari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="pr-3">
                    <Label>Avtomatik chop etish</Label>
                    <p className="text-sm text-slate-500">"Sotildi" tugmasi bosilganda chek avtomatik chiqadi — qo'shimcha tugma bosish kerak emas.</p>
                    <p className="text-xs text-amber-700 mt-1">⚠ Brauzerda pop-up oynalarga ruxsat berilgan bo'lishi shart.</p>
                  </div>
                  <Switch 
                    checked={settings.autoPrint} 
                    onCheckedChange={(checked) => updateSettings({ autoPrint: checked })}
                    data-testid="switch-auto-print"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Chek ma'lumotlari
                </CardTitle>
                <CardDescription>Chekda ko'rinadigan ma'lumotlar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="receiptStoreName">Do'kon nomi</Label>
                    <Input 
                      id="receiptStoreName" 
                      value={settings.storeName} 
                      onChange={(e) => updateSettings({ storeName: e.target.value })}
                      data-testid="input-receipt-store-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receiptPhone">Telefon</Label>
                    <Input 
                      id="receiptPhone" 
                      value={settings.storePhone} 
                      onChange={(e) => updateSettings({ storePhone: e.target.value })}
                      data-testid="input-receipt-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptAddress">Manzil</Label>
                  <Input 
                    id="receiptAddress" 
                    value={settings.storeAddress} 
                    onChange={(e) => updateSettings({ storeAddress: e.target.value })}
                    data-testid="input-receipt-address"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telegramUsername">Telegram username</Label>
                    <Input 
                      id="telegramUsername" 
                      value={settings.telegramUsername} 
                      onChange={(e) => updateSettings({ telegramUsername: e.target.value })}
                      placeholder="ixlosbooksuz"
                      data-testid="input-telegram-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receiptFooter">Chek pastki yozuvi</Label>
                    <Input 
                      id="receiptFooter" 
                      value={settings.receiptFooter} 
                      onChange={(e) => updateSettings({ receiptFooter: e.target.value })}
                      placeholder="Xaridingiz uchun rahmat!"
                      data-testid="input-receipt-footer"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Telegram bot
                </CardTitle>
                <CardDescription>Yangi buyurtmalar haqida xabar olish uchun Telegram botingizni ulang</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telegramBotToken">Bot Token</Label>
                    <Input 
                      id="telegramBotToken" 
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="123456789:ABCdefGHIjklMNOpqr..."
                      type="password"
                      data-testid="input-telegram-bot-token"
                    />
                    <p className="text-xs text-muted-foreground">@BotFather dan olingan token</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegramChatId">Chat ID</Label>
                    <Input 
                      id="telegramChatId" 
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="-1001234567890"
                      data-testid="input-telegram-chat-id"
                    />
                    <p className="text-xs text-muted-foreground">Guruh yoki kanal ID raqami</p>
                  </div>
                </div>
                <Button 
                  onClick={() => saveTelegramMutation.mutate()}
                  disabled={saveTelegramMutation.isPending}
                  className="gap-2"
                  data-testid="button-save-telegram"
                >
                  <Send className="h-4 w-4" />
                  {saveTelegramMutation.isPending ? "Saqlanmoqda..." : "Telegram sozlamalarini saqlash"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Ko'rinish
                </CardTitle>
                <CardDescription>Ilova ko'rinishi sozlamalari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tungi rejim</Label>
                    <p className="text-sm text-slate-500">Qorong'i fon rangini yoqish</p>
                  </div>
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={setDarkMode}
                    data-testid="switch-dark-mode"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Ma'lumotlar
                </CardTitle>
                <CardDescription>Ma'lumotlarni boshqarish</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" data-testid="button-export-data">
                    Ma'lumotlarni eksport qilish
                  </Button>
                  <Button variant="outline" data-testid="button-backup">
                    Zaxira nusxa yaratish
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Xavfsizlik
                </CardTitle>
                <CardDescription>Xavfsizlik sozlamalari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" data-testid="button-change-password">
                  Parolni o'zgartirish
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} size="lg" data-testid="button-save-settings">
                Saqlash
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
