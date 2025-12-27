import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Product } from "@/data/mock-products";
import { ShoppingCart, Package, Barcode, User } from "lucide-react";

interface ProductInfoDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export function ProductInfoDialog({ product, isOpen, onClose, onAddToCart }: ProductInfoDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">Mahsulot Ma'lumotlari</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-32 h-48 rounded-lg overflow-hidden shadow-lg border border-gray-200">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-full space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{product.author}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg border text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Narxi</span>
                <div className="font-bold text-primary text-lg">
                  {product.price.toLocaleString()} so'm
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Omborda</span>
                <div className={`font-bold text-lg ${product.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                  {product.stock} dona
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
              <div className="flex justify-between">
                <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Kategoriya:</span>
                <span className="font-medium text-gray-900">{product.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-2"><Barcode className="h-4 w-4" /> Shtrix kod:</span>
                <span className="font-mono font-medium text-gray-900">{product.barcode}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Yopish
          </Button>
          <Button onClick={() => onAddToCart(product)} className="w-full sm:w-auto flex-1 gap-2">
            <ShoppingCart className="h-4 w-4" />
            Savatchaga qo'shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
