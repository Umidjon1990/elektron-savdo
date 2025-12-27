import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, X, Keyboard, Camera, CameraOff } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

interface ScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function ScannerOverlay({ isOpen, onClose, onScan }: ScannerOverlayProps) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen && !cameraError) {
      setScanning(true);
      
      // Initialize scanner
      const scannerId = "reader";
      
      // Wait for the DOM element to exist
      setTimeout(() => {
        if (!document.getElementById(scannerId)) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            // Success callback
            onScan(decodedText);
            html5QrCode.stop().catch(console.error);
            onClose();
          },
          (errorMessage) => {
            // Error callback - ignore frame read errors
          }
        ).then(() => {
          setPermissionGranted(true);
        }).catch((err) => {
          console.error("Error starting scanner", err);
          setCameraError(true);
        });
      }, 100);

    } else {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
      setManualCode("");
    }

    return () => {
      if (scannerRef.current) {
         if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(console.error);
         }
         scannerRef.current = null;
      }
    };
  }, [isOpen, cameraError]); // Don't include onClose or onScan to avoid re-triggering

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
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-50"
            onClick={onClose}
          >
            <X className="h-8 w-8" />
          </Button>

          <div className="relative w-full max-w-md bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[80vh]">
            {/* Camera View */}
            <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
               {cameraError ? (
                 <div className="flex flex-col items-center justify-center text-white/50 p-8 text-center">
                   <CameraOff className="h-12 w-12 mb-4 opacity-50" />
                   <p className="mb-2">Kamerani ishlatib bo'lmadi</p>
                   <p className="text-xs max-w-[200px]">Ruxsat berilmagan yoki qurilmada kamera yo'q. Iltimos kodni qo'lda kiriting.</p>
                 </div>
               ) : (
                 <div id="reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
               )}

               {/* Custom Overlay (simulating viewfinder if camera works, or just visual if waiting) */}
               {!cameraError && (
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-primary/50 rounded-xl relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1" />
                      
                      {scanning && (
                        <motion.div
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                        />
                      )}
                    </div>
                 </div>
               )}
            </div>

            <div className="p-6 bg-zinc-900 border-t border-white/10 shrink-0">
              <p className="text-white font-medium mb-4 text-center">
                {cameraError ? "Shtrix kodni kiriting" : "Shtrix kodni skanerlang"}
              </p>
              
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
