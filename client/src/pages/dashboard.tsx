import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Search, ScanBarcode, Wifi, WifiOff, Bluetooth, RefreshCw, Package as PackageIcon, ShoppingCart, Filter, ChevronDown, Check, TrendingUp, DollarSign, CreditCard, Package, Pin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScannerOverlay } from "@/components/pos/scanner-overlay";
import { ProductInfoDialog } from "@/components/pos/product-info-dialog";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { buildReceiptHtml } from "@/lib/receipt-html";
import { ReceiptsListDialog } from "@/components/pos/receipts-list-dialog";
import { SoldItemsDialog } from "@/components/pos/sold-items-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface CartItem {
  product: Product;
  quantity: number;
  discount?: number;           // Hisoblangan so'm miqdori (musbat = skidka, manfiy = ustama)
  adjustmentType?: "skidka" | "ustama";
  adjustmentInputType?: "summa" | "percent";
  adjustmentValue?: number;    // Kiritilgan qiymat (% yoki so'm)
}

const popSound = typeof window !== 'undefined' ? new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3") : null;
const beepSound = typeof window !== 'undefined' ? new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/assets/sounddogs/soundtrack.mp3") : null;

export default function Dashboard() {
  const { products, updateStock, isOffline, refreshProducts } = useProducts();
  const { addTransaction, getStats, pendingCount, syncTransactions } = useTransactions();
  const { settings } = useSettings();
  const { token } = useAuth();
  const stats = getStats();

  const { data: tenantSettings } = useQuery<any>({
    queryKey: ["tenant-settings"],
    queryFn: async () => {
      const res = await fetch("/api/tenant-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const { data: couriersList = [] } = useQuery<Array<{ id: string; name: string; phone: string }>>({
    queryKey: ["couriers"],
    queryFn: async () => {
      const res = await fetch("/api/couriers", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && !!tenantSettings?.deliveryEnabled,
  });
  
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const { getAuthHeaders } = await import("@/lib/auth-context");
      const res = await fetch("/api/categories", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Debounced version of searchQuery — only updates 200ms after the user
  // stops typing. Without this, every keystroke re-filters all 700+
  // products AND re-renders the entire grid on the main thread.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // PERF: pagination cap. Rendering all 700+ ProductCards at once was the
  // main reason "tovar qidirganda qotmoqda" — even though each card is
  // memoized, the initial mount still costs 700 image elements + layout
  // work. Show 60 by default and add "Yana ko'rsatish" to load more.
  const [visibleCount, setVisibleCount] = useState(60);
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  // Stock-status filter. Default "available" so the cashier only sees sellable
  // items; out-of-stock products are hidden until explicitly viewed.
  const [stockFilter, setStockFilter] = useState<"available" | "low" | "out" | "all">("available");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  // Pre-opened popup window for auto-print. Opened synchronously inside the
  // user click handler so popup blockers allow it; ReceiptDialog later writes
  // the receipt HTML into this window.
  const preOpenedPrintWindowRef = useRef<Window | null>(null);
  // Side preview popup (visible alongside the print dialog) so the cashier
  // can read the receipt while the OS print dialog is on screen.
  const preOpenedPreviewWindowRef = useRef<Window | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isReceiptsListOpen, setIsReceiptsListOpen] = useState(false);
  const [isSoldItemsOpen, setIsSoldItemsOpen] = useState(false);
  const { toast } = useToast();
  const barcodeBufferRef = useRef("");
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyTimeRef = useRef(0);
  const productsRef = useRef(products);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Preload receipt images (logo + Telegram QR) so when "Sotildi" fires the
  // print popup, both images are already cached and the popup can print
  // immediately instead of waiting for them to download.
  useEffect(() => {
    const logo = tenantSettings?.receiptLogo || tenantSettings?.logo;
    if (logo) {
      const img = new Image();
      img.src = logo;
    }
    if (settings.telegramUsername) {
      const qr = new Image();
      qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/${encodeURIComponent(settings.telegramUsername)}&color=000000`;
    }
  }, [tenantSettings?.receiptLogo, tenantSettings?.logo, settings.telegramUsername]);

  useEffect(() => {
    const processBarcodeFromBuffer = (code: string) => {
      const normalize = (s: string) => s.replace(/[^0-9]/g, "");
      const cleanCode = normalize(code);
      if (!cleanCode || cleanCode.length < 8) return;

      const currentProducts = productsRef.current;
      const product = currentProducts.find(p => {
        const pBarcode = normalize(p.barcode);
        return (
          pBarcode === cleanCode ||
          pBarcode === "0" + cleanCode ||
          "0" + pBarcode === cleanCode
        );
      });

      if (product) {
        if (product.stock <= 0) {
          if (beepSound) { beepSound.currentTime = 0; beepSound.play().catch(() => {}); }
          return;
        }
        setCart(prev => {
          const existing = prev.find(item => item.product.id === product.id);
          if (existing) {
            if (existing.quantity >= product.stock) return prev;
            return prev.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          }
          return [...prev, { product, quantity: 1 }];
        });
        setIsMobileCartOpen(true);
        if (beepSound) {
          beepSound.currentTime = 0;
          beepSound.volume = 0.5;
          beepSound.play().catch(() => {});
        }
        if (popSound) {
          popSound.currentTime = 0;
          popSound.volume = 0.5;
          popSound.play().catch(() => {});
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 8) {
          e.preventDefault();
          e.stopPropagation();
          const code = barcodeBufferRef.current;
          barcodeBufferRef.current = "";
          if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
          setSearchQuery("");
          if (searchInputRef.current) {
            searchInputRef.current.value = "";
            searchInputRef.current.blur();
          }
          processBarcodeFromBuffer(code);
        }
        barcodeBufferRef.current = "";
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        if (barcodeBufferRef.current.length === 0 || timeDiff < 150) {
          barcodeBufferRef.current += e.key;
        } else {
          barcodeBufferRef.current = e.key;
        }

        if (barcodeBufferRef.current.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
        }

        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => {
          if (barcodeBufferRef.current.length >= 8) {
            const code = barcodeBufferRef.current;
            barcodeBufferRef.current = "";
            setSearchQuery("");
            if (searchInputRef.current) {
              searchInputRef.current.value = "";
              searchInputRef.current.blur();
            }
            processBarcodeFromBuffer(code);
          } else {
            barcodeBufferRef.current = "";
          }
        }, 300);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // useCallback so memoized ProductCard doesn't re-render whenever
  // unrelated state in dashboard changes (cart, search query, etc.).
  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: "Tovar tugagan",
        description: `${product.name} omborda qolmagan`,
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({
            title: "Omborda yetarli emas",
            description: `${product.name} — faqat ${product.stock} ${(product as any).unit || "dona"} mavjud`,
            variant: "destructive",
            duration: 2000,
          });
          return prev;
        }
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
  }, [toast]);

  const handleScannedProductAdd = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: "Tovar tugagan",
        description: `${product.name} omborda qolmagan`,
        variant: "destructive",
        duration: 2000,
      });
      setScannedProduct(null);
      return;
    }
    addToCart(product);
    setScannedProduct(null);
    setIsMobileCartOpen(true);
    toast({
      title: "Savatchaga qo'shildi",
      description: `${product.name} - ${product.price.toLocaleString()} so'm`,
      duration: 1500,
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = item.quantity + delta;
        if (delta > 0 && newQty > item.product.stock) return item;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const updateDiscount = (id: string, discount: number, adjustmentType?: "skidka" | "ustama", adjustmentInputType?: "summa" | "percent", adjustmentValue?: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        // discount > 0 = skidka (ayiriladi), discount < 0 = ustama (qo'shiladi)
        const signedDiscount = adjustmentType === "ustama" ? -Math.abs(discount) : Math.abs(discount);
        return { ...item, discount: signedDiscount, adjustmentType, adjustmentInputType, adjustmentValue };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const clearCart = () => setCart([]);

  const handleCheckout = async (method: string = "cash", customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }, nasiyaData?: { dueDate: string }, deliveryData?: { courierId: string; courierName: string; address: string; customerName: string; customerPhone: string }, paymentSplits?: Array<{ method: string; amount: number }>) => {
    const total = cart.reduce((acc, item) => {
      const effectivePrice = item.product.price > 0 ? item.product.price : ((item.product as any).barcodePrice || (item.product as any).wholesalePrice || 0);
      const itemTotal = effectivePrice * item.quantity;
      const discount = item.discount || 0;
      return acc + (itemTotal - discount);
    }, 0);

    // SYNCHRONOUSLY open the print popup before any await. This keeps it inside
    // the browser's user-activation window so popup blockers allow it.
    // ReceiptDialog will later write the receipt HTML into this same window.
    if (settings.autoPrint && !preOpenedPrintWindowRef.current) {
      try {
        // Layout: open BOTH popups during the user gesture (popup blockers allow
        // multiple opens within one click).
        //   • previewWin (LEFT)  — shows the receipt as a viewable page so the
        //     cashier can double-check what was sold.
        //   • printWin   (RIGHT) — auto-triggers window.print(); the OS print
        //     dialog appears over THIS window, leaving the preview visible.
        const sw = (typeof window !== 'undefined' && window.screen && window.screen.availWidth) ? window.screen.availWidth : 1200;
        const sh = (typeof window !== 'undefined' && window.screen && window.screen.availHeight) ? window.screen.availHeight : 800;
        const previewW = 380;
        const previewH = Math.min(720, sh - 80);
        const printW = Math.min(620, Math.max(520, sw - previewW - 40));
        const printH = Math.min(720, sh - 80);
        const totalW = previewW + printW + 8;
        const startLeft = Math.max(20, Math.floor((sw - totalW) / 2));
        const top = Math.max(20, Math.floor((sh - previewH) / 2));

        const previewWin = window.open("", "_blank", `width=${previewW},height=${previewH},left=${startLeft},top=${top}`);
        if (previewWin) {
          previewWin.document.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chek</title></head><body style="font-family:Arial,sans-serif;padding:24px;text-align:center;color:#666;font-size:13px;">Chek tayyorlanmoqda…</body></html>'
          );
          preOpenedPreviewWindowRef.current = previewWin;
        }
        const printWin = window.open("", "_blank", `width=${printW},height=${printH},left=${startLeft + previewW + 8},top=${top}`);
        if (printWin) {
          printWin.document.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chop etish</title></head><body style="font-family:Arial,sans-serif;padding:30px;text-align:center;color:#666;font-size:14px;">Chop etish dialogi tayyorlanmoqda…</body></html>'
          );
          preOpenedPrintWindowRef.current = printWin;
        }
      } catch (e) {
        // popup blocked — fall back to in-effect window.open inside ReceiptDialog
      }
    }

    try {
      const transaction = await addTransaction(cart, total, method, customerData, nasiyaData, paymentSplits);

      if (deliveryData && token) {
        try {
          const orderRes = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              customerName: deliveryData.customerName,
              customerPhone: deliveryData.customerPhone,
              address: deliveryData.address,
              items: cart.map(item => ({ productId: item.product.id, name: item.product.name, price: item.product.price > 0 ? item.product.price : ((item.product as any).barcodePrice || (item.product as any).wholesalePrice || 0), quantity: item.quantity })),
              totalAmount: total,
              status: "confirmed",
              paymentMethod: method,
              paymentStatus: "paid",
              deliveryType: "delivery",
              courier: deliveryData.courierName,
              courierId: deliveryData.courierId,
            }),
          });
          if (orderRes.ok) {
            const order = await orderRes.json();
            await fetch("/api/deliveries", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                orderId: order.id,
                customerId: "",
                address: deliveryData.address,
                courier: deliveryData.courierName,
                courierId: deliveryData.courierId,
                status: "pending",
              }),
            });
          }
        } catch (e) {
          console.error("Delivery creation failed:", e);
        }
      }
      
      // Stock decrement happens atomically server-side inside POST
      // /api/transactions (one round trip for any cart size). Locally,
      // transaction-context.addTransaction has already updated IndexedDB
      // for instant UI. The sequential cart.forEach(updateStock) loop that
      // used to live here triggered N extra PATCH /api/products/:id
      // requests AND N extra invalidateQueries(["products"]) — each of
      // which refetched the full 769-product list. For a 5-item cart that
      // was 5 sequential refetches of ~1 MB of product JSON. THE single
      // biggest contributor to "to'lov qilishda qattiq qotmoqda".

      setLastTransaction(transaction);
      setIsMobileCartOpen(false);

      // AUTO-PRINT FAST PATH: skip the on-screen receipt dialog entirely.
      // Write the receipt HTML straight into the popup we pre-opened during
      // the click. The popup's own inline script calls window.print() and then
      // closes itself — so the user just clicks "Sotildi" and the printer
      // dialog appears immediately with no extra clicks.
      let autoPrintSucceeded = false;
      if (settings.autoPrint && (preOpenedPrintWindowRef.current || preOpenedPreviewWindowRef.current)) {
        let printWin = preOpenedPrintWindowRef.current;
        let previewWin = preOpenedPreviewWindowRef.current;
        preOpenedPrintWindowRef.current = null;
        preOpenedPreviewWindowRef.current = null;

        // Popup blocker fallback: if only ONE of the two pre-opened popups
        // survived, use it for auto-printing (printing is more important than
        // the side preview).
        if (!printWin && previewWin) {
          printWin = previewWin;
          previewWin = null;
        }

        if (printWin && !printWin.closed) {
          try {
            const printHtml = buildReceiptHtml({ transaction, settings, tenantSettings });
            printWin.document.open();
            printWin.document.write(printHtml);
            printWin.document.close();
            autoPrintSucceeded = true;
          } catch (err) {
            console.error("Auto-print write failed:", err);
            try { printWin.close(); } catch {}
          }
        } else if (printWin) {
          console.warn("Auto-print popup was closed before we could write to it");
        }

        // Always write the side-preview HTML (with manual buttons) into the
        // preview popup IF it survived AND is different from the print window —
        // otherwise the placeholder "Chek tayyorlanmoqda…" stays stuck on screen.
        if (previewWin && !previewWin.closed && previewWin !== printWin) {
          try {
            const previewHtml = buildReceiptHtml({ transaction, settings, tenantSettings, noAutoPrint: true });
            previewWin.document.open();
            previewWin.document.write(previewHtml);
            previewWin.document.close();
          } catch (err) {
            console.error("Preview write failed:", err);
            try { previewWin.close(); } catch {}
          }
        }
      }

      // Fall back to the on-screen dialog when:
      //  - autoPrint is off (manual mode), OR
      //  - autoPrint was on but the pre-opened popup was blocked / closed / errored.
      // This guarantees the user always has a way to see/print the receipt.
      if (!autoPrintSucceeded) {
        setIsReceiptOpen(true);
      }

      toast({
        title: deliveryData ? "Buyurtma yaratildi va kuriyerga biriktirildi!" : "To'lov qabul qilindi!",
        description: `Jami summa: ${total.toLocaleString()} so'm`,
        className: "bg-green-500 text-white border-none",
      });
      setCart([]);
    } catch (error) {
      console.error("Checkout error:", error);
      // Close orphan pre-opened print window so user is not left with a blank tab
      if (preOpenedPrintWindowRef.current) {
        try { preOpenedPrintWindowRef.current.close(); } catch {}
        preOpenedPrintWindowRef.current = null;
      }
      if (preOpenedPreviewWindowRef.current) {
        try { preOpenedPreviewWindowRef.current.close(); } catch {}
        preOpenedPreviewWindowRef.current = null;
      }
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
      addToCart(product);
      setIsMobileCartOpen(true);
      if (beepSound) {
        beepSound.currentTime = 0;
        beepSound.volume = 0.5;
        beepSound.play().catch(() => {});
      }
      toast({
        title: "Savatchaga qo'shildi",
        description: `${product.name} - ${product.price.toLocaleString()} so'm`,
        duration: 1500,
      });
    } else {
      toast({
        title: "Xatolik",
        description: `Tovar topilmadi: ${code}`,
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

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 8) return;
    
    const normalize = (s: string) => s.replace(/[^0-9]/g, "");
    const cleanCode = normalize(searchQuery);
    
    if (!cleanCode || cleanCode.length < 8) return;
    
    const product = products.find(p => {
      const pBarcode = normalize(p.barcode);
      return (
        pBarcode === cleanCode || 
        pBarcode === "0" + cleanCode || 
        "0" + pBarcode === cleanCode
      );
    });
    
    if (product) {
      addToCart(product);
      setSearchQuery("");
      setIsMobileCartOpen(true);
      if (beepSound) {
        beepSound.currentTime = 0;
        beepSound.volume = 0.5;
        beepSound.play().catch(() => {});
      }
      toast({
        title: "Savatchaga qo'shildi",
        description: `${product.name} - ${product.price.toLocaleString()} so'm`,
        duration: 1500,
      });
    }
  }, [searchQuery, products]);

  // Debounce the search input — wait 200ms after typing stops before
  // re-filtering. Cuts work by ~10× when user is actively typing.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset visible window whenever filter inputs change (so a new search
  // doesn't carry over an old "load more" expansion).
  useEffect(() => {
    setVisibleCount(60);
  }, [debouncedSearch, selectedCategory, stockFilter]);

  // Memoized — only re-filters when products list, debounced query, or
  // category change. Lowercase the query ONCE outside the loop.
  const filteredProducts = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase().trim();
    const isAllCategory = selectedCategory === "Barchasi";
    const terms = searchLower.split(/\s+/).filter(Boolean);

    // Stock-status filter. LOW_STOCK matches the card's "kam qolgan" badge.
    const LOW_STOCK = 5;
    const matchesStock = (p: Product) => {
      const s = p.stock ?? 0;
      if (stockFilter === "out") return s <= 0;
      if (stockFilter === "low") return s > 0 && s <= LOW_STOCK;
      if (stockFilter === "available") return s > 0;
      return true; // "all"
    };

    const result = products.filter(product => {
      if (!matchesStock(product)) return false;
      if (!isAllCategory && product.category !== selectedCategory) return false;
      if (!searchLower) return true;
      const haystack = [
        product.name,
        product.author,
        product.barcode,
        product.category,
        (product as any).description,
        (product as any).supplier,
      ].filter(Boolean).join(" ").toLowerCase();
      return terms.every(t => haystack.includes(t));
    });

    // In the "Barchasi" stock view, sink out-of-stock products to the bottom
    // (stable sort keeps the rest in their original order). Skipped for the
    // other modes where every item is in the same bucket.
    if (stockFilter === "all") {
      result.sort((a, b) => {
        const ao = (a.stock ?? 0) <= 0 ? 1 : 0;
        const bo = (b.stock ?? 0) <= 0 ? 1 : 0;
        return ao - bo;
      });
    }
    return result;
  }, [products, debouncedSearch, selectedCategory, stockFilter]);

  // Show only the first `visibleCount` products to keep the grid render
  // fast on tenants with hundreds of products. The "Load more" button
  // below the grid expands this window incrementally.
  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

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
                ref={searchInputRef}
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
                  onUpdateDiscount={updateDiscount}
                  onRemove={removeFromCart}
                  onClear={clearCart}
                  onCheckout={handleCheckout}
                  paymentMethods={tenantSettings?.paymentMethods}
                  customerFields={tenantSettings?.customerFields}
                  deliveryEnabled={tenantSettings?.deliveryEnabled}
                  splitPaymentsEnabled={tenantSettings?.splitPaymentsEnabled}
                  couriers={couriersList}
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
        <div className="flex-1 flex min-h-0 bg-gray-50/50 overflow-hidden">
          <div className="flex-1 flex flex-col p-4 md:p-6 min-w-0 overflow-y-auto md:pr-[460px] lg:pr-[500px]">
            {/* KPI Stats Row */}
            <div className="grid grid-cols-5 gap-2 md:gap-3 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-2.5 md:p-4 shadow-sm text-white text-center">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 opacity-80" />
                <p className="text-[9px] md:text-xs opacity-80 font-medium">Bugun</p>
                <p className="text-xs md:text-lg font-bold">{stats.todayTotal.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl p-2.5 md:p-4 shadow-sm text-white text-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 opacity-80" />
                <p className="text-[9px] md:text-xs opacity-80 font-medium">Daromad</p>
                <p className="text-xs md:text-lg font-bold">{stats.todayProfit.toLocaleString()}</p>
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
                <p className="text-xs md:text-lg font-bold">{stats.monthTotal.toLocaleString()}</p>
              </div>
            </div>

            {/* Pinned Category Quick Filters */}
            {categories.filter(c => c.isPinned).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("Barchasi")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === "Barchasi"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                  data-testid="filter-all"
                >
                  Barchasi
                </button>
                {categories.filter(c => c.isPinned).map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                      selectedCategory === category.name
                        ? "text-white shadow-md"
                        : "bg-white border border-slate-200 hover:bg-slate-50"
                    }`}
                    style={selectedCategory === category.name
                      ? { backgroundColor: category.color }
                      : { color: category.color, borderColor: category.color + "40" }
                    }
                    data-testid={`filter-pinned-${category.id}`}
                  >
                    <Pin className="w-3 h-3" />
                    {category.name}
                  </button>
                ))}
              </div>
            )}

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
                  {categories.filter(c => c.isPinned).map(category => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => setSelectedCategory(category.name)}
                      className="cursor-pointer"
                      style={{color: '#1e293b', backgroundColor: '#fffbeb'}}
                    >
                      <Pin className="h-3 w-3 mr-1 text-amber-500" />
                      <span className="flex-1 font-medium">{category.name}</span>
                      {selectedCategory === category.name && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                  {categories.filter(c => !c.isPinned).map(category => (
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
              <span style={{color: '#64748b', fontSize: '14px'}}>{filteredProducts.length} ta tovar</span>

              {/* Stock-status filter (Mavjud / Kam qolgan / Tugagan / Barchasi) */}
              <div className="flex bg-gray-100 rounded-lg p-0.5 ml-auto">
                {([
                  { key: "available", label: "Mavjud" },
                  { key: "low", label: "Kam qolgan" },
                  { key: "out", label: "Tugagan" },
                  { key: "all", label: "Barchasi" },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setStockFilter(opt.key)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                      stockFilter === opt.key ? "bg-white shadow text-primary" : "text-gray-500 hover:text-gray-700"
                    }`}
                    data-testid={`button-stock-${opt.key}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-scroll pb-20 md:pb-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
                {visibleProducts.map(product => (
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
                  <PackageIcon className="h-12 w-12 mb-4 opacity-20" />
                  <p>Tovarlar topilmadi</p>
                </div>
              )}
              {visibleProducts.length < filteredProducts.length && (
                <div className="flex justify-center mt-6 mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(c => c + 60)}
                    data-testid="button-load-more-products"
                  >
                    Yana ko'rsatish ({filteredProducts.length - visibleProducts.length} ta qoldi)
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Cart Sidebar - Fixed */}
          <div className="hidden md:block fixed right-0 top-0 h-screen z-40">
            <CartSidebar 
              items={cart} 
              onUpdateQuantity={updateQuantity}
              onUpdateDiscount={updateDiscount}
              onRemove={removeFromCart}
              onClear={clearCart}
              onCheckout={handleCheckout}
              paymentMethods={tenantSettings?.paymentMethods}
              customerFields={tenantSettings?.customerFields}
              deliveryEnabled={tenantSettings?.deliveryEnabled}
              splitPaymentsEnabled={tenantSettings?.splitPaymentsEnabled}
              couriers={couriersList}
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
        onClose={() => {
          setIsReceiptOpen(false);
          // If, for any reason, a pre-opened window was never consumed, close it now.
          if (preOpenedPrintWindowRef.current) {
            try {
              if (!preOpenedPrintWindowRef.current.closed) preOpenedPrintWindowRef.current.close();
            } catch {}
            preOpenedPrintWindowRef.current = null;
          }
          if (preOpenedPreviewWindowRef.current) {
            try {
              if (!preOpenedPreviewWindowRef.current.closed) preOpenedPreviewWindowRef.current.close();
            } catch {}
            preOpenedPreviewWindowRef.current = null;
          }
        }}
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
