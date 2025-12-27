import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Camera, CameraOff, ScanText, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Html5Qrcode } from "html5-qrcode";
import { createWorker } from "tesseract.js";

interface ScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  mode?: "barcode" | "text";
}

export function ScannerOverlay({ isOpen, onClose, onScan, mode = "barcode" }: ScannerOverlayProps) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Barcode Scanner
  useEffect(() => {
    if (isOpen && mode === "barcode" && !cameraError) {
      setScanning(true);
      const scannerId = "reader";
      
      setTimeout(() => {
        if (!document.getElementById(scannerId)) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 30, // Balanced FPS
          qrbox: { width: 300, height: 150 },
          aspectRatio: 1.0,
          disableFlip: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          formatsToSupport: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ] 
        };
        
        html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            if (scannerRef.current) scannerRef.current.pause();
            if (navigator.vibrate) navigator.vibrate(50);
            onScan(decodedText);
            setTimeout(() => {
               if (scannerRef.current) scannerRef.current.stop().catch(console.error);
               onClose();
            }, 50);
          },
          () => {}
        ).catch((err) => {
          console.error("Error starting barcode scanner", err);
          setCameraError(true);
        });
      }, 100);
    }
    
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isOpen, mode, cameraError]);

  // Initialize Text Scanner (OCR)
  useEffect(() => {
    if (isOpen && mode === "text") {
      setOcrLoading(true);
      setRecognizedText("");
      
      // Initialize Worker
      (async () => {
        try {
          const worker = await createWorker('eng');
          workerRef.current = worker;
          setOcrLoading(false);
          
          // Start Camera
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
          
          setScanning(true);
        } catch (err) {
          console.error("Error initializing OCR", err);
          setCameraError(true);
          setOcrLoading(false);
        }
      })();
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, mode]);

  // OCR Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOpen && mode === "text" && !ocrLoading && scanning) {
      interval = setInterval(async () => {
        if (!workerRef.current || !videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Recognize text
        try {
           const { data: { text } } = await workerRef.current.recognize(canvas);
           const cleanText = text.replace(/\n/g, " ").trim();
           if (cleanText.length > 3) {
             setRecognizedText(cleanText);
           }
        } catch (e) {
          console.error(e);
        }
      }, 2000); // Scan every 2 seconds to avoid freezing
    }

    return () => clearInterval(interval);
  }, [isOpen, mode, ocrLoading, scanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      onScan(manualCode);
      setManualCode("");
    }
  };

  const captureText = () => {
    if (recognizedText) {
        if (navigator.vibrate) navigator.vibrate(50);
        onScan(recognizedText);
        onClose();
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
            <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
               {cameraError ? (
                 <div className="flex flex-col items-center justify-center text-white/50 p-8 text-center">
                   <CameraOff className="h-12 w-12 mb-4 opacity-50" />
                   <p className="mb-2">Kamerani ishlatib bo'lmadi</p>
                   <p className="text-xs max-w-[200px]">Ruxsat berilmagan yoki qurilmada kamera yo'q.</p>
                 </div>
               ) : (
                 mode === "text" ? (
                    <div className="relative w-full h-full">
                        <video 
                            ref={videoRef} 
                            className="w-full h-full object-cover" 
                            playsInline 
                            muted 
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {ocrLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                <div className="text-center text-white">
                                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" />
                                    <p>AI yuklanmoqda...</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="absolute bottom-4 left-4 right-4 z-20">
                            <div className="bg-black/80 backdrop-blur border border-white/20 p-4 rounded-xl">
                                <p className="text-xs text-white/60 mb-1">Aniqlangan matn:</p>
                                <p className="text-lg font-medium text-white mb-3 min-h-[30px] line-clamp-2">
                                    {recognizedText || "Matn qidirilmoqda..."}
                                </p>
                                <Button 
                                    className="w-full bg-primary hover:bg-primary/90" 
                                    onClick={captureText}
                                    disabled={!recognizedText}
                                >
                                    <ScanText className="mr-2 h-4 w-4" />
                                    Tanlash
                                </Button>
                            </div>
                        </div>
                    </div>
                 ) : (
                    <div id="reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
                 )
               )}

               {/* Custom Overlay for Barcode */}
               {!cameraError && mode === "barcode" && (
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-primary/50 rounded-xl relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1" />
                      
                      {scanning && (
                        <motion.div
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                        />
                      )}
                    </div>
                 </div>
               )}
            </div>

            {mode === "barcode" && (
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
                    <Button type="submit" variant="secondary">OK</Button>
                  </form>
                </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
