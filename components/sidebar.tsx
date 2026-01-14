"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { GlobalSearch } from "@/components/global-search";
import {
  LayoutDashboard,
  Briefcase,
  LogOut,
  Smartphone,
  Trophy,
  User,
  Users,
  Settings,
  Shield,
  Search,
  MessageCircle,
  MessageSquare,
  Ticket,
  CheckSquare,
  Sparkles,
  ClipboardList,
  Target,
} from "lucide-react";
import { getUserGuardianProfile } from "@/lib/firestore";
import { GUARDIANS, ATTRIBUTES, EVOLUTION_STAGES, getGuardianImagePath, GuardianId } from "@/lib/guardian-collection";

// メンバー専用ナビゲーション（デスクトップ表示用）
const memberNavItems = [
  {
    title: "マイページ",
    subtitle: "あなたの冒険",
    href: "/mypage",
    icon: User,
  },
  {
    title: "日報報告",
    subtitle: "今日の活動報告",
    href: "/report",
    icon: ClipboardList,
  },
  {
    title: "運営とのDM",
    subtitle: "質問・相談",
    href: "/dm",
    icon: MessageSquare,
  },
  {
    title: "ランキング",
    subtitle: "全メンバー比較",
    href: "/ranking",
    icon: Trophy,
  },
];

// モバイルドロワー用（サブ機能のみ）
const memberMobileNavItems = [
  {
    title: "設定",
    subtitle: "プロフィール編集",
    href: "/mypage",
    icon: Settings,
  },
];

// 管理者専用ナビゲーション（v3 事業KPIダッシュボード対応）
const adminNavItems = [
  {
    title: "📈 事業ダッシュボード",
    subtitle: "全チーム俯瞰・目標承認",
    href: "/admin/ceo",
    icon: Shield,
  },
  {
    title: "📊 Active Monitor",
    subtitle: "離脱防止監視",
    href: "/admin/monitor",
    icon: Shield,
  },
  {
    title: "💼 副業チーム",
    subtitle: "ファネル・目標・入力",
    href: "/team/fukugyou",
    icon: Briefcase,
  },
  {
    title: "🚪 退職チーム",
    subtitle: "ファネル・目標・入力",
    href: "/team/taishoku",
    icon: LogOut,
  },
  {
    title: "📱 スマホ物販",
    subtitle: "ファネル・目標・入力",
    href: "/team/buppan",
    icon: Smartphone,
  },
  {
    title: "💬 DM",
    subtitle: "メンバーとやり取り",
    href: "/admin/dm",
    icon: MessageSquare,
  },
  {
    title: "👤 メンバー管理",
    subtitle: "ユーザー・SNS",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "✅ SNS承認",
    subtitle: "アカウント審査",
    href: "/admin/sns-approvals",
    icon: CheckSquare,
  },
  {
    title: "🎟️ 招待コード",
    subtitle: "発行・管理",
    href: "/admin/invitations",
    icon: Ticket,
  },
  {
    title: "⚙️ 設定",
    subtitle: "AI・システム",
    href: "/admin/prompts",
    icon: Sparkles,
  },
];


export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const [guardianInfo, setGuardianInfo] = useState<any>(null);

  // 役割に応じてナビゲーションを切り替え
  const navItems = userProfile?.role === "admin" ? adminNavItems : memberNavItems;
  const roleLabel = userProfile?.role === "admin" ? "管理者" : "メンバー";

  // ガーディアン情報取得（メンバーのみ - 新システム）
  useEffect(() => {
    if (!user || !userProfile || userProfile.role === "admin") return;

    const loadGuardianInfo = async () => {
      try {
        const profile = await getUserGuardianProfile(user.uid);
        if (!profile || !profile.activeGuardianId) return;

        const guardianId = profile.activeGuardianId as GuardianId;
        const guardian = GUARDIANS[guardianId];
        const instance = profile.guardians[guardianId];

        if (!guardian || !instance) return;

        const attr = ATTRIBUTES[guardian.attribute];
        const stage = instance.stage;
        const stageInfo = EVOLUTION_STAGES[stage];

        setGuardianInfo({
          guardianId,
          name: guardian.name,
          stage,
          stageName: stageInfo.name,
          color: attr.color,
          emoji: attr.emoji,
          energy: profile.energy.current,
        });
      } catch (error) {
        console.error("守護神情報取得エラー:", error);
      }
    };

    loadGuardianInfo();
  }, [user, userProfile]);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            CC Insight
          </h1>
        </div>

        {/* Global Search (Admin Only) */}
        {userProfile?.role === "admin" && (
          <div className="border-b border-white/10 p-3">
            <GlobalSearch />
          </div>
        )}

        {/* User Info */}
        {userProfile && (
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: userProfile.role === "admin" ? "#a855f7" : "#ec4899",
                  boxShadow: userProfile.role === "admin"
                    ? "0 0 15px rgba(168, 85, 247, 0.5)"
                    : "0 0 15px rgba(236, 72, 153, 0.5)",
                }}
              >
                {userProfile.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userProfile.displayName}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Guardian Portal Display (Members Only) */}
        {userProfile && userProfile.role !== "admin" && guardianInfo && (
          <Link href="/mypage" onClick={onNavigate} className="block border-b border-white/10 p-4 hover:bg-white/5 transition-all group">
            <div className="flex items-center gap-3 mb-3">
              {/* ポータル型守護神表示 */}
              <div className="relative w-16 h-16 flex-shrink-0">
                {/* 外側のオーラリング */}
                <div
                  className="portal-ring absolute inset-0 rounded-full"
                  style={{
                    border: `3px solid ${guardianInfo.color}`,
                    boxShadow: `0 0 20px ${guardianInfo.color}80`,
                  }}
                />

                {/* 内側のグロー */}
                <div
                  className="absolute inset-1 rounded-full opacity-30"
                  style={{
                    background: `radial-gradient(circle, ${guardianInfo.color} 0%, transparent 70%)`
                  }}
                />

                {/* 守護神画像 */}
                <div className="absolute inset-2 rounded-full overflow-hidden bg-black/50">
                  <img
                    src={getGuardianImagePath(guardianInfo.guardianId, guardianInfo.stage)}
                    alt={guardianInfo.name}
                    className="w-full h-full object-contain animate-guardian-breathe"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  {/* フォールバック絵文字 */}
                  <div className="hidden absolute inset-0 flex items-center justify-center text-2xl">
                    {guardianInfo.emoji}
                  </div>
                </div>

                {/* 王冠バッジ（最高Stageのみ） */}
                {guardianInfo.stage === 4 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-lg animate-pulse"
                    style={{
                      boxShadow: '0 0 20px rgba(250, 204, 21, 0.8)'
                    }}>
                    <span className="text-sm">👑</span>
                  </div>
                )}

                {/* エナジーメーター（弧状） */}
                <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke={guardianInfo.color}
                    strokeWidth="2"
                    strokeDasharray="220"
                    strokeDashoffset={220 - (guardianInfo.energy / 100) * 220}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                    style={{
                      filter: `drop-shadow(0 0 5px ${guardianInfo.color})`
                    }}
                  />
                </svg>
              </div>

              {/* 情報エリア */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">Stage {guardianInfo.stage}</span>
                  {guardianInfo.stage === 4 && (
                    <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent font-bold">MAX</span>
                  )}
                </div>
                <p className="text-xs font-bold truncate group-hover:text-white transition-colors" style={{ color: guardianInfo.color }}>
                  {guardianInfo.stageName}
                </p>
              </div>
            </div>

            {/* エナジーバー */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">エナジー</span>
                <span className="font-bold text-yellow-400">{guardianInfo.energy}E</span>
              </div>
              <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 liquid-progress"
                  style={{
                    width: `${Math.min((guardianInfo.energy / 100) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #FACC15, #EAB308)',
                    boxShadow: '0 0 10px rgba(250, 204, 21, 0.5)'
                  }}
                />
              </div>
            </div>
          </Link>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors flex-shrink-0",
                  isActive ? "text-pink-500" : ""
                )} />
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{item.title}</span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground truncate block">{item.subtitle}</span>
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
