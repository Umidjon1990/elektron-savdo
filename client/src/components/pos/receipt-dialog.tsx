import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Transaction } from "@/lib/transaction-context";
import { Printer, CheckCircle2, Share2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ReceiptDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptDialog({ transaction, isOpen, onClose }: ReceiptDialogProps) {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden bg-white gap-0">
        <div className="p-6 flex flex-col items-center text-center bg-white print:shadow-none" id="receipt-area">
          {/* Header */}
          <div className="mb-6 space-y-2">
            <img 
              src="/assets/image_1768471627048.png" 
              alt="Ixlos Books" 
              className="w-20 h-20 object-contain mx-auto mb-2"
            />
            <h2 className="text-xl font-bold uppercase tracking-wide">Ixlos Books</h2>
            <p className="text-xs text-muted-foreground">Namangan, Uychi</p>
            <p className="text-xs text-muted-foreground">+998 93 678 55 52</p>
          </div>

          <Separator className="mb-4" />

          {/* Transaction Info */}
          <div className="w-full flex justify-between text-xs text-muted-foreground mb-4">
            <div className="text-left">
              <p>Chek №: {transaction.id}</p>
              <p>Sana: {new Date(transaction.date).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p>Kassir: Sotuvchi</p>
              <p>Vaqt: {new Date(transaction.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
          </div>

          {/* Items */}
          <div className="w-full space-y-3 mb-4">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm group">
                <div className="text-left flex-1 pr-2">
                  <p className="font-medium line-clamp-1">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} x {item.product.price.toLocaleString()}
                  </p>
                </div>
                <div className="text-right font-mono font-medium">
                  {(item.quantity * item.product.price).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <Separator className="mb-4" />

          {/* Totals */}
          <div className="w-full space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Jami:</span>
              <span className="font-mono">
                {transaction.totalAmount.toLocaleString()} so'm
              </span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>TO'LANDI:</span>
              <span className="font-mono">{transaction.totalAmount.toLocaleString()} so'm</span>
            </div>
            <div className="text-xs text-right text-muted-foreground uppercase mt-1">
              To'lov turi: {transaction.paymentMethod === 'card' ? 'Karta' : 'Naqd'}
            </div>
          </div>

          {/* Footer & QR */}
          <div className="flex flex-col items-center space-y-3">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/ixlosbooksuz&color=000000`} 
              alt="Telegram QR" 
              className="w-24 h-24 mix-blend-multiply"
            />
            <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
              Xaridingiz uchun rahmat! <br/>
              Telegram: @ixlosbooksuz
            </p>
          </div>
        </div>

        {/* Actions - Hidden in Print */}
        <div className="p-4 bg-gray-50 border-t flex gap-2 print:hidden">
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
