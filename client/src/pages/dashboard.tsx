import { useState } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ProductCard } from "@/components/pos/product-card";
import { CartSidebar } from "@/components/pos/cart-sidebar";
import { useProducts } from "@/lib/product-context";
import { CATEGORIES, type Product } from "@/data/mock-products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ScanBarcode, Wifi, WifiOff, Bluetooth, RefreshCw, BookOpen } from "lucide-react";
import { ScannerOverlay } from "@/components/pos/scanner-overlay";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface CartItem {
  product: Product;
  quantity: number;
}

export default function Dashboard() {
  const { products } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { toast } = useToast();

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    
    // Play sound mock
    const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const clearCart = () => setCart([]);

  const handleCheckout = () => {
    toast({
      title: "To'lov qabul qilindi!",
      description: `Jami summa: ${cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0).toLocaleString()} so'm`,
      className: "bg-green-500 text-white border-none",
    });
    setCart([]);
  };

  const handleScan = (code: string) => {
    const product = products.find(p => p.barcode === code);
    if (product) {
      addToCart(product);
      setIsScannerOpen(false);
      toast({
        title: "Kitob topildi",
        description: `${product.name} - ${product.author}`,
      });
    } else {
      toast({
        title: "Xatolik",
        description: "Kitob topilmadi",
        variant: "destructive",
      });
      setIsScannerOpen(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchLower) || 
                          product.author.toLowerCase().includes(searchLower) ||
                          product.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === "Barchasi" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <SidebarNav />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Kitob nomi, muallif yoki ISBN..." 
                className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant={isScannerOpen ? "default" : "outline"}
              onClick={() => setIsScannerOpen(true)}
              className="gap-2 border-primary/20 text-primary hover:bg-primary hover:text-white"
            >
              <ScanBarcode className="h-4 w-4" />
              Skaner
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              {isOffline ? <WifiOff className="h-4 w-4 text-red-500" /> : <Wifi className="h-4 w-4 text-green-500" />}
              <span className={cn("hidden sm:inline", isOffline ? "text-red-600" : "text-green-600")}>
                {isOffline ? "Offline rejim" : "Online"}
              </span>
            </div>
            
            <Button variant="ghost" size="icon" onClick={() => setIsOffline(!isOffline)} title="Rejimni o'zgartirish">
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <div className="h-8 w-px bg-gray-200" />
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bluetooth className="h-4 w-4 text-blue-500" />
              <span className="hidden sm:inline">Scanner bog'langan</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex min-h-0 bg-gray-50/50">
          <div className="flex-1 flex flex-col p-6 min-w-0">
            {/* Categories */}
            <div className="mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              <div className="flex gap-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                      selectedCategory === category
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <ScrollArea className="flex-1 -mr-4 pr-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onClick={addToCart} 
                  />
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                  <p>Kitoblar topilmadi</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Cart Sidebar */}
          <CartSidebar 
            items={cart} 
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onClear={clearCart}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      <ScannerOverlay 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan}
      />
    </div>
  );
}

function ScrollArea({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("overflow-y-auto", className)}>
      {children}
    </div>
  );
}
