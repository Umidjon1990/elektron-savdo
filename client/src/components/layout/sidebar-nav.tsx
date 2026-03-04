import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Settings, LogOut, Store, Users, Download, MoreHorizontal, Layers, Crown, Wallet, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getNavItems(slug?: string) {
  const prefix = slug ? `/store/${slug}/admin` : "/admin";
  const storeLink = slug ? `/store/${slug}` : "/";
  return [
    { href: prefix, icon: LayoutDashboard, label: "Kassa", primary: true },
    { href: `${prefix}/inventory`, icon: Package, label: "Ombor", primary: true },
    { href: `${prefix}/customers`, icon: Users, label: "Mijozlar", primary: true },
    { href: `${prefix}/finance`, icon: Wallet, label: "Moliya", primary: false },
    { href: `${prefix}/employees`, icon: UserCheck, label: "Xodimlar", primary: false },
    { href: `${prefix}/categories`, icon: Layers, label: "Kategoriyalar", primary: false },
    { href: storeLink, icon: Store, label: "Do'kon", primary: false },
    { href: `${prefix}/settings`, icon: Settings, label: "Sozlamalar", primary: false },
  ];
}

export function SidebarNav() {
  const [location] = useLocation();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { user, tenant, logout } = useAuth();

  const slug = tenant?.slug;
  const navItems = getNavItems(slug);
  const primaryItems = navItems.filter(item => item.primary);
  const secondaryItems = navItems.filter(item => !item.primary);
  const superAdminHref = slug ? `/store/${slug}/admin/super` : "/admin/super";

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
      <div className="hidden md:flex w-20 bg-gradient-to-b from-slate-900 to-slate-800 flex-col items-center py-3 gap-2 h-screen sticky top-0 left-0 z-40 text-white shadow-2xl">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white shrink-0">
          <Store className="h-6 w-6" />
        </div>

        <nav className="flex-1 flex flex-col gap-1 w-full px-2 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-none">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center p-2 rounded-xl transition-all gap-1 group cursor-pointer shrink-0",
              location === item.href 
                ? "bg-white/15 text-white shadow-lg" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}>
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                location === item.href 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30" 
                  : "group-hover:bg-white/10"
              )}>
                <item.icon className={cn("h-4.5 w-4.5", location === item.href ? "text-white" : "")} />
              </div>
              <span className={cn("text-[9px] font-medium leading-tight", location === item.href && "font-semibold")}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-2 w-full space-y-1 shrink-0">
          {user?.isSuper && (
            <Link href={superAdminHref} className={cn(
              "w-full h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all",
              location === superAdminHref
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-amber-500/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 border-amber-500/20"
            )} data-testid="link-super-admin">
              <Crown className="h-4 w-4" />
              <span className="text-[8px] font-medium">Super Admin</span>
            </Link>
          )}
          {!isInstalled && (
            <Button 
              variant="ghost" 
              onClick={installPrompt ? handleInstall : () => {
                alert("O'rnatish uchun:\n1. Chrome/Edge brauzerida oching\n2. Manzil satrida ⋮ menyusini bosing\n3. 'Ilovani o'rnatish' ni tanlang");
              }}
              className="w-full h-12 rounded-xl bg-green-500/10 text-green-400 hover:text-green-300 hover:bg-green-500/20 flex flex-col items-center justify-center gap-0.5 border border-green-500/20"
              data-testid="button-install"
            >
              <Download className="h-4 w-4" />
              <span className="text-[8px] font-medium">O'rnatish</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="w-full h-10 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10" onClick={logout}>
            <LogOut className="h-4 w-4" />
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
              {user?.isSuper && (
                <DropdownMenuItem asChild>
                  <Link href={superAdminHref} className="flex items-center gap-3 cursor-pointer text-amber-600">
                    <Crown className="h-4 w-4" />
                    <span>Super Admin</span>
                  </Link>
                </DropdownMenuItem>
              )}
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
