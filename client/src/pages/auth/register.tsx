import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
      setError("Do'kon slug kamida 2 ta belgi bo'lishi kerak");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl" data-testid="register-card">
        <CardHeader className="space-y-1 items-center text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-200">
            <Store className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Do'kon ochish</CardTitle>
          <CardDescription>
            O'z do'koningizni yarating va 14 kunlik bepul sinov davriga ega bo'ling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Do'kon nomi</Label>
              <Input
                id="storeName"
                data-testid="input-store-name"
                type="text"
                placeholder="Masalan: Oltin Kitob"
                value={storeName}
                onChange={(e) => handleStoreNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Do'kon manzili (slug)</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="slug"
                  data-testid="input-slug"
                  type="text"
                  placeholder="oltin-kitob"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  required
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">.kitoblar.uz</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Foydalanuvchi nomi</Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (ixtiyoriy)</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="email@misol.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password">Parol</Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Tasdiqlash</Label>
                <Input
                  id="confirmPassword"
                  data-testid="input-confirm-password"
                  type="password"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-2 rounded" data-testid="text-error">
                {error}
              </div>
            )}
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" type="submit" disabled={isLoading} data-testid="button-register">
              {isLoading ? "Yaratilmoqda..." : "Do'kon ochish"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="ghost" onClick={() => setLocation("/login")} className="text-indigo-600" data-testid="link-login">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kirish sahifasiga qaytish
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
