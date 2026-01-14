"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, AuthGuard } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import {
  LogOut, Home, ClipboardList, Trophy, LayoutDashboard, Users, Ticket,
  Menu, X, Shield, Search, MessageSquare, Briefcase, Smartphone, CheckSquare
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { checkDailyLoginBonus, addLoginBonusToProfile, type LoginBonusResult } from "@/lib/daily-login-bonus";
import { DailyLoginModal } from "@/components/daily-login-modal";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeToUnreadCount } from "@/lib/services/dm";
import { PageTransition } from "@/components/page-transition";
import { BGMProvider } from "@/components/bgm-provider";
import { SEProvider } from "@/components/se-provider";

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

  // 🔧 PWAキャッシュ問題対策: バージョンベースの強制リロード
  // このバージョン番号を変更するたびに、PWAは強制的にリフレッシュされる
  const APP_VERSION = "2026-01-15-v10"; // 変更のたびにインクリメント

  useEffect(() => {
    const storedVersion = localStorage.getItem('cc_app_version');

    // バージョンが異なる場合、キャッシュクリア＋強制リロード
    if (storedVersion !== APP_VERSION) {
      console.log(`[PWA] Version mismatch: ${storedVersion} -> ${APP_VERSION}`);

      // Service Workerを解除
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
            console.log('[PWA] Service Worker unregistered:', registration.scope);
          });
        });
      }

      // キャッシュAPIをクリア
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.delete(cacheName);
            console.log('[PWA] Cache deleted:', cacheName);
          });
        });
      }

      // バージョンを保存
      localStorage.setItem('cc_app_version', APP_VERSION);

      // 少し待ってからハードリロード（キャッシュクリアが完了するのを待つ）
      setTimeout(() => {
        console.log('[PWA] Forcing hard reload...');
        window.location.reload();
      }, 500);
    }
  }, []); // マウント時に1回だけ実行

  // 🎁 デイリーログインボーナス
  const [loginBonus, setLoginBonus] = useState<LoginBonusResult | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ログインボーナスチェック（ページロード時に1回のみ）
  useEffect(() => {
    let isMounted = true; // 🔧 メモリリーク防止: マウント状態を追跡

    const checkBonus = async () => {
      if (!user || isPublicPage) return;

      try {
        // 守護神を持っているか確認（新規会員はログインボーナスをスキップ）
        const { getUserGuardianProfile } = await import("@/lib/firestore");
        const guardianProfile = await getUserGuardianProfile(user.uid);

        if (!isMounted) return;

        // 守護神を1体も持っていない場合はログインボーナスをスキップ
        const hasAnyGuardian = guardianProfile &&
          Object.values(guardianProfile.guardians).some(g => g?.unlocked);
        if (!hasAnyGuardian) return;

        // 新規登録から24時間以内はログインボーナスをスキップ（オンボーディング中にボーナスが表示されるのを防ぐ）
        if (guardianProfile.registeredAt) {
          const registeredDate = guardianProfile.registeredAt.toDate();
          const hoursElapsed = (Date.now() - registeredDate.getTime()) / (1000 * 60 * 60);
          if (hoursElapsed < 24) return;
        }

        const result = await checkDailyLoginBonus(user.uid);

        // 🔧 マウント解除後のState更新を防止
        if (!isMounted) return;

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

    // 🔧 クリーンアップ: マウント解除時にフラグをfalseに
    return () => {
      isMounted = false;
    };
  }, [user, isPublicPage]);

  // 公開ページは認証なしで表示
  if (isPublicPage) {
    return <>{children}</>;
  }

  // フルスクリーンページ（認証必須だが独自レイアウト）
  // DMページはLINE風UIで独自にレイアウトを管理するため、cosmic-bg等をスキップ
  const isFullScreenPage = pathname === "/dm";

  if (isFullScreenPage) {
    return (
      <AuthGuard>
        {children}
      </AuthGuard>
    );
  }

  // 保護されたページ（認証必須・通常レイアウト）
  return (
    <AuthGuard>
      {/* PWA対応: セーフエリア外まで背景を拡張 */}
      <div
        className="fixed inset-0 cosmic-bg"
        style={{
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        }}
      />
      <div className="flex min-h-dvh relative overflow-hidden">
        {/* 星雲背景レイヤー - containで効果を分離 & overflow防止 */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            contain: 'strict',
            maxWidth: '100vw',
            clipPath: 'inset(0)',
          }}
        >
          <div className="nebula-bg absolute top-0 left-1/4 w-[min(400px,80vw)] h-[min(400px,80vw)] rounded-full blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.2) 40%, transparent 70%)'
            }}
          />
          <div className="nebula-bg absolute bottom-0 right-1/4 w-[min(350px,70vw)] h-[min(350px,70vw)] rounded-full blur-3xl opacity-20"
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

        {/* メインコンテンツ - ページトランジション付き */}
        <main
          className="flex-1 md:ml-64 pb-[var(--bottom-nav-height)] md:pb-8 p-4 md:p-8 pt-10 w-full z-10"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            paddingBottom: 'calc(5.5rem + max(env(safe-area-inset-bottom, 0px), 20px))'
          }}
        >
          <LogoutButton />
          <AnimatePresence mode="wait">
            <PageTransition>
              {children}
            </PageTransition>
          </AnimatePresence>
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 管理者用：ボトムナビに表示する主要項目（3つ + メニューボタン）
  const adminBottomNavItems = [
    {
      label: "モニター",
      icon: Shield,
      href: "/admin/monitor",
    },
    {
      label: "メンバー",
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "ランキング",
      icon: Trophy,
      href: "/ranking",
    },
  ];

  // 管理者用：ドロワーに表示する全メニュー（整理後）
  const adminDrawerItems = [
    {
      label: "📊 ダッシュボード",
      subtitle: "監視・監査",
      icon: Shield,
      href: "/admin/monitor",
    },
    {
      label: "👥 チーム",
      subtitle: "副業・退職・スマホ",
      icon: Briefcase,
      href: "/dashboard?team=fukugyou",
    },
    {
      label: "💬 DM",
      subtitle: "メンバーとやり取り",
      icon: MessageSquare,
      href: "/admin/dm",
    },
    {
      label: "🏆 ランキング",
      subtitle: "全チーム比較",
      icon: Trophy,
      href: "/ranking",
    },
    {
      label: "👤 メンバー管理",
      subtitle: "ユーザー・SNS",
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "🎟️ 招待コード",
      subtitle: "発行・管理",
      icon: Ticket,
      href: "/admin/invitations",
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
      label: "DM",
      icon: MessageSquare,
      href: "/dm",
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

  const handleNavigate = (href: string) => {
    router.push(href);
    setIsDrawerOpen(false);
  };

  const isAdmin = userProfile?.role === "admin";
  const bottomNavItems = isAdmin ? adminBottomNavItems : memberNavItems;

  // 未読DM数を取得
  const [unreadDmCount, setUnreadDmCount] = useState(0);

  useEffect(() => {
    if (!userProfile?.uid) {
      setUnreadDmCount(0);
      return;
    }

    console.log('📊 [DM Badge] リアルタイムリスナー開始:', userProfile.uid);

    // サービス層を使用して未読数を監視
    const unsubscribe = subscribeToUnreadCount(userProfile.uid, (count) => {
      console.log(`📊 [DM Badge] 未読メッセージ数: ${count}`);
      setUnreadDmCount(count);
    });

    return () => {
      console.log('📊 [DM Badge] リスナー停止');
      unsubscribe();
    };
  }, [userProfile?.uid]);

  return (
    <>
      {/* 管理者用ドロワーメニュー */}
      <AnimatePresence>
        {isDrawerOpen && isAdmin && (
          <>
            {/* オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="md:hidden fixed inset-0 bg-black/80 z-[60]"
            />
            {/* ドロワー本体 */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed right-0 top-0 bottom-0 w-72 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-[70] overflow-y-auto"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  管理メニュー
                </h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* メニュー項目 */}
              <nav className="p-2 space-y-1">
                {adminDrawerItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigate(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                        isActive
                          ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30"
                          : "hover:bg-white/10"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-pink-400" : "text-slate-400")} />
                      <div className="flex-1 min-w-0">
                        <span className={cn("block font-medium", isActive ? "text-white" : "text-slate-200")}>
                          {item.label}
                        </span>
                        {item.subtitle && (
                          <span className="block text-xs text-slate-500">{item.subtitle}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* ログアウト */}
              <div className="p-4 border-t border-white/10 mt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">ログアウト</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ボトムナビゲーション - コンパクト */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-premium border-t border-white/10" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
        <div className="flex items-center justify-around h-12">
          {/* 管理者用メニューボタン */}
          {isAdmin && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex flex-col items-center justify-center p-2 transition-all active:scale-95"
            >
              <Menu className="w-5 h-5 text-slate-400" />
            </button>
          )}

          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            const isDm = item.href === "/dm";
            const Icon = item.icon;

            return (
              <motion.button
                key={item.href}
                onClick={() => router.push(item.href)}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="flex flex-col items-center justify-center p-2 transition-colors relative group"
                style={{ touchAction: "manipulation" }}
              >
                <motion.div
                  className="relative"
                  animate={isActive ? { y: -2 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive
                        ? "text-pink-500"
                        : "text-slate-400"
                    )}
                  />
                  {/* 未読バッジ（DMのみ） */}
                  {isDm && unreadDmCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-black"
                    >
                      {unreadDmCount > 9 ? '9+' : unreadDmCount}
                    </motion.span>
                  )}
                </motion.div>
                {/* ラベル - 常時表示 */}
                <span
                  className={cn(
                    "text-[10px] font-medium mt-0.5 transition-colors",
                    isActive ? "text-pink-400" : "text-slate-400"
                  )}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}

          {/* 管理者：メニューボタン / メンバー：ログアウトボタン */}
          {isAdmin ? (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200 active:scale-95 text-purple-400 hover:text-purple-300 relative z-50"
              style={{ touchAction: "manipulation" }}
            >
              <Menu className="w-6 h-6" />
              <span className="text-xs font-medium">メニュー</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200 active:scale-95 text-rose-600 hover:text-rose-700 relative z-50"
              style={{ touchAction: "manipulation" }}
            >
              <LogOut className="w-6 h-6" />
              <span className="text-xs font-medium">ログアウト</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BGMProvider>
        <SEProvider>
          <LayoutContent>{children}</LayoutContent>
        </SEProvider>
      </BGMProvider>
    </AuthProvider>
  );
}
