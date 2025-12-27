import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Product {
  id: string;
  name: string;
  author: string;
  price: number;
  stock: number;
  category: string;
  barcode: string;
  image: string;
}

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateStock: (id: string, delta: number) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Omit<Product, "id">>) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json() as Promise<Product[]>;
    },
  });

  const addProductMutation = useMutation({
    mutationFn: async (product: Omit<Product, "id">) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error("Failed to add product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Product, "id">> }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const addProduct = async (product: Omit<Product, "id">) => {
    await addProductMutation.mutateAsync(product);
  };

  const updateStock = async (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    await updateProductMutation.mutateAsync({ 
      id, 
      data: { stock: Math.max(0, product.stock + delta) } 
    });
  };

  const updateProduct = async (id: string, updates: Partial<Omit<Product, "id">>) => {
    await updateProductMutation.mutateAsync({ id, data: updates });
  };

  return (
    <ProductContext.Provider
      value={{ products, isLoading, addProduct, updateStock, updateProduct }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
