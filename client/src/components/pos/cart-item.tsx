import { useState } from "react";
import { Minus, Plus, Trash2, Percent } from "lucide-react";
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
              <button
                className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 cursor-pointer select-none",
                  "shadow-[0_3px_0_0] active:shadow-[0_1px_0_0] active:translate-y-[2px]",
                  showAdjustment || adjustmentAmount !== 0
                    ? adjustmentAmount < 0
                      ? "bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-orange-700"
                      : "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-emerald-700"
                    : "bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-blue-700 hover:from-blue-500 hover:to-blue-700"
                )}
                onClick={() => setShowAdjustment(!showAdjustment)}
                title="Skidka / Ustama"
                data-testid={`button-adjustment-${item.product.id}`}
              >
                <Percent className="h-4 w-4" strokeWidth={3} />
              </button>
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
        <div className="mt-3 ml-[60px] space-y-2.5">
          <div className="flex gap-1.5">
            <button
              onClick={() => handleTypeChange("skidka")}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all duration-200 select-none",
                "shadow-[0_3px_0_0] active:shadow-[0_1px_0_0] active:translate-y-[2px]",
                adjType === "skidka"
                  ? "bg-gradient-to-b from-red-400 to-red-600 text-white shadow-red-700"
                  : "bg-gradient-to-b from-gray-100 to-gray-200 text-gray-500 shadow-gray-300 hover:from-gray-200 hover:to-gray-300"
              )}
              data-testid="btn-type-skidka"
            >
              Skidka
            </button>
            <button
              onClick={() => handleTypeChange("ustama")}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all duration-200 select-none",
                "shadow-[0_3px_0_0] active:shadow-[0_1px_0_0] active:translate-y-[2px]",
                adjType === "ustama"
                  ? "bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-orange-700"
                  : "bg-gradient-to-b from-gray-100 to-gray-200 text-gray-500 shadow-gray-300 hover:from-gray-200 hover:to-gray-300"
              )}
              data-testid="btn-type-ustama"
            >
              Ustama
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex bg-gray-100 rounded-xl p-0.5 shrink-0 shadow-inner">
              <button
                onClick={() => handleInputTypeChange("summa")}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-sm font-bold transition-all duration-200 select-none",
                  adjInputType === "summa"
                    ? "bg-white shadow-md text-gray-800"
                    : "text-gray-400 hover:text-gray-600"
                )}
                data-testid="btn-input-summa"
              >
                So'm
              </button>
              <button
                onClick={() => handleInputTypeChange("percent")}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-sm font-bold transition-all duration-200 select-none",
                  adjInputType === "percent"
                    ? "bg-white shadow-md text-gray-800"
                    : "text-gray-400 hover:text-gray-600"
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
              className="h-9 text-sm font-semibold flex-1"
              data-testid={`input-adjustment-${item.product.id}`}
            />
            {adjustmentAmount !== 0 && (
              <button
                className="h-8 w-8 rounded-xl flex items-center justify-center bg-gradient-to-b from-gray-200 to-gray-300 text-gray-500 shadow-[0_2px_0_0] shadow-gray-400 active:shadow-[0_0px_0_0] active:translate-y-[2px] transition-all duration-150 hover:from-red-100 hover:to-red-200 hover:text-red-600 shrink-0"
                onClick={clearAdjustment}
                title="Tozalash"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {adjustmentAmount !== 0 && (
            <div className={cn(
              "text-sm font-bold px-3 py-1.5 rounded-xl text-center",
              adjType === "skidka"
                ? "bg-gradient-to-r from-red-50 to-red-100 text-red-600 border border-red-200"
                : "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-600 border border-orange-200"
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
