import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ProductCard } from "@/components/pos/product-card";
import { CartSidebar } from "@/components/pos/cart-sidebar";
import { useProducts } from "@/lib/product-context";
import { useTransactions } from "@/lib/transaction-context";
import { useSettings } from "@/lib/settings-context";
import type { Product } from "@/data/mock-products";
import type { Category } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ScanBarcode, Wifi, WifiOff, Bluetooth, RefreshCw, BookOpen, ShoppingCart, Filter, ChevronDown, Check, TrendingUp, DollarSign, CreditCard, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScannerOverlay } from "@/components/pos/scanner-overlay";
import { ProductInfoDialog } from "@/components/pos/product-info-dialog";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { ReceiptsListDialog } from "@/components/pos/receipts-list-dialog";
import { SoldItemsDialog } from "@/components/pos/sold-items-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface CartItem {
  product: Product;
  quantity: number;
}

const popSound = typeof window !== 'undefined' ? new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3") : null;
const beepSound = typeof window !== 'undefined' ? new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/assets/sounddogs/soundtrack.mp3") : null;

export default function Dashboard() {
  const { products, updateStock, isOffline, refreshProducts } = useProducts();
  const { addTransaction, getStats, pendingCount, syncTransactions } = useTransactions();
  const { settings } = useSettings();
  const stats = getStats();
  
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isReceiptsListOpen, setIsReceiptsListOpen] = useState(false);
  const [isSoldItemsOpen, setIsSoldItemsOpen] = useState(false);
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
    
    if (popSound) {
      popSound.currentTime = 0;
      popSound.volume = 0.5;
      popSound.play().catch(() => {});
    }
  };

  const handleScannedProductAdd = (product: Product) => {
    addToCart(product);
    setScannedProduct(null);
    toast({
      title: "Savatchaga qo'shildi",
      description: `${product.name} - ${product.price.toLocaleString()} so'm`,
      duration: 1500, // Disappear faster (1.5s)
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

  const handleCheckout = async () => {
    const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    
    try {
      // Process transaction (async)
      const transaction = await addTransaction(cart, total, "cash");
      
      // Update stock
      cart.forEach(item => {
        updateStock(item.product.id, -item.quantity);
      });

      setLastTransaction(transaction);
      setIsReceiptOpen(true);
      setIsMobileCartOpen(false);
      
      if (settings.autoPrint) {
        setTimeout(() => {
          window.print();
        }, 500);
      }

      toast({
        title: "To'lov qabul qilindi!",
        description: `Jami summa: ${total.toLocaleString()} so'm`,
        className: "bg-green-500 text-white border-none",
      });
      setCart([]);
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Xatolik!",
        description: "To'lovni qayta ishlashda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const handleScan = (code: string) => {
    // Aggressively normalize: remove all non-numeric characters
    const normalize = (s: string) => s.replace(/[^0-9]/g, "");
    
    const cleanCode = normalize(code);
    
    if (!cleanCode) return; // Empty scan
    
    // Fuzzy search for barcode (handle EAN-13 vs UPC-A leading zero issues)
    const product = products.find(p => {
      const pBarcode = normalize(p.barcode);
      return (
        pBarcode === cleanCode || 
        pBarcode === "0" + cleanCode || 
        "0" + pBarcode === cleanCode
      );
    });
    
    if (product) {
      setIsScannerOpen(false);
      setScannedProduct(product);
      if (beepSound) {
        beepSound.currentTime = 0;
        beepSound.volume = 0.5;
        beepSound.play().catch(() => {});
      }
    } else {
      toast({
        title: "Xatolik",
        description: `Kitob topilmadi: ${code}`,
        variant: "destructive",
        action: (
           <Button variant="outline" size="sm" className="bg-white text-black border-none hover:bg-gray-100" onClick={() => {
              navigator.clipboard.writeText(code);
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
    <div className="flex flex-col md:flex-row min-h-screen font-sans" style={{backgroundColor: '#f1f5f9'}}>
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
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={() => { refreshProducts(); syncTransactions(); }} 
                 title="Ma'lumotlarni yangilash"
                 disabled={isOffline}
               >
                 <RefreshCw className="h-4 w-4" />
               </Button>
               {pendingCount > 0 && (
                 <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                   {pendingCount} kutilmoqda
                 </span>
               )}
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
            {/* KPI Stats Row */}
            <div className="grid grid-cols-4 gap-2 md:gap-3 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-2.5 md:p-4 shadow-sm text-white text-center">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 opacity-80" />
                <p className="text-[9px] md:text-xs opacity-80 font-medium">Bugun</p>
                <p className="text-xs md:text-lg font-bold">{(stats.todayTotal / 1000).toFixed(0)}k</p>
              </div>
              <div 
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2.5 md:p-4 shadow-sm text-white text-center cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsReceiptsListOpen(true)}
                data-testid="button-receipts-list"
              >
                <CreditCard className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 opacity-80" />
                <p className="text-[9px] md:text-xs opacity-80 font-medium">Cheklar</p>
                <p className="text-xs md:text-lg font-bold">{stats.todayCount}</p>
              </div>
              <div 
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-2.5 md:p-4 shadow-sm text-white text-center cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsSoldItemsOpen(true)}
                data-testid="button-sold-items"
              >
                <Package className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 opacity-80" />
                <p className="text-[9px] md:text-xs opacity-80 font-medium">Sotildi</p>
                <p className="text-xs md:text-lg font-bold">{stats.totalItemsSold}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-2.5 md:p-4 shadow-sm text-white text-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 opacity-80" />
                <p className="text-[9px] md:text-xs opacity-80 font-medium">Oylik</p>
                <p className="text-xs md:text-lg font-bold">{(stats.monthTotal / 1000).toFixed(0)}k</p>
              </div>
            </div>

            {/* Category Filter Dropdown */}
            <div className="mb-4 flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" style={{backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#e2e8f0'}}>
                    <Filter className="h-4 w-4" />
                    <span>{selectedCategory}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56" style={{backgroundColor: '#ffffff'}}>
                  <DropdownMenuItem
                    onClick={() => setSelectedCategory("Barchasi")}
                    className="cursor-pointer"
                    style={{color: '#1e293b'}}
                  >
                    <span className="flex-1">Barchasi</span>
                    {selectedCategory === "Barchasi" && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                  {categories.map(category => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => setSelectedCategory(category.name)}
                      className="cursor-pointer"
                      style={{color: '#1e293b'}}
                    >
                      <span className="flex-1">{category.name}</span>
                      {selectedCategory === category.name && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <span style={{color: '#64748b', fontSize: '14px'}}>{filteredProducts.length} ta kitob</span>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-scroll pb-20 md:pb-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onClick={addToCart}
                    size="large"
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

      <ReceiptsListDialog
        isOpen={isReceiptsListOpen}
        onClose={() => setIsReceiptsListOpen(false)}
      />

      <SoldItemsDialog
        isOpen={isSoldItemsOpen}
        onClose={() => setIsSoldItemsOpen(false)}
      />
    </div>
  );
}
