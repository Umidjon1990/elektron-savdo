import { createContext, useContext, useState, type ReactNode } from "react";
import { MOCK_PRODUCTS, type Product } from "@/data/mock-products";

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateStock: (id: string, delta: number) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem("pos_products");
      return saved ? JSON.parse(saved) : MOCK_PRODUCTS;
    } catch (e) {
      return MOCK_PRODUCTS;
    }
  });

  // Save to localStorage whenever products change
  const saveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem("pos_products", JSON.stringify(newProducts));
  };

  const addProduct = (newProduct: Omit<Product, "id">) => {
    const product = {
      ...newProduct,
      id: Math.random().toString(36).substr(2, 9),
    };
    saveProducts([product, ...products]);
  };

  const updateStock = (id: string, delta: number) => {
    const updated = products.map((p) =>
      p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
    );
    saveProducts(updated);
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateStock }}>
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
