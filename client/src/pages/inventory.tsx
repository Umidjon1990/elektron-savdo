import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useProducts } from "@/lib/product-context";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter, MoreHorizontal, ScanBarcode, ArrowRight, Check, X, RotateCcw, PackagePlus, ScanText, Upload, Image as ImageIcon, Loader2, Youtube, Trash2, ChevronUp, ChevronDown, GripVertical, Printer, Truck } from "lucide-react";
import BarcodePrintDialog from "@/components/barcode-print";
import { ScannerOverlay } from "@/components/pos/scanner-overlay";
import { KNOWN_BOOKS_DB } from "@/data/mock-external-books";
import { useUpload } from "@/hooks/use-upload";
import type { Category } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/data/mock-products";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const { products, addProduct, updateStock, updateProduct, deleteProduct } = useProducts();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: suppliersList = [] } = useQuery<any[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

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

  const productFields = tenantSettings?.productFields || [
    { key: "name", label: "Tovar nomi", required: true },
    { key: "description", label: "Tavsif", required: false },
  ];

  const formVisibility: Record<string, boolean> = {
    costPrice: true, price: true, barcodePrice: true, wholesalePrice: true,
    description: true, videoUrl: true, isNew: true, category: true, author: true, supplier: true,
    ...(tenantSettings?.productFormVisibility || {}),
  };
  const isFieldVisible = (key: string) => formVisibility[key] !== false;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"barcode" | "text">("barcode");
  const [scanningField, setScanningField] = useState<"barcode" | "name" | "author">("barcode");

  const [step, setStep] = useState<1 | 2>(1); // 1: Scan/Enter ISBN, 2: Details
  const { toast } = useToast();

  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>("10");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printProducts, setPrintProducts] = useState<Array<{ id: string; name: string; barcode: string; price: number; barcodePrice?: number }>>([]);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    author: "",
    price: "",
    costPrice: "",
    barcodePrice: "",
    wholesalePrice: "",
    stock: "",
    category: "",
    barcode: "",
    image: "",
    videoUrl: "",
    supplier: "",
    supplierPaymentMethod: "naqd",
    supplierCurrency: "uzs",
    supplierCurrencyRate: "",
    supplierOriginalPrice: "",
    isNew: false
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cloud storage upload hook
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setNewProduct(prev => ({ ...prev, image: response.objectPath }));
      toast({
        title: "Rasm saqlandi ✓",
        duration: 2000,
        className: "bg-green-500 text-white border-none",
      });
    },
    onError: (error) => {
      toast({
        title: "Rasm yuklanmadi",
        duration: 3000,
        variant: "destructive",
      });
    }
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      setStep(1);
      setEditingId(null);
      setNewProduct({ name: "", author: "", price: "", costPrice: "", barcodePrice: "", wholesalePrice: "", stock: "", category: "", barcode: "", image: "", videoUrl: "", supplier: "", supplierPaymentMethod: "naqd", supplierCurrency: "uzs", supplierCurrencyRate: "", supplierOriginalPrice: "", isNew: false });
      setCustomFieldValues({});
    }
  }, [isAddDialogOpen]);
  
  const handleEditProduct = (product: Product) => {
    setEditingId(product.id);
    setNewProduct({
      name: product.name,
      author: product.author,
      price: product.price.toString(),
      costPrice: (product.costPrice || 0).toString(),
      barcodePrice: ((product as any).barcodePrice || "").toString(),
      wholesalePrice: ((product as any).wholesalePrice || "").toString(),
      stock: product.stock.toString(),
      category: product.category,
      barcode: product.barcode,
      image: product.image,
      videoUrl: product.videoUrl || "",
      supplier: (product as any).supplier || "",
      supplierPaymentMethod: (product as any).supplierPaymentMethod || "naqd",
      supplierCurrency: (product as any).supplierCurrency || "uzs",
      supplierCurrencyRate: ((product as any).supplierCurrencyRate || "").toString(),
      supplierOriginalPrice: ((product as any).supplierOriginalPrice || "").toString(),
      isNew: product.isNew || false
    });
    setCustomFieldValues({
      description: (product as any).description || "",
      ...((product as any).metadata || {}),
    });
    setStep(2);
    setIsAddDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`"${productName}" mahsulotini o'chirishga ishonchingiz komilmi?`)) {
      return;
    }
    try {
      await deleteProduct(productId);
      toast({
        title: "Mahsulot o'chirildi ✓",
        description: `"${productName}" muvaffaqiyatli o'chirildi`,
        duration: 3000,
        className: "bg-green-500 text-white border-none",
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Mahsulotni o'chirishda xatolik yuz berdi",
        duration: 3000,
        variant: "destructive",
      });
    }
  };

  const openScanner = (mode: "barcode" | "text", field: "barcode" | "name" | "author") => {
    setScannerMode(mode);
    setScanningField(field);
    setIsScannerOpen(true);
  };

  const handleScanResult = (result: string) => {
    setIsScannerOpen(false);
    
    if (scannerMode === "barcode") {
        checkIsbnAndProceed(result);
    } else {
        // Text Scan Result
        if (scanningField === "name") {
            setNewProduct(prev => ({ ...prev, name: result }));
        } else if (scanningField === "author") {
            setNewProduct(prev => ({ ...prev, author: result }));
        }
        toast({
            title: "Matn aniqlandi",
            description: `"${result}" maydonga yozildi`,
        });
    }
  };

  const checkIsbnAndProceed = (code: string) => {
    // Check if product already exists in our inventory
    const existing = products.find(p => p.barcode === code);
    
    if (existing) {
      toast({
        title: "Tovar mavjud!",
        description: `"${existing.name}" allaqachon bazada bor.`,
      });
      // Automatically open restock dialog for existing item
      setRestockProduct(existing);
      return;
    }

    // Check external DB
    const knownBook = KNOWN_BOOKS_DB[code];
    
    if (knownBook) {
      setNewProduct(prev => ({
        ...prev,
        barcode: code,
        name: knownBook.name,
        author: knownBook.author,
        category: knownBook.category,
        image: knownBook.image
      }));
      toast({
        title: "Tovar topildi!",
        description: "Ma'lumotlar avtomatik to'ldirildi",
      });
    } else {
      setNewProduct(prev => ({ ...prev, barcode: code }));
      toast({
        title: "Yangi tovar",
        description: "Iltimos, tovar ma'lumotlarini kiriting",
      });
    }
    
    setStep(2);
  };

  const handleManualIsbnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = newProduct.barcode.trim();
    if (cleanBarcode.length < 3) {
      toast({ title: "Shtrix kod juda qisqa", variant: "destructive" });
      return;
    }
    checkIsbnAndProceed(cleanBarcode);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for cloud storage
        toast({
           title: "Rasm hajmi juda katta",
           description: "Iltimos 10MB dan kichik rasm yuklang",
           variant: "destructive"
        });
        return;
      }

      // Upload to cloud storage
      await uploadFile(file);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const extraMetadata: Record<string, string> = {};
      for (const [key, val] of Object.entries(customFieldValues)) {
        if (key !== "name" && key !== "author" && key !== "description" && val) {
          extraMetadata[key] = val;
        }
      }

      const isUsd = newProduct.supplierCurrency === "usd";
      const supplierOriginalPrice = isUsd ? Number(newProduct.supplierOriginalPrice) || 0 : 0;
      const supplierCurrencyRate = isUsd ? Number(newProduct.supplierCurrencyRate) || 0 : 0;
      const currencyFields = {
        supplierCurrency: newProduct.supplierCurrency || "uzs",
        supplierCurrencyRate,
        supplierOriginalPrice,
      };
      if (isUsd && supplierOriginalPrice > 0 && supplierCurrencyRate > 0) {
        newProduct.costPrice = (supplierOriginalPrice * supplierCurrencyRate).toString();
      }

      if (editingId) {
        await updateProduct(editingId, {
          name: newProduct.name,
          author: newProduct.author,
          price: Number(newProduct.price),
          costPrice: Number(newProduct.costPrice) || 0,
          barcodePrice: newProduct.barcodePrice ? Number(newProduct.barcodePrice) : undefined,
          wholesalePrice: newProduct.wholesalePrice ? Number(newProduct.wholesalePrice) : undefined,
          stock: Number(newProduct.stock),
          category: newProduct.category || categories[0]?.name || "Boshqa",
          barcode: newProduct.barcode.trim(),
          supplier: newProduct.supplier || "",
          supplierPaymentMethod: newProduct.supplierPaymentMethod || "naqd",
          ...currencyFields,
          description: customFieldValues.description || "",
          image: newProduct.image,
          videoUrl: newProduct.videoUrl || undefined,
          metadata: Object.keys(extraMetadata).length > 0 ? extraMetadata : undefined,
          isNew: newProduct.isNew
        });
        toast({
          title: "O'zgartirildi",
          description: `${newProduct.name} ma'lumotlari yangilandi`,
          className: "bg-green-500 text-white border-none",
        });
      } else {
        await addProduct({
          name: newProduct.name,
          author: newProduct.author,
          price: Number(newProduct.price),
          costPrice: Number(newProduct.costPrice) || 0,
          barcodePrice: newProduct.barcodePrice ? Number(newProduct.barcodePrice) : undefined,
          wholesalePrice: newProduct.wholesalePrice ? Number(newProduct.wholesalePrice) : undefined,
          stock: Number(newProduct.stock),
          category: newProduct.category || categories[0]?.name || "Boshqa",
          barcode: newProduct.barcode.trim(),
          supplier: newProduct.supplier || "",
          supplierPaymentMethod: newProduct.supplierPaymentMethod || "naqd",
          ...currencyFields,
          description: customFieldValues.description || "",
          image: newProduct.image || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300&h=400",
          videoUrl: newProduct.videoUrl || undefined,
          metadata: Object.keys(extraMetadata).length > 0 ? extraMetadata : undefined,
          isNew: newProduct.isNew
        });
        toast({
          title: "Muvaffaqiyatli qo'shildi",
          description: `${newProduct.name} bazaga kiritildi`,
          className: "bg-green-500 text-white border-none",
        });
      }
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Xatolik yuz berdi",
        description: error?.message || "Ma'lumotni saqlashda xatolik. Qaytadan urinib ko'ring.",
        variant: "destructive",
      });
    }
  };

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (restockProduct && restockAmount) {
      const amount = parseInt(restockAmount);
      if (amount > 0) {
        updateStock(restockProduct.id, amount);
        toast({
          title: "Kirim qilindi",
          description: `${restockProduct.name} +${amount} dona qo'shildi`,
          className: "bg-green-500 text-white border-none",
        });
        setRestockProduct(null);
        setRestockAmount("10");
        // Also close main dialog if it was open (e.g. came from scan)
        setIsAddDialogOpen(false);
      }
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode.includes(searchQuery)
  );

  const moveProduct = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= products.length) return;
    
    const newProducts = [...products];
    const temp = newProducts[index];
    newProducts[index] = newProducts[newIndex];
    newProducts[newIndex] = temp;
    
    const orderedIds = newProducts.map(p => p.id);
    
    try {
      const res = await fetch("/api/products/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds })
      });
      
      if (res.ok) {
        toast({
          title: "Tartib saqlandi ✓",
          duration: 1500,
          className: "bg-green-500 text-white border-none",
        });
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans" style={{backgroundColor: '#f1f5f9'}}>
      <SidebarNav />
      
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50 pb-16 md:pb-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 shrink-0">
          <h1 className="text-lg md:text-xl font-semibold">Ombor</h1>
          <div className="flex items-center gap-4">
             <div className="text-xs md:text-sm text-muted-foreground">
                Jami: <span className="font-medium text-foreground">{products.length} ta</span>
             </div>
          </div>
        </header>

        <div className="p-4 md:p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mb-6 gap-3">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Qidiruv..." 
                className="pl-9 bg-white w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2 flex-1 md:flex-none justify-center"
                onClick={() => {
                  setPrintProducts(filteredProducts.map(p => ({ id: p.id, name: p.name, barcode: p.barcode, price: p.price, barcodePrice: (p as any).barcodePrice })));
                  setIsPrintDialogOpen(true);
                }}
                data-testid="button-print-all-barcodes"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Barcode</span>
              </Button>

              <Button variant="outline" className="gap-2 flex-1 md:flex-none justify-center">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} modal={true}>
                <DialogTrigger asChild>
                  <Button className="gap-2 flex-1 md:flex-none justify-center">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Yangi tovar</span>
                    <span className="sm:hidden">Qo'shish</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle>
                      {step === 1 ? "1-qadam: Shtrix kodni aniqlash" : "2-qadam: Ma'lumotlarni to'ldirish"}
                    </DialogTitle>
                  </DialogHeader>

                  {step === 1 ? (
                    <div className="py-6 flex flex-col items-center gap-6">
                      <div className="w-full flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => openScanner("barcode", "barcode")}>
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <ScanBarcode className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium">Skanerni ishga tushirish</h3>
                          <p className="text-sm text-muted-foreground">Kamerani ochish uchun bosing</p>
                        </div>
                      </div>

                      <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Yoki qo'lda kiriting</span>
                        </div>
                      </div>

                      <form onSubmit={handleManualIsbnSubmit} className="w-full flex gap-2">
                        <Input 
                          placeholder="ISBN / Shtrix kod..." 
                          className="font-mono text-lg"
                          value={newProduct.barcode}
                          onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                          autoFocus
                        />
                        <Button type="submit" disabled={!newProduct.barcode}>
                          Davom etish
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </form>

                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full text-muted-foreground"
                        onClick={() => {
                          const autoCode = `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                          setNewProduct(prev => ({ ...prev, barcode: autoCode }));
                          setStep(2);
                        }}
                        data-testid="button-skip-barcode"
                      >
                        Kodsiz davom etish (avto-kod yaratiladi)
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleAddProduct}>
                      <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-2">
                            <ScanBarcode className="h-4 w-4 text-blue-600" />
                            <span className="font-mono font-medium text-blue-900">{newProduct.barcode}</span>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            O'zgartirish
                          </Button>
                        </div>

                        {/* Image Upload Section */}
                        <div className="flex justify-center mb-2">
                           <div className="relative group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
                             <div className="w-24 h-36 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:bg-gray-50 transition-colors">
                                {isUploading ? (
                                  <div className="flex flex-col items-center text-blue-500">
                                    <Loader2 className="h-8 w-8 mb-1 animate-spin" />
                                    <span className="text-[10px]">Yuklanmoqda...</span>
                                  </div>
                                ) : newProduct.image ? (
                                  <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center text-gray-400">
                                    <ImageIcon className="h-8 w-8 mb-1" />
                                    <span className="text-[10px]">Rasm yuklash</span>
                                  </div>
                                )}
                                
                                {!isUploading && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Upload className="h-6 w-6 text-white" />
                                  </div>
                                )}
                             </div>
                             <input 
                               type="file" 
                               ref={fileInputRef}
                               className="hidden" 
                               accept="image/*"
                               onChange={handleImageUpload}
                               disabled={isUploading}
                             />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {productFields.map((field: any, idx: number) => {
                            const isBuiltIn = field.key === "name" || field.key === "author";
                            if (field.key === "author" && !isFieldVisible("author")) return null;
                            if (field.key === "description" && !isFieldVisible("description")) return null;
                            const fieldValue = field.key === "name" ? newProduct.name : field.key === "author" ? newProduct.author : (customFieldValues[field.key] || "");
                            return (
                              <div key={field.key} className={`space-y-2 ${idx === 0 ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                                <Label htmlFor={field.key}>{field.label}</Label>
                                <div className="flex gap-2">
                                  <Input 
                                    id={field.key} 
                                    required={field.required !== false}
                                    value={fieldValue}
                                    onChange={(e) => {
                                      if (field.key === "name") setNewProduct(prev => ({...prev, name: e.target.value}));
                                      else if (field.key === "author") setNewProduct(prev => ({...prev, author: e.target.value}));
                                      else setCustomFieldValues(prev => ({...prev, [field.key]: e.target.value}));
                                    }}
                                    placeholder={field.label}
                                    className={idx === 0 ? "font-medium" : ""}
                                  />
                                  {isBuiltIn && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="icon"
                                      title="Kamera orqali o'qish"
                                      onClick={() => openScanner("text", field.key as "name" | "author")}
                                    >
                                      <ScanText className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {isFieldVisible("category") && <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label htmlFor="category">Kategoriya</Label>
                            <div className="flex gap-1">
                              <Select 
                                value={newProduct.category} 
                                onValueChange={(val) => setNewProduct({...newProduct, category: val})}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map(c => (
                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button type="button" variant="outline" size="icon" className="shrink-0" title="Yangi kategoriya qo'shish" data-testid="button-add-inline-category">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
                                  <DialogHeader>
                                    <DialogTitle>Yangi kategoriya</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3">
                                    <Input
                                      placeholder="Kategoriya nomi..."
                                      value={newCategoryName}
                                      onChange={(e) => setNewCategoryName(e.target.value)}
                                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                                      data-testid="input-inline-category-name"
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      type="button"
                                      disabled={!newCategoryName.trim()}
                                      onClick={async () => {
                                        if (!newCategoryName.trim()) return;
                                        try {
                                          const res = await fetch("/api/categories", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({ name: newCategoryName.trim() }),
                                          });
                                          if (res.ok) {
                                            setNewProduct(prev => ({ ...prev, category: newCategoryName.trim() }));
                                            setNewCategoryName("");
                                            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
                                            toast({ title: "Kategoriya qo'shildi", className: "bg-green-500 text-white border-none", duration: 2000 });
                                          } else {
                                            toast({ title: "Xatolik", variant: "destructive" });
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          toast({ title: "Xatolik", variant: "destructive" });
                                        }
                                      }}
                                      data-testid="button-save-inline-category"
                                    >
                                      Qo'shish
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>}
                          {isFieldVisible("supplier") && <div className="space-y-2 col-span-2">
                            <Label htmlFor="supplier" className="flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                              Tovar beruvchi
                            </Label>
                            <div className="flex gap-2">
                              <Select value={newProduct.supplier || "none"} onValueChange={(val) => setNewProduct({...newProduct, supplier: val === "none" ? "" : val})}>
                                <SelectTrigger className="flex-1 bg-white" data-testid="select-supplier">
                                  <SelectValue placeholder="Tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Tanlanmagan</SelectItem>
                                  {(suppliersList || []).filter((s: any) => s.isActive).map((s: any) => (
                                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={newProduct.supplierPaymentMethod} onValueChange={(val) => setNewProduct({...newProduct, supplierPaymentMethod: val})}>
                                <SelectTrigger className="w-[100px] bg-white" data-testid="select-supplier-payment">
                                  <SelectValue placeholder="To'lov" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="naqd">Naqd</SelectItem>
                                  <SelectItem value="karta">Karta</SelectItem>
                                  <SelectItem value="nasiya">Nasiya</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={newProduct.supplierCurrency} onValueChange={(val) => {
                                const updates: any = { supplierCurrency: val };
                                if (val === "usd") {
                                  const defaultRate = tenantSettings?.defaultDollarRate || 0;
                                  if (!newProduct.supplierCurrencyRate && defaultRate > 0) {
                                    updates.supplierCurrencyRate = defaultRate.toString();
                                  }
                                  updates.supplierOriginalPrice = updates.supplierOriginalPrice || "";
                                  const rate = Number(updates.supplierCurrencyRate || newProduct.supplierCurrencyRate) || 0;
                                  const origPrice = Number(updates.supplierOriginalPrice || newProduct.supplierOriginalPrice) || 0;
                                  if (rate > 0 && origPrice > 0) {
                                    updates.costPrice = (origPrice * rate).toString();
                                  }
                                }
                                if (val === "uzs") {
                                  updates.supplierCurrencyRate = "";
                                  updates.supplierOriginalPrice = "";
                                }
                                setNewProduct(prev => ({...prev, ...updates}));
                              }}>
                                <SelectTrigger className="w-[90px] bg-white" data-testid="select-supplier-currency">
                                  <SelectValue placeholder="Valyuta" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="uzs">So'm</SelectItem>
                                  <SelectItem value="usd">Dollar</SelectItem>
                                </SelectContent>
                              </Select>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button type="button" variant="outline" size="icon" className="shrink-0" data-testid="button-add-supplier">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-sm">
                                  <DialogHeader><DialogTitle>Yangi tovar beruvchi</DialogTitle></DialogHeader>
                                  <div className="space-y-3">
                                    <Input
                                      placeholder="Nomi"
                                      value={newSupplierName}
                                      onChange={(e) => setNewSupplierName(e.target.value)}
                                      data-testid="input-new-supplier-name"
                                    />
                                    <Input
                                      placeholder="Telefon (ixtiyoriy)"
                                      value={newSupplierPhone}
                                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                                      data-testid="input-new-supplier-phone"
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={async () => {
                                        if (!newSupplierName.trim()) return;
                                        try {
                                          await fetch("/api/suppliers", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({ name: newSupplierName.trim(), phone: newSupplierPhone.trim() }),
                                          });
                                          queryClient.invalidateQueries({ queryKey: ["suppliers"] });
                                          setNewProduct(prev => ({ ...prev, supplier: newSupplierName.trim() }));
                                          setNewSupplierName("");
                                          setNewSupplierPhone("");
                                        } catch {}
                                      }}
                                      disabled={!newSupplierName.trim()}
                                      data-testid="button-save-supplier"
                                    >
                                      Qo'shish
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                          <Label className="text-sm font-semibold text-gray-700">Narxlar</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {isFieldVisible("costPrice") && newProduct.supplierCurrency === "usd" ? (
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs text-muted-foreground">Tan narxi (dollar)</Label>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground">Narx ($)</span>
                                  <Input
                                    type="number"
                                    placeholder="100"
                                    value={newProduct.supplierOriginalPrice}
                                    onChange={(e) => {
                                      const origPrice = e.target.value;
                                      const rate = Number(newProduct.supplierCurrencyRate) || 0;
                                      const costPrice = rate > 0 ? (Number(origPrice) * rate).toString() : "";
                                      setNewProduct(prev => ({...prev, supplierOriginalPrice: origPrice, costPrice}));
                                    }}
                                    className="bg-white h-9"
                                    data-testid="input-original-price"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground">Kurs (1$=?so'm)</span>
                                  <Input
                                    type="number"
                                    placeholder="12200"
                                    value={newProduct.supplierCurrencyRate}
                                    onChange={(e) => {
                                      const rate = e.target.value;
                                      const origPrice = Number(newProduct.supplierOriginalPrice) || 0;
                                      const costPrice = origPrice > 0 ? (origPrice * Number(rate)).toString() : "";
                                      setNewProduct(prev => ({...prev, supplierCurrencyRate: rate, costPrice}));
                                    }}
                                    className="bg-white h-9"
                                    data-testid="input-currency-rate"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground">Jami (so'm)</span>
                                  <Input
                                    type="number"
                                    value={newProduct.costPrice}
                                    readOnly
                                    className="bg-gray-100 h-9 font-semibold"
                                    data-testid="input-cost-price-calculated"
                                  />
                                </div>
                              </div>
                            </div>
                            ) : isFieldVisible("costPrice") ? (
                            <div className="space-y-1">
                              <Label htmlFor="costPrice" className="text-xs text-muted-foreground">Tan narxi (so'm)</Label>
                              <Input 
                                id="costPrice" 
                                type="number" 
                                required
                                placeholder="Kelish narxi"
                                value={newProduct.costPrice}
                                onChange={(e) => setNewProduct({...newProduct, costPrice: e.target.value})}
                                className="bg-white h-9"
                              />
                            </div>
                            ) : null}
                            {isFieldVisible("price") && (
                            <div className="space-y-1">
                              <Label htmlFor="price" className="text-xs text-muted-foreground">Sotish narxi (so'm)</Label>
                              <Input 
                                id="price" 
                                type="number" 
                                required
                                value={newProduct.price}
                                onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                                className="bg-white h-9"
                              />
                            </div>
                            )}
                            {isFieldVisible("barcodePrice") && (
                            <div className="space-y-1">
                              <Label htmlFor="barcodePrice" className="text-xs text-muted-foreground">Barkod narxi (so'm)</Label>
                              <Input 
                                id="barcodePrice" 
                                type="number" 
                                placeholder="Faqat etiketkada"
                                value={newProduct.barcodePrice}
                                onChange={(e) => setNewProduct({...newProduct, barcodePrice: e.target.value})}
                                className="bg-white h-9"
                              />
                            </div>
                            )}
                            {isFieldVisible("wholesalePrice") && (
                            <div className="space-y-1">
                              <Label htmlFor="wholesalePrice" className="text-xs text-muted-foreground">Ulgurchi narx (so'm)</Label>
                              <Input 
                                id="wholesalePrice" 
                                type="number" 
                                placeholder="Ulgurchi narx"
                                value={newProduct.wholesalePrice}
                                onChange={(e) => setNewProduct({...newProduct, wholesalePrice: e.target.value})}
                                className="bg-white h-9"
                              />
                            </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="stock" className="text-xs text-muted-foreground">Soni (dona)</Label>
                            <Input 
                              id="stock" 
                              type="number" 
                              required
                              value={newProduct.stock}
                              onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                              className="bg-white h-9"
                            />
                          </div>
                        </div>

                        {isFieldVisible("videoUrl") && (
                        <div className="space-y-2">
                          <Label htmlFor="videoUrl" className="flex items-center gap-2">
                            <Youtube className="h-4 w-4 text-red-500" />
                            YouTube video (ixtiyoriy)
                          </Label>
                          <Input 
                            id="videoUrl" 
                            type="url" 
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={newProduct.videoUrl}
                            onChange={(e) => setNewProduct({...newProduct, videoUrl: e.target.value})}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">Video qo'shsangiz, tovar kartasida "Batafsil video" tugmasi ko'rinadi</p>
                        </div>
                        )}

                        {isFieldVisible("isNew") && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-green-300 bg-green-50">
                          <input
                            type="checkbox"
                            id="isNew"
                            checked={newProduct.isNew}
                            onChange={(e) => setNewProduct({...newProduct, isNew: e.target.checked})}
                            className="w-5 h-5 accent-green-600 rounded"
                            data-testid="checkbox-is-new"
                          />
                          <Label htmlFor="isNew" className="cursor-pointer flex-1">
                            <span className="font-semibold text-green-700">🆕 "YANGI" deb belgilash</span>
                            <p className="text-xs text-green-600 mt-0.5">Bu mahsulot do'konda alohida dizayn bilan ajralib ko'rinadi</p>
                          </Label>
                        </div>
                        )}
                      </div>
                      <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Bekor qilish</Button>
                        <Button 
                          type="submit" 
                          className="gap-2"
                          onClick={(e) => {
                            if (e.currentTarget.form) {
                              e.preventDefault();
                              handleAddProduct(e as any);
                            }
                          }}
                          style={{backgroundColor: '#3b82f6', color: '#ffffff'}}
                        >
                          <Check className="h-4 w-4" />
                          Saqlash
                        </Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg border shadow-sm flex-1 overflow-hidden">
            <div className="overflow-y-auto h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Tartib</TableHead>
                    <TableHead className="w-[80px]">Rasm</TableHead>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Kategoriya</TableHead>
                    <TableHead>Shtrix kod</TableHead>
                    <TableHead className="text-right">Narxi</TableHead>
                    <TableHead className="text-right">Qoldiq</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveProduct(products.findIndex(p => p.id === product.id), "up")}
                            disabled={products.findIndex(p => p.id === product.id) === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveProduct(products.findIndex(p => p.id === product.id), "down")}
                            disabled={products.findIndex(p => p.id === product.id) === products.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden">
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{product.name}</span>
                          {product.isNew && (
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide">YANGI</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{product.author}</div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {product.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {product.barcode}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {product.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${product.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setRestockProduct(product)}>
                              <PackagePlus className="mr-2 h-4 w-4" />
                              Kirim qilish
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setPrintProducts([{ id: product.id, name: product.name, barcode: product.barcode, price: product.price, barcodePrice: (product as any).barcodePrice }]);
                              setIsPrintDialogOpen(true);
                            }}>
                              <Printer className="mr-2 h-4 w-4" />
                              Barcode chop etish
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex-1 overflow-y-auto space-y-4 pb-20">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-24 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-medium text-sm truncate pr-2">{product.name}</h3>
                            {product.isNew && (
                              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shrink-0">YANGI</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{product.author}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setRestockProduct(product)}>
                              <PackagePlus className="mr-2 h-4 w-4" />
                              Kirim qilish
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setPrintProducts([{ id: product.id, name: product.name, barcode: product.barcode, price: product.price, barcodePrice: (product as any).barcodePrice }]);
                              setIsPrintDialogOpen(true);
                            }}>
                              <Printer className="mr-2 h-4 w-4" />
                              Barcode chop etish
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">
                          {product.category}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-bold text-primary">
                          {product.price.toLocaleString()} so'm
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Qoldiq:</span>
                          <span className={`font-medium ${product.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                            {product.stock}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <ScannerOverlay 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScanResult}
        mode={scannerMode}
      />

      <BarcodePrintDialog
        products={printProducts}
        open={isPrintDialogOpen}
        onClose={() => { setIsPrintDialogOpen(false); setPrintProducts([]); }}
      />

      <Dialog open={!!restockProduct} onOpenChange={(open) => !open && setRestockProduct(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Omborga kirim qilish</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tovar</Label>
              <div className="font-medium">{restockProduct?.name}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Soni (dona)</Label>
              <Input
                id="amount"
                type="number"
                value={restockAmount}
                onChange={(e) => setRestockAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockProduct(null)}>Bekor qilish</Button>
            <Button onClick={handleRestock}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
