import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, ArrowRight, BookOpen, Truck, ShieldCheck, Phone, Play } from "lucide-react";
import { VideoPopup } from "@/components/ui/video-popup";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  brandColor: string;
}

interface Product {
  id: string;
  name: string;
  author: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  videoUrl?: string;
  isNew?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isPinned: boolean;
  sortOrder: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

function useStoreCart(slug: string) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${slug}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(items));
  }, [items, slug]);

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return { items, addItem, itemCount, total };
}

function FloatingCart({ slug, itemCount, total }: { slug: string; itemCount: number; total: number }) {
  const [, setLocation] = useLocation();
  if (itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-8 md:w-96"
      >
        <Button
          onClick={() => setLocation(`/store/${slug}/cart`)}
          className="w-full h-auto min-h-14 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-2xl shadow-indigo-300 flex items-center justify-between px-4"
          data-testid="button-floating-cart"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Savat</span>
            <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">{itemCount} dona</span>
          </div>
          <span className="text-base font-bold">{total.toLocaleString()} so'm</span>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

export default function SlugStorePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const { items, addItem, itemCount, total } = useStoreCart(slug);

  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useQuery<TenantInfo>({
    queryKey: ["tenant", slug],
    queryFn: async () => {
      const res = await fetch(`/api/tenant/${slug}`);
      if (!res.ok) throw new Error("Do'kon topilmadi");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["store-products", slug],
    queryFn: async () => {
      const res = await fetch(`/api/store/${slug}/products`);
      if (!res.ok) throw new Error("Mahsulotlarni yuklashda xatolik");
      return res.json();
    },
    enabled: !!slug && !!tenant,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["store-categories", slug],
    queryFn: async () => {
      const res = await fetch(`/api/store/${slug}/categories`);
      if (!res.ok) throw new Error("Kategoriyalarni yuklashda xatolik");
      return res.json();
    },
    enabled: !!slug && !!tenant,
    staleTime: 60000,
  });

  const [initialCategorySet, setInitialCategorySet] = useState(false);
  useEffect(() => {
    if (categories.length > 0 && !initialCategorySet) {
      const firstPinned = [...categories]
        .filter(c => c.isPinned)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))[0];
      if (firstPinned) {
        setActiveCategory(firstPinned.name);
      }
      setInitialCategorySet(true);
    }
  }, [categories, initialCategorySet]);

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Do'kon topilmadi</h1>
        <p className="text-slate-500 mb-6">"{slug}" nomli do'kon mavjud emas</p>
        <Button onClick={() => setLocation("/")} className="bg-indigo-600 hover:bg-indigo-700">
          Bosh sahifaga qaytish
        </Button>
      </div>
    );
  }

  const brandColor = tenant.brandColor || "#4f46e5";

  const filteredProducts = products.filter(p =>
    (activeCategory === "Barchasi" || p.category === activeCategory) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const newProducts = products.filter(p => p.isNew);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation(`/store/${slug}`)}>
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="w-10 h-10 rounded-xl object-cover shadow-lg" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: brandColor }}>
                <BookOpen className="h-6 w-6" />
              </div>
            )}
            <span className="text-xl font-bold hidden sm:block" style={{ color: brandColor }} data-testid="text-store-name">
              {tenant.name}
            </span>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Kitob yoki muallifni qidiring..."
              className="pl-10 bg-slate-100 border-transparent focus:bg-white transition-all rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-full" onClick={() => setLocation(`/store/${slug}/cart`)}>
              <ShoppingCart className="h-6 w-6 text-slate-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {itemCount}
                </span>
              )}
            </Button>
            <Button
              className="text-white rounded-full px-4 sm:px-6 shadow-lg text-sm sm:text-base"
              style={{ backgroundColor: brandColor }}
              onClick={() => setLocation(`/store/${slug}/login`)}
              data-testid="button-admin-login"
            >
              Admin
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                <span style={{ color: brandColor }}>{tenant.name}</span>ga <br /> xush kelibsiz!
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Bizning do'konimizdan sifatli mahsulotlarni toping va onlayn buyurtma bering.
              </p>
              <Button
                size="lg"
                className="h-12 px-8 text-white rounded-full shadow-xl transition-transform hover:scale-105"
                style={{ backgroundColor: brandColor }}
                onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-start-shopping"
              >
                Xaridni boshlash <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Truck, title: "Tezkor yetkazib berish", desc: "O'zbekiston bo'ylab" },
              { icon: ShieldCheck, title: "100% Kafolat", desc: "Sifatli va original" },
              { icon: Phone, title: "Qo'llab-quvvatlash", desc: "Har qanday savolga javob" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: brandColor + "20" }}>
                  <f.icon className="h-6 w-6" style={{ color: brandColor }} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="py-16 bg-slate-50" id="catalog">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Mahsulotlar</h2>
          </div>

          <div className="md:hidden mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Qidirish..."
                className="pl-10 bg-white border-slate-200 rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            <Button
              onClick={() => setActiveCategory("Barchasi")}
              variant={activeCategory === "Barchasi" ? "default" : "outline"}
              className={cn("rounded-full whitespace-nowrap", activeCategory === "Barchasi" ? "text-white" : "bg-white border-slate-200")}
              style={activeCategory === "Barchasi" ? { backgroundColor: brandColor } : {}}
            >
              Barchasi
            </Button>
            {[...categories].sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return (a.sortOrder || 0) - (b.sortOrder || 0);
            }).map((cat) => (
              <Button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                variant={activeCategory === cat.name ? "default" : "outline"}
                className={cn(
                  "rounded-full whitespace-nowrap",
                  activeCategory === cat.name ? "text-white" : "bg-white border-slate-200",
                  cat.isPinned && activeCategory !== cat.name ? "ring-1 ring-amber-300 border-amber-200" : ""
                )}
                data-testid={`category-filter-${cat.id}`}
                style={activeCategory === cat.name
                  ? { backgroundColor: cat.color || brandColor }
                  : cat.isPinned && cat.color
                    ? { borderColor: cat.color + "60", backgroundColor: cat.color + "10" }
                    : {}
                }
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {newProducts.length > 0 && activeCategory === "Barchasi" && !searchQuery && (
            <div className="mt-8 mb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-black px-4 py-1.5 rounded-full shadow-md shadow-amber-200/50 animate-pulse tracking-wider">
                  YANGI
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-amber-300 to-transparent" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {newProducts.map((product) => (
                  <motion.div
                    key={`new-${product.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group rounded-2xl p-3 shadow-lg hover:shadow-xl transition-all flex flex-col relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-300 hover:shadow-amber-200 ring-1 ring-amber-200"
                    data-testid={`card-new-product-${product.id}`}
                  >
                    <div className="absolute top-0 right-0 z-20">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl shadow-lg tracking-widest animate-pulse">
                        YANGI
                      </div>
                    </div>
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-400 opacity-10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-orange-400 opacity-10 rounded-full blur-2xl" />
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 ring-2 ring-amber-200 ring-offset-2">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="text-xs font-medium mb-1 text-amber-600">{product.category}</div>
                      <h3 className="font-bold leading-tight mb-1 line-clamp-2 text-amber-900">{product.name}</h3>
                      <p className="text-sm text-slate-500 mb-3">{product.author}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="font-bold text-lg text-amber-700">
                          {product.price.toLocaleString()} <span className="text-xs text-slate-500 font-normal">so'm</span>
                        </div>
                        <Button
                          size="icon"
                          className="h-8 w-8 rounded-full text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-200"
                          onClick={() => addItem(product)}
                          data-testid={`button-add-new-${product.id}`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
            {productsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 animate-pulse">
                  <div className="aspect-[2/3] bg-slate-200 rounded-xl mb-3" />
                  <div className="h-3 bg-slate-200 rounded mb-2 w-1/3" />
                  <div className="h-4 bg-slate-200 rounded mb-1" />
                  <div className="h-3 bg-slate-200 rounded mb-3 w-2/3" />
                  <div className="flex justify-between">
                    <div className="h-5 bg-slate-200 rounded w-1/2" />
                    <div className="h-8 w-8 bg-slate-200 rounded-full" />
                  </div>
                </div>
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-500">Mahsulotlar topilmadi</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "group rounded-2xl p-3 shadow-sm hover:shadow-xl transition-all flex flex-col relative overflow-hidden",
                    product.isNew
                      ? "bg-gradient-to-br from-amber-50 via-white to-emerald-50 border-2 border-amber-300 hover:shadow-amber-200 ring-1 ring-amber-200"
                      : "bg-white border border-slate-100 hover:shadow-indigo-100"
                  )}
                  data-testid={`card-product-${product.id}`}
                >
                  {product.isNew && (
                    <>
                      <div className="absolute top-0 right-0 z-20">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl shadow-lg tracking-widest animate-pulse">
                          YANGI
                        </div>
                      </div>
                      <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-400 opacity-10 rounded-full blur-2xl" />
                      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-emerald-400 opacity-10 rounded-full blur-2xl" />
                    </>
                  )}
                  <div className={cn(
                    "relative aspect-[2/3] rounded-xl overflow-hidden mb-3",
                    product.isNew ? "ring-2 ring-amber-200 ring-offset-2" : "bg-slate-100"
                  )}>
                    <img src={product.image} alt={product.name} className={cn(
                      "w-full h-full object-cover transition-transform duration-500",
                      product.isNew ? "group-hover:scale-110" : "group-hover:scale-105"
                    )} />
                    {product.isNew && (
                      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />
                    )}
                    {product.stock < 5 && !product.isNew && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">KAM QOLDI</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="text-xs font-medium mb-1" style={{ color: product.isNew ? "#d97706" : brandColor }}>{product.category}</div>
                    <h3 className={cn(
                      "font-bold leading-tight mb-1 line-clamp-2",
                      product.isNew ? "text-amber-900" : "text-slate-900"
                    )}>{product.name}</h3>
                    <p className="text-sm text-slate-500 mb-3">{product.author}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className={cn(
                        "font-bold text-lg",
                        product.isNew ? "text-amber-700" : "text-slate-900"
                      )}>
                        {product.price.toLocaleString()} <span className="text-xs text-slate-500 font-normal">so'm</span>
                      </div>
                      <Button
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-full text-white transition-all",
                          product.isNew ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-200" : ""
                        )}
                        style={product.isNew ? {} : { backgroundColor: brandColor }}
                        onClick={() => addItem(product)}
                        data-testid={`button-add-${product.id}`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                    {product.videoUrl && product.videoUrl.trim() !== "" && (
                      <div className="mt-3">
                        <VideoPopup
                          videoUrl={product.videoUrl}
                          productName={product.name}
                          trigger={
                            <div className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors w-full">
                              <Play className="w-4 h-4 fill-white" />
                              Batafsil video
                            </div>
                          }
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      <FloatingCart slug={slug} itemCount={itemCount} total={total} />
    </div>
  );
}
