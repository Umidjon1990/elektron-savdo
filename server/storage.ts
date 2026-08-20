import { db } from "@db";
import { users, products, orders, categories, transactions, tenants, expenses, expenseCategories, incomeCategories, debtPayments, independentDebts, independentDebtPayments, cashRegisterEntries, customers, deliveries, auditLogs, shiftHandovers, staffMembers, attendanceRecords, suppliers } from "@shared/schema";
import type { User, InsertUser, Product, InsertProduct, Order, InsertOrder, Category, InsertCategory, Transaction, InsertTransaction, Tenant, InsertTenant, Expense, InsertExpense, ExpenseCategory, InsertExpenseCategory, IncomeCategory, InsertIncomeCategory, DebtPayment, InsertDebtPayment, IndependentDebt, InsertIndependentDebt, IndependentDebtPayment, CashRegisterEntry, InsertCashRegisterEntry, Customer, InsertCustomer, Delivery, InsertDelivery, AuditLog, InsertAuditLog, ShiftHandover, InsertShiftHandover, StaffMember, InsertStaffMember, AttendanceRecord, InsertAttendanceRecord, Supplier, InsertSupplier } from "@shared/schema";
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
  getProductsPaginated(tenantId: string, limit: number, offset: number, filters?: { search?: string; category?: string }): Promise<{ products: Product[]; total: number }>;
  getProductCountsByTenants(tenantIds: string[]): Promise<Map<string, number>>;
  getProduct(id: string, tenantId?: string): Promise<Product | undefined>;
  getProductByBarcode(barcode: string, tenantId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>, tenantId?: string): Promise<Product | undefined>;
  deleteProduct(id: string, tenantId?: string): Promise<boolean>;
  reorderProducts(orderedIds: string[], tenantId?: string): Promise<void>;
  
  // Orders (tenant-scoped)
  getAllOrders(tenantId: string): Promise<Order[]>;
  getOrdersPaginated(tenantId: string, limit: number, offset: number): Promise<{ orders: Order[]; total: number }>;
  getOrdersByIds(ids: string[], tenantId: string): Promise<Order[]>;
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
  getTransactionsPaginated(tenantId: string, limit: number, offset: number): Promise<{ transactions: Transaction[]; total: number }>;
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
  getDebtTransactionsPaginated(tenantId: string, limit: number, offset: number): Promise<{ transactions: Transaction[]; total: number }>;
  getDebtPayments(transactionId: string, tenantId?: string): Promise<DebtPayment[]>;
  createDebtPayment(payment: InsertDebtPayment): Promise<DebtPayment>;
  updateTransactionDebt(id: string, paidAmount: number, debtStatus: string, tenantId?: string): Promise<Transaction | undefined>;

  // Standalone Nasiya ledger (not connected to finance/sales)
  getIndependentDebts(tenantId: string): Promise<IndependentDebt[]>;
  getIndependentDebt(id: string, tenantId: string): Promise<IndependentDebt | undefined>;
  createIndependentDebt(debt: InsertIndependentDebt): Promise<IndependentDebt>;
  updateIndependentDebt(id: string, data: Partial<IndependentDebt>, tenantId: string): Promise<IndependentDebt | undefined>;
  voidIndependentDebt(id: string, tenantId: string): Promise<IndependentDebt | undefined>;
  getIndependentDebtPayments(debtId: string, tenantId: string): Promise<IndependentDebtPayment[]>;
  recordIndependentDebtPayment(debtId: string, tenantId: string, amount: number, note?: string): Promise<{ debt: IndependentDebt; payment: IndependentDebtPayment }>;

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
  getOrdersFiltered(tenantId: string, filters?: { status?: string; paymentStatus?: string; deliveryType?: string; dateFrom?: Date; dateTo?: Date; search?: string }): Promise<Order[]>;
  getOrdersFilteredPaginated(
    tenantId: string,
    filters: { status?: string; paymentStatus?: string; deliveryType?: string; dateFrom?: Date; dateTo?: Date; search?: string },
    limit: number,
    offset: number
  ): Promise<{ orders: Order[]; total: number; statusCounts: Record<string, number> }>;

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

  // Finance optimized queries
  getDailyBreakdown(
    tenantId: string,
    from: Date,
    to: Date,
    tzOffsetMinutes: number
  ): Promise<Array<{
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
    totalProfit: number;
    payments: Record<string, number>;
  }>>;

  getSupplierSummary(tenantId: string): Promise<{
    suppliers: Array<{
      name: string;
      phone: string;
      totalAmount: number;
      totalAmountUsd: number;
      totalProducts: number;
      totalItems: number;
      naqd: number;
      karta: number;
      nasiya: number;
      naqdUsd: number;
      kartaUsd: number;
      nasiyaUsd: number;
      products: Array<{
        id: string;
        name: string;
        costPrice: number;
        stock: number;
        amount: number;
        amountUsd: number;
        supplierCurrency: string;
        supplierOriginalPrice: number;
        supplierCurrencyRate: number;
        paymentMethod: string;
        debtStatus: string;
        paidAmount: number;
      }>;
    }>;
    totals: {
      totalAmount: number;
      totalAmountUsd: number;
      totalNaqd: number;
      totalKarta: number;
      totalNasiya: number;
      totalNaqdUsd: number;
      totalKartaUsd: number;
      totalNasiyaUsd: number;
      supplierCount: number;
    };
  }>;

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
      // Delete all tenant-scoped data so FK constraints don't block tenant
      // deletion. Order matters: child rows (those whose own tables also
      // reference other tenant tables, e.g. expenses → expenseCategories,
      // attendance → staffMembers) are deleted before their parents.
      await tx.delete(attendanceRecords).where(eq(attendanceRecords.tenantId, id));
      await tx.delete(staffMembers).where(eq(staffMembers.tenantId, id));
      await tx.delete(shiftHandovers).where(eq(shiftHandovers.tenantId, id));
      await tx.delete(auditLogs).where(eq(auditLogs.tenantId, id));
      await tx.delete(cashRegisterEntries).where(eq(cashRegisterEntries.tenantId, id));
      await tx.delete(debtPayments).where(eq(debtPayments.tenantId, id));
      await tx.delete(deliveries).where(eq(deliveries.tenantId, id));
      await tx.delete(transactions).where(eq(transactions.tenantId, id));
      await tx.delete(orders).where(eq(orders.tenantId, id));
      await tx.delete(expenses).where(eq(expenses.tenantId, id));
      await tx.delete(expenseCategories).where(eq(expenseCategories.tenantId, id));
      await tx.delete(incomeCategories).where(eq(incomeCategories.tenantId, id));
      await tx.delete(customers).where(eq(customers.tenantId, id));
      await tx.delete(suppliers).where(eq(suppliers.tenantId, id));
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

  async getProductsPaginated(tenantId: string, limit: number, offset: number, filters?: { search?: string; category?: string }): Promise<{ products: Product[]; total: number }> {
    const conditions = [eq(products.tenantId, tenantId)];
    if (filters?.category) conditions.push(eq(products.category, filters.category));
    if (filters?.search) {
      conditions.push(or(
        ilike(products.name, `%${filters.search}%`),
        ilike(products.author, `%${filters.search}%`)
      )!);
    }
    const where = and(...conditions);
    const [productList, countResult] = await Promise.all([
      db.select().from(products)
        .where(where)
        .orderBy(products.sortOrder, products.name)
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(products)
        .where(where)
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

  async getOrdersPaginated(tenantId: string, limit: number, offset: number): Promise<{ orders: Order[]; total: number }> {
    const where = eq(orders.tenantId, tenantId);
    const [orderList, countResult] = await Promise.all([
      db.select().from(orders).where(where)
        .orderBy(desc(orders.createdAt), desc(orders.id))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where),
    ]);
    return { orders: orderList, total: countResult[0]?.count || 0 };
  }

  async getOrdersByIds(ids: string[], tenantId: string): Promise<Order[]> {
    if (ids.length === 0) return [];
    return db.select().from(orders).where(
      and(inArray(orders.id, ids), eq(orders.tenantId, tenantId))
    );
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

  async getTransactionsPaginated(tenantId: string, limit: number, offset: number): Promise<{ transactions: Transaction[]; total: number }> {
    const where = eq(transactions.tenantId, tenantId);
    const [transactionList, countResult] = await Promise.all([
      db.select().from(transactions).where(where)
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(transactions).where(where),
    ]);
    return { transactions: transactionList, total: countResult[0]?.count || 0 };
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
    // PERF: insert the transaction AND decrement product stock in a single
    // DB round-trip (atomic db.transaction). Previously the client sent N
    // separate PATCH /api/products/:id calls AFTER POST /api/transactions
    // for an N-item cart — meaning 5 items = 1 + 5 = 6 sequential network
    // round trips per sale. That was the #1 cause of the "to'lov qotmoqda"
    // freeze. Now: 1 round trip total for any cart size.
    const rawItems = Array.isArray(transaction.items) ? transaction.items as any[] : [];
    const normalizedItems = rawItems.map((item) => {
      const quantity = Number(item?.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("INVALID_TRANSACTION_QUANTITY");
      }
      return { ...item, quantity };
    });
    const normalizedTransaction = { ...transaction, items: normalizedItems } as InsertTransaction;
    const itemsToDecrement = normalizedItems
      .filter(item => item?.product?.id)
      .map(item => ({ id: String(item.product.id), qty: item.quantity }));

    // Aggregate quantities by product id (handles cart with duplicate lines).
    const qtyById = new Map<string, number>();
    for (const it of itemsToDecrement) {
      qtyById.set(it.id, (qtyById.get(it.id) || 0) + it.qty);
    }

    const newTxn = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(transactions).values(normalizedTransaction).returning();
      if (qtyById.size > 0 && normalizedTransaction.status !== "voided" && normalizedTransaction.tenantId) {
        // SECURITY: scope every product update to this transaction's tenant
        // so a crafted client payload cannot decrement another tenant's
        // stock. CONCURRENCY: do the decrement as a single SQL-side
        // arithmetic update per product (stock = GREATEST(0, stock - X))
        // — no read-then-write window, so two simultaneous checkouts of
        // the same item cannot lose an update.
        await Promise.all(Array.from(qtyById.entries()).map(([id, dec]) => {
          if (dec <= 0) return Promise.resolve();
          return tx
            .update(products)
            .set({ stock: sql`GREATEST(0, ${products.stock} - ${dec})` })
            .where(and(
              eq(products.id, id),
              eq(products.tenantId, normalizedTransaction.tenantId!)
            ));
        }));
      }
      return inserted;
    });
    return newTxn;
  }

  async voidTransaction(id: string, tenantId?: string): Promise<{transaction: Transaction, alreadyVoided: boolean} | undefined> {
    return db.transaction(async (tx) => {
      const conditions = [eq(transactions.id, id)];
      if (tenantId) conditions.push(eq(transactions.tenantId, tenantId));
      const where = and(...conditions);
      const [existing] = await tx.select().from(transactions).where(where).for("update");

      if (!existing) return undefined;
      if (existing.status === "voided") {
        return { transaction: existing, alreadyVoided: true };
      }
      if (!existing.tenantId) {
        throw new Error("TRANSACTION_TENANT_MISSING");
      }
      const transactionTenantId = existing.tenantId;

      const items = Array.isArray(existing.items) ? existing.items as any[] : [];
      const qtyById = new Map<string, number>();
      for (const item of items) {
        const quantity = Number(item?.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error("INVALID_TRANSACTION_QUANTITY");
        }
        if (!item?.product?.id) continue;
        const productId = String(item.product.id);
        qtyById.set(productId, (qtyById.get(productId) || 0) + quantity);
      }

      // One CASE UPDATE avoids N product writes. SQL-side increments prevent
      // lost updates; the transaction row lock makes restoration idempotent.
      const adjustments = Array.from(qtyById.entries());
      if (adjustments.length > 0) {
        const productIds = adjustments.map(([productId]) => productId);
        const cases = sql.join(
          adjustments.map(([productId, quantity]) => sql`when ${products.id} = ${productId} then cast(${quantity} as real)`),
          sql.raw(" ")
        );
        await tx.update(products)
          .set({ stock: sql`${products.stock} + case ${cases} else cast(0 as real) end` })
          .where(and(
            inArray(products.id, productIds),
            eq(products.tenantId, transactionTenantId)
          ));
      }

      const [updated] = await tx.update(transactions)
        .set({ status: "voided" })
        .where(where)
        .returning();
      return { transaction: updated, alreadyVoided: false };
    });
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
        sql`(${transactions.paymentMethod} = 'nasiya' OR (${transactions.paymentMethod} = 'mixed' AND ${transactions.debtStatus} IN ('pending','partial')))`,
        sql`${transactions.status} != 'voided'`
      )
    ).orderBy(desc(transactions.date));
  }

  async getDebtTransactionsPaginated(tenantId: string, limit: number, offset: number): Promise<{ transactions: Transaction[]; total: number }> {
    const where = and(
      eq(transactions.tenantId, tenantId),
      sql`(${transactions.paymentMethod} = 'nasiya' OR (${transactions.paymentMethod} = 'mixed' AND ${transactions.debtStatus} IN ('pending','partial')))`,
      sql`${transactions.status} != 'voided'`
    );
    const [transactionList, countResult] = await Promise.all([
      db.select().from(transactions).where(where)
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(transactions).where(where),
    ]);
    return { transactions: transactionList, total: countResult[0]?.count || 0 };
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

  // Standalone Nasiya ledger. Keep this implementation isolated from
  // transaction, stock, income/expense, and cash-register operations.
  async getIndependentDebts(tenantId: string): Promise<IndependentDebt[]> {
    return db.select().from(independentDebts)
      .where(eq(independentDebts.tenantId, tenantId))
      .orderBy(desc(independentDebts.createdAt));
  }

  async getIndependentDebt(id: string, tenantId: string): Promise<IndependentDebt | undefined> {
    const [debt] = await db.select().from(independentDebts).where(
      and(eq(independentDebts.id, id), eq(independentDebts.tenantId, tenantId))
    );
    return debt;
  }

  async createIndependentDebt(debt: InsertIndependentDebt): Promise<IndependentDebt> {
    const [created] = await db.insert(independentDebts).values(debt).returning();
    return created;
  }

  async updateIndependentDebt(id: string, data: Partial<IndependentDebt>, tenantId: string): Promise<IndependentDebt | undefined> {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(independentDebts).where(
        and(eq(independentDebts.id, id), eq(independentDebts.tenantId, tenantId))
      ).for("update");

      if (!current) return undefined;
      if (current.status === "voided") throw new Error("NASIYA_VOIDED");

      const totalAmount = data.totalAmount ?? current.totalAmount;
      if (totalAmount < current.paidAmount) throw new Error("NASIYA_TOTAL_BELOW_PAID");

      // Never trust caller-supplied debt accounting fields. The current,
      // locked payment balance is the source of truth for the next status.
      const {
        id: _id,
        tenantId: _tenantId,
        paidAmount: _paidAmount,
        status: _status,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...editable
      } = data;
      const status = totalAmount === current.paidAmount
        ? "paid"
        : (current.paidAmount > 0 ? "partial" : "pending");

      const [updated] = await tx.update(independentDebts)
        .set({ ...editable, totalAmount, status, updatedAt: new Date() })
        .where(and(eq(independentDebts.id, id), eq(independentDebts.tenantId, tenantId)))
        .returning();
      return updated;
    });
  }

  async getIndependentDebtPayments(debtId: string, tenantId: string): Promise<IndependentDebtPayment[]> {
    return db.select().from(independentDebtPayments).where(
      and(
        eq(independentDebtPayments.debtId, debtId),
        eq(independentDebtPayments.tenantId, tenantId)
      )
    ).orderBy(desc(independentDebtPayments.date));
  }

  async voidIndependentDebt(id: string, tenantId: string): Promise<IndependentDebt | undefined> {
    const [updated] = await db.update(independentDebts)
      .set({ status: "voided", updatedAt: new Date() })
      .where(and(eq(independentDebts.id, id), eq(independentDebts.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async recordIndependentDebtPayment(
    debtId: string,
    tenantId: string,
    amount: number,
    note = ""
  ): Promise<{ debt: IndependentDebt; payment: IndependentDebtPayment }> {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(independentDebts).where(
        and(eq(independentDebts.id, debtId), eq(independentDebts.tenantId, tenantId))
      ).for("update");

      if (!current) throw new Error("NASIYA_NOT_FOUND");
      if (current.status === "voided") throw new Error("NASIYA_VOIDED");
      if (current.status === "paid") throw new Error("NASIYA_ALREADY_PAID");

      const remaining = current.totalAmount - current.paidAmount;
      if (amount <= 0) throw new Error("NASIYA_INVALID_PAYMENT");
      if (amount > remaining) throw new Error("NASIYA_OVERPAYMENT");

      const [payment] = await tx.insert(independentDebtPayments).values({
        tenantId,
        debtId,
        amount,
        note,
      }).returning();

      const paidAmount = current.paidAmount + amount;
      const status = paidAmount >= current.totalAmount ? "paid" : "partial";
      const [debt] = await tx.update(independentDebts)
        .set({ paidAmount, status, updatedAt: new Date() })
        .where(and(eq(independentDebts.id, debtId), eq(independentDebts.tenantId, tenantId)))
        .returning();

      return { debt, payment };
    });
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
      paymentSplits: transactions.paymentSplits,
    }).from(transactions).where(and(...txnConditions));

    let cash = 0;
    let card = 0;
    let nasiya = 0;

    for (const t of txns) {
      const splits = (t as any).paymentSplits as Array<{ method: string; amount: number }> | null;
      if (splits && splits.length > 0) {
        for (const s of splits) {
          const m = (s.method || "cash").toLowerCase();
          const amt = Number(s.amount) || 0;
          if (m === "nasiya") nasiya += amt;
          else if (m === "karta" || m === "card") card += amt;
          else cash += amt;
        }
        continue;
      }
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
      paymentSplits: transactions.paymentSplits,
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
      const splits = (t as any).paymentSplits as Array<{ method: string; amount: number }> | null;
      if (splits && splits.length > 0) {
        for (const s of splits) {
          const m = s.method || "Naqd";
          paymentBreakdown[m] = (paymentBreakdown[m] || 0) + (Number(s.amount) || 0);
        }
      } else {
        const method = t.paymentMethod || "Naqd";
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + t.totalAmount;
      }
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

  async getOrdersFiltered(tenantId: string, filters?: { status?: string; paymentStatus?: string; deliveryType?: string; dateFrom?: Date; dateTo?: Date; search?: string }): Promise<Order[]> {
    const conditions = [eq(orders.tenantId, tenantId)];
    if (filters?.status) conditions.push(eq(orders.status, filters.status));
    if (filters?.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
    if (filters?.deliveryType) conditions.push(eq(orders.deliveryType, filters.deliveryType));
    if (filters?.dateFrom) conditions.push(gte(orders.createdAt, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(orders.createdAt, filters.dateTo));
    if (filters?.search) {
      conditions.push(or(
        ilike(orders.customerName, `%${filters.search}%`),
        ilike(orders.customerPhone, `%${filters.search}%`)
      )!);
    }
    return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  }

  async getOrdersFilteredPaginated(
    tenantId: string,
    filters: { status?: string; paymentStatus?: string; deliveryType?: string; dateFrom?: Date; dateTo?: Date; search?: string },
    limit: number,
    offset: number
  ): Promise<{ orders: Order[]; total: number; statusCounts: Record<string, number> }> {
    const conditions = [eq(orders.tenantId, tenantId)];
    if (filters.status) conditions.push(eq(orders.status, filters.status));
    if (filters.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
    if (filters.deliveryType) conditions.push(eq(orders.deliveryType, filters.deliveryType));
    if (filters.dateFrom) conditions.push(gte(orders.createdAt, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(orders.createdAt, filters.dateTo));
    if (filters.search) {
      conditions.push(or(
        ilike(orders.customerName, `%${filters.search}%`),
        ilike(orders.customerPhone, `%${filters.search}%`)
      )!);
    }
    const where = and(...conditions);
    const [orderList, countRows] = await Promise.all([
      db.select().from(orders).where(where)
        .orderBy(desc(orders.createdAt), desc(orders.id))
        .limit(limit).offset(offset),
      db.select({
        status: orders.status,
        count: sql<number>`count(*)::int`,
      }).from(orders).where(where).groupBy(orders.status),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of countRows) statusCounts[row.status] = row.count;
    const total = countRows.reduce((sum, row) => sum + row.count, 0);
    return { orders: orderList, total, statusCounts };
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

  // --------------------------------------------------------------------------
  // Finance: optimised daily breakdown
  // --------------------------------------------------------------------------
  async getDailyBreakdown(
    tenantId: string,
    from: Date,
    to: Date,
    tzOffsetMinutes: number
  ): Promise<Array<{
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
    totalProfit: number;
    payments: Record<string, number>;
  }>> {
    // The client constructs local calendar boundaries and serializes them as
    // UTC instants. Use those submitted instants directly for filtering;
    // applying the offset again would drop boundary hours west/east of UTC.
    // The offset is only for grouping each timestamp into its local day.
    const utcFrom = from;
    const utcTo = to;

    const transactionDay = sql<string>`to_char(${transactions.date} - (${tzOffsetMinutes} * interval '1 minute'), 'YYYY-MM-DD')`;
    const expenseDay = sql<string>`to_char(${expenses.date} - (${tzOffsetMinutes} * interval '1 minute'), 'YYYY-MM-DD')`;
    const transactionFilter = and(
      eq(transactions.tenantId, tenantId),
      gte(transactions.date, utcFrom),
      lte(transactions.date, utcTo),
      sql`${transactions.status} != 'voided'`
    );

    // Revenue/profit, expenses and payment methods are all grouped by local
    // day in PostgreSQL. No transaction list (or JSON items blob) crosses the
    // application boundary, even for multi-year reports.
    const [txDayRows, expRows, paymentResult] = await Promise.all([
      db.select({
        day: transactionDay,
        revenue: sql<number>`COALESCE(SUM(${transactions.totalAmount}), 0)::bigint`,
        totalProfit: sql<number>`COALESCE(SUM(${transactions.totalProfit}), 0)::bigint`,
      }).from(transactions)
        .where(transactionFilter)
        .groupBy(sql.raw("1")),
      db.select({
        day: expenseDay,
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::bigint`,
      }).from(expenses).where(
        and(
          eq(expenses.tenantId, tenantId),
          gte(expenses.date, utcFrom),
          lte(expenses.date, utcTo)
        )
      ).groupBy(sql.raw("1")),
      db.execute(sql`
        WITH payment_rows AS (
          SELECT
            to_char(${transactions.date} - (${tzOffsetMinutes} * interval '1 minute'), 'YYYY-MM-DD') AS day,
            COALESCE(NULLIF(${transactions.paymentMethod}, ''), 'Naqd') AS method,
            ${transactions.totalAmount}::numeric AS amount
          FROM ${transactions}
          WHERE ${transactions.tenantId} = ${tenantId}
            AND ${transactions.date} >= ${utcFrom}
            AND ${transactions.date} <= ${utcTo}
            AND ${transactions.status} != 'voided'
            AND COALESCE(
              jsonb_array_length(
                CASE
                  WHEN jsonb_typeof(COALESCE(${transactions.paymentSplits}::jsonb, '[]'::jsonb)) = 'array'
                    THEN COALESCE(${transactions.paymentSplits}::jsonb, '[]'::jsonb)
                  ELSE '[]'::jsonb
                END
              ),
              0
            ) = 0

          UNION ALL

          SELECT
            to_char(${transactions.date} - (${tzOffsetMinutes} * interval '1 minute'), 'YYYY-MM-DD') AS day,
            COALESCE(NULLIF(split.value->>'method', ''), 'Naqd') AS method,
            COALESCE((split.value->>'amount')::numeric, 0) AS amount
          FROM ${transactions}
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(COALESCE(${transactions.paymentSplits}::jsonb, '[]'::jsonb)) = 'array'
                THEN COALESCE(${transactions.paymentSplits}::jsonb, '[]'::jsonb)
              ELSE '[]'::jsonb
            END
          ) AS split(value)
          WHERE ${transactions.tenantId} = ${tenantId}
            AND ${transactions.date} >= ${utcFrom}
            AND ${transactions.date} <= ${utcTo}
            AND ${transactions.status} != 'voided'
        )
        SELECT day, method, COALESCE(SUM(amount), 0)::bigint AS total
        FROM payment_rows
        GROUP BY day, method
      `),
    ]);

    // Step 3 – build zero-filled day map for the requested range
    const dayKey = (d: Date) =>
      new Date(d.getTime() - tzOffsetMinutes * 60000).toISOString().split("T")[0];

    const days: Record<string, {
      date: string; revenue: number; expenses: number; profit: number;
      totalProfit: number; payments: Record<string, number>;
    }> = {};

    const cursor = new Date(from);
    while (cursor <= to) {
      const key = dayKey(cursor);
      days[key] = { date: key, revenue: 0, expenses: 0, profit: 0, totalProfit: 0, payments: {} };
      cursor.setDate(cursor.getDate() + 1);
    }

    // Step 4 – merge SQL-aggregated transaction and payment rows
    for (const row of txDayRows) {
      if (!days[row.day]) continue;
      days[row.day].revenue = Number(row.revenue) || 0;
      days[row.day].totalProfit = Number(row.totalProfit) || 0;
    }
    for (const row of paymentResult.rows as Array<{ day: string; method: string; total: string | number }>) {
      if (!days[row.day]) continue;
      days[row.day].payments[row.method] = Number(row.total) || 0;
    }

    // Step 5 – merge SQL-aggregated expenses
    for (const e of expRows) {
      if (days[e.day]) {
        days[e.day].expenses += Number(e.total) || 0;
      }
    }

    return Object.values(days).map(d => ({
      ...d,
      profit: d.totalProfit - d.expenses,
    }));
  }

  // --------------------------------------------------------------------------
  // Finance: optimised supplier summary
  // --------------------------------------------------------------------------
  async getSupplierSummary(tenantId: string): Promise<{
    suppliers: Array<{
      name: string;
      phone: string;
      totalAmount: number;
      totalAmountUsd: number;
      totalProducts: number;
      totalItems: number;
      naqd: number;
      karta: number;
      nasiya: number;
      naqdUsd: number;
      kartaUsd: number;
      nasiyaUsd: number;
      products: Array<{
        id: string;
        name: string;
        costPrice: number;
        stock: number;
        amount: number;
        amountUsd: number;
        supplierCurrency: string;
        supplierOriginalPrice: number;
        supplierCurrencyRate: number;
        paymentMethod: string;
        debtStatus: string;
        paidAmount: number;
      }>;
    }>;
    totals: {
      totalAmount: number;
      totalAmountUsd: number;
      totalNaqd: number;
      totalKarta: number;
      totalNasiya: number;
      totalNaqdUsd: number;
      totalKartaUsd: number;
      totalNasiyaUsd: number;
      supplierCount: number;
    };
  }> {
    // Query 1 – registered suppliers
    const registeredSuppliers = await db.select({
      name:  suppliers.name,
      phone: suppliers.phone,
    }).from(suppliers).where(eq(suppliers.tenantId, tenantId));

    // Query 2 – per-product details (only columns needed, no blobs)
    const productRows = await db.select({
      id:                     products.id,
      name:                   products.name,
      costPrice:              products.costPrice,
      stock:                  products.stock,
      supplier:               products.supplier,
      supplierPaymentMethod:  products.supplierPaymentMethod,
      supplierCurrency:       products.supplierCurrency,
      supplierCurrencyRate:   products.supplierCurrencyRate,
      supplierOriginalPrice:  products.supplierOriginalPrice,
      supplierDebtStatus:     products.supplierDebtStatus,
      supplierPaidAmount:     products.supplierPaidAmount,
    }).from(products).where(
      and(eq(products.tenantId, tenantId), sql`${products.supplier} IS NOT NULL AND ${products.supplier} != ''`)
    );

    // Build supplier map seeded with registered suppliers
    const emptySupplier = () => ({
      name: "", phone: "", totalAmount: 0, totalAmountUsd: 0,
      totalProducts: 0, totalItems: 0,
      naqd: 0, karta: 0, nasiya: 0,
      naqdUsd: 0, kartaUsd: 0, nasiyaUsd: 0,
      products: [] as any[],
    });

    const supplierMap: Record<string, ReturnType<typeof emptySupplier> & { name: string; phone: string }> = {};
    for (const s of registeredSuppliers) {
      supplierMap[s.name] = { ...emptySupplier(), name: s.name, phone: s.phone || "" };
    }

    for (const p of productRows) {
      const sName = p.supplier || "";
      if (!sName) continue;
      if (!supplierMap[sName]) {
        supplierMap[sName] = { ...emptySupplier(), name: sName, phone: "" };
      }
      const costPrice   = p.costPrice || 0;
      const stock       = Number(p.stock) || 0;
      const amount      = costPrice * stock;
      const currency    = p.supplierCurrency || "uzs";
      const origPrice   = Number(p.supplierOriginalPrice) || 0;
      const amountUsd   = currency === "usd" ? origPrice * stock : 0;
      const payMethod   = p.supplierPaymentMethod || "naqd";

      const sup = supplierMap[sName];
      sup.totalAmount    += amount;
      sup.totalAmountUsd += amountUsd;
      sup.totalProducts  += 1;
      sup.totalItems     += stock;
      if (payMethod === "karta")        { sup.karta    += amount; sup.kartaUsd    += amountUsd; }
      else if (payMethod === "nasiya")  { sup.nasiya   += amount; sup.nasiyaUsd   += amountUsd; }
      else                              { sup.naqd     += amount; sup.naqdUsd     += amountUsd; }

      sup.products.push({
        id:                    p.id,
        name:                  p.name,
        costPrice,
        stock,
        amount,
        amountUsd,
        supplierCurrency:      currency,
        supplierOriginalPrice: origPrice,
        supplierCurrencyRate:  p.supplierCurrencyRate || 0,
        paymentMethod:         payMethod,
        debtStatus:            p.supplierDebtStatus || "pending",
        paidAmount:            p.supplierPaidAmount || 0,
      });
    }

    const result = Object.values(supplierMap).sort((a, b) => b.totalAmount - a.totalAmount);

    const totals = {
      totalAmount:    result.reduce((s, r) => s + r.totalAmount,    0),
      totalAmountUsd: result.reduce((s, r) => s + r.totalAmountUsd, 0),
      totalNaqd:      result.reduce((s, r) => s + r.naqd,           0),
      totalKarta:     result.reduce((s, r) => s + r.karta,          0),
      totalNasiya:    result.reduce((s, r) => s + r.nasiya,         0),
      totalNaqdUsd:   result.reduce((s, r) => s + r.naqdUsd,        0),
      totalKartaUsd:  result.reduce((s, r) => s + r.kartaUsd,       0),
      totalNasiyaUsd: result.reduce((s, r) => s + r.nasiyaUsd,      0),
      supplierCount:  result.length,
    };

    return { suppliers: result, totals };
  }
}

export const storage = new DatabaseStorage();
