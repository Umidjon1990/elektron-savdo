import { salePrice } from "@shared/pricing";
import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type CartItem } from "@/pages/dashboard";
import { db, type CachedTransaction } from "./db";
import { getOnlineStatus, getTransactionsFromCache, syncPendingTransactions } from "./db/sync";
import { getAuthHeaders } from "./auth-context";
import { useAuth } from "./auth-context";

export interface Transaction {
  id: string;
  date: string;
  items: CartItem[];
  totalAmount: number;
  totalProfit: number;
  paymentMethod: string;
  synced?: boolean;
  status: "completed" | "voided" | "refunded";
  customerName?: string;
  customerPhone?: string;
  customerInfo?: Record<string, string>;
  dueDate?: string;
  paidAmount?: number;
  debtStatus?: string;
  paymentSplits?: Array<{ method: string; amount: number }>;
}

interface TransactionContextType {
  transactions: Transaction[];
  pendingCount: number;
  isOffline: boolean;
  addTransaction: (items: CartItem[], total: number, method: string, customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }, nasiyaData?: { dueDate: string }, paymentSplits?: Array<{ method: string; amount: number }>) => Promise<Transaction>;
  voidTransaction: (id: string) => Promise<void>;
  getStats: () => {
    todayTotal: number;
    todayCount: number;
    monthTotal: number;
    totalItemsSold: number;
    todayProfit: number;
    monthProfit: number;
  };
  syncTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!getOnlineStatus());
  const [isLoaded, setIsLoaded] = useState(false);
  const checkoutAttempt = useRef<{ key: string; id: string; date: string } | null>(null);

  useEffect(() => {
    if (token) {
      loadTransactions();
    } else {
      setTransactions([]);
      setPendingCount(0);
    }
  }, [token]);

  const loadTransactions = async () => {
    try {
      const cached = await getTransactionsFromCache();
      const mapped: Transaction[] = cached.map(t => ({
        id: t.id,
        date: t.date,
        items: t.items,
        totalAmount: t.totalAmount,
        totalProfit: t.totalProfit || 0,
        paymentMethod: t.paymentMethod,
        synced: t.synced,
        status: t.status || "completed",
        customerName: t.customerName,
        customerPhone: t.customerPhone,
        customerInfo: t.customerInfo,
        dueDate: t.dueDate,
        paidAmount: t.paidAmount || 0,
        debtStatus: t.debtStatus || "none",
        paymentSplits: t.paymentSplits,
      }));
      setTransactions(mapped);
      setPendingCount(cached.filter(t => !t.synced).length);
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadTransactions();

    const handleOnline = async () => {
      setIsOffline(false);
      await syncPendingTransactions();
      await loadTransactions();
    };
    
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addTransaction = async (items: CartItem[], total: number, method: string, customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }, nasiyaData?: { dueDate: string }, paymentSplits?: Array<{ method: string; amount: number }>): Promise<Transaction> => {
    const profit = items.reduce((acc, item) => {
      const costPrice = item.product.costPrice || 0;
      const discount = item.discount || 0;
      const effectivePrice = salePrice(item.product);
      const itemProfit = ((effectivePrice * item.quantity) - discount) - (costPrice * item.quantity);
      return acc + itemProfit;
    }, 0);
    
    const nasiyaSplit = (paymentSplits || []).find(s => s.method === "nasiya");
    const hasNasiyaInSplit = !!(nasiyaSplit && nasiyaSplit.amount > 0);
    const isMixed = !!(paymentSplits && paymentSplits.length > 0);
    const initialPaid = isMixed
      ? (hasNasiyaInSplit ? Math.max(0, total - (nasiyaSplit?.amount || 0)) : total)
      : (method === "nasiya" ? 0 : 0);
    const initialDebtStatus = isMixed
      ? (hasNasiyaInSplit ? "pending" : "none")
      : (method === "nasiya" ? "pending" : "none");

    const attemptKey = JSON.stringify({ items, total, method, customerData, nasiyaData, paymentSplits });
    if (checkoutAttempt.current?.key !== attemptKey) checkoutAttempt.current = {
      key: attemptKey, id: crypto.randomUUID(), date: new Date().toISOString(),
    };
    const newTransaction: CachedTransaction = {
      id: checkoutAttempt.current.id,
      date: checkoutAttempt.current.date,
      pricingVersion: 1,
      pricingMode: getOnlineStatus() ? "current" : "snapshot",
      items: items.map(item => ({
        product: { ...item.product, price: salePrice(item.product), regularPrice: item.product.price, discountPrice: null },
        quantity: item.quantity,
        discount: item.discount
      })),
      totalAmount: total,
      totalProfit: profit,
      paymentMethod: method,
      synced: false,
      status: "completed",
      customerName: customerData?.customerName,
      customerPhone: customerData?.customerPhone,
      customerInfo: customerData?.customerInfo,
      dueDate: nasiyaData?.dueDate,
      paidAmount: initialPaid,
      debtStatus: initialDebtStatus,
      paymentSplits: isMixed ? paymentSplits : undefined,
    };
    
    // Confirm online prices before issuing a receipt. Disconnected tills keep
    // their accepted snapshot and replay it explicitly on reconnection.
    if (getOnlineStatus()) {
      const res = await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ...newTransaction, items, pricingMode: "current" }),
      });
      const result = await res.json();
      if (!res.ok) throw Object.assign(new Error(result.error || "To'lovni saqlab bo'lmadi"), { items: result.items });
      newTransaction.items = result.items;
      newTransaction.totalProfit = result.totalProfit;
      newTransaction.synced = true;
    }
    await db.transactions.put(newTransaction);
    checkoutAttempt.current = null;
    const returnedTransaction: Transaction = {
      id: newTransaction.id,
      date: newTransaction.date,
      items: newTransaction.items,
      totalAmount: total,
      totalProfit: newTransaction.totalProfit,
      paymentMethod: method,
      synced: newTransaction.synced,
      status: "completed" as const,
      customerName: customerData?.customerName,
      customerPhone: customerData?.customerPhone,
      customerInfo: customerData?.customerInfo,
      dueDate: nasiyaData?.dueDate,
      paidAmount: initialPaid,
      debtStatus: initialDebtStatus,
      paymentSplits: isMixed ? paymentSplits : undefined,
    };

    // Online checkout is confirmed above; offline sales retain a local price
    // snapshot. Updating history/stock does not require reloading the whole feed.
    setTransactions(prev => [returnedTransaction, ...prev]);
    if (!newTransaction.synced) setPendingCount(prev => prev + 1);

    // Update cached stock and replay pending offline sales in the background.
    (async () => {
      try {
        // Bulk-update stock in one IndexedDB write instead of N sequential awaits.
        const stockUpdates = items
          .filter(it => it && it.product && it.product.id)
          .map(it => ({ id: it.product.id, stock: Math.max(0, (it.product.stock || 0) - it.quantity) }));
        if (stockUpdates.length > 0) {
          const fresh = await db.products.bulkGet(stockUpdates.map(u => u.id));
          const merged = stockUpdates
            .map((u, i) => fresh[i] ? { ...fresh[i]!, stock: u.stock } : null)
            .filter(Boolean) as any[];
          if (merged.length > 0) await db.products.bulkPut(merged);
        }
        if (getOnlineStatus()) {
          syncPendingTransactions().catch(console.error);
        }
      } catch (err) {
        console.error("Background checkout persistence failed:", err);
      }
    })();

    return returnedTransaction;
  };

  const voidTransaction = async (id: string): Promise<void> => {
    const transaction = await db.transactions.get(id);
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    if (transaction.status === "voided") {
      throw new Error("Transaction already voided");
    }

    const online = getOnlineStatus();

    // ALWAYS restore stock locally first for INSTANT UI feedback. The user
    // clicks "X" in Finance and expects to see the stock in Ombor go up
    // immediately — not after a network round-trip + 5-min stale query
    // refetch. The subsequent refetchQueries below replaces this with the
    // server-truth value, overwriting any drift. Previously this was
    // skipped when online, which is exactly why users reported "X bossam
    // omborga qaytmayapti" — the inventory cache was stale.
    for (const item of (transaction.items || [])) {
      if (!item || !item.product || !item.product.id) continue;
      const product = await db.products.get(item.product.id);
      if (product) {
        await db.products.update(item.product.id, {
          stock: product.stock + item.quantity
        });
      }
    }

    await db.transactions.update(id, { 
      status: "voided",
      synced: false
    });
    
    let serverOk = false;
    if (online) {
      try {
        const { getAuthHeaders } = await import("./auth-context");
        const res = await fetch(`/api/transactions/${id}/void`, { method: "POST", headers: getAuthHeaders() });
        // 409 = already voided on server; treat as success so we still refetch.
        serverOk = res.ok || res.status === 409;
      } catch (error) {
        console.error("Failed to sync voided transaction:", error);
      }
    }

    // refetchQueries (NOT invalidateQueries) FORCES an immediate refetch
    // even with staleTime: 5min and refetchOnMount: false set in
    // product-context. invalidateQueries only marks stale and waits for
    // an active observer — but the user might be on Finance page where
    // the products query observer doesn't exist, so the inventory page
    // would still show old stock when they navigate back.
    if (serverOk) {
      await queryClient.refetchQueries({ queryKey: ["products"] });
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

    await loadTransactions();
  };

  const getStats = () => {
    const activeTransactions = transactions.filter(t => t.status !== "voided");
    
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = activeTransactions.filter(t => t.date.startsWith(today));
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthTransactions = activeTransactions.filter(t => t.date >= startOfMonth);
    
    const safeItems = (items: any[]) => (items || []).filter((item: any) => item && item.product);
    
    return {
      todayTotal: todayTransactions.reduce((acc, t) => acc + t.totalAmount, 0),
      todayCount: todayTransactions.length,
      monthTotal: monthTransactions.reduce((acc, t) => acc + t.totalAmount, 0),
      totalItemsSold: todayTransactions.reduce((acc, t) => acc + safeItems(t.items).reduce((sum, item) => sum + item.quantity, 0), 0),
      todayProfit: todayTransactions.reduce((acc, t) => acc + (t.totalProfit || 0), 0),
      monthProfit: monthTransactions.reduce((acc, t) => acc + (t.totalProfit || 0), 0)
    };
  };

  const syncTransactions = async () => {
    if (!isOffline) {
      await syncPendingTransactions();
      await loadTransactions();
    }
  };

  return (
    <TransactionContext.Provider value={{ 
      transactions, 
      pendingCount, 
      isOffline, 
      addTransaction, 
      voidTransaction,
      getStats, 
      syncTransactions 
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error("useTransactions must be used within a TransactionProvider");
  }
  return context;
}
