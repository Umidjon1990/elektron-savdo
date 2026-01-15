import { useState } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings-context";
import { Store, Bell, Printer, Database, Shield, Palette, Receipt } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
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
                      value={settings.storeName} 
                      onChange={(e) => updateSettings({ storeName: e.target.value })}
                      data-testid="input-store-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Telefon raqam</Label>
                    <Input 
                      id="storePhone" 
                      value={settings.storePhone} 
                      onChange={(e) => updateSettings({ storePhone: e.target.value })}
                      data-testid="input-store-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Manzil</Label>
                  <Input 
                    id="storeAddress" 
                    value={settings.storeAddress} 
                    onChange={(e) => updateSettings({ storeAddress: e.target.value })}
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
                    checked={settings.notifications} 
                    onCheckedChange={(checked) => updateSettings({ notifications: checked })}
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
                    checked={settings.soundEnabled} 
                    onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
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
                    checked={settings.autoPrint} 
                    onCheckedChange={(checked) => updateSettings({ autoPrint: checked })}
                    data-testid="switch-auto-print"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Chek ma'lumotlari
                </CardTitle>
                <CardDescription>Chekda ko'rinadigan ma'lumotlar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="receiptStoreName">Do'kon nomi</Label>
                    <Input 
                      id="receiptStoreName" 
                      value={settings.storeName} 
                      onChange={(e) => updateSettings({ storeName: e.target.value })}
                      data-testid="input-receipt-store-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receiptPhone">Telefon</Label>
                    <Input 
                      id="receiptPhone" 
                      value={settings.storePhone} 
                      onChange={(e) => updateSettings({ storePhone: e.target.value })}
                      data-testid="input-receipt-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptAddress">Manzil</Label>
                  <Input 
                    id="receiptAddress" 
                    value={settings.storeAddress} 
                    onChange={(e) => updateSettings({ storeAddress: e.target.value })}
                    data-testid="input-receipt-address"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telegramUsername">Telegram username</Label>
                    <Input 
                      id="telegramUsername" 
                      value={settings.telegramUsername} 
                      onChange={(e) => updateSettings({ telegramUsername: e.target.value })}
                      placeholder="ixlosbooksuz"
                      data-testid="input-telegram-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receiptFooter">Chek pastki yozuvi</Label>
                    <Input 
                      id="receiptFooter" 
                      value={settings.receiptFooter} 
                      onChange={(e) => updateSettings({ receiptFooter: e.target.value })}
                      placeholder="Xaridingiz uchun rahmat!"
                      data-testid="input-receipt-footer"
                    />
                  </div>
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
