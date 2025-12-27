import { useState } from "react";
import { type Product } from "@/data/mock-products";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BookOpen, Plus } from "lucide-react";

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
        "cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] border border-gray-100 hover:border-blue-200 group overflow-hidden"
      )}
      onClick={() => onClick(product)}
      data-testid={`product-card-${product.id}`}
      style={{backgroundColor: '#ffffff', borderRadius: '8px'}}
    >
      <div style={{aspectRatio: '1/1', position: 'relative', overflow: 'hidden', backgroundColor: '#f8fafc'}}>
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
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #eff6ff 0%, #f1f5f9 100%)', padding: '8px'}}>
            <BookOpen style={{width: '24px', height: '24px', color: '#93c5fd', marginBottom: '4px'}} />
            <p style={{color: '#475569', fontSize: '10px', fontWeight: 500, textAlign: 'center', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any}}>{product.name}</p>
          </div>
        )}
        
        {product.stock <= 5 && (
          <div style={{position: 'absolute', top: '4px', left: '4px', backgroundColor: '#ef4444', color: '#ffffff', fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
            Kam
          </div>
        )}
        
        <div style={{position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(255,255,255,0.95)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: product.stock < 10 ? '#dc2626' : '#16a34a'}}>
          {product.stock} ta
        </div>
      </div>
      
      <div style={{padding: '8px', backgroundColor: '#ffffff'}}>
        <p style={{color: '#1e293b', fontSize: '11px', fontWeight: 600, lineHeight: '1.3', margin: 0, marginBottom: '2px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, minHeight: '28px'}}>
          {product.name}
        </p>
        <p style={{color: '#64748b', fontSize: '10px', margin: 0, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {product.author}
        </p>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <span style={{color: '#2563eb', fontSize: '12px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace'}}>
            {product.price.toLocaleString()}
          </span>
          <div style={{width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s'}} className="group-hover:opacity-100">
            <Plus style={{width: '14px', height: '14px', color: '#ffffff'}} />
          </div>
        </div>
      </div>
    </Card>
  );
}
