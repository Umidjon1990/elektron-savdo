import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Zap, RefreshCw, Loader2, Download, ExternalLink } from "lucide-react";
import {
  checkBridge,
  getBridgeConfig,
  setBridgePrinter,
  testPrintViaBridge,
  getSavedPrinterName,
  saveBridgePrinterName,
} from "@/lib/print-bridge";

export function PrintBridgeSection() {
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [version, setVersion] = useState<string | undefined>();
  const [printerName, setPrinterName] = useState(() => getSavedPrinterName() || "XP-365B");
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);

  const refresh = async () => {
    setChecking(true);
    const status = await checkBridge(1500);
    setAvailable(status.available);
    setVersion(status.version);
    if (status.available) {
      const cfg = await getBridgeConfig();
      if (cfg?.printerName && !getSavedPrinterName()) {
        setPrinterName(cfg.printerName);
      }
    }
    setChecking(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSavePrinter = async () => {
    if (!printerName.trim()) {
      toast({ title: "Printer nomi bo'sh", variant: "destructive" });
      return;
    }
    setSavingPrinter(true);
    try {
      saveBridgePrinterName(printerName.trim());
      if (available) {
        const ok = await setBridgePrinter(printerName.trim());
        if (ok) {
          toast({ title: "Printer saqlandi", description: printerName });
        } else {
          toast({
            title: "Saqlandi, lekin Bridge'ga yuborib bo'lmadi",
            description: "Bridge oynasini qayta ishga tushiring",
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Printer nomi saqlandi", description: "Bridge ishga tushganda qo'llaniladi" });
      }
    } finally {
      setSavingPrinter(false);
    }
  };

  const handleTestPrint = async () => {
    setTestingPrint(true);
    try {
      // Make sure bridge has the latest printer name first
      if (printerName.trim()) {
        await setBridgePrinter(printerName.trim());
      }
      const result = await testPrintViaBridge();
      if (result.ok) {
        toast({ title: "Test chek yuborildi", description: "Printerdan test chiqishi kerak" });
      } else {
        toast({
          title: "Test chop etilmadi",
          description: result.error || "Bridge xatosi",
          variant: "destructive",
        });
      }
    } finally {
      setTestingPrint(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="section-print-bridge">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-emerald-600" />
            Tezkor printer (Print Bridge)
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={checking}
            data-testid="button-refresh-bridge"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          POS komputerda kichik dastur ishga tushganda chek to'g'ridan-to'g'ri printerga yuboriladi (drayversiz, ESC/POS).
        </p>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg border bg-slate-50">
        {checking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            <span className="text-sm text-slate-600">Bridge tekshirilmoqda…</span>
          </>
        ) : available ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Bridge ulangan</span>
            {version && (
              <Badge variant="outline" className="ml-auto text-xs" data-testid="badge-bridge-version">
                v{version}
              </Badge>
            )}
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">Bridge ishlamayapti</span>
            <span className="ml-auto text-xs text-slate-400">brauzer chop etishi ishlatiladi</span>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bridge-printer-name">Printer nomi (Windows'da ko'rinadigan nom)</Label>
        <div className="flex gap-2">
          <Input
            id="bridge-printer-name"
            value={printerName}
            onChange={(e) => setPrinterName(e.target.value)}
            placeholder="Masalan: XP-365B"
            data-testid="input-bridge-printer-name"
          />
          <Button
            type="button"
            onClick={handleSavePrinter}
            disabled={savingPrinter}
            data-testid="button-save-bridge-printer"
          >
            {savingPrinter ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Boshqarish paneli → Printers va Devices'da ko'rinadigan nom (masalan: <code>XP-365B</code>, <code>POS-58</code>).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestPrint}
          disabled={!available || testingPrint}
          data-testid="button-test-print-bridge"
        >
          {testingPrint ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          Test chek chop etish
        </Button>
        <Button
          type="button"
          variant="outline"
          asChild
          data-testid="button-download-bridge"
        >
          <a href="/downloads/EsavdoPrintBridge.exe" download>
            <Download className="h-4 w-4 mr-2" />
            Bridge'ni yuklab olish
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          asChild
          data-testid="button-bridge-instructions"
        >
          <a href="/downloads/print-bridge-help.html" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            O'rnatish bo'yicha yo'riqnoma
          </a>
        </Button>
      </div>

      {!available && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold mb-1">Bridge hozircha ishlamayapti</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li>Yuqoridan <strong>EsavdoPrintBridge.exe</strong> ni yuklab oling</li>
            <li>POS komputerga ko'chiring va ishga tushiring</li>
            <li>Yuqoridagi yangilash tugmasini bosing</li>
          </ol>
        </div>
      )}
    </div>
  );
}
