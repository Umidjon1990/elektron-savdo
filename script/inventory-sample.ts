// Synthetic data only. Usage: node --import tsx script/inventory-sample.ts /absolute/output-dir
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import type { Product } from "../shared/schema";
import { inventoryPolicy, summarizeInventory } from "../shared/inventory-valuation";
import { createInventoryWorkbook } from "../server/inventory-workbook";

const base: Product = {
  id: "DEMO-001", tenantId: "demo", name: "Elektr choynak", author: "", price: 180000, costPrice: 125050,
  stock: 3, unit: "dona", category: "Maishiy texnika", barcode: "0000123456789", image: "", videoUrl: null,
  supplier: "Namuna", supplierPaymentMethod: "naqd", supplierCurrency: "usd", supplierCurrencyRate: 12200,
  supplierOriginalPrice: 10.25, supplierDebtStatus: "pending", supplierPaidAmount: 0, description: "",
  barcodePrice: null, wholesalePrice: null, metadata: null, sortOrder: 0, isNew: false,
};
const products: Product[] = [
  base,
  { ...base, id: "DEMO-002", name: "Stol chirog'i", stock: 2, supplierOriginalPrice: 7.4, costPrice: 90280, price: 120000, barcode: "0000987654321", sortOrder: 1 },
  { ...base, id: "DEMO-003", name: "Mahalliy mahsulot", stock: 1.5, unit: "kg", supplierCurrency: "uzs", supplierOriginalPrice: 0, supplierCurrencyRate: 0, costPrice: 25000, price: 35000, barcode: "001234", sortOrder: 2 },
  { ...base, id: "DEMO-004", name: "Eski yozuv — kurs aniqlanmagan", stock: 1, supplierOriginalPrice: 0, supplierCurrencyRate: 0, price: 160000, barcode: "000567", sortOrder: 3 },
  { ...base, id: "DEMO-005", name: "Qolmagan mahsulot", stock: 0, barcode: "000890", sortOrder: 4 },
];
const output = path.resolve(process.argv[2] || "outputs/inventory-sample");
await mkdir(output, { recursive: true });
const generatedAt = new Date().toISOString();
const report = { products, totals: summarizeInventory(products), policy: inventoryPolicy, generatedAt,
  version: createHash("sha256").update(JSON.stringify({ tenantId: "demo", products })).digest("hex") };
await createInventoryWorkbook(products, "NAMUNA — Sinov do'koni", new Date(generatedAt)).xlsx.writeFile(path.join(output, "Ombor-reviziya-namuna.xlsx"));
await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
console.log(`Sample written to ${output}; USD ${report.totals.totalUsd}`);
