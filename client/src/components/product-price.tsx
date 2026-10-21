import { hasCampaign, regularPrice, salePrice, type PricedProduct } from "@shared/pricing";
export function ProductPrice({ product }: { product: PricedProduct }) {
  return <span className="inline-flex flex-col leading-tight">
    {hasCampaign(product) && <del className="text-xs text-slate-500 font-normal">{regularPrice(product).toLocaleString()} so'm</del>}
    <span>{salePrice(product).toLocaleString()} <span className="text-xs font-normal">so'm</span></span>
    {hasCampaign(product) && <span className="text-xs text-emerald-700">−{Math.round((1-salePrice(product)/regularPrice(product))*100)}%</span>}
  </span>;
}
