import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Settings, LogOut, Store, Users, Download, MoreHorizontal, Layers, Crown, Wallet, UserCheck, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const SIDEBAR_PREF_KEY = "esavdo-sidebar-expanded";
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
  // Default to expanded so labels are clearly readable. User can collapse
  // to the original compact mode via the toggle button. Preference persists.
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(SIDEBAR_PREF_KEY);
    return stored === null ? true : stored === "true";
  });
  const { user, tenant, logout } = useAuth();

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(SIDEBAR_PREF_KEY, String(next)); } catch {}
      return next;
    });
  };

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
      {/* Desktop Sidebar — width adapts to expanded preference */}
      <div className={cn(
        "hidden md:flex bg-gradient-to-b from-slate-900 to-slate-800 flex-col py-3 gap-2 h-screen sticky top-0 left-0 z-40 text-white shadow-2xl transition-all duration-200",
        expanded ? "w-52 items-stretch px-3" : "w-20 items-center"
      )}>
        {/* Header: logo + collapse/expand toggle */}
        <div className={cn(
          "flex items-center shrink-0",
          expanded ? "justify-between gap-2" : "justify-center"
        )}>
          <div className={cn(
            "bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white shrink-0",
            expanded ? "w-11 h-11" : "w-12 h-12"
          )}>
            <Store className={expanded ? "h-5 w-5" : "h-6 w-6"} />
          </div>
          <button
            onClick={toggleExpanded}
            className={cn(
              "rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center shrink-0",
              expanded ? "w-8 h-8" : "w-7 h-7 mt-1"
            )}
            title={expanded ? "Yig'ish" : "Kengaytirish"}
            data-testid="button-toggle-sidebar"
          >
            {expanded ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </button>
        </div>

        <nav className={cn(
          "flex-1 flex flex-col gap-1 w-full overflow-y-auto overflow-x-hidden min-h-0 scrollbar-none",
          expanded ? "" : "px-2"
        )}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "rounded-xl transition-all group cursor-pointer shrink-0 flex",
              expanded
                ? "flex-row items-center gap-3 px-3 py-2.5"
                : "flex-col items-center justify-center p-2 gap-1",
              location === item.href
                ? "bg-white/15 text-white shadow-lg"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}>
              <div className={cn(
                "rounded-xl flex items-center justify-center transition-all shrink-0",
                expanded ? "w-10 h-10" : "w-10 h-10",
                location === item.href
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
                  : "group-hover:bg-white/10"
              )}>
                <item.icon className={cn(
                  expanded ? "h-5 w-5" : "h-5 w-5",
                  location === item.href ? "text-white" : ""
                )} />
              </div>
              {expanded ? (
                <span className={cn(
                  "text-sm leading-tight truncate",
                  location === item.href ? "font-semibold" : "font-medium"
                )}>{item.label}</span>
              ) : (
                <span className={cn(
                  "text-[10px] font-medium leading-tight",
                  location === item.href && "font-semibold"
                )}>{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className={cn("w-full space-y-1 shrink-0", expanded ? "" : "px-2")}>
          {user?.isSuper && (
            <Link href={superAdminHref} className={cn(
              "w-full rounded-xl border transition-all flex",
              expanded
                ? "flex-row items-center gap-3 px-3 py-2.5"
                : "flex-col items-center justify-center gap-0.5 h-12",
              location === superAdminHref
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-amber-500/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 border-amber-500/20"
            )} data-testid="link-super-admin">
              <Crown className={expanded ? "h-5 w-5 shrink-0" : "h-4 w-4"} />
              <span className={expanded ? "text-sm font-semibold" : "text-[9px] font-medium"}>Super Admin</span>
            </Link>
          )}
          {!isInstalled && (
            <Button
              variant="ghost"
              onClick={installPrompt ? handleInstall : () => {
                alert("O'rnatish uchun:\n1. Chrome/Edge brauzerida oching\n2. Manzil satrida ⋮ menyusini bosing\n3. 'Ilovani o'rnatish' ni tanlang");
              }}
              className={cn(
                "w-full rounded-xl bg-green-500/10 text-green-400 hover:text-green-300 hover:bg-green-500/20 border border-green-500/20 flex",
                expanded
                  ? "flex-row items-center justify-start gap-3 px-3 py-2.5 h-auto"
                  : "flex-col items-center justify-center gap-0.5 h-12"
              )}
              data-testid="button-install"
            >
              <Download className={expanded ? "h-5 w-5 shrink-0" : "h-4 w-4"} />
              <span className={expanded ? "text-sm font-semibold" : "text-[9px] font-medium"}>O'rnatish</span>
            </Button>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex",
              expanded
                ? "flex-row items-center justify-start gap-3 px-3 py-2.5 h-auto"
                : "flex-col items-center justify-center h-10 p-0"
            )}
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className={expanded ? "h-5 w-5 shrink-0" : "h-4 w-4"} />
            {expanded && <span className="text-sm font-medium">Chiqish</span>}
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
