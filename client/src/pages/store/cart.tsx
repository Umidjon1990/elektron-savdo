import { useState } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import { useOrders } from "@/lib/order-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { toast } = useToast();
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    telegramPhone: "",
    deliveryType: "delivery" as "delivery" | "pickup",
    paymentMethod: "click" as "cash" | "card" | "online",
    address: "",
    shippingType: "BTS" as "BTS" | "Starex",
    postalAddress: ""
  });

  const handleCheckout = async () => {
    if (!formData.name || !formData.phone || !formData.telegramPhone) {
      toast({
        title: "Ma'lumotlar to'liq emas",
        description: "Iltimos, ism va telefon raqamlarini kiriting",
        variant: "destructive"
      });
      return;
    }

    if (formData.deliveryType === "delivery" && !formData.address) {
      toast({
        title: "Manzil kiritilmagan",
        description: "Iltimos, yetkazib berish manzilingizni kiriting",
        variant: "destructive"
      });
      return;
    }

    try {
      // Add order to admin panel and send Telegram notification via backend
      let telegramInfo = formData.telegramPhone;
      if (formData.deliveryType === "delivery") {
        telegramInfo += ` | Manzil: ${formData.address} | Pochta: ${formData.shippingType}`;
        if (formData.postalAddress) {
          telegramInfo += ` | Pochta manzili: ${formData.postalAddress}`;
        }
      }
      await addOrder({
        customerName: formData.name,
        customerPhone: formData.phone,
        customerTelegram: telegramInfo,
        items: items,
        totalAmount: total,
        paymentMethod: formData.paymentMethod,
        deliveryType: formData.deliveryType
      });

      toast({
        title: "Buyurtma qabul qilindi! ✅",
        description: "Tez orada operatorlarimiz siz bilan Telegram orqali bog'lanishadi.",
      });

      clearCart();
      setIsCheckoutOpen(false);
      setLocation("/");
    } catch (error) {
      toast({
        title: "Xatolik yuz berdi",
        description: "Buyurtmani yuborishda xatolik. Qaytadan urinib ko'ring.",
        variant: "destructive"
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Savatchangiz bo'sh</h1>
        <p className="text-slate-500 mb-8 max-w-sm">
          Siz hali hech qanday kitob tanlamadingiz. Katalogga qaytib, o'zingizga yoqqan kitoblarni tanlang.
        </p>
        <Button onClick={() => setLocation("/")} className="bg-indigo-600 hover:bg-indigo-700">
          <ArrowLeft className="mr-2 h-4 w-4" /> Katalogga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Savatcha</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.product.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-4">
                <div className="w-20 h-28 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-2">{item.product.name}</h3>
                    <p className="text-sm text-slate-500">{item.product.author}</p>
                    <div className="text-indigo-600 font-bold mt-1">
                      {item.product.price.toLocaleString()} so'm
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-md"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-md"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => removeItem(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-0 shadow-lg shadow-indigo-50">
              <CardHeader>
                <CardTitle>Buyurtma ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Mahsulotlar ({items.reduce((a, b) => a + b.quantity, 0)})</span>
                  <span className="font-medium">{total.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Yetkazib berish</span>
                  <span className="font-medium text-green-600">Bepul</span>
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
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg">
                      Rasmiylashtirish
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Buyurtmani tasdiqlash</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="space-y-2">
                        <Label>Ism Familiya</Label>
                        <Input 
                          placeholder="Azizbek T." 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aloqa uchun telefon</Label>
                        <Input 
                          placeholder="+998 90 123 45 67" 
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Telegram uchun telefon</Label>
                        <p className="text-xs text-amber-600 mb-1">💡 Telegram ulangan raqamingizni kiriting</p>
                        <Input 
                          data-testid="input-telegram"
                          placeholder="+998 90 123 45 67" 
                          value={formData.telegramPhone}
                          onChange={(e) => setFormData({...formData, telegramPhone: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Yetkazib berish turi</Label>
                        <RadioGroup 
                          value={formData.deliveryType} 
                          onValueChange={(v: "delivery" | "pickup") => setFormData({...formData, deliveryType: v})}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div>
                            <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                            <Label
                              htmlFor="delivery"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <span className="mb-2 block text-2xl">🚚</span>
                              <span className="text-xs font-medium">Kuryer</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
                            <Label
                              htmlFor="pickup"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <span className="mb-2 block text-2xl">🏢</span>
                              <span className="text-xs font-medium">Olib ketish</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {formData.deliveryType === "delivery" && (
                        <>
                          <div className="space-y-2">
                            <Label>Manzil</Label>
                            <Input 
                              placeholder="Shahar, tuman, ko'cha, uy raqami" 
                              value={formData.address}
                              onChange={(e) => setFormData({...formData, address: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Pochta turi</Label>
                            <RadioGroup 
                              value={formData.shippingType} 
                              onValueChange={(v: "BTS" | "Starex") => setFormData({...formData, shippingType: v})}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="BTS" id="bts" />
                                <Label htmlFor="bts">BTS</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Starex" id="starex" />
                                <Label htmlFor="starex">Starex</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="space-y-2">
                            <Label>Pochta manzili <span className="text-slate-400 font-normal">(ixtiyoriy)</span></Label>
                            <Input 
                              placeholder="Pochta filiali manzili" 
                              value={formData.postalAddress}
                              onChange={(e) => setFormData({...formData, postalAddress: e.target.value})}
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label>To'lov turi</Label>
                        <RadioGroup 
                          value={formData.paymentMethod} 
                          onValueChange={(v: any) => setFormData({...formData, paymentMethod: v})}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="click" id="click" />
                            <Label htmlFor="click">Click / Payme</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cash" id="cash" />
                            <Label htmlFor="cash">Naqd</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="flex items-center space-x-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                         <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                         <span className="text-sm text-indigo-700 font-medium">Telegram orqali chek olish</span>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-4 border text-sm text-slate-500">
                        Buyurtma tasdiqlangandan so'ng, ma'lumotlar avtomatik ravishda Telegram botimizga yuboriladi.
                      </div>
                    </div>
                    <Button onClick={handleCheckout} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700">
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
