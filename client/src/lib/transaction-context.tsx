import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type CartItem } from "@/pages/dashboard";
import { db, type CachedTransaction } from "./db";
import { getOnlineStatus, saveTransactionLocally, getTransactionsFromCache, syncPendingTransactions } from "./db/sync";

export interface Transaction {
  id: string;
  date: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: "cash" | "card";
  synced?: boolean;
  status: "completed" | "voided" | "refunded";
}

interface TransactionContextType {
  transactions: Transaction[];
  pendingCount: number;
  isOffline: boolean;
  addTransaction: (items: CartItem[], total: number, method: "cash" | "card") => Promise<Transaction>;
  voidTransaction: (id: string) => Promise<void>;
  getStats: () => {
    todayTotal: number;
    todayCount: number;
    monthTotal: number;
    totalItemsSold: number;
  };
  syncTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!getOnlineStatus());
  const [isLoaded, setIsLoaded] = useState(false);

  const loadTransactions = async () => {
    try {
      const cached = await getTransactionsFromCache();
      const mapped: Transaction[] = cached.map(t => ({
        id: t.id,
        date: t.date,
        items: t.items,
        totalAmount: t.totalAmount,
        paymentMethod: t.paymentMethod,
        synced: t.synced,
        status: t.status || "completed"
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

  const addTransaction = async (items: CartItem[], total: number, method: "cash" | "card"): Promise<Transaction> => {
    const newTransaction: CachedTransaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      items: items.map(item => ({
        product: item.product,
        quantity: item.quantity
      })),
      totalAmount: total,
      paymentMethod: method,
      synced: false,
      status: "completed"
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
      paymentMethod: method,
      synced: newTransaction.synced,
      status: "completed" as const
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
    
    for (const item of transaction.items) {
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
    
    if (getOnlineStatus()) {
      try {
        await fetch(`/api/transactions/${id}/void`, { method: "POST" });
      } catch (error) {
        console.error("Failed to sync voided transaction:", error);
      }
    }
    
    await loadTransactions();
  };

  const getStats = () => {
    const activeTransactions = transactions.filter(t => t.status !== "voided");
    
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = activeTransactions.filter(t => t.date.startsWith(today));
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthTransactions = activeTransactions.filter(t => t.date >= startOfMonth);
    
    return {
      todayTotal: todayTransactions.reduce((acc, t) => acc + t.totalAmount, 0),
      todayCount: todayTransactions.length,
      monthTotal: monthTransactions.reduce((acc, t) => acc + t.totalAmount, 0),
      totalItemsSold: activeTransactions.reduce((acc, t) => acc + t.items.reduce((sum, item) => sum + item.quantity, 0), 0)
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
