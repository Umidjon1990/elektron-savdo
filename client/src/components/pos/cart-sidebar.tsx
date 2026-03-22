import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, Banknote, QrCode, Trash2, ShoppingBag, HandCoins, ChevronDown, ChevronUp, User, Phone, MapPin, FileText, Plus, CalendarIcon, AlertCircle, Truck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartItem } from "./cart-item";
import type { CartItem as CartItemType } from "@/pages/dashboard";

interface PaymentMethod {
  id: string;
  name: string;
}

interface CustomerField {
  key: string;
  label: string;
}

interface CourierItem {
  id: string;
  name: string;
  phone: string;
}

interface CartSidebarProps {
  items: CartItemType[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateDiscount: (id: string, discount: number, adjustmentType?: "skidka" | "ustama", adjustmentInputType?: "summa" | "percent", adjustmentValue?: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: (method: string, customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }, nasiyaData?: { dueDate: string }, deliveryData?: { courierId: string; courierName: string; address: string; customerName: string; customerPhone: string }) => void;
  paymentMethods?: PaymentMethod[];
  customerFields?: CustomerField[];
  deliveryEnabled?: boolean;
  couriers?: CourierItem[];
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-6 w-6 text-green-600" />,
  card: <CreditCard className="h-6 w-6 text-blue-600" />,
  nasiya: <HandCoins className="h-6 w-6 text-orange-600" />,
};

const PAYMENT_COLORS: Record<string, { hover: string; border: string }> = {
  cash: { hover: "hover:border-green-500 hover:bg-green-50", border: "border-green-500 bg-green-50" },
  card: { hover: "hover:border-blue-500 hover:bg-blue-50", border: "border-blue-500 bg-blue-50" },
  nasiya: { hover: "hover:border-orange-500 hover:bg-orange-50", border: "border-orange-500 bg-orange-50" },
};

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash", name: "Naqd" },
  { id: "card", name: "Karta" },
  { id: "nasiya", name: "Nasiya" },
];

const DEFAULT_CUSTOMER_FIELDS: CustomerField[] = [
  { key: "name", label: "Ism familiya" },
  { key: "phone", label: "Tel raqam" },
  { key: "address", label: "MFY (Manzil)" },
  { key: "note", label: "Izoh" },
];

const FIELD_ICONS: Record<string, React.ReactNode> = {
  name: <User className="h-4 w-4 text-muted-foreground" />,
  phone: <Phone className="h-4 w-4 text-muted-foreground" />,
  address: <MapPin className="h-4 w-4 text-muted-foreground" />,
  note: <FileText className="h-4 w-4 text-muted-foreground" />,
};

export function CartSidebar({ items, onUpdateQuantity, onUpdateDiscount, onRemove, onClear, onCheckout, paymentMethods, customerFields, deliveryEnabled, couriers }: CartSidebarProps) {
  const getEffectivePrice = (product: any) => product.price > 0 ? product.price : (product.barcodePrice || product.wholesalePrice || 0);
  const subtotal = items.reduce((acc, item) => acc + (getEffectivePrice(item.product) * item.quantity), 0);
  // discount > 0 = skidka (ayiriladi), discount < 0 = ustama (qo'shiladi)
  const totalDiscount = items.reduce((acc, item) => acc + (item.discount || 0), 0);
  const skidkaTotal = items.reduce((acc, item) => item.discount && item.discount > 0 ? acc + item.discount : acc, 0);
  const ustamaTotal = items.reduce((acc, item) => item.discount && item.discount < 0 ? acc + Math.abs(item.discount) : acc, 0);
  const total = subtotal - totalDiscount;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const [showCustomer, setShowCustomer] = useState(false);
  const [customerData, setCustomerData] = useState<Record<string, string>>({});
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const [deliveryMode, setDeliveryMode] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [deliveryCourierId, setDeliveryCourierId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCustomerName, setDeliveryCustomerName] = useState("");
  const [deliveryCustomerPhone, setDeliveryCustomerPhone] = useState("");
  const [deliveryError, setDeliveryError] = useState("");

  const [nasiyaDialogOpen, setNasiyaDialogOpen] = useState(false);
  const [nasiyaName, setNasiyaName] = useState("");
  const [nasiyaPhone, setNasiyaPhone] = useState("");
  const [nasiyaAddress, setNasiyaAddress] = useState("");
  const [nasiyaNote, setNasiyaNote] = useState("");
  const [nasiyaDueDate, setNasiyaDueDate] = useState("");
  const [nasiyaError, setNasiyaError] = useState("");

  const methods = paymentMethods && paymentMethods.length > 0 ? paymentMethods : DEFAULT_PAYMENT_METHODS;
  const custFields = customerFields && customerFields.length > 0 ? customerFields : DEFAULT_CUSTOMER_FIELDS;

  const today = new Date().toISOString().split("T")[0];

  const handleCheckout = (methodId: string) => {
    if (deliveryMode) {
      setDeliveryCustomerName(customerData["name"] || "");
      setDeliveryCustomerPhone(customerData["phone"] || "");
      setDeliveryAddress(customerData["address"] || "");
      setDeliveryError("");
      setDeliveryDialogOpen(true);
      return;
    }

    if (methodId === "nasiya") {
      setNasiyaName(customerData["name"] || "");
      setNasiyaPhone(customerData["phone"] || "");
      setNasiyaAddress(customerData["address"] || "");
      setNasiyaNote(customerData["note"] || "");
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setNasiyaDueDate(defaultDue.toISOString().split("T")[0]);
      setNasiyaError("");
      setNasiyaDialogOpen(true);
      return;
    }

    const custInfo: Record<string, string> = {};
    let custName: string | undefined;
    let custPhone: string | undefined;
    
    Object.entries(customerData).forEach(([key, val]) => {
      if (val.trim()) {
        if (key === "name") custName = val.trim();
        else if (key === "phone") custPhone = val.trim();
        else custInfo[key] = val.trim();
      }
    });

    const hasCustomerData = custName || custPhone || Object.keys(custInfo).length > 0;
    onCheckout(
      methodId,
      hasCustomerData ? { customerName: custName, customerPhone: custPhone, customerInfo: Object.keys(custInfo).length > 0 ? custInfo : undefined } : undefined
    );
    setCustomerData({});
    setShowCustomer(false);
    setSelectedMethod(null);
    setDeliveryMode(false);
  };

  const handleNasiyaConfirm = () => {
    if (!nasiyaName.trim()) {
      setNasiyaError("Mijoz ismi kiritilishi shart");
      return;
    }
    if (!nasiyaPhone.trim()) {
      setNasiyaError("Telefon raqam kiritilishi shart");
      return;
    }
    if (!nasiyaDueDate) {
      setNasiyaError("To'lov muddati tanlanishi shart");
      return;
    }

    const custInfo: Record<string, string> = {};
    if (nasiyaAddress.trim()) custInfo["address"] = nasiyaAddress.trim();
    if (nasiyaNote.trim()) custInfo["note"] = nasiyaNote.trim();

    onCheckout(
      "nasiya",
      {
        customerName: nasiyaName.trim(),
        customerPhone: nasiyaPhone.trim(),
        customerInfo: Object.keys(custInfo).length > 0 ? custInfo : undefined,
      },
      { dueDate: nasiyaDueDate }
    );

    setNasiyaDialogOpen(false);
    setNasiyaName("");
    setNasiyaPhone("");
    setNasiyaAddress("");
    setNasiyaNote("");
    setNasiyaDueDate("");
    setCustomerData({});
    setShowCustomer(false);
    setSelectedMethod(null);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l shadow-xl w-[420px] lg:w-[460px]">
      <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-none">Savatcha</h2>
            <span className="text-xs text-muted-foreground">Kassa</span>
          </div>
        </div>
        {items.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={onClear}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Tozalash
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8 min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-gray-300" />
            </div>
            <p className="font-medium text-gray-900">Savatcha bo'sh</p>
            <p className="text-sm mt-1 max-w-[200px]">
              Mahsulot qo'shish uchun shtrix kodni skanerlang yoki ro'yxatdan tanlang
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <CartItem 
                key={item.product.id} 
                item={item} 
                onUpdateQuantity={onUpdateQuantity}
                onUpdateDiscount={onUpdateDiscount}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-5 bg-gradient-to-b from-gray-50 to-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Jami mahsulot:</span>
            <span className="font-semibold text-base">{itemCount} dona/birlik</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Skidka:</span>
              <span className="font-semibold font-mono text-red-500 text-base">-{totalDiscount.toLocaleString()} so'm</span>
            </div>
          )}
          <Separator className="my-3" />
          <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl -mx-1">
            <span className="font-bold text-xl text-gray-800">JAMI:</span>
            <span className="font-bold text-3xl font-mono text-primary">
              {total.toLocaleString()} <span className="text-lg">so'm</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowCustomer(!showCustomer)}
          className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          data-testid="button-toggle-customer"
        >
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Mijoz ma'lumotlari (ixtiyoriy)
          </span>
          {showCustomer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showCustomer && (
          <div className="space-y-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
            {custFields.map(field => (
              <div key={field.key} className="flex items-center gap-2">
                {FIELD_ICONS[field.key] || <FileText className="h-4 w-4 text-muted-foreground" />}
                <Input
                  placeholder={field.label}
                  value={customerData[field.key] || ""}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="h-8 text-sm bg-white"
                  data-testid={`input-customer-${field.key}`}
                />
              </div>
            ))}
          </div>
        )}

        {deliveryEnabled && items.length > 0 && (
          <div
            onClick={() => setDeliveryMode(!deliveryMode)}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              deliveryMode
                ? "border-purple-500 bg-purple-50 shadow-sm"
                : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
            }`}
            data-testid="card-delivery-toggle"
          >
            <div className={`p-2 rounded-lg ${deliveryMode ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              <Truck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Yetkazib berish</p>
              <p className="text-[10px] text-gray-500">Kuriyerga biriktirish</p>
            </div>
            {deliveryMode && (
              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Tanlandi</span>
            )}
          </div>
        )}

        <div className={`grid gap-2 ${methods.length <= 2 ? 'grid-cols-2' : methods.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {methods.map(method => {
            const colors = PAYMENT_COLORS[method.id] || { hover: "hover:border-purple-500 hover:bg-purple-50", border: "border-purple-500 bg-purple-50" };
            const icon = PAYMENT_ICONS[method.id] || <QrCode className="h-6 w-6 text-purple-600" />;
            return (
              <Button
                key={method.id}
                variant="outline"
                className={`flex flex-col items-center justify-center h-16 gap-1.5 border-2 transition-all ${colors.hover}`}
                onClick={() => handleCheckout(method.id)}
                disabled={items.length === 0}
                data-testid={`button-pay-${method.id}`}
              >
                {icon}
                <span className="text-xs font-semibold">{method.name}</span>
              </Button>
            );
          })}
        </div>
        
        <Button size="lg" className="w-full text-xl h-16 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 font-bold" onClick={() => handleCheckout(methods[0]?.id || "cash")} disabled={items.length === 0}>
          To'lov qilish
        </Button>
      </div>

      <Dialog open={nasiyaDialogOpen} onOpenChange={setNasiyaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-orange-500" />
              Nasiyaga sotish
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700 font-medium">Qarz summasi:</span>
                <span className="text-lg font-bold text-orange-800">{total.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-orange-600">Sana:</span>
                <span className="text-xs text-orange-600">{new Date().toLocaleDateString("uz-UZ")}</span>
              </div>
            </div>

            {nasiyaError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {nasiyaError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-gray-600">Mijoz ismi *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Ism familiya"
                    value={nasiyaName}
                    onChange={(e) => { setNasiyaName(e.target.value); setNasiyaError(""); }}
                    className="h-9"
                    data-testid="input-nasiya-name"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Telefon raqam *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="+998 90 123 45 67"
                    value={nasiyaPhone}
                    onChange={(e) => { setNasiyaPhone(e.target.value); setNasiyaError(""); }}
                    className="h-9"
                    data-testid="input-nasiya-phone"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Manzil</Label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="MFY, ko'cha"
                    value={nasiyaAddress}
                    onChange={(e) => setNasiyaAddress(e.target.value)}
                    className="h-9"
                    data-testid="input-nasiya-address"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">To'lov muddati *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    min={today}
                    value={nasiyaDueDate}
                    onChange={(e) => { setNasiyaDueDate(e.target.value); setNasiyaError(""); }}
                    className="h-9"
                    data-testid="input-nasiya-due-date"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Izoh</Label>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Qo'shimcha izoh..."
                    value={nasiyaNote}
                    onChange={(e) => setNasiyaNote(e.target.value)}
                    className="h-9"
                    data-testid="input-nasiya-note"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNasiyaDialogOpen(false)} data-testid="button-cancel-nasiya">
              Bekor qilish
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleNasiyaConfirm} data-testid="button-confirm-nasiya">
              <HandCoins className="h-4 w-4 mr-2" />
              Nasiyaga berish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-500" />
              Yetkazib berish
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700 font-medium">Buyurtma summasi:</span>
                <span className="text-lg font-bold text-purple-800">{total.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-purple-600">Tovarlar:</span>
                <span className="text-xs text-purple-600">{itemCount} birlik</span>
              </div>
            </div>

            {deliveryError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {deliveryError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-gray-600">Mijoz ismi *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Mijoz ismi"
                    value={deliveryCustomerName}
                    onChange={(e) => { setDeliveryCustomerName(e.target.value); setDeliveryError(""); }}
                    className="h-9"
                    data-testid="input-delivery-name"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Telefon *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="+998 90 123 45 67"
                    value={deliveryCustomerPhone}
                    onChange={(e) => { setDeliveryCustomerPhone(e.target.value); setDeliveryError(""); }}
                    className="h-9"
                    data-testid="input-delivery-phone"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Manzil *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="MFY, ko'cha, uy"
                    value={deliveryAddress}
                    onChange={(e) => { setDeliveryAddress(e.target.value); setDeliveryError(""); }}
                    className="h-9"
                    data-testid="input-delivery-address"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Kuriyer *</Label>
                <Select value={deliveryCourierId} onValueChange={(val) => { setDeliveryCourierId(val); setDeliveryError(""); }}>
                  <SelectTrigger className="w-full mt-1" data-testid="select-delivery-courier">
                    <SelectValue placeholder="Kuriyer tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {(couriers || []).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!couriers || couriers.length === 0) && (
                  <p className="text-xs text-amber-600 mt-1">Kuriyerlar topilmadi. Xodimlar bo'limida kuriyer qo'shing.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)} data-testid="button-cancel-delivery">
              Bekor qilish
            </Button>
            <Button
              className="bg-purple-500 hover:bg-purple-600"
              onClick={() => {
                if (!deliveryCustomerName.trim()) { setDeliveryError("Mijoz ismi kiritilishi shart"); return; }
                if (!deliveryCustomerPhone.trim()) { setDeliveryError("Telefon raqam kiritilishi shart"); return; }
                if (!deliveryAddress.trim()) { setDeliveryError("Manzil kiritilishi shart"); return; }
                if (!deliveryCourierId) { setDeliveryError("Kuriyer tanlanishi shart"); return; }
                const courier = (couriers || []).find(c => c.id === deliveryCourierId);
                onCheckout(
                  methods[0]?.id || "cash",
                  { customerName: deliveryCustomerName.trim(), customerPhone: deliveryCustomerPhone.trim(), customerInfo: { address: deliveryAddress.trim() } },
                  undefined,
                  { courierId: deliveryCourierId, courierName: courier?.name || "", address: deliveryAddress.trim(), customerName: deliveryCustomerName.trim(), customerPhone: deliveryCustomerPhone.trim() }
                );
                setDeliveryDialogOpen(false);
                setDeliveryMode(false);
                setDeliveryCustomerName("");
                setDeliveryCustomerPhone("");
                setDeliveryAddress("");
                setDeliveryCourierId("");
                setCustomerData({});
                setShowCustomer(false);
              }}
              data-testid="button-confirm-delivery"
            >
              <Truck className="h-4 w-4 mr-2" />
              Yetkazib berish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
