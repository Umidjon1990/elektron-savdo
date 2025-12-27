import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem as CartItemType } from "@/pages/dashboard";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex gap-3 py-3 border-b border-dashed border-gray-200 last:border-0 animate-in slide-in-from-right-4 duration-300">
      <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
        <img src={item.product.image} alt="" className="w-full h-full object-cover" />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-2">
          <span className="font-medium text-sm truncate">{item.product.name}</span>
          <span className="font-mono font-bold text-sm whitespace-nowrap">
            {(item.product.price * item.quantity).toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-muted-foreground font-mono">
            {item.product.price.toLocaleString()} x {item.quantity}
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-6 w-6 rounded-full border-gray-200 hover:bg-gray-100 hover:text-red-600"
              onClick={() => item.quantity === 1 ? onRemove(item.product.id) : onUpdateQuantity(item.product.id, -1)}
            >
              {item.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            </Button>
            <span className="w-6 text-center text-sm font-medium tabular-nums">
              {item.quantity}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-6 w-6 rounded-full border-gray-200 hover:bg-gray-100 hover:text-primary"
              onClick={() => onUpdateQuantity(item.product.id, 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
