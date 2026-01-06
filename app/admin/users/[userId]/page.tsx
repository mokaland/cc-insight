"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { User, teams, Report, getUserStats } from "@/lib/firestore";
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
  Loader2,
  Shield,
  Mail
} from "lucide-react";
import { calculateLevel, getBadgeRarityColor, BADGES } from "@/lib/gamification";

interface PeriodStats {
  period: string;
  views: number;
  posts: number;
  date: string;
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

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // ユーザー情報を取得
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setUser({ uid: userDoc.id, ...userDoc.data() } as User);
        setBadges(userDoc.data().badges || []);
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
  };

  const calculateStats = (reports: Report[]) => {
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

      weekly.unshift({
        period: `${i + 1}週前`,
        views: weekReports.reduce((sum, r) => sum + (r.igViews || 0), 0),
        posts: weekReports.length,
        date: weekStart.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
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

      monthly.unshift({
        period: `${i + 1}ヶ月前`,
        views: monthReports.reduce((sum, r) => sum + (r.igViews || 0), 0),
        posts: monthReports.length,
        date: monthStart.toLocaleDateString("ja-JP", { year: "numeric", month: "short" }),
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

      quarterly.unshift({
        period: `Q${(targetQuarter % 4) + 1}`,
        views: quarterReports.reduce((sum, r) => sum + (r.igViews || 0), 0),
        posts: quarterReports.length,
        date: `${qStart.getFullYear()}`,
      });
    }
    setQuarterlyStats(quarterly);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-muted-foreground">ユーザー情報を読み込み中...</p>
      </div>
    );
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
  const totalViews = reports.reduce((sum, r) => sum + (r.igViews || 0), 0);
  const totalReports = reports.length;
  const level = calculateLevel(totalViews);
  const maxViews = Math.max(...weeklyStats.map(s => s.views), 1);

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
          glowColor={level.color}
          title="現在のレベル"
          icon={<div className="text-2xl">{level.icon}</div>}
          value={level.name}
          subtitle={`Lv.${level.level}`}
        >
          <div></div>
        </GlassCard>
        <GlassCard
          glowColor="#ec4899"
          title="累計再生数"
          icon={<Eye className="h-5 w-5" />}
          value={totalViews.toLocaleString()}
          subtitle="総再生"
        >
          <div></div>
        </GlassCard>
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
            <TrendingUp className="h-5 w-5 text-pink-500" />
            週別推移（過去8週）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weeklyStats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{stat.date}</span>
                  <span className="font-semibold text-pink-400">
                    {stat.views.toLocaleString()} views / {stat.posts} posts
                  </span>
                </div>
                <div className="h-8 bg-white/5 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                    style={{
                      width: `${Math.max((stat.views / maxViews) * 100, 2)}%`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                    {stat.views > 0 && `${stat.views.toLocaleString()}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 月別推移 */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-500" />
            月別推移（過去6ヶ月）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {monthlyStats.map((stat, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
              >
                <div className="text-xs text-muted-foreground mb-1">{stat.date}</div>
                <div className="text-2xl font-bold text-cyan-400 mb-1">
                  {stat.views.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">{stat.posts} posts</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* クォーター別推移 */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            四半期別推移
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quarterlyStats.map((stat, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 hover:border-purple-500/40 transition-all"
              >
                <div className="text-sm text-muted-foreground mb-2">
                  {stat.date} {stat.period}
                </div>
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {stat.views.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">{stat.posts} posts</div>
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
