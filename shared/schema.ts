import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, jsonb, primaryKey, uniqueIndex, index, check, boolean, real, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// NUMERIC values are bounded at API boundaries; Decimal performs arithmetic.
const decimalNumber = customType<{ data: number; driverData: string }>({
  dataType() { return "numeric"; },
  fromDriver(value) { return Number(value); },
  toDriver(value) { return String(value); },
});

const moneyNumber = customType<{ data: number; driverData: string }>({
  dataType() { return "numeric(24,2)"; },fromDriver(value){return Number(value);},toDriver(value){return String(value);}
});
const purchaseNumber=customType<{data:number;driverData:string}>({dataType(){return 'numeric(24,8)'},fromDriver:Number,toDriver:String});
const rateNumber=customType<{data:number;driverData:string}>({dataType(){return 'numeric(24,6)'},fromDriver:Number,toDriver:String});

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logo: text("logo"),
  brandColor: text("brand_color").notNull().default("#4f46e5"),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  trialEnd: timestamp("trial_end"),
  subscriptionDays: integer("subscription_days").notNull().default(0),
  maxProducts: integer("max_products").notNull().default(100),
  maxUsers: integer("max_users").notNull().default(1),
  ownerUsername: text("owner_username"),
  ownerPassword: text("owner_password"),
  paymentMethods: json("payment_methods").$type<Array<{id: string, name: string}>>(),
  productFields: json("product_fields").$type<Array<{key: string, label: string, required?: boolean}>>(),
  customerFields: json("customer_fields").$type<Array<{key: string, label: string}>>(),
  receiptLogo: text("receipt_logo"),
  productFormVisibility: json("product_form_visibility").$type<Record<string, boolean>>(),
  orderFormFields: json("order_form_fields").$type<Array<{key: string, label: string, enabled: boolean, required: boolean, options?: Array<{id: string, label: string, type?: string}>}>>(),
  defaultDollarRate: integer("default_dollar_rate").notNull().default(0),
  deliveryEnabled: boolean("delivery_enabled").notNull().default(false),
  debtsInUsdOnly: boolean("debts_in_usd_only").notNull().default(false),
  splitPaymentsEnabled: boolean("split_payments_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  email: text("email"),
  password: text("password").notNull(),
  role: text("role").notNull().default("owner"),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  isSuper: boolean("is_super").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  author: text("author").notNull().default(""),
  price: integer("price").notNull(),
  discountPrice: integer("discount_price"),
  costPrice: integer("cost_price").notNull().default(0),
  barcodePrice: integer("barcode_price"),
  wholesalePrice: integer("wholesale_price"),
  stock: decimalNumber("stock").notNull(),
  unit: text("unit").notNull().default("dona"),
  category: text("category").notNull(),
  barcode: text("barcode").notNull(),
  financeTracked: boolean("finance_tracked").notNull().default(false),
  supplier: text("supplier").default(""),
  supplierPaymentMethod: text("supplier_payment_method").default("naqd"),
  supplierCurrency: text("supplier_currency").default("uzs"),
  supplierCurrencyRate: integer("supplier_currency_rate").notNull().default(0),
  supplierOriginalPrice: decimalNumber("supplier_original_price").notNull().default(0),
  supplierDebtStatus: text("supplier_debt_status").default("pending"),
  supplierPaidAmount: integer("supplier_paid_amount").notNull().default(0),
  description: text("description").default(""),
  image: text("image").notNull(),
  videoUrl: text("video_url"),
  metadata: json("metadata").$type<Record<string, string>>(),
  sortOrder: integer("sort_order").notNull().default(0),
  isNew: boolean("is_new").notNull().default(false),
}, (table) => [
  uniqueIndex("products_tenant_barcode_idx").on(table.tenantId, table.barcode),
]);

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  addresses: json("addresses").$type<Array<{label: string, address: string}>>().default([]),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerTelegram: text("customer_telegram"),
  items: json("items").notNull(),
  totalAmount: moneyNumber("total_amount").notNull(),
  status: text("status").notNull().default("new"),
  paymentMethod: text("payment_method").notNull(),
  deliveryType: text("delivery_type").notNull(),
  address: text("address").default(""),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  debtAmount: moneyNumber("debt_amount").notNull().default(0),
  courier: text("courier").default(""),
  courierId: varchar("courier_id"),
  statusHistory: json("status_history").$type<Array<{status: string, date: string, userId?: string, note?: string}>>().default([]),
  deliveryScheduledAt: timestamp("delivery_scheduled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
});

export const transactions = pgTable("transactions", {
  initialPaidAmount: moneyNumber("initial_paid_amount"),
  voidedAt: timestamp("voided_at"),
  orderId: varchar("order_id"),
  id: varchar("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  date: timestamp("date").notNull(),
  items: json("items").notNull(),
  totalAmount: moneyNumber("total_amount").notNull(),
  totalProfit: moneyNumber("total_profit").notNull().default(0),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("completed"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerInfo: json("customer_info").$type<Record<string, string>>(),
  dueDate: timestamp("due_date"),
  paidAmount: moneyNumber("paid_amount").notNull().default(0),
  debtStatus: text("debt_status").default("none"),
  paymentSplits: json("payment_splits").$type<Array<{ method: string; amount: number }>>(),
});

export const debtPayments = pgTable("debt_payments", {
  paymentMethod: text("payment_method"),
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  transactionId: varchar("transaction_id").references(() => transactions.id),
  amount: moneyNumber("amount").notNull(),
  date: timestamp("date").notNull(),
  note: text("note"),
});

// A standalone debt ledger. These records intentionally have no relation to
// transactions, products, expenses, incomes, or cash-register entries.
export const independentDebts = pgTable("independent_debts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  debtorName: text("debtor_name").notNull(),
  phone: text("phone").notNull().default(""),
  itemDescription: text("item_description").notNull(),
  totalAmount: moneyNumber("total_amount").notNull(),
  paidAmount: moneyNumber("paid_amount").notNull().default(0),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("independent_debts_tenant_status_idx").on(table.tenantId, table.status),
  index("independent_debts_tenant_due_date_idx").on(table.tenantId, table.dueDate),
  check("independent_debts_paid_not_over_total", sql`${table.paidAmount} <= ${table.totalAmount}`),
]);

export const independentDebtPayments = pgTable("independent_debt_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  debtId: varchar("debt_id").notNull().references(() => independentDebts.id, { onDelete: "cascade" }),
  amount: moneyNumber("amount").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  note: text("note").notNull().default(""),
}, (table) => [
  index("independent_debt_payments_tenant_debt_idx").on(table.tenantId, table.debtId),
]);

export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("Receipt"),
  color: text("color").notNull().default("#6b7280"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const incomeCategories = pgTable("income_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("ArrowDown"),
  color: text("color").notNull().default("#22c55e"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const expenses = pgTable("expenses", {
  paymentMethod: text("payment_method"),
  classification: text("classification").notNull().default("unclassified"),
  voidedAt: timestamp("voided_at"),
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  amount: moneyNumber("amount").notNull(),
  categoryId: varchar("category_id").references(() => expenseCategories.id),
  description: text("description").default(""),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  orderId: varchar("order_id").references(() => orders.id),
  customerId: varchar("customer_id"),
  address: text("address").default(""),
  courier: text("courier").default(""),
  courierId: varchar("courier_id"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default("pending"),
  note: text("note").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  changes: json("changes").$type<Record<string, any>>(),
  userId: text("user_id").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cashRegisterEntries = pgTable("cash_register_entries", {
  source: text("source").notNull().default("manual"),
  voidedAt: timestamp("voided_at"),
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  type: text("type").notNull(),
  amount: moneyNumber("amount").notNull(),
  paymentType: text("payment_type").notNull().default("cash"),
  categoryName: text("category_name").default(""),
  counterparty: text("counterparty").default(""),
  note: text("note").default(""),
  createdBy: varchar("created_by"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shiftHandovers = pgTable("shift_handovers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  periodType: text("period_type").notNull().default("day"),
  dateFrom: timestamp("date_from").notNull(),
  dateTo: timestamp("date_to").notNull(),
  totalCash: integer("total_cash").notNull().default(0),
  totalCard: integer("total_card").notNull().default(0),
  totalNasiya: integer("total_nasiya").notNull().default(0),
  totalExpenses: integer("total_expenses").notNull().default(0),
  totalAmount: moneyNumber("total_amount").notNull().default(0),
  handedByName: text("handed_by_name").notNull(),
  receivedByName: text("received_by_name").notNull(),
  status: text("status").notNull().default("pending"),
  note: text("note").default(""),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const staffMembers = pgTable("staff_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  username: text("username").notNull(),
  password: text("password").notNull(),
  token: text("token").notNull().unique(),
  faceDescriptor: json("face_descriptor").$type<number[]>(),
  facePhoto: text("face_photo"),
  locationLat: text("location_lat"),
  locationLng: text("location_lng"),
  locationRadius: integer("location_radius").notNull().default(100),
  locationName: text("location_name").default(""),
  hourlyRate: integer("hourly_rate").notNull().default(0),
  isCourier: boolean("is_courier").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  phone: text("phone").default(""),
  address: text("address").default(""),
  note: text("note").default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  staffId: varchar("staff_id").references(() => staffMembers.id),
  type: text("type").notNull(),
  faceVerified: boolean("face_verified").notNull().default(false),
  locationVerified: boolean("location_verified").notNull().default(false),
  locationLat: text("location_lat"),
  locationLng: text("location_lng"),
  faceScore: integer("face_score").notNull().default(0),
  locationDistance: integer("location_distance").notNull().default(0),
  photo: text("photo"),
  note: text("note").default(""),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Financial journals are also described here so schema tooling cannot mistake
// the versioned migration's tables for abandoned data.
export const financeMigrations=pgTable('finance_migrations',{
 version:text('version').primaryKey(),appliedAt:timestamp('applied_at').notNull().defaultNow(),
});
export const financeOperations=pgTable('finance_operations',{
 tenantId:varchar('tenant_id').notNull().references(()=>tenants.id),kind:text('kind').notNull(),id:text('id').notNull(),fingerprint:text('fingerprint').notNull(),response:jsonb('response').notNull(),createdAt:timestamp('created_at').notNull().defaultNow(),
},t=>[primaryKey({name:'finance_operations_pkey',columns:[t.tenantId,t.kind,t.id]})]);
export const stockMovements=pgTable('stock_movements',{
 id:varchar('id').primaryKey().default(sql`gen_random_uuid()`),tenantId:varchar('tenant_id').notNull().references(()=>tenants.id),productId:varchar('product_id').notNull(),operationId:text('operation_id').notNull(),quantity:decimalNumber('quantity').notNull(),reason:text('reason').notNull(),date:timestamp('date').notNull().defaultNow(),
},t=>[uniqueIndex('stock_movement_operation').on(t.tenantId,t.operationId,t.productId,t.reason)]);
export const supplierPurchases=pgTable('supplier_purchases',{
 id:varchar('id').primaryKey().default(sql`gen_random_uuid()`),tenantId:varchar('tenant_id').notNull().references(()=>tenants.id),productId:varchar('product_id').notNull(),supplier:text('supplier').notNull(),currency:text('currency').notNull(),rate:rateNumber('rate'),quantity:decimalNumber('quantity').notNull(),principal:purchaseNumber('principal').notNull(),paid:purchaseNumber('paid').notNull().default(0),source:text('source').notNull(),paymentMethod:text('payment_method').notNull().default('nasiya'),date:timestamp('date').notNull().defaultNow(),
},t=>[uniqueIndex('supplier_opening_once').on(t.tenantId,t.productId).where(sql`${t.source}='opening'`)]);
export const supplierPayments=pgTable('supplier_payments',{
 id:text('id').notNull(),tenantId:varchar('tenant_id').notNull().references(()=>tenants.id),supplier:text('supplier').notNull(),currency:text('currency').notNull(),amount:purchaseNumber('amount').notNull(),account:text('account').notNull(),allocations:jsonb('allocations').notNull(),date:timestamp('date').notNull().defaultNow(),
},t=>[primaryKey({name:'supplier_payments_pkey',columns:[t.tenantId,t.id]})]);
export const financeAudit=pgTable('finance_audit',{
 id:varchar('id').primaryKey().default(sql`gen_random_uuid()`),tenantId:varchar('tenant_id').notNull().references(()=>tenants.id),userId:text('user_id').notNull(),kind:text('kind').notNull(),operationId:text('operation_id').notNull(),beforeValue:jsonb('before_value'),afterValue:jsonb('after_value'),reason:text('reason').notNull(),date:timestamp('date').notNull().defaultNow(),
});

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants, {
 paymentMethods:z.array(z.object({id:z.string(),name:z.string()})).nullable(),
 productFields:z.array(z.object({key:z.string(),label:z.string(),required:z.boolean().optional()})).nullable(),
 customerFields:z.array(z.object({key:z.string(),label:z.string()})).nullable(),
 productFormVisibility:z.record(z.boolean()).nullable(),
 orderFormFields:z.array(z.object({key:z.string(),label:z.string(),enabled:z.boolean(),required:z.boolean(),options:z.array(z.object({id:z.string(),label:z.string(),type:z.string().optional()})).optional()})).nullable()
}).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders,{statusHistory:z.array(z.object({status:z.string(),date:z.string(),userId:z.string().optional(),note:z.string().optional()})).nullable()}).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions);

export const insertDebtPaymentSchema = createInsertSchema(debtPayments).omit({
  id: true,
});

export const insertIndependentDebtSchema = createInsertSchema(independentDebts).omit({
  id: true,
  paidAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIndependentDebtPaymentSchema = createInsertSchema(independentDebtPayments).omit({
  id: true,
  date: true,
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
});

export const insertIncomeCategorySchema = createInsertSchema(incomeCategories).omit({
  id: true,
});

export const insertExpenseSchema = createInsertSchema(expenses, { amount: z.number().finite().positive().max(1e12) }).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers, {addresses:z.array(z.object({label:z.string(),address:z.string()})).nullable()}).omit({
  id: true,
  createdAt: true,
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs,{changes:z.record(z.any()).nullable()}).omit({
  id: true,
  createdAt: true,
});

export const insertCashRegisterEntrySchema = createInsertSchema(cashRegisterEntries, { amount: z.number().finite().positive().max(1e12) }).omit({
  id: true,
  createdAt: true,
});

export const insertShiftHandoverSchema = createInsertSchema(shiftHandovers).omit({
  id: true,
  createdAt: true,
});

export const insertStaffMemberSchema = createInsertSchema(staffMembers,{faceDescriptor:z.array(z.number()).nullable()}).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

// Register schema for onboarding
export const registerTenantSchema = z.object({
  storeName: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().min(6),
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  slug: z.string().optional(),
});

// Types
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

export type InsertIncomeCategory = z.infer<typeof insertIncomeCategorySchema>;
export type IncomeCategory = typeof incomeCategories.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertDebtPayment = z.infer<typeof insertDebtPaymentSchema>;
export type DebtPayment = typeof debtPayments.$inferSelect;

export type InsertIndependentDebt = z.infer<typeof insertIndependentDebtSchema>;
export type IndependentDebt = typeof independentDebts.$inferSelect;

export type InsertIndependentDebtPayment = z.infer<typeof insertIndependentDebtPaymentSchema>;
export type IndependentDebtPayment = typeof independentDebtPayments.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveries.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertCashRegisterEntry = z.infer<typeof insertCashRegisterEntrySchema>;
export type CashRegisterEntry = typeof cashRegisterEntries.$inferSelect;

export type InsertShiftHandover = z.infer<typeof insertShiftHandoverSchema>;
export type ShiftHandover = typeof shiftHandovers.$inferSelect;

export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffMember = typeof staffMembers.$inferSelect;

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;
