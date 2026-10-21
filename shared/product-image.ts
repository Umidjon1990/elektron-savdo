// The original book-store form saved this stock photo whenever no image was
// supplied. It is a missing-image sentinel, never a real product photograph.
export function hasProductImage(src: string | null | undefined): boolean {
  if (!src?.trim()) return false;
  try {
    const url = new URL(src, "https://local.invalid");
    return !(url.hostname === "images.unsplash.com" && url.pathname === "/photo-1543002588-bfa74002ed7e");
  } catch { return false; }
}
