import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, X, Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function ScannerOverlay({ isOpen, onClose, onScan }: ScannerOverlayProps) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      setScanning(true);
      // Auto-scan feature removed to let user test their own codes
      // or we can keep it as a "demo" button
    } else {
      setManualCode("");
    }
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      onScan(manualCode);
      setManualCode("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-8 w-8" />
          </Button>

          <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse pointer-events-none" />
            
            {/* Viewfinder */}
            <div className="flex-1 relative flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-primary rounded-xl relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1" />
                
                {scanning && (
                  <motion.div
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                  />
                )}
              </div>
            </div>

            <div className="p-6 bg-black/50 backdrop-blur-sm border-t border-white/10">
              <p className="text-white font-medium mb-4 text-center">Shtrix kodni skanerlang</p>
              
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Kodni qo'lda kiritish..." 
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-primary focus-visible:border-primary"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button type="submit" variant="secondary">
                  OK
                </Button>
              </form>
              
              <div className="mt-4 flex justify-center gap-2">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="text-xs bg-transparent text-white/50 border-white/20 hover:bg-white/10 hover:text-white"
                   onClick={() => onScan("9781847941831")} // Atomic Habits
                 >
                   Demo: Atomic Habits
                 </Button>
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="text-xs bg-transparent text-white/50 border-white/20 hover:bg-white/10 hover:text-white"
                   onClick={() => onScan("9789943234567")} // O'tkan kunlar
                 >
                   Demo: O'tkan kunlar
                 </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
