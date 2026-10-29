import { db, type CachedProduct, type CachedCategory, type CachedTransaction, setLastSyncTime, setCatalogVersion, getCatalogVersion } from './index';
import { getAuthHeaders } from '../auth-context';

const activeTenant=()=>localStorage.getItem('kitoblar_tenant_id');
const currentTransactions=()=>db.transactions.filter(t=>!!activeTenant()&&t.tenantId===activeTenant()).reverse().sortBy('date');

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
    const tenantAtStart=activeTenant(),headers=getAuthHeaders();
    const sameSession=()=>activeTenant()===tenantAtStart&&getAuthHeaders().Authorization===headers.Authorization;
    const res = await fetch('/api/products', { headers });
    if (!res.ok) throw new Error('Failed to fetch products');
    const products: CachedProduct[] = await res.json();
    
    if(!sameSession())return [];
    await db.transaction('rw',db.products,db.syncMeta,async()=>{
      if(!sameSession())return;
      await db.products.clear();
      await db.products.bulkPut(products);
      const version = new Date().toISOString();
      await setCatalogVersion(version);
      await setLastSyncTime(version);
    });
    return sameSession()?products:[];
  } catch (error) {
    console.error('Failed to sync products from server:', error);
    throw error;
  }
}

export async function syncCategoriesFromServer(): Promise<CachedCategory[]> {
  try {
    const tenantAtStart=activeTenant(),headers=getAuthHeaders();
    const sameSession=()=>activeTenant()===tenantAtStart&&getAuthHeaders().Authorization===headers.Authorization;
    const res = await fetch('/api/categories', { headers });
    if (!res.ok) throw new Error('Failed to fetch categories');
    const categories: CachedCategory[] = await res.json();
    
    if(!sameSession())return [];
    await db.transaction('rw',db.categories,async()=>{
      if(!sameSession())return;
      await db.categories.clear();
      await db.categories.bulkPut(categories);
    });
    return sameSession()?categories:[];
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

export async function syncTransactionsFromServer(): Promise<CachedTransaction[]> {
  try {
    const tenantAtStart=activeTenant();
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      return await currentTransactions();
    }
    const res = await fetch('/api/transactions', { headers });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const serverTransactions = await res.json();
    if(activeTenant()!==tenantAtStart||getAuthHeaders().Authorization!==headers.Authorization)return currentTransactions();
    
    // Authoritative reconciliation: every transaction the server returns must
    // be marked synced=true locally — including ones already present. Without
    // this, a local txn that was POST'ed successfully but whose
    // `markTransactionSynced` step failed (network drop, tab close, 4xx race)
    // stays `synced=false` forever, causing the Moliya page to double-count it
    // on top of the server total. This was the root cause of mobile showing
    // higher Tushum than desktop.
    const serverIds = new Set<string>();
    for (const txn of serverTransactions) {
      serverIds.add(txn.id);
      const existing = await db.transactions.get(txn.id);
      if (!existing) {
        await db.transactions.put({
          id: txn.id,
          date: txn.createdAt || txn.date,
          items: txn.items || [],
          totalAmount: txn.totalAmount,
          totalProfit: txn.totalProfit || 0,
          paymentMethod: txn.paymentMethod,
          synced: true,
          serverAcknowledged:true,
          pendingOperation:undefined,
          tenantId:tenantAtStart||undefined,
          status: txn.status || 'completed',
          customerName: txn.customerName,
          customerPhone: txn.customerPhone,
          customerInfo: txn.customerInfo,
          dueDate: txn.dueDate,
          paidAmount: txn.paidAmount || 0,
          debtStatus: txn.debtStatus || "none",
          paymentSplits: txn.paymentSplits || undefined,
        });
      } else if (existing.pendingOperation === 'void' && txn.status !== 'voided') {
        // A pending local reversal is not overwritten by the server's old sale.
        continue;
      } else {
        // Already in IDB — reconcile flag and status with server truth.
        await db.transactions.update(txn.id, {
          items:txn.items||[],
          paymentSplits:txn.paymentSplits||undefined,
          synced: true,
          serverAcknowledged:true,
          pendingOperation:undefined,
          tenantId:tenantAtStart||undefined,
          status: txn.status || 'completed',
          totalAmount: txn.totalAmount,
          totalProfit: txn.totalProfit || 0,
          paidAmount: txn.paidAmount || 0,
          debtStatus: txn.debtStatus || "none",
        });
      }
    }

    // An unacknowledged sale never expires. Retain it until explicitly reconciled.

    return await currentTransactions();
  } catch (error) {
    console.error('Failed to sync transactions from server:', error);
    return await currentTransactions();
  }
}

export async function getTransactionsFromCache(): Promise<CachedTransaction[]> {
  if (isOnline) {
    return await syncTransactionsFromServer();
  }
  return await currentTransactions();
}

export async function getPendingTransactions(): Promise<CachedTransaction[]> {
  return await db.transactions.filter(txn => txn.synced === false && !!activeTenant() && txn.tenantId===activeTenant()).toArray();
}

export async function markTransactionSynced(id: string): Promise<void> {
  await db.transactions.update(id, { synced: true,serverAcknowledged:true });
}

let syncRunning=false;
export async function syncPendingTransactions(): Promise<void> {
  if (!isOnline || syncRunning) return;
  syncRunning=true;
  try {
  const tenantAtStart=activeTenant();
  const pending = await getPendingTransactions();
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...getAuthHeaders() };
  
  for (const txn of pending) {
    if(activeTenant()!==tenantAtStart||getAuthHeaders().Authorization!==headers.Authorization)break;
    try {
      // An acknowledged sale may now contain updated debt balances and server
      // splits. A reversal must not resubmit those as a new checkout intent.
      const res = txn.serverAcknowledged&&(txn.pendingOperation==='void'||txn.status==='voided')?null:await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: txn.id,
          date: txn.date,
          pricingVersion: 1,
          delivery:txn.delivery,
          pricingMode: txn.pricingMode || "snapshot",
          items: (txn.items || []).filter(item => item && item.product).map(item => ({
            product: {
              id: item.product.id,
              name: item.product.name,
              price: item.product.price,
              discountPrice: item.product.discountPrice,
              regularPrice: item.product.regularPrice,
              costPrice: item.product.costPrice || 0,
              stock: item.product.stock,
              barcode: item.product.barcode
            },
            quantity: item.quantity,
            discount: item.discount || 0,
            adjustmentType:item.adjustmentType,
            adjustmentInputType:item.adjustmentInputType,
            adjustmentValue:item.adjustmentValue
          })),
          totalAmount: txn.totalAmount,
          totalProfit: txn.totalProfit || 0,
          paymentMethod: txn.paymentMethod,
          status: "completed",
          customerName: txn.customerName,
          customerPhone: txn.customerPhone,
          customerInfo: txn.customerInfo,
          dueDate: txn.dueDate,
          paidAmount: txn.paidAmount || 0,
          debtStatus: txn.debtStatus || "none",
          paymentSplits: txn.paymentSplits,
        })
      });
      
      if (!res||res.ok) {
        if(activeTenant()!==tenantAtStart||getAuthHeaders().Authorization!==headers.Authorization)break;
        const latest=await db.transactions.get(txn.id);
        if(!latest||latest.tenantId!==tenantAtStart)continue;
        await db.transactions.update(txn.id,{serverAcknowledged:true});
        if(latest.pendingOperation==='void'||latest.status==='voided') {
          const reversal=await fetch(`/api/transactions/${txn.id}/void`,{method:'POST',headers,body:JSON.stringify({refundConfirmed:latest.refundConfirmed===true})});
          if(!reversal.ok)continue;
          await db.transactions.update(txn.id,{synced:true,pendingOperation:undefined});
        }else{
          // Do not erase a reversal queued between the response and this write.
          await db.transactions.where('id').equals(txn.id).modify(current=>{
            if(current.pendingOperation!=='void'&&current.status!=='voided'){
              current.synced=true;current.pendingOperation=undefined;
            }
          });
        }
        // Stock decrement is now done atomically server-side inside
        // POST /api/transactions (storage.createTransaction). The previous
        // per-item sequential PATCH loop here was 1 extra round trip PER
        // ITEM after every sale — the main reason "to'lov qilishda qotmoqda".
      }
    } catch (error) {
      console.error('Failed to sync transaction:', txn.id, error);
    }
  }
  } finally { syncRunning=false; }
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
