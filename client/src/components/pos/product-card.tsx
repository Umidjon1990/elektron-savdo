import { type Product } from "@/data/mock-products";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md active:scale-95 border-transparent hover:border-primary/20 bg-white group overflow-hidden"
      )}
      onClick={() => onClick(product)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
        {product.stock <= 5 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            Kam qoldi
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <div className="flex justify-between items-start gap-2">
          <div className="font-medium text-sm text-foreground line-clamp-2 leading-tight min-h-[2.5em]">
            {product.name}
          </div>
          <div className="font-mono font-bold text-primary whitespace-nowrap">
            {product.price.toLocaleString()} so'm
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Shtrix: {product.barcode}</span>
          <span className={cn(product.stock < 10 ? "text-red-500 font-medium" : "")}>
            {product.stock} dona
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
