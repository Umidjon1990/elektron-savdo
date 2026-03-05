import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertOrderSchema, insertCategorySchema, insertTransactionSchema, registerTenantSchema, loginSchema, insertExpenseSchema, insertExpenseCategorySchema, insertIncomeCategorySchema, insertCashRegisterEntrySchema, insertCustomerSchema, insertDeliverySchema } from "@shared/schema";
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
      const allowedFields = ["name", "brandColor", "logo", "telegramBotToken", "telegramChatId", "paymentMethods", "productFields", "customerFields", "receiptLogo", "productFormVisibility", "deliveryEnabled"];
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
      const isNasiya = (req.body.paymentMethod || "cash") === "nasiya";
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
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        paidAmount: Number(req.body.paidAmount) || 0,
        debtStatus: isNasiya ? "pending" : "none",
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

  // ============ DEBT / NASIYA ============

  app.get("/api/debts", authMiddleware, async (req, res) => {
    try {
      const debtTxns = await storage.getDebtTransactions(req.tenantId!);
      res.json(debtTxns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debts" });
    }
  });

  app.get("/api/debts/:transactionId/payments", authMiddleware, async (req, res) => {
    try {
      const payments = await storage.getDebtPayments(req.params.transactionId, req.tenantId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/debts/:transactionId/pay", authMiddleware, async (req, res) => {
    try {
      const txn = await storage.getTransaction(req.params.transactionId, req.tenantId);
      if (!txn) return res.status(404).json({ error: "Tranzaksiya topilmadi" });

      const payAmount = Number(req.body.amount);
      if (!payAmount || payAmount <= 0) return res.status(400).json({ error: "To'lov summasi noto'g'ri" });

      const newPaid = (txn.paidAmount || 0) + payAmount;
      const remaining = txn.totalAmount - newPaid;
      const newStatus = remaining <= 0 ? "paid" : "partial";

      await storage.createDebtPayment({
        tenantId: req.tenantId!,
        transactionId: txn.id,
        amount: payAmount,
        date: new Date(),
        note: req.body.note || null,
      });

      const updated = await storage.updateTransactionDebt(txn.id, Math.min(newPaid, txn.totalAmount), newStatus, req.tenantId);
      res.json(updated);
    } catch (error) {
      console.error("Error processing debt payment:", error);
      res.status(500).json({ error: "To'lov amalga oshirilmadi" });
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

  // ============ INCOME CATEGORIES ============

  app.get("/api/income-categories", authMiddleware, async (req, res) => {
    try {
      const cats = await storage.getIncomeCategories(req.tenantId!);
      res.json(cats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch income categories" });
    }
  });

  app.post("/api/income-categories", authMiddleware, async (req, res) => {
    try {
      const data = insertIncomeCategorySchema.parse({ ...req.body, tenantId: req.tenantId });
      const cat = await storage.createIncomeCategory(data);
      res.json(cat);
    } catch (error) {
      res.status(500).json({ error: "Failed to create income category" });
    }
  });

  app.patch("/api/income-categories/:id", authMiddleware, async (req, res) => {
    try {
      const updated = await storage.updateIncomeCategory(req.params.id, req.body, req.tenantId);
      if (!updated) return res.status(404).json({ error: "Category not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update income category" });
    }
  });

  app.delete("/api/income-categories/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await storage.deleteIncomeCategory(req.params.id, req.tenantId);
      if (!deleted) return res.status(404).json({ error: "Category not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete income category" });
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

  // ============ CASH REGISTER ============

  app.get("/api/cash-register/balance", authMiddleware, async (req, res) => {
    try {
      const { from, to } = req.query;
      const dateFrom = from ? new Date(from as string) : undefined;
      const dateTo = to ? new Date(to as string) : undefined;
      const balance = await storage.getCashRegisterBalance(req.tenantId!, dateFrom, dateTo);
      res.json(balance);
    } catch (error) {
      res.status(500).json({ error: "Failed to get balance" });
    }
  });

  app.get("/api/cash-register/entries", authMiddleware, async (req, res) => {
    try {
      const { type, from, to } = req.query;
      const dateFrom = from ? new Date(from as string) : undefined;
      const dateTo = to ? new Date(to as string) : undefined;
      const entries = await storage.getCashRegisterEntries(req.tenantId!, type as string | undefined, dateFrom, dateTo);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get entries" });
    }
  });

  app.post("/api/cash-register/entries", authMiddleware, async (req, res) => {
    try {
      const data = insertCashRegisterEntrySchema.parse({
        ...req.body,
        tenantId: req.tenantId,
        date: new Date(req.body.date || new Date()),
        createdBy: req.user?.userId,
      });
      const entry = await storage.createCashRegisterEntry(data);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating cash register entry:", error);
      res.status(400).json({ error: "Kiritishda xatolik" });
    }
  });

  app.patch("/api/cash-register/entries/:id", authMiddleware, async (req, res) => {
    try {
      const updated = await storage.updateCashRegisterEntry(req.params.id, req.body, req.tenantId);
      if (!updated) return res.status(404).json({ error: "Entry not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update entry" });
    }
  });

  app.delete("/api/cash-register/entries/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await storage.deleteCashRegisterEntry(req.params.id, req.tenantId);
      if (!deleted) return res.status(404).json({ error: "Entry not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  // ============ SHIFT HANDOVERS ============

  app.get("/api/shift-handovers", authMiddleware, async (req, res) => {
    try {
      const dateFrom = req.query.from ? new Date(req.query.from as string) : undefined;
      const dateTo = req.query.to ? new Date(req.query.to as string) : undefined;
      const handovers = await storage.getShiftHandovers(req.tenantId!, dateFrom, dateTo);
      res.json(handovers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shift handovers" });
    }
  });

  app.post("/api/shift-handovers", authMiddleware, async (req, res) => {
    try {
      const { periodType, dateFrom, dateTo, handedByName, receivedByName, note } = req.body;
      if (!handedByName || !receivedByName || !dateFrom || !dateTo) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      const balance = await storage.getCashRegisterBalance(req.tenantId!, from, to);
      const handover = await storage.createShiftHandover({
        tenantId: req.tenantId!,
        periodType: periodType || "day",
        dateFrom: from,
        dateTo: to,
        totalCash: balance.cash,
        totalCard: balance.card,
        totalNasiya: balance.nasiya,
        totalExpenses: balance.totalExpense,
        totalAmount: balance.cash + balance.card,
        handedByName,
        receivedByName,
        note: note || "",
        status: "pending",
      });
      res.json(handover);
    } catch (error) {
      res.status(500).json({ error: "Failed to create shift handover" });
    }
  });

  app.patch("/api/shift-handovers/:id/status", authMiddleware, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["confirmed", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const updated = await storage.updateShiftHandoverStatus(
        req.params.id, req.tenantId!, status, new Date()
      );
      if (!updated) return res.status(404).json({ error: "Handover not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // ============ STAFF & ATTENDANCE ============

  app.get("/api/staff", authMiddleware, async (req, res) => {
    try {
      const staff = await storage.getStaffMembers(req.tenantId!);
      const safe = staff.map(s => ({ ...s, password: undefined }));
      res.json(safe);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  app.get("/api/couriers", authMiddleware, async (req, res) => {
    try {
      const staff = await storage.getStaffMembers(req.tenantId!);
      const couriers = staff
        .filter(s => s.isCourier && s.isActive)
        .map(s => ({ id: s.id, name: s.name, phone: s.phone, isActive: s.isActive }));
      res.json(couriers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch couriers" });
    }
  });

  app.post("/api/staff", authMiddleware, async (req, res) => {
    try {
      const { name, phone, username, password, faceDescriptor, facePhoto, locationLat, locationLng, locationRadius, locationName, hourlyRate, isCourier } = req.body;
      if (!name || !username || !password) {
        return res.status(400).json({ error: "Name, username and password are required" });
      }
      const crypto = await import("crypto");
      const token = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await hashPassword(password);
      const staff = await storage.createStaffMember({
        tenantId: req.tenantId!,
        name,
        phone: phone || "",
        username,
        password: hashedPassword,
        token,
        faceDescriptor: faceDescriptor || null,
        facePhoto: facePhoto || null,
        locationLat: locationLat || null,
        locationLng: locationLng || null,
        locationRadius: locationRadius || 100,
        locationName: locationName || "",
        hourlyRate: hourlyRate || 0,
        isCourier: isCourier || false,
        isActive: true,
      });
      res.json({ ...staff, password: undefined });
    } catch (error) {
      res.status(500).json({ error: "Failed to create staff" });
    }
  });

  app.patch("/api/staff/:id", authMiddleware, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.password) {
        data.password = await hashPassword(data.password);
      }
      delete data.id;
      delete data.tenantId;
      delete data.token;
      const updated = await storage.updateStaffMember(req.params.id, data, req.tenantId!);
      if (!updated) return res.status(404).json({ error: "Staff not found" });
      res.json({ ...updated, password: undefined });
    } catch (error) {
      res.status(500).json({ error: "Failed to update staff" });
    }
  });

  app.delete("/api/staff/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await storage.deleteStaffMember(req.params.id, req.tenantId!);
      if (!deleted) return res.status(404).json({ error: "Staff not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete staff" });
    }
  });

  app.get("/api/attendance", authMiddleware, async (req, res) => {
    try {
      const staffId = req.query.staffId as string | undefined;
      const dateFrom = req.query.from ? new Date(req.query.from as string) : undefined;
      const dateTo = req.query.to ? new Date(req.query.to as string) : undefined;
      const records = await storage.getAttendanceRecords(req.tenantId!, staffId, dateFrom, dateTo);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.get("/api/attendance/summary", authMiddleware, async (req, res) => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      const staff = await storage.getStaffMembers(req.tenantId!);
      const todayRecords = await storage.getAttendanceRecords(req.tenantId!, undefined, todayStart, todayEnd);
      const staffSummary = staff.filter(s => s.isActive).map(s => {
        const records = todayRecords.filter(r => r.staffId === s.id);
        const checkIn = records.find(r => r.type === "check_in");
        const checkOut = records.find(r => r.type === "check_out");
        let hoursWorked = 0;
        if (checkIn && checkOut) {
          hoursWorked = Math.round((new Date(checkOut.date).getTime() - new Date(checkIn.date).getTime()) / (1000 * 60 * 60) * 10) / 10;
        }
        return {
          staffId: s.id,
          name: s.name,
          phone: s.phone,
          checkIn: checkIn ? checkIn.date : null,
          checkOut: checkOut ? checkOut.date : null,
          hoursWorked,
          isPresent: !!checkIn && !checkOut,
          faceVerified: checkIn?.faceVerified || false,
          locationVerified: checkIn?.locationVerified || false,
        };
      });
      const present = staffSummary.filter(s => s.checkIn).length;
      const working = staffSummary.filter(s => s.isPresent).length;
      const absent = staffSummary.filter(s => !s.checkIn).length;
      res.json({ total: staff.filter(s => s.isActive).length, present, working, absent, staff: staffSummary });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  app.get("/api/attendance/salary", authMiddleware, async (req, res) => {
    try {
      const { staffId, period } = req.query;
      const now = new Date();
      let dateFrom: Date;
      let dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      if (period === "weekly") {
        dateFrom = new Date(now);
        dateFrom.setDate(now.getDate() - now.getDay());
        dateFrom.setHours(0, 0, 0, 0);
      } else if (period === "monthly") {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }

      const staff = await storage.getStaffMembers(req.tenantId!);
      const activeStaff = staff.filter(s => s.isActive);
      const targetStaff = staffId ? activeStaff.filter(s => s.id === staffId) : activeStaff;
      
      const results = await Promise.all(targetStaff.map(async (s) => {
        const records = await storage.getAttendanceRecords(req.tenantId!, s.id, dateFrom, dateTo);
        
        const dailyMap = new Map<string, { checkIn: Date | null; checkOut: Date | null }>();
        for (const r of records) {
          const dayKey = new Date(r.date).toISOString().split("T")[0];
          if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { checkIn: null, checkOut: null });
          const day = dailyMap.get(dayKey)!;
          const rDate = new Date(r.date);
          if (r.type === "check_in") {
            if (!day.checkIn || rDate < day.checkIn) day.checkIn = rDate;
          }
          if (r.type === "check_out") {
            if (!day.checkOut || rDate > day.checkOut) day.checkOut = rDate;
          }
        }

        let totalHours = 0;
        const days: Array<{ date: string; checkIn: string | null; checkOut: string | null; hours: number; earned: number }> = [];
        for (const [dayKey, day] of dailyMap) {
          let hours = 0;
          if (day.checkIn && day.checkOut && day.checkOut > day.checkIn) {
            hours = Math.round((day.checkOut.getTime() - day.checkIn.getTime()) / (1000 * 60 * 60) * 100) / 100;
          }
          totalHours += hours;
          days.push({
            date: dayKey,
            checkIn: day.checkIn?.toISOString() || null,
            checkOut: day.checkOut?.toISOString() || null,
            hours,
            earned: Math.round(hours * (s.hourlyRate || 0)),
          });
        }
        days.sort((a, b) => b.date.localeCompare(a.date));

        return {
          staffId: s.id,
          name: s.name,
          phone: s.phone,
          hourlyRate: s.hourlyRate || 0,
          totalHours: Math.round(totalHours * 100) / 100,
          totalEarned: Math.round(totalHours * (s.hourlyRate || 0)),
          daysWorked: days.filter(d => d.hours > 0).length,
          days,
        };
      }));

      res.json({
        period: period || "daily",
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        staff: results,
        grandTotal: results.reduce((sum, s) => sum + s.totalEarned, 0),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate salary" });
    }
  });

  // Public attendance endpoints (no auth, token-based)
  app.get("/api/attendance/check/:token", async (req, res) => {
    try {
      const staff = await storage.getStaffByToken(req.params.token);
      if (!staff || !staff.isActive) return res.status(404).json({ error: "Staff not found" });
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      const todayRecords = await storage.getAttendanceRecords(staff.tenantId!, staff.id, todayStart, todayEnd);
      const tenant = await storage.getTenant(staff.tenantId!);
      res.json({
        name: staff.name,
        hasFaceDescriptor: !!staff.faceDescriptor && Array.isArray(staff.faceDescriptor) && staff.faceDescriptor.length > 0,
        locationLat: staff.locationLat,
        locationLng: staff.locationLng,
        locationRadius: staff.locationRadius,
        locationName: staff.locationName,
        storeName: tenant?.name || "",
        todayRecords: todayRecords.map(r => ({ type: r.type, date: r.date, faceVerified: r.faceVerified, locationVerified: r.locationVerified })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check staff" });
    }
  });

  app.post("/api/attendance/record/:token", async (req, res) => {
    try {
      const staff = await storage.getStaffByToken(req.params.token);
      if (!staff || !staff.isActive) return res.status(404).json({ error: "Staff not found" });
      const { type, faceDescriptor: liveDescriptor, locationLat, locationLng, photo } = req.body;
      if (!type || !["check_in", "check_out"].includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      // Server-side face verification: compare live descriptor with stored descriptor
      let faceScore = 0;
      let faceVerified = false;
      if (liveDescriptor && Array.isArray(liveDescriptor) && liveDescriptor.length === 128 &&
          staff.faceDescriptor && Array.isArray(staff.faceDescriptor) && staff.faceDescriptor.length === 128) {
        const storedDesc = staff.faceDescriptor as number[];
        let sum = 0;
        for (let i = 0; i < 128; i++) {
          sum += (liveDescriptor[i] - storedDesc[i]) ** 2;
        }
        const distance = Math.sqrt(sum);
        faceScore = Math.max(0, Math.min(100, Math.round((1 - distance / 1.0) * 100)));
        faceVerified = faceScore >= 60;
      }

      // Verify location using Haversine formula
      let locationVerified = false;
      let locationDistance = 0;
      if (staff.locationLat && staff.locationLng && locationLat && locationLng) {
        const R = 6371000;
        const toRad = (d: number) => d * Math.PI / 180;
        const lat1 = parseFloat(staff.locationLat);
        const lng1 = parseFloat(staff.locationLng);
        const lat2 = parseFloat(locationLat);
        const lng2 = parseFloat(locationLng);
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        locationDistance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        locationVerified = locationDistance <= (staff.locationRadius || 100);
      }

      let note = "";
      if (!faceVerified) note += "Yuz tasdiqlanmadi. ";
      if (!locationVerified) note += `Lokatsiya tashqarida (${locationDistance}m). `;

      const record = await storage.createAttendanceRecord({
        tenantId: staff.tenantId!,
        staffId: staff.id,
        type,
        faceVerified,
        locationVerified,
        locationLat: locationLat || null,
        locationLng: locationLng || null,
        faceScore: faceScore || 0,
        locationDistance,
        photo: photo || null,
        note: note.trim(),
        date: new Date(),
      });

      res.json({
        ...record,
        accepted: faceVerified && locationVerified,
        message: faceVerified && locationVerified
          ? `${type === "check_in" ? "Kelish" : "Ketish"} muvaffaqiyatli qayd etildi!`
          : `Tasdiqlash muvaffaqiyatsiz: ${note.trim()}`,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to record attendance" });
    }
  });

  app.get("/api/attendance/salary/:token", async (req, res) => {
    try {
      const staff = await storage.getStaffByToken(req.params.token);
      if (!staff || !staff.isActive) return res.status(404).json({ error: "Staff not found" });
      const { period } = req.query;
      const now = new Date();
      let dateFrom: Date;
      let dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      if (period === "weekly") {
        dateFrom = new Date(now);
        dateFrom.setDate(now.getDate() - now.getDay());
        dateFrom.setHours(0, 0, 0, 0);
      } else if (period === "monthly") {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      const records = await storage.getAttendanceRecords(staff.tenantId!, staff.id, dateFrom, dateTo);
      const dailyMap = new Map<string, { checkIn: Date | null; checkOut: Date | null }>();
      for (const r of records) {
        const dayKey = new Date(r.date).toISOString().split("T")[0];
        if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { checkIn: null, checkOut: null });
        const day = dailyMap.get(dayKey)!;
        const rDate = new Date(r.date);
        if (r.type === "check_in") {
          if (!day.checkIn || rDate < day.checkIn) day.checkIn = rDate;
        }
        if (r.type === "check_out") {
          if (!day.checkOut || rDate > day.checkOut) day.checkOut = rDate;
        }
      }
      let totalHours = 0;
      const days: Array<{ date: string; checkIn: string | null; checkOut: string | null; hours: number; earned: number }> = [];
      for (const [dayKey, day] of dailyMap) {
        let hours = 0;
        if (day.checkIn && day.checkOut && day.checkOut > day.checkIn) {
          hours = Math.round((day.checkOut.getTime() - day.checkIn.getTime()) / (1000 * 60 * 60) * 100) / 100;
        }
        totalHours += hours;
        days.push({ date: dayKey, checkIn: day.checkIn?.toISOString() || null, checkOut: day.checkOut?.toISOString() || null, hours, earned: Math.round(hours * (staff.hourlyRate || 0)) });
      }
      days.sort((a, b) => b.date.localeCompare(a.date));
      res.json({
        name: staff.name,
        hourlyRate: staff.hourlyRate || 0,
        period: period || "daily",
        totalHours: Math.round(totalHours * 100) / 100,
        totalEarned: Math.round(totalHours * (staff.hourlyRate || 0)),
        daysWorked: days.filter(d => d.hours > 0).length,
        days,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate salary" });
    }
  });

  // ============ COURIER PUBLIC DELIVERIES ============

  app.get("/api/courier/deliveries/:token", async (req, res) => {
    try {
      const staff = await storage.getStaffByToken(req.params.token);
      if (!staff || !staff.isActive || !staff.isCourier) return res.status(404).json({ error: "Kuriyer topilmadi" });
      const deliveriesList = await storage.getDeliveries(staff.tenantId!, { courierId: staff.id });
      const activeDeliveries = deliveriesList.filter(d => d.status === "pending" || d.status === "out_for_delivery");
      const completedDeliveries = deliveriesList.filter(d => d.status === "delivered" || d.status === "confirmed");

      const orderIds = [...new Set([...activeDeliveries, ...completedDeliveries].filter(d => d.orderId).map(d => d.orderId!))];
      const ordersMap = new Map<string, any>();
      for (const oid of orderIds) {
        const o = await storage.getOrder(oid, staff.tenantId);
        if (o) ordersMap.set(oid, { id: o.id, customerName: o.customerName, customerPhone: o.customerPhone, address: o.address, totalAmount: o.totalAmount, items: o.items, paymentMethod: o.paymentMethod });
      }

      const tenant = await storage.getTenant(staff.tenantId!);

      res.json({
        courier: { name: staff.name, phone: staff.phone },
        storeName: tenant?.name || "",
        active: activeDeliveries.map(d => ({ ...d, order: d.orderId ? ordersMap.get(d.orderId) || null : null })),
        completed: completedDeliveries.slice(0, 20).map(d => ({ ...d, order: d.orderId ? ordersMap.get(d.orderId) || null : null })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deliveries" });
    }
  });

  app.patch("/api/courier/deliveries/:token/:deliveryId", async (req, res) => {
    try {
      const staff = await storage.getStaffByToken(req.params.token);
      if (!staff || !staff.isActive || !staff.isCourier) return res.status(404).json({ error: "Kuriyer topilmadi" });

      const allDeliveries = await storage.getDeliveries(staff.tenantId!, { courierId: staff.id });
      const delivery = allDeliveries.find(d => d.id === req.params.deliveryId);
      if (!delivery) return res.status(404).json({ error: "Yetkazish topilmadi" });

      const { status, note } = req.body;
      if (status !== "delivered") return res.status(400).json({ error: "Faqat 'delivered' statusi ruxsat etilgan" });

      const updated = await storage.updateDelivery(delivery.id, { status: "delivered", completedAt: new Date(), note: note || "Kuriyer tomonidan yetkazildi" }, staff.tenantId);
      if (!updated) return res.status(500).json({ error: "Yangilab bo'lmadi" });

      await storage.createAuditLog({
        tenantId: staff.tenantId!,
        entityType: "delivery",
        entityId: delivery.id,
        action: "courier_delivered",
        changes: { status: "delivered", courierName: staff.name },
        userId: staff.id,
      });

      res.json({ success: true, message: "Yetkazildi deb belgilandi! Admin tasdiqlaydi." });
    } catch (error) {
      res.status(500).json({ error: "Failed to update delivery" });
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

  // ============ CUSTOMERS API (tenant-scoped) ============

  app.get("/api/customers", authMiddleware, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await storage.getCustomers(req.tenantId!, search, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", authMiddleware, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id, req.tenantId);
      if (!customer) return res.status(404).json({ error: "Mijoz topilmadi" });

      const allOrders = await storage.getOrdersFiltered(req.tenantId!);
      const customerOrders = allOrders.filter(o =>
        o.customerPhone === customer.phone || o.customerName === customer.name
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const customerOrderIds = customerOrders.map(o => o.id);
      const allDeliveries = await storage.getDeliveries(req.tenantId!);
      const customerDeliveries = allDeliveries.filter(d =>
        (d.customerId === customer.id) || (d.orderId && customerOrderIds.includes(d.orderId))
      );

      const debtTxns = await storage.getDebtTransactions(req.tenantId!);
      const customerDebts = debtTxns.filter(t =>
        (t.customerPhone === customer.phone || t.customerName === customer.name) &&
        t.debtStatus !== "paid"
      );

      const totalRevenue = customerOrders.reduce((s, o) => s + o.totalAmount, 0);
      const totalDebt = customerDebts.reduce((s, t) => s + (t.totalAmount - (t.paidAmount || 0)), 0);

      res.json({
        ...customer,
        ordersCount: customerOrders.length,
        totalRevenue,
        totalDebt,
        deliveriesCount: customerDeliveries.length,
        lastOrder: customerOrders[0] || null,
        orders: customerOrders.slice(0, 20),
        deliveries: customerDeliveries.slice(0, 20),
        debts: customerDebts.map(t => ({
          transactionId: t.id,
          totalAmount: t.totalAmount,
          paidAmount: t.paidAmount || 0,
          remaining: t.totalAmount - (t.paidAmount || 0),
          date: t.date,
          dueDate: t.dueDate,
          debtStatus: t.debtStatus,
          items: t.items,
        })),
      });
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", authMiddleware, async (req, res) => {
    try {
      const body = { ...req.body, tenantId: req.tenantId };
      const validated = insertCustomerSchema.parse(body);
      const existing = await storage.getCustomerByPhone(validated.phone!, req.tenantId!);
      if (existing) {
        return res.status(400).json({ error: "Bu telefon raqam allaqachon mavjud" });
      }
      const customer = await storage.createCustomer(validated);
      await storage.createAuditLog({
        tenantId: req.tenantId!,
        entityType: "customer",
        entityId: customer.id,
        action: "created",
        changes: { name: customer.name, phone: customer.phone },
        userId: req.user!.userId,
      });
      res.status(201).json(customer);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ error: "Ma'lumotlar to'liq emas", details: error.errors });
      }
      res.status(500).json({ error: "Mijoz yaratishda xatolik" });
    }
  });

  app.patch("/api/customers/:id", authMiddleware, async (req, res) => {
    try {
      const updated = await storage.updateCustomer(req.params.id, req.body, req.tenantId);
      if (!updated) return res.status(404).json({ error: "Mijoz topilmadi" });
      await storage.createAuditLog({
        tenantId: req.tenantId!,
        entityType: "customer",
        entityId: updated.id,
        action: "updated",
        changes: req.body,
        userId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Mijozni yangilashda xatolik" });
    }
  });

  app.delete("/api/customers/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id, req.tenantId);
      if (!deleted) return res.status(404).json({ error: "Mijoz topilmadi" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Mijozni o'chirishda xatolik" });
    }
  });

  // ============ ENHANCED ORDERS API ============

  app.get("/api/orders-filtered", authMiddleware, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.paymentStatus) filters.paymentStatus = req.query.paymentStatus;
      if (req.query.deliveryType) filters.deliveryType = req.query.deliveryType;
      if (req.query.from) filters.dateFrom = new Date(req.query.from as string);
      if (req.query.to) filters.dateTo = new Date(req.query.to as string);
      const orders = await storage.getOrdersFiltered(req.tenantId!, filters);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.patch("/api/orders/:id", authMiddleware, async (req, res) => {
    try {
      const allowedFields = ["address", "courier", "courierId", "paymentStatus", "debtAmount", "deliveryType", "paymentMethod", "deliveryScheduledAt", "customerName", "customerPhone"];
      const data: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (data.courierId) {
        const courierStaff = await storage.getStaffMember(data.courierId, req.tenantId);
        if (!courierStaff || !courierStaff.isCourier) {
          return res.status(400).json({ error: "Noto'g'ri kuriyer ID" });
        }
        if (!data.courier) data.courier = courierStaff.name;
      }
      const updated = await storage.updateOrder(req.params.id, data, req.tenantId);
      if (!updated) return res.status(404).json({ error: "Buyurtma topilmadi" });
      await storage.createAuditLog({
        tenantId: req.tenantId!,
        entityType: "order",
        entityId: updated.id,
        action: "updated",
        changes: data,
        userId: req.user!.userId,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Buyurtmani yangilashda xatolik" });
    }
  });

  app.patch("/api/orders/:id/status", authMiddleware, async (req, res) => {
    try {
      const { status, note } = req.body;
      const validStatuses = ["new", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Noto'g'ri status" });
      }

      const order = await storage.getOrder(req.params.id, req.tenantId);
      if (!order) return res.status(404).json({ error: "Buyurtma topilmadi" });

      const allowedTransitions: Record<string, string[]> = {
        new: ["confirmed", "cancelled"],
        confirmed: ["preparing", "cancelled"],
        preparing: ["out_for_delivery", "cancelled"],
        out_for_delivery: ["delivered", "cancelled"],
        delivered: [],
        cancelled: [],
      };
      const allowed = allowedTransitions[order.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `"${order.status}" dan "${status}" ga o'tish mumkin emas` });
      }

      const history = (order.statusHistory as any[]) || [];
      history.push({
        status,
        date: new Date().toISOString(),
        userId: req.user!.userId,
        note: note || "",
      });

      const updateData: any = { status, statusHistory: history };

      if (status === "delivered") {
        updateData.paymentStatus = order.paymentMethod === "cash" || order.paymentMethod === "card" ? "paid" : order.paymentStatus;
        const existing = await storage.getDeliveriesByOrder(order.id, req.tenantId);
        if (existing.length > 0) {
          await storage.updateDelivery(existing[0].id, {
            status: "delivered",
            completedAt: new Date(),
          }, req.tenantId);
        }
      }

      if (status === "out_for_delivery" && order.deliveryType === "delivery") {
        const existing = await storage.getDeliveriesByOrder(order.id, req.tenantId);
        if (existing.length === 0) {
          await storage.createDelivery({
            tenantId: req.tenantId!,
            orderId: order.id,
            customerId: "",
            address: order.address || "",
            courier: order.courier || "",
            courierId: order.courierId || null,
            scheduledAt: order.deliveryScheduledAt || null,
            status: "pending",
            note: "",
          });
        }
      }

      if (status === "cancelled") {
        updateData.paymentStatus = "unpaid";
      }

      const updated = await storage.updateOrder(req.params.id, updateData, req.tenantId);

      await storage.createAuditLog({
        tenantId: req.tenantId!,
        entityType: "order",
        entityId: order.id,
        action: "status_changed",
        changes: { from: order.status, to: status, note: note || "" },
        userId: req.user!.userId,
      });

      res.json(updated);
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ error: "Status yangilashda xatolik" });
    }
  });

  // ============ DELIVERIES API ============

  app.post("/api/deliveries", authMiddleware, async (req, res) => {
    try {
      const { orderId, customerId, address, courier, courierId, status, scheduledAt } = req.body;
      const delivery = await storage.createDelivery({
        tenantId: req.tenantId!,
        orderId: orderId || null,
        customerId: customerId || null,
        address: address || "",
        courier: courier || "",
        courierId: courierId || null,
        status: status || "pending",
        note: "",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      });
      res.json(delivery);
    } catch (error) {
      res.status(500).json({ error: "Failed to create delivery" });
    }
  });

  app.get("/api/deliveries", authMiddleware, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.courierId) filters.courierId = req.query.courierId;
      else if (req.query.courier) filters.courier = req.query.courier;
      if (req.query.from) filters.dateFrom = new Date(req.query.from as string);
      if (req.query.to) filters.dateTo = new Date(req.query.to as string);
      const deliveriesList = await storage.getDeliveries(req.tenantId!, filters);

      const orderIds = [...new Set(deliveriesList.filter(d => d.orderId).map(d => d.orderId!))];
      const ordersMap = new Map<string, any>();
      for (const oid of orderIds) {
        const o = await storage.getOrder(oid, req.tenantId);
        if (o) ordersMap.set(oid, o);
      }

      const enriched = deliveriesList.map(d => ({
        ...d,
        order: d.orderId ? ordersMap.get(d.orderId) || null : null,
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deliveries" });
    }
  });

  app.patch("/api/deliveries/:id", authMiddleware, async (req, res) => {
    try {
      const { status, note, courier, courierId } = req.body;
      const data: any = {};
      if (status) data.status = status;
      if (note !== undefined) data.note = note;
      if (courier !== undefined) data.courier = courier;
      if (courierId !== undefined) {
        if (courierId) {
          const courierStaff = await storage.getStaffMember(courierId, req.tenantId);
          if (!courierStaff || !courierStaff.isCourier) {
            return res.status(400).json({ error: "Noto'g'ri kuriyer ID" });
          }
          data.courierId = courierId;
          if (!courier) data.courier = courierStaff.name;
        } else {
          data.courierId = null;
        }
      }
      if (status === "delivered") data.completedAt = new Date();

      const updated = await storage.updateDelivery(req.params.id, data, req.tenantId);
      if (!updated) return res.status(404).json({ error: "Yetkazish topilmadi" });

      await storage.createAuditLog({
        tenantId: req.tenantId!,
        entityType: "delivery",
        entityId: updated.id,
        action: "updated",
        changes: data,
        userId: req.user!.userId,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Yetkazishni yangilashda xatolik" });
    }
  });

  // ============ AUDIT LOGS API ============

  app.get("/api/audit-logs", authMiddleware, async (req, res) => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const entityId = req.query.entityId as string | undefined;
      const logs = await storage.getAuditLogs(req.tenantId!, entityType, entityId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // ============ FINANCE API ============

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
