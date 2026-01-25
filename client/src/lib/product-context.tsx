import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, type CachedProduct } from "./db";
import { getOnlineStatus, syncProductsFromServer, getProductsFromCache, addProductToCache, updateProductInCache } from "./db/sync";

interface Product {
  id: string;
  name: string;
  author: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  barcode: string;
  image: string;
  videoUrl?: string;
  sortOrder?: number;
}

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  isOffline: boolean;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateStock: (id: string, delta: number) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Omit<Product, "id">>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(!getOnlineStatus());
  const [cachedProducts, setCachedProducts] = useState<Product[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    const loadCache = async () => {
      const cached = await getProductsFromCache();
      if (cached.length > 0) {
        setCachedProducts(cached);
      }
      setCacheLoaded(true);
    };
    loadCache();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: serverProducts = [], isLoading: serverLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const rawProducts = await res.json();
      const products: Product[] = rawProducts.map((p: any) => ({ ...p, costPrice: p.costPrice ?? 0 }));
      
      await db.products.clear();
      await db.products.bulkPut(products);
      setCachedProducts(products);
      
      return products;
    },
    enabled: !isOffline && cacheLoaded,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const products = serverProducts.length > 0 ? serverProducts : cachedProducts;
  const isLoading = !cacheLoaded || (serverLoading && cachedProducts.length === 0);

  const addProductMutation = useMutation({
    mutationFn: async (product: Omit<Product, "id">) => {
      const productWithDefaults = { ...product, costPrice: product.costPrice ?? 0 };
      if (isOffline) {
        const tempId = 'temp_' + Math.random().toString(36).substr(2, 9);
        const newProduct = { ...productWithDefaults, id: tempId } as Product;
        await addProductToCache(newProduct);
        setCachedProducts(prev => [...prev, newProduct]);
        return newProduct;
      }
      
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productWithDefaults),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add product");
      }
      const newProduct = await res.json();
      await addProductToCache({ ...newProduct, costPrice: newProduct.costPrice ?? 0 });
      return newProduct;
    },
    onSuccess: () => {
      if (!isOffline) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Product, "id">> }) => {
      await updateProductInCache(id, data);
      setCachedProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      
      if (isOffline) {
        return { id, ...data };
      }
      
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return res.json();
    },
    onSuccess: () => {
      if (!isOffline) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
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

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.products.delete(id);
      setCachedProducts(prev => prev.filter(p => p.id !== id));
      
      if (isOffline) {
        return { success: true };
      }
      
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Mahsulotni o'chirishda xatolik");
      return res.json();
    },
    onSuccess: () => {
      if (!isOffline) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    },
  });

  const deleteProduct = async (id: string) => {
    await deleteProductMutation.mutateAsync(id);
  };

  const refreshProducts = async () => {
    if (!isOffline) {
      await syncProductsFromServer();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  };

  return (
    <ProductContext.Provider
      value={{ products, isLoading, isOffline, addProduct, updateStock, updateProduct, deleteProduct, refreshProducts }}
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
