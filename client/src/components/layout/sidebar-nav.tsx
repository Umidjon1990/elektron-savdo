import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, History, Settings, LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Kassa" },
  { href: "/inventory", icon: Package, label: "Ombor" },
  { href: "/history", icon: History, label: "Tarix" },
  { href: "/settings", icon: Settings, label: "Sozlamalar" },
];

export function SidebarNav() {
  const [location] = useLocation();

  return (
    <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-8 h-screen sticky top-0 left-0 z-40 text-white shadow-2xl">
      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 text-white">
        <Store className="h-6 w-6" />
      </div>

      <nav className="flex-1 flex flex-col gap-4 w-full px-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl transition-all gap-1 group",
              location === item.href 
                ? "bg-white/10 text-white" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}>
              <item.icon className={cn("h-6 w-6", location === item.href && "text-primary")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          </Link>
        ))}
      </nav>

      <div className="px-2 w-full">
        <Button variant="ghost" size="icon" className="w-full h-12 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
