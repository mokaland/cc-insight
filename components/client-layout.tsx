"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, AuthGuard } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { LogOut, Home, ClipboardList, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// 完全公開ページ（認証不要・サイドバー非表示・ボトムナビ非表示）
const publicPages = ["/login", "/register", "/verify-email", "/pending-approval", "/admin/login"];

function LogoutButton() {
  const { logout, user } = useAuth();

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={logout}
      className="hidden md:flex fixed top-4 right-4 z-50 text-muted-foreground hover:text-foreground"
    >
      <LogOut className="w-4 h-4 mr-2" />
      ログアウト
    </Button>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = publicPages.some((page) => pathname.startsWith(page));

  // 公開ページは認証なしで表示
  if (isPublicPage) {
    return <>{children}</>;
  }

  // 保護されたページ（認証必須）
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* デスクトップサイドバー */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 pt-[env(safe-area-inset-top,1rem)] w-full overflow-hidden">
          <LogoutButton />
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.25,
                ease: [0.4, 0.0, 0.2, 1],
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ボトムナビゲーション（モバイルのみ） */}
        <BottomNavigation />
      </div>
    </AuthGuard>
  );
}

function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { userProfile } = useAuth();

  // メンバー専用のナビゲーション項目
  const navItems = [
    {
      label: "マイページ",
      icon: Home,
      href: "/mypage",
    },
    {
      label: "日報報告",
      icon: ClipboardList,
      href: "/report",
    },
    {
      label: "ランキング",
      icon: Trophy,
      href: "/ranking",
    },
  ];

  // 管理者の場合はボトムナビを表示しない（デスクトップUIを推奨）
  if (userProfile?.role === "admin") {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900/90 backdrop-blur-md border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.href}
              onClick={() => router.push(item.href)}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2",
                isActive ? "text-pink-500" : "text-gray-400"
              )}
            >
              <motion.div
                animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Icon
                  className={cn(
                    "w-6 h-6 transition-all",
                    isActive && "drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                  )}
                />
              </motion.div>
              <span
                className={cn(
                  "text-xs font-medium transition-all",
                  isActive && "text-pink-500 drop-shadow-[0_0_4px_rgba(236,72,153,0.6)]"
                )}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
