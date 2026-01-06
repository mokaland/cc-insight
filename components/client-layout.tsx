"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, AuthGuard } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { LogOut, Menu, X, Home, ClipboardList, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 公開ページ（サイドバー非表示）
const publicPages = ["/login", "/report", "/register", "/verify-email", "/pending-approval", "/admin/login"];

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 公開ページ（ログイン、レポート）はサイドバーなし
  if (isPublicPage) {
    return <>{children}</>;
  }

  // 保護されたページはサイドバー付き + 認証ガード
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* モバイルヘッダー */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              CC Insight
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>

        {/* デスクトップサイドバー */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* モバイルドロワー */}
        {mobileMenuOpen && (
          <>
            {/* オーバーレイ */}
            <div
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* ドロワー */}
            <div className="md:hidden fixed top-0 left-0 bottom-0 w-64 z-50 animate-in slide-in-from-left duration-300">
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </>
        )}

        {/* メインコンテンツ */}
        <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-20 md:pb-8 p-4 md:p-8 w-full">
          <LogoutButton />
          {children}
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
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200",
                "active:scale-95",
                isActive ? "text-pink-500" : "text-gray-400"
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6 transition-all",
                  isActive && "drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all",
                  isActive && "text-pink-500 drop-shadow-[0_0_4px_rgba(236,72,153,0.6)]"
                )}
              >
                {item.label}
              </span>
            </button>
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
