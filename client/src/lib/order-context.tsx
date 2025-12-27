import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CartItem } from "./cart-context";

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: any; // JSON field
  totalAmount: number;
  status: "new" | "paid" | "shipped" | "cancelled";
  paymentMethod: "cash" | "card" | "online" | "click" | "payme";
  deliveryType: "pickup" | "delivery";
  createdAt: string;
}

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  addOrder: (order: Omit<Order, "id" | "createdAt" | "status">) => Promise<void>;
  updateOrderStatus: (id: string, status: Order["status"]) => Promise<void>;
  stats: {
    totalRevenue: number;
    totalOrders: number;
    activeCustomers: number;
  };
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json() as Promise<Order[]>;
    },
  });

  const addOrderMutation = useMutation({
    mutationFn: async (order: Omit<Order, "id" | "createdAt" | "status">) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order["status"] }) => {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const addOrder = async (orderData: Omit<Order, "id" | "createdAt" | "status">) => {
    await addOrderMutation.mutateAsync(orderData);
  };

  const updateOrderStatus = async (id: string, status: Order["status"]) => {
    await updateStatusMutation.mutateAsync({ id, status });
  };

  const stats = {
    totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    totalOrders: orders.length,
    activeCustomers: new Set(orders.map(o => o.customerPhone)).size
  };

  return (
    <OrderContext.Provider value={{ orders, isLoading, addOrder, updateOrderStatus, stats }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
}
