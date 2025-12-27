import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useLocation } from "wouter";

function preloadAdminPages() {
  import("@/pages/dashboard");
  import("@/pages/inventory");
  import("@/pages/history");
  import("@/pages/orders");
  import("@/pages/customers");
  import("@/pages/settings");
  import("@/pages/categories");
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Preload admin pages when on login page
  useEffect(() => {
    preloadAdminPages();
  }, []);
  
  // Redirect if already logged in
  if (isAuthenticated) {
    setLocation("/admin");
    return null;
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 items-center text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-200">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Panel</CardTitle>
          <CardDescription>
            Tizimga kirish uchun login va parolingizni kiriting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Login</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" type="submit" disabled={isLoading}>
              {isLoading ? "Kirilmoqda..." : "Kirish"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
          <div className="text-xs">
            Test uchun: <span className="font-mono bg-slate-100 px-1 rounded">admin</span> / <span className="font-mono bg-slate-100 px-1 rounded">admin123</span>
          </div>
          <Button variant="link" onClick={() => setLocation("/")} className="text-indigo-600">
            Do'konga qaytish
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
