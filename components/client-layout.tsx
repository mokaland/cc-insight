"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, AuthGuard } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { LogOut, Home, ClipboardList, Trophy, LayoutDashboard, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { checkDailyLoginBonus, addLoginBonusToProfile, type LoginBonusResult } from "@/lib/daily-login-bonus";
import { DailyLoginModal } from "@/components/daily-login-modal";

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
      className="hidden md:flex fixed top-20 right-8 z-50 text-muted-foreground hover:text-foreground glass-bg border border-white/10"
    >
      <LogOut className="w-4 h-4 mr-2" />
      ログアウト
    </Button>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isPublicPage = publicPages.some((page) => pathname.startsWith(page));
  
  // 🎁 デイリーログインボーナス
  const [loginBonus, setLoginBonus] = useState<LoginBonusResult | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ログインボーナスチェック（ページロード時に1回のみ）
  useEffect(() => {
    const checkBonus = async () => {
      if (!user || isPublicPage) return;
      
      try {
        const result = await checkDailyLoginBonus(user.uid);
        
        // 初回ログインの場合のみ表示
        if (result.isFirstLoginToday && result.energyEarned > 0) {
          setLoginBonus(result);
          setShowLoginModal(true);
          
          // エナジーを守護神プロフィールに追加
          await addLoginBonusToProfile(user.uid, result.energyEarned);
        }
      } catch (error) {
        console.error("ログインボーナスチェックエラー:", error);
      }
    };

    checkBonus();
  }, [user, isPublicPage]);

  // 公開ページは認証なしで表示
  if (isPublicPage) {
    return <>{children}</>;
  }

  // 保護されたページ（認証必須）
  return (
    <AuthGuard>
      <div className="flex min-h-screen cosmic-bg relative">
        {/* 星雲背景レイヤー */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="nebula-bg absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl opacity-30" 
               style={{
                 background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.2) 40%, transparent 70%)'
               }} 
          />
          <div className="nebula-bg absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
               style={{
                 background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.2) 0%, rgba(168, 85, 247, 0.15) 40%, transparent 70%)',
                 animationDelay: '5s'
               }} 
          />
        </div>

        {/* 星々パーティクル */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.3 + 0.2,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 2 + 2}s`
              }}
            />
          ))}
        </div>

        {/* デスクトップサイドバー */}
        <div className="hidden md:block relative z-10">
          <Sidebar />
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 md:ml-64 pb-[calc(5.5rem+env(safe-area-inset-bottom,1.5rem))] md:pb-8 p-4 md:p-8 pt-[env(safe-area-inset-top,1rem)] w-full z-10">
          <LogoutButton />
          {children}
        </main>

        {/* ボトムナビゲーション（モバイルのみ） */}
        <BottomNavigation />

        {/* 🎁 デイリーログインボーナスモーダル */}
        {loginBonus && (
          <DailyLoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            bonusData={loginBonus}
          />
        )}
      </div>
    </AuthGuard>
  );
}

function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { userProfile, logout } = useAuth();

  // 管理者用のナビゲーション項目
  const adminNavItems = [
    {
      label: "全体状況",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      label: "メンバー",
      icon: Users,
      href: "/admin/users",
    },
  ];

  // メンバー専用のナビゲーション項目
  const memberNavItems = [
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

  const handleLogout = () => {
    if (confirm("ログアウトしますか？")) {
      logout();
    }
  };

  // 管理者と一般メンバーで異なるナビを表示
  const navItems = userProfile?.role === "admin" ? adminNavItems : memberNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-premium border-t border-white/10 pb-[calc(0.5rem+env(safe-area-inset-bottom,1.5rem))] shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200 active:scale-95 relative z-50"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <Icon
                className={cn(
                  "w-6 h-6 transition-all",
                  isActive 
                    ? "text-pink-500" 
                    : "text-slate-300"
                )}
                style={isActive ? {
                  filter: "drop-shadow(0 0 12px rgba(236, 72, 153, 0.8)) drop-shadow(0 0 6px rgba(168, 85, 247, 0.6))"
                } : undefined}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive 
                    ? "text-pink-400" 
                    : "text-slate-400"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        
        {/* ログアウトボタン */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200 active:scale-95 text-rose-600 hover:text-rose-700 relative z-50"
          style={{ touchAction: "manipulation" }}
        >
          <LogOut className="w-6 h-6" />
          <span className="text-xs font-medium">
            ログアウト
          </span>
        </button>
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
