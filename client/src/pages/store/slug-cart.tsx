import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Send, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  author?: string;
  price: number;
  stock: number;
  category: string;
  image: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderFormField {
  key: string;
  label: string;
  enabled: boolean;
  required: boolean;
}

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  brandColor: string;
  orderFormFields?: OrderFormField[];
  paymentMethods?: Array<{id: string, name: string}>;
}

export default function SlugCartPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    telegramPhone: "",
    deliveryType: "delivery" as "delivery" | "pickup",
    paymentMethod: "click" as "cash" | "card" | "online" | "click",
    address: "",
    shippingType: "BTS" as "BTS" | "Starex",
    postalAddress: "",
  });

  const { data: tenant } = useQuery<TenantInfo>({
    queryKey: ["tenant", slug],
    queryFn: async () => {
      const res = await fetch(`/api/tenant/${slug}`);
      if (!res.ok) throw new Error("Do'kon topilmadi");
      return res.json();
    },
    enabled: !!slug,
  });

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${slug}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(items));
  }, [items, slug]);

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) { removeItem(productId); return; }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(`cart_${slug}`);
  };

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const brandColor = tenant?.brandColor || "#4f46e5";

  const defaultOrderFields: OrderFormField[] = [
    { key: "name", label: "Ism Familiya", enabled: true, required: true },
    { key: "phone", label: "Aloqa uchun telefon", enabled: true, required: true },
    { key: "telegramPhone", label: "Telegram telefon", enabled: true, required: true },
    { key: "deliveryType", label: "Yetkazib berish turi", enabled: true, required: false },
    { key: "address", label: "Manzil", enabled: true, required: false },
    { key: "shippingType", label: "Pochta turi (BTS/Starex)", enabled: true, required: false },
    { key: "postalAddress", label: "Pochta manzili", enabled: true, required: false },
    { key: "paymentMethod", label: "To'lov turi", enabled: true, required: false },
  ];
  const fields = tenant?.orderFormFields || defaultOrderFields;
  const isFieldEnabled = (key: string) => fields.find(f => f.key === key)?.enabled ?? true;
  const isFieldRequired = (key: string) => fields.find(f => f.key === key)?.required ?? false;
  const getFieldLabel = (key: string, fallback: string) => fields.find(f => f.key === key)?.label || fallback;
  const customFields = fields.filter(f => f.key.startsWith("custom_") && f.enabled);

  const handleCheckout = async () => {
    const deliveryDependentKeys = ["address", "shippingType", "postalAddress"];
    const skipDeliveryFields = !isFieldEnabled("deliveryType") || formData.deliveryType !== "delivery";

    for (const field of fields) {
      if (!field.enabled || !field.required) continue;
      if (skipDeliveryFields && deliveryDependentKeys.includes(field.key)) continue;
      const val = (formData as any)[field.key];
      if (!val || (typeof val === "string" && !val.trim())) {
        toast({ title: "Ma'lumotlar to'liq emas", description: `"${field.label}" maydonini to'ldiring`, variant: "destructive" });
        return;
      }
    }

    try {
      let telegramInfo = formData.telegramPhone;
      if (formData.deliveryType === "delivery") {
        telegramInfo += ` | Manzil: ${formData.address} | Pochta: ${formData.shippingType}`;
        if (formData.postalAddress) telegramInfo += ` | Pochta manzili: ${formData.postalAddress}`;
      }

      const customData: Record<string, string> = {};
      for (const cf of customFields) {
        const val = (formData as any)[cf.key];
        if (val) {
          customData[cf.label] = val;
          telegramInfo += ` | ${cf.label}: ${val}`;
        }
      }

      const orderData: Record<string, any> = {
        customerName: formData.name,
        customerPhone: formData.phone,
        customerTelegram: telegramInfo,
        items: items.map(i => ({ productId: i.product.id, productName: i.product.name, quantity: i.quantity, price: i.product.price })),
        totalAmount: total,
        paymentMethod: formData.paymentMethod,
        deliveryType: formData.deliveryType,
      };
      if (formData.address) orderData.address = formData.address;
      if (Object.keys(customData).length > 0) orderData.customFields = customData;

      const headers: Record<string, string> = { "Content-Type": "application/json" };

      const res = await fetch(`/api/store/${slug}/orders`, { method: "POST", headers, body: JSON.stringify(orderData) });
      if (!res.ok) throw new Error("Buyurtma yuborishda xatolik");

      toast({ title: "Buyurtma qabul qilindi!", description: "Tez orada siz bilan bog'lanishadi." });
      clearCart();
      setIsCheckoutOpen(false);
      setLocation(`/store/${slug}`);
    } catch {
      toast({ title: "Xatolik yuz berdi", description: "Qaytadan urinib ko'ring.", variant: "destructive" });
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Savatchangiz bo'sh</h1>
        <p className="text-slate-500 mb-8 max-w-sm">Siz hali hech qanday mahsulot tanlamadingiz.</p>
        <Button onClick={() => setLocation(`/store/${slug}`)} style={{ backgroundColor: brandColor }} className="text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Katalogga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/store/${slug}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {tenant?.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
                <Store className="h-4 w-4" />
              </div>
            )}
            <h1 className="text-xl font-bold">Savatcha</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.product.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-4" data-testid={`cart-item-${item.product.id}`}>
                <div className="w-20 h-28 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-2">{item.product.name}</h3>
                    {item.product.author && <p className="text-sm text-slate-500">{item.product.author}</p>}
                    <div className="font-bold mt-1" style={{ color: brandColor }}>{item.product.price.toLocaleString()} so'm</div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeItem(item.product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Buyurtma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Mahsulotlar ({items.reduce((a, b) => a + b.quantity, 0)})</span>
                  <span className="font-medium">{total.toLocaleString()} so'm</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Jami</span>
                  <span>{total.toLocaleString()} so'm</span>
                </div>
              </CardContent>
              <CardFooter>
                <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-12 text-lg text-white" style={{ backgroundColor: brandColor }} data-testid="button-checkout">
                      Rasmiylashtirish
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Buyurtmani tasdiqlash</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      {isFieldEnabled("name") && (
                        <div className="space-y-2">
                          <Label>{getFieldLabel("name", "Ism Familiya")} {isFieldRequired("name") && <span className="text-red-500">*</span>}</Label>
                          <Input placeholder="Azizbek T." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-checkout-name" />
                        </div>
                      )}
                      {isFieldEnabled("phone") && (
                        <div className="space-y-2">
                          <Label>{getFieldLabel("phone", "Aloqa uchun telefon")} {isFieldRequired("phone") && <span className="text-red-500">*</span>}</Label>
                          <Input placeholder="+998 90 123 45 67" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} data-testid="input-checkout-phone" />
                        </div>
                      )}
                      {isFieldEnabled("telegramPhone") && (
                        <div className="space-y-2">
                          <Label>{getFieldLabel("telegramPhone", "Telegram telefon")} {isFieldRequired("telegramPhone") && <span className="text-red-500">*</span>}</Label>
                          <Input placeholder="+998 90 123 45 67" value={formData.telegramPhone} onChange={(e) => setFormData({ ...formData, telegramPhone: e.target.value.replace(/@/g, "") })} data-testid="input-checkout-telegram" />
                        </div>
                      )}
                      {isFieldEnabled("deliveryType") && (
                        <div className="space-y-2">
                          <Label>{getFieldLabel("deliveryType", "Yetkazib berish turi")}</Label>
                          <RadioGroup value={formData.deliveryType} onValueChange={(v: "delivery" | "pickup") => setFormData({ ...formData, deliveryType: v })} className="grid grid-cols-2 gap-4">
                            <div>
                              <RadioGroupItem value="delivery" id="s-delivery" className="peer sr-only" />
                              <Label htmlFor="s-delivery" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                <span className="mb-2 block text-2xl">🚚</span>
                                <span className="text-xs font-medium">Kuryer</span>
                              </Label>
                            </div>
                            <div>
                              <RadioGroupItem value="pickup" id="s-pickup" className="peer sr-only" />
                              <Label htmlFor="s-pickup" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                <span className="mb-2 block text-2xl">🏢</span>
                                <span className="text-xs font-medium">Olib ketish</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                      {isFieldEnabled("deliveryType") && formData.deliveryType === "delivery" && (
                        <>
                          {isFieldEnabled("address") && (
                            <div className="space-y-2">
                              <Label>{getFieldLabel("address", "Manzil")} {isFieldRequired("address") && <span className="text-red-500">*</span>}</Label>
                              <Input placeholder="Shahar, tuman, ko'cha" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} data-testid="input-checkout-address" />
                            </div>
                          )}
                          {isFieldEnabled("shippingType") && (
                            <div className="space-y-2">
                              <Label>{getFieldLabel("shippingType", "Pochta turi")}</Label>
                              <RadioGroup value={formData.shippingType} onValueChange={(v: "BTS" | "Starex") => setFormData({ ...formData, shippingType: v })} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="BTS" id="s-bts" />
                                  <Label htmlFor="s-bts">BTS</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Starex" id="s-starex" />
                                  <Label htmlFor="s-starex">Starex</Label>
                                </div>
                              </RadioGroup>
                            </div>
                          )}
                          {isFieldEnabled("postalAddress") && (
                            <div className="space-y-2">
                              <Label>{getFieldLabel("postalAddress", "Pochta manzili")} {!isFieldRequired("postalAddress") && <span className="text-slate-400 font-normal">(ixtiyoriy)</span>}</Label>
                              <Input placeholder="Pochta filiali" value={formData.postalAddress} onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })} data-testid="input-checkout-postal" />
                            </div>
                          )}
                        </>
                      )}
                      {isFieldEnabled("paymentMethod") && (() => {
                        const methods = tenant?.paymentMethods && tenant.paymentMethods.length > 0
                          ? tenant.paymentMethods
                          : [{ id: "click", name: "Click / Payme" }, { id: "cash", name: "Naqd" }];
                        return (
                          <div className="space-y-2">
                            <Label>{getFieldLabel("paymentMethod", "To'lov turi")}</Label>
                            <RadioGroup value={formData.paymentMethod} onValueChange={(v: any) => setFormData({ ...formData, paymentMethod: v })} className="flex gap-4 flex-wrap">
                              {methods.map(m => (
                                <div key={m.id} className="flex items-center space-x-2">
                                  <RadioGroupItem value={m.id} id={`s-pm-${m.id}`} />
                                  <Label htmlFor={`s-pm-${m.id}`}>{m.name}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        );
                      })()}
                      {customFields.map(field => (
                        <div key={field.key} className="space-y-2">
                          <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
                          <Input
                            placeholder={field.label}
                            value={(formData as any)[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            data-testid={`input-checkout-${field.key}`}
                          />
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleCheckout} className="w-full h-12 text-white" style={{ backgroundColor: brandColor }} data-testid="button-submit-order">
                      <Send className="mr-2 h-4 w-4" /> Buyurtma berish
                    </Button>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
