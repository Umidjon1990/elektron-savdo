import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Store, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

function preloadAdminPages() {
  import("@/pages/dashboard");
  import("@/pages/inventory");
  import("@/pages/history");
  import("@/pages/customers");
  import("@/pages/settings");
  import("@/pages/categories");
}

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading, tenant } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    preloadAdminPages();
  }, []);
  
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      if (tenant?.slug) {
        setLocation(`/store/${tenant.slug}/admin`);
      } else {
        setLocation("/admin");
      }
    }
  }, [isAuthenticated, authLoading, setLocation, tenant]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const success = await login(username, password);
      if (success) {
        preloadAdminPages();
      } else {
        setError("Login yoki parol noto'g'ri");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark-form min-h-screen flex items-center justify-center bg-[#0a0a1a] p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] bg-violet-600/15 rounded-full blur-[80px]" />
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
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/[0.05] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 rounded-full blur-xl" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Lock className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Kabinetga kirish</h1>
            <p className="text-white/40 text-sm">
              Login va parolingizni kiriting
            </p>
          </div>

          <div className="px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/70 text-sm font-medium">Login</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  placeholder="Foydalanuvchi nomi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70 text-sm font-medium">Parol</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 rounded-xl pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
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
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white h-12 rounded-xl text-base font-semibold shadow-lg shadow-indigo-500/25"
                type="submit"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Kirilmoqda...
                  </>
                ) : (
                  "Kirish"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => setLocation("/register")}
                className="w-full border-white/10 text-white/70 hover:bg-white/5 hover:text-white rounded-xl h-11"
                data-testid="link-register"
              >
                <Store className="h-4 w-4 mr-2" />
                Yangi do'kon ochish
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
