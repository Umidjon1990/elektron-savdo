import { useState } from "react";
import { Minus, Plus, Trash2, PlusCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CartItem as CartItemType } from "@/pages/dashboard";
import { cn } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateDiscount: (id: string, discount: number, adjustmentType?: "skidka" | "ustama", adjustmentInputType?: "summa" | "percent", adjustmentValue?: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onUpdateDiscount, onRemove }: CartItemProps) {
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjType, setAdjType] = useState<"skidka" | "ustama">(item.adjustmentType || "skidka");
  const [adjInputType, setAdjInputType] = useState<"summa" | "percent">(item.adjustmentInputType || "summa");
  const [adjValue, setAdjValue] = useState(item.adjustmentValue?.toString() || "");

  const effectivePrice = item.product.price > 0 ? item.product.price : ((item.product as any).barcodePrice || (item.product as any).wholesalePrice || 0);
  const itemTotal = effectivePrice * item.quantity;
  const adjustmentAmount = item.discount || 0;
  const finalTotal = itemTotal - adjustmentAmount;

  const handleAdjustmentChange = (value: string, type: "skidka" | "ustama" = adjType, inputType: "summa" | "percent" = adjInputType) => {
    setAdjValue(value);
    const num = Math.max(0, parseFloat(value) || 0);

    let calculatedAmount = 0;
    if (inputType === "percent") {
      const clampedPercent = Math.min(num, 100);
      calculatedAmount = Math.round(itemTotal * clampedPercent / 100);
    } else {
      calculatedAmount = type === "skidka" ? Math.min(num, itemTotal) : num;
    }

    onUpdateDiscount(item.product.id, calculatedAmount, type, inputType, num);
  };

  const handleTypeChange = (newType: "skidka" | "ustama") => {
    setAdjType(newType);
    handleAdjustmentChange(adjValue, newType, adjInputType);
  };

  const handleInputTypeChange = (newInputType: "summa" | "percent") => {
    setAdjInputType(newInputType);
    setAdjValue("");
    onUpdateDiscount(item.product.id, 0, adjType, newInputType, 0);
  };

  const clearAdjustment = () => {
    setAdjValue("");
    setAdjType("skidka");
    setAdjInputType("summa");
    onUpdateDiscount(item.product.id, 0);
    setShowAdjustment(false);
  };

  return (
    <div className="py-3 border-b border-dashed border-gray-200 last:border-0 animate-in slide-in-from-right-4 duration-300">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
          <img src={item.product.image} alt="" className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex justify-between items-start gap-2">
            <span className="font-medium text-sm truncate">{item.product.name}</span>
            <div className="text-right">
              {adjustmentAmount !== 0 ? (
                <>
                  <span className="font-mono text-xs text-muted-foreground line-through">
                    {itemTotal.toLocaleString()}
                  </span>
                  <span className={cn(
                    "font-mono font-bold text-sm ml-1",
                    adjustmentAmount > 0 ? "text-green-600" : "text-orange-600"
                  )}>
                    {finalTotal.toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="font-mono font-bold text-sm whitespace-nowrap">
                  {itemTotal.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-muted-foreground font-mono">
              {effectivePrice.toLocaleString()} x {item.quantity}
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-6 w-6 rounded-full",
                  showAdjustment || adjustmentAmount !== 0
                    ? adjustmentAmount < 0
                      ? "text-orange-600 bg-orange-50"
                      : "text-green-600 bg-green-50"
                    : "text-blue-500 hover:bg-blue-50"
                )}
                onClick={() => setShowAdjustment(!showAdjustment)}
                title="Skidka / Ustama"
                data-testid={`button-adjustment-${item.product.id}`}
              >
                {adjustmentAmount < 0 ? (
                  <PlusCircle className="h-3.5 w-3.5" />
                ) : (
                  <MinusCircle className="h-3.5 w-3.5" />
                )}
              </Button>
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
      
      {showAdjustment && (
        <div className="mt-2.5 ml-[60px] space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => handleTypeChange("skidka")}
              className={cn(
                "flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all",
                adjType === "skidka"
                  ? "bg-red-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              data-testid="btn-type-skidka"
            >
              Skidka
            </button>
            <button
              onClick={() => handleTypeChange("ustama")}
              className={cn(
                "flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all",
                adjType === "ustama"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              data-testid="btn-type-ustama"
            >
              Ustama
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex bg-gray-100 rounded-md p-0.5 shrink-0">
              <button
                onClick={() => handleInputTypeChange("summa")}
                className={cn(
                  "text-xs py-1 px-2.5 rounded font-medium transition-all",
                  adjInputType === "summa"
                    ? "bg-white shadow-sm text-gray-800"
                    : "text-gray-500 hover:text-gray-700"
                )}
                data-testid="btn-input-summa"
              >
                So'm
              </button>
              <button
                onClick={() => handleInputTypeChange("percent")}
                className={cn(
                  "text-xs py-1 px-2.5 rounded font-medium transition-all",
                  adjInputType === "percent"
                    ? "bg-white shadow-sm text-gray-800"
                    : "text-gray-500 hover:text-gray-700"
                )}
                data-testid="btn-input-percent"
              >
                %
              </button>
            </div>
            <Input
              type="number"
              placeholder="0"
              value={adjValue}
              onChange={(e) => handleAdjustmentChange(e.target.value)}
              className="h-7 text-sm flex-1"
              data-testid={`input-adjustment-${item.product.id}`}
            />
            {adjustmentAmount !== 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-gray-400 hover:text-red-500"
                onClick={clearAdjustment}
                title="Tozalash"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {adjustmentAmount !== 0 && (
            <div className={cn(
              "text-xs font-medium px-2 py-1 rounded",
              adjType === "skidka" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
            )}>
              {adjType === "skidka" ? "−" : "+"}{Math.abs(adjustmentAmount).toLocaleString()} so'm
              {adjInputType === "percent" && adjValue && ` (${adjValue}%)`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
