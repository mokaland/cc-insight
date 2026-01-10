"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Trophy, Eye, Users, TrendingUp, Heart, MessageCircle, Instagram,
  Youtube, Crown, Medal, Award, ChevronRight, Zap, Calendar, Target, Download
} from "lucide-react";
import dynamic from "next/dynamic";
import { subscribeToReports, calculateTeamStats, teams, Report, getBulkUserGuardianProfiles } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import { GUARDIANS, ATTRIBUTES, getGuardianImagePath, GuardianId, EVOLUTION_STAGES, calculateLevel } from "@/lib/guardian-collection";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentLoader } from "@/components/ui/loading-spinner";
import { cachedFetch } from "@/lib/firestore-cache";

// 🆕 動的インポートでCode Splitting
const MemberDetailModal = dynamic(
  () => import("@/components/member-detail-modal").then(mod => ({ default: mod.MemberDetailModal })),
  { ssr: false }
);

const getMedalIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-slate-400" />;
    case 3:
      return <Award className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="text-lg font-bold text-slate-400">#{rank}</span>;
  }
};

// 📊 CSV出力関数
const exportToCSV = (teamName: string, members: any[], isShorts: boolean, period: string) => {
  // ヘッダー行を作成
  const headers = isShorts
    ? ['順位', '名前', 'エナジー', '再生数', 'プロフアクセス', '交流数', 'フォロワー増加', '投稿数', '報告回数', '守護神']
    : ['順位', '名前', 'エナジー', 'いいね回り', 'リプライ回り', '総活動量', '投稿数', '報告回数', '守護神'];

  // データ行を作成
  const rows = members.map((member, index) => {
    const baseData = [
      index + 1,
      member.name || '',
      member.energy || 0
    ];

    if (isShorts) {
      return [
        ...baseData,
        member.views || 0,
        member.profileAccess || 0,
        member.interactions || 0,
        member.followerGrowth || 0,
        member.posts || 0,
        member.reports || 0,
        member.guardianData?.name || '未召喚'
      ];
    } else {
      return [
        ...baseData,
        member.likes || 0,
        member.replies || 0,
        (member.likes || 0) + (member.replies || 0),
        member.posts || 0,
        member.reports || 0,
        member.guardianData?.name || '未召喚'
      ];
    }
  });

  // CSV文字列を作成
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // BOMを追加してExcelで正しく開けるようにする
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

  // ダウンロードリンクを作成
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
  const periodLabel = period === 'week' ? '週間' : '月間';

  link.setAttribute('href', url);
  link.setAttribute('download', `${teamName}_${periodLabel}ランキング_${timestamp}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function AllTeamsRankingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardianProfiles, setGuardianProfiles] = useState<{ [userId: string]: any }>({});
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const userRowRef = useRef<HTMLDivElement>(null);

  // 📅 期間でフィルタリング（useMemoでメモ化）
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const reportDate = new Date(report.date);
      const now = new Date();

      if (period === "week") {
        // 過去7日間
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return reportDate >= weekAgo;
      } else {
        // 過去30日間
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return reportDate >= monthAgo;
      }
    });
  }, [reports, period]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
      if (reports.length === 0 && !error) {
        setError("データの読み込みに時間がかかっています。");
      }
    }, 5000);

    try {
      const unsubscribe = subscribeToReports(async (data) => {
        setReports(data);

        // 🔧 N+1問題解決: 各レポートのuserIdから守護神データを一括取得
        const uniqueUserIds = Array.from(new Set(data.map(r => r.userId).filter(Boolean))) as string[];

        // 💾 キャッシュ戦略: 5分間キャッシュで読み取り大幅削減
        const cacheKey = `guardian-profiles-${uniqueUserIds.sort().join(',')}`;
        const profiles = await cachedFetch(
          cacheKey,
          () => getBulkUserGuardianProfiles(uniqueUserIds),
          5 * 60 * 1000 // 5分TTL
        );

        setGuardianProfiles(profiles);
        setLoading(false);
        setError(null);
        clearTimeout(timeout);
      });

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (err: any) {
      console.error("ランキングデータ取得エラー:", err);
      setError("データの取得に失敗しました。");
      setLoading(false);
      clearTimeout(timeout);
    }
  }, []);

  // チームごとの統計を計算（filteredReportsを使用）
  // 注意: useMemoは条件分岐の前に呼び出す必要がある（Reactフック規則）
  const teamStats = useMemo(() => {
    return teams.map(team => {
      const stats = calculateTeamStats(filteredReports, team.id);
      return {
        ...team,
        stats
      };
    });
  }, [filteredReports]);

  // 🎯 自分の順位を計算
  const userRankInfo = useMemo(() => {
    if (!user || !guardianProfiles[user.uid]) {
      return null;
    }

    // ユーザーのレポートを検索
    const userReport = filteredReports.find(r => r.userId === user.uid);
    if (!userReport) {
      return null;
    }

    // ユーザーが所属するチームを特定
    const userTeam = teams.find(t => t.id === userReport.team);
    if (!userTeam) {
      return null;
    }

    const isShorts = userTeam.type === "shorts";

    // チームのstatsを直接計算
    const stats = calculateTeamStats(filteredReports, userTeam.id);

    // メンバーをソート
    const sortedMembers = [...stats.members].sort((a: any, b: any) => {
      if (isShorts) {
        return b.views - a.views;
      } else {
        const aActivity = (a.likes || 0) + (a.replies || 0);
        const bActivity = (b.likes || 0) + (b.replies || 0);
        return bActivity - aActivity;
      }
    });

    // ユーザーのランクを検索
    const userRank = sortedMembers.findIndex((m: any) => m.name === userReport.name) + 1;

    if (userRank > 0) {
      return {
        teamName: userTeam.name,
        rank: userRank,
        totalMembers: sortedMembers.length,
        color: userTeam.color
      };
    }

    return null;
  }, [user, filteredReports, guardianProfiles]);

  // 📍 自分の位置にスクロール
  const scrollToMyRank = () => {
    if (userRowRef.current) {
      userRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Trophy className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-100 mb-2">ログインが必要です</h2>
        <p className="text-slate-300 mb-6">ランキングを表示するにはログインしてください</p>
      </div>
    );
  }

  if (loading || authLoading) {
    return <ContentLoader text="ランキングを読み込み中..." />;
  }

  return (
    <div className="space-y-12 md:pb-12">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
          🏆 全チームランキング
        </h1>
        <p className="text-slate-300">タップで詳細を表示</p>
      </div>

      {/* 📅 期間切り替えタブ */}
      <div className="flex justify-center">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2 glass-bg border border-white/10">
            <TabsTrigger
              value="week"
              className="bg-white/10 text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <Calendar className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">週間ランキング</span>
              <span className="sm:hidden">週間</span>
            </TabsTrigger>
            <TabsTrigger
              value="month"
              className="bg-white/10 text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <Calendar className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">月間ランキング</span>
              <span className="sm:hidden">月間</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 🎯 自分の順位表示（Sticky Header） */}
      {userRankInfo && (
        <div className="sticky top-0 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
          <div
            className="glass-premium rounded-2xl p-4 border-2 shadow-2xl backdrop-blur-xl"
            style={{
              borderColor: `${userRankInfo.color}60`,
              background: `linear-gradient(135deg, ${userRankInfo.color}15 0%, rgba(15, 23, 42, 0.95) 50%)`,
              boxShadow: `0 8px 32px ${userRankInfo.color}40, 0 0 0 1px ${userRankInfo.color}20`
            }}
          >
            <div className="flex items-center justify-between">
              {/* 左: ランク情報 */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-2"
                  style={{
                    backgroundColor: `${userRankInfo.color}20`,
                    borderColor: userRankInfo.color,
                    color: userRankInfo.color,
                    boxShadow: `0 0 20px ${userRankInfo.color}60`
                  }}
                >
                  #{userRankInfo.rank}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">あなたの順位</p>
                  <p className="font-bold text-slate-100">
                    {userRankInfo.teamName} - {userRankInfo.rank}/{userRankInfo.totalMembers}位
                  </p>
                </div>
              </div>

              {/* 右: スクロールボタン */}
              <button
                onClick={scrollToMyRank}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: `${userRankInfo.color}20`,
                  color: userRankInfo.color,
                  border: `2px solid ${userRankInfo.color}40`
                }}
              >
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">自分の位置へ</span>
                <span className="sm:hidden">移動</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-600 text-center">
          {error}
        </div>
      )}

      {/* チームごとのランキング */}
      {teamStats.map((teamData) => {
        const { id, name, color, type, stats } = teamData;
        const isShorts = type === "shorts";
        
        // メンバーをソート（Shorts: 再生数、X: 活動量）
        const sortedMembers = [...stats.members].sort((a: any, b: any) => {
          if (isShorts) {
            return b.views - a.views;
          } else {
            // X系: いいね + リプライの合計
            const aActivity = (a.likes || 0) + (a.replies || 0);
            const bActivity = (b.likes || 0) + (b.replies || 0);
            return bActivity - aActivity;
          }
        });

        // チームサマリー計算
        const totalMembers = sortedMembers.length;
        const avgViews = totalMembers > 0 ? Math.round(stats.totalViews / totalMembers) : 0;
        const avgPosts = totalMembers > 0 ? Math.round(stats.totalPosts / totalMembers) : 0;
        const avgActivity = isShorts 
          ? totalMembers > 0 ? Math.round(stats.totalInteractions / totalMembers) : 0
          : totalMembers > 0 ? Math.round((stats.totalLikes + stats.totalReplies) / totalMembers) : 0;

        return (
          <section key={id} className="space-y-6">
            {/* チームヘッダー */}
            <div 
              className="rounded-2xl p-6 border-2"
              style={{
                backgroundColor: `${color}10`,
                borderColor: `${color}40`,
                boxShadow: `0 0 40px ${color}20`
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full animate-pulse"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                  />
                  <h2 className="text-2xl font-bold" style={{ color }}>
                    {name}
                  </h2>
                </div>

                {/* CSV出力ボタン */}
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-300 hidden sm:block">
                    {totalMembers}人のメンバー
                  </div>
                  <button
                    onClick={() => exportToCSV(name, sortedMembers, isShorts, period)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95 glass-bg border border-white/10 hover:border-white/30"
                    style={{
                      color: color
                    }}
                    title="CSVダウンロード"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">CSV出力</span>
                  </button>
                </div>
              </div>

              {/* チームサマリー */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isShorts ? (
                  <>
                    {/* Shorts系KPI */}
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">総再生数</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalViews.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">平均: {avgViews.toLocaleString()}</p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">プロフアクセス</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalProfileAccess.toLocaleString()}
                      </p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">インタラクション</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalInteractions.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">平均: {avgActivity.toLocaleString()}</p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Instagram className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">総フォロワー</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {(stats.totalIgFollowers + stats.totalYtFollowers + stats.totalTiktokFollowers).toLocaleString()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* X系KPI */}
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">いいね回り</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalLikes.toLocaleString()}
                      </p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">リプライ回り</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalReplies.toLocaleString()}
                      </p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">総活動量</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {(stats.totalLikes + stats.totalReplies).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">平均: {avgActivity.toLocaleString()}</p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">総投稿数</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalPosts}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">平均: {avgPosts}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* メンバーランキング */}
            {sortedMembers.length === 0 ? (
              <div className="glass-premium rounded-2xl p-12 text-center border border-white/20">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-slate-300">まだレポートが送信されていません</p>
              </div>
            ) : (
              <div className="glass-premium rounded-2xl border border-white/20 shadow-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5" style={{ color }} />
                    メンバーランキング
                  </h3>
                  <div className="space-y-3">
                    {/* メンバーデータ */}
                    {sortedMembers.map((member: any, index: number) => {
                      const rank = index + 1;
                      const isTop3 = rank <= 3;

                      // ユーザーIDからレポートを逆引き
                      const memberReport = reports.find(r => r.name === member.name && r.team === id);
                      const userId = memberReport?.userId;

                      // 🎯 現在のユーザーかどうかをチェック
                      const isCurrentUser = user && userId === user.uid;
                      
                      // 守護神データ取得
                      let guardianData: any = null;
                      
                      if (userId && guardianProfiles[userId]) {
                        const profile = guardianProfiles[userId];
                        const guardianId = profile.activeGuardianId;
                        
                        if (guardianId && profile.guardians[guardianId]) {
                          const guardian = GUARDIANS[guardianId as GuardianId];
                          const instance = profile.guardians[guardianId];
                          const attr = ATTRIBUTES[guardian.attribute];
                          const stageInfo = EVOLUTION_STAGES[instance.stage];
                          
                          guardianData = {
                            guardianId,
                            stage: instance.stage,
                            imagePath: getGuardianImagePath(guardianId as GuardianId, instance.stage),
                            color: attr.color,
                            name: guardian.name,
                            stageName: stageInfo.name,
                            emoji: attr.emoji
                          };
                        }
                      }
                      
                      // フォールバック（守護神未選択）
                      const fallbackGuardian = {
                        emoji: "🥚",
                        name: "未召喚",
                        color: "#94a3b8"
                      };

                      // エナジー取得（Firestoreから取得した正式な値を使用）
                      const energy = userId && guardianProfiles[userId]
                        ? guardianProfiles[userId].energy?.current || 0
                        : 0;

                      // レベル計算（累計獲得エナジーから）
                      const totalEarned = userId && guardianProfiles[userId]
                        ? guardianProfiles[userId].energy?.totalEarned || 0
                        : 0;
                      const memberLevel = calculateLevel(totalEarned);

                      return (
                        <div
                          key={userId || member.name}
                          ref={isCurrentUser ? userRowRef : null}
                          onClick={() => {
                            setSelectedMember({
                              ...member,
                              energy,
                              totalEarned,
                              guardianData
                            });
                            setSelectedTeam({ name, color, type });
                          }}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
                            isCurrentUser
                              ? "border-3 animate-pulse"
                              : isTop3
                              ? "border-2"
                              : "border border-slate-700"
                          }`}
                          style={
                            isCurrentUser
                              ? {
                                  borderColor: color,
                                  borderWidth: '3px',
                                  backgroundColor: `${color}15`,
                                  boxShadow: `0 0 30px ${color}60, inset 0 0 20px ${color}20, 0 0 0 4px ${color}20`
                                }
                              : isTop3
                              ? {
                                  borderColor: `${color}40`,
                                  backgroundColor: `${color}05`,
                                  boxShadow: `0 0 20px ${color}20`,
                                }
                              : undefined
                          }
                        >
                          {/* ランク */}
                          <div className="w-10 flex-shrink-0 flex justify-center">
                            {getMedalIcon(rank)}
                          </div>

                          {/* 守護神アバター - 新構造 */}
                          {guardianData ? (
                            <div className="guardian-avatar">
                              <div 
                                className="absolute inset-0 rounded-full animate-pulse"
                                style={{
                                  border: `2px solid ${guardianData.color}`,
                                  boxShadow: `0 0 15px ${guardianData.color}80`,
                                }}
                              />
                              <div 
                                className="absolute inset-1 rounded-full opacity-20"
                                style={{
                                  background: `radial-gradient(circle, ${guardianData.color} 0%, transparent 70%)`
                                }}
                              />
                              <div className="guardian-avatar-inner">
                                <Image
                                  src={guardianData.imagePath}
                                  alt={guardianData.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  placeholder="blur"
                                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjIyIi8+PC9zdmc+"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden absolute inset-0 flex items-center justify-center text-2xl">
                                  {guardianData.emoji}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                              style={{
                                backgroundColor: `${fallbackGuardian.color}20`,
                                boxShadow: `0 0 15px ${fallbackGuardian.color}`,
                                border: `2px solid ${fallbackGuardian.color}`,
                              }}
                            >
                              {fallbackGuardian.emoji}
                            </div>
                          )}

                          {/* メンバー情報 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-100 truncate">
                                {member.name}
                              </p>
                              {isCurrentUser && (
                                <span
                                  className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse"
                                  style={{
                                    backgroundColor: `${color}30`,
                                    color: color,
                                    border: `1px solid ${color}`
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="text-yellow-400 font-bold">Lv.{memberLevel}</span>
                              <span style={{ color: guardianData ? guardianData.color : fallbackGuardian.color }} className="font-medium">
                                {guardianData ? guardianData.stageName : fallbackGuardian.name}
                              </span>
                              <span>•</span>
                              <span>{member.reports}回報告</span>
                            </div>
                          </div>

                          {/* エナジー表示（メインKPI） */}
                          <div className="text-right">
                            <p className="text-xs text-slate-400 mb-0.5">エナジー</p>
                            <p className="text-xl font-bold" style={{ color }}>
                              {energy}E
                            </p>
                          </div>

                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* 詳細モーダル */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        teamColor={selectedTeam?.color || '#EC4899'}
        teamName={selectedTeam?.name || ''}
        isShorts={selectedTeam?.type === 'shorts'}
      />
    </div>
  );
}
