import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, History, Settings, LogOut, Store, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Kassa" },
  { href: "/admin/orders", icon: ShoppingCart, label: "Buyurtmalar" },
  { href: "/admin/inventory", icon: Package, label: "Ombor" },
  { href: "/admin/customers", icon: Users, label: "Mijozlar" },
  { href: "/admin/history", icon: History, label: "Tarix" },
  { href: "/", icon: Store, label: "Do'kon" },
  { href: "/admin/settings", icon: Settings, label: "Sozlamalar" },
];

export function SidebarNav() {
  const [location] = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-20 bg-slate-900 flex-col items-center py-6 gap-8 h-screen sticky top-0 left-0 z-40 text-white shadow-2xl">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 text-white">
          <Store className="h-6 w-6" />
        </div>

        <nav className="flex-1 flex flex-col gap-4 w-full px-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl transition-all gap-1 group cursor-pointer",
              location === item.href 
                ? "bg-white/10 text-white" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}>
              <item.icon className={cn("h-6 w-6", location === item.href && "text-primary")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-2 w-full">
          <Button variant="ghost" size="icon" className="w-full h-12 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 text-white z-50 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg transition-all gap-1 flex-1",
            location === item.href 
              ? "text-primary" 
              : "text-slate-400"
          )}>
            <item.icon className={cn("h-5 w-5", location === item.href && "fill-current/20")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
