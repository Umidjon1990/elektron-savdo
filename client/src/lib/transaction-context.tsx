import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type CartItem } from "@/pages/dashboard";
import { db, type CachedTransaction } from "./db";
import { getOnlineStatus, saveTransactionLocally, getTransactionsFromCache, syncPendingTransactions } from "./db/sync";
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
}

interface TransactionContextType {
  transactions: Transaction[];
  pendingCount: number;
  isOffline: boolean;
  addTransaction: (items: CartItem[], total: number, method: string, customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }, nasiyaData?: { dueDate: string }) => Promise<Transaction>;
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

  const addTransaction = async (items: CartItem[], total: number, method: string, customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }, nasiyaData?: { dueDate: string }): Promise<Transaction> => {
    const profit = items.reduce((acc, item) => {
      const costPrice = item.product.costPrice || 0;
      const discount = item.discount || 0;
      const effectivePrice = item.product.price > 0 ? item.product.price : ((item.product as any).barcodePrice || (item.product as any).wholesalePrice || 0);
      const itemProfit = ((effectivePrice * item.quantity) - discount) - (costPrice * item.quantity);
      return acc + itemProfit;
    }, 0);
    
    const newTransaction: CachedTransaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      items: items.map(item => ({
        product: item.product,
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
      paidAmount: 0,
      debtStatus: method === "nasiya" ? "pending" : "none",
    };
    
    await saveTransactionLocally(newTransaction);
    
    for (const item of items) {
      const newStock = item.product.stock - item.quantity;
      await db.products.update(item.product.id, { stock: Math.max(0, newStock) });
    }
    
    if (getOnlineStatus()) {
      syncPendingTransactions().catch(console.error);
    }
    
    await loadTransactions();
    
    return {
      id: newTransaction.id,
      date: newTransaction.date,
      items: items,
      totalAmount: total,
      totalProfit: profit,
      paymentMethod: method,
      synced: newTransaction.synced,
      status: "completed" as const,
      customerName: customerData?.customerName,
      customerPhone: customerData?.customerPhone,
      customerInfo: customerData?.customerInfo,
      dueDate: nasiyaData?.dueDate,
      paidAmount: 0,
      debtStatus: method === "nasiya" ? "pending" : "none",
    };
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
