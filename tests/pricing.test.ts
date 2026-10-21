import { test } from "node:test";
import assert from "node:assert/strict";
import { salePrice, validateCampaign } from "../shared/pricing";
import { priceOrder, priceTransaction } from "../server/sale-pricing";
import { summarizeInventory } from "../shared/inventory-valuation";
import { createInventoryWorkbook } from "../server/inventory-workbook";
import { buildReceiptHtml } from "../client/src/lib/receipt-html";

const p = { id: "p1", tenantId: "a", name: "Sovutgich", price: 100000, discountPrice: 80000, costPrice: 50000, stock: 3, unit: "dona", supplierCurrency: "usd", supplierOriginalPrice: 4, category: "Texnika", barcode: "00001234" };
const lookup = async (id: string, tenant: string) => id === p.id && tenant === "a" ? p : undefined;
test("enable/disable campaign leaves ordinary, wholesale and cost prices intact", () => {
  assert.equal(salePrice(p),80000);
  assert.equal(salePrice({...p,discountPrice:null}),100000);
  assert.equal(p.costPrice,50000);
  assert.equal(salePrice({price:0,wholesalePrice:70000}),70000);
  for (const discountPrice of [0,-1,100000,110000,1.5,NaN]) assert.ok(validateCampaign({...p,discountPrice}));
  assert.equal(validateCampaign(p),null);
});
test("public order ignores submitted names/prices, scopes products to tenant", async () => {
  const result = await priceOrder([{productId:p.id,productName:"forged",quantity:2,price:1}],"a",lookup);
  assert.equal(result.totalAmount,160000);
  assert.equal(result.items[0].productName,p.name);
  await assert.rejects(priceOrder([{productId:p.id,quantity:1}],"b",lookup));
  // A lookup accidentally returning another tenant cannot bypass the boundary.
  await assert.rejects(priceOrder([{productId:p.id,quantity:1}],"b",async()=>p));
});
test("server POS campaign applied once; manual discount/markup are line amounts", async () => {
  const line = {product:{...p,price:1},quantity:2,discount:10000};
  const txn = await priceTransaction([line],"a",lookup,false);
  assert.equal(txn.totalAmount,150000);
  assert.equal(txn.totalProfit,50000);
  assert.equal(txn.items[0].product.price,80000);
  assert.equal(txn.items[0].product.discountPrice,null);
  assert.equal(salePrice(txn.items[0].product),80000);
  assert.equal((await priceTransaction([{...line,discount:-10000}],"a",lookup,false)).totalAmount,170000);
});
test("offline replay and old receipt keep sale snapshot after campaign changes", async () => {
  const saved = {product:{...p,price:90000,discountPrice:null,regularPrice:100000},quantity:2,discount:5000};
  const txn = await priceTransaction([saved],"a",lookup,true);
  assert.equal(txn.totalAmount,175000);
  assert.equal(txn.totalProfit,75000);
  const html = buildReceiptHtml({transaction:{items:txn.items,totalAmount:txn.totalAmount} as any,settings:{}});
  assert.match(html,/175,000/);
  assert.match(html,/Qo&#39;lda|Qo'lda chegirma/);
  assert.match(html,/90,000/);
});
test("invalid quantity, price and excessive manual discounts rejected", async () => {
  for (const quantity of [0,-1,NaN,Infinity]) await assert.rejects(priceTransaction([{product:p,quantity}],"a",lookup,false));
  await assert.rejects(priceTransaction([{product:p,quantity:1,discount:90000}],"a",lookup,false));
  await assert.rejects(priceTransaction([{product:{...p,price:NaN},quantity:1}],"a",lookup,true));
});
test("fractional units use decimal totals; inventory and Excel use campaign without changing cost", async () => {
  const txn = await priceTransaction([{product:p,quantity:0.1},{product:p,quantity:0.2}],"a",lookup,false);
  assert.equal(txn.totalAmount,24000);
  const summary = summarizeInventory([p]);
  assert.equal(summary.totalSaleUzs,"240000");
  assert.equal(summary.totalCostUzs,"150000");
  assert.equal(summary.totalUsd,"12");
  const wb = createInventoryWorkbook([p as any],"Sinov");
  assert.equal(wb.worksheets[0].getCell('J7').value,80000);
  assert.equal((wb.worksheets[0].getCell('O7').value as any).result,240000);
});
