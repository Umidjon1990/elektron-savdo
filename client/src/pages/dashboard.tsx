import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ProductCard } from "@/components/pos/product-card";
import { CartSidebar } from "@/components/pos/cart-sidebar";
import { useProducts } from "@/lib/product-context";
import { useTransactions } from "@/lib/transaction-context";
import { CATEGORIES, type Product } from "@/data/mock-products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ScanBarcode, Wifi, WifiOff, Bluetooth, RefreshCw, BookOpen, ShoppingCart } from "lucide-react";
import { ScannerOverlay } from "@/components/pos/scanner-overlay";
import { ProductInfoDialog } from "@/components/pos/product-info-dialog";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface CartItem {
  product: Product;
  quantity: number;
}

export default function Dashboard() {
  const { products, updateStock } = useProducts();
  const { addTransaction } = useTransactions();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
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

  const handleScannedProductAdd = (product: Product) => {
    addToCart(product);
    setScannedProduct(null);
    toast({
      title: "Savatchaga qo'shildi",
      description: `${product.name} - ${product.price.toLocaleString()} so'm`,
    });
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
    const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    
    // Process transaction
    const transaction = addTransaction(cart, total, "cash"); // Default to cash for now
    
    // Update stock
    cart.forEach(item => {
      updateStock(item.product.id, -item.quantity);
    });

    setLastTransaction(transaction);
    setIsReceiptOpen(true);
    setIsMobileCartOpen(false);

    toast({
      title: "To'lov qabul qilindi!",
      description: `Jami summa: ${total.toLocaleString()} so'm`,
      className: "bg-green-500 text-white border-none",
    });
    setCart([]);
  };

  const handleScan = (code: string) => {
    // Try to find exact match or match after trimming
    const cleanCode = code.trim();
    
    // Fuzzy search for barcode (handle EAN-13 vs UPC-A leading zero issues)
    const product = products.find(p => {
      const pBarcode = p.barcode.trim();
      return (
        pBarcode === cleanCode || 
        pBarcode === "0" + cleanCode || 
        "0" + pBarcode === cleanCode
      );
    });
    
    if (product) {
      setIsScannerOpen(false);
      setScannedProduct(product);
      // Play beep sound
      const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/assets/sounddogs/soundtrack.mp3"); // Short beep ideally
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } else {
      toast({
        title: "Xatolik",
        description: `Kitob topilmadi: ${cleanCode}`,
        variant: "destructive",
        action: (
           <Button variant="outline" size="sm" className="bg-white text-black border-none hover:bg-gray-100" onClick={() => {
              // Copy to clipboard or navigate to inventory (future improvement)
              navigator.clipboard.writeText(cleanCode);
           }}>
             Nusxalash
           </Button>
        )
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

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden font-sans">
      <SidebarNav />
      
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Qidiruv..." 
                className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-primary w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant={isScannerOpen ? "default" : "outline"}
              onClick={() => setIsScannerOpen(true)}
              size="icon"
              className="md:hidden shrink-0 border-primary/20 text-primary hover:bg-primary hover:text-white"
            >
               <ScanBarcode className="h-4 w-4" />
            </Button>
            <Button 
              variant={isScannerOpen ? "default" : "outline"}
              onClick={() => setIsScannerOpen(true)}
              className="hidden md:flex gap-2 border-primary/20 text-primary hover:bg-primary hover:text-white"
            >
              <ScanBarcode className="h-4 w-4" />
              Skaner
            </Button>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-2">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              {isOffline ? <WifiOff className="h-4 w-4 text-red-500" /> : <Wifi className="h-4 w-4 text-green-500" />}
              <span className={cn("hidden lg:inline", isOffline ? "text-red-600" : "text-green-600")}>
                {isOffline ? "Offline rejim" : "Online"}
              </span>
            </div>
            
            {/* Mobile Cart Trigger */}
            <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
              <SheetTrigger asChild>
                <Button className="md:hidden relative" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-full sm:max-w-md border-l-0">
                <CartSidebar 
                  items={cart} 
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  onClear={clearCart}
                  onCheckout={handleCheckout}
                />
              </SheetContent>
            </Sheet>

            <div className="hidden md:flex items-center gap-2">
               <Button variant="ghost" size="icon" onClick={() => setIsOffline(!isOffline)} title="Rejimni o'zgartirish">
                 <RefreshCw className="h-4 w-4" />
               </Button>
               <div className="h-8 w-px bg-gray-200" />
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <Bluetooth className="h-4 w-4 text-blue-500" />
                 <span className="hidden lg:inline">Scanner bog'langan</span>
               </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex min-h-0 bg-gray-50/50">
          <div className="flex-1 flex flex-col p-4 md:p-6 min-w-0">
            {/* Categories */}
            <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-6 md:px-6 scrollbar-hide">
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
            <div className="flex-1 overflow-y-auto -mr-4 pr-4 pb-20 md:pb-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
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
            </div>
          </div>

          {/* Desktop Cart Sidebar */}
          <div className="hidden md:block h-full">
            <CartSidebar 
              items={cart} 
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
              onClear={clearCart}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      <ScannerOverlay 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan}
      />
      
      <ProductInfoDialog 
        product={scannedProduct}
        isOpen={!!scannedProduct}
        onClose={() => setScannedProduct(null)}
        onAddToCart={handleScannedProductAdd}
      />

      <ReceiptDialog 
        transaction={lastTransaction}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
}
