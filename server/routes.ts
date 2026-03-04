import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertOrderSchema, insertCategorySchema, insertTransactionSchema, registerTenantSchema, loginSchema, insertExpenseSchema, insertExpenseCategorySchema } from "@shared/schema";
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
      if (req.user!.role === "owner") {
        res.json(tenant);
      } else {
        const { telegramBotToken, telegramChatId, ...safe } = tenant;
        res.json({ ...safe, telegramBotToken: !!telegramBotToken, telegramChatId: !!telegramChatId });
      }
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  app.patch("/api/tenant-settings", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== "owner") {
        return res.status(403).json({ error: "Faqat do'kon egasi uchun" });
      }
      const allowedFields = ["name", "brandColor", "logo", "telegramBotToken", "telegramChatId", "paymentMethods", "productFields", "customerFields", "receiptLogo", "productFormVisibility"];
      const data: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      const updated = await storage.updateTenant(req.tenantId!, data);
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

  app.get("/api/products", authMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant aniqlanmadi" });

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

  app.get("/api/products/:id", authMiddleware, async (req, res) => {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant aniqlanmadi" });
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
      let barcode = req.body.barcode?.trim();
      if (!barcode) {
        barcode = `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      }
      const body = {
        ...req.body,
        barcode,
        tenantId: req.tenantId,
        author: req.body.author || "",
        image: req.body.image || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300&h=400",
        category: req.body.category || "Boshqa",
        costPrice: Number(req.body.costPrice) || 0,
        price: Number(req.body.price) || 0,
        stock: Number(req.body.stock) || 0,
        barcodePrice: req.body.barcodePrice ? Number(req.body.barcodePrice) : null,
        wholesalePrice: req.body.wholesalePrice ? Number(req.body.wholesalePrice) : null,
      };
      const validatedData = insertProductSchema.parse(body);
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
      const data = { ...req.body };
      if (data.price !== undefined) data.price = Number(data.price) || 0;
      if (data.costPrice !== undefined) data.costPrice = Number(data.costPrice) || 0;
      if (data.stock !== undefined) data.stock = Number(data.stock) || 0;
      if (data.barcodePrice !== undefined) data.barcodePrice = data.barcodePrice ? Number(data.barcodePrice) : null;
      if (data.wholesalePrice !== undefined) data.wholesalePrice = data.wholesalePrice ? Number(data.wholesalePrice) : null;
      const product = await storage.updateProduct(req.params.id, data, req.tenantId);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error: any) {
      console.error("Error updating product:", error);
      if (error?.code === '23505') {
        return res.status(400).json({ error: "Bu shtrix kod allaqachon mavjud" });
      }
      res.status(500).json({ error: "Mahsulotni yangilashda xatolik" });
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
      const orderBody = {
        ...req.body,
        tenantId,
        totalAmount: Number(req.body.totalAmount) || 0,
        customerName: req.body.customerName || "",
        customerPhone: req.body.customerPhone || "",
        paymentMethod: req.body.paymentMethod || "cash",
        deliveryType: req.body.deliveryType || "pickup",
        status: req.body.status || "new",
      };
      const validatedData = insertOrderSchema.parse(orderBody);
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

  app.post("/api/orders", authMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant aniqlanmadi" });

      const orderBody = {
        ...req.body,
        tenantId,
        totalAmount: Number(req.body.totalAmount) || 0,
        customerName: req.body.customerName || "",
        customerPhone: req.body.customerPhone || "",
        paymentMethod: req.body.paymentMethod || "cash",
        deliveryType: req.body.deliveryType || "pickup",
        status: req.body.status || "new",
      };
      const validatedData = insertOrderSchema.parse(orderBody);
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

  app.get("/api/categories", authMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant aniqlanmadi" });
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
      const oldCategory = await storage.getCategory(req.params.id, req.tenantId);
      if (!oldCategory) return res.status(404).json({ error: "Category not found" });
      
      const category = await storage.updateCategory(req.params.id, req.body, req.tenantId);
      if (!category) return res.status(404).json({ error: "Category not found" });
      
      if (req.body.name && req.body.name !== oldCategory.name) {
        await storage.renameProductCategory(oldCategory.name, req.body.name, req.tenantId!);
      }
      
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

  app.post("/api/categories/reorder", authMiddleware, async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
      await storage.reorderCategories(orderedIds, req.tenantId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder categories" });
    }
  });

  app.patch("/api/categories/:id/pin", authMiddleware, async (req, res) => {
    try {
      const { isPinned } = req.body;
      const category = await storage.updateCategory(req.params.id, { isPinned: !!isPinned }, req.tenantId);
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to pin category" });
    }
  });

  app.post("/api/categories/assign-products", authMiddleware, async (req, res) => {
    try {
      const { productIds, categoryName } = req.body;
      if (!Array.isArray(productIds) || !categoryName) {
        return res.status(400).json({ error: "productIds and categoryName required" });
      }
      await storage.assignProductsToCategory(productIds, categoryName, req.tenantId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to assign products" });
    }
  });

  app.post("/api/categories/unassign-products", authMiddleware, async (req, res) => {
    try {
      const { productIds } = req.body;
      if (!Array.isArray(productIds)) {
        return res.status(400).json({ error: "productIds required" });
      }
      await storage.unassignProductsFromCategory(productIds, req.tenantId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unassign products" });
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

  app.post("/api/transactions", authMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant aniqlanmadi" });
      const data = {
        id: req.body.id || crypto.randomUUID(),
        tenantId,
        date: new Date(req.body.date),
        items: req.body.items || [],
        totalAmount: Number(req.body.totalAmount) || 0,
        totalProfit: Number(req.body.totalProfit) || 0,
        paymentMethod: req.body.paymentMethod || "cash",
        status: req.body.status || "completed",
        customerName: req.body.customerName || null,
        customerPhone: req.body.customerPhone || null,
        customerInfo: req.body.customerInfo || null,
      };
      const transaction = await storage.createTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ error: "Tranzaksiyani saqlashda xatolik" });
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

  // ============ EXPENSE CATEGORIES ============

  app.get("/api/expense-categories", authMiddleware, async (req, res) => {
    try {
      const cats = await storage.getExpenseCategories(req.tenantId!);
      res.json(cats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense categories" });
    }
  });

  app.post("/api/expense-categories", authMiddleware, async (req, res) => {
    try {
      const data = insertExpenseCategorySchema.parse({ ...req.body, tenantId: req.tenantId });
      const cat = await storage.createExpenseCategory(data);
      res.json(cat);
    } catch (error) {
      res.status(500).json({ error: "Failed to create expense category" });
    }
  });

  app.patch("/api/expense-categories/:id", authMiddleware, async (req, res) => {
    try {
      const updated = await storage.updateExpenseCategory(req.params.id, req.body, req.tenantId);
      if (!updated) return res.status(404).json({ error: "Category not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update expense category" });
    }
  });

  app.delete("/api/expense-categories/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await storage.deleteExpenseCategory(req.params.id, req.tenantId);
      if (!deleted) return res.status(404).json({ error: "Category not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense category" });
    }
  });

  // ============ EXPENSES ============

  app.get("/api/expenses", authMiddleware, async (req, res) => {
    try {
      const { from, to, category } = req.query;
      const dateFrom = from ? new Date(from as string) : undefined;
      const dateTo = to ? new Date(to as string) : undefined;
      const categoryId = category as string | undefined;
      const exps = await storage.getExpenses(req.tenantId!, dateFrom, dateTo, categoryId);
      res.json(exps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", authMiddleware, async (req, res) => {
    try {
      const data = insertExpenseSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
        date: new Date(req.body.date),
      });
      const expense = await storage.createExpense(data);
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", authMiddleware, async (req, res) => {
    try {
      const updateData: any = { ...req.body };
      if (updateData.date) updateData.date = new Date(updateData.date);
      const updated = await storage.updateExpense(req.params.id, updateData, req.tenantId);
      if (!updated) return res.status(404).json({ error: "Expense not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id, req.tenantId);
      if (!deleted) return res.status(404).json({ error: "Expense not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // ============ FINANCE SUMMARY ============

  app.get("/api/finance/summary", authMiddleware, async (req, res) => {
    try {
      const period = (req.query.period as string) || "day";
      const now = new Date();
      let dateFrom: Date;
      let prevFrom: Date;
      let prevTo: Date;

      if (period === "week") {
        const dayOfWeek = now.getDay() || 7;
        dateFrom = new Date(now);
        dateFrom.setDate(now.getDate() - dayOfWeek + 1);
        dateFrom.setHours(0, 0, 0, 0);
        prevTo = new Date(dateFrom);
        prevTo.setMilliseconds(-1);
        prevFrom = new Date(prevTo);
        prevFrom.setDate(prevTo.getDate() - 6);
        prevFrom.setHours(0, 0, 0, 0);
      } else if (period === "month") {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        prevTo = new Date(dateFrom);
        prevTo.setMilliseconds(-1);
        prevFrom = new Date(prevTo.getFullYear(), prevTo.getMonth(), 1);
      } else {
        dateFrom = new Date(now);
        dateFrom.setHours(0, 0, 0, 0);
        prevTo = new Date(dateFrom);
        prevTo.setMilliseconds(-1);
        prevFrom = new Date(prevTo);
        prevFrom.setHours(0, 0, 0, 0);
      }

      const dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);

      const current = await storage.getFinancialSummary(req.tenantId!, dateFrom, dateTo);
      const previous = await storage.getFinancialSummary(req.tenantId!, prevFrom, prevTo);

      res.json({
        ...current,
        prevRevenue: previous.revenue,
        prevExpenses: previous.expensesTotal,
        prevProfit: previous.profit,
        prevTransactionCount: previous.transactionCount,
        period,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get financial summary" });
    }
  });

  app.get("/api/finance/daily-breakdown", authMiddleware, async (req, res) => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();
      const to = req.query.to ? new Date(req.query.to as string) : new Date();

      const allTransactions = await storage.getAllTransactions(req.tenantId!);
      const allExpenses = await storage.getExpenses(req.tenantId!, from, to);

      const days: Record<string, { date: string; revenue: number; expenses: number; profit: number; payments: Record<string, number> }> = {};
      const current = new Date(from);
      while (current <= to) {
        const key = current.toISOString().split("T")[0];
        days[key] = { date: key, revenue: 0, expenses: 0, profit: 0, payments: {} };
        current.setDate(current.getDate() + 1);
      }

      for (const t of allTransactions) {
        if (t.status === "voided") continue;
        const key = new Date(t.date).toISOString().split("T")[0];
        if (days[key]) {
          days[key].revenue += t.totalAmount;
          const method = t.paymentMethod || "Naqd";
          days[key].payments[method] = (days[key].payments[method] || 0) + t.totalAmount;
        }
      }

      for (const e of allExpenses) {
        const key = new Date(e.date).toISOString().split("T")[0];
        if (days[key]) {
          days[key].expenses += e.amount;
        }
      }

      const result = Object.values(days).map(d => ({
        ...d,
        profit: d.revenue - d.expenses,
      }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get daily breakdown" });
    }
  });

  return httpServer;
}
