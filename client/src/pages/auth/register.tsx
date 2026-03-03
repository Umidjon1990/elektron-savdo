import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ArrowLeft, Rocket, Eye, EyeOff, Loader2, Globe, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading: authLoading, tenant } = useAuth();
  const [, setLocation] = useLocation();
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      if (tenant?.slug) {
        setLocation(`/store/${tenant.slug}/admin`);
      } else {
        setLocation("/admin");
      }
    }
  }, [isAuthenticated, authLoading, setLocation, tenant]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleStoreNameChange = (value: string) => {
    setStoreName(value);
    setSlug(generateSlug(value));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Parollar mos kelmaydi");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Parol kamida 6 ta belgi bo'lishi kerak");
      setIsLoading(false);
      return;
    }

    if (slug.length < 2) {
      setError("Do'kon manzili kamida 2 ta belgi bo'lishi kerak");
      setIsLoading(false);
      return;
    }

    try {
      const result = await register({
        storeName,
        slug,
        username,
        email: email || undefined,
        password,
      });

      if (!result.success) {
        setError(result.error || "Ro'yxatdan o'tishda xatolik");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const BENEFITS = [
    "14 kunlik bepul sinov davri",
    "Cheksiz mahsulotlar qo'shish",
    "Onlayn do'kon avtomatik yaratiladi",
    "Telegram bot bildirishnomalar",
  ];

  return (
    <div className="dark-form min-h-screen flex items-center justify-center bg-[#0a0a1a] p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-600/15 rounded-full blur-[80px]" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
          backgroundSize: "40px 40px"
        }} />
      </div>

      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          className="text-white/50 hover:text-white hover:bg-white/10 rounded-full"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Bosh sahifa
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="bg-white/[0.05] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-8 pb-4 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600/30 to-indigo-600/30 rounded-full blur-xl" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Rocket className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Do'kon ochish</h1>
            <p className="text-white/40 text-sm">
              Bir daqiqada o'z do'koningizni yarating
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span className="text-[11px] text-white/50">{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-8 pb-8 pt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-white/70 text-sm font-medium">Do'kon nomi</Label>
                <Input
                  id="storeName"
                  data-testid="input-store-name"
                  type="text"
                  placeholder="Masalan: Mening Do'konim"
                  value={storeName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                  required
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-white/70 text-sm font-medium">Do'kon manzili</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <Input
                    id="slug"
                    data-testid="input-slug"
                    type="text"
                    placeholder="mening-dokonim"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    required
                    className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 rounded-xl pl-10"
                  />
                </div>
                {slug && (
                  <p className="text-xs text-indigo-400/70 font-mono pl-1">
                    /store/{slug}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/70 text-sm font-medium">Foydalanuvchi nomi</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70 text-sm font-medium">
                  Email <span className="text-white/30">(ixtiyoriy)</span>
                </Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="email@misol.uz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/70 text-sm font-medium">Parol</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      data-testid="input-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white/70 text-sm font-medium">Tasdiqlash</Label>
                  <Input
                    id="confirmPassword"
                    data-testid="input-confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 rounded-xl"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 font-medium text-center bg-red-500/10 border border-red-500/20 p-3 rounded-xl"
                  data-testid="text-error"
                >
                  {error}
                </motion.div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white h-12 rounded-xl text-base font-semibold shadow-lg shadow-emerald-500/25"
                type="submit"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Yaratilmoqda...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5 mr-2" />
                    Do'kon ochish
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <Button
                variant="ghost"
                onClick={() => setLocation("/login")}
                className="text-white/50 hover:text-white hover:bg-white/5"
                data-testid="link-login"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kirish sahifasiga qaytish
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
