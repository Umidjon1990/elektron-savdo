import { useState, useRef, useEffect } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useProducts } from "@/lib/product-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter, MoreHorizontal, ScanBarcode, ArrowRight, Check, X, RotateCcw } from "lucide-react";
import { ScannerOverlay } from "@/components/pos/scanner-overlay";
import { KNOWN_BOOKS_DB } from "@/data/mock-external-books";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/data/mock-products";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const { products, addProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1: Scan/Enter ISBN, 2: Details
  const { toast } = useToast();

  const [newProduct, setNewProduct] = useState({
    name: "",
    author: "",
    price: "",
    stock: "",
    category: "",
    barcode: "",
    image: ""
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      setStep(1);
      setNewProduct({ name: "", author: "", price: "", stock: "", category: "", barcode: "", image: "" });
    }
  }, [isAddDialogOpen]);

  const handleScan = (code: string) => {
    setIsScannerOpen(false);
    checkIsbnAndProceed(code);
  };

  const checkIsbnAndProceed = (code: string) => {
    // Check if product already exists in our inventory
    const existing = products.find(p => p.barcode === code);
    
    if (existing) {
      toast({
        title: "Bu kitob allaqachon mavjud!",
        description: `"${existing.name}" omborda bor. Qoldig'ini o'zgartirishingiz mumkin.`,
        variant: "destructive"
      });
      // Optionally could switch to "Edit" mode here, but for now just warn
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
        title: "Kitob topildi!",
        description: "Ma'lumotlar avtomatik to'ldirildi",
      });
    } else {
      setNewProduct(prev => ({ ...prev, barcode: code }));
      toast({
        title: "Yangi kitob",
        description: "Iltimos, kitob ma'lumotlarini kiriting",
      });
    }
    
    setStep(2);
  };

  const handleManualIsbnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.barcode.length < 3) {
      toast({ title: "Shtrix kod juda qisqa", variant: "destructive" });
      return;
    }
    checkIsbnAndProceed(newProduct.barcode);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    addProduct({
      name: newProduct.name,
      author: newProduct.author,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      category: newProduct.category || "Jahon adabiyoti",
      barcode: newProduct.barcode || Math.random().toString().slice(2, 14),
      image: newProduct.image || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300&h=400"
    });
    setIsAddDialogOpen(false);
    toast({
      title: "Muvaffaqiyatli qo'shildi",
      description: `${newProduct.name} bazaga kiritildi`,
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode.includes(searchQuery)
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden font-sans">
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
              <Button variant="outline" className="gap-2 flex-1 md:flex-none justify-center">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 flex-1 md:flex-none justify-center">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Yangi kitob</span>
                    <span className="sm:hidden">Qo'shish</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {step === 1 ? "1-qadam: Shtrix kodni aniqlash" : "2-qadam: Ma'lumotlarni to'ldirish"}
                    </DialogTitle>
                  </DialogHeader>

                  {step === 1 ? (
                    <div className="py-6 flex flex-col items-center gap-6">
                      <div className="w-full flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setIsScannerOpen(true)}>
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

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="name">Kitob nomi</Label>
                            <Input 
                              id="name" 
                              required 
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                              placeholder="Masalan: Atomic Habits"
                              className="font-medium"
                            />
                          </div>
                          <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label htmlFor="author">Muallif</Label>
                            <Input 
                              id="author" 
                              required
                              value={newProduct.author}
                              onChange={(e) => setNewProduct({...newProduct, author: e.target.value})}
                              placeholder="Masalan: James Clear"
                            />
                          </div>
                          <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label htmlFor="category">Janr</Label>
                            <Select 
                              value={newProduct.category} 
                              onValueChange={(val) => setNewProduct({...newProduct, category: val})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tanlang" />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.filter(c => c !== "Barchasi").map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                          <div className="space-y-2">
                             <Label htmlFor="price">Narxi (so'm)</Label>
                            <Input 
                              id="price" 
                              type="number" 
                              required
                              value={newProduct.price}
                              onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stock">Soni (dona)</Label>
                            <Input 
                              id="stock" 
                              type="number" 
                              required
                              value={newProduct.stock}
                              onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                              className="bg-white"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Bekor qilish</Button>
                        <Button type="submit" className="gap-2">
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
                    <TableHead className="w-[80px]">Rasm</TableHead>
                    <TableHead>Nomi / Muallif</TableHead>
                    <TableHead>Kategoriya</TableHead>
                    <TableHead>Shtrix kod</TableHead>
                    <TableHead className="text-right">Narxi</TableHead>
                    <TableHead className="text-right">Qoldiq</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden">
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
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
                          <h3 className="font-medium text-sm truncate pr-2">{product.name}</h3>
                          <p className="text-xs text-muted-foreground">{product.author}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
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
        onScan={handleScan}
      />
    </div>
  );
}
