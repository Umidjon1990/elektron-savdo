/** Campaign prices are per unit, in integer UZS. Manual POS adjustments
 * remain line amounts. Wholesale/barcode fields retain their legacy fallback. */
export interface PricedProduct {
  price: number;
  discountPrice?: number | null;
  barcodePrice?: number | null;
  wholesalePrice?: number | null;
}
export function regularPrice(p: PricedProduct): number {
  return p.price > 0 ? p.price : (p.barcodePrice || p.wholesalePrice || 0);
}
export function hasCampaign(p: PricedProduct): boolean {
  return Number.isInteger(p.discountPrice) && p.discountPrice! > 0 && p.discountPrice! < p.price;
}
export function salePrice(p: PricedProduct): number {
  return hasCampaign(p) ? p.discountPrice! : regularPrice(p);
}
export function validateCampaign(p: PricedProduct): string | null {
  if (p.discountPrice == null) return null;
  return Number.isInteger(p.discountPrice) && p.discountPrice > 0 && p.discountPrice < p.price
    ? null : "Chegirma narxi musbat butun son va oddiy sotish narxidan kichik bo'lishi kerak";
}
