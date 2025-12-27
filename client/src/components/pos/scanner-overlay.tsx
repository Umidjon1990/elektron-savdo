import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Camera, CameraOff, ScanText, Loader2, RotateCcw, Image as ImageIcon } from "lucide-react";
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
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStoppingRef = useRef(false);

  // Helper to safely stop and clear scanner
  const cleanupScanner = async () => {
    if (!scannerRef.current || isStoppingRef.current) return;
    
    try {
      isStoppingRef.current = true;
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current.clear();
    } catch (err) {
      console.warn("Scanner cleanup warning:", err);
    } finally {
      isStoppingRef.current = false;
      scannerRef.current = null;
    }
  };

  // Initialize Barcode Scanner
  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      if (isOpen && mode === "barcode" && !cameraError) {
        setScanning(true);
        const scannerId = "reader";
        
        // Ensure previous instance is gone
        await cleanupScanner();

        setTimeout(async () => {
          if (!isMounted || !document.getElementById(scannerId)) return;

          try {
            const html5QrCode = new Html5Qrcode(scannerId);
            scannerRef.current = html5QrCode;

            const config = { 
              fps: 60, // Boosted back to 60 for "Maximum Speed" requested
              qrbox: { width: 300, height: 150 }, // Optimized for barcodes (wider)
              aspectRatio: 1.0,
              disableFlip: false,
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
              },
              formatsToSupport: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ] 
            };
            
            await html5QrCode.start(
              { facingMode: "environment" }, 
              config,
              (decodedText) => {
                if (scannerRef.current) scannerRef.current.pause();
                if (navigator.vibrate) navigator.vibrate(50);
                onScan(decodedText);
                
                // Graceful cleanup
                setTimeout(() => {
                   cleanupScanner().then(() => {
                     if (isMounted) onClose();
                   });
                }, 50);
              },
              () => {} 
            );
          } catch (err) {
            console.error("Error starting barcode scanner", err);
            if (isMounted) {
              setCameraError(true);
              setErrorMessage("Kamerani ishga tushirib bo'lmadi. Qayta urinib ko'ring.");
            }
          }
        }, 300);
      }
    };

    startScanner();
    
    return () => {
      isMounted = false;
      cleanupScanner();
    };
  }, [isOpen, mode, cameraError]);

  // Initialize Text Scanner (OCR)
  useEffect(() => {
    let isMounted = true;

    if (isOpen && mode === "text") {
      setOcrLoading(true);
      setCapturedImage(null);
      
      (async () => {
        try {
          const worker = await createWorker('eng');
          if (!isMounted) {
             await worker.terminate();
             return;
          }
          workerRef.current = worker;
          setOcrLoading(false);
          
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          });
          
          if (!isMounted) {
             stream.getTracks().forEach(track => track.stop());
             return;
          }
          
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Play error", e));
          }
          
          setScanning(true);
        } catch (err) {
          console.error("Error initializing OCR", err);
          if (isMounted) {
            setCameraError(true);
            setErrorMessage("Matn skanerini ishga tushirib bo'lmadi.");
            setOcrLoading(false);
          }
        }
      })();
    }

    return () => {
      isMounted = false;
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


  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      onScan(manualCode);
      setManualCode("");
    }
  };

  const takePictureAndScan = async () => {
     if (!videoRef.current || !canvasRef.current || !workerRef.current) return;

     const video = videoRef.current;
     const canvas = canvasRef.current;
     const ctx = canvas.getContext('2d');
     
     if (!ctx || video.videoWidth === 0) return;

     // Set canvas size to video size
     canvas.width = video.videoWidth;
     canvas.height = video.videoHeight;
     
     // Draw the full frame
     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
     
     // Crop the center region (where the text usually is) to speed up OCR
     // Crop 80% width, 20% height strip from center
     const cropWidth = canvas.width * 0.9;
     const cropHeight = canvas.height * 0.25;
     const cropX = (canvas.width - cropWidth) / 2;
     const cropY = (canvas.height - cropHeight) / 2;

     const cropCanvas = document.createElement('canvas');
     cropCanvas.width = cropWidth;
     cropCanvas.height = cropHeight;
     const cropCtx = cropCanvas.getContext('2d');
     cropCtx?.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
     
     // Show captured image to user (full frame for context, but we scan cropped)
     setCapturedImage(canvas.toDataURL('image/jpeg'));
     setOcrProcessing(true);

     try {
       // Recognize text from the cropped center strip
       const { data: { text } } = await workerRef.current.recognize(cropCanvas);
       
       const cleanText = text.replace(/\n/g, " ").replace(/[^a-zA-Z0-9\s.,'-]/g, "").trim();
       
       if (cleanText.length > 2) {
          if (navigator.vibrate) navigator.vibrate(50);
          onScan(cleanText);
          onClose();
       } else {
          setErrorMessage("Matn aniqlanmadi. Qayta urinib ko'ring.");
          setCapturedImage(null); // Reset to camera
       }
     } catch (e) {
       console.error(e);
       setErrorMessage("Xatolik yuz berdi");
       setCapturedImage(null);
     } finally {
       setOcrProcessing(false);
     }
  };

  const retryCamera = () => {
    setCameraError(false);
    setErrorMessage("");
    setCapturedImage(null);
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
                   <p className="mb-2 font-medium text-white">{errorMessage || "Kamerani ishlatib bo'lmadi"}</p>
                   <p className="text-xs max-w-[200px] mb-4">Ruxsat berilmagan yoki qurilmada muammo bor.</p>
                   <Button variant="outline" size="sm" onClick={retryCamera} className="gap-2">
                     <RotateCcw className="h-4 w-4" />
                     Qayta urinish
                   </Button>
                 </div>
               ) : (
                 mode === "text" ? (
                    <div className="relative w-full h-full">
                        {capturedImage ? (
                            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover opacity-50" />
                        ) : (
                            <video 
                                ref={videoRef} 
                                className="w-full h-full object-cover" 
                                playsInline 
                                muted 
                            />
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {(ocrLoading || ocrProcessing) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                <div className="text-center text-white">
                                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" />
                                    <p>{ocrProcessing ? "Matn o'qilmoqda..." : "AI yuklanmoqda..."}</p>
                                </div>
                            </div>
                        )}
                        
                        {/* Target Box */}
                        {!capturedImage && !ocrLoading && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[90%] h-[25%] border-2 border-primary/70 rounded-lg relative bg-white/5 backdrop-blur-[2px]">
                                    <div className="absolute -top-6 left-0 right-0 text-center">
                                        <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">Matnni shu yerga to'g'irlang</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center">
                             {!capturedImage && !ocrLoading && (
                                <Button 
                                    size="lg"
                                    className="rounded-full h-16 w-16 bg-white hover:bg-gray-200 text-black border-4 border-gray-300 p-0 flex items-center justify-center shadow-lg"
                                    onClick={takePictureAndScan}
                                >
                                    <Camera className="h-8 w-8" />
                                </Button>
                             )}
                             {errorMessage && !capturedImage && (
                                 <div className="absolute -top-12 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm">
                                     {errorMessage}
                                 </div>
                             )}
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
