import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTransactions, type Transaction } from "@/lib/transaction-context";
import { ReceiptDialog } from "./receipt-dialog";
import { useState } from "react";
import { Receipt, XCircle, Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface ReceiptsListDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptsListDialog({ isOpen, onClose }: ReceiptsListDialogProps) {
  const { transactions, voidTransaction } = useTransactions();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  const todayTransactions = transactions.filter(t => {
    const today = new Date();
    const transDate = new Date(t.date);
    return transDate.toDateString() === today.toDateString();
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleVoid = async (id: string) => {
    try {
      await voidTransaction(id);
      toast({
        title: "Chek bekor qilindi",
        description: "Tovarlar ombordga qaytarildi",
        className: "bg-orange-500 text-white border-none",
      });
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Bekor qilishda xatolik",
        variant: "destructive",
      });
    }
    setVoidConfirmId(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Bugungi cheklar
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {todayTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Bugun cheklar yo'q</p>
              </div>
            ) : (
              todayTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className={cn(
                    "p-3 rounded-lg border flex items-center justify-between gap-3",
                    transaction.status === "voided" 
                      ? "bg-red-50 border-red-200" 
                      : "bg-white border-gray-200 hover:border-primary/30"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        #{transaction.id.slice(0, 8)}
                      </span>
                      {transaction.status === "voided" && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          Bekor qilingan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {' • '}
                      {transaction.items.length} ta mahsulot
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      transaction.status === "voided" ? "text-red-500 line-through" : "text-green-600"
                    )}>
                      {transaction.totalAmount.toLocaleString()} so'm
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {transaction.status !== "voided" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setVoidConfirmId(transaction.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptDialog
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

      <AlertDialog open={!!voidConfirmId} onOpenChange={() => setVoidConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Chekni bekor qilish
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu chekni bekor qilmoqchimisiz? Tovarlar ombordga qaytariladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Yo'q</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => voidConfirmId && handleVoid(voidConfirmId)}
            >
              Ha, bekor qilish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
