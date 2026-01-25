import { useState } from "react";
import { type Product } from "@/data/mock-products";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BookOpen, Plus, ShoppingCart, Play } from "lucide-react";
import { VideoPopup } from "@/components/ui/video-popup";

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  size?: "default" | "large";
}

export function ProductCard({ product, onClick, size = "default" }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isLarge = size === "large";

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-xl active:scale-[0.98] border-0 group overflow-hidden relative",
        "bg-white rounded-xl shadow-sm hover:shadow-lg"
      )}
      onClick={() => onClick(product)}
      data-testid={`product-card-${product.id}`}
    >
      <div 
        className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100"
        style={{ aspectRatio: isLarge ? '3/4' : '1/1' }}
      >
        {!imgError && (
          <img 
            src={product.image} 
            alt={product.name}
            className={cn(
              "w-full h-full object-cover transition-all duration-300 group-hover:scale-110",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
        {(!imgLoaded || imgError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-slate-100 p-4">
            <BookOpen className={cn("text-blue-300 mb-2", isLarge ? "w-12 h-12" : "w-8 h-8")} />
            <p className={cn("text-slate-600 font-medium text-center line-clamp-2", isLarge ? "text-sm" : "text-xs")}>
              {product.name}
            </p>
          </div>
        )}
        
        {product.stock <= 5 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-lg">
            Kam qoldi
          </div>
        )}

        {/* Debug: show videoUrl status */}
        <div className="absolute top-10 left-2 bg-black/80 text-white text-[8px] px-1 py-0.5 rounded z-[100]">
          {product.videoUrl ? `V:✓ ${product.videoUrl.slice(0,15)}` : "V:✗"}
        </div>
        
        {product.videoUrl && product.videoUrl.trim() !== "" && (
          <div 
            className="absolute bottom-12 left-2 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoPopup 
              videoUrl={product.videoUrl} 
              productName={product.name}
              trigger={
                <div className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer shadow-lg transition-colors animate-pulse">
                  <Play className="w-3 h-3 fill-white" />
                  Batafsil video
                </div>
              }
            />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-center">
            <div className="bg-white text-blue-600 rounded-full px-4 py-2 flex items-center gap-2 font-semibold text-sm shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
              <ShoppingCart className="w-4 h-4" />
              Qo'shish
            </div>
          </div>
        </div>
        
        <div className={cn(
          "absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-full font-bold shadow-md",
          isLarge ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs",
          product.stock < 10 ? "text-red-600" : "text-emerald-600"
        )}>
          {product.stock} ta
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
          "text-slate-500 truncate mb-2",
          isLarge ? "text-sm" : "text-xs"
        )}>
          {product.author}
        </p>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-blue-600 font-bold font-mono",
            isLarge ? "text-lg" : "text-base"
          )}>
            {product.price.toLocaleString()} <span className="text-slate-400 font-normal text-xs">so'm</span>
          </span>
          <div className={cn(
            "rounded-full bg-blue-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100",
            isLarge ? "w-10 h-10" : "w-8 h-8"
          )}>
            <Plus className={isLarge ? "w-5 h-5" : "w-4 h-4"} />
          </div>
        </div>
      </div>
    </Card>
  );
}
