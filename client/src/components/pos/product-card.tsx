import { useState } from "react";
import { type Product } from "@/data/mock-products";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md active:scale-95 border-transparent hover:border-primary/20 bg-white group overflow-hidden"
      )}
      onClick={() => onClick(product)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-gray-100">
        {!imgError && (
          <img 
            src={product.image} 
            alt={product.name}
            className={cn(
              "w-full h-full object-cover transition-transform group-hover:scale-105",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
        {(!imgLoaded || imgError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 p-2">
            <BookOpen className="h-8 w-8 text-blue-300 mb-2" />
            <div className="text-center">
              <div className="text-xs font-medium line-clamp-2" style={{color: '#1e293b'}}>{product.name}</div>
              <div className="text-[10px] mt-1" style={{color: '#64748b'}}>{product.author}</div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
        {product.stock <= 5 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">
            Kam qoldi
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <div className="space-y-1 mb-2">
          <div className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5em]" style={{color: '#1e293b'}}>
            {product.name}
          </div>
          <div className="text-xs truncate font-medium" style={{color: '#64748b'}}>
            {product.author}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="font-mono font-bold whitespace-nowrap" style={{color: '#3b82f6'}}>
            {product.price.toLocaleString()} so'm
          </div>
          <span className="text-xs font-medium" style={{color: product.stock < 10 ? '#ef4444' : '#64748b'}}>
            {product.stock} dona
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
