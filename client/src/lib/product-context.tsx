import { financialFetch as fetch } from './financial-fetch';
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, type CachedProduct } from "./db";
import { getOnlineStatus, syncProductsFromServer, getProductsFromCache, addProductToCache, updateProductInCache } from "./db/sync";
import { getAuthHeaders, useAuth } from "./auth-context";

interface Product {
  id: string;
  name: string;
  author: string;
  price: number;
  discountPrice?: number | null;
  costPrice: number;
  barcodePrice?: number;
  wholesalePrice?: number;
  stock: number;
  category: string;
  barcode: string;
  image: string;
  unit?: string;
  description?: string;
  metadata?: Record<string, string>;
  supplier?: string;
  supplierPaymentMethod?: string;
  supplierCurrency?: string;
  supplierCurrencyRate?: number;
  supplierOriginalPrice?: number;
  supplierPaidAmount?: number;
  supplierDebtStatus?: string;
  videoUrl?: string;
  sortOrder?: number;
  isNew?: boolean;
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
  const { token } = useAuth();
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

  useEffect(() => {
    if (token && cacheLoaded && !isOffline) {
      queryClient.invalidateQueries({ queryKey: ["products"] });
        for(const key of ["supplier-summary","cash-balance","finance-summary","finance-daily"])queryClient.invalidateQueries({queryKey:[key]});
    }
    if (!token) {
      setCachedProducts([]);
    }
  }, [token]);

  const { data: serverProducts = [], isLoading: serverLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch products");
      const rawProducts = await res.json();
      const products: Product[] = rawProducts.map((p: any) => ({ ...p, costPrice: p.costPrice ?? 0 }));
      
      setCachedProducts(products);
      
      db.products.clear().then(() => db.products.bulkPut(products)).catch((e) => {
        console.error("IndexedDB sync error:", e);
      });
      
      return products;
    },
    enabled: !isOffline && cacheLoaded && !!token,
    // 5 min staleTime — mutations (add/update/delete product) invalidate
    // the cache anyway, so this only affects passive freshness for things
    // changed by other devices. Massively reduces refetches on Kitoblar-size
    // tenants with thousands of products.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Was true — caused full /api/products refetch on EVERY page navigation.
    // For a tenant with 2000 products + images, this was the #1 source of lag.
    refetchOnMount: false,
    retry: 2,
  });

  const products = serverProducts.length > 0 ? serverProducts : cachedProducts;
  const isLoading = !cacheLoaded || (serverLoading && cachedProducts.length === 0);

  const addProductMutation = useMutation({
    mutationFn: async (product: Omit<Product, "id">) => {
      const productWithDefaults = { ...product, costPrice: product.costPrice ?? 0 };
      if (isOffline) throw new Error('Mahsulot kirimi uchun internet kerak');

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
        for(const key of ["supplier-summary","cash-balance","finance-summary","finance-daily"])queryClient.invalidateQueries({queryKey:[key]});
      }
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Product, "id">> }) => {
      if (isOffline) throw new Error('Mahsulotni tahrirlash uchun internet kerak');

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({...data,expectedStock:products.find(p=>p.id===id)?.stock}),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Mahsulot saqlanmadi");
      await updateProductInCache(id, result);
      setCachedProducts(prev => prev.map(p => p.id === id ? result : p));
      return result;
    },
    onSuccess: () => {
      if (!isOffline) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        for(const key of ["supplier-summary","cash-balance","finance-summary","finance-daily"])queryClient.invalidateQueries({queryKey:[key]});
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
      if(isOffline)throw new Error('Mahsulotni o‘chirish uchun internet kerak');
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {const error=await res.json();throw new Error(error.error||"Mahsulot o‘chirilmadi");}
      await db.products.delete(id);setCachedProducts(prev=>prev.filter(p=>p.id!==id));
      return res.json();
    },
    onSuccess: () => {
      if (!isOffline) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        for(const key of ["supplier-summary","cash-balance","finance-summary","finance-daily"])queryClient.invalidateQueries({queryKey:[key]});
      }
    },
  });

  const deleteProduct = async (id: string) => {
    await deleteProductMutation.mutateAsync(id);
  };

  const refreshProducts = async () => {
    if (!isOffline) {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
        for(const key of ["supplier-summary","cash-balance","finance-summary","finance-daily"])queryClient.invalidateQueries({queryKey:[key]});
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
