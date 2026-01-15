import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Transaction } from "@/lib/transaction-context";
import { Printer } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

interface ReceiptDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

function ReceiptContent({ transaction }: { transaction: Transaction }) {
  return (
    <>
      <div className="mb-4 space-y-1 text-center">
        <img 
          src="/assets/image_1768471627048.png" 
          alt="Ixlos Books" 
          className="w-16 h-16 object-contain mx-auto mb-2"
        />
        <h2 className="text-lg font-bold uppercase tracking-wide">Ixlos Books</h2>
        <p className="text-xs text-gray-600">Namangan, Uychi</p>
        <p className="text-xs text-gray-600">+998 93 678 55 52</p>
      </div>

      <div className="border-t border-dashed border-gray-300 my-2" />

      <div className="flex justify-between text-xs text-gray-600 mb-3">
        <div className="text-left">
          <p>Chek №: {transaction.id.slice(0, 8)}</p>
          <p>Sana: {new Date(transaction.date).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <p>Kassir: Sotuvchi</p>
          <p>Vaqt: {new Date(transaction.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {transaction.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <div className="text-left flex-1 pr-2">
              <p className="font-medium">{item.product.name}</p>
              <p className="text-xs text-gray-600">
                {item.quantity} x {item.product.price.toLocaleString()}
              </p>
            </div>
            <div className="text-right font-mono font-medium">
              {(item.quantity * item.product.price).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-300 my-2" />

      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Jami:</span>
          <span className="font-mono">{transaction.totalAmount.toLocaleString()} so'm</span>
        </div>
        <div className="flex justify-between items-center text-base font-bold">
          <span>TO'LANDI:</span>
          <span className="font-mono">{transaction.totalAmount.toLocaleString()} so'm</span>
        </div>
        <div className="text-xs text-right text-gray-600 uppercase">
          To'lov: {transaction.paymentMethod === 'card' ? 'Karta' : 'Naqd'}
        </div>
      </div>

      <div className="flex flex-col items-center space-y-2">
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://t.me/ixlosbooksuz&color=000000`} 
          alt="Telegram QR" 
          className="w-20 h-20"
        />
        <p className="text-[10px] text-gray-600 text-center">
          Xaridingiz uchun rahmat!<br/>
          Telegram: @ixlosbooksuz
        </p>
      </div>
    </>
  );
}

export function ReceiptDialog({ transaction, isOpen, onClose }: ReceiptDialogProps) {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

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
          <img src="/assets/image_1768471627048.png" alt="Logo" style="width:50px;height:50px;margin:0 auto 4px;">
          <h2 style="font-size:14px;font-weight:bold;margin:0;">IXLOS BOOKS</h2>
          <p style="font-size:10px;color:#666;margin:2px 0;">Namangan, Uychi</p>
          <p style="font-size:10px;color:#666;margin:0;">+998 93 678 55 52</p>
        </div>
        <div style="border-top:1px dashed #999;margin:6px 0;"></div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#666;margin-bottom:6px;">
          <div>
            <p style="margin:0;">Chek: ${transaction.id.slice(0, 8)}</p>
            <p style="margin:0;">Sana: ${new Date(transaction.date).toLocaleDateString()}</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0;">Kassir: Sotuvchi</p>
            <p style="margin:0;">Vaqt: ${new Date(transaction.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </div>
        </div>
        <div style="margin-bottom:6px;">
          ${transaction.items.map(item => `
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
              <div>
                <p style="margin:0;font-weight:500;">${item.product.name}</p>
                <p style="margin:0;font-size:9px;color:#666;">${item.quantity} x ${item.product.price.toLocaleString()}</p>
              </div>
              <div style="font-family:monospace;font-weight:500;">
                ${(item.quantity * item.product.price).toLocaleString()}
              </div>
            </div>
          `).join('')}
        </div>
        <div style="border-top:1px dashed #999;margin:6px 0;"></div>
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;">
            <span style="color:#666;">Jami:</span>
            <span style="font-family:monospace;">${transaction.totalAmount.toLocaleString()} so'm</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-top:4px;">
            <span>TO'LANDI:</span>
            <span style="font-family:monospace;">${transaction.totalAmount.toLocaleString()} so'm</span>
          </div>
          <p style="font-size:9px;text-align:right;color:#666;margin:2px 0 0;">To'lov: ${transaction.paymentMethod === 'card' ? 'Karta' : 'Naqd'}</p>
        </div>
        <div style="text-align:center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://t.me/ixlosbooksuz&color=000000" alt="QR" style="width:60px;height:60px;">
          <p style="font-size:8px;color:#666;margin:4px 0 0;">Xaridingiz uchun rahmat!<br/>@ixlosbooksuz</p>
        </div>
      `;
    }
  }, [isOpen, transaction]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden bg-white gap-0 no-print">
        <div className="p-6 flex flex-col items-center text-center bg-white" id="receipt-area">
          <ReceiptContent transaction={transaction} />
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
