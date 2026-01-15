import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Transaction } from "@/lib/transaction-context";
import { Printer } from "lucide-react";
import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";

interface ReceiptDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

function ReceiptContent({ transaction, settings }: { transaction: Transaction; settings: { storeName: string; storeAddress: string; storePhone: string; telegramUsername: string; receiptFooter: string } }) {
  return (
    <>
      <div className="mb-4 space-y-1 text-center">
        <img 
          src="/assets/image_1768471627048.png" 
          alt={settings.storeName} 
          className="w-14 h-14 object-contain mx-auto mb-2"
        />
        <h2 className="text-lg font-black uppercase tracking-wide text-black">{settings.storeName}</h2>
        <p className="text-xs text-black font-semibold">{settings.storeAddress}</p>
        <p className="text-xs text-black font-semibold">{settings.storePhone}</p>
      </div>

      <div className="border-t-2 border-dashed border-black my-3" />

      <div className="text-xs text-black font-semibold mb-3 text-center">
        <p>Chek №: {transaction.id.slice(0, 8)}</p>
        <p>Sana: {new Date(transaction.date).toLocaleDateString()}</p>
      </div>

      <div className="space-y-2 mb-3">
        {transaction.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-black">
            <div className="text-left flex-1 pr-2">
              <p className="font-bold">{item.product.name}</p>
              <p className="text-xs font-semibold">
                {item.quantity} x {item.product.price.toLocaleString()}
              </p>
            </div>
            <div className="text-right font-mono font-bold">
              {(item.quantity * item.product.price).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-dashed border-black my-3" />

      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-sm text-black font-semibold">
          <span>Jami:</span>
          <span className="font-mono">{transaction.totalAmount.toLocaleString()} so'm</span>
        </div>
        <div className="flex justify-between items-center text-base font-black text-black">
          <span>TO'LANDI:</span>
          <span className="font-mono">{transaction.totalAmount.toLocaleString()} so'm</span>
        </div>
        <div className="text-xs text-right text-black font-semibold uppercase">
          To'lov: {transaction.paymentMethod === 'card' ? 'Karta' : 'Naqd'}
        </div>
      </div>

      <div className="flex flex-col items-center my-4">
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/${settings.telegramUsername}&color=000000`} 
          alt="Telegram QR" 
          className="w-20 h-20"
        />
      </div>
      
      <div className="text-center">
        <p className="text-xs text-black font-bold">{settings.receiptFooter}</p>
        <p className="text-xs text-black font-semibold">Telegram: @{settings.telegramUsername}</p>
      </div>
    </>
  );
}

export function ReceiptDialog({ transaction, isOpen, onClose }: ReceiptDialogProps) {
  const { settings } = useSettings();
  
  if (!transaction) return null;

  const handlePrint = async () => {
    const printContainer = document.getElementById('receipt-print-container');
    if (!printContainer) {
      window.print();
      return;
    }
    
    const images = printContainer.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 2000);
      });
    });
    
    await Promise.all(imagePromises);
    await new Promise(resolve => setTimeout(resolve, 300));
    window.print();
  };

  useEffect(() => {
    const logoImg = new Image();
    logoImg.src = '/assets/image_1768471627048.png';
    
    const qrImg = new Image();
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/${settings.telegramUsername}&color=000000`;
  }, [settings.telegramUsername]);

  useEffect(() => {
    let printContainer = document.getElementById('receipt-print-container');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'receipt-print-container';
      printContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:80mm;background:white;padding:2mm;';
      document.body.appendChild(printContainer);
    }
    
    if (isOpen && transaction) {
      printContainer.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;">
          <img src="/assets/image_1768471627048.png" alt="Logo" style="width:45px;height:45px;display:block;margin:0 auto 4px;">
          <h2 style="font-size:14px;font-weight:900;margin:0;color:#000;">${settings.storeName.toUpperCase()}</h2>
          <p style="font-size:10px;color:#000;margin:2px 0;font-weight:600;">${settings.storeAddress}</p>
          <p style="font-size:10px;color:#000;margin:0;font-weight:600;">${settings.storePhone}</p>
        </div>
        <div style="border-top:1px dashed #000;margin:6px 0;"></div>
        <div style="font-size:10px;color:#000;margin-bottom:6px;font-weight:600;text-align:center;">
          <p style="margin:0;">Chek: ${transaction.id.slice(0, 8)}</p>
          <p style="margin:2px 0 0;">Sana: ${new Date(transaction.date).toLocaleDateString()}</p>
        </div>
        <div style="border-top:1px dashed #000;margin:6px 0;"></div>
        <div style="margin-bottom:6px;">
          ${transaction.items.map(item => `
            <div style="margin-bottom:4px;color:#000;">
              <div style="font-size:11px;font-weight:700;">${item.product.name}</div>
              <div style="display:flex;justify-content:space-between;font-size:10px;">
                <span style="font-weight:600;">${item.quantity} x ${item.product.price.toLocaleString()}</span>
                <span style="font-weight:700;font-family:monospace;">${(item.quantity * item.product.price).toLocaleString()}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="border-top:1px dashed #000;margin:6px 0;"></div>
        <table style="width:100%;font-size:11px;color:#000;margin-bottom:6px;">
          <tr>
            <td style="font-weight:600;">Jami:</td>
            <td style="text-align:right;font-family:monospace;font-weight:600;">${transaction.totalAmount.toLocaleString()} so'm</td>
          </tr>
          <tr>
            <td style="font-size:13px;font-weight:900;">TO'LANDI:</td>
            <td style="text-align:right;font-family:monospace;font-size:13px;font-weight:900;">${transaction.totalAmount.toLocaleString()} so'm</td>
          </tr>
          <tr>
            <td colspan="2" style="text-align:right;font-size:9px;font-weight:600;">To'lov: ${transaction.paymentMethod === 'card' ? 'Karta' : 'Naqd'}</td>
          </tr>
        </table>
        <div style="text-align:center;margin:10px 0;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/${settings.telegramUsername}&color=000000" alt="QR" style="width:60px;height:60px;display:block;margin:0 auto;">
        </div>
        <div style="text-align:center;">
          <p style="font-size:10px;color:#000;margin:0;font-weight:700;">${settings.receiptFooter}</p>
          <p style="font-size:9px;color:#000;margin:2px 0 0;font-weight:600;">Telegram: @${settings.telegramUsername}</p>
        </div>
      `;
    }
  }, [isOpen, transaction, settings]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden bg-white gap-0 no-print">
        <div className="p-6 flex flex-col items-center text-center bg-white" id="receipt-area">
          <ReceiptContent transaction={transaction} settings={settings} />
        </div>

        <div className="p-4 bg-gray-50 border-t flex gap-2 no-print">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Yopish
          </Button>
          <Button className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Chop etish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
