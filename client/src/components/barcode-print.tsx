import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Minus, Plus } from "lucide-react";

interface ProductForPrint {
  id: string;
  name: string;
  barcode: string;
  price: number;
}

interface BarcodePrintProps {
  products: ProductForPrint[];
  open: boolean;
  onClose: () => void;
}

type LabelSize = "30x20" | "40x25" | "50x30" | "58x30" | "58x40";

const LABEL_SIZES: Record<LabelSize, { width: number; height: number; label: string }> = {
  "30x20": { width: 30, height: 20, label: "30×20 mm (kichik)" },
  "40x25": { width: 40, height: 25, label: "40×25 mm" },
  "50x30": { width: 50, height: 30, label: "50×30 mm" },
  "58x30": { width: 58, height: 30, label: "58×30 mm" },
  "58x40": { width: 58, height: 40, label: "58×40 mm (katta)" },
};

function BarcodeLabel({ product, size, showPrice }: { product: ProductForPrint; size: LabelSize; showPrice: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dims = LABEL_SIZES[size];

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, product.barcode, {
          format: product.barcode.match(/^\d{13}$/) ? "EAN13" :
                  product.barcode.match(/^\d{12}$/) ? "UPC" :
                  "CODE128",
          width: dims.width < 40 ? 1 : 1.5,
          height: dims.height < 25 ? 25 : 35,
          displayValue: true,
          fontSize: dims.width < 40 ? 8 : 10,
          margin: 0,
          textMargin: 1,
          font: "monospace",
        });
      } catch {
        JsBarcode(svgRef.current, product.barcode, {
          format: "CODE128",
          width: dims.width < 40 ? 1 : 1.5,
          height: dims.height < 25 ? 25 : 35,
          displayValue: true,
          fontSize: dims.width < 40 ? 8 : 10,
          margin: 0,
          textMargin: 1,
          font: "monospace",
        });
      }
    }
  }, [product.barcode, size]);

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
        className="text-center font-bold leading-tight overflow-hidden"
        style={{
          fontSize: dims.width < 40 ? "6px" : "7px",
          maxHeight: showPrice ? "3mm" : "4mm",
          width: "100%",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {product.name}
      </div>
      <svg ref={svgRef} className="barcode-svg" style={{ maxWidth: "100%", flex: 1 }} />
      {showPrice && (
        <div
          className="font-bold text-center"
          style={{ fontSize: dims.width < 40 ? "7px" : "9px" }}
        >
          {product.price.toLocaleString()} so'm
        </div>
      )}
    </div>
  );
}

export default function BarcodePrintDialog({ products, open, onClose }: BarcodePrintProps) {
  const [labelSize, setLabelSize] = useState<LabelSize>("50x30");
  const [showPrice, setShowPrice] = useState(true);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && products.length > 0) {
      const initial: Record<string, number> = {};
      products.forEach(p => { initial[p.id] = 1; });
      setCopies(initial);
    }
  }, [open, products]);

  const updateCopies = (id: string, delta: number) => {
    setCopies(prev => ({
      ...prev,
      [id]: Math.max(1, Math.min(100, (prev[id] || 1) + delta)),
    }));
  };

  const totalLabels = Object.values(copies).reduce((sum, n) => sum + n, 0);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const dims = LABEL_SIZES[labelSize];

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
          .barcode-label .product-name {
            font-size: ${dims.width < 40 ? "6px" : "7px"};
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
            width: 100%;
            max-height: 4mm;
          }
          .barcode-label .product-price {
            font-size: ${dims.width < 40 ? "7px" : "9px"};
            font-weight: bold;
            text-align: center;
          }
          .barcode-label svg {
            max-width: 100%;
            flex: 1;
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${printContent.innerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const labelsToRender: ProductForPrint[] = [];
  products.forEach(p => {
    const count = copies[p.id] || 1;
    for (let i = 0; i < count; i++) {
      labelsToRender.push(p);
    }
  });

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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Etiketka o'lchami</Label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger data-testid="select-label-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LABEL_SIZES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Narxni ko'rsatish</Label>
              <div className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  data-testid="checkbox-show-price"
                />
                <span className="text-sm">Narxni etiketkaga qo'shish</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nusxalar soni</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {products.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.barcode}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateCopies(p.id, -1)}
                      data-testid={`button-decrease-copies-${p.id}`}
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
                      data-testid={`input-copies-${p.id}`}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateCopies(p.id, 1)}
                      data-testid={`button-increase-copies-${p.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-sm font-medium mb-2">Ko'rinish ({totalLabels} ta etiketka)</div>
            <div ref={printRef} className="flex flex-wrap gap-1 justify-center overflow-y-auto max-h-[250px]">
              {labelsToRender.map((p, i) => (
                <BarcodeLabel key={`${p.id}-${i}`} product={p} size={labelSize} showPrice={showPrice} />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handlePrint} className="gap-2" data-testid="button-print-barcodes">
            <Printer className="h-4 w-4" />
            Chop etish ({totalLabels} ta)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
