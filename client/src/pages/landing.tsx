import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, BarChart3, Package, QrCode, Smartphone,
  Zap, Shield, Globe, ArrowRight, ChevronRight,
  Store, CreditCard, TrendingUp, Users, Printer,
  Bot, Clock, Wifi, WifiOff, Star, CheckCircle2,
  Sparkles, Rocket, LayoutDashboard
} from "lucide-react";

const FEATURES = [
  { icon: ShoppingCart, title: "Tezkor savdo", desc: "Bir necha bosish bilan sotuv amalga oshiring", color: "from-blue-500 to-cyan-500" },
  { icon: QrCode, title: "Shtrix kod skaneri", desc: "Kamera yoki skaner bilan tezkor qidirish", color: "from-violet-500 to-purple-500" },
  { icon: Package, title: "Ombor nazorati", desc: "Mahsulotlar va zaxiralarni real vaqtda kuzating", color: "from-emerald-500 to-green-500" },
  { icon: BarChart3, title: "Hisobotlar", desc: "Sotuvlar, foyda va statistikani tahlil qiling", color: "from-orange-500 to-amber-500" },
  { icon: Globe, title: "Onlayn do'kon", desc: "Haridorlar uchun tayyor veb-sahifa", color: "from-pink-500 to-rose-500" },
  { icon: Bot, title: "Telegram bot", desc: "Buyurtmalar haqida avtomatik xabarlar", color: "from-sky-500 to-blue-500" },
  { icon: Printer, title: "Chek va etiketka", desc: "Shtrix kod etiketkalari va cheklar chop eting", color: "from-teal-500 to-emerald-500" },
  { icon: Smartphone, title: "PWA dastur", desc: "Telefon yoki kompyuterga o'rnating", color: "from-indigo-500 to-violet-500" },
];

const STATS = [
  { value: "500+", label: "Faol do'konlar" },
  { value: "1M+", label: "Sotuvlar", },
  { value: "99.9%", label: "Ishonchlilik" },
  { value: "24/7", label: "Qo'llab-quvvatlash" },
];

const SLOGANS = [
  "Do'koningizni avtomatlashtiring",
  "Savdo tizimi qo'lingizda",
  "Har qanday qurilmadan boshqaring",
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, tenant } = useAuth();
  const [currentSlogan, setCurrentSlogan] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlogan(prev => (prev + 1) % SLOGANS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated && tenant?.slug) {
      setLocation(`/store/${tenant.slug}/admin`);
    }
  }, [isAuthenticated, tenant]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0a0a1a] animate-pulse" />
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              E-Savdo Platform
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex"
              onClick={() => setLocation("/register")}
              data-testid="button-register-nav"
            >
              Ro'yxatdan o'tish
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-full px-6 shadow-lg shadow-indigo-500/25"
              onClick={() => setLocation("/login")}
              data-testid="button-login-nav"
            >
              Kirish
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />

          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
            backgroundSize: "40px 40px"
          }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-white/70">Elektron savdo platformasi</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              Do'koningizni
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
              avtomatlashtiring
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-10 mb-8"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={currentSlogan}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-lg sm:text-xl text-white/50 font-medium"
              >
                {SLOGANS[currentSlogan]}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Zamonaviy savdo tizimi — kassa, ombor, hisobot va onlayn do'kon barchasi bir joyda.
            Har qanday qurilmadan, istalgan joydan boshqaring.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-full px-8 py-6 text-lg shadow-2xl shadow-indigo-500/30 group w-full sm:w-auto"
              onClick={() => setLocation("/register")}
              data-testid="button-hero-register"
            >
              <Rocket className="mr-2 h-5 w-5 group-hover:animate-bounce" />
              Bepul boshlash
              <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 text-white/80 hover:bg-white/5 hover:text-white rounded-full px-8 py-6 text-lg backdrop-blur-sm w-full sm:w-auto"
              onClick={() => setLocation("/login")}
              data-testid="button-hero-login"
            >
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Kabinetga kirish
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-16 relative"
          >
            <div className="relative mx-auto max-w-4xl">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-[#12122a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-white/30 font-mono">
                      e-savdo.uz/store/mening-dokonim
                    </div>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { icon: ShoppingCart, label: "Bugungi savdo", value: "3,450,000", sub: "so'm", color: "text-green-400" },
                      { icon: TrendingUp, label: "Foyda", value: "890,000", sub: "so'm", color: "text-emerald-400" },
                      { icon: Package, label: "Sotilgan", value: "47", sub: "ta mahsulot", color: "text-blue-400" },
                      { icon: Users, label: "Mijozlar", value: "23", sub: "ta yangi", color: "text-violet-400" },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                        className="bg-white/[0.03] rounded-xl p-4 border border-white/5"
                      >
                        <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                        <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-xs text-white/30">{stat.sub}</div>
                        <div className="text-[10px] text-white/20 mt-1">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {["Kassa", "Ombor", "Buyurtmalar", "Hisobot", "Sozlamalar"].map((tab, i) => (
                      <div
                        key={tab}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${i === 0 ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-white/[0.03] text-white/30 border border-white/5"}`}
                      >
                        {tab}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              Barcha kerakli vositalar bir joyda
            </h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Do'koningizni boshqarish uchun kerakli barcha funksiyalar tayyor
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative bg-white/[0.03] rounded-2xl border border-white/5 p-6 hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-600/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              Qanday ishlaydi?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Ro'yxatdan o'ting", desc: "Do'kon nomini kiriting va bir daqiqada tizimga qo'shiling", icon: Rocket },
              { step: "02", title: "Mahsulotlarni qo'shing", desc: "Tovarlarni qo'shing, narx belgilang va shtrix kod yarating", icon: Package },
              { step: "03", title: "Savdoni boshlang", desc: "Kassada sotuv qiling, hisobotlarni ko'ring va do'konni ulashing", icon: ShoppingCart },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
                  <item.icon className="h-8 w-8 text-indigo-400" />
                </div>
                <div className="text-xs font-bold text-indigo-400 mb-2">{item.step}-QADAM</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/40">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                  {stat.value}
                </div>
                <div className="text-sm text-white/40 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              Nima uchun aynan biz?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Zap, title: "Tezkor va qulay", desc: "Bir soniyada sotuv amalga oshiring, hech qanday kechikish yo'q" },
              { icon: Shield, title: "Xavfsiz ma'lumotlar", desc: "Barcha ma'lumotlar shifrlangan va himoyalangan" },
              { icon: Wifi, title: "Offline ishlaydi", desc: "Internet bo'lmasa ham savdo to'xtamaydi — oflayn rejim" },
              { icon: Globe, title: "Tayyor onlayn do'kon", desc: "Havolani ulashing — haridorlar onlayn buyurtma bersin" },
              { icon: CreditCard, title: "Ko'p to'lov usullari", desc: "Naqd, karta, nasiya va boshqa usullarni sozlang" },
              { icon: Clock, title: "14 kun bepul sinov", desc: "To'lov qilmasdan barcha imkoniyatlarni sinab ko'ring" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-white/40">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative inline-block mb-8">
              <div className="absolute -inset-8 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 rounded-full blur-3xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                <Rocket className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              Hoziroq boshlang!
            </h2>
            <p className="text-white/40 mb-8 text-lg">
              Do'koningizni zamonaviy tizim bilan boshqaring. 14 kun bepul sinov davri.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-full px-10 py-6 text-lg shadow-2xl shadow-indigo-500/30 group w-full sm:w-auto"
                onClick={() => setLocation("/register")}
                data-testid="button-cta-register"
              >
                Bepul ro'yxatdan o'tish
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/10 text-white/70 hover:bg-white/5 hover:text-white rounded-full px-10 py-6 text-lg w-full sm:w-auto"
                onClick={() => setLocation("/login")}
                data-testid="button-cta-login"
              >
                Kabinetga kirish
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
                <Store className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-white/50 font-medium">E-Savdo Platform</span>
            </div>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} E-Savdo Platform. Barcha huquqlar himoyalangan.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
