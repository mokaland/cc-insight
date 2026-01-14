"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Trophy, Eye, Users, TrendingUp, Heart, MessageCircle, Instagram,
  Youtube, Crown, Medal, Award, ChevronRight, Zap, Calendar, Target, Download,
  AlertTriangle, Flame
} from "lucide-react";
import dynamic from "next/dynamic";
import { subscribeToReports, calculateTeamStats, teams, Report, getBulkUserGuardianProfiles } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import { GUARDIANS, ATTRIBUTES, getGuardianImagePath, GuardianId, EVOLUTION_STAGES, calculateLevel } from "@/lib/guardian-collection";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentLoader } from "@/components/ui/loading-spinner";
import { cachedFetch } from "@/lib/firestore-cache";
import { triggerPageVisitMission } from "@/lib/services/mission";

// 🆕 動的インポートでCode Splitting
const MemberDetailModal = dynamic(
  () => import("@/components/member-detail-modal").then(mod => ({ default: mod.MemberDetailModal })),
  { ssr: false }
);

// 📊 CSV出力関数
const exportToCSV = (teamName: string, members: any[], isShorts: boolean, period: string) => {
  const headers = isShorts
    ? ['順位', '名前', 'エナジー', '再生数', 'プロフアクセス', '交流数', 'フォロワー増加', '投稿数', '報告回数', '守護神']
    : ['順位', '名前', 'エナジー', 'いいね回り', 'リプライ回り', '総活動量', '投稿数', '報告回数', '守護神'];

  const rows = members.map((member, index) => {
    const baseData = [index + 1, member.name || '', member.energy || 0];
    if (isShorts) {
      return [...baseData, member.views || 0, member.profileAccess || 0, member.interactions || 0, member.followerGrowth || 0, member.posts || 0, member.reports || 0, member.guardianData?.name || '未召喚'];
    } else {
      return [...baseData, member.likes || 0, member.replies || 0, (member.likes || 0) + (member.replies || 0), member.posts || 0, member.reports || 0, member.guardianData?.name || '未召喚'];
    }
  });

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  const periodLabel = period === 'week' ? '週間' : '月間';
  link.setAttribute('href', url);
  link.setAttribute('download', `${teamName}_${periodLabel}ランキング_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function AllTeamsRankingPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardianProfiles, setGuardianProfiles] = useState<{ [userId: string]: any }>({});
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const userRowRef = useRef<HTMLDivElement>(null);

  // 🆕 チームタブ（ユーザーの所属チームをデフォルト）
  const [activeTeamId, setActiveTeamId] = useState<string>("");

  // ユーザーの所属チームをデフォルト選択
  useEffect(() => {
    if (userProfile?.team && !activeTeamId) {
      setActiveTeamId(userProfile.team);
    } else if (!activeTeamId && teams.length > 0) {
      setActiveTeamId(teams[0].id);
    }
  }, [userProfile, activeTeamId]);

  // 🎯 デイリーミッション: ランキングページ訪問
  useEffect(() => {
    if (user?.uid) {
      triggerPageVisitMission(user.uid, "/ranking").catch(console.error);
    }
  }, [user?.uid]);

  // 📅 期間でフィルタリング
  const filteredReports = useMemo(() => {
    if (period === "all") {
      return reports; // 全期間
    }
    return reports.filter(report => {
      const reportDate = new Date(report.date);
      const now = new Date();
      if (period === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return reportDate >= weekAgo;
      } else {
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
        const uniqueUserIds = Array.from(new Set(data.map(r => r.userId).filter(Boolean))) as string[];
        // 🔧 キャッシュ時間を30秒に短縮（進化やエナジー変更を早く反映するため）
        const cacheKey = `guardian-profiles-${uniqueUserIds.sort().join(',')}`;
        const profiles = await cachedFetch(cacheKey, () => getBulkUserGuardianProfiles(uniqueUserIds), 30 * 1000);
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

  // 選択中のチームの統計
  const activeTeamData = useMemo(() => {
    const team = teams.find(t => t.id === activeTeamId);
    if (!team) return null;
    const stats = calculateTeamStats(filteredReports, team.id);
    return { ...team, stats };
  }, [filteredReports, activeTeamId]);

  // 🎯 自分の順位を計算（追いつけ追い越せ情報込み）
  const userRankInfo = useMemo(() => {
    if (!user || !activeTeamData) return null;

    const isShorts = activeTeamData.type === "shorts";
    const sortedMembers = [...activeTeamData.stats.members].sort((a: any, b: any) => {
      if (isShorts) return b.views - a.views;
      return (b.likes || 0) + (b.replies || 0) - ((a.likes || 0) + (a.replies || 0));
    });

    const userReport = filteredReports.find(r => r.userId === user.uid && r.team === activeTeamId);
    if (!userReport) return null;

    const userRank = sortedMembers.findIndex((m: any) => m.name === userReport.name) + 1;
    if (userRank > 0) {
      // ユーザーのエナジー取得
      const userEnergy = guardianProfiles[user.uid]?.energy?.totalEarned || 0;

      // 上位者との差分
      let aheadDiff = null;
      let aheadName = null;
      if (userRank > 1) {
        const aheadMember = sortedMembers[userRank - 2];
        if (aheadMember && aheadMember.name) {
          const aheadReport = filteredReports.find(r => r.name === aheadMember.name && r.team === activeTeamId);
          const aheadEnergy = aheadReport?.userId && guardianProfiles[aheadReport.userId]?.energy?.totalEarned || 0;
          aheadDiff = aheadEnergy - userEnergy;
          aheadName = aheadMember.name;
        }
      }

      // 下位者との差分
      let behindDiff = null;
      let behindName = null;
      if (userRank < sortedMembers.length) {
        const behindMember = sortedMembers[userRank];
        if (behindMember && behindMember.name) {
          const behindReport = filteredReports.find(r => r.name === behindMember.name && r.team === activeTeamId);
          const behindEnergy = behindReport?.userId && guardianProfiles[behindReport.userId]?.energy?.totalEarned || 0;
          behindDiff = userEnergy - behindEnergy;
          behindName = behindMember.name;
        }
      }

      return {
        teamName: activeTeamData.name,
        rank: userRank,
        totalMembers: sortedMembers.length,
        color: activeTeamData.color,
        aheadDiff,
        aheadName,
        behindDiff,
        behindName
      };
    }
    return null;
  }, [user, filteredReports, activeTeamData, activeTeamId, guardianProfiles]);

  const scrollToMyRank = () => {
    // userRankInfoから自分のユーザーIDを使ってスクロール
    if (user?.uid) {
      const myRow = document.getElementById(`ranking-row-${user.uid}`);
      if (myRow) {
        myRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    // フォールバック: refを使用
    if (userRowRef.current) {
      userRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 🏆 称号計算（チーム内）
  const teamTitles = useMemo(() => {
    if (!activeTeamData) return null;

    const members = activeTeamData.stats.members;
    if (members.length === 0) return null;

    // 各メンバーのデータを集約
    const memberData = members.map((member: any) => {
      const report = filteredReports.find(r => r.name === member.name && r.team === activeTeamId);
      const userId = report?.userId;
      const profile = userId && guardianProfiles[userId];
      const totalEarned = profile?.energy?.totalEarned || 0;
      const streak = profile?.streak?.current || 0;

      return {
        name: member.name,
        userId,
        totalEarned,
        streak,
        views: member.views || 0,
        reports: member.reports || 0
      };
    });

    // 👑 エナジー王: 累計獲得E 1位
    const sortedByEnergy = [...memberData].sort((a, b) => b.totalEarned - a.totalEarned);
    const energyKing = sortedByEnergy.length > 0 ? sortedByEnergy[0] : null;

    // 🔥 継続の鬼: ストリーク日数 1位
    const sortedByStreak = [...memberData].sort((a, b) => b.streak - a.streak);
    const streakMaster = sortedByStreak.length > 0 ? sortedByStreak[0] : null;

    // 📈 成長株: 報告回数が多い（先週比は複雑なので報告回数で代用）
    const sortedByReports = [...memberData].sort((a, b) => b.reports - a.reports);
    const growthStar = sortedByReports.length > 0 ? sortedByReports[0] : null;

    return {
      energyKing: energyKing && energyKing.name && energyKing.totalEarned > 0
        ? { name: energyKing.name, value: energyKing.totalEarned, label: 'エナジー王', emoji: '👑' }
        : null,
      streakMaster: streakMaster && streakMaster.name && streakMaster.streak > 0
        ? { name: streakMaster.name, value: streakMaster.streak, label: '継続の鬼', emoji: '🔥' }
        : null,
      growthStar: growthStar && growthStar.name && growthStar.reports > 1
        ? { name: growthStar.name, value: growthStar.reports, label: '成長株', emoji: '📈' }
        : null
    };
  }, [activeTeamData, filteredReports, activeTeamId, guardianProfiles]);

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

  // 選択チームのデータ
  const teamData = activeTeamData;
  if (!teamData) return null;

  const { id, name, color, type, stats } = teamData;
  const isShorts = type === "shorts";

  // メンバーをソート
  const sortedMembers = [...stats.members].sort((a: any, b: any) => {
    if (isShorts) return b.views - a.views;
    return (b.likes || 0) + (b.replies || 0) - ((a.likes || 0) + (a.replies || 0));
  });

  const totalMembers = sortedMembers.length;
  const bottom30Threshold = Math.ceil(totalMembers * 0.7); // 下位30%の境界

  return (
    <div className="space-y-4 pb-24">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
          🏆 ランキング
        </h1>

        {/* 期間切り替え */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month" | "all")}>
          <TabsList className="h-8 p-0.5 bg-white/5 border border-white/10">
            <TabsTrigger value="week" className="h-7 px-2 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600">
              週間
            </TabsTrigger>
            <TabsTrigger value="month" className="h-7 px-2 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600">
              月間
            </TabsTrigger>
            <TabsTrigger value="all" className="h-7 px-2 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600">
              全期間
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 🆕 チームタブ */}
      <div className="flex gap-2">
        {teams.map((team) => {
          const isActive = activeTeamId === team.id;
          const isUserTeam = userProfile?.team === team.id;
          return (
            <button
              key={team.id}
              onClick={() => setActiveTeamId(team.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${isActive
                ? 'text-white shadow-lg'
                : 'text-slate-400 bg-white/5 hover:bg-white/10'
                }`}
              style={isActive ? {
                background: `linear-gradient(135deg, ${team.color}, ${team.color}aa)`,
                boxShadow: `0 4px 20px ${team.color}40`
              } : undefined}
            >
              {team.id === 'fukugyou' && '🔥'}
              {team.id === 'taishoku' && '💼'}
              {team.id === 'buppan' && '📦'}
              {' '}{team.name.replace('チーム', '')}
              {isUserTeam && !isActive && <span className="ml-1 text-xs">★</span>}
            </button>
          );
        })}
      </div>

      {/* 自分の順位（選択チームにいる場合のみ） */}
      {userRankInfo && userRankInfo.teamName === teamData.name && (
        <div className="sticky top-0 z-50">
          <div
            className="rounded-lg p-2.5 border backdrop-blur-xl"
            style={{
              borderColor: `${userRankInfo.color}40`,
              background: `linear-gradient(135deg, ${userRankInfo.color}10 0%, rgba(15, 23, 42, 0.95) 50%)`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-base"
                  style={{ backgroundColor: `${userRankInfo.color}15`, color: userRankInfo.color }}
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
              <button
                onClick={scrollToMyRank}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                style={{ backgroundColor: `${userRankInfo.color}15`, color: userRankInfo.color }}
              >
                <Target className="w-3.5 h-3.5" />
                移動
              </button>
            </div>

            {/* 🎯 追いつけ追い越せ表示 */}
            <div className="flex gap-2 text-[10px]">
              {userRankInfo.aheadDiff !== null && (
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>上を追え!</span>
                  </div>
                  <p className="text-slate-300 font-medium">
                    あと <span className="text-emerald-400 font-bold">{userRankInfo.aheadDiff}E</span> で{userRankInfo.rank - 1}位
                  </p>
                </div>
              )}
              {userRankInfo.behindDiff !== null && (
                <div className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>追われてる!</span>
                  </div>
                  <p className="text-slate-300 font-medium">
                    <span className="text-amber-400 font-bold">{userRankInfo.behindDiff}E</span> 差で{userRankInfo.rank + 1}位
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-600 text-center">
          {error}
        </div>
      )}

      {/* チームヘッダー */}
      <div
        className="rounded-xl p-4 border"
        style={{ backgroundColor: `${color}08`, borderColor: `${color}30` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="text-lg font-bold" style={{ color }}>{name}</h2>
            <span className="text-xs text-slate-400 ml-1">{totalMembers}人</span>
          </div>
          <button
            onClick={() => exportToCSV(name, sortedMembers, isShorts, period)}
            className="p-2 rounded-lg transition-all hover:bg-white/10 active:scale-95"
            style={{ color }}
            title="CSVダウンロード"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* チームKPI */}
        <div className="grid grid-cols-4 gap-2">
          {isShorts ? (
            <>
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
                <p className="text-xs font-bold" style={{ color }}>{stats.totalPosts}</p>
                <p className="text-[9px] text-slate-500">投稿</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 🏆 今週の称号ホルダー */}
      {teamTitles && (teamTitles.energyKing || teamTitles.streakMaster || teamTitles.growthStar) && (
        <div className="rounded-xl p-3 border bg-gradient-to-r from-yellow-500/5 to-purple-500/5 border-yellow-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-yellow-400">今週の称号ホルダー</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {teamTitles.energyKing && (
              <div className="bg-yellow-500/10 rounded-lg p-2 text-center border border-yellow-500/20">
                <div className="text-lg">{teamTitles.energyKing.emoji}</div>
                <p className="text-[10px] text-yellow-400 font-medium">{teamTitles.energyKing.label}</p>
                <p className="text-xs text-white font-bold truncate">{teamTitles.energyKing.name}</p>
                <p className="text-[9px] text-slate-400">{teamTitles.energyKing.value >= 1000 ? `${(teamTitles.energyKing.value / 1000).toFixed(1)}k` : teamTitles.energyKing.value}E</p>
              </div>
            )}
            {teamTitles.streakMaster && (
              <div className="bg-orange-500/10 rounded-lg p-2 text-center border border-orange-500/20">
                <div className="text-lg">{teamTitles.streakMaster.emoji}</div>
                <p className="text-[10px] text-orange-400 font-medium">{teamTitles.streakMaster.label}</p>
                <p className="text-xs text-white font-bold truncate">{teamTitles.streakMaster.name}</p>
                <p className="text-[9px] text-slate-400">{teamTitles.streakMaster.value}日連続</p>
              </div>
            )}
            {teamTitles.growthStar && (
              <div className="bg-emerald-500/10 rounded-lg p-2 text-center border border-emerald-500/20">
                <div className="text-lg">{teamTitles.growthStar.emoji}</div>
                <p className="text-[10px] text-emerald-400 font-medium">{teamTitles.growthStar.label}</p>
                <p className="text-xs text-white font-bold truncate">{teamTitles.growthStar.name}</p>
                <p className="text-[9px] text-slate-400">{teamTitles.growthStar.value}回報告</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* メンバーランキング */}
      {sortedMembers.length === 0 ? (
        <div className="rounded-xl p-6 text-center border border-white/10 bg-white/5">
          <p className="text-slate-400 text-sm">まだレポートがありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMembers.map((member: any, index: number) => {
            const rank = index + 1;
            const isTop1 = rank === 1;
            const isTop2 = rank === 2;
            const isTop3 = rank === 3;
            const isBottom30 = rank > bottom30Threshold && totalMembers >= 4;

            const memberReport = reports.find(r => r.name === member?.name && r.team === id);
            const userId = memberReport?.userId;
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
                const stageDef = EVOLUTION_STAGES[instance.stage as 0 | 1 | 2 | 3 | 4];
                guardianData = {
                  guardianId,
                  stage: instance.stage,
                  stageName: stageDef?.name || '卵',
                  imagePath: getGuardianImagePath(guardianId as GuardianId, instance.stage),
                  color: attr.color,
                  name: guardian.name,
                  emoji: attr.emoji
                };
              }
            }

            const energy = userId && guardianProfiles[userId] ? guardianProfiles[userId].energy?.current || 0 : 0;
            const totalEarned = userId && guardianProfiles[userId] ? guardianProfiles[userId].energy?.totalEarned || 0 : 0;
            const memberLevel = calculateLevel(totalEarned);

            // 🎨 ランク別スタイル
            let cardStyle: React.CSSProperties = {};
            let cardClass = "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/5 active:scale-[0.98] border";

            if (isTop1) {
              // 👑 1位: ゴールドグロー + キラキラ
              cardStyle = {
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 180, 0, 0.08) 100%)',
                borderColor: '#ffd700',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2), inset 0 0 20px rgba(255, 215, 0, 0.1)',
              };
              cardClass += " relative overflow-hidden";
            } else if (isTop2) {
              // 🥈 2位: シルバーグロー
              cardStyle = {
                background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.12) 0%, rgba(169, 169, 169, 0.06) 100%)',
                borderColor: '#c0c0c0',
                boxShadow: '0 0 20px rgba(192, 192, 192, 0.3)',
              };
            } else if (isTop3) {
              // 🥉 3位: ブロンズグロー
              cardStyle = {
                background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.12) 0%, rgba(184, 115, 51, 0.06) 100%)',
                borderColor: '#cd7f32',
                boxShadow: '0 0 15px rgba(205, 127, 50, 0.25)',
              };
            } else if (isBottom30) {
              // ⚠️ 下位30%: 警告カラー
              cardStyle = {
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
              };
            } else if (isCurrentUser) {
              cardStyle = {
                borderColor: color,
                backgroundColor: `${color}10`,
                boxShadow: `0 0 12px ${color}40`
              };
            } else {
              cardStyle = { borderColor: 'rgba(255,255,255,0.1)' };
            }

            return (
              <div
                key={userId || member?.name || `member-${index}`}
                id={userId ? `ranking-row-${userId}` : undefined}
                ref={isCurrentUser ? userRowRef : null}
                onClick={() => {
                  setSelectedMember({ ...member, energy, totalEarned, guardianData });
                  setSelectedTeam({ name, color, type });
                }}
                className={cardClass}
                style={cardStyle}
              >
                {/* 1位のキラキラエフェクト */}
                {isTop1 && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-shimmer" />
                  </div>
                )}

                {/* ランクアイコン */}
                <div className={`flex-shrink-0 flex justify-center ${isTop1 ? 'w-12' : isTop2 ? 'w-10' : isTop3 ? 'w-9' : 'w-8'}`}>
                  {isTop1 ? (
                    <div className="relative">
                      <Crown className="w-10 h-10 text-yellow-400 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }} />
                      <div className="absolute -top-1 -right-1 text-xs">✨</div>
                    </div>
                  ) : isTop2 ? (
                    <Medal className="w-8 h-8 text-slate-300" style={{ filter: 'drop-shadow(0 0 4px rgba(192, 192, 192, 0.6))' }} />
                  ) : isTop3 ? (
                    <Award className="w-7 h-7 text-amber-600" style={{ filter: 'drop-shadow(0 0 4px rgba(205, 127, 50, 0.6))' }} />
                  ) : isBottom30 ? (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-bold text-slate-400">#{rank}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-slate-400">#{rank}</span>
                  )}
                </div>

                {/* 守護神アバター */}
                <div className={`relative flex-shrink-0 ${isTop1 ? 'w-14 h-14' : isTop2 ? 'w-12 h-12' : isTop3 ? 'w-11 h-11' : 'w-10 h-10'}`}>
                  {guardianData ? (
                    <>
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: `${isTop1 ? '3px' : '2px'} solid ${isTop1 ? '#ffd700' : guardianData.color}40`,
                          boxShadow: isTop1 ? '0 0 15px rgba(255, 215, 0, 0.5)' : undefined
                        }}
                      />
                      <div className="absolute inset-0.5 rounded-full overflow-hidden">
                        <Image
                          src={guardianData.imagePath}
                          alt={guardianData.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </>
                  ) : (
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: '#94a3b815', border: '2px solid #94a3b840' }}
                    >
                      🥚
                    </div>
                  )}
                </div>

                {/* メンバー情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-semibold text-slate-100 truncate ${isTop1 ? 'text-base' : 'text-sm'}`}>
                      {member?.name || '匿名'}
                    </p>
                    {isCurrentUser && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `${color}25`, color }}>
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

                {/* エナジー表示（累計獲得） */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold ${isTop1 ? 'text-xl text-yellow-400' : isTop2 ? 'text-lg text-slate-300' : isTop3 ? 'text-lg text-amber-600' : 'text-base'}`}
                    style={!isTop1 && !isTop2 && !isTop3 ? { color } : undefined}>
                    {totalEarned >= 1000 ? `${(totalEarned / 1000).toFixed(1)}k` : totalEarned}E
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </div>
            );
          })}

          {/* 下位30%への激励メッセージ */}
          {totalMembers >= 4 && (
            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 text-center">
              <div className="flex items-center justify-center gap-2 text-orange-400">
                <Flame className="w-5 h-5" />
                <span className="font-bold">追い上げよう！</span>
                <Flame className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400 mt-1">毎日の報告と活動でランクアップを目指そう 🔥</p>
            </div>
          )}
        </div>
      )}

      {/* 📜 称号の歴史 */}
      {teamTitles && (teamTitles.energyKing || teamTitles.streakMaster || teamTitles.growthStar) && (
        <div className="rounded-xl p-3 border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-300">📜 称号の歴史</h3>
          </div>

          {/* 今週 */}
          <div className="border-l-2 border-yellow-500/50 pl-3 py-1">
            <p className="text-[10px] text-slate-500 mb-1">
              🗓 {(() => {
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()} 〜 ${endOfWeek.getMonth() + 1}/${endOfWeek.getDate()}`;
              })()}
            </p>
            <div className="flex flex-wrap gap-1">
              {teamTitles.energyKing && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-[9px]">
                  <span>{teamTitles.energyKing.emoji}</span>
                  <span className="text-yellow-300">{teamTitles.energyKing.name}</span>
                </span>
              )}
              {teamTitles.streakMaster && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-[9px]">
                  <span>{teamTitles.streakMaster.emoji}</span>
                  <span className="text-orange-300">{teamTitles.streakMaster.name}</span>
                </span>
              )}
              {teamTitles.growthStar && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px]">
                  <span>{teamTitles.growthStar.emoji}</span>
                  <span className="text-emerald-300">{teamTitles.growthStar.name}</span>
                </span>
              )}
            </div>
          </div>

          <p className="text-[9px] text-slate-600 mt-2 text-center">
            称号履歴は毎週更新されます
          </p>
        </div>
      )}

      {/* 詳細モーダル */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        teamColor={selectedTeam?.color || '#EC4899'}
        teamName={selectedTeam?.name || ''}
        isShorts={selectedTeam?.type === 'shorts'}
      />

      {/* キラキラアニメーション用CSS */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
