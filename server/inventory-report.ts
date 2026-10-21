import { createHash } from "node:crypto";
import type { Express, RequestHandler } from "express";
import type { Product } from "@shared/schema";
import { inventoryPolicy, summarizeInventory } from "@shared/inventory-valuation";
import { createInventoryWorkbook } from "./inventory-workbook";

// Both routes use the existing authenticated catalog's permission policy.
// Tenant identity is taken only from verified authentication, never query/body.
export function registerInventoryRoutes(app: Express, deps: {
  auth: RequestHandler;
  getProducts: (tenantId: string) => Promise<Product[]>;
  getTenant: (tenantId: string) => Promise<{ name: string } | null>;
}) {
  async function snapshot(tenantId: string) {
    // One SELECT for every product field, not a series of paginated reads.
    const products = await deps.getProducts(tenantId);
    if (products.some(p => p.tenantId !== tenantId)) throw new Error("Inventory tenant mismatch");
    const canonicalProducts = [...products].sort((a, b) => a.id.localeCompare(b.id));
    const version = createHash("sha256").update(JSON.stringify({ tenantId, products: canonicalProducts })).digest("hex");
    return { products, version, totals: summarizeInventory(products), policy: inventoryPolicy, generatedAt: new Date().toISOString() };
  }
  app.get("/api/inventory/report", deps.auth, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!req.tenantId) return res.status(400).json({ error: "Do'kon aniqlanmadi" });
    try { res.json(await snapshot(req.tenantId)); }
    catch (error) {
      console.error("Inventory report failed", error);
      res.status(500).json({ error: "Ombor hisobini olishda xatolik" });
    }
  });
  app.get("/api/inventory/export", deps.auth, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!req.tenantId) return res.status(400).json({ error: "Do'kon aniqlanmadi" });
    if (typeof req.query.version !== "string" || !/^[a-f0-9]{64}$/.test(req.query.version)) {
      return res.status(400).json({ error: "Avval ombor hisobini yangilang" });
    }
    try {
      const report = await snapshot(req.tenantId);
      if (report.version !== req.query.version) {
        return res.status(409).json({ error: "Ombor ma'lumotlari o'zgargan. Hisob yangilanadi; Excelga yuklashni qayta bosing." });
      }
      const tenant = await deps.getTenant(req.tenantId);
      if (!tenant) return res.status(404).json({ error: "Do'kon topilmadi" });
      const workbook = createInventoryWorkbook(report.products, tenant.name, new Date(report.generatedAt));
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="ombor-reviziya.xlsx"');
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Inventory export failed", error);
      res.status(500).json({ error: "Excel fayl yaratishda xatolik" });
    }
  });
}
