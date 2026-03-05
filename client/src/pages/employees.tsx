import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { SidebarNav } from "@/components/layout/sidebar-nav";

let faceModelsLoaded = false;
let faceModelsLoading = false;
async function ensureFaceModels() {
  if (faceModelsLoaded) return;
  if (faceModelsLoading) {
    while (!faceModelsLoaded) await new Promise(r => setTimeout(r, 100));
    return;
  }
  faceModelsLoading = true;
  const faceapi = await import("face-api.js");
  const MODEL_URL = "/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  faceModelsLoaded = true;
  faceModelsLoading = false;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  UserCheck, Users, Plus, Pencil, Trash2, Copy, Camera, MapPin,
  Clock, CheckCircle2, XCircle, CalendarDays, Timer, AlertTriangle,
  Eye, EyeOff, Phone, User, Lock, Globe, Loader2
} from "lucide-react";

type StaffMember = {
  id: string;
  tenantId: string | null;
  name: string;
  phone: string;
  username: string;
  token: string;
  faceDescriptor: number[] | null;
  facePhoto: string | null;
  locationLat: string | null;
  locationLng: string | null;
  locationRadius: number;
  locationName: string | null;
  hourlyRate: number;
  isActive: boolean;
  createdAt: string;
};

type AttendanceRecord = {
  id: string;
  staffId: string | null;
  type: string;
  faceVerified: boolean;
  locationVerified: boolean;
  locationLat: string | null;
  locationLng: string | null;
  faceScore: number;
  locationDistance: number;
  photo: string | null;
  note: string | null;
  date: string;
  createdAt: string;
};

type AttendanceSummary = {
  total: number;
  present: number;
  working: number;
  absent: number;
  staff: Array<{
    staffId: string;
    name: string;
    checkIn: string | null;
    checkOut: string | null;
    isPresent: boolean;
    workedMinutes: number;
  }>;
};

function formatTime(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMinutes(m: number): string {
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h} soat ${min} min`;
}

export default function EmployeesPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"staff" | "attendance" | "salary">("staff");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formLocationLat, setFormLocationLat] = useState("");
  const [formLocationLng, setFormLocationLng] = useState("");
  const [formLocationRadius, setFormLocationRadius] = useState("100");
  const [formLocationName, setFormLocationName] = useState("");
  const [formHourlyRate, setFormHourlyRate] = useState("0");
  const [formFacePhoto, setFormFacePhoto] = useState("");
  const [formFaceDescriptor, setFormFaceDescriptor] = useState<number[] | null>(null);
  const [capturingFace, setCapturingFace] = useState(false);
  const [faceStatus, setFaceStatus] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [attDateFilter, setAttDateFilter] = useState<"today" | "week" | "month">("today");
  const [attStaffFilter, setAttStaffFilter] = useState<string>("all");
  const [salaryPeriod, setSalaryPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [salaryStaffFilter, setSalaryStaffFilter] = useState<string>("all");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data: staffList = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: attendanceSummary } = useQuery<AttendanceSummary>({
    queryKey: ["attendance-summary"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/summary", { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const getAttDateRange = () => {
    const now = new Date();
    let dateFrom: Date;
    if (attDateFilter === "week") {
      const d = now.getDay() || 7;
      dateFrom = new Date(now);
      dateFrom.setDate(now.getDate() - d + 1);
      dateFrom.setHours(0, 0, 0, 0);
    } else if (attDateFilter === "month") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      dateFrom = new Date(now);
      dateFrom.setHours(0, 0, 0, 0);
    }
    return { from: dateFrom.toISOString(), to: now.toISOString() };
  };

  const { data: attendanceRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", attDateFilter, attStaffFilter],
    queryFn: async () => {
      const { from, to } = getAttDateRange();
      let url = `/api/attendance?from=${from}&to=${to}`;
      if (attStaffFilter !== "all") url += `&staffId=${attStaffFilter}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  type SalaryData = {
    period: string;
    dateFrom: string;
    dateTo: string;
    grandTotal: number;
    staff: Array<{
      staffId: string;
      name: string;
      phone: string;
      hourlyRate: number;
      totalHours: number;
      totalEarned: number;
      daysWorked: number;
      days: Array<{ date: string; checkIn: string | null; checkOut: string | null; hours: number; earned: number }>;
    }>;
  };

  const { data: salaryData, isLoading: salaryLoading } = useQuery<SalaryData>({
    queryKey: ["salary", salaryPeriod, salaryStaffFilter],
    queryFn: async () => {
      let url = `/api/attendance/salary?period=${salaryPeriod}`;
      if (salaryStaffFilter !== "all") url += `&staffId=${salaryStaffFilter}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token && activeTab === "salary",
  });

  const createStaff = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/staff", { method: "POST", headers, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Xatolik" }));
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
      closeDialog();
      toast({ title: "Xodim qo'shildi" });
    },
    onError: (err: any) => toast({ title: err.message || "Xatolik", variant: "destructive" }),
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/staff/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
      closeDialog();
      toast({ title: "Xodim yangilandi" });
    },
    onError: () => toast({ title: "Xatolik", variant: "destructive" }),
  });

  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
      setDeleteConfirmId(null);
      toast({ title: "Xodim o'chirildi" });
    },
  });

  const closeDialog = () => {
    setStaffDialogOpen(false);
    setEditingStaff(null);
    setFormName("");
    setFormPhone("");
    setFormUsername("");
    setFormPassword("");
    setFormLocationLat("");
    setFormLocationLng("");
    setFormLocationRadius("100");
    setFormLocationName("");
    setFormHourlyRate("0");
    setFormFacePhoto("");
    setFormFaceDescriptor(null);
    setCapturingFace(false);
    setFaceStatus("");
    setShowPassword(false);
    stopCamera();
  };

  const openEditDialog = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormPhone(staff.phone);
    setFormUsername(staff.username);
    setFormPassword("");
    setFormLocationLat(staff.locationLat || "");
    setFormLocationLng(staff.locationLng || "");
    setFormLocationRadius(String(staff.locationRadius));
    setFormLocationName(staff.locationName || "");
    setFormHourlyRate(String(staff.hourlyRate || 0));
    setFormFacePhoto(staff.facePhoto || "");
    setFormFaceDescriptor(staff.faceDescriptor || null);
    setStaffDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return toast({ title: "Ism kiriting", variant: "destructive" });
    if (!formUsername.trim()) return toast({ title: "Login kiriting", variant: "destructive" });
    if (!editingStaff && !formPassword) return toast({ title: "Parol kiriting", variant: "destructive" });

    const data: any = {
      name: formName.trim(),
      phone: formPhone.trim(),
      username: formUsername.trim(),
      locationLat: formLocationLat || null,
      locationLng: formLocationLng || null,
      locationRadius: parseInt(formLocationRadius) || 100,
      locationName: formLocationName || null,
      hourlyRate: parseInt(formHourlyRate) || 0,
      facePhoto: formFacePhoto || null,
      faceDescriptor: formFaceDescriptor || null,
    };

    if (formPassword) data.password = formPassword;

    if (editingStaff) {
      updateStaff.mutate({ id: editingStaff.id, data });
    } else {
      data.password = formPassword;
      createStaff.mutate(data);
    }
  };

  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return toast({ title: "GPS qo'llab-quvvatlanmaydi. Qo'lda kiriting yoki Google Maps dan nusxalang.", variant: "destructive" });
    }
    setGettingLocation(true);
    const timeoutId = setTimeout(() => {
      setGettingLocation(false);
      toast({ 
        title: "GPS javob bermadi. Quyidagi usullardan foydalaning: 1) Google Maps dan lat/lng nusxalang, 2) Telegram dan joylashuv yuboring", 
        variant: "destructive" 
      });
    }, 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        setFormLocationLat(String(pos.coords.latitude));
        setFormLocationLng(String(pos.coords.longitude));
        setGettingLocation(false);
        toast({ title: `Joylashuv aniqlandi: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` });
      },
      () => {
        clearTimeout(timeoutId);
        setGettingLocation(false);
        toast({ 
          title: "GPS ishlamadi. Qo'lda kiriting: Google Maps da joyni bosib lat/lng ni nusxalang.", 
          variant: "destructive" 
        });
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
    );
  };

  const startCamera = async () => {
    try {
      setCapturingFace(true);
      setFaceStatus("Kamera ochilmoqda...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFaceStatus("Yuzingizni ko'rsating va rasmga oling");
    } catch {
      setFaceStatus("Kamerani ochib bo'lmadi");
      setCapturingFace(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setFormFacePhoto(dataUrl);
    setFaceStatus("Yuz aniqlanmoqda...");

    try {
      await ensureFaceModels();
      const faceapi = await import("face-api.js");
      const img = await faceapi.fetchImage(dataUrl);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (detection) {
        setFormFaceDescriptor(Array.from(detection.descriptor));
        setFaceStatus("✅ Yuz aniqlandi va saqlandi");
        stopCamera();
        setCapturingFace(false);
      } else {
        setFaceStatus("❌ Yuz topilmadi, qayta urinib ko'ring");
      }
    } catch {
      setFaceStatus("⚠️ Face model yuklanmadi, rasm saqlandi");
      stopCamera();
      setCapturingFace(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const copyAttendanceUrl = (staffToken: string) => {
    const url = `${window.location.origin}/attendance/${staffToken}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Havola nusxalandi!", description: url });
    }).catch(() => {
      toast({ title: "Nusxalashda xatolik", variant: "destructive" });
    });
  };

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return "Noma'lum";
    const s = staffList.find(st => st.id === staffId);
    return s?.name || "Noma'lum";
  };

  const attendanceByStaff = useMemo(() => {
    const map: Record<string, { checkIn: AttendanceRecord | null; checkOut: AttendanceRecord | null; records: AttendanceRecord[] }> = {};
    const sorted = [...attendanceRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const rec of sorted) {
      const sid = rec.staffId || "unknown";
      if (!map[sid]) map[sid] = { checkIn: null, checkOut: null, records: [] };
      map[sid].records.push(rec);
      if (rec.type === "check_in" && !map[sid].checkIn) map[sid].checkIn = rec;
      if (rec.type === "check_out") map[sid].checkOut = rec;
    }
    return map;
  }, [attendanceRecords]);

  const attStats = useMemo(() => {
    let totalMinutes = 0;
    let count = 0;
    for (const [, data] of Object.entries(attendanceByStaff)) {
      if (data.checkIn && data.checkOut) {
        const diff = (new Date(data.checkOut.date).getTime() - new Date(data.checkIn.date).getTime()) / 60000;
        totalMinutes += diff;
        count++;
      }
    }
    const avgMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;
    return { avgMinutes };
  }, [attendanceByStaff]);

  const total = attendanceSummary?.total || 0;
  const present = attendanceSummary?.present || 0;
  const working = attendanceSummary?.working || 0;
  const absent = attendanceSummary?.absent || 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans bg-gray-50">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold" data-testid="text-page-title">Xodimlar nazorati</h1>
          </div>
        </header>

        <div className="border-b bg-white px-4 md:px-6">
          <div className="flex gap-1 py-1">
            {[
              { key: "staff" as const, label: "Xodimlar", icon: Users },
              { key: "attendance" as const, label: "Davomat", icon: CalendarDays },
              { key: "salary" as const, label: "Oylik", icon: Timer },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  data-testid={`tab-${tab.key}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {activeTab === "staff" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card data-testid="card-kpi-total">
                  <CardContent className="p-4 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-bold" data-testid="text-kpi-total">{total}</p>
                    <p className="text-xs text-gray-500">Jami xodimlar</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-kpi-present">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
                    <p className="text-2xl font-bold text-green-600" data-testid="text-kpi-present">{present}</p>
                    <p className="text-xs text-gray-500">Bugun kelgan</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-kpi-working">
                  <CardContent className="p-4 text-center">
                    <Timer className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-kpi-working">{working}</p>
                    <p className="text-xs text-gray-500">Hozir ishda</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-kpi-absent">
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
                    <p className="text-2xl font-bold text-red-600" data-testid="text-kpi-absent">{absent}</p>
                    <p className="text-xs text-gray-500">Kelmagan</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between items-center">
                <h2 className="text-base font-semibold">Xodimlar ro'yxati</h2>
                <Button onClick={() => { closeDialog(); setStaffDialogOpen(true); }} data-testid="button-add-staff">
                  <Plus className="h-4 w-4 mr-1" /> Xodim qo'shish
                </Button>
              </div>

              {staffLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : staffList.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Hali xodim qo'shilmagan</p>
                    <p className="text-sm mt-1">Birinchi xodimingizni qo'shing</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {staffList.map(staff => {
                    const summaryStaff = attendanceSummary?.staff?.find(s => s.staffId === staff.id);
                    return (
                      <Card key={staff.id} className="overflow-hidden" data-testid={`card-staff-${staff.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                              {staff.facePhoto ? (
                                <img src={staff.facePhoto} alt={staff.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm truncate" data-testid={`text-staff-name-${staff.id}`}>{staff.name}</h3>
                                <Badge variant={staff.isActive ? "default" : "secondary"} className="text-[10px] shrink-0">
                                  {staff.isActive ? "Faol" : "Nofaol"}
                                </Badge>
                              </div>
                              {staff.phone && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="h-3 w-3" /> {staff.phone}
                                </p>
                              )}
                              {staff.locationName && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" /> {staff.locationName}
                                </p>
                              )}
                              {summaryStaff && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  {summaryStaff.checkIn && (
                                    <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                      Keldi {formatTime(summaryStaff.checkIn)}
                                    </span>
                                  )}
                                  {summaryStaff.checkOut && (
                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                      Ketdi {formatTime(summaryStaff.checkOut)}
                                    </span>
                                  )}
                                  {summaryStaff.isPresent && !summaryStaff.checkOut && (
                                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Ishda</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs flex-1"
                              onClick={() => copyAttendanceUrl(staff.token)}
                              data-testid={`button-copy-url-${staff.id}`}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Havola
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openEditDialog(staff)}
                              data-testid={`button-edit-staff-${staff.id}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-500 hover:text-red-700"
                              onClick={() => setDeleteConfirmId(staff.id)}
                              data-testid={`button-delete-staff-${staff.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-bold" data-testid="text-avg-hours">{formatMinutes(attStats.avgMinutes)}</p>
                    <p className="text-xs text-gray-500">O'rtacha ishlash</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
                    <p className="text-lg font-bold text-green-600" data-testid="text-att-present">{present}</p>
                    <p className="text-xs text-gray-500">Bugun kelgan</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-bold text-amber-600" data-testid="text-att-records">{attendanceRecords.length}</p>
                    <p className="text-xs text-gray-500">Jami yozuvlar</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(["today", "week", "month"] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setAttDateFilter(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          attDateFilter === p ? "bg-white shadow text-primary" : "text-gray-500 hover:text-gray-700"
                        }`}
                        data-testid={`button-att-period-${p}`}
                      >
                        {p === "today" ? "Bugun" : p === "week" ? "Hafta" : "Oy"}
                      </button>
                    ))}
                  </div>
                </div>
                <Select value={attStaffFilter} onValueChange={setAttStaffFilter}>
                  <SelectTrigger className="w-48 h-8 text-xs" data-testid="select-att-staff">
                    <SelectValue placeholder="Xodim tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha xodimlar</SelectItem>
                    {staffList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {attendanceRecords.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Davomat yozuvlari topilmadi</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-attendance">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-600">Xodim</th>
                        <th className="text-left p-3 font-medium text-gray-600">Sana</th>
                        <th className="text-left p-3 font-medium text-gray-600">Turi</th>
                        <th className="text-left p-3 font-medium text-gray-600">Vaqt</th>
                        <th className="text-center p-3 font-medium text-gray-600">Yuz</th>
                        <th className="text-center p-3 font-medium text-gray-600">Lokatsiya</th>
                        <th className="text-left p-3 font-medium text-gray-600">Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map(rec => (
                        <tr key={rec.id} className="border-b hover:bg-gray-50" data-testid={`row-attendance-${rec.id}`}>
                          <td className="p-3 font-medium">{getStaffName(rec.staffId)}</td>
                          <td className="p-3 text-gray-500">{formatDate(rec.date)}</td>
                          <td className="p-3">
                            <Badge variant={rec.type === "check_in" ? "default" : "secondary"} className="text-[10px]">
                              {rec.type === "check_in" ? "Kelish" : "Ketish"}
                            </Badge>
                          </td>
                          <td className="p-3">{formatTime(rec.date)}</td>
                          <td className="p-3 text-center">
                            {rec.faceVerified ? (
                              <span className="text-green-600 text-xs" title={`${rec.faceScore}%`}>✅ {rec.faceScore}%</span>
                            ) : (
                              <span className="text-red-500 text-xs">❌</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {rec.locationVerified ? (
                              <span className="text-green-600 text-xs" title={`${rec.locationDistance}m`}>✅ {rec.locationDistance}m</span>
                            ) : (
                              <span className="text-red-500 text-xs" title={`${rec.locationDistance}m`}>❌ {rec.locationDistance}m</span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate">{rec.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "salary" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-bold" data-testid="text-salary-staff-count">{salaryData?.staff?.length || 0}</p>
                    <p className="text-xs text-gray-500">Xodimlar</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-green-500" />
                    <p className="text-2xl font-bold text-green-600" data-testid="text-salary-total-hours">
                      {salaryData?.staff?.reduce((s, x) => s + x.totalHours, 0).toFixed(1) || "0"}
                    </p>
                    <p className="text-xs text-gray-500">Jami soatlar</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Timer className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-2xl font-bold text-purple-600" data-testid="text-salary-grand-total">
                      {(salaryData?.grandTotal || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Jami oylik (so'm)</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {([
                    { key: "daily" as const, label: "Bugun" },
                    { key: "weekly" as const, label: "Hafta" },
                    { key: "monthly" as const, label: "Oy" },
                  ]).map(p => (
                    <button
                      key={p.key}
                      onClick={() => setSalaryPeriod(p.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        salaryPeriod === p.key ? "bg-white shadow text-primary" : "text-gray-500 hover:text-gray-700"
                      }`}
                      data-testid={`button-salary-period-${p.key}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <Select value={salaryStaffFilter} onValueChange={setSalaryStaffFilter}>
                  <SelectTrigger className="w-48 h-8 text-xs" data-testid="select-salary-staff">
                    <SelectValue placeholder="Xodim tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha xodimlar</SelectItem>
                    {staffList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {salaryLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : !salaryData?.staff?.length ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <Timer className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Ma'lumot topilmadi</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {salaryData.staff.map(s => (
                    <Card key={s.staffId} data-testid={`card-salary-${s.staffId}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-base">{s.name}</h3>
                            <p className="text-xs text-gray-500">{s.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600" data-testid={`text-earned-${s.staffId}`}>
                              {s.totalEarned.toLocaleString()} so'm
                            </p>
                            <p className="text-xs text-gray-500">{s.hourlyRate.toLocaleString()} so'm/soat</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-sm font-bold text-blue-700">{s.daysWorked}</p>
                            <p className="text-[10px] text-blue-600">Kun ishlagan</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-sm font-bold text-green-700">{s.totalHours.toFixed(1)}</p>
                            <p className="text-[10px] text-green-600">Jami soat</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-2">
                            <p className="text-sm font-bold text-purple-700">
                              {s.daysWorked > 0 ? (s.totalHours / s.daysWorked).toFixed(1) : "0"}
                            </p>
                            <p className="text-[10px] text-purple-600">O'rtacha soat/kun</p>
                          </div>
                        </div>
                        {s.days.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-gray-50">
                                  <th className="text-left p-2 font-medium">Sana</th>
                                  <th className="text-left p-2 font-medium">Kelish</th>
                                  <th className="text-left p-2 font-medium">Ketish</th>
                                  <th className="text-right p-2 font-medium">Soat</th>
                                  <th className="text-right p-2 font-medium">Hisob</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.days.map(d => (
                                  <tr key={d.date} className="border-b">
                                    <td className="p-2">{new Date(d.date).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" })}</td>
                                    <td className="p-2 text-green-600">{d.checkIn ? new Date(d.checkIn).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                                    <td className="p-2 text-red-600">{d.checkOut ? new Date(d.checkOut).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                                    <td className="p-2 text-right font-medium">{d.hours.toFixed(1)}</td>
                                    <td className="p-2 text-right font-medium text-green-600">{d.earned.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-gray-50 font-semibold">
                                  <td className="p-2" colSpan={3}>Jami</td>
                                  <td className="p-2 text-right">{s.totalHours.toFixed(1)}</td>
                                  <td className="p-2 text-right text-green-600">{s.totalEarned.toLocaleString()}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={staffDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ism *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="To'liq ism" data-testid="input-staff-name" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+998 90 123 45 67" data-testid="input-staff-phone" />
            </div>
            <div>
              <Label>Login *</Label>
              <Input value={formUsername} onChange={e => setFormUsername(e.target.value)} placeholder="username" data-testid="input-staff-username" />
            </div>
            <div>
              <Label>{editingStaff ? "Yangi parol (bo'sh qolsa o'zgarmaydi)" : "Parol *"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="******"
                  data-testid="input-staff-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Soatlik ish haqi (so'm)</Label>
              <Input type="number" value={formHourlyRate} onChange={e => setFormHourlyRate(e.target.value)} placeholder="15000" data-testid="input-staff-hourly-rate" />
              <p className="text-xs text-gray-500 mt-1">Masalan: 15000 so'm/soat</p>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Camera className="h-4 w-4" /> Yuz rasmi (Face ID)
              </div>
              {formFacePhoto && !capturingFace && (
                <div className="flex items-center gap-3">
                  <img src={formFacePhoto} alt="Face" className="w-16 h-16 rounded-lg object-cover" />
                  <div>
                    <p className="text-xs text-green-600">{formFaceDescriptor ? "Yuz descriptor saqlangan" : "Rasm saqlangan"}</p>
                    <Button size="sm" variant="outline" className="mt-1 h-6 text-xs" onClick={startCamera}>
                      Qayta olish
                    </Button>
                  </div>
                </div>
              )}
              {capturingFace && (
                <div className="space-y-2">
                  <video ref={videoRef} className="w-full rounded-lg bg-black" autoPlay muted playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                  <Button size="sm" onClick={capturePhoto} className="w-full" data-testid="button-capture-face">
                    <Camera className="h-4 w-4 mr-1" /> Rasmga olish
                  </Button>
                </div>
              )}
              {!formFacePhoto && !capturingFace && (
                <Button size="sm" variant="outline" onClick={startCamera} className="w-full" data-testid="button-start-camera">
                  <Camera className="h-4 w-4 mr-1" /> Kamerani ochish
                </Button>
              )}
              {faceStatus && <p className="text-xs text-center text-gray-600">{faceStatus}</p>}
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" /> Ruxsat etilgan joylashuv
              </div>
              <div>
                <Label className="text-xs">Joylashuv nomi</Label>
                <Input value={formLocationName} onChange={e => setFormLocationName(e.target.value)} placeholder="Masalan: Asosiy do'kon" data-testid="input-location-name" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Latitude</Label>
                  <Input value={formLocationLat} onChange={e => setFormLocationLat(e.target.value)} placeholder="41.2995" data-testid="input-location-lat" />
                </div>
                <div>
                  <Label className="text-xs">Longitude</Label>
                  <Input value={formLocationLng} onChange={e => setFormLocationLng(e.target.value)} placeholder="69.2401" data-testid="input-location-lng" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Radius (metrda)</Label>
                <Input type="number" value={formLocationRadius} onChange={e => setFormLocationRadius(e.target.value)} placeholder="100" data-testid="input-location-radius" />
              </div>
              <Button size="sm" variant="outline" onClick={handleGetLocation} disabled={gettingLocation} className="w-full" data-testid="button-get-location">
                {gettingLocation ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> GPS aniqlanmoqda...</>
                ) : (
                  <><MapPin className="h-4 w-4 mr-1" /> Hozirgi joylashuvni aniqlash (GPS)</>
                )}
              </Button>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-700 space-y-1">
                <p className="font-medium">GPS ishlamasa qo'lda kiriting:</p>
                <p>1. <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Google Maps</a> ni oching</p>
                <p>2. Do'kon joylashuvini bosing</p>
                <p>3. Koordinatalarni (masalan: 41.2995, 69.2401) nusxalab yuqoridagi Latitude va Longitude maydonlariga yozing</p>
              </div>
              {formLocationLat && formLocationLng && (
                <p className="text-xs text-green-600 text-center font-medium">
                  ✅ Joylashuv: {parseFloat(formLocationLat).toFixed(6)}, {parseFloat(formLocationLng).toFixed(6)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDialog}>Bekor qilish</Button>
            <Button
              onClick={handleSubmit}
              disabled={createStaff.isPending || updateStaff.isPending}
              data-testid="button-save-staff"
            >
              {(createStaff.isPending || updateStaff.isPending) ? "Saqlanmoqda..." : editingStaff ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xodimni o'chirish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Bu xodimni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteStaff.mutate(deleteConfirmId)}
              disabled={deleteStaff.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteStaff.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
