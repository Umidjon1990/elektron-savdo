import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function ScannerOverlay({ isOpen, onClose, onScan }: ScannerOverlayProps) {
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScanning(true);
      // Mock random scan after 2 seconds
      const timer = setTimeout(() => {
        onScan("890123456789"); // Mock barcode
        setScanning(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onScan]);

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

          <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse" />
            
            {/* Viewfinder */}
            <div className="absolute inset-0 flex items-center justify-center">
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

            <div className="absolute bottom-8 left-0 right-0 text-center">
              <p className="text-white font-medium mb-2">Shtrix kodni skanerlang</p>
              <p className="text-white/50 text-sm">Kamera faol...</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
