import { createContext, useContext, useState, type ReactNode } from "react";
import { type CartItem } from "./cart-context";

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  totalAmount: number;
  status: "new" | "paid" | "shipped" | "cancelled";
  paymentMethod: "cash" | "card" | "online" | "click" | "payme";
  date: string;
  deliveryType: "pickup" | "delivery";
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "date" | "status">) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  stats: {
    totalRevenue: number;
    totalOrders: number;
    activeCustomers: number;
  };
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or default to mock data
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem("orders");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse orders from localStorage", e);
      }
    }
    return [
      {
        id: "ORD-001",
        customerName: "Azizbek T.",
        customerPhone: "+998 90 123 45 67",
        items: [],
        totalAmount: 150000,
        status: "new",
        paymentMethod: "click",
        date: new Date().toISOString(),
        deliveryType: "delivery"
      },
      {
        id: "ORD-002",
        customerName: "Malika K.",
        customerPhone: "+998 93 987 65 43",
        items: [],
        totalAmount: 85000,
        status: "paid",
        paymentMethod: "cash",
        date: new Date(Date.now() - 86400000).toISOString(),
        deliveryType: "pickup"
      }
    ];
  });

  // Save to localStorage whenever orders change
  const saveOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem("orders", JSON.stringify(newOrders));
  };

  const addOrder = (orderData: Omit<Order, "id" | "date" | "status">) => {
    const newOrder: Order = {
      ...orderData,
      id: `ORD-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString(),
      status: "new"
    };
    saveOrders([newOrder, ...orders]);
  };

  const updateOrderStatus = (id: string, status: Order["status"]) => {
    const newOrders = orders.map(o => o.id === id ? { ...o, status } : o);
    saveOrders(newOrders);
  };

  const stats = {
    totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    totalOrders: orders.length,
    activeCustomers: new Set(orders.map(o => o.customerPhone)).size
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, stats }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrders must be used within a OrderProvider");
  }
  return context;
}
