import { db } from "@db";
import { users, products, orders, categories, transactions, tenants, expenses, expenseCategories, incomeCategories, debtPayments, cashRegisterEntries, customers, deliveries, auditLogs, shiftHandovers, staffMembers, attendanceRecords, suppliers } from "@shared/schema";
import type { User, InsertUser, Product, InsertProduct, Order, InsertOrder, Category, InsertCategory, Transaction, InsertTransaction, Tenant, InsertTenant, Expense, InsertExpense, ExpenseCategory, InsertExpenseCategory, IncomeCategory, InsertIncomeCategory, DebtPayment, InsertDebtPayment, CashRegisterEntry, InsertCashRegisterEntry, Customer, InsertCustomer, Delivery, InsertDelivery, AuditLog, InsertAuditLog, ShiftHandover, InsertShiftHandover, StaffMember, InsertStaffMember, AttendanceRecord, InsertAttendanceRecord, Supplier, InsertSupplier } from "@shared/schema";
import { eq, desc, sql, and, inArray, gte, lte, or, ilike } from "drizzle-orm";

export interface IStorage {
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  getAllTenantsWithStats(): Promise<(Tenant & { productsCount: number; ordersCount: number; usersCount: number })[]>;
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
  getProductCountsByTenants(tenantIds: string[]): Promise<Map<string, number>>;
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
  reorderCategories(orderedIds: string[], tenantId: string): Promise<void>;
  renameProductCategory(oldName: string, newName: string, tenantId: string): Promise<void>;
  assignProductsToCategory(productIds: string[], categoryName: string, tenantId: string): Promise<void>;
  unassignProductsFromCategory(productIds: string[], tenantId: string): Promise<void>;
  
  // Transactions (tenant-scoped)
  getAllTransactions(tenantId: string): Promise<Transaction[]>;
  getTransaction(id: string, tenantId?: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  voidTransaction(id: string, tenantId?: string): Promise<{transaction: Transaction, alreadyVoided: boolean} | undefined>;

  // Expense Categories (tenant-scoped)
  getExpenseCategories(tenantId: string): Promise<ExpenseCategory[]>;
  createExpenseCategory(cat: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, data: Partial<InsertExpenseCategory>, tenantId?: string): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: string, tenantId?: string): Promise<boolean>;

  getIncomeCategories(tenantId: string): Promise<IncomeCategory[]>;
  createIncomeCategory(cat: InsertIncomeCategory): Promise<IncomeCategory>;
  updateIncomeCategory(id: string, data: Partial<InsertIncomeCategory>, tenantId?: string): Promise<IncomeCategory | undefined>;
  deleteIncomeCategory(id: string, tenantId?: string): Promise<boolean>;

  // Expenses (tenant-scoped)
  getExpenses(tenantId: string, dateFrom?: Date, dateTo?: Date, categoryId?: string): Promise<Expense[]>;
  getExpense(id: string, tenantId?: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, data: Partial<InsertExpense>, tenantId?: string): Promise<Expense | undefined>;
  deleteExpense(id: string, tenantId?: string): Promise<boolean>;

  // Debt payments
  getDebtTransactions(tenantId: string): Promise<Transaction[]>;
  getDebtPayments(transactionId: string, tenantId?: string): Promise<DebtPayment[]>;
  createDebtPayment(payment: InsertDebtPayment): Promise<DebtPayment>;
  updateTransactionDebt(id: string, paidAmount: number, debtStatus: string, tenantId?: string): Promise<Transaction | undefined>;

  // Cash Register Entries (kirim/chiqim journal)
  getCashRegisterEntries(tenantId: string, type?: string, dateFrom?: Date, dateTo?: Date): Promise<CashRegisterEntry[]>;
  createCashRegisterEntry(entry: InsertCashRegisterEntry): Promise<CashRegisterEntry>;
  updateCashRegisterEntry(id: string, data: Partial<InsertCashRegisterEntry>, tenantId?: string): Promise<CashRegisterEntry | undefined>;
  deleteCashRegisterEntry(id: string, tenantId?: string): Promise<boolean>;
  getCashRegisterBalance(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<{ cash: number; card: number; nasiya: number; withdrawn: number; totalIncome: number; totalExpense: number; total: number }>;

  // Customers
  getCustomers(tenantId: string, search?: string, page?: number, limit?: number): Promise<{ customers: Customer[]; total: number }>;
  getCustomer(id: string, tenantId?: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string, tenantId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>, tenantId?: string): Promise<Customer | undefined>;
  deleteCustomer(id: string, tenantId?: string): Promise<boolean>;

  // Deliveries
  getDeliveries(tenantId: string, filters?: { status?: string; courier?: string; courierId?: string; dateFrom?: Date; dateTo?: Date }): Promise<Delivery[]>;
  getDeliveriesByOrder(orderId: string, tenantId?: string): Promise<Delivery[]>;
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  updateDelivery(id: string, data: Partial<InsertDelivery>, tenantId?: string): Promise<Delivery | undefined>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(tenantId: string, entityType?: string, entityId?: string): Promise<AuditLog[]>;

  // Orders enhanced
  updateOrder(id: string, data: Partial<InsertOrder>, tenantId?: string): Promise<Order | undefined>;
  getOrdersFiltered(tenantId: string, filters?: { status?: string; paymentStatus?: string; deliveryType?: string; dateFrom?: Date; dateTo?: Date }): Promise<Order[]>;

  // Financial summary
  getFinancialSummary(tenantId: string, dateFrom: Date, dateTo: Date): Promise<{ revenue: number; expensesTotal: number; profit: number; totalProfit: number; paymentBreakdown: Record<string, number>; transactionCount: number }>;

  // Shift Handovers
  getShiftHandovers(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<ShiftHandover[]>;
  createShiftHandover(data: InsertShiftHandover): Promise<ShiftHandover>;
  updateShiftHandoverStatus(id: string, tenantId: string, status: string, confirmedAt?: Date): Promise<ShiftHandover | undefined>;

  // Staff Members
  getStaffMembers(tenantId: string): Promise<StaffMember[]>;
  getStaffMember(id: string, tenantId?: string): Promise<StaffMember | undefined>;
  getStaffByToken(token: string): Promise<StaffMember | undefined>;
  createStaffMember(data: InsertStaffMember): Promise<StaffMember>;
  updateStaffMember(id: string, data: Partial<InsertStaffMember>, tenantId?: string): Promise<StaffMember | undefined>;
  deleteStaffMember(id: string, tenantId?: string): Promise<boolean>;

  // Suppliers
  getSuppliers(tenantId: string): Promise<Supplier[]>;
  createSupplier(data: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, data: Partial<InsertSupplier>, tenantId?: string): Promise<Supplier | undefined>;
  deleteSupplier(id: string, tenantId?: string): Promise<boolean>;

  // Attendance
  getAttendanceRecords(tenantId: string, staffId?: string, dateFrom?: Date, dateTo?: Date): Promise<AttendanceRecord[]>;
  createAttendanceRecord(data: InsertAttendanceRecord): Promise<AttendanceRecord>;
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

  async getAllTenantsWithStats(): Promise<(Tenant & { productsCount: number; ordersCount: number; usersCount: number })[]> {
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    if (allTenants.length === 0) return [];

    const [prodCounts, orderCounts, userCounts] = await Promise.all([
      db.select({
        tenantId: products.tenantId,
        count: sql<number>`count(*)::int`,
      }).from(products).groupBy(products.tenantId),
      db.select({
        tenantId: orders.tenantId,
        count: sql<number>`count(*)::int`,
      }).from(orders).groupBy(orders.tenantId),
      db.select({
        tenantId: users.tenantId,
        count: sql<number>`count(*)::int`,
      }).from(users).groupBy(users.tenantId),
    ]);

    const prodMap = new Map(prodCounts.map(r => [r.tenantId, r.count]));
    const orderMap = new Map(orderCounts.map(r => [r.tenantId, r.count]));
    const userMap = new Map(userCounts.map(r => [r.tenantId, r.count]));

    return allTenants.map(tenant => ({
      ...tenant,
      productsCount: prodMap.get(tenant.id) || 0,
      ordersCount: orderMap.get(tenant.id) || 0,
      usersCount: userMap.get(tenant.id) || 0,
    }));
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

  async getProductCountsByTenants(tenantIds: string[]): Promise<Map<string, number>> {
    if (tenantIds.length === 0) return new Map();
    const rows = await db.select({
      tenantId: products.tenantId,
      count: sql<number>`count(*)::int`,
    }).from(products)
      .where(inArray(products.tenantId, tenantIds))
      .groupBy(products.tenantId);
    return new Map(rows.map(r => [r.tenantId, r.count]));
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
    if (orderedIds.length === 0) return;
    const cases = sql.join(
      orderedIds.map((id, i) => sql`when ${products.id} = ${id} then ${i}`),
      sql.raw(' ')
    );
    const whereClause = tenantId
      ? and(inArray(products.id, orderedIds), eq(products.tenantId, tenantId))
      : inArray(products.id, orderedIds);
    await db.update(products)
      .set({ sortOrder: sql`case ${cases} end` })
      .where(whereClause);
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
      .where(eq(categories.tenantId, tenantId))
      .orderBy(categories.sortOrder);
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

  async renameProductCategory(oldName: string, newName: string, tenantId: string): Promise<void> {
    await db.update(products)
      .set({ category: newName })
      .where(and(eq(products.category, oldName), eq(products.tenantId, tenantId)));
  }

  async assignProductsToCategory(productIds: string[], categoryName: string, tenantId: string): Promise<void> {
    await db.update(products)
      .set({ category: categoryName })
      .where(and(inArray(products.id, productIds), eq(products.tenantId, tenantId)));
  }

  async unassignProductsFromCategory(productIds: string[], tenantId: string): Promise<void> {
    await db.update(products)
      .set({ category: "" })
      .where(and(inArray(products.id, productIds), eq(products.tenantId, tenantId)));
  }

  async reorderCategories(orderedIds: string[], tenantId: string): Promise<void> {
    if (orderedIds.length === 0) return;
    const cases = sql.join(
      orderedIds.map((id, i) => sql`when ${categories.id} = ${id} then ${i}`),
      sql.raw(' ')
    );
    await db.update(categories)
      .set({ sortOrder: sql`case ${cases} end` })
      .where(and(inArray(categories.id, orderedIds), eq(categories.tenantId, tenantId)));
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
    if (items && items.length > 0) {
      const productIds = items.map(i => i.product.id);
      const qtyById = new Map<string, number>();
      for (const item of items) {
        qtyById.set(item.product.id, (qtyById.get(item.product.id) || 0) + item.quantity);
      }

      await db.transaction(async (tx) => {
        const dbProducts = await tx.select().from(products).where(inArray(products.id, productIds));
        await Promise.all(dbProducts.map(p =>
          tx.update(products)
            .set({ stock: p.stock + (qtyById.get(p.id) || 0) })
            .where(eq(products.id, p.id))
        ));
      });
    }

    const [updated] = await db
      .update(transactions)
      .set({ status: "voided" })
      .where(eq(transactions.id, id))
      .returning();
    return { transaction: updated, alreadyVoided: false };
  }

  // Expense Categories (tenant-scoped)
  async getExpenseCategories(tenantId: string): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories)
      .where(eq(expenseCategories.tenantId, tenantId))
      .orderBy(expenseCategories.sortOrder);
  }

  async createExpenseCategory(cat: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [newCat] = await db.insert(expenseCategories).values(cat).returning();
    return newCat;
  }

  async updateExpenseCategory(id: string, data: Partial<InsertExpenseCategory>, tenantId?: string): Promise<ExpenseCategory | undefined> {
    const condition = tenantId
      ? and(eq(expenseCategories.id, id), eq(expenseCategories.tenantId, tenantId))
      : eq(expenseCategories.id, id);
    const [updated] = await db.update(expenseCategories).set(data).where(condition).returning();
    return updated;
  }

  async deleteExpenseCategory(id: string, tenantId?: string): Promise<boolean> {
    const condition = tenantId
      ? and(eq(expenseCategories.id, id), eq(expenseCategories.tenantId, tenantId))
      : eq(expenseCategories.id, id);
    const result = await db.delete(expenseCategories).where(condition);
    return (result as any).rowCount > 0;
  }

  async getIncomeCategories(tenantId: string): Promise<IncomeCategory[]> {
    return await db.select().from(incomeCategories)
      .where(eq(incomeCategories.tenantId, tenantId))
      .orderBy(incomeCategories.sortOrder);
  }

  async createIncomeCategory(cat: InsertIncomeCategory): Promise<IncomeCategory> {
    const [newCat] = await db.insert(incomeCategories).values(cat).returning();
    return newCat;
  }

  async updateIncomeCategory(id: string, data: Partial<InsertIncomeCategory>, tenantId?: string): Promise<IncomeCategory | undefined> {
    const condition = tenantId
      ? and(eq(incomeCategories.id, id), eq(incomeCategories.tenantId, tenantId))
      : eq(incomeCategories.id, id);
    const [updated] = await db.update(incomeCategories).set(data).where(condition).returning();
    return updated;
  }

  async deleteIncomeCategory(id: string, tenantId?: string): Promise<boolean> {
    const condition = tenantId
      ? and(eq(incomeCategories.id, id), eq(incomeCategories.tenantId, tenantId))
      : eq(incomeCategories.id, id);
    const result = await db.delete(incomeCategories).where(condition);
    return (result.rowCount ?? 0) > 0;
  }

  // Expenses (tenant-scoped)
  async getExpenses(tenantId: string, dateFrom?: Date, dateTo?: Date, categoryId?: string): Promise<Expense[]> {
    const conditions = [eq(expenses.tenantId, tenantId)];
    if (dateFrom) conditions.push(gte(expenses.date, dateFrom));
    if (dateTo) conditions.push(lte(expenses.date, dateTo));
    if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));
    return await db.select().from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.date));
  }

  async getExpense(id: string, tenantId?: string): Promise<Expense | undefined> {
    const condition = tenantId
      ? and(eq(expenses.id, id), eq(expenses.tenantId, tenantId))
      : eq(expenses.id, id);
    const [expense] = await db.select().from(expenses).where(condition);
    return expense;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: string, data: Partial<InsertExpense>, tenantId?: string): Promise<Expense | undefined> {
    const condition = tenantId
      ? and(eq(expenses.id, id), eq(expenses.tenantId, tenantId))
      : eq(expenses.id, id);
    const [updated] = await db.update(expenses).set(data).where(condition).returning();
    return updated;
  }

  async deleteExpense(id: string, tenantId?: string): Promise<boolean> {
    const condition = tenantId
      ? and(eq(expenses.id, id), eq(expenses.tenantId, tenantId))
      : eq(expenses.id, id);
    const result = await db.delete(expenses).where(condition);
    return (result.rowCount ?? 0) > 0;
  }

  // Debt
  async getDebtTransactions(tenantId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(
      and(
        eq(transactions.tenantId, tenantId),
        sql`${transactions.paymentMethod} = 'nasiya'`,
        sql`${transactions.status} != 'voided'`
      )
    ).orderBy(desc(transactions.date));
  }

  async getDebtPayments(transactionId: string, tenantId?: string): Promise<DebtPayment[]> {
    const conditions = [eq(debtPayments.transactionId, transactionId)];
    if (tenantId) conditions.push(eq(debtPayments.tenantId, tenantId));
    return db.select().from(debtPayments).where(and(...conditions)).orderBy(desc(debtPayments.date));
  }

  async createDebtPayment(payment: InsertDebtPayment): Promise<DebtPayment> {
    const [created] = await db.insert(debtPayments).values(payment).returning();
    return created;
  }

  async updateTransactionDebt(id: string, paidAmount: number, debtStatus: string, tenantId?: string): Promise<Transaction | undefined> {
    const conditions = [eq(transactions.id, id)];
    if (tenantId) conditions.push(eq(transactions.tenantId, tenantId));
    const [updated] = await db.update(transactions)
      .set({ paidAmount, debtStatus })
      .where(and(...conditions))
      .returning();
    return updated;
  }

  // Cash Register Entries
  async getCashRegisterEntries(tenantId: string, type?: string, dateFrom?: Date, dateTo?: Date): Promise<CashRegisterEntry[]> {
    const conditions = [eq(cashRegisterEntries.tenantId, tenantId)];
    if (type) conditions.push(eq(cashRegisterEntries.type, type));
    if (dateFrom) conditions.push(gte(cashRegisterEntries.date, dateFrom));
    if (dateTo) conditions.push(lte(cashRegisterEntries.date, dateTo));
    return await db.select().from(cashRegisterEntries)
      .where(and(...conditions))
      .orderBy(desc(cashRegisterEntries.date));
  }

  async createCashRegisterEntry(entry: InsertCashRegisterEntry): Promise<CashRegisterEntry> {
    const [created] = await db.insert(cashRegisterEntries).values(entry).returning();
    return created;
  }

  async updateCashRegisterEntry(id: string, data: Partial<InsertCashRegisterEntry>, tenantId?: string): Promise<CashRegisterEntry | undefined> {
    const condition = tenantId
      ? and(eq(cashRegisterEntries.id, id), eq(cashRegisterEntries.tenantId, tenantId))
      : eq(cashRegisterEntries.id, id);
    const [updated] = await db.update(cashRegisterEntries).set(data).where(condition).returning();
    return updated;
  }

  async deleteCashRegisterEntry(id: string, tenantId?: string): Promise<boolean> {
    const condition = tenantId
      ? and(eq(cashRegisterEntries.id, id), eq(cashRegisterEntries.tenantId, tenantId))
      : eq(cashRegisterEntries.id, id);
    const result = await db.delete(cashRegisterEntries).where(condition);
    return (result.rowCount ?? 0) > 0;
  }

  async getCashRegisterBalance(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<{ cash: number; card: number; nasiya: number; withdrawn: number; totalIncome: number; totalExpense: number; total: number }> {
    const txnConditions = [
      eq(transactions.tenantId, tenantId),
      sql`${transactions.status} != 'voided'`,
    ];
    if (dateFrom) txnConditions.push(gte(transactions.date, dateFrom));
    if (dateTo) txnConditions.push(lte(transactions.date, dateTo));

    const txns = await db.select({
      totalAmount: transactions.totalAmount,
      paymentMethod: transactions.paymentMethod,
      paidAmount: transactions.paidAmount,
      debtStatus: transactions.debtStatus,
    }).from(transactions).where(and(...txnConditions));

    let cash = 0;
    let card = 0;
    let nasiya = 0;

    for (const t of txns) {
      const method = (t.paymentMethod || "cash").toLowerCase();
      if (method === "nasiya") {
        const remaining = t.totalAmount - (t.paidAmount || 0);
        nasiya += remaining;
        cash += t.paidAmount || 0;
      } else if (method === "karta" || method === "card") {
        card += t.totalAmount;
      } else {
        cash += t.totalAmount;
      }
    }

    const entryConditions = [eq(cashRegisterEntries.tenantId, tenantId)];
    if (dateFrom) entryConditions.push(gte(cashRegisterEntries.date, dateFrom));
    if (dateTo) entryConditions.push(lte(cashRegisterEntries.date, dateTo));

    const entries = await db.select().from(cashRegisterEntries).where(and(...entryConditions));

    let withdrawn = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const e of entries) {
      const pt = (e.paymentType || "cash").toLowerCase();
      if (e.type === "income") {
        totalIncome += e.amount;
        if (pt === "card" || pt === "karta") card += e.amount;
        else cash += e.amount;
      } else if (e.type === "expense" || e.type === "withdrawal") {
        totalExpense += e.amount;
        if (e.type === "withdrawal") withdrawn += e.amount;
        if (pt === "card" || pt === "karta") card -= e.amount;
        else cash -= e.amount;
      }
    }

    const expConditions = [eq(expenses.tenantId, tenantId)];
    if (dateFrom) expConditions.push(gte(expenses.date, dateFrom));
    if (dateTo) expConditions.push(lte(expenses.date, dateTo));

    const [expResult] = await db.select({
      total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::int`
    }).from(expenses).where(and(...expConditions));

    const expensesFromTable = expResult?.total || 0;
    totalExpense += expensesFromTable;
    cash -= expensesFromTable;

    return { cash: Math.max(cash, 0), card: Math.max(card, 0), nasiya, withdrawn, totalIncome, totalExpense, total: Math.max(cash, 0) + Math.max(card, 0) };
  }

  // Financial summary
  async getFinancialSummary(tenantId: string, dateFrom: Date, dateTo: Date): Promise<{ revenue: number; expensesTotal: number; profit: number; totalProfit: number; paymentBreakdown: Record<string, number>; transactionCount: number }> {
    const txns = await db.select({
      totalAmount: transactions.totalAmount,
      totalProfit: transactions.totalProfit,
      paymentMethod: transactions.paymentMethod,
    }).from(transactions).where(
      and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.date, dateFrom),
        lte(transactions.date, dateTo),
        sql`${transactions.status} != 'voided'`
      )
    );

    let revenue = 0;
    let totalProfit = 0;
    const paymentBreakdown: Record<string, number> = {};
    for (const t of txns) {
      revenue += t.totalAmount;
      totalProfit += t.totalProfit || 0;
      const method = t.paymentMethod || "Naqd";
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + t.totalAmount;
    }

    const [expResult] = await db.select({
      total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::int`
    }).from(expenses).where(
      and(
        eq(expenses.tenantId, tenantId),
        gte(expenses.date, dateFrom),
        lte(expenses.date, dateTo)
      )
    );

    const expensesTotal = expResult?.total || 0;
    return { revenue, expensesTotal, profit: totalProfit - expensesTotal, totalProfit, paymentBreakdown, transactionCount: txns.length };
  }

  // Customers
  async getCustomers(tenantId: string, search?: string, page?: number, limit?: number): Promise<{ customers: Customer[]; total: number }> {
    const pg = page || 1;
    const lim = limit || 50;
    const offset = (pg - 1) * lim;
    const conditions = [eq(customers.tenantId, tenantId)];
    if (search) {
      conditions.push(or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.phone, `%${search}%`)
      )!);
    }
    const where = and(...conditions);
    const [customerList, countResult] = await Promise.all([
      db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(lim).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
    ]);
    return { customers: customerList, total: countResult[0]?.count || 0 };
  }

  async getCustomer(id: string, tenantId?: string): Promise<Customer | undefined> {
    const condition = tenantId
      ? and(eq(customers.id, id), eq(customers.tenantId, tenantId))
      : eq(customers.id, id);
    const [customer] = await db.select().from(customers).where(condition);
    return customer;
  }

  async getCustomerByPhone(phone: string, tenantId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(
      and(eq(customers.phone, phone), eq(customers.tenantId, tenantId))
    );
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>, tenantId?: string): Promise<Customer | undefined> {
    const condition = tenantId
      ? and(eq(customers.id, id), eq(customers.tenantId, tenantId))
      : eq(customers.id, id);
    const [updated] = await db.update(customers).set(data).where(condition).returning();
    return updated;
  }

  async deleteCustomer(id: string, tenantId?: string): Promise<boolean> {
    const condition = tenantId
      ? and(eq(customers.id, id), eq(customers.tenantId, tenantId))
      : eq(customers.id, id);
    const result = await db.delete(customers).where(condition);
    return (result.rowCount ?? 0) > 0;
  }

  // Orders enhanced
  async updateOrder(id: string, data: Partial<InsertOrder>, tenantId?: string): Promise<Order | undefined> {
    const condition = tenantId
      ? and(eq(orders.id, id), eq(orders.tenantId, tenantId))
      : eq(orders.id, id);
    const [updated] = await db.update(orders).set(data).where(condition).returning();
    return updated;
  }

  async getOrdersFiltered(tenantId: string, filters?: { status?: string; paymentStatus?: string; deliveryType?: string; dateFrom?: Date; dateTo?: Date }): Promise<Order[]> {
    const conditions = [eq(orders.tenantId, tenantId)];
    if (filters?.status) conditions.push(eq(orders.status, filters.status));
    if (filters?.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
    if (filters?.deliveryType) conditions.push(eq(orders.deliveryType, filters.deliveryType));
    if (filters?.dateFrom) conditions.push(gte(orders.createdAt, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(orders.createdAt, filters.dateTo));
    return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  }

  // Deliveries
  async getDeliveries(tenantId: string, filters?: { status?: string; courier?: string; courierId?: string; dateFrom?: Date; dateTo?: Date }): Promise<Delivery[]> {
    const conditions = [eq(deliveries.tenantId, tenantId)];
    if (filters?.status) conditions.push(eq(deliveries.status, filters.status));
    if (filters?.courierId) conditions.push(eq(deliveries.courierId, filters.courierId));
    else if (filters?.courier) conditions.push(ilike(deliveries.courier, `%${filters.courier}%`));
    if (filters?.dateFrom) conditions.push(gte(deliveries.createdAt, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(deliveries.createdAt, filters.dateTo));
    return db.select().from(deliveries).where(and(...conditions)).orderBy(desc(deliveries.createdAt));
  }

  async getDeliveriesByOrder(orderId: string, tenantId?: string): Promise<Delivery[]> {
    const conditions = [eq(deliveries.orderId, orderId)];
    if (tenantId) conditions.push(eq(deliveries.tenantId, tenantId));
    return db.select().from(deliveries).where(and(...conditions)).orderBy(desc(deliveries.createdAt));
  }

  async createDelivery(delivery: InsertDelivery): Promise<Delivery> {
    const [created] = await db.insert(deliveries).values(delivery).returning();
    return created;
  }

  async updateDelivery(id: string, data: Partial<InsertDelivery>, tenantId?: string): Promise<Delivery | undefined> {
    const condition = tenantId
      ? and(eq(deliveries.id, id), eq(deliveries.tenantId, tenantId))
      : eq(deliveries.id, id);
    const [updated] = await db.update(deliveries).set(data).where(condition).returning();
    return updated;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogs(tenantId: string, entityType?: string, entityId?: string): Promise<AuditLog[]> {
    const conditions = [eq(auditLogs.tenantId, tenantId)];
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (entityId) conditions.push(eq(auditLogs.entityId, entityId));
    return db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt));
  }

  // Shift Handovers
  async getShiftHandovers(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<ShiftHandover[]> {
    const conditions: any[] = [eq(shiftHandovers.tenantId, tenantId)];
    if (dateFrom) conditions.push(gte(shiftHandovers.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(shiftHandovers.createdAt, dateTo));
    return db.select().from(shiftHandovers).where(and(...conditions)).orderBy(desc(shiftHandovers.createdAt));
  }

  async createShiftHandover(data: InsertShiftHandover): Promise<ShiftHandover> {
    const [created] = await db.insert(shiftHandovers).values(data).returning();
    return created;
  }

  async updateShiftHandoverStatus(id: string, tenantId: string, status: string, confirmedAt?: Date): Promise<ShiftHandover | undefined> {
    const updateData: any = { status };
    if (confirmedAt) updateData.confirmedAt = confirmedAt;
    const [updated] = await db.update(shiftHandovers)
      .set(updateData)
      .where(and(eq(shiftHandovers.id, id), eq(shiftHandovers.tenantId, tenantId)))
      .returning();
    return updated;
  }

  // Staff Members
  async getStaffMembers(tenantId: string): Promise<StaffMember[]> {
    return db.select().from(staffMembers).where(eq(staffMembers.tenantId, tenantId)).orderBy(desc(staffMembers.createdAt));
  }

  async getStaffMember(id: string, tenantId?: string): Promise<StaffMember | undefined> {
    const condition = tenantId
      ? and(eq(staffMembers.id, id), eq(staffMembers.tenantId, tenantId))
      : eq(staffMembers.id, id);
    const [staff] = await db.select().from(staffMembers).where(condition);
    return staff;
  }

  async getStaffByToken(token: string): Promise<StaffMember | undefined> {
    const [staff] = await db.select().from(staffMembers).where(eq(staffMembers.token, token));
    return staff;
  }

  async createStaffMember(data: InsertStaffMember): Promise<StaffMember> {
    const [created] = await db.insert(staffMembers).values(data).returning();
    return created;
  }

  async updateStaffMember(id: string, data: Partial<InsertStaffMember>, tenantId?: string): Promise<StaffMember | undefined> {
    const condition = tenantId
      ? and(eq(staffMembers.id, id), eq(staffMembers.tenantId, tenantId))
      : eq(staffMembers.id, id);
    const [updated] = await db.update(staffMembers).set(data).where(condition).returning();
    return updated;
  }

  async deleteStaffMember(id: string, tenantId?: string): Promise<boolean> {
    const condition = tenantId
      ? and(eq(staffMembers.id, id), eq(staffMembers.tenantId, tenantId))
      : eq(staffMembers.id, id);
    const result = await db.delete(staffMembers).where(condition);
    return (result.rowCount ?? 0) > 0;
  }

  // Suppliers
  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    return db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId)).orderBy(desc(suppliers.createdAt));
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const [created] = await db.insert(suppliers).values(data).returning();
    return created;
  }

  async updateSupplier(id: string, data: Partial<InsertSupplier>, tenantId?: string): Promise<Supplier | undefined> {
    const conditions: any[] = [eq(suppliers.id, id)];
    if (tenantId) conditions.push(eq(suppliers.tenantId, tenantId));
    const [updated] = await db.update(suppliers).set(data).where(and(...conditions)).returning();
    return updated;
  }

  async deleteSupplier(id: string, tenantId?: string): Promise<boolean> {
    const conditions: any[] = [eq(suppliers.id, id)];
    if (tenantId) conditions.push(eq(suppliers.tenantId, tenantId));
    const result = await db.delete(suppliers).where(and(...conditions));
    return (result.rowCount ?? 0) > 0;
  }

  // Attendance
  async getAttendanceRecords(tenantId: string, staffId?: string, dateFrom?: Date, dateTo?: Date): Promise<AttendanceRecord[]> {
    const conditions: any[] = [eq(attendanceRecords.tenantId, tenantId)];
    if (staffId) conditions.push(eq(attendanceRecords.staffId, staffId));
    if (dateFrom) conditions.push(gte(attendanceRecords.date, dateFrom));
    if (dateTo) conditions.push(lte(attendanceRecords.date, dateTo));
    return db.select().from(attendanceRecords).where(and(...conditions)).orderBy(desc(attendanceRecords.date));
  }

  async createAttendanceRecord(data: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [created] = await db.insert(attendanceRecords).values(data).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
