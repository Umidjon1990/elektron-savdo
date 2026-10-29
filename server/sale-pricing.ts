import Decimal from "decimal.js";
import {adjustment} from '@shared/finance';
import { salePrice, validateCampaign, type PricedProduct } from "@shared/pricing";
export class PricingError extends Error { constructor(message: string, public status = 400) { super(message); } }
type Product = PricedProduct & { id: string; tenantId?: string | null; name: string; costPrice?: number; stock?: number;unit?:string };
type Lookup = (id: string, tenant: string) => Promise<Product | undefined>;
function quantity(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n>1e9 || new Decimal(n).decimalPlaces()>6) throw new PricingError("Mahsulot miqdori noto'g'ri");
  return n;
}
async function product(id: string, tenant: string, lookup: Lookup) {
  const p = await lookup(id, tenant);
  if (!p || p.tenantId !== tenant) throw new PricingError("Mahsulot topilmadi", 404);
  return p;
}
export async function priceOrder(raw: any, tenant: string, lookup: Lookup) {
  if (!Array.isArray(raw) || !raw.length) throw new PricingError("Savat bo'sh");
  let total = new Decimal(0);
  const items = await Promise.all(raw.map(async line => {
    const p = await product(String(line.productId), tenant, lookup);
    const q = quantity(line.quantity), price = salePrice(p);
    total = total.add(new Decimal(price).mul(q));
    return { productId: p.id, productName: p.name, quantity: q, price, regularPrice: p.price, discountPrice: p.discountPrice ?? null };
  }));
  if(total.gt(1e12))throw new PricingError("Savdo summasi chegaradan katta");
  return { items, totalAmount: total.toDecimalPlaces(2).toNumber() };
}
/** Online checkout uses current tenant prices. Explicit offline replay keeps the
 * price snapshot accepted at the disconnected till; it never uses today's campaign. */
export async function priceTransaction(raw: any, tenant: string, lookup: Lookup, snapshot: boolean) {
  if (!Array.isArray(raw) || !raw.length) throw new PricingError("Savat bo'sh");
  let total = new Decimal(0), profit = new Decimal(0);
  const items = await Promise.all(raw.map(async line => {
    const p = await product(String(line.product?.id), tenant, lookup);
    const q = quantity(line.quantity);
    const source = snapshot ? line.product : p;
    if (snapshot && (!Number.isFinite(source.price) || source.price < 0)) throw new PricingError("Saqlangan narx noto'g'ri");
    const price = salePrice(source), cost = Number(source.costPrice || 0);
    if(!snapshot&&line.adjustmentInputType==='percent'&&(!Number.isFinite(line.adjustmentValue)||line.adjustmentValue<0||line.adjustmentValue>100))throw new PricingError('Chegirma foizi noto‘g‘ri');
    const manual = !snapshot&&line.adjustmentInputType==='percent' ? adjustment(price,q,line.adjustmentValue,'percent',line.adjustmentType==='ustama'?'ustama':'skidka') : Number(line.discount || 0);
    if (validateCampaign(source) || !Number.isFinite(price) || price < 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(manual)) throw new PricingError("Narx yoki chegirma noto'g'ri");
    const amount = new Decimal(price).mul(q).sub(manual);
    if (amount.lt(0)) throw new PricingError("Chegirma mahsulot summasidan katta");
    total = total.add(amount); profit = profit.add(amount.sub(new Decimal(cost).mul(q)));
    // Frozen sale price: no campaign recalculation in historical receipts.
    return { ...line, quantity: q, discount: manual, product: { ...line.product, id: p.id, name: p.name, unit:source.unit||p.unit||'dona',price, discountPrice: null, regularPrice: source.regularPrice ?? source.price, costPrice: cost } };
  }));
  if(total.gt(1e12))throw new PricingError("Savdo summasi chegaradan katta");
  const payable=total.toDecimalPlaces(2),cost=total.sub(profit).toDecimalPlaces(2);
  return { items, totalAmount: payable.toNumber(), totalProfit: payable.sub(cost).toNumber() };
}
