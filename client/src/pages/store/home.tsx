import { useState } from "react";
import { useLocation } from "wouter";
import { useProducts } from "@/lib/product-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Menu, ArrowRight, Star, TrendingUp, BookOpen, Truck, ShieldCheck, Phone } from "lucide-react";
import { CATEGORIES } from "@/data/mock-products";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart-context"; // We need to create this context
import { cn } from "@/lib/utils";

export default function StoreHome() {
  const [, setLocation] = useLocation();
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  
  // Placeholder for Cart Context usage
  const cartItemCount = 0; 

  const filteredProducts = products.filter(p => 
    (activeCategory === "Barchasi" || p.category === activeCategory) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const featuredProducts = products.slice(0, 4); // Just taking first 4 as featured for now

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/store")}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <BookOpen className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 hidden sm:block">
              Kitoblar Olami
            </span>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Kitob yoki muallifni qidiring..." 
              className="pl-10 bg-slate-100 border-transparent focus:bg-white transition-all rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-full" onClick={() => setLocation("/store/cart")}>
              <ShoppingCart className="h-6 w-6 text-slate-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {cartItemCount}
                </span>
              )}
            </Button>
            <Button className="hidden sm:flex bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-lg shadow-indigo-200">
              Kirish
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                {/* Mobile Menu Content */}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
           <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
           <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
           <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-4 px-4 py-1 text-sm border-indigo-200 text-indigo-700 bg-indigo-50">
                🚀 Eng so'nggi bestsellerlar
              </Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                Bilim olishning yangi <br/>
                <span className="text-indigo-600">zamonaviy usuli</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Minglab kitoblar orasidan o'zingizga mosini toping. Bizda badiiy adabiyotdan tortib, biznes va IT sohasigacha barcha turdagi qo'llanmalar mavjud.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button size="lg" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-200 transition-transform hover:scale-105" onClick={() => {
                   const el = document.getElementById('catalog');
                   el?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Xaridni boshlash <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 border-slate-200 hover:bg-white hover:text-indigo-600 rounded-full">
                  Batafsil
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Truck, title: "Tezkor yetkazib berish", desc: "O'zbekiston bo'ylab 24 soat ichida" },
              { icon: ShieldCheck, title: "100% Kafolat", desc: "Sifatli va original mahsulotlar" },
              { icon: Phone, title: "24/7 Qo'llab-quvvatlash", desc: "Har qanday savolga javob beramiz" }
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-sm text-slate-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-slate-50" id="catalog">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Kategoriyalar</h2>
            <Button variant="link" className="text-indigo-600">Barchasini ko'rish</Button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            <Button 
              onClick={() => setActiveCategory("Barchasi")}
              variant={activeCategory === "Barchasi" ? "default" : "outline"}
              className={cn("rounded-full whitespace-nowrap", activeCategory === "Barchasi" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white border-slate-200")}
            >
              Barchasi
            </Button>
            {CATEGORIES.filter(c => c !== "Barchasi").map(category => (
              <Button
                key={category}
                onClick={() => setActiveCategory(category)}
                variant={activeCategory === category ? "default" : "outline"}
                className={cn("rounded-full whitespace-nowrap", activeCategory === category ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white border-slate-200")}
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
            {filteredProducts.map((product) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="group bg-white rounded-2xl p-3 shadow-sm hover:shadow-xl hover:shadow-indigo-100 transition-all border border-slate-100 flex flex-col"
              >
                <div className="relative aspect-[2/3] bg-slate-100 rounded-xl overflow-hidden mb-3">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {product.stock < 5 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                      KAM QOLDI
                    </span>
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="text-xs text-indigo-600 font-medium mb-1">{product.category}</div>
                  <h3 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-slate-500 mb-3">{product.author}</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="font-bold text-lg text-slate-900">
                      {product.price.toLocaleString()} <span className="text-xs text-slate-500 font-normal">so'm</span>
                    </div>
                    <Button size="icon" className="h-8 w-8 rounded-full bg-slate-900 text-white hover:bg-indigo-600 transition-colors">
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
