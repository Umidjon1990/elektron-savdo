import Dexie, { type Table } from 'dexie';

export interface CachedProduct {
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

export interface CachedCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CachedTransaction {
  id: string;
  date: string;
  items: Array<{
    product: CachedProduct;
    quantity: number;
    discount?: number;
  }>;
  totalAmount: number;
  totalProfit: number;
  paymentMethod: 'cash' | 'card';
  synced: boolean;
  status: 'completed' | 'voided' | 'refunded';
}

export interface SyncMeta {
  key: string;
  value: string;
  updatedAt: string;
}

class POSDatabase extends Dexie {
  products!: Table<CachedProduct, string>;
  categories!: Table<CachedCategory, string>;
  transactions!: Table<CachedTransaction, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('kitoblar_pos_db');
    
    this.version(1).stores({
      products: 'id, name, barcode, category',
      categories: 'id, name',
      transactions: 'id, date, synced',
      syncMeta: 'key'
    });
  }
}

export const db = new POSDatabase();

export async function getLastSyncTime(): Promise<string | null> {
  const meta = await db.syncMeta.get('lastSync');
  return meta?.value || null;
}

export async function setLastSyncTime(time: string): Promise<void> {
  await db.syncMeta.put({ key: 'lastSync', value: time, updatedAt: new Date().toISOString() });
}

export async function getCatalogVersion(): Promise<string | null> {
  const meta = await db.syncMeta.get('catalogVersion');
  return meta?.value || null;
}

export async function setCatalogVersion(version: string): Promise<void> {
  await db.syncMeta.put({ key: 'catalogVersion', value: version, updatedAt: new Date().toISOString() });
}

export async function isFirstLoad(): Promise<boolean> {
  const count = await db.products.count();
  return count === 0;
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.products.clear(),
    db.categories.clear(),
    db.transactions.clear(),
    db.syncMeta.clear()
  ]);
}
