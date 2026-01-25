import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Banknote, QrCode, Trash2, ShoppingBag } from "lucide-react";
import { CartItem } from "./cart-item";
import type { CartItem as CartItemType } from "@/pages/dashboard";

interface CartSidebarProps {
  items: CartItemType[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateDiscount: (id: string, discount: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export function CartSidebar({ items, onUpdateQuantity, onUpdateDiscount, onRemove, onClear, onCheckout }: CartSidebarProps) {
  const subtotal = items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalDiscount = items.reduce((acc, item) => acc + (item.discount || 0), 0);
  const total = subtotal - totalDiscount;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white border-l shadow-xl w-[420px] lg:w-[460px]">
      <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-none">Savatcha</h2>
            <span className="text-xs text-muted-foreground">№ 000124 • Kassa 1</span>
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

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="flex flex-col items-center justify-center h-20 gap-2 border-2 hover:border-green-500 hover:bg-green-50 transition-all" onClick={onCheckout}>
            <Banknote className="h-7 w-7 text-green-600" />
            <span className="text-sm font-semibold">Naqd</span>
          </Button>
          <Button variant="outline" className="flex flex-col items-center justify-center h-20 gap-2 border-2 hover:border-blue-500 hover:bg-blue-50 transition-all" onClick={onCheckout}>
            <CreditCard className="h-7 w-7 text-blue-600" />
            <span className="text-sm font-semibold">Karta</span>
          </Button>
        </div>
        
        <Button size="lg" className="w-full text-xl h-16 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 font-bold" onClick={onCheckout} disabled={items.length === 0}>
          To'lov qilish
        </Button>
      </div>
    </div>
  );
}
