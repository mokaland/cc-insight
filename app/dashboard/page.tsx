"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { GlassCard, TodayProgress, NeonGauge } from "@/components/glass-card";
import {
  Eye,
  TrendingUp,
  Video,
  Users,
  Target,
  Calendar,
  Bookmark,
  Heart,
  Instagram,
  Youtube,
  ExternalLink,
  Copy,
  Smartphone,
  Briefcase,
  UserMinus,
} from "lucide-react";
import {
  getReportsByPeriod,
  calculateTeamStats,
  getReportsByCustomPeriod,
  teams,
} from "@/lib/services/report";

interface TeamTabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const teamTabs: TeamTabConfig[] = [
  {
    id: "fukugyou",
    label: "副業",
    icon: <Briefcase className="h-4 w-4" />,
    color: "#ec4899",
    description: "副業・サイドビジネス関連のショート動画を発信",
  },
  {
    id: "taishoku",
    label: "退職サポート",
    icon: <UserMinus className="h-4 w-4" />,
    color: "#06b6d4",
    description: "退職・キャリアサポート関連のコンテンツ発信",
  },
  {
    id: "buppan",
    label: "スマホ物販",
    icon: <Smartphone className="h-4 w-4" />,
    color: "#f59e0b",
    description: "スマホ転売・物販系のX運用",
  },
];

const periodOptions = [
  { id: "today", label: "今日" },
  { id: "week", label: "今週" },
  { id: "month", label: "今月" },
  { id: "1q", label: "1Q" },
  { id: "2q", label: "2Q" },
  { id: "3q", label: "3Q" },
  { id: "4q", label: "4Q" },
  { id: "custom", label: "期間指定" },
];

interface MemberPostUrls {
  name: string;
  urls: { date: string; url: string }[];
}

function TeamDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTeam = searchParams.get("team") || "fukugyou";
  const [activeTeam, setActiveTeam] = useState(initialTeam);

  const [period, setPeriod] = useState("week");
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const [memberPostUrls, setMemberPostUrls] = useState<MemberPostUrls[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentTeamConfig = teamTabs.find((t) => t.id === activeTeam) || teamTabs[0];
  const team = teams.find((t) => t.id === activeTeam) || teams[0];

  const handleTeamChange = (teamId: string) => {
    setActiveTeam(teamId);
    router.push(`/dashboard?team=${teamId}`, { scroll: false });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let reports;
        if (period === "custom" && customStartDate && customEndDate) {
          reports = await getReportsByCustomPeriod(customStartDate, customEndDate, activeTeam);
        } else if (period === "custom") {
          reports = await getReportsByPeriod("week", activeTeam);
        } else {
          reports = await getReportsByPeriod(period, activeTeam);
        }

        const stats = calculateTeamStats(reports, activeTeam);
        setTeamStats(stats);

        if (activeTeam === "buppan") {
          const urlsByMember: { [key: string]: { date: string; url: string }[] } = {};
          reports.forEach((report: any) => {
            const name = report.displayName || report.userId;
            const date = report.date || "";
            const url = report.xPostUrl || "";
            if (url) {
              if (!urlsByMember[name]) urlsByMember[name] = [];
              urlsByMember[name].push({ date, url });
            }
          });
          const memberUrls = Object.entries(urlsByMember).map(([name, urls]) => ({
            name,
            urls: urls.sort((a, b) => b.date.localeCompare(a.date)),
          }));
          setMemberPostUrls(memberUrls);
        }
      } catch (error: any) {
        console.error("データ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [period, customStartDate, customEndDate, activeTeam]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    setShowCustomDatePicker(newPeriod === "custom");
  };

  const copyMemberUrls = (memberName: string) => {
    const member = memberPostUrls.find((m) => m.name === memberName);
    if (!member) return;
    navigator.clipboard.writeText(member.urls.map((u) => u.url).join("\n"));
    setCopiedId(memberName);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllUrls = () => {
    const allUrls = memberPostUrls.flatMap((m) => m.urls.map((u) => u.url));
    navigator.clipboard.writeText(allUrls.join("\n"));
    setCopiedId("all");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading || !teamStats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: currentTeamConfig.color }} />
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  const todayPosts = Math.floor(teamStats.totalPosts / 7);
  const todayTarget = team.dailyPostGoal * teamStats.memberCount;
  const isXTeam = team.type === "x";

  return (
    <div className="space-y-6">
      {/* Team Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
        {teamTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTeamChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTeam === tab.id ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" : "text-muted-foreground hover:bg-white/10"}`}
            style={{ boxShadow: activeTeam === tab.id ? `0 0 20px ${tab.color}40` : undefined }}
          >
            {tab.icon}
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: currentTeamConfig.color, boxShadow: `0 0 20px ${currentTeamConfig.color}` }} />
            {currentTeamConfig.label}チーム
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            {isXTeam ? <span className="font-bold">𝕏</span> : <><Instagram className="h-4 w-4" /><span className="text-xs">TikTok</span><Youtube className="h-4 w-4" /></>}
            {currentTeamConfig.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.id}
              variant={period === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange(option.id)}
              className={period === option.id ? "text-white border-0" : ""}
              style={{
                background: period === option.id ? `linear-gradient(to right, ${currentTeamConfig.color}, #a855f7)` : undefined,
                boxShadow: period === option.id ? `0 0 20px ${currentTeamConfig.color}50` : undefined,
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <GlassCard glowColor={currentTeamConfig.color} className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" style={{ color: currentTeamConfig.color }} />
            <h3 className="text-lg font-semibold">カスタム期間を指定</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">開始日</label>
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">終了日</label>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setPeriod("custom"); setShowCustomDatePicker(false); }} disabled={!customStartDate || !customEndDate} className="flex-1 text-white" style={{ background: `linear-gradient(to right, ${currentTeamConfig.color}, #a855f7)` }}>適用</Button>
              <Button variant="outline" onClick={() => { setShowCustomDatePicker(false); setPeriod("week"); }}>キャンセル</Button>
            </div>
          </div>
        </GlassCard>
      )}

      <TodayProgress current={todayPosts} target={todayTarget} teamColor={currentTeamConfig.color} teamName={team.name} />

      {/* KPIs */}
      {isXTeam ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <GlassCard glowColor={currentTeamConfig.color} title="総いいね数" icon={<Heart className="h-5 w-5" />} value={(teamStats.totalLikes || 0).toLocaleString()} subtitle="今週の合計"><div></div></GlassCard>
            <GlassCard glowColor={currentTeamConfig.color} title="総リプライ数" icon={<TrendingUp className="h-5 w-5" />} value={(teamStats.totalReplies || 0).toLocaleString()} subtitle="今週の合計"><div></div></GlassCard>
            <GlassCard glowColor={currentTeamConfig.color} title="総投稿数" icon={<Video className="h-5 w-5" />} value={(teamStats.totalPosts || 0).toLocaleString()} subtitle="今週の合計"><div></div></GlassCard>
            <GlassCard glowColor={currentTeamConfig.color} title="アクティブメンバー" icon={<Users className="h-5 w-5" />} value={`${teamStats.memberCount || 0}人`} subtitle="報告済み人数"><div></div></GlassCard>
          </div>
          {memberPostUrls.length > 0 && (
            <GlassCard glowColor={currentTeamConfig.color}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><ExternalLink className="h-5 w-5" style={{ color: currentTeamConfig.color }} />投稿URL一覧</h3>
                <Button size="sm" variant="outline" onClick={copyAllUrls} className="gap-2"><Copy className="h-4 w-4" />{copiedId === "all" ? "コピー済み!" : "全URLをコピー"}</Button>
              </div>
              <div className="space-y-3">
                {memberPostUrls.map((member) => (
                  <div key={member.name} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{member.name}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => copyMemberUrls(member.name)}><Copy className="h-3 w-3 mr-1" />{copiedId === member.name ? "✓" : "コピー"}</Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{member.urls.length}件の投稿URL</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <GlassCard glowColor={currentTeamConfig.color} title="総再生数" icon={<Eye className="h-5 w-5" />} value={(teamStats.totalViews || 0).toLocaleString()} subtitle="今週の合計"><div></div></GlassCard>
            <GlassCard glowColor={currentTeamConfig.color} title="総インプレッション" icon={<TrendingUp className="h-5 w-5" />} value={(teamStats.totalImpressions || 0).toLocaleString()} subtitle="今週の合計"><div></div></GlassCard>
            <GlassCard glowColor={currentTeamConfig.color} title="総投稿数" icon={<Video className="h-5 w-5" />} value={(teamStats.totalPosts || 0).toLocaleString()} subtitle="今週の合計"><div></div></GlassCard>
            <GlassCard glowColor={currentTeamConfig.color} title="アクティブメンバー" icon={<Users className="h-5 w-5" />} value={`${teamStats.memberCount || 0}人`} subtitle="報告済み人数"><div></div></GlassCard>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <GlassCard glowColor="#22c55e" title="プロフアクセス数" icon={<Users className="h-5 w-5" />} value={(teamStats.totalProfileAccess || 0).toLocaleString()} subtitle="Instagram"><div></div></GlassCard>
            <GlassCard glowColor="#f59e0b" title="外部タップ数" icon={<TrendingUp className="h-5 w-5" />} value={(teamStats.totalExternalTaps || 0).toLocaleString()} subtitle="リンククリック"><div></div></GlassCard>
            <GlassCard glowColor="#8b5cf6" title="インタラクション" icon={<Eye className="h-5 w-5" />} value={(teamStats.totalInteractions || 0).toLocaleString()} subtitle="エンゲージメント"><div></div></GlassCard>
            <GlassCard glowColor={currentTeamConfig.color} title="ストーリー投稿" icon={<Video className="h-5 w-5" />} value={(teamStats.totalStories || 0).toString()} subtitle="週間合計"><div></div></GlassCard>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <GlassCard glowColor="#e1306c" title="Instagram" icon={<Instagram className="h-5 w-5" />} value={(teamStats.totalIgFollowers || 0).toLocaleString()} subtitle="総フォロワー数"><div></div></GlassCard>
            <GlassCard glowColor="#ff0000" title="YouTube" icon={<Youtube className="h-5 w-5" />} value={(teamStats.totalYtFollowers || 0).toLocaleString()} subtitle="総フォロワー数"><div></div></GlassCard>
            <GlassCard glowColor="#000000" title="TikTok" icon={<Video className="h-5 w-5" />} value={(teamStats.totalTiktokFollowers || 0).toLocaleString()} subtitle="総フォロワー数"><div></div></GlassCard>
          </div>
        </>
      )}

      {/* Achievement */}
      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard glowColor={currentTeamConfig.color} className="p-8">
          <div className="flex items-center gap-2 mb-6"><Target className="h-5 w-5" style={{ color: currentTeamConfig.color }} /><h3 className="text-lg font-semibold">目標達成率</h3></div>
          <p className="text-sm text-muted-foreground mb-6">目標: 1日{team.dailyPostGoal}投稿 × 7日 = 週{team.dailyPostGoal * 7}投稿/人</p>
          <div className="flex flex-col items-center">
            <CircularProgress value={Math.min(teamStats.achievementRate, 100)} color={currentTeamConfig.color} size={180} strokeWidth={15} />
            <p className="mt-4 text-muted-foreground">{teamStats.totalPosts} / {teamStats.totalTargetPosts} 件達成</p>
            <div className="w-full mt-6"><NeonGauge value={teamStats.totalPosts} max={teamStats.totalTargetPosts} label="チーム達成進捗" color={currentTeamConfig.color} /></div>
          </div>
        </GlassCard>
        <GlassCard glowColor={currentTeamConfig.color} className="p-8">
          <div className="flex items-center gap-2 mb-6"><Calendar className="h-5 w-5" style={{ color: currentTeamConfig.color }} /><h3 className="text-lg font-semibold">チーム概要</h3></div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5 border" style={{ borderColor: `${currentTeamConfig.color}30` }}><p className="text-sm text-muted-foreground">アクティブメンバー</p><p className="text-2xl font-bold" style={{ color: currentTeamConfig.color }}>{teamStats.memberCount}人</p></div>
            <div className="p-4 rounded-lg bg-white/5 border" style={{ borderColor: `${currentTeamConfig.color}30` }}><p className="text-sm text-muted-foreground">達成率</p><p className="text-2xl font-bold" style={{ color: currentTeamConfig.color }}>{teamStats.achievementRate}%</p></div>
            <div className="p-4 rounded-lg bg-white/5 border" style={{ borderColor: `${currentTeamConfig.color}30` }}><p className="text-sm text-muted-foreground">100%達成者</p><p className="text-2xl font-bold" style={{ color: currentTeamConfig.color }}>{teamStats.perfectMembers}人</p></div>
          </div>
        </GlassCard>
      </div>

      {/* Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glowColor={currentTeamConfig.color} title="総交流数" icon={<Heart className="h-5 w-5" />} value={teamStats.members.reduce((sum: number, m: any) => sum + (m.interactions || 0), 0).toLocaleString()} subtitle="インタラクション合計"><div></div></GlassCard>
        <GlassCard glowColor={currentTeamConfig.color} title="報告回数" icon={<Bookmark className="h-5 w-5" />} value={teamStats.members.reduce((sum: number, m: any) => sum + (m.reports || 0), 0).toLocaleString()} subtitle="総レポート数"><div></div></GlassCard>
        <GlassCard glowColor={currentTeamConfig.color} title="平均達成率" icon={<TrendingUp className="h-5 w-5" />} value={`${teamStats.achievementRate}%`} subtitle="チーム平均"><div></div></GlassCard>
      </div>

      {/* Member Rankings */}
      <GlassCard glowColor={currentTeamConfig.color}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="h-5 w-5" style={{ color: currentTeamConfig.color }} />メンバー別パフォーマンス</h3>
        {teamStats.members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground"><p>まだレポートが送信されていません</p></div>
        ) : (
          <div className="space-y-3">
            {teamStats.members.map((member: any, index: number) => (
              <div key={member.name} className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${member.achievementRate >= 100 ? "border-pink-500 bg-pink-500/10" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${index < 3 ? "text-white" : "bg-white/10"}`} style={{ background: index === 0 ? `linear-gradient(to right, ${currentTeamConfig.color}, #a855f7)` : index < 3 ? `${currentTeamConfig.color}80` : undefined }}>{index + 1}</span>
                  <div>
                    <p className="font-semibold flex items-center gap-2">{member.name}{member.achievementRate >= 100 && <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">🔥 MVP</span>}</p>
                    <p className="text-sm text-muted-foreground">達成率: {member.achievementRate}% ({member.reports}回報告)</p>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  {isXTeam ? (
                    <><div className="text-right"><p className="text-muted-foreground">いいね</p><p className="font-bold">{(member.likes || 0).toLocaleString()}</p></div><div className="text-right"><p className="text-muted-foreground">リプライ</p><p className="font-bold">{member.replies || 0}</p></div></>
                  ) : (
                    <><div className="text-right"><p className="text-muted-foreground">再生数</p><p className="font-bold">{(member.views || 0).toLocaleString()}</p></div><div className="text-right"><p className="text-muted-foreground">投稿数</p><p className="font-bold">{member.posts || 0}</p></div><div className="text-right"><p className="text-muted-foreground">交流数</p><p className="font-bold">{(member.interactions || 0).toLocaleString()}</p></div></>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <TeamDashboardContent />
    </Suspense>
  );
}
