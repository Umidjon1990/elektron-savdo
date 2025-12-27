import { useState } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Store, Bell, Printer, Database, Shield, Palette } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [storeName, setStoreName] = useState("Kitoblar Olami");
  const [storePhone, setStorePhone] = useState("+998 90 123 45 67");
  const [storeAddress, setStoreAddress] = useState("Toshkent sh., Chilonzor tumani");
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrint, setAutoPrint] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleSave = () => {
    toast({
      title: "Saqlandi",
      description: "Sozlamalar muvaffaqiyatli saqlandi",
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />
      
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Sozlamalar</h1>
            <p className="text-slate-500">Tizim sozlamalarini boshqaring</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Do'kon ma'lumotlari
                </CardTitle>
                <CardDescription>Do'kon haqida asosiy ma'lumotlar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Do'kon nomi</Label>
                    <Input 
                      id="storeName" 
                      value={storeName} 
                      onChange={(e) => setStoreName(e.target.value)}
                      data-testid="input-store-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Telefon raqam</Label>
                    <Input 
                      id="storePhone" 
                      value={storePhone} 
                      onChange={(e) => setStorePhone(e.target.value)}
                      data-testid="input-store-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Manzil</Label>
                  <Input 
                    id="storeAddress" 
                    value={storeAddress} 
                    onChange={(e) => setStoreAddress(e.target.value)}
                    data-testid="input-store-address"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Bildirishnomalar
                </CardTitle>
                <CardDescription>Bildirishnomalar sozlamalari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bildirishnomalar</Label>
                    <p className="text-sm text-slate-500">Yangi buyurtmalar haqida xabar olish</p>
                  </div>
                  <Switch 
                    checked={notifications} 
                    onCheckedChange={setNotifications}
                    data-testid="switch-notifications"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ovozli signal</Label>
                    <p className="text-sm text-slate-500">Yangi sotuv uchun ovozli signal</p>
                  </div>
                  <Switch 
                    checked={soundEnabled} 
                    onCheckedChange={setSoundEnabled}
                    data-testid="switch-sound"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Printer sozlamalari
                </CardTitle>
                <CardDescription>Chek chiqarish sozlamalari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Avtomatik chop etish</Label>
                    <p className="text-sm text-slate-500">Har bir sotuvdan keyin chekni avtomatik chop etish</p>
                  </div>
                  <Switch 
                    checked={autoPrint} 
                    onCheckedChange={setAutoPrint}
                    data-testid="switch-auto-print"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Ko'rinish
                </CardTitle>
                <CardDescription>Ilova ko'rinishi sozlamalari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tungi rejim</Label>
                    <p className="text-sm text-slate-500">Qorong'i fon rangini yoqish</p>
                  </div>
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={setDarkMode}
                    data-testid="switch-dark-mode"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Ma'lumotlar
                </CardTitle>
                <CardDescription>Ma'lumotlarni boshqarish</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" data-testid="button-export-data">
                    Ma'lumotlarni eksport qilish
                  </Button>
                  <Button variant="outline" data-testid="button-backup">
                    Zaxira nusxa yaratish
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Xavfsizlik
                </CardTitle>
                <CardDescription>Xavfsizlik sozlamalari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" data-testid="button-change-password">
                  Parolni o'zgartirish
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} size="lg" data-testid="button-save-settings">
                Saqlash
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
