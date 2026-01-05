"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Briefcase, 
  LogOut, 
  Smartphone, 
  Trophy 
} from "lucide-react";

const navItems = [
  {
    title: "全体サマリー",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "副業チーム",
    subtitle: "IG / TT / YT",
    href: "/dashboard/side-job",
    icon: Briefcase,
  },
  {
    title: "退職サポートチーム",
    subtitle: "IG / TT / YT",
    href: "/dashboard/resignation",
    icon: LogOut,
  },
  {
    title: "スマホ物販チーム",
    subtitle: "X",
    href: "/dashboard/smartphone",
    icon: Smartphone,
  },
  {
    title: "ランキング",
    href: "/ranking",
    icon: Trophy,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            CC Insight
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-pink-500" : ""
                )} />
                <div>
                  <span className="block">{item.title}</span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4">
          <p className="text-xs text-muted-foreground text-center">
            © 2024 CC Insight
          </p>
        </div>
      </div>
    </aside>
  );
}
