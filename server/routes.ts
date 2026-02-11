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

      let user;
      if (data.slug) {
        const tenant = await storage.getTenantBySlug(data.slug);
        if (!tenant) {
          return res.status(401).json({ error: "Do'kon topilmadi" });
        }
        user = await storage.getUserByUsername(data.username, tenant.id);
      } else {
        user = await storage.getUserByUsername(data.username);
      }

      if (!user) {
        return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      }

      const isValid = await comparePassword(data.password, user.password);
      if (!isValid) {
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

  // ============ TENANT INFO (PUBLIC) ============

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
      const allTenants = await storage.getAllTenants();
      res.json(allTenants);
    } catch (error) {
      res.status(500).json({ error: "Server xatoligi" });
    }
  });

  // ============ PRODUCTS API (tenant-scoped) ============

  app.get("/api/products", optionalAuth, async (req, res) => {
    try {
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
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

  app.post("/api/orders", optionalAuth, async (req, res) => {
    try {
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      if (!tenantId) return res.status(400).json({ error: "Tenant aniqlanmadi" });

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
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
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
