import { ProductImage } from "@/components/product-image";
import { ProductPrice } from "@/components/product-price";
import { memo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { type Product } from "@/data/mock-products";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Play } from "lucide-react";
import { VideoPopup } from "@/components/ui/video-popup";

// Renders a compact barcode SVG using JsBarcode. Picks an encoding that
// matches the value length (EAN-13 / EAN-8 / UPC-A / fallback CODE128) so
// short numeric codes don't get rejected. We render *once* per barcode
// change inside an effect; React.memo on ProductCard prevents re-renders
// when the underlying product reference doesn't change.
function MiniBarcode({ value, compact }: { value: string; compact: boolean }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    const trimmed = String(value).trim();
    let format: "EAN13" | "EAN8" | "UPC" | "CODE128" = "CODE128";
    if (/^\d{13}$/.test(trimmed)) format = "EAN13";
    else if (/^\d{12}$/.test(trimmed)) format = "UPC";
    else if (/^\d{8}$/.test(trimmed)) format = "EAN8";
    try {
      JsBarcode(svgRef.current, trimmed, {
        format,
        displayValue: true,
        fontSize: compact ? 9 : 10,
        height: compact ? 28 : 32,
        width: compact ? 1.1 : 1.3,
        margin: 0,
        background: "#ffffff",
        lineColor: "#1f2937",
      });
    } catch {
      // If the format check above is wrong (e.g. invalid checksum) fall
      // back to CODE128 which accepts any string. This keeps the card
      // resilient to imported-from-Excel or hand-typed barcodes.
      try {
        JsBarcode(svgRef.current, trimmed, {
          format: "CODE128",
          displayValue: true,
          fontSize: compact ? 9 : 10,
          height: compact ? 28 : 32,
          width: compact ? 1.1 : 1.3,
          margin: 0,
          background: "#ffffff",
          lineColor: "#1f2937",
        });
      } catch {
        // Give up silently — text fallback below already shows the number.
      }
    }
  }, [value, compact]);

  return (
    <svg
      ref={svgRef}
      className="w-full max-h-9 block"
      preserveAspectRatio="xMidYMid meet"
      data-testid={`barcode-svg-${value}`}
    />
  );
}

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  size?: "default" | "large";
  showBarcode?: boolean;  // PERF: opt-in. Rendering JsBarcode SVG for 700+ kassa cards
                          // takes 5-15s on the main thread. Default OFF for the kassa.
}

function ProductCardImpl({ product, onClick, size = "default", showBarcode = false }: ProductCardProps) {

  const isLarge = size === "large";

  const outOfStock = product.stock <= 0;

  return (
    <Card 
      className={cn(
        "transition-all border-0 group overflow-hidden relative",
        "bg-white rounded-xl shadow-sm",
        outOfStock 
          ? "opacity-50 cursor-not-allowed" 
          : "cursor-pointer hover:shadow-xl active:scale-[0.98] hover:shadow-lg"
      )}

      data-testid={`product-card-${product.id}`}
    >
      <div 
        className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100"
        style={{ aspectRatio: isLarge ? '3/4' : '1/1' }}
      >
        <ProductImage src={product.image} alt={product.name} />
        
        {outOfStock ? (
          <div className="absolute top-2 left-2 bg-gray-700 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-lg">
            Tugadi
          </div>
        ) : product.stock <= 5 ? (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-lg">
            Kam qoldi
          </div>
        ) : null}

        
        <div className={cn(
          "absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-full font-bold shadow-md",
          isLarge ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs",
          product.stock < 10 ? "text-red-600" : "text-emerald-600"
        )}>
          {product.stock} {(product as any).unit || "dona"}
        </div>
      </div>
      
      <div className={cn("bg-white", isLarge ? "p-4" : "p-3")}>
        <p className={cn(
          "text-slate-800 font-semibold line-clamp-2 leading-tight mb-1",
          isLarge ? "text-base min-h-[48px]" : "text-sm min-h-[40px]"
        )}>
          {product.name}
        </p>
        <p className={cn(
          "text-slate-500 truncate",
          isLarge ? "text-sm" : "text-xs"
        )}>
          {product.author}
        </p>
        {product.barcode ? (
          <p
            className={cn(
              "text-slate-400 font-mono truncate",
              isLarge ? "text-xs" : "text-[10px]"
            )}
            data-testid={`text-barcode-${product.id}`}
          >
            {product.barcode}
          </p>
        ) : null}
        {showBarcode && product.barcode ? (
          <div
            className="mb-2 -mx-1 px-1"
            data-testid={`barcode-product-${product.id}`}
          >
            <MiniBarcode value={product.barcode} compact={!isLarge} />
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-blue-600 font-bold font-mono",
            isLarge ? "text-lg" : "text-base"
          )}>
            <ProductPrice product={product} />
          </span>
          <button type="button" aria-label={`${product.name} — savatga qo'shish`} disabled={outOfStock} onClick={() => onClick(product)} className={cn(
            "rounded-full bg-blue-500 text-white flex items-center justify-center transition-all disabled:opacity-40",
            isLarge ? "w-10 h-10" : "w-8 h-8"
          )}>
            <Plus className={isLarge ? "w-5 h-5" : "w-4 h-4"} />
          </button>
        </div>
        
        {product.videoUrl && product.videoUrl.trim() !== "" && (
          <div 
            className="mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoPopup 
              videoUrl={product.videoUrl} 
              productName={product.name}
              trigger={
                <div className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors w-full">
                  <Play className="w-4 h-4 fill-white" />
                  Batafsil video
                </div>
              }
            />
          </div>
        )}
      </div>
    </Card>
  );
}

// memo: re-render only when product reference, onClick, or size actually changes.
// Without this, every cart update or search keystroke re-renders ALL cards.
export const ProductCard = memo(ProductCardImpl, (prev, next) => {
  return prev.product === next.product
      && prev.onClick === next.onClick
      && prev.size === next.size
      && prev.showBarcode === next.showBarcode;
});
