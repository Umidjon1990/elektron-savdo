import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTransactions } from "@/lib/transaction-context";
import { Package } from "lucide-react";

interface SoldItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SoldItem {
  productId: string;
  productName: string;
  productImage?: string;
  totalQuantity: number;
  totalRevenue: number;
}

export function SoldItemsDialog({ isOpen, onClose }: SoldItemsDialogProps) {
  const { transactions } = useTransactions();

  const today = new Date();
  const todayTransactions = transactions.filter(t => {
    const transDate = new Date(t.date);
    return transDate.toDateString() === today.toDateString() && t.status !== "voided";
  });

  const soldItemsMap = new Map<string, SoldItem>();

  todayTransactions.forEach(transaction => {
    transaction.items.forEach(item => {
      const existing = soldItemsMap.get(item.product.id);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.quantity * item.product.price;
      } else {
        soldItemsMap.set(item.product.id, {
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.image,
          totalQuantity: item.quantity,
          totalRevenue: item.quantity * item.product.price,
        });
      }
    });
  });

  const soldItems = Array.from(soldItemsMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity);

  const totalItems = soldItems.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalRevenue = soldItems.reduce((sum, item) => sum + item.totalRevenue, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bugun sotilgan tovarlar
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-80">Jami sotilgan</p>
              <p className="text-2xl font-bold">{totalItems} ta</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Jami tushum</p>
              <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} so'm</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {soldItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Bugun hali sotilmagan</p>
            </div>
          ) : (
            soldItems.map(item => (
              <div
                key={item.productId}
                className="p-3 rounded-lg border bg-white border-gray-200 flex items-center gap-3"
              >
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.totalRevenue.toLocaleString()} so'm
                  </p>
                </div>
                
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
                  {item.totalQuantity} ta
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
