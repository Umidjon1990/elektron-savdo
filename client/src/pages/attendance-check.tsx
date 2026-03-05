import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { Camera, MapPin, CheckCircle2, XCircle, Clock, LogIn, LogOut, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StaffInfo {
  name: string;
  hasFaceDescriptor: boolean;
  locationLat: string | null;
  locationLng: string | null;
  locationRadius: number;
  locationName: string;
  storeName: string;
  todayRecords: Array<{ type: string; date: string; faceVerified: boolean; locationVerified: boolean }>;
}

type Step = "loading" | "error" | "camera" | "verifying" | "ready" | "submitting" | "done";

let faceApiLoaded = false;
let faceApiLoading = false;

async function loadFaceApi() {
  if (faceApiLoaded) return;
  if (faceApiLoading) {
    while (!faceApiLoaded) await new Promise(r => setTimeout(r, 100));
    return;
  }
  faceApiLoading = true;
  const faceapi = await import("face-api.js");
  const MODEL_URL = "/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  faceApiLoaded = true;
  faceApiLoading = false;
}


export default function AttendanceCheckPage() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";

  const [step, setStep] = useState<Step>("loading");
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [faceScore, setFaceScore] = useState<number | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [liveDescriptor, setLiveDescriptor] = useState<number[] | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [locationDistance, setLocationDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const [resultMessage, setResultMessage] = useState("");
  const [resultAccepted, setResultAccepted] = useState(false);
  const [salaryData, setSalaryData] = useState<{ totalHours: number; totalEarned: number; hourlyRate: number; daysWorked: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  const fetchStaffInfo = useCallback(async () => {
    try {
      setStep("loading");
      const res = await fetch(`/api/attendance/check/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Xodim topilmadi");
      }
      const data: StaffInfo = await res.json();
      setStaffInfo(data);
      setStep("camera");
      fetch(`/api/attendance/salary/${token}?period=monthly`).then(r => r.ok ? r.json() : null).then(s => {
        if (s) setSalaryData({ totalHours: s.totalHours, totalEarned: s.totalEarned, hourlyRate: s.hourlyRate, daysWorked: s.daysWorked });
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message || "Xatolik yuz berdi");
      setStep("error");
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchStaffInfo();
    return () => {
      stopCamera();
    };
  }, [token, fetchStaffInfo]);

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      await loadFaceApi();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      startFaceDetection();
    } catch (err: any) {
      setErrorMsg("Kameraga ruxsat berilmadi. Iltimos, kamera ruxsatini yoqing.");
      setStep("error");
    }
  };

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    let detecting = false;
    detectionIntervalRef.current = window.setInterval(async () => {
      if (detecting || !videoRef.current || videoRef.current.readyState < 2) return;
      detecting = true;
      try {
        const faceapi = await import("face-api.js");
        const detection = await faceapi
          .detectSingleFace(videoRef.current!, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (detection) {
          const desc = Array.from(detection.descriptor);
          setLiveDescriptor(desc);
          setFaceDetected(true);
          setFaceScore(100);
        }
      } catch {}
      detecting = false;
    }, 1500);
  };

  useEffect(() => {
    if (step === "camera" && staffInfo) {
      startCamera();
      getLocation();
    }
  }, [step, staffInfo]);

  const getLocation = () => {
    setLocationLoading(true);
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("GPS qo'llab-quvvatlanmaydi");
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setLocationLoading(false);

        if (staffInfo?.locationLat && staffInfo?.locationLng) {
          const R = 6371000;
          const toRad = (d: number) => d * Math.PI / 180;
          const lat1 = parseFloat(staffInfo.locationLat);
          const lng1 = parseFloat(staffInfo.locationLng);
          const dLat = toRad(lat - lat1);
          const dLng = toRad(lng - lng1);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
          const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          setLocationDistance(dist);
          setLocationVerified(dist <= (staffInfo.locationRadius || 100));
        }
      },
      (err) => {
        setLocationError(err.code === 1 ? "GPS ruxsati berilmadi" : "GPS xatoligi");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (type: "check_in" | "check_out") => {
    setStep("submitting");
    try {
      const res = await fetch(`/api/attendance/record/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          faceDescriptor: liveDescriptor,
          locationLat: userLocation?.lat?.toString() || null,
          locationLng: userLocation?.lng?.toString() || null,
          photo: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setResultAccepted(data.accepted);
      setResultMessage(data.message);
      stopCamera();
      setStep("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Xatolik yuz berdi");
      setStep("error");
    }
  };

  const todayCheckIn = staffInfo?.todayRecords?.find(r => r.type === "check_in");
  const todayCheckOut = staffInfo?.todayRecords?.find(r => r.type === "check_out");

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm" data-testid="text-loading">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2" data-testid="text-error-title">Xatolik</h2>
            <p className="text-sm text-gray-600 mb-4" data-testid="text-error-message">{errorMsg}</p>
            <Button onClick={() => { setErrorMsg(""); fetchStaffInfo(); }} data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-2" /> Qayta urinish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            {resultAccepted ? (
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            )}
            <h2 className="text-lg font-bold text-gray-900 mb-2" data-testid="text-result-title">
              {resultAccepted ? "Muvaffaqiyat!" : "Ogohlantirish"}
            </h2>
            <p className="text-sm text-gray-600 mb-4" data-testid="text-result-message">{resultMessage}</p>
            <p className="text-xs text-gray-400 mb-4">
              {new Date().toLocaleString("uz-UZ")}
            </p>
            <Button onClick={() => { setStep("camera"); setFaceScore(null); setFaceDetected(false); setLiveDescriptor(null); fetchStaffInfo(); }} data-testid="button-new-record">
              Yangi yozuv
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center pt-2">
          <h1 className="text-xl font-bold text-gray-900" data-testid="text-staff-name">{staffInfo?.name || ""}</h1>
          <p className="text-sm text-gray-500" data-testid="text-store-name">{staffInfo?.storeName || ""}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {(todayCheckIn || todayCheckOut) && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Bugungi yozuvlar</p>
              <div className="flex gap-4">
                {todayCheckIn && (
                  <div className="flex items-center gap-2" data-testid="text-today-checkin">
                    <LogIn className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{new Date(todayCheckIn.date).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span>
                    {todayCheckIn.faceVerified && todayCheckIn.locationVerified ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                )}
                {todayCheckOut && (
                  <div className="flex items-center gap-2" data-testid="text-today-checkout">
                    <LogOut className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{new Date(todayCheckOut.date).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span>
                    {todayCheckOut.faceVerified && todayCheckOut.locationVerified ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="relative bg-black aspect-[3/4] flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              data-testid="video-camera"
            />
            <canvas ref={canvasRef} className="hidden" />
            {step === "submitting" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            )}
            <div className="absolute top-3 left-3 right-3 flex justify-between">
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${faceDetected ? "bg-green-500/90 text-white" : "bg-gray-800/70 text-gray-200"}`}
                data-testid="badge-face-status">
                <Camera className="h-3.5 w-3.5" />
                {faceDetected ? "Yuz aniqlandi ✓" : "Yuzni aniqlash..."}
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${locationVerified ? "bg-green-500/90 text-white" : locationError ? "bg-red-500/90 text-white" : locationLoading ? "bg-yellow-500/90 text-white" : "bg-gray-800/70 text-gray-200"}`}
                data-testid="badge-location-status">
                <MapPin className="h-3.5 w-3.5" />
                {locationLoading ? "GPS..." : locationError ? "GPS ✗" : locationDistance !== null ? `${locationDistance}m` : "GPS..."}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <div className="flex gap-2 items-center text-sm px-1">
            {faceDetected ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
            )}
            <span className={faceDetected ? "text-green-700" : "text-gray-500"} data-testid="text-face-result">
              Yuz aniqlash {faceDetected ? "✓ (aniqlandi)" : "kutilmoqda..."}
            </span>
          </div>
          <div className="flex gap-2 items-center text-sm px-1">
            {locationVerified ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
            )}
            <span className={locationVerified ? "text-green-700" : "text-gray-500"} data-testid="text-location-result">
              Lokatsiya {locationVerified ? `✓ (${locationDistance}m)` : locationDistance !== null ? `✗ (${locationDistance}m / ${staffInfo?.locationRadius || 100}m)` : locationError || "kutilmoqda..."}
            </span>
          </div>
          {staffInfo?.locationName && (
            <p className="text-xs text-gray-400 px-1 pl-7" data-testid="text-location-name">
              {staffInfo.locationName}
            </p>
          )}
        </div>

        {!locationVerified && !locationLoading && (
          <Button variant="outline" size="sm" className="w-full" onClick={getLocation} data-testid="button-refresh-location">
            <RefreshCw className="h-4 w-4 mr-2" /> GPS yangilash
          </Button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white h-14 text-base"
            onClick={() => handleSubmit("check_in")}
            disabled={step === "submitting"}
            data-testid="button-check-in"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Kelish
          </Button>
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white h-14 text-base"
            onClick={() => handleSubmit("check_out")}
            disabled={step === "submitting"}
            data-testid="button-check-out"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Ketish
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400" data-testid="text-current-time">
          <Clock className="h-3 w-3 inline mr-1" />
          {new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
        </p>

        {salaryData && salaryData.hourlyRate > 0 && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" data-testid="card-salary-info">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-green-800 mb-2">Bu oylik daromad</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-700">{salaryData.daysWorked}</p>
                  <p className="text-[10px] text-green-600">Kun</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-700">{salaryData.totalHours.toFixed(1)}</p>
                  <p className="text-[10px] text-green-600">Soat</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-700">{salaryData.totalEarned.toLocaleString()}</p>
                  <p className="text-[10px] text-green-600">so'm</p>
                </div>
              </div>
              <p className="text-[10px] text-green-600 text-center mt-1">
                {salaryData.hourlyRate.toLocaleString()} so'm/soat
              </p>
            </CardContent>
          </Card>
        )}
        <div className="pb-4" />
      </div>
    </div>
  );
}
