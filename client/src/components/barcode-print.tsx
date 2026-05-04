import { useEffect, useRef, useState, useCallback } from "react";
import JsBarcode from "jsbarcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Printer, Minus, Plus, Search, Type } from "lucide-react";

interface ProductForPrint {
  id: string;
  name: string;
  barcode: string;
  price: number;
  barcodePrice?: number;
}

interface BarcodePrintProps {
  products: ProductForPrint[];
  open: boolean;
  onClose: () => void;
}

interface LabelDims {
  width: number;
  height: number;
  barcodeHeight: number;
}

const PRESETS = [
  { label: "30×20", w: 30, h: 20 },
  { label: "40×25", w: 40, h: 25 },
  { label: "40×30", w: 40, h: 30 },
  { label: "50×30", w: 50, h: 30 },
  { label: "58×40", w: 58, h: 40 },
];

function BarcodeLabel({ product, dims, showPrice, fontScale }: { product: ProductForPrint; dims: LabelDims; showPrice: boolean; fontScale: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const code = (product.barcode || "").trim();
    while (svgRef.current.firstChild) svgRef.current.removeChild(svgRef.current.firstChild);
    if (!code) return;
    const baseFontSize = Math.max(7, Math.min(12, dims.width / 5));
    const barcodeOpts = {
      format: "CODE128" as string,
      width: Math.max(0.8, Math.min(2, dims.width / 40)),
      height: dims.barcodeHeight,
      displayValue: true,
      fontSize: baseFontSize * fontScale,
      margin: 0,
      textMargin: 1,
      font: "monospace",
    };
    if (code.match(/^\d{13}$/)) barcodeOpts.format = "EAN13";
    else if (code.match(/^\d{12}$/)) barcodeOpts.format = "UPC";

    try {
      JsBarcode(svgRef.current, code, barcodeOpts);
    } catch {
      try {
        barcodeOpts.format = "CODE128";
        JsBarcode(svgRef.current, code, barcodeOpts);
      } catch {
        // Invalid barcode — render nothing (graceful)
      }
    }
  }, [product.barcode, dims, fontScale]);

  const baseNameFontSize = Math.max(5, Math.min(10, dims.width / 6));
  const basePriceFontSize = Math.max(6, Math.min(11, dims.width / 5.5));
  const nameFontSize = baseNameFontSize * fontScale;
  const priceFontSize = basePriceFontSize * fontScale;

  const displayPrice = product.barcodePrice || product.price;

  return (
    <div
      className="barcode-label border border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden bg-white"
      style={{
        width: `${dims.width}mm`,
        height: `${dims.height}mm`,
        padding: "1mm",
        pageBreakInside: "avoid",
        boxSizing: "border-box",
      }}
    >
      <div
        className="text-center font-bold leading-tight w-full"
        style={{
          fontSize: `${nameFontSize}px`,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {product.name}
      </div>
      <svg ref={svgRef} style={{ maxWidth: "100%", flex: "0 0 auto" }} />
      {showPrice && (
        <div className="font-bold text-center" style={{ fontSize: `${priceFontSize}px` }}>
          {displayPrice.toLocaleString()} so'm
        </div>
      )}
    </div>
  );
}

export default function BarcodePrintDialog({ products, open, onClose }: BarcodePrintProps) {
  const [dims, setDims] = useState<LabelDims>({ width: 50, height: 30, barcodeHeight: 30 });
  const [showPrice, setShowPrice] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const validProducts = products.filter(p => (p.barcode || "").trim().length > 0);
  const skippedCount = products.length - validProducts.length;

  useEffect(() => {
    if (open && validProducts.length > 0) {
      const initial: Record<string, number> = {};
      const initialSelected: Record<string, boolean> = {};
      validProducts.forEach(p => { initial[p.id] = 1; initialSelected[p.id] = validProducts.length === 1; });
      setCopies(initial);
      setSelected(initialSelected);
      setSearchQuery("");
    }
  }, [open, products]);

  const toggleSelect = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProducts = validProducts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
  });

  const toggleSelectAll = useCallback(() => {
    const allSelected = filteredProducts.every(p => selected[p.id]);
    const update: Record<string, boolean> = { ...selected };
    filteredProducts.forEach(p => { update[p.id] = !allSelected; });
    setSelected(update);
  }, [filteredProducts, selected]);

  const selectedProducts = filteredProducts.filter(p => selected[p.id]);

  const updateCopies = (id: string, delta: number) => {
    setCopies(prev => ({
      ...prev,
      [id]: Math.max(1, Math.min(100, (prev[id] || 1) + delta)),
    }));
  };

  const totalLabels = selectedProducts.reduce((sum, p) => sum + (copies[p.id] || 1), 0);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Labels</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
          @media print {
            body { margin: 0; }
            .barcode-label { border: none !important; }
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 1mm;
            padding: 2mm;
          }
          .barcode-label {
            width: ${dims.width}mm;
            height: ${dims.height}mm;
            padding: 1mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            page-break-inside: avoid;
            border: 0.5px dashed #ccc;
          }
          .barcode-label svg { max-width: 100%; }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${printContent.innerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const labelsToRender: ProductForPrint[] = [];
  selectedProducts.forEach(p => {
    const count = copies[p.id] || 1;
    for (let i = 0; i < count; i++) {
      labelsToRender.push(p);
    }
  });

  const applyPreset = (w: number, h: number) => {
    setDims(prev => ({ ...prev, width: w, height: h }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Shtrix kod chop etish
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Etiketka o'lchami</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <Button
                  key={p.label}
                  variant={dims.width === p.w && dims.height === p.h ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => applyPreset(p.w, p.h)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Eni (mm)</Label>
                <Input
                  type="number"
                  min={15}
                  max={100}
                  value={dims.width}
                  onChange={(e) => setDims(prev => ({ ...prev, width: Math.max(15, Math.min(100, parseInt(e.target.value) || 15)) }))}
                  className="h-8 text-sm"
                  data-testid="input-label-width"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Bo'yi (mm)</Label>
                <Input
                  type="number"
                  min={10}
                  max={80}
                  value={dims.height}
                  onChange={(e) => setDims(prev => ({ ...prev, height: Math.max(10, Math.min(80, parseInt(e.target.value) || 10)) }))}
                  className="h-8 text-sm"
                  data-testid="input-label-height"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Barcode balandligi</Label>
                <Input
                  type="number"
                  min={15}
                  max={80}
                  value={dims.barcodeHeight}
                  onChange={(e) => setDims(prev => ({ ...prev, barcodeHeight: Math.max(15, Math.min(80, parseInt(e.target.value) || 15)) }))}
                  className="h-8 text-sm"
                  data-testid="input-barcode-height"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Barcode balandligi: {dims.barcodeHeight}px</Label>
              </div>
              <Slider
                value={[dims.barcodeHeight]}
                onValueChange={(v) => setDims(prev => ({ ...prev, barcodeHeight: v[0] }))}
                min={15}
                max={80}
                step={1}
                className="w-full"
                data-testid="slider-barcode-height"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5" />
                  Matn o'lchami: {Math.round(fontScale * 100)}%
                </Label>
              </div>
              <Slider
                value={[fontScale * 100]}
                onValueChange={(v) => setFontScale(v[0] / 100)}
                min={50}
                max={200}
                step={5}
                className="w-full"
                data-testid="slider-font-scale"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="checkbox-show-price"
              />
              <span className="text-sm">Narxni etiketkaga qo'shish</span>
              <span className="text-xs text-muted-foreground">(barkod narxi mavjud bo'lsa, u ko'rinadi)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tovarlar</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedProducts.length} ta tanlandi</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={toggleSelectAll} data-testid="button-toggle-select-all">
                  {filteredProducts.length > 0 && filteredProducts.every(p => selected[p.id]) ? "Bekor qilish" : "Hammasini tanlash"}
                </Button>
              </div>
            </div>
            {skippedCount > 0 && (
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                {skippedCount} ta tovar barkodsiz bo'lgani uchun ro'yxatdan chetlatildi.
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tovar nomi yoki barcode qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-barcode-print"
              />
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {filteredProducts.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selected[p.id] ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-transparent hover:bg-gray-100"}`}
                  onClick={() => toggleSelect(p.id)}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[p.id]}
                    onChange={() => toggleSelect(p.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`checkbox-select-${p.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.barcode}</div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {(p.barcodePrice || p.price).toLocaleString()} so'm
                  </div>
                  {selected[p.id] && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); updateCopies(p.id, -1); }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        className="w-12 h-7 text-center text-sm p-0"
                        value={copies[p.id] || 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setCopies(prev => ({ ...prev, [p.id]: Math.max(1, Math.min(100, val)) }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); updateCopies(p.id, 1); }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {labelsToRender.length > 0 && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm font-medium mb-2">Ko'rinish ({totalLabels} ta etiketka)</div>
              <div ref={printRef} className="flex flex-wrap gap-1 justify-center overflow-y-auto max-h-[250px]">
                {labelsToRender.map((p, i) => (
                  <BarcodeLabel key={`${p.id}-${i}`} product={p} dims={dims} showPrice={showPrice} fontScale={fontScale} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handlePrint} className="gap-2" disabled={totalLabels === 0} data-testid="button-print-barcodes">
            <Printer className="h-4 w-4" />
            Chop etish ({totalLabels} ta)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
