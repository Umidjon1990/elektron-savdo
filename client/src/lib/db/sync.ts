import { db, type CachedProduct, type CachedCategory, type CachedTransaction, setLastSyncTime, setCatalogVersion, getCatalogVersion } from './index';

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    syncPendingTransactions();
  });
  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

export function getOnlineStatus(): boolean {
  return isOnline;
}

export async function syncProductsFromServer(): Promise<CachedProduct[]> {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    const products: CachedProduct[] = await res.json();
    
    await db.products.clear();
    await db.products.bulkPut(products);
    
    const version = new Date().toISOString();
    await setCatalogVersion(version);
    await setLastSyncTime(version);
    
    return products;
  } catch (error) {
    console.error('Failed to sync products from server:', error);
    throw error;
  }
}

export async function syncCategoriesFromServer(): Promise<CachedCategory[]> {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    const categories: CachedCategory[] = await res.json();
    
    await db.categories.clear();
    await db.categories.bulkPut(categories);
    
    return categories;
  } catch (error) {
    console.error('Failed to sync categories from server:', error);
    throw error;
  }
}

export async function getProductsFromCache(): Promise<CachedProduct[]> {
  return await db.products.toArray();
}

export async function getCategoriesFromCache(): Promise<CachedCategory[]> {
  return await db.categories.toArray();
}

export async function getProductByBarcodeFromCache(barcode: string): Promise<CachedProduct | undefined> {
  return await db.products.where('barcode').equals(barcode).first();
}

export async function updateProductInCache(id: string, updates: Partial<CachedProduct>): Promise<void> {
  await db.products.update(id, updates);
}

export async function addProductToCache(product: CachedProduct): Promise<void> {
  await db.products.put(product);
}

export async function saveTransactionLocally(transaction: Omit<CachedTransaction, 'synced'>): Promise<CachedTransaction> {
  const txn: CachedTransaction = {
    ...transaction,
    synced: false
  };
  await db.transactions.put(txn);
  return txn;
}

export async function getTransactionsFromCache(): Promise<CachedTransaction[]> {
  return await db.transactions.orderBy('date').reverse().toArray();
}

export async function getPendingTransactions(): Promise<CachedTransaction[]> {
  return await db.transactions.where('synced').equals(false).toArray();
}

export async function markTransactionSynced(id: string): Promise<void> {
  await db.transactions.update(id, { synced: true });
}

export async function syncPendingTransactions(): Promise<void> {
  if (!isOnline) return;
  
  const pending = await getPendingTransactions();
  
  for (const txn of pending) {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: txn.id,
          date: txn.date,
          items: txn.items.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.product.price
          })),
          totalAmount: txn.totalAmount,
          paymentMethod: txn.paymentMethod
        })
      });
      
      if (res.ok) {
        await markTransactionSynced(txn.id);
        
        for (const item of txn.items) {
          await fetch(`/api/products/${item.product.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: item.product.stock - item.quantity })
          });
        }
      }
    } catch (error) {
      console.error('Failed to sync transaction:', txn.id, error);
    }
  }
}

export async function initializeOfflineData(): Promise<{ products: CachedProduct[]; categories: CachedCategory[] }> {
  const cachedProducts = await getProductsFromCache();
  const cachedCategories = await getCategoriesFromCache();
  
  if (cachedProducts.length === 0 && isOnline) {
    const [products, categories] = await Promise.all([
      syncProductsFromServer(),
      syncCategoriesFromServer()
    ]);
    return { products, categories };
  }
  
  if (isOnline) {
    Promise.all([
      syncProductsFromServer(),
      syncCategoriesFromServer()
    ]).catch(console.error);
  }
  
  return { products: cachedProducts, categories: cachedCategories };
}
