import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertOrderSchema, insertCategorySchema, insertTransactionSchema, registerTenantSchema, loginSchema } from "@shared/schema";
import { registerR2Routes } from "./integrations/r2-routes";
import { sendTelegramNotification } from "./telegram";
import { authMiddleware, optionalAuth, superAdminOnly, hashPassword, comparePassword, generateToken } from "./auth";
import { getTenantBySlug, getTenantById, invalidateTenantCache } from "./tenant";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  registerR2Routes(app);

  // ============ AUTH ROUTES ============

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerTenantSchema.parse(req.body);

      const existingTenant = await storage.getTenantBySlug(data.slug);
      if (existingTenant) {
        return res.status(400).json({ error: "Bu slug allaqachon band" });
      }

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      const tenant = await storage.createTenant({
        slug: data.slug,
        name: data.storeName,
        plan: "trial",
        status: "active",
        trialEnd,
        maxProducts: 100,
        maxUsers: 1,
        ownerUsername: data.username,
        ownerPassword: data.password,
      });

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        username: data.username,
        email: data.email || null,
        password: hashedPassword,
        role: "owner",
        tenantId: tenant.id,
        isSuper: false,
      });

      const token = generateToken({
        userId: user.id,
        tenantId: tenant.id,
        role: "owner",
        isSuper: false,
      });

      res.status(201).json({
        token,
        user: { id: user.id, username: user.username, role: user.role },
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      });
    } catch (error: any) {
      console.error("Register error:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: "Ma'lumotlar to'liq emas", details: error.errors });
      }
      res.status(500).json({ error: "Ro'yxatdan o'tishda xatolik" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const trimmedUsername = data.username.trim();

      let user;
      if (data.slug) {
        const tenant = await storage.getTenantBySlug(data.slug);
        if (!tenant) {
          return res.status(401).json({ error: "Do'kon topilmadi" });
        }
        user = await storage.getUserByUsername(trimmedUsername, tenant.id);
        if (!user) {
          user = await storage.getUserByUsername(data.username, tenant.id);
        }
      } else {
        user = await storage.getUserByUsername(trimmedUsername);
        if (!user) {
          user = await storage.getUserByUsername(data.username);
        }
      }

      if (!user) {
        console.log("Login failed - user not found:", trimmedUsername, "slug:", data.slug);
        return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      }

      const isValid = await comparePassword(data.password, user.password);
      if (!isValid) {
        console.log("Login failed - wrong password for user:", user.username);
        return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      }

      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;

      const token = generateToken({
        userId: user.id,
        tenantId: user.tenantId || "",
        role: user.role,
        isSuper: user.isSuper,
      });

      res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, isSuper: user.isSuper },
        tenant: tenant ? { id: tenant.id, slug: tenant.slug, name: tenant.name, logo: tenant.logo, brandColor: tenant.brandColor } : null,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Kirishda xatolik" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

      const tenant = user.tenantId ? await getTenantById(user.tenantId) : null;

      res.json({
        user: { id: user.id, username: user.username, role: user.role, isSuper: user.isSuper },
        tenant: tenant ? { id: tenant.id, slug: tenant.slug, name: tenant.name, logo: tenant.logo, brandColor: tenant.brandColor, plan: tenant.plan, status: tenant.status, telegramBotToken: !!tenant.telegramBotToken, telegramChatId: !!tenant.telegramChatId } : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  // ============ STORES LIST (PUBLIC) ============

  app.get("/api/stores", async (req, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      const activeStores = allTenants.filter(t => t.status === "active");
      const publicData = await Promise.all(activeStores.map(async (t) => {
        const products = await storage.getAllProducts(t.id);
        return {
          id: t.id,
          slug: t.slug,
          name: t.name,
          logo: t.logo,
          brandColor: t.brandColor,
          status: t.status,
          productsCount: products.length,
        };
      }));
      res.json(publicData);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  // ============ STORE PUBLIC API (slug-based, no tenant spoofing) ============

  app.get("/api/store/:slug/products", async (req, res) => {
    try {
      const tenant = await getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Do'kon topilmadi" });
      const products = await storage.getAllProducts(tenant.id);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  app.get("/api/store/:slug/categories", async (req, res) => {
    try {
      const tenant = await getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Do'kon topilmadi" });
      const cats = await storage.getAllCategories(tenant.id);
      res.json(cats);
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  // ============ TENANT INFO (PUBLIC) ============

  app.get("/api/tenant/default", async (req, res) => {
    try {
      const { db } = await import("@db");
      const { tenants } = await import("@shared/schema");
      const [first] = await db.select().from(tenants).orderBy(tenants.createdAt).limit(1);
      if (!first) return res.status(404).json({ error: "Tenant topilmadi" });
      res.json({ slug: first.slug, name: first.name });
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  app.get("/api/tenant/:slug", async (req, res) => {
    try {
      const tenant = await getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Do'kon topilmadi" });

      res.json({
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        logo: tenant.logo,
        brandColor: tenant.brandColor,
      });
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  // ============ TENANT SETTINGS (PROTECTED) ============

  app.get("/api/tenant-settings", authMiddleware, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.tenantId!);
      if (!tenant) return res.status(404).json({ error: "Tenant topilmadi" });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  app.patch("/api/tenant-settings", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== "owner") {
        return res.status(403).json({ error: "Faqat do'kon egasi uchun" });
      }
      const updated = await storage.updateTenant(req.tenantId!, req.body);
      if (updated) invalidateTenantCache(updated.slug);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  // ============ SUPER ADMIN ============

  app.get("/api/admin/tenants", authMiddleware, superAdminOnly, async (req, res) => {
    try {
      const tenantsWithStats = await storage.getAllTenantsWithStats();
      res.json(tenantsWithStats);
    } catch (error) {
      console.error("Get tenants error:", error);
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  app.post("/api/admin/tenants", authMiddleware, superAdminOnly, async (req, res) => {
    try {
      const { storeName, slug, plan, username, password, maxProducts, maxUsers, subscriptionDays } = req.body;
      if (!storeName || !slug || !username || !password) {
        return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
      }
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      }
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: "Slug faqat kichik harflar, raqamlar va tire bo'lishi mumkin" });
      }
      const existing = await storage.getTenantBySlug(slug);
      if (existing) {
        return res.status(400).json({ error: "Bu slug allaqachon mavjud" });
      }
      const validPlans = ["free", "starter", "professional", "premium"];
      const selectedPlan = validPlans.includes(plan) ? plan : "free";
      const hashedPw = await hashPassword(password);

      const { db } = await import("@db");
      const result = await db.transaction(async (tx) => {
        const { tenants, users } = await import("@shared/schema");
        const rawDays = subscriptionDays ? Number(subscriptionDays) : 0;
        const days = (!isNaN(rawDays) && rawDays >= 0) ? Math.floor(rawDays) : 0;
        let trialEnd: Date | null = null;
        if (days > 0) {
          trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + days);
        }
        const [tenant] = await tx.insert(tenants).values({
          slug,
          name: storeName,
          plan: selectedPlan,
          maxProducts: maxProducts || 100,
          maxUsers: maxUsers || 1,
          ownerUsername: username,
          ownerPassword: password,
          subscriptionDays: days,
          trialEnd,
        }).returning();
        const [user] = await tx.insert(users).values({
          username,
          password: hashedPw,
          role: "owner",
          tenantId: tenant.id,
          isSuper: false,
          email: null,
        }).returning();
        return { tenant, owner: { id: user.id, username: user.username } };
      });
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Create tenant error:", error);
      res.status(500).json({ error: "Do'kon yaratishda xatolik" });
    }
  });

  app.patch("/api/admin/tenants/:id", authMiddleware, superAdminOnly, async (req, res) => {
    try {
      const allowedFields = ["name", "plan", "status", "maxProducts", "maxUsers", "brandColor", "logo", "telegramBotToken", "telegramChatId", "subscriptionDays"];
      const data: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (data.plan) {
        const validPlans = ["free", "starter", "professional", "premium"];
        if (!validPlans.includes(data.plan)) {
          return res.status(400).json({ error: "Noto'g'ri reja" });
        }
      }
      if (data.status) {
        const validStatuses = ["active", "suspended", "trial"];
        if (!validStatuses.includes(data.status)) {
          return res.status(400).json({ error: "Noto'g'ri status" });
        }
      }
      if (data.subscriptionDays !== undefined) {
        const days = Number(data.subscriptionDays);
        if (isNaN(days) || days < 0) {
          return res.status(400).json({ error: "Noto'g'ri kunlar soni" });
        }
        data.subscriptionDays = days;
        if (days > 0) {
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + days);
          data.trialEnd = trialEnd;
        } else {
          data.trialEnd = null;
        }
      }
      const updated = await storage.updateTenant(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Tenant topilmadi" });
      invalidateTenantCache(updated.slug);
      res.json(updated);
    } catch (error) {
      console.error("Update tenant error:", error);
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  app.post("/api/admin/tenants/:id/reset-password", authMiddleware, superAdminOnly, async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      }
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) return res.status(404).json({ error: "Tenant topilmadi" });

      const hashedPw = await hashPassword(password);
      const tenantUsers = await storage.getUsersByTenant(tenant.id);
      const owner = tenantUsers.find(u => u.role === "owner");
      if (!owner) return res.status(404).json({ error: "Do'kon egasi topilmadi" });

      const { db } = await import("@db");
      const { users: usersTable, tenants: tenantsTable } = await import("@shared/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      await db.update(usersTable).set({ password: hashedPw }).where(eqOp(usersTable.id, owner.id));
      await db.update(tenantsTable).set({ ownerPassword: password }).where(eqOp(tenantsTable.id, tenant.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  app.delete("/api/admin/tenants/:id", authMiddleware, superAdminOnly, async (req, res) => {
    try {
      if (req.params.id === "default-tenant") {
        return res.status(400).json({ error: "Default tenantni o'chirish mumkin emas" });
      }
      const deleted = await storage.deleteTenant(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Tenant topilmadi" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete tenant error:", error);
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  // ============ PRODUCTS API (tenant-scoped) ============

  app.get("/api/products", optionalAuth, async (req, res) => {
    try {
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string || "default-tenant";

      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      if (req.query.paginated === 'true') {
        const result = await storage.getProductsPaginated(tenantId, Math.min(limit, 100), offset);
        res.json(result);
      } else {
        const products = await storage.getAllProducts(tenantId);
        res.json(products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", optionalAuth, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id, req.tenantId);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.get("/api/products/barcode/:barcode", authMiddleware, async (req, res) => {
    try {
      const product = await storage.getProductByBarcode(req.params.barcode, req.tenantId!);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", authMiddleware, async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse({ ...req.body, tenantId: req.tenantId });
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      if (error?.code === '23505') {
        return res.status(400).json({ error: "Bu shtrix kod allaqachon mavjud" });
      }
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: "Ma'lumotlar to'liq emas", details: error.errors });
      }
      res.status(500).json({ error: "Xatolik yuz berdi" });
    }
  });

  app.patch("/api/products/:id", authMiddleware, async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body, req.tenantId);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id, req.tenantId);
      if (!deleted) return res.status(404).json({ error: "Mahsulot topilmadi" });
      res.json({ success: true, message: "Mahsulot o'chirildi" });
    } catch (error) {
      res.status(500).json({ error: "Mahsulotni o'chirishda xatolik" });
    }
  });

  app.put("/api/products/reorder", authMiddleware, async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return res.status(400).json({ error: "orderedIds massivi kerak" });
      }
      await storage.reorderProducts(orderedIds, req.tenantId);
      res.json({ success: true, message: "Tartib saqlandi" });
    } catch (error) {
      res.status(500).json({ error: "Tartibni saqlashda xatolik" });
    }
  });

  // ============ ORDERS API (tenant-scoped) ============

  app.get("/api/orders", authMiddleware, async (req, res) => {
    try {
      const orders = await storage.getAllOrders(req.tenantId!);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", authMiddleware, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id, req.tenantId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/store/:slug/orders", async (req, res) => {
    try {
      const tenant = await getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Do'kon topilmadi" });
      const tenantId = tenant.id;
      const validatedData = insertOrderSchema.parse({ ...req.body, tenantId });
      const order = await storage.createOrder(validatedData);

      const botToken = tenant.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = tenant.telegramChatId || process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        sendTelegramNotification({
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerTelegram: order.customerTelegram,
          items: order.items as any[],
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          deliveryType: order.deliveryType,
          createdAt: order.createdAt,
        }, botToken, chatId).catch(err => console.error('Failed to send Telegram notification:', err));
      }
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating store order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.post("/api/orders", optionalAuth, async (req, res) => {
    try {
      const tenantId = req.tenantId || "default-tenant";

      const validatedData = insertOrderSchema.parse({ ...req.body, tenantId });
      const order = await storage.createOrder(validatedData);
      
      const tenant = await getTenantById(tenantId);
      const botToken = tenant?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = tenant?.telegramChatId || process.env.TELEGRAM_CHAT_ID;

      if (botToken && chatId) {
        sendTelegramNotification({
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerTelegram: order.customerTelegram,
          items: order.items as any[],
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          deliveryType: order.deliveryType,
          createdAt: order.createdAt,
        }, botToken, chatId).catch(err => console.error('Failed to send Telegram notification:', err));
      }
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  app.patch("/api/orders/:id/status", authMiddleware, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Status is required" });
      const order = await storage.updateOrderStatus(req.params.id, status, req.tenantId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // ============ CATEGORIES API (tenant-scoped) ============

  app.get("/api/categories", optionalAuth, async (req, res) => {
    try {
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string || "default-tenant";
      const categories = await storage.getAllCategories(tenantId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", authMiddleware, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse({ ...req.body, tenantId: req.tenantId });
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.patch("/api/categories/:id", authMiddleware, async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body, req.tenantId);
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", authMiddleware, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id, req.tenantId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // ============ TRANSACTIONS API (tenant-scoped) ============

  app.get("/api/transactions", authMiddleware, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions(req.tenantId!);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", optionalAuth, async (req, res) => {
    try {
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      const data = {
        ...req.body,
        tenantId,
        date: new Date(req.body.date)
      };
      const transaction = await storage.createTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.post("/api/transactions/:id/void", authMiddleware, async (req, res) => {
    try {
      const result = await storage.voidTransaction(req.params.id, req.tenantId);
      if (!result) return res.status(404).json({ error: "Transaction not found" });
      if (result.alreadyVoided) {
        return res.status(409).json({ error: "Transaction already voided", transaction: result.transaction });
      }
      res.json(result.transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to void transaction" });
    }
  });

  return httpServer;
}
