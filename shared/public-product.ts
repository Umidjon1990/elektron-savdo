/** The storefront has no reason to receive purchase prices or payables. */
export function publicProduct(p:any) {
 const fields=['id','name','author','category','barcode','image','videoUrl','description','metadata','unit','stock','price','discountPrice','barcodePrice','wholesalePrice','sortOrder','isNew'];
 return Object.fromEntries(fields.map(k=>[k,p[k]]));
}
