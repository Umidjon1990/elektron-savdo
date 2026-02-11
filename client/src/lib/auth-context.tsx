import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { clearAllData } from "./db";

interface UserInfo {
  id: string;
  username: string;
  role: string;
  isSuper: boolean;
}

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  brandColor: string;
  plan?: string;
  status?: string;
  telegramBotToken?: boolean;
  telegramChatId?: boolean;
}

interface AuthContextType {
  user: UserInfo | null;
  tenant: TenantInfo | null;
  token: string | null;
  login: (username: string, password: string, slug?: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  storeName: string;
  slug: string;
  username: string;
  email?: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "kitoblar_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const refreshUser = useCallback(async () => {
    const savedToken = getAuthToken();
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const prevTenantId = localStorage.getItem('kitoblar_tenant_id');
        const newTenantId = data.tenant?.id;
        if (prevTenantId && newTenantId && prevTenantId !== newTenantId) {
          await clearAllData();
        }
        if (newTenantId) {
          localStorage.setItem('kitoblar_tenant_id', newTenantId);
        }
        setUser(data.user);
        setTenant(data.tenant);
        setToken(savedToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setTenant(null);
      }
    } catch {
      console.error("Failed to verify token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string, slug?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, slug }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      const prevTenantId = localStorage.getItem('kitoblar_tenant_id');
      const newTenantId = data.tenant?.id;
      if (prevTenantId && newTenantId && prevTenantId !== newTenantId) {
        await clearAllData();
      }
      if (newTenantId) {
        localStorage.setItem('kitoblar_tenant_id', newTenantId);
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant);
      const tenantSlug = data.tenant?.slug || slug;
      if (tenantSlug) {
        setLocation(`/store/${tenantSlug}/admin`);
      } else {
        setLocation("/admin");
      }
      return true;
    } catch {
      return false;
    }
  };

  const register = async (regData: RegisterData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Xatolik yuz berdi" };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant);
      const tenantSlug = data.tenant?.slug;
      if (tenantSlug) {
        setLocation(`/store/${tenantSlug}/admin`);
      } else {
        setLocation("/admin");
      }
      return { success: true };
    } catch {
      return { success: false, error: "Server bilan bog'lanishda xatolik" };
    }
  };

  const logout = () => {
    const slug = tenant?.slug;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('kitoblar_tenant_id');
    clearAllData();
    setToken(null);
    setUser(null);
    setTenant(null);
    if (slug) {
      setLocation(`/store/${slug}`);
    } else {
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isLoading,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
