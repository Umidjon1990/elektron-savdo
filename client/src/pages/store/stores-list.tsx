import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Store, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";

interface TenantPublic {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  brandColor: string;
  status: string;
  productsCount: number;
}

export default function StoresListPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: tenants = [], isLoading } = useQuery<TenantPublic[]>({
    queryKey: ["public-tenants"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      if (!res.ok) throw new Error("Xatolik");
      return res.json();
    },
  });

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Store className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 hidden sm:block">
              E-Savdo Platform
            </span>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6" onClick={() => setLocation("/login")} data-testid="button-admin-login">
            Admin kirish
          </Button>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-16 pb-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                Barcha <span className="text-indigo-600">do'konlar</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                O'zingizga yoqqan do'konni tanlang va xarid qilishni boshlang
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto mb-10 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Do'kon qidirish..."
              className="pl-10 bg-white border-slate-200 rounded-full shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-stores"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-slate-200 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-10 bg-slate-200 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Store className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Do'konlar topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 cursor-pointer"
                  onClick={() => setLocation(`/store/${t.slug}`)}
                  data-testid={`card-store-${t.slug}`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {t.logo ? (
                      <img src={t.logo} alt={t.name} className="w-14 h-14 rounded-xl object-cover shadow-md" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: t.brandColor }}>
                        <Store className="h-7 w-7" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{t.name}</h3>
                      <p className="text-sm text-slate-500">{t.productsCount} ta mahsulot</p>
                    </div>
                  </div>
                  <Button
                    className="w-full text-white rounded-xl h-10 group-hover:shadow-lg transition-all"
                    style={{ backgroundColor: t.brandColor }}
                    data-testid={`button-visit-${t.slug}`}
                  >
                    Do'konga kirish <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
