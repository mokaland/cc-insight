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
    <div className="space-y-4 md:space-y-6 md:pb-12">
      {/* Page Header - コンパクト */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
          🏆 ランキング
        </h1>

        {/* 📅 期間切り替えタブ - インライン */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
          <TabsList className="h-8 p-0.5 bg-white/5 border border-white/10">
            <TabsTrigger
              value="week"
              className="h-7 px-3 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600"
            >
              週間
            </TabsTrigger>
            <TabsTrigger
              value="month"
              className="h-7 px-3 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600"
            >
              月間
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 🎯 自分の順位表示（Sticky Header）- コンパクト */}
      {userRankInfo && (
        <div className="sticky top-0 z-50">
          <div
            className="rounded-lg p-2.5 border backdrop-blur-xl flex items-center justify-between"
            style={{
              borderColor: `${userRankInfo.color}40`,
              background: `linear-gradient(135deg, ${userRankInfo.color}10 0%, rgba(15, 23, 42, 0.95) 50%)`,
            }}
          >
            {/* 左: ランク情報 */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-base"
                style={{
                  backgroundColor: `${userRankInfo.color}15`,
                  color: userRankInfo.color,
                }}
              >
                #{userRankInfo.rank}
              </div>
              <div>
                <p className="text-[10px] text-slate-400">あなたの順位</p>
                <p className="text-sm font-semibold text-slate-100">
                  {userRankInfo.rank}/{userRankInfo.totalMembers}位
                </p>
              </div>
            </div>

            {/* 右: スクロールボタン */}
            <button
              onClick={scrollToMyRank}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{
                backgroundColor: `${userRankInfo.color}15`,
                color: userRankInfo.color,
              }}
            >
              <Target className="w-3.5 h-3.5" />
              移動
            </button>
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
          <section key={id} className="space-y-3">
            {/* チームヘッダー - コンパクト */}
            <div
              className="rounded-xl p-3 sm:p-4 border"
              style={{
                backgroundColor: `${color}08`,
                borderColor: `${color}30`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <h2 className="text-lg sm:text-xl font-bold" style={{ color }}>
                    {name}
                  </h2>
                  <span className="text-xs text-slate-400 ml-1">
                    {totalMembers}人
                  </span>
                </div>

                {/* CSV出力ボタン - コンパクト */}
                <button
                  onClick={() => exportToCSV(name, sortedMembers, isShorts, period)}
                  className="p-2 rounded-lg transition-all hover:bg-white/10 active:scale-95"
                  style={{ color: color }}
                  title="CSVダウンロード"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* チームサマリー - コンパクト */}
              <div className="grid grid-cols-4 gap-2">
                {isShorts ? (
                  <>
                    {/* Shorts系KPI - コンパクト */}
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Eye className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                      <p className="text-xs font-bold" style={{ color }}>
                        {stats.totalViews >= 1000 ? `${(stats.totalViews / 1000).toFixed(1)}k` : stats.totalViews}
                      </p>
                      <p className="text-[9px] text-slate-500">再生</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Users className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                      <p className="text-xs font-bold" style={{ color }}>
                        {stats.totalProfileAccess >= 1000 ? `${(stats.totalProfileAccess / 1000).toFixed(1)}k` : stats.totalProfileAccess}
                      </p>
                      <p className="text-[9px] text-slate-500">プロフ</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <TrendingUp className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                      <p className="text-xs font-bold" style={{ color }}>
                        {stats.totalInteractions >= 1000 ? `${(stats.totalInteractions / 1000).toFixed(1)}k` : stats.totalInteractions}
                      </p>
                      <p className="text-[9px] text-slate-500">交流</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Instagram className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                      <p className="text-xs font-bold" style={{ color }}>
                        {(stats.totalIgFollowers + stats.totalYtFollowers + stats.totalTiktokFollowers) >= 1000
                          ? `${((stats.totalIgFollowers + stats.totalYtFollowers + stats.totalTiktokFollowers) / 1000).toFixed(1)}k`
                          : (stats.totalIgFollowers + stats.totalYtFollowers + stats.totalTiktokFollowers)}
                      </p>
                      <p className="text-[9px] text-slate-500">フォロワー</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* X系KPI - コンパクト */}
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Heart className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                      <p className="text-xs font-bold" style={{ color }}>
                        {stats.totalLikes >= 1000 ? `${(stats.totalLikes / 1000).toFixed(1)}k` : stats.totalLikes}
                      </p>
                      <p className="text-[9px] text-slate-500">いいね</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <MessageCircle className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                      <p className="text-xs font-bold" style={{ color }}>
                        {stats.totalReplies >= 1000 ? `${(stats.totalReplies / 1000).toFixed(1)}k` : stats.totalReplies}
                      </p>
                      <p className="text-[9px] text-slate-500">リプ</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Zap className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                      <p className="text-xs font-bold" style={{ color }}>
                        {(stats.totalLikes + stats.totalReplies) >= 1000
                          ? `${((stats.totalLikes + stats.totalReplies) / 1000).toFixed(1)}k`
                          : (stats.totalLikes + stats.totalReplies)}
                      </p>
                      <p className="text-[9px] text-slate-500">活動量</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Trophy className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                      <p className="text-xs font-bold" style={{ color }}>
                        {stats.totalPosts}
                      </p>
                      <p className="text-[9px] text-slate-500">投稿</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* メンバーランキング - コンパクト */}
            {sortedMembers.length === 0 ? (
              <div className="rounded-xl p-6 text-center border border-white/10 bg-white/5">
                <p className="text-slate-400 text-sm">まだレポートがありません</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="p-2 sm:p-3">
                  <div className="space-y-1.5">
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
                          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-all duration-200 cursor-pointer hover:bg-white/5 active:scale-[0.98] ${isCurrentUser
                            ? "border-2"
                            : isTop3
                              ? "border"
                              : "border border-white/5"
                            }`}
                          style={
                            isCurrentUser
                              ? {
                                borderColor: color,
                                backgroundColor: `${color}10`,
                                boxShadow: `0 0 12px ${color}40`
                              }
                              : isTop3
                                ? {
                                  borderColor: `${color}30`,
                                  backgroundColor: `${color}05`,
                                }
                                : undefined
                          }
                        >
                          {/* ランク - コンパクト */}
                          <div className="w-7 sm:w-8 flex-shrink-0 flex justify-center">
                            {getMedalIcon(rank)}
                          </div>

                          {/* 守護神アバター - 小さく */}
                          {guardianData ? (
                            <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                              <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                  border: `2px solid ${guardianData.color}40`,
                                }}
                              />
                              <div className="absolute inset-0.5 rounded-full overflow-hidden">
                                <Image
                                  src={guardianData.imagePath}
                                  alt={guardianData.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  placeholder="blur"
                                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjIyIi8+PC9zdmc+"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden absolute inset-0 flex items-center justify-center text-lg">
                                  {guardianData.emoji}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                              style={{
                                backgroundColor: `${fallbackGuardian.color}15`,
                                border: `2px solid ${fallbackGuardian.color}40`,
                              }}
                            >
                              {fallbackGuardian.emoji}
                            </div>
                          )}

                          {/* メンバー情報 - コンパクト */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-sm text-slate-100 truncate">
                                {member.name}
                              </p>
                              {isCurrentUser && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: `${color}25`,
                                    color: color,
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="text-yellow-400 font-medium">Lv.{memberLevel}</span>
                              <span className="text-slate-500">•</span>
                              <span>{member.reports}回</span>
                            </div>
                          </div>

                          {/* エナジー表示 - コンパクト */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-bold" style={{ color }}>
                              {energy}E
                            </p>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })
      }

      {/* 詳細モーダル */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        teamColor={selectedTeam?.color || '#EC4899'}
        teamName={selectedTeam?.name || ''}
        isShorts={selectedTeam?.type === 'shorts'}
      />
    </div >
  );
}
