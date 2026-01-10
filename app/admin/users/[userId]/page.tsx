"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { User, teams, Report, getUserStats, getUserGuardianProfile } from "@/lib/firestore";
import { getDoc, doc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Eye,
  FileText,
  Flame,
  Target,
  Trophy,
  Shield,
  Mail,
  Zap,
  Heart,
  MessageCircle
} from "lucide-react";
import { ContentLoader } from "@/components/ui/loading-spinner";
import { GUARDIANS, ATTRIBUTES, getGuardianImagePath, GuardianId, EVOLUTION_STAGES } from "@/lib/guardian-collection";
import { getBadgeRarityColor, BADGES } from "@/lib/gamification";

interface PeriodStats {
  period: string;
  views: number;
  posts: number;
  date: string;
  likes?: number;
  replies?: number;
  activity?: number;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<PeriodStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<PeriodStats[]>([]);
  const [quarterlyStats, setQuarterlyStats] = useState<PeriodStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<any[]>([]);
  const [guardianData, setGuardianData] = useState<any>(null);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);

      // ユーザー情報を取得
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setUser({ uid: userDoc.id, ...userDoc.data() } as User);
        setBadges(userDoc.data().badges || []);
      }

      // 🔧 守護神データを取得
      try {
        const guardianProfile = await getUserGuardianProfile(userId);
        if (guardianProfile && guardianProfile.activeGuardianId) {
          const activeId = guardianProfile.activeGuardianId as GuardianId;
          const instance = guardianProfile.guardians[activeId];
          
          if (instance) {
            const guardian = GUARDIANS[activeId];
            const attr = ATTRIBUTES[guardian.attribute];
            const stage = EVOLUTION_STAGES[instance.stage];
            
            setGuardianData({
              name: guardian.name,
              stageName: stage.name,
              stage: instance.stage,
              color: attr.color,
              emoji: attr.emoji,
              imagePath: getGuardianImagePath(activeId, instance.stage),
              level: instance.stage + 1
            });
          }
        }
      } catch (error) {
        console.error("守護神データ取得エラー:", error);
      }

      // レポートを取得
      const q = query(
        collection(db, "reports"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(q);
      const reportsData: Report[] = [];
      snapshot.forEach((doc) => {
        reportsData.push({ id: doc.id, ...doc.data() } as Report);
      });
      setReports(reportsData);

      // 統計を計算
      calculateStats(reportsData);
    } catch (error) {
      console.error("データ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId, loadUserData]);

  const calculateStats = (reports: Report[]) => {
    // チームタイプを判定
    const userTeam = teams.find(t => t.id === user?.team);
    const isX = userTeam?.type === "x";

    // 週別統計（過去8週）
    const weekly: PeriodStats[] = [];
    for (let i = 0; i < 8; i++) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 7);

      const weekReports = reports.filter(r => {
        const date = r.createdAt?.toDate?.() || new Date(r.date);
        return date >= weekStart && date < weekEnd;
      });

      const likes = weekReports.reduce((sum, r) => sum + (r.likeCount || 0), 0);
      const replies = weekReports.reduce((sum, r) => sum + (r.replyCount || 0), 0);

      weekly.unshift({
        period: `${i + 1}週前`,
        views: weekReports.reduce((sum, r) => sum + (r.igViews || 0), 0),
        posts: weekReports.length,
        date: weekStart.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
        likes,
        replies,
        activity: likes + replies,
      });
    }
    setWeeklyStats(weekly);

    // 月別統計（過去6ヶ月）
    const monthly: PeriodStats[] = [];
    for (let i = 0; i < 6; i++) {
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() - i);
      monthEnd.setDate(1);
      const monthStart = new Date(monthEnd);
      monthStart.setMonth(monthEnd.getMonth() - 1);

      const monthReports = reports.filter(r => {
        const date = r.createdAt?.toDate?.() || new Date(r.date);
        return date >= monthStart && date < monthEnd;
      });

      const likes = monthReports.reduce((sum, r) => sum + (r.likeCount || 0), 0);
      const replies = monthReports.reduce((sum, r) => sum + (r.replyCount || 0), 0);

      monthly.unshift({
        period: `${i + 1}ヶ月前`,
        views: monthReports.reduce((sum, r) => sum + (r.igViews || 0), 0),
        posts: monthReports.length,
        date: monthStart.toLocaleDateString("ja-JP", { year: "numeric", month: "short" }),
        likes,
        replies,
        activity: likes + replies,
      });
    }
    setMonthlyStats(monthly);

    // クォーター別統計（過去4四半期）
    const quarterly: PeriodStats[] = [];
    for (let i = 0; i < 4; i++) {
      const quarterEnd = new Date();
      const currentQuarter = Math.floor(quarterEnd.getMonth() / 3);
      const targetQuarter = currentQuarter - i;

      const qStart = new Date(quarterEnd.getFullYear(), targetQuarter * 3, 1);
      const qEnd = new Date(quarterEnd.getFullYear(), (targetQuarter + 1) * 3, 1);

      const quarterReports = reports.filter(r => {
        const date = r.createdAt?.toDate?.() || new Date(r.date);
        return date >= qStart && date < qEnd;
      });

      const likes = quarterReports.reduce((sum, r) => sum + (r.likeCount || 0), 0);
      const replies = quarterReports.reduce((sum, r) => sum + (r.replyCount || 0), 0);

      quarterly.unshift({
        period: `Q${(targetQuarter % 4) + 1}`,
        views: quarterReports.reduce((sum, r) => sum + (r.igViews || 0), 0),
        posts: quarterReports.length,
        date: `${qStart.getFullYear()}`,
        likes,
        replies,
        activity: likes + replies,
      });
    }
    setQuarterlyStats(quarterly);
  };

  if (loading) {
    return <ContentLoader text="ユーザー情報を読み込み中..." />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">ユーザーが見つかりません</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
      </div>
    );
  }

  const team = teams.find(t => t.id === user.team);
  const isXTeam = team?.type === "x";

  // チームタイプに応じた合計値
  const totalViews = isXTeam
    ? 0
    : reports.reduce((sum, r) => sum + (r.igViews || 0), 0);
  const totalLikes = isXTeam
    ? reports.reduce((sum, r) => sum + (r.likeCount || 0), 0)
    : 0;
  const totalReplies = isXTeam
    ? reports.reduce((sum, r) => sum + (r.replyCount || 0), 0)
    : 0;
  const totalActivity = totalLikes + totalReplies;

  const totalReports = reports.length;
  const maxViews = Math.max(...weeklyStats.map(s => s.views), 1);

  // 🔧 守護神データまたはフォールバック
  const displayLevel = guardianData || {
    name: "未召喚",
    stageName: "守護神なし",
    emoji: "🥚",
    color: "#94a3b8",
    level: 0
  };

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="border-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 bg-clip-text text-transparent">
            {user.displayName} の詳細分析
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {user.email}
            </span>
            {user.role === "admin" && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center gap-1">
                <Shield className="w-3 h-3" />
                管理者
              </span>
            )}
            {team && (
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: `${team.color}20`,
                  color: team.color,
                }}
              >
                {team.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard
          glowColor={displayLevel.color}
          title="守護神"
          icon={
            guardianData?.imagePath ? (
              <img src={guardianData.imagePath} alt={guardianData.name} className="w-10 h-10 object-cover rounded-full" />
            ) : (
              <div className="text-2xl">{displayLevel.emoji}</div>
            )
          }
          value={displayLevel.stageName}
          subtitle={guardianData ? guardianData.name : "未召喚"}
        >
          <div></div>
        </GlassCard>
        {isXTeam ? (
          <GlassCard
            glowColor="#eab308"
            title="総活動量"
            icon={<Zap className="h-5 w-5" />}
            value={totalActivity.toLocaleString()}
            subtitle={`いいね ${totalLikes} / リプライ ${totalReplies}`}
          >
            <div></div>
          </GlassCard>
        ) : (
          <GlassCard
            glowColor="#ec4899"
            title="累計再生数"
            icon={<Eye className="h-5 w-5" />}
            value={totalViews.toLocaleString()}
            subtitle="総再生"
          >
            <div></div>
          </GlassCard>
        )}
        <GlassCard
          glowColor="#06b6d4"
          title="総報告数"
          icon={<FileText className="h-5 w-5" />}
          value={totalReports.toString()}
          subtitle="レポート"
        >
          <div></div>
        </GlassCard>
        <GlassCard
          glowColor="#f59e0b"
          title="獲得バッジ"
          icon={<Trophy className="h-5 w-5" />}
          value={badges.length.toString()}
          subtitle="個"
        >
          <div></div>
        </GlassCard>
      </div>

      {/* 週別推移グラフ */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className={`h-5 w-5 ${isXTeam ? 'text-yellow-500' : 'text-pink-500'}`} />
            週別推移（過去8週）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weeklyStats.map((stat, index) => {
              const maxValue = isXTeam
                ? Math.max(...weeklyStats.map(s => s.activity || 0), 1)
                : maxViews;
              const value = isXTeam ? (stat.activity || 0) : stat.views;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{stat.date}</span>
                    <span className={`font-semibold ${isXTeam ? 'text-yellow-400' : 'text-pink-400'}`}>
                      {isXTeam
                        ? `活動 ${value.toLocaleString()} (いいね ${stat.likes || 0} / リプライ ${stat.replies || 0})`
                        : `${stat.views.toLocaleString()} views / ${stat.posts} posts`
                      }
                    </span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full ${isXTeam ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-pink-500 to-purple-500'} rounded-full transition-all duration-500 ${isXTeam ? 'shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'shadow-[0_0_20px_rgba(236,72,153,0.5)]'}`}
                      style={{
                        width: `${Math.max((value / maxValue) * 100, 2)}%`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                      {value > 0 && value.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 月別推移 */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className={`h-5 w-5 ${isXTeam ? 'text-yellow-500' : 'text-cyan-500'}`} />
            月別推移（過去6ヶ月）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {monthlyStats.map((stat, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl ${isXTeam ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 hover:border-yellow-500/40' : 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40'} transition-all`}
              >
                <div className="text-xs text-muted-foreground mb-1">{stat.date}</div>
                <div className={`text-2xl font-bold ${isXTeam ? 'text-yellow-400' : 'text-cyan-400'} mb-1`}>
                  {isXTeam ? (stat.activity || 0).toLocaleString() : stat.views.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isXTeam
                    ? `いいね ${stat.likes || 0} / リプライ ${stat.replies || 0}`
                    : `${stat.posts} posts`
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* クォーター別推移 */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className={`h-5 w-5 ${isXTeam ? 'text-yellow-500' : 'text-purple-500'}`} />
            四半期別推移
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quarterlyStats.map((stat, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl ${isXTeam ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/20 hover:border-yellow-500/40' : 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 hover:border-purple-500/40'} transition-all`}
              >
                <div className="text-sm text-muted-foreground mb-2">
                  {stat.date} {stat.period}
                </div>
                <div className={`text-3xl font-bold ${isXTeam ? 'text-yellow-400' : 'text-purple-400'} mb-2`}>
                  {isXTeam ? (stat.activity || 0).toLocaleString() : stat.views.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isXTeam
                    ? `いいね ${stat.likes || 0} / リプライ ${stat.replies || 0}`
                    : `${stat.posts} posts`
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* バッジコレクション */}
      {badges.length > 0 && (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              獲得バッジ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {badges.map((userBadge: any, index: number) => {
                const badge = BADGES.find(b => b.id === userBadge.badgeId);
                if (!badge) return null;

                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-center"
                    style={{
                      boxShadow: `0 0 20px ${getBadgeRarityColor(badge.rarity)}40`,
                    }}
                  >
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <div
                      className="text-sm font-semibold mb-1"
                      style={{ color: getBadgeRarityColor(badge.rarity) }}
                    >
                      {badge.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{badge.description}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
