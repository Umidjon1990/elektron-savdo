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
import { Store, Bell, Printer, Database, Shield, Palette, Receipt, Link2, Copy, Check, ExternalLink, Bot, Send, CreditCard, Plus, Trash2, Edit2, X, Package, Users, Image as ImageIcon, Upload, Loader2, Eye, QrCode, Download, Share2 } from "lucide-react";
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
    { key: "supplier", label: "Yetkazib beruvchi (ta'minotchi)" },
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
      if (data.deliveryEnabled !== undefined) setDeliveryEnabled(data.deliveryEnabled);
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
      
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
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
                  <div>
                    <Label>Avtomatik chop etish</Label>
                    <p className="text-sm text-slate-500">Har bir sotuvdan keyin chekni avtomatik chop etish</p>
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
