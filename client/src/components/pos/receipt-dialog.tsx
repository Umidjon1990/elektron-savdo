import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Transaction } from "@/lib/transaction-context";
import { Printer } from "lucide-react";
import React, { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { buildReceiptHtml as buildReceiptHtmlShared } from "@/lib/receipt-html";

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
        {transaction.paymentSplits && transaction.paymentSplits.length > 0 ? (
          <div className="text-xs text-right text-black font-semibold space-y-0.5">
            {transaction.paymentSplits.map((s, i) => (
              <div key={i}>
                {getPaymentLabel(s.method)}: {Number(s.amount || 0).toLocaleString()} so'm
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-right text-black font-semibold uppercase">
            To'lov: {getPaymentLabel(transaction.paymentMethod || 'cash')}
          </div>
        )}
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
    return buildReceiptHtmlShared({ transaction, settings, tenantSettings });
  };


  const triggerPrint = (silent: boolean): boolean => {
    if (!transaction) return false;

    const html = buildReceiptHtml();
    if (!html) return false;

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
      return false;
    }

    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      return true;
    } catch (err) {
      console.error("Print window write failed:", err);
      try { printWindow.close(); } catch {}
      return false;
    }
  };

  const handlePrint = () => {
    const ok = triggerPrint(false);
    // Only auto-close the dialog if the print popup actually opened and was
    // written to. If the popup was blocked or the write failed, keep the
    // dialog visible so the user can retry or close it manually.
    if (ok) {
      setTimeout(() => {
        try { onClose(); } catch {}
      }, 600);
    }
  };

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
      <DialogContent className="sm:max-w-[380px] p-0 bg-white gap-0 max-h-[calc(100dvh-6rem)] md:max-h-[90vh] flex flex-col overflow-hidden top-[44%] md:top-1/2 z-[60]">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center bg-white" id="receipt-area">
          <ReceiptErrorBoundary onError={onClose}>
            <ReceiptContent transaction={transaction} settings={settings} receiptLogo={receiptLogo} paymentMethods={tenantSettings?.paymentMethods} />
          </ReceiptErrorBoundary>
        </div>

        <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gray-50 border-t flex gap-2 sticky bottom-0">
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
