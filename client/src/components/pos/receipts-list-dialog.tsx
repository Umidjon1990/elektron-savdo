import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactions, type Transaction } from "@/lib/transaction-context";
import { ReceiptDialog } from "./receipt-dialog";
import { useState, useMemo } from "react";
import { Receipt, XCircle, Eye, AlertTriangle, Calendar } from "lucide-react";
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

type FilterMode = "today" | "yesterday" | "custom" | "all";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ReceiptsListDialog({ isOpen, onClose }: ReceiptsListDialogProps) {
  const { transactions, voidTransaction } = useTransactions();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("today");
  const [customDate, setCustomDate] = useState<string>(toIsoDate(new Date()));
  const { toast } = useToast();

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = toIsoDate(now);
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterday = toIsoDate(y);

    let targetDate: string | null = null;
    if (filterMode === "today") targetDate = today;
    else if (filterMode === "yesterday") targetDate = yesterday;
    else if (filterMode === "custom") targetDate = customDate;

    const filtered = transactions.filter(t => {
      if (filterMode === "all") return true;
      if (!targetDate) return true;
      const transDate = toIsoDate(new Date(t.date));
      return transDate === targetDate;
    });

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterMode, customDate]);

  const titleText = filterMode === "today" ? "Bugungi cheklar"
    : filterMode === "yesterday" ? "Kechagi cheklar"
    : filterMode === "custom" ? `Cheklar (${customDate})`
    : "Barcha cheklar";

  const emptyText = filterMode === "today" ? "Bugun cheklar yo'q"
    : filterMode === "yesterday" ? "Kecha cheklar yo'q"
    : filterMode === "custom" ? "Tanlangan kunda cheklar yo'q"
    : "Cheklar yo'q";

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
              {titleText}
              <span className="ml-auto text-xs font-normal text-muted-foreground" data-testid="text-receipts-count">
                {filteredTransactions.length} ta
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b">
            <Button
              size="sm"
              variant={filterMode === "today" ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setFilterMode("today")}
              data-testid="button-filter-today"
            >
              Bugun
            </Button>
            <Button
              size="sm"
              variant={filterMode === "yesterday" ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setFilterMode("yesterday")}
              data-testid="button-filter-yesterday"
            >
              Kecha
            </Button>
            <Button
              size="sm"
              variant={filterMode === "custom" ? "default" : "outline"}
              className="h-8 px-3 text-xs gap-1"
              onClick={() => setFilterMode("custom")}
              data-testid="button-filter-custom"
            >
              <Calendar className="h-3.5 w-3.5" />
              Sana
            </Button>
            <Button
              size="sm"
              variant={filterMode === "all" ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setFilterMode("all")}
              data-testid="button-filter-all"
            >
              Barchasi
            </Button>
            {filterMode === "custom" && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                max={toIsoDate(new Date())}
                className="h-8 text-xs w-auto ml-1"
                data-testid="input-filter-date"
              />
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 pt-2">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>{emptyText}</p>
              </div>
            ) : (
              filteredTransactions.map(transaction => (
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
                      {filterMode === "today"
                        ? new Date(transaction.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : new Date(transaction.date).toLocaleString([], {day:'2-digit', month:'2-digit', year:'2-digit', hour: '2-digit', minute:'2-digit'})}
                      {' • '}
                      {(transaction.items || []).length} ta mahsulot
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
