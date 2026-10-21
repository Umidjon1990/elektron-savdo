import Decimal from "decimal.js";

// Do not change Decimal's global settings used by other modules.
const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type DecimalInput = number | string | null | undefined;
export interface InventoryProduct {
  id: string;
  name: string;
  stock: DecimalInput;
  costPrice: DecimalInput;
  price: DecimalInput;
  unit?: string | null;
  supplierCurrency?: string | null;
  supplierCurrencyRate?: DecimalInput;
  supplierOriginalPrice?: DecimalInput;
}
export type CostSource = "original_usd" | "historical_rate" | "uzs" | "unknown";
export const costSourceLabels: Record<CostSource, string> = {
  original_usd: "Asl USD narxi",
  historical_rate: "Saqlangan kursdan tiklangan (sana qayd etilmagan)",
  uzs: "Kirim UZSda — USD hisoblanmagan",
  unknown: "USD tannarxi aniqlanmagan",
};
export const inventoryPolicy = "Joriy mahsulot tannarxi × qoldiq. Qayta kirim narxi butun qoldiqqa qo'llanadi; partiya/FIFO tarixi mavjud emas.";

export function decimal(value: DecimalInput): Decimal | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  try {
    const result = new Money(value);
    return result.isFinite() ? result : null;
  } catch { return null; }
}

// cost_price is INTEGER UZS in the existing schema. Round only that derived
// UZS value; never round or reconstruct the original USD price from it.
export function usdCostInUzs(original: DecimalInput, rate: DecimalInput): number | null {
  const price = decimal(original), fx = decimal(rate);
  if (!price?.gt(0) || !fx?.gt(0)) return null;
  const uzs = price.mul(fx).toDecimalPlaces(0);
  return uzs.lte(2147483647) ? uzs.toNumber() : null;
}

export function hasCostChange(current: InventoryProduct, updates: Partial<InventoryProduct>) {
  return (["supplierCurrency", "supplierOriginalPrice", "supplierCurrencyRate", "costPrice"] as const)
    .some(key => key in updates && updates[key] !== current[key]);
}

export function valueInventoryProduct(p: InventoryProduct) {
  const quantity = decimal(p.stock);
  const original = decimal(p.supplierOriginalPrice);
  const rate = decimal(p.supplierCurrencyRate);
  const cost = decimal(p.costPrice);
  const sale = decimal(p.price);
  let source: CostSource = "unknown";
  let unitUsd: Decimal | null = null;
  const currency = p.supplierCurrency?.toLowerCase();
  if (currency === "usd") {
    if (original?.gt(0)) {
      source = "original_usd";
      unitUsd = original;
    } else if (original?.eq(0) && cost?.gt(0) && rate?.gt(0)) {
      // Legacy USD rows only: both values belong to THIS product record.
      // Never use today's tenant dollar rate. A zero default is not proof of a free item.
      source = "historical_rate";
      unitUsd = cost.div(rate);
    }
  } else if (currency === "uzs") source = "uzs";
  const validQuantity = quantity !== null && quantity.gte(0);
  return {
    source,
    unitUsd: unitUsd?.toString() ?? null,
    totalUsd: validQuantity && unitUsd ? unitUsd.mul(quantity!).toString() : null,
    unitCostUzs: cost?.gte(0) ? cost.toString() : null,
    totalCostUzs: validQuantity && cost?.gte(0) ? cost.mul(quantity!).toString() : null,
    saleUzs: validQuantity && sale?.gte(0) ? sale.mul(quantity!).toString() : null,
    quantity: quantity?.toString() ?? null,
    invalidQuantity: !validQuantity,
  };
}

export function summarizeInventory(products: InventoryProduct[]) {
  let totalUsd = new Money(0);
  let totalSaleUzs = new Money(0);
  let totalCostUzs = new Money(0);
  const quantities: Record<string, Decimal> = {};
  let unknownCount = 0, uzsCount = 0, restoredCount = 0, invalidCount = 0, invalidSaleCount = 0, invalidCostCount = 0;
  for (const p of products) {
    const v = valueInventoryProduct(p);
    const quantity = decimal(p.stock);
    if (v.invalidQuantity) invalidCount++;
    else {
      const unit = p.unit || "dona";
      quantities[unit] = (quantities[unit] || new Money(0)).add(quantity!);
    }
    if (v.totalUsd !== null) totalUsd = totalUsd.add(v.totalUsd);
    if (v.totalCostUzs !== null) totalCostUzs = totalCostUzs.add(v.totalCostUzs);
    else invalidCostCount++;
    if (v.saleUzs !== null) totalSaleUzs = totalSaleUzs.add(v.saleUzs);
    else invalidSaleCount++;
    // Counts concern non-empty stock; empty unknown products cannot hide value.
    if (quantity?.gt(0)) {
      if (v.source === "unknown") unknownCount++;
      if (v.source === "uzs") uzsCount++;
      if (v.source === "historical_rate") restoredCount++;
    }
  }
  return {
    totalUsd: totalUsd.toString(), totalCostUzs: totalCostUzs.toString(), totalSaleUzs: totalSaleUzs.toString(),
    quantities: Object.fromEntries(Object.entries(quantities).map(([unit, n]) => [unit, n.toString()])),
    unknownCount, uzsCount, restoredCount, invalidCount, invalidSaleCount, invalidCostCount,
    partial: unknownCount > 0 || uzsCount > 0 || invalidCount > 0,
  };
}

// Only presentation rounds. All reports/export totals use the unrounded strings above.
export function formatUsd(value: DecimalInput) {
  const n = decimal(value);
  return n ? n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "—";
}

export function formatUzs(value: DecimalInput) {
  const n = decimal(value);
  if (!n) return "—";
  const [whole, fraction] = n.toDecimalPlaces(2).toFixed().split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (fraction ? `.${fraction}` : "");
}
