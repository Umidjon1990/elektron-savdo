import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Banknote, QrCode, Trash2, ShoppingBag, HandCoins, ChevronDown, ChevronUp, User, Phone, MapPin, FileText, Plus } from "lucide-react";
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

interface CartSidebarProps {
  items: CartItemType[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateDiscount: (id: string, discount: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: (method: string, customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }) => void;
  paymentMethods?: PaymentMethod[];
  customerFields?: CustomerField[];
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

export function CartSidebar({ items, onUpdateQuantity, onUpdateDiscount, onRemove, onClear, onCheckout, paymentMethods, customerFields }: CartSidebarProps) {
  const subtotal = items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalDiscount = items.reduce((acc, item) => acc + (item.discount || 0), 0);
  const total = subtotal - totalDiscount;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const [showCustomer, setShowCustomer] = useState(false);
  const [customerData, setCustomerData] = useState<Record<string, string>>({});
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const methods = paymentMethods && paymentMethods.length > 0 ? paymentMethods : DEFAULT_PAYMENT_METHODS;
  const custFields = customerFields && customerFields.length > 0 ? customerFields : DEFAULT_CUSTOMER_FIELDS;

  const handleCheckout = (methodId: string) => {
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
            <span className="font-semibold text-base">{itemCount} dona</span>
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
    </div>
  );
}
