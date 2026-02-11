import { db } from "@db";
import { users, products, orders, categories, transactions, tenants } from "@shared/schema";
import type { User, InsertUser, Product, InsertProduct, Order, InsertOrder, Category, InsertCategory, Transaction, InsertTransaction, Tenant, InsertTenant } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  getAllTenantsWithStats(): Promise<(Tenant & { productsCount: number; ordersCount: number; usersCount: number; ownerUsername: string | null })[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<boolean>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string, tenantId?: string): Promise<User | undefined>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // Products (tenant-scoped)
  getAllProducts(tenantId: string): Promise<Product[]>;
  getProductsPaginated(tenantId: string, limit: number, offset: number): Promise<{ products: Product[]; total: number }>;
  getProduct(id: string, tenantId?: string): Promise<Product | undefined>;
  getProductByBarcode(barcode: string, tenantId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>, tenantId?: string): Promise<Product | undefined>;
  deleteProduct(id: string, tenantId?: string): Promise<boolean>;
  reorderProducts(orderedIds: string[], tenantId?: string): Promise<void>;
  
  // Orders (tenant-scoped)
  getAllOrders(tenantId: string): Promise<Order[]>;
  getOrder(id: string, tenantId?: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, tenantId?: string): Promise<Order | undefined>;
  
  // Categories (tenant-scoped)
  getAllCategories(tenantId: string): Promise<Category[]>;
  getCategory(id: string, tenantId?: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>, tenantId?: string): Promise<Category | undefined>;
  deleteCategory(id: string, tenantId?: string): Promise<boolean>;
  
  // Transactions (tenant-scoped)
  getAllTransactions(tenantId: string): Promise<Transaction[]>;
  getTransaction(id: string, tenantId?: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  voidTransaction(id: string, tenantId?: string): Promise<{transaction: Transaction, alreadyVoided: boolean} | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getAllTenantsWithStats(): Promise<(Tenant & { productsCount: number; ordersCount: number; usersCount: number; ownerUsername: string | null })[]> {
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    const results = await Promise.all(allTenants.map(async (tenant) => {
      const [prodCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.tenantId, tenant.id));
      const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.tenantId, tenant.id));
      const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.tenantId, tenant.id));
      const [owner] = await db.select({ username: users.username }).from(users).where(and(eq(users.tenantId, tenant.id), eq(users.role, "owner")));
      return {
        ...tenant,
        productsCount: prodCount?.count || 0,
        ordersCount: orderCount?.count || 0,
        usersCount: userCount?.count || 0,
        ownerUsername: owner?.username || null,
      };
    }));
    return results;
  }

  async deleteTenant(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await tx.delete(transactions).where(eq(transactions.tenantId, id));
      await tx.delete(orders).where(eq(orders.tenantId, id));
      await tx.delete(products).where(eq(products.tenantId, id));
      await tx.delete(categories).where(eq(categories.tenantId, id));
      await tx.delete(users).where(eq(users.tenantId, id));
      const [deleted] = await tx.delete(tenants).where(eq(tenants.id, id)).returning();
      return !!deleted;
    });
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    return updated;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string, tenantId?: string): Promise<User | undefined> {
    if (tenantId) {
      const [user] = await db.select().from(users).where(
        and(eq(users.username, username), eq(users.tenantId, tenantId))
      );
      return user;
    }
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Products (tenant-scoped)
  async getAllProducts(tenantId: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(products.sortOrder, products.name);
  }

  async getProductsPaginated(tenantId: string, limit: number, offset: number): Promise<{ products: Product[]; total: number }> {
    const [productList, countResult] = await Promise.all([
      db.select().from(products)
        .where(eq(products.tenantId, tenantId))
        .orderBy(products.sortOrder, products.name)
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(products)
        .where(eq(products.tenantId, tenantId))
    ]);
    return { products: productList, total: countResult[0]?.count || 0 };
  }

  async reorderProducts(orderedIds: string[], tenantId?: string): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(products).set({ sortOrder: i }).where(eq(products.id, orderedIds[i]));
    }
  }

  async getProduct(id: string, tenantId?: string): Promise<Product | undefined> {
    if (tenantId) {
      const [product] = await db.select().from(products).where(
        and(eq(products.id, id), eq(products.tenantId, tenantId))
      );
      return product;
    }
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductByBarcode(barcode: string, tenantId: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(
      and(eq(products.barcode, barcode), eq(products.tenantId, tenantId))
    );
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>, tenantId?: string): Promise<Product | undefined> {
    const condition = tenantId 
      ? and(eq(products.id, id), eq(products.tenantId, tenantId))
      : eq(products.id, id);
    const [updated] = await db.update(products).set(productData).where(condition).returning();
    return updated;
  }

  async deleteProduct(id: string, tenantId?: string): Promise<boolean> {
    const condition = tenantId 
      ? and(eq(products.id, id), eq(products.tenantId, tenantId))
      : eq(products.id, id);
    const result = await db.delete(products).where(condition);
    return (result.rowCount ?? 0) > 0;
  }

  // Orders (tenant-scoped)
  async getAllOrders(tenantId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string, tenantId?: string): Promise<Order | undefined> {
    if (tenantId) {
      const [order] = await db.select().from(orders).where(
        and(eq(orders.id, id), eq(orders.tenantId, tenantId))
      );
      return order;
    }
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string, tenantId?: string): Promise<Order | undefined> {
    const condition = tenantId 
      ? and(eq(orders.id, id), eq(orders.tenantId, tenantId))
      : eq(orders.id, id);
    const [updated] = await db.update(orders).set({ status }).where(condition).returning();
    return updated;
  }

  // Categories (tenant-scoped)
  async getAllCategories(tenantId: string): Promise<Category[]> {
    return await db.select().from(categories)
      .where(eq(categories.tenantId, tenantId));
  }

  async getCategory(id: string, tenantId?: string): Promise<Category | undefined> {
    if (tenantId) {
      const [category] = await db.select().from(categories).where(
        and(eq(categories.id, id), eq(categories.tenantId, tenantId))
      );
      return category;
    }
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, categoryData: Partial<InsertCategory>, tenantId?: string): Promise<Category | undefined> {
    const condition = tenantId 
      ? and(eq(categories.id, id), eq(categories.tenantId, tenantId))
      : eq(categories.id, id);
    const [updated] = await db.update(categories).set(categoryData).where(condition).returning();
    return updated;
  }

  async deleteCategory(id: string, tenantId?: string): Promise<boolean> {
    const condition = tenantId 
      ? and(eq(categories.id, id), eq(categories.tenantId, tenantId))
      : eq(categories.id, id);
    const result = await db.delete(categories).where(condition);
    return true;
  }

  // Transactions (tenant-scoped)
  async getAllTransactions(tenantId: string): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .orderBy(desc(transactions.date));
  }

  async getTransaction(id: string, tenantId?: string): Promise<Transaction | undefined> {
    if (tenantId) {
      const [txn] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.tenantId, tenantId))
      );
      return txn;
    }
    const [txn] = await db.select().from(transactions).where(eq(transactions.id, id));
    return txn;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const existing = await this.getTransaction(transaction.id);
    if (existing) {
      return existing;
    }
    const [newTxn] = await db.insert(transactions).values(transaction).returning();
    return newTxn;
  }

  async voidTransaction(id: string, tenantId?: string): Promise<{transaction: Transaction, alreadyVoided: boolean} | undefined> {
    const existing = await this.getTransaction(id, tenantId);
    if (!existing) {
      return undefined;
    }
    
    if (existing.status === "voided") {
      return { transaction: existing, alreadyVoided: true };
    }
    
    const items = existing.items as Array<{product: {id: string; stock: number}, quantity: number}>;
    for (const item of items) {
      const product = await this.getProduct(item.product.id);
      if (product) {
        await this.updateProduct(item.product.id, { 
          stock: product.stock + item.quantity 
        });
      }
    }
    
    const [updated] = await db
      .update(transactions)
      .set({ status: "voided" })
      .where(eq(transactions.id, id))
      .returning();
    return { transaction: updated, alreadyVoided: false };
  }
}

export const storage = new DatabaseStorage();
