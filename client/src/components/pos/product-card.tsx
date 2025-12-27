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
      <div className="aspect-[3/4] relative overflow-hidden bg-gray-100">
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
      <CardContent className="p-2" style={{backgroundColor: '#ffffff'}}>
        <div style={{marginBottom: '4px'}}>
          <p style={{color: '#1e293b', fontSize: '12px', fontWeight: 500, lineHeight: '1.2', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any}}>
            {product.name}
          </p>
          <p style={{color: '#64748b', fontSize: '10px', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
            {product.author}
          </p>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <span style={{color: '#3b82f6', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace'}}>
            {product.price.toLocaleString()}
          </span>
          <span style={{color: product.stock < 10 ? '#ef4444' : '#64748b', fontSize: '10px'}}>
            {product.stock}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
