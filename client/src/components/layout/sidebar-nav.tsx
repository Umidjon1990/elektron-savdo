import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, History, Settings, LogOut, Store, ShoppingCart, Users, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Kassa", primary: true },
  { href: "/admin/orders", icon: ShoppingCart, label: "Buyurtmalar", primary: true },
  { href: "/admin/inventory", icon: Package, label: "Ombor", primary: true },
  { href: "/admin/history", icon: History, label: "Tarix", primary: true },
  { href: "/admin/customers", icon: Users, label: "Mijozlar", primary: false },
  { href: "/", icon: Store, label: "Do'kon", primary: false },
  { href: "/admin/settings", icon: Settings, label: "Sozlamalar", primary: false },
];

const primaryItems = navItems.filter(item => item.primary);
const secondaryItems = navItems.filter(item => !item.primary);

export function SidebarNav() {
  const [location] = useLocation();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  const isSecondaryActive = secondaryItems.some(item => item.href === location);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-20 bg-gradient-to-b from-slate-900 to-slate-800 flex-col items-center py-6 gap-6 h-screen sticky top-0 left-0 z-40 text-white shadow-2xl">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
          <Store className="h-7 w-7" />
        </div>

        <nav className="flex-1 flex flex-col gap-2 w-full px-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl transition-all gap-1.5 group cursor-pointer",
              location === item.href 
                ? "bg-white/15 text-white shadow-lg" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                location === item.href 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30" 
                  : "group-hover:bg-white/10"
              )}>
                <item.icon className={cn("h-5 w-5", location === item.href ? "text-white" : "")} />
              </div>
              <span className={cn("text-[10px] font-medium", location === item.href && "font-semibold")}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-2 w-full space-y-2">
          {!isInstalled && (
            <Button 
              variant="ghost" 
              onClick={installPrompt ? handleInstall : () => {
                alert("O'rnatish uchun:\n1. Chrome/Edge brauzerida oching\n2. Manzil satrida ⋮ menyusini bosing\n3. 'Ilovani o'rnatish' ni tanlang");
              }}
              className="w-full h-14 rounded-xl bg-green-500/10 text-green-400 hover:text-green-300 hover:bg-green-500/20 flex flex-col items-center justify-center gap-1 border border-green-500/20"
              data-testid="button-install"
            >
              <Download className="h-5 w-5" />
              <span className="text-[9px] font-medium">O'rnatish</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="w-full h-12 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Bottom Nav - Modern Design */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom">
        <div className="h-16 flex items-center justify-around px-1">
          {primaryItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center p-1.5 rounded-xl transition-all gap-0.5 min-w-[56px]",
              location === item.href 
                ? "text-blue-600" 
                : "text-slate-400 active:text-slate-600"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                location === item.href 
                  ? "bg-blue-50" 
                  : ""
              )}>
                <item.icon className={cn("h-5 w-5", location === item.href && "stroke-[2.5px]")} />
              </div>
              <span className={cn("text-[9px] font-medium", location === item.href && "font-semibold text-blue-600")}>{item.label}</span>
            </Link>
          ))}
          
          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex flex-col items-center justify-center p-1.5 rounded-xl transition-all gap-0.5 min-w-[56px]",
                isSecondaryActive ? "text-blue-600" : "text-slate-400"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  isSecondaryActive ? "bg-blue-50" : ""
                )}>
                  <MoreHorizontal className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-medium">Boshqa</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mb-2">
              {secondaryItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center gap-3 cursor-pointer">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              {!isInstalled && (
                <DropdownMenuItem 
                  onClick={installPrompt ? handleInstall : () => {
                    alert("O'rnatish uchun:\n1. Chrome/Edge brauzerida oching\n2. Manzil satrida ⋮ menyusini bosing\n3. 'Ilovani o'rnatish' ni tanlang");
                  }}
                  className="text-green-600 cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-3" />
                  <span>Ilovani o'rnatish</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
