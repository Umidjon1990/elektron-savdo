import { test } from "node:test";
import assert from "node:assert/strict";
import { hasProductImage } from "../shared/product-image";
test("old generic book photo is missing-image placeholder with any size/query", () => {
  for (const src of [null, undefined, "", " ", "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300&h=400", "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=900"]) assert.equal(hasProductImage(src), false);
});
test("uploaded product photos and actual book covers remain viewable", () => {
  for (const src of ["/r2/products/fridge.jpg", "https://cdn.example.com/product.png", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300", "data:image/png;base64,AAAA"]) assert.equal(hasProductImage(src), true);
});
