import { useQueryClient } from '@tanstack/react-query';
import { db } from './db';
import { toast } from 'sonner';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { clearAllData } from "./db";
import {subscriptionState} from '@shared/subscription';

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
  trialEnd?: string|null;
  subscriptionDays?: number;
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
  isExpired: boolean;
  expiredMessage: string;
  refreshUser: () => Promise<void>;
  serverClock: {timestamp:number;receivedAt:number};
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
  const queryClient=useQueryClient();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState("");
  const [serverClock,setServerClock]=useState(()=>({timestamp:Date.now(),receivedAt:performance.now()}));
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
        if(getAuthToken()!==savedToken)return;
        if(data.serverNow)setServerClock({timestamp:Date.parse(data.serverNow),receivedAt:performance.now()});
        const prevTenantId = localStorage.getItem('kitoblar_tenant_id');
        const newTenantId = data.tenant?.id;
        if (prevTenantId && newTenantId && prevTenantId !== newTenantId) {
          await clearAllData();
          queryClient.clear();
        }
        if (newTenantId) {
          localStorage.setItem('kitoblar_tenant_id', newTenantId);
          if(await db.transactions.filter(t=>!t.synced&&!t.tenantId).count())toast.warning('Yuborilmagan eski savdolar bor. Ularni hisob egasi bilan solishtirish kerak.');
        }
        setUser(data.user);
        setTenant(data.tenant);
        setToken(savedToken);
        setIsExpired(false);
        setExpiredMessage("");
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.expired) {
          setIsExpired(true);
          setExpiredMessage(data.error || "Sinov muddatingiz tugagan");
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          setTenant(null);
        }
      } else if(res.status===401||res.status===404) {
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

  useEffect(()=>{
    if(!token)return;
    let cancelled=false,busy=false;
    const refresh=async()=>{
      if(busy||!navigator.onLine)return;busy=true;
      try{
        const res=await fetch('/api/auth/subscription',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
        if(!res.ok)return;const data=await res.json();
        if(cancelled||getAuthToken()!==token)return;
        if(data.serverNow)setServerClock({timestamp:Date.parse(data.serverNow),receivedAt:performance.now()});
        setTenant(data.tenant);setIsExpired(false);setExpiredMessage('');
      }catch{/* Existing verified deadline keeps running while offline. */}finally{busy=false;}
    };
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    void refresh();const timer=setInterval(refresh,30000);
    window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',visible);
    return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',visible);};
  },[token]);

  useEffect(()=>{
    if(user?.isSuper||!tenant){setIsExpired(false);return;}
    const now=serverClock.timestamp+performance.now()-serverClock.receivedAt,state=subscriptionState(tenant,now);
    const block=()=>{setIsExpired(true);setExpiredMessage(state.suspended?'Do‘koningiz to‘xtatilgan. Admin bilan bog‘laning.':'Obuna muddati tugagan. To‘lov qiling va admin bilan bog‘laning.');};
    setIsExpired(state.blocked);
    if(state.blocked){block();return;}
    if(state.remainingMs===null)return;
    // Long deadlines are rechecked by the heartbeat; avoid setTimeout overflow.
    const timer=setTimeout(()=>{
      if(subscriptionState(tenant,serverClock.timestamp+performance.now()-serverClock.receivedAt).blocked)block();
    },Math.min(state.remainingMs+10,2147483647));
    return()=>clearTimeout(timer);
  },[tenant,user?.isSuper,serverClock]);

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
      if(data.serverNow)setServerClock({timestamp:Date.parse(data.serverNow),receivedAt:performance.now()});
      const prevTenantId = localStorage.getItem('kitoblar_tenant_id');
      const newTenantId = data.tenant?.id;
      if (prevTenantId && newTenantId && prevTenantId !== newTenantId) {
        await clearAllData();
        queryClient.clear();
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
    queryClient.clear();
    setToken(null);
    setUser(null);
    setTenant(null);
    if (slug) {
      setLocation(`/store/${slug}`);
    } else {
      setLocation("/login");
    }
  };

  const currentSubscription=tenant?subscriptionState(tenant,serverClock.timestamp+performance.now()-serverClock.receivedAt):null;
  const blocked=!user?.isSuper&&(isExpired||!!currentSubscription?.blocked);
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
        isExpired:blocked,
        expiredMessage:expiredMessage||(currentSubscription?.suspended?'Do‘koningiz to‘xtatilgan. Admin bilan bog‘laning.':'Obuna muddati tugagan. To‘lov qiling va admin bilan bog‘laning.'),
        refreshUser,
        serverClock,
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
