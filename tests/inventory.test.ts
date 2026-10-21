import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import express from "express";
import ExcelJS from "exceljs";
import type { Product } from "../shared/schema";
import { summarizeInventory, usdCostInUzs, valueInventoryProduct } from "../shared/inventory-valuation";
import { createInventoryWorkbook } from "../server/inventory-workbook";
import { registerInventoryRoutes } from "../server/inventory-report";

export function product(overrides: Partial<Product> = {}): Product {
  return { id: "0001", tenantId: "store-a", name: "Sinov mahsuloti", author: "", category: "Texnika", barcode: "00001234", image: "", unit: "dona", stock: 3,
    costPrice: 125050, price: 150000, supplierCurrency: "usd", supplierOriginalPrice: 10.25, supplierCurrencyRate: 12200,
    supplier: "", supplierPaymentMethod: "naqd", supplierDebtStatus: "pending", supplierPaidAmount: 0, description: "", videoUrl: null, metadata: null,
    barcodePrice: null, wholesalePrice: null, sortOrder: 0, isNew: false, ...overrides };
}

test("USD totals use source prices and unrounded decimal multiplication", () => {
  const rows = [product(), product({ id: "0002", stock: 2, supplierOriginalPrice: 7.4 })];
  assert.equal(valueInventoryProduct(rows[0]).totalUsd, "30.75");
  assert.equal(valueInventoryProduct(rows[1]).totalUsd, "14.8");
  assert.equal(summarizeInventory(rows).totalUsd, "45.55");
  assert.equal(summarizeInventory([product({ stock: 0.1, supplierOriginalPrice: 0.2 })]).totalUsd, "0.02");
  const subCents = Array.from({ length: 100 }, (_, i) => product({ id: String(i), stock: 0.1, supplierOriginalPrice: 0.015 }));
  assert.equal(summarizeInventory(subCents).totalUsd, "0.15");
});
test("changing UZS rate/cost does not revalue original USD", () => {
  assert.equal(valueInventoryProduct(product({ supplierCurrencyRate: 14000, costPrice: 143500 })).totalUsd, "30.75");
});
test("UZS INTEGER rounding is explicit while original USD remains precise", () => {
  assert.equal(usdCostInUzs(10.25, 12345), 126536);
  assert.equal(usdCostInUzs(0.15, 12345), 1852);
  assert.equal(usdCostInUzs("bad", 12000), null);
  assert.equal(usdCostInUzs(10, 0), null);
  assert.equal(valueInventoryProduct(product({ supplierOriginalPrice: 0.15, costPrice: 1852 })).unitUsd, "0.15");
});
test("legacy restoration requires USD identity, same-record positive rate and cost", () => {
  const restored = valueInventoryProduct(product({ supplierOriginalPrice: 0, costPrice: 123000, supplierCurrencyRate: 12000 }));
  assert.equal(restored.source, "historical_rate");
  assert.equal(restored.unitUsd, "10.25");
  assert.equal(valueInventoryProduct(product({ supplierOriginalPrice: 0, supplierCurrencyRate: 0 })).source, "unknown");
  assert.equal(valueInventoryProduct(product({ supplierCurrency: null })).source, "unknown");
  assert.equal(valueInventoryProduct(product({ supplierCurrency: "uzs" })).unitUsd, null);
  assert.equal(valueInventoryProduct(product({ supplierOriginalPrice: 0, costPrice: 0 })).unitUsd, null);
});
test("partial USD totals expose missing rows and separate units", () => {
  const report = summarizeInventory([product(), product({ id: "b", unit: "kg", stock: 1.5, supplierCurrency: "uzs" }), product({ id: "c", unit: "litr", stock: 0.4, supplierOriginalPrice: 0, supplierCurrencyRate: 0 })]);
  assert.equal(report.totalUsd, "30.75");
  assert.equal(report.unknownCount, 1);
  assert.equal(report.uzsCount, 1);
  assert.equal(report.partial, true);
  assert.deepEqual(report.quantities, { dona: "3", kg: "1.5", litr: "0.4" });
});
test("current replacement-cost policy, sale and return preserve stored unit price", () => {
  assert.equal(valueInventoryProduct(product({ stock: 5, supplierOriginalPrice: 12 })).totalUsd, "60");
  assert.equal(valueInventoryProduct(product({ stock: 4, supplierOriginalPrice: 12 })).totalUsd, "48");
  assert.equal(valueInventoryProduct(product({ stock: 4.5, supplierOriginalPrice: 12 })).totalUsd, "54");
});
test("invalid and nonfinite balances are visible rather than zero-valued USD", () => {
  assert.equal(valueInventoryProduct(product({ stock: -1 })).totalUsd, null);
  assert.equal(summarizeInventory([product({ stock: NaN })]).invalidCount, 1);
  assert.equal(summarizeInventory([product({ price: NaN })]).invalidSaleCount, 1);
});
test("real XLSX round trip: 151 rows, numeric prices, barcode zeros and formula-safe text", async () => {
  const rows = Array.from({ length: 151 }, (_, i) => product({ id: String(i).padStart(4, "0"), name: i === 0 ? '=HYPERLINK("https://example.invalid")' : `Mahsulot ${i}` }));
  rows[1] = product({ id: "legacy", supplierOriginalPrice: 0, supplierCurrencyRate: 0 });
  const before = JSON.stringify(rows);
  const wb = createInventoryWorkbook(rows, "Sinov do'koni", new Date("2026-10-21T05:00:00Z"));
  const data = await wb.xlsx.writeBuffer();
  assert.equal(Buffer.from(data).subarray(0, 2).toString(), "PK");
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(data);
  const sheet = loaded.getWorksheet("Ombor reviziya")!;
  assert.equal(sheet.getCell("C7").type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell("E7").value, "00001234");
  assert.equal(sheet.getCell("B7").value, "0000");
  assert.equal(sheet.getCell("H7").value, 10.25);
  assert.equal(sheet.getCell("G7").value, 3);
  assert.equal(sheet.getCell("I7").result, 30.75);
  assert.equal(sheet.getCell("I8").value, null);
  assert.equal(sheet.getCell("L7").value, null);
  assert.match(sheet.getCell("M7").formula, /ISNUMBER\(L7\)/);
  assert.equal(sheet.getCell("C157").value, "Mahsulot 150");
  assert.equal(sheet.getCell("I159").result, Number(summarizeInventory(rows).totalUsd));
  assert.equal(sheet.pageSetup.printTitlesRow, "1:6");
  assert.equal(sheet.pageSetup.fitToWidth, 1);
  assert.equal(loaded.getWorksheet("Chop etish - sanoq")!.getCell("G5").value, null);
  assert.equal(JSON.stringify(rows), before, "export cannot change stock");
});
test("empty inventory workbook has valid totals and print ranges", async () => {
  const wb = createInventoryWorkbook([], "Bo'sh do'kon");
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await wb.xlsx.writeBuffer());
  assert.equal(loaded.worksheets[0].getCell("I8").value, 0);
});
test("authenticated API: full tenant scope, matching version and no writes", async () => {
  const rows = [product(), product({ id: "0002", stock: 2, supplierOriginalPrice: 7.4 })];
  const app = express();
  let reads = 0;
  registerInventoryRoutes(app, {
    auth: (req, res, next) => {
      const id = req.headers.authorization?.replace("Bearer ", "");
      if (!id) { res.sendStatus(401); return; }
      req.tenantId = id;
      next();
    },
    getProducts: async tenantId => { reads++; return tenantId === "store-a" ? structuredClone(rows) : []; },
    getTenant: async id => ({ name: id }),
  });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(39361, "127.0.0.1", resolve));
  const root = "http://127.0.0.1:39361";
  const headers = { Authorization: "Bearer store-a" };
  try {
    assert.equal((await fetch(`${root}/api/inventory/report`)).status, 401);
    assert.equal((await fetch(`${root}/api/inventory/export`)).status, 401);
    const report = await (await fetch(`${root}/api/inventory/report?tenantId=store-b&limit=1`, { headers })).json();
    assert.equal(report.totals.totalUsd, "45.55");
    assert.equal(report.products.length, 2);
    const exported = await fetch(`${root}/api/inventory/export?version=${report.version}&tenantId=store-b&limit=1`, { headers });
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get("content-type")!, /spreadsheetml/);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await exported.arrayBuffer()));
    assert.equal(wb.worksheets[0].getCell("I10").result, 45.55);
    assert.equal((await fetch(`${root}/api/inventory/export`, { headers })).status, 400);
    rows[0].stock = 2;
    assert.equal((await fetch(`${root}/api/inventory/export?version=${report.version}`, { headers })).status, 409);
    const foreign = await (await fetch(`${root}/api/inventory/report?tenantId=store-a`, { headers: { Authorization: "Bearer store-b" } })).json();
    assert.equal(foreign.products.length, 0);
    assert.equal(rows[1].stock, 2);
    assert.ok(reads > 0);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
