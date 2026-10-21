import { hasProductImage } from "@shared/product-image";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Package, X, ZoomIn, ZoomOut } from "lucide-react";

/** One lightweight trigger per thumbnail; the full size image mounts on demand. */
export function ProductImage({ src, alt, className = "w-full h-full object-cover" }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  useEffect(() => setThumbnailFailed(false), [src]);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  if (!hasProductImage(src)) return <div role="img" aria-label={`${alt} — rasm yuklanmagan`} className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400 p-3">
    <Package className="h-10 w-10" aria-hidden="true" />
    <span className="text-xs text-center">Rasm yuklanmagan</span>
  </div>;
  return <Dialog.Root open={open} onOpenChange={value => { setOpen(value); setZoom(1); setFailed(false); }}>
    <Dialog.Trigger asChild>
      <button type="button" className="block w-full h-full cursor-zoom-in" aria-label={`${alt} — rasmni kattalashtirish`} onClick={e => e.stopPropagation()}>
        {thumbnailFailed ? <span className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-500 p-2"><Package className="h-8 w-8" /><span className="text-xs line-clamp-2">{alt}</span></span> : <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setThumbnailFailed(true)} />}
      </button>
    </Dialog.Trigger>
    {open && <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/90" />
      <Dialog.Content aria-describedby={undefined} className="fixed inset-2 z-[101] flex flex-col text-white outline-none" onClick={e => e.stopPropagation()}>
        <header className="flex items-center gap-2 p-3 bg-black/50 shrink-0">
          <Dialog.Title className="min-w-0 flex-1 truncate">{alt}</Dialog.Title>
          <button type="button" aria-label="Kichraytirish" onClick={() => setZoom(z => Math.max(1, z - .5))} className="p-2"><ZoomOut /></button>
          <button type="button" aria-label="Kattalashtirish" onClick={() => setZoom(z => Math.min(4, z + .5))} className="p-2"><ZoomIn /></button>
          <Dialog.Close aria-label="Rasmni yopish" className="p-2"><X /></Dialog.Close>
        </header>
        <div className="flex-1 min-h-0 overflow-auto flex touch-pan-x touch-pan-y" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          onTouchStart={e => { if (e.touches.length === 2) pinch.current = { distance: Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY), zoom }; }}
          onTouchMove={e => { if (e.touches.length === 2 && pinch.current) { const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); setZoom(Math.max(1, Math.min(4, pinch.current.zoom*d/pinch.current.distance))); } }}
          onTouchEnd={() => { pinch.current = null; }}>
          {failed ? <p role="status" className="m-auto">Rasmni yuklab bo'lmadi</p> : <img src={src} alt={alt} onError={() => setFailed(true)} onClick={e => {
            const img = e.currentTarget, box = img.getBoundingClientRect();
            const fit = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
            const x = (box.width - img.naturalWidth * fit) / 2, y = (box.height - img.naturalHeight * fit) / 2;
            if (e.clientX < box.left + x || e.clientX > box.right - x || e.clientY < box.top + y || e.clientY > box.bottom - y) setOpen(false);
          }} className="m-auto object-contain shrink-0" style={{ width: `${zoom*100}%`, height: `${zoom*100}%`, maxWidth: "none", touchAction: "none" }} />}
        </div>
      </Dialog.Content>
    </Dialog.Portal>}
  </Dialog.Root>;
}
