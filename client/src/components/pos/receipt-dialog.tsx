import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Transaction } from "@/lib/transaction-context";
import { Printer } from "lucide-react";
import React, { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";

class ReceiptErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("Receipt render error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Chekni ko'rsatishda xatolik</p>
          <p style={{ fontSize: 12, color: "#64748b" }}>To'lov muvaffaqiyatli qabul qilindi</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onError?.();
            }}
            style={{ marginTop: 12, padding: "6px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
          >
            Yopish
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ReceiptDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
  // Optional callback to claim a popup window that the parent already opened
  // synchronously inside a user gesture (avoids popup blockers for auto-print).
  // Returns the window or null if none is available / it was closed.
  consumePreOpenedWindow?: () => Window | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd",
  card: "Karta",
  nasiya: "Nasiya",
};

function ReceiptContent({ transaction, settings, receiptLogo, paymentMethods }: { transaction: Transaction; settings: { storeName: string; storeAddress: string; storePhone: string; telegramUsername: string; receiptFooter: string }; receiptLogo?: string; paymentMethods?: Array<{id: string, name: string}> }) {
  const getPaymentLabel = (method: string) => {
    if (paymentMethods) {
      const found = paymentMethods.find(m => m.id === method);
      if (found) return found.name;
    }
    return PAYMENT_LABELS[method] || method;
  };

  return (
    <>
      <div className="mb-4 space-y-1 text-center">
        {receiptLogo ? (
          <img 
            src={receiptLogo} 
            alt={settings.storeName} 
            className="w-14 h-14 object-contain mx-auto mb-2"
          />
        ) : (
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-2xl font-black text-primary">{(settings.storeName || 'S').charAt(0).toUpperCase()}</span>
          </div>
        )}
        <h2 className="text-lg font-black uppercase tracking-wide text-black">{settings.storeName || ''}</h2>
        <p className="text-xs text-black font-semibold">{settings.storeAddress || ''}</p>
        <p className="text-xs text-black font-semibold">{settings.storePhone || ''}</p>
      </div>

      <div className="border-t-2 border-dashed border-black my-3" />

      <div className="text-xs text-black font-semibold mb-3 text-center">
        <p>Chek №: {(transaction.id || '').slice(0, 8)}</p>
        <p>Sana: {new Date(transaction.date).toLocaleDateString()}</p>
      </div>

      {(transaction.customerName || transaction.customerPhone) && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-xs text-black mb-2">
            {transaction.customerName && <p className="font-semibold">Mijoz: {transaction.customerName}</p>}
            {transaction.customerPhone && <p className="font-semibold">Tel: {transaction.customerPhone}</p>}
            {transaction.customerInfo && typeof transaction.customerInfo === 'object' && Object.entries(transaction.customerInfo).map(([key, val]) => (
              <p key={key} className="font-semibold">{typeof val === 'string' ? val : String(val || '')}</p>
            ))}
          </div>
        </>
      )}

      <div className="space-y-2 mb-3">
        {(transaction.items || []).filter(item => item && item.product).map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-black">
            <div className="text-left flex-1 pr-2">
              <p className="font-bold">{String(item.product.name || '')}</p>
              <p className="text-xs font-semibold">
                {item.quantity} x {Number(item.product.price || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-right font-mono font-bold">
              {(item.quantity * Number(item.product.price || 0)).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-dashed border-black my-3" />

      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-sm text-black font-semibold">
          <span>Jami:</span>
          <span className="font-mono">{Number(transaction.totalAmount || 0).toLocaleString()} so'm</span>
        </div>
        <div className="flex justify-between items-center text-base font-black text-black">
          <span>TO'LANDI:</span>
          <span className="font-mono">{Number(transaction.totalAmount || 0).toLocaleString()} so'm</span>
        </div>
        <div className="text-xs text-right text-black font-semibold uppercase">
          To'lov: {getPaymentLabel(transaction.paymentMethod || 'cash')}
        </div>
      </div>

      {settings.telegramUsername && (
        <div className="flex flex-col items-center my-4">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/${settings.telegramUsername}&color=000000`} 
            alt="Telegram QR" 
            className="w-20 h-20"
          />
        </div>
      )}
      
      <div className="text-center">
        <p className="text-xs text-black font-bold">{settings.receiptFooter}</p>
        {settings.telegramUsername && (
          <p className="text-xs text-black font-semibold">Telegram: @{settings.telegramUsername}</p>
        )}
      </div>
    </>
  );
}

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function ReceiptDialog({ transaction, isOpen, onClose, autoPrint, consumePreOpenedWindow }: ReceiptDialogProps) {
  const { settings } = useSettings();
  const { token } = useAuth();
  
  const { data: tenantSettings } = useQuery<any>({
    queryKey: ["tenant-settings"],
    queryFn: async () => {
      const res = await fetch("/api/tenant-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const receiptLogo = tenantSettings?.receiptLogo || tenantSettings?.logo;

  const getPaymentLabel = (method: string) => {
    if (tenantSettings?.paymentMethods) {
      const found = tenantSettings.paymentMethods.find((m: any) => m.id === method);
      if (found) return found.name;
    }
    return PAYMENT_LABELS[method] || method;
  };

  // Preload images so they're cached when the print window opens
  useEffect(() => {
    if (!transaction) return;
    if (receiptLogo) {
      const logoImg = new Image();
      logoImg.src = receiptLogo;
    }
    if (settings.telegramUsername) {
      const qrImg = new Image();
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/${settings.telegramUsername}&color=000000`;
    }
  }, [settings.telegramUsername, receiptLogo, transaction]);

  const buildReceiptHtml = (): string => {
    if (!transaction) return '';

    const logoHtml = receiptLogo
      ? `<img src="${escapeHtml(receiptLogo)}" alt="Logo" style="width:45px;height:45px;display:block;margin:0 auto 4px;object-fit:contain;">`
      : `<div style="width:45px;height:45px;border-radius:50%;background:#eef2ff;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;"><span style="font-size:24px;font-weight:900;color:#4f46e5;">${escapeHtml((settings.storeName || 'S').charAt(0).toUpperCase())}</span></div>`;

    const customerHtml = (transaction.customerName || transaction.customerPhone) ? `
      <div style="border-top:1px dashed #666;margin:4px 0;"></div>
      <div style="font-size:10px;color:#000;margin-bottom:4px;">
        ${transaction.customerName ? `<p style="margin:0;font-weight:600;">Mijoz: ${escapeHtml(transaction.customerName)}</p>` : ''}
        ${transaction.customerPhone ? `<p style="margin:0;font-weight:600;">Tel: ${escapeHtml(transaction.customerPhone)}</p>` : ''}
        ${transaction.customerInfo && typeof transaction.customerInfo === 'object' ? Object.values(transaction.customerInfo).map(v => `<p style="margin:0;font-weight:600;">${escapeHtml(v)}</p>`).join('') : ''}
      </div>
    ` : '';

    const safeItems = (transaction.items || []).filter((item: any) => item && item.product);

    const itemsHtml = safeItems.map((item: any) => `
      <div style="margin-bottom:4px;color:#000;">
        <div style="font-size:11px;font-weight:700;">${escapeHtml(item.product.name)}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;">
          <span style="font-weight:600;">${escapeHtml(item.quantity)} x ${Number(item.product.price || 0).toLocaleString()}</span>
          <span style="font-weight:700;font-family:monospace;">${(item.quantity * Number(item.product.price || 0)).toLocaleString()}</span>
        </div>
      </div>
    `).join('');

    const qrHtml = settings.telegramUsername ? `
      <div style="text-align:center;margin:10px 0;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/${encodeURIComponent(settings.telegramUsername)}&color=000000" alt="QR" style="width:60px;height:60px;display:block;margin:0 auto;">
      </div>` : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Chek</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 80mm;
    background: #fff;
    color: #000;
    font-family: Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt {
    width: 80mm;
    padding: 2mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  p { margin: 0; }
  table { border-collapse: collapse; }
</style>
</head>
<body>
  <div class="receipt">
    <div style="text-align:center;margin-bottom:8px;">
      ${logoHtml}
      <h2 style="font-size:14px;font-weight:900;margin:0;color:#000;">${escapeHtml((settings.storeName || '').toUpperCase())}</h2>
      <p style="font-size:10px;color:#000;margin:2px 0;font-weight:600;">${escapeHtml(settings.storeAddress || '')}</p>
      <p style="font-size:10px;color:#000;margin:0;font-weight:600;">${escapeHtml(settings.storePhone || '')}</p>
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="font-size:10px;color:#000;margin-bottom:6px;font-weight:600;text-align:center;">
      <p style="margin:0;">Chek: ${escapeHtml((transaction.id || '').slice(0, 8))}</p>
      <p style="margin:2px 0 0;">Sana: ${escapeHtml(new Date(transaction.date).toLocaleDateString())}</p>
    </div>
    ${customerHtml}
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="margin-bottom:6px;">${itemsHtml}</div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <table style="width:100%;font-size:11px;color:#000;margin-bottom:6px;">
      <tr>
        <td style="font-weight:600;">Jami:</td>
        <td style="text-align:right;font-family:monospace;font-weight:600;">${Number(transaction.totalAmount || 0).toLocaleString()} so'm</td>
      </tr>
      <tr>
        <td style="font-size:13px;font-weight:900;">TO'LANDI:</td>
        <td style="text-align:right;font-family:monospace;font-size:13px;font-weight:900;">${Number(transaction.totalAmount || 0).toLocaleString()} so'm</td>
      </tr>
      <tr>
        <td colspan="2" style="text-align:right;font-size:9px;font-weight:600;">To'lov: ${escapeHtml(getPaymentLabel(transaction.paymentMethod || 'cash'))}</td>
      </tr>
    </table>
    ${qrHtml}
    <div style="text-align:center;">
      <p style="font-size:10px;color:#000;margin:0;font-weight:700;">${escapeHtml(settings.receiptFooter || '')}</p>
      ${settings.telegramUsername ? `<p style="font-size:9px;color:#000;margin:2px 0 0;font-weight:600;">Telegram: @${escapeHtml(settings.telegramUsername)}</p>` : ''}
    </div>
  </div>
  <script>
    (function() {
      var printed = false;
      function doPrint() {
        if (printed) return;
        printed = true;
        try { window.focus(); window.print(); } catch (e) { console.error(e); }
        setTimeout(function() { try { window.close(); } catch (e) {} }, 500);
      }
      var imgs = document.images;
      if (!imgs || imgs.length === 0) {
        setTimeout(doPrint, 100);
        return;
      }
      var loaded = 0;
      var total = imgs.length;
      function check() {
        loaded++;
        if (loaded >= total) setTimeout(doPrint, 150);
      }
      for (var i = 0; i < total; i++) {
        var im = imgs[i];
        if (im.complete) { check(); }
        else { im.onload = check; im.onerror = check; }
      }
      setTimeout(doPrint, 3000);
    })();
  </script>
</body>
</html>`;
  };

  const triggerPrint = (silent: boolean) => {
    if (!transaction) return;

    const html = buildReceiptHtml();
    if (!html) return;

    // Prefer a window the parent already opened synchronously inside a user
    // gesture (auto-print path). Falls back to a fresh window.open() for the
    // manual button case (which is itself triggered by a user click).
    let printWindow: Window | null = consumePreOpenedWindow?.() ?? null;
    if (!printWindow || printWindow.closed) {
      printWindow = window.open('', '_blank', 'width=400,height=600');
    }

    if (!printWindow) {
      if (!silent) {
        alert("Pop-up oynalarni ruxsat bering va qayta urinib ko'ring");
      } else {
        console.warn("Auto-print blocked — popup window denied by browser");
      }
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrint = () => triggerPrint(false);

  // Auto-print: when dialog opens with autoPrint enabled, fire the popup once.
  // Use a small timeout so React/dialog renders first; ref prevents double-fire on re-render.
  const autoPrintFiredRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !autoPrint || !transaction) return;
    // Use transaction id as the "fingerprint" so each new transaction triggers exactly once
    if (autoPrintFiredRef.current === transaction.id) return;
    autoPrintFiredRef.current = transaction.id;
    const t = setTimeout(() => triggerPrint(true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoPrint, transaction?.id]);

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px] p-0 bg-white gap-0 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center bg-white" id="receipt-area">
          <ReceiptErrorBoundary onError={onClose}>
            <ReceiptContent transaction={transaction} settings={settings} receiptLogo={receiptLogo} paymentMethods={tenantSettings?.paymentMethods} />
          </ReceiptErrorBoundary>
        </div>

        <div className="shrink-0 p-4 bg-gray-50 border-t flex gap-2 sticky bottom-0">
          <Button variant="outline" className="flex-1" onClick={onClose} data-testid="button-close-receipt">
            Yopish
          </Button>
          <Button className="flex-1 gap-2" onClick={handlePrint} data-testid="button-print-receipt">
            <Printer className="h-4 w-4" />
            Chop etish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
