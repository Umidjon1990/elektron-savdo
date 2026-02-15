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
  author: text("author").notNull(),
  price: integer("price").notNull(),
  costPrice: integer("cost_price").notNull().default(0),
  stock: integer("stock").notNull(),
  category: text("category").notNull(),
  barcode: text("barcode").notNull(),
  image: text("image").notNull(),
  videoUrl: text("video_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isNew: boolean("is_new").notNull().default(false),
}, (table) => [
  uniqueIndex("products_tenant_barcode_idx").on(table.tenantId, table.barcode),
]);

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
