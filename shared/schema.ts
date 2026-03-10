import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  deliveryEnabled: boolean("delivery_enabled").notNull().default(false),
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
  costPrice: integer("cost_price").notNull().default(0),
  barcodePrice: integer("barcode_price"),
  wholesalePrice: integer("wholesale_price"),
  stock: integer("stock").notNull(),
  category: text("category").notNull(),
  barcode: text("barcode").notNull(),
  supplier: text("supplier").default(""),
  supplierPaymentMethod: text("supplier_payment_method").default("naqd"),
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
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("new"),
  paymentMethod: text("payment_method").notNull(),
  deliveryType: text("delivery_type").notNull(),
  address: text("address").default(""),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  debtAmount: integer("debt_amount").notNull().default(0),
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
  id: varchar("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  date: timestamp("date").notNull(),
  items: json("items").notNull(),
  totalAmount: integer("total_amount").notNull(),
  totalProfit: integer("total_profit").notNull().default(0),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("completed"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerInfo: json("customer_info").$type<Record<string, string>>(),
  dueDate: timestamp("due_date"),
  paidAmount: integer("paid_amount").notNull().default(0),
  debtStatus: text("debt_status").default("none"),
});

export const debtPayments = pgTable("debt_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  transactionId: varchar("transaction_id").references(() => transactions.id),
  amount: integer("amount").notNull(),
  date: timestamp("date").notNull(),
  note: text("note"),
});

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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  amount: integer("amount").notNull(),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
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
  totalAmount: integer("total_amount").notNull().default(0),
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

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
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

export const insertOrderSchema = createInsertSchema(orders).omit({
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

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
});

export const insertIncomeCategorySchema = createInsertSchema(incomeCategories).omit({
  id: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertCashRegisterEntrySchema = createInsertSchema(cashRegisterEntries).omit({
  id: true,
  createdAt: true,
});

export const insertShiftHandoverSchema = createInsertSchema(shiftHandovers).omit({
  id: true,
  createdAt: true,
});

export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({
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
