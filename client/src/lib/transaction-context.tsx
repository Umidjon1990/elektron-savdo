import React, { createContext, useContext, useState, type ReactNode } from "react";
import { type CartItem } from "@/pages/dashboard";

export interface Transaction {
  id: string;
  date: string; // ISO string
  items: CartItem[];
  totalAmount: number;
  paymentMethod: "cash" | "card";
}

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (items: CartItem[], total: number, method: "cash" | "card") => Transaction;
  getStats: () => {
    todayTotal: number;
    todayCount: number;
    monthTotal: number;
    totalItemsSold: number;
  };
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem("pos_transactions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem("pos_transactions", JSON.stringify(newTransactions));
  };

  const addTransaction = (items: CartItem[], total: number, method: "cash" | "card") => {
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      items,
      totalAmount: total,
      paymentMethod: method,
    };
    saveTransactions([newTransaction, ...transactions]);
    return newTransaction;
  };

  const getStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date.startsWith(today));
    
    return {
      todayTotal: todayTransactions.reduce((acc, t) => acc + t.totalAmount, 0),
      todayCount: todayTransactions.length,
      monthTotal: transactions.reduce((acc, t) => acc + t.totalAmount, 0), // Simplified for mockup
      totalItemsSold: transactions.reduce((acc, t) => acc + t.items.reduce((sum, item) => sum + item.quantity, 0), 0)
    };
  };

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, getStats }}>
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
