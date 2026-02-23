import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, BookOpen } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  brandColor: string;
}

export default function SlugLoginPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { login, isAuthenticated, isLoading: authLoading, tenant: authTenant } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: tenant } = useQuery<TenantInfo>({
    queryKey: ["tenant", slug],
    queryFn: async () => {
      const res = await fetch(`/api/tenant/${slug}`);
      if (!res.ok) throw new Error("Do'kon topilmadi");
      return res.json();
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (authTenant && authTenant.slug !== slug) {
        localStorage.removeItem("kitoblar_token");
        localStorage.removeItem("kitoblar_tenant_id");
        window.location.reload();
        return;
      }
      const targetSlug = authTenant?.slug || slug;
      setLocation(`/store/${targetSlug}/admin`);
    }
  }, [isAuthenticated, authLoading, setLocation, slug, authTenant]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const brandColor = tenant?.brandColor || "#4f46e5";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const success = await login(username, password, slug);
      if (!success) {
        setError("Login yoki parol noto'g'ri");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl" data-testid="login-card">
        <CardHeader className="space-y-1 items-center text-center">
          {tenant?.logo ? (
            <img src={tenant.logo} alt={tenant.name} className="w-16 h-16 rounded-2xl object-cover mb-4 shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg" style={{ backgroundColor: brandColor }}>
              <Lock className="h-7 w-7" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">{tenant?.name || slug}</CardTitle>
          <CardDescription>Admin paneliga kirish</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Login</Label>
              <Input id="username" type="text" placeholder="Foydalanuvchi nomi" value={username} onChange={(e) => setUsername(e.target.value)} required data-testid="input-username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="input-password" />
            </div>
            {error && (
              <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-2 rounded" data-testid="text-error">{error}</div>
            )}
            <Button className="w-full text-white" type="submit" disabled={isLoading} style={{ backgroundColor: brandColor }} data-testid="button-login">
              {isLoading ? "Kirilmoqda..." : "Kirish"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => setLocation(`/store/${slug}`)} style={{ color: brandColor }} data-testid="link-back-store">
            <BookOpen className="h-4 w-4 mr-1" /> Do'konga qaytish
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
