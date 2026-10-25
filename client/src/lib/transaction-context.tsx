import { Money,localDay,periodBounds } from '@shared/finance';
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
  addTransaction: (items: CartItem[], total: number, method: string, customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }, nasiyaData?: { dueDate: string }, paymentSplits?: Array<{ method: string; amount: number }>, delivery?:any) => Promise<Transaction>;
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
  const { token,tenant } = useAuth();
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

  const addTransaction = async (items: CartItem[], total: number, method: string, customerData?: { customerName?: string; customerPhone?: string; customerInfo?: Record<string, string> }, nasiyaData?: { dueDate: string }, paymentSplits?: Array<{ method: string; amount: number }>, delivery?:any): Promise<Transaction> => {
    total=new Money(total).toDecimalPlaces(2).toNumber();
    const cost=items.reduce((sum,item)=>sum.add(new Money(item.product.costPrice||0).mul(item.quantity)),new Money(0)).toDecimalPlaces(2);
    const profit=new Money(total).sub(cost).toNumber();
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
    if(checkoutAttempt.current&&checkoutAttempt.current.key!==attemptKey){const pending=await db.transactions.get(checkoutAttempt.current.id);if(pending&&!pending.synced)throw new Error('Oldingi to‘lov natijasi kutilmoqda. Avval uni sinxronlang.');}
    if (checkoutAttempt.current?.key !== attemptKey) checkoutAttempt.current = {
      key: attemptKey, id: crypto.randomUUID(), date: new Date().toISOString(),
    };
    const newTransaction: CachedTransaction = {
      tenantId:tenant?.id,
      pendingOperation:'sale',
      delivery,
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
    
    // Persist the intent before the network call so a lost acknowledgement is recoverable.
    await db.transactions.put(newTransaction);
    // Confirm online prices before issuing a receipt. Disconnected tills keep
    // their accepted snapshot and replay it explicitly on reconnection.
    if (getOnlineStatus()) {
      const res = await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ...newTransaction, items, pricingMode: "current" }),
      });
      const result = await res.json();
      if (!res.ok) {
        if(res.status>=400&&res.status<500){await db.transactions.delete(newTransaction.id);checkoutAttempt.current=null;}
        throw Object.assign(new Error(result.error || "To‘lovni saqlab bo‘lmadi"), { items: result.items });
      }
      newTransaction.items = result.items;
      newTransaction.totalProfit = result.totalProfit;
      newTransaction.synced = true;
      newTransaction.pendingOperation=undefined;
    }
    await db.transactions.put(newTransaction);
    checkoutAttempt.current = null;
    for(const key of ["cash-balance","finance-summary","finance-daily"])queryClient.invalidateQueries({queryKey:[key]});
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

  const voidTransaction = async (id:string):Promise<void> => {
 const transaction=await db.transactions.get(id);if(!transaction||transaction.status==='voided')throw new Error('Savdo topilmadi yoki bekor qilingan');
 if(!window.confirm('Savdoni bekor qilish tovarlarni qaytaradi. Qabul qilingan pul shu to‘lov usullariga qaytarilganini tasdiqlaysizmi?'))return;
 const online=getOnlineStatus();
 if(online){
   if(!transaction.synced)await syncPendingTransactions();
   const res=await fetch('/api/transactions/'+id+'/void',{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},body:JSON.stringify({refundConfirmed:true})});
   const result=await res.json();if(!res.ok)throw new Error(result.error||'Bekor qilish saqlanmadi');
 }
 for(const item of transaction.items||[]){const p=await db.products.get(item.product.id);if(p)await db.products.update(p.id,{stock:new Money(p.stock).add(item.quantity).toNumber()});}
 await db.transactions.update(id,{status:'voided',pendingOperation:online?undefined:'void',refundConfirmed:true,synced:online});
 if(online)await queryClient.refetchQueries({queryKey:['products']});
 await queryClient.invalidateQueries({queryKey:['finance-summary']});await loadTransactions();
};

  const getStats = () => {
    const activeTransactions = transactions.filter(t => t.status === "completed");
    
    const today = localDay(new Date());
    const todayTransactions = activeTransactions.filter(t => localDay(t.date)===today);
    
    const now = new Date();
    const startOfMonth = periodBounds("month",undefined,now).dateFrom.toISOString();
    const monthTransactions = activeTransactions.filter(t => t.date >= startOfMonth);
    
    const safeItems = (items: any[]) => (items || []).filter((item: any) => item && item.product);
    
    return {
      todayTotal: todayTransactions.reduce((acc,t)=>acc.add(t.totalAmount),new Money(0)).toNumber(),
      todayCount: todayTransactions.length,
      monthTotal: monthTransactions.reduce((acc,t)=>acc.add(t.totalAmount),new Money(0)).toNumber(),
      totalItemsSold: todayTransactions.reduce((acc, t) => acc + safeItems(t.items).reduce((sum, item) => sum + item.quantity, 0), 0),
      todayProfit: todayTransactions.reduce((acc,t)=>acc.add(t.totalProfit||0),new Money(0)).toNumber(),
      monthProfit: monthTransactions.reduce((acc,t)=>acc.add(t.totalProfit||0),new Money(0)).toNumber()
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
