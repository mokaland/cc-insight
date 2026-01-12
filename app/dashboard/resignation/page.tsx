"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { GlassCard, TodayProgress, NeonGauge } from "@/components/glass-card";
import { Eye, TrendingUp, Video, Users, Target, Calendar, Bookmark, Heart, Instagram, Youtube } from "lucide-react";
import { getReportsByPeriod, calculateTeamStats, getReportsByCustomPeriod, teams } from "@/lib/services/report";

const team = teams.find((t) => t.id === "taishoku")!;

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

export default function ResignationTeamPage() {
  const [period, setPeriod] = useState("week");
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        let reports;

        if (period === "custom" && customStartDate && customEndDate) {
          reports = await getReportsByCustomPeriod(customStartDate, customEndDate, "taishoku");
        } else if (period === "custom") {
          reports = await getReportsByPeriod("week", "taishoku");
        } else {
          reports = await getReportsByPeriod(period, "taishoku");
        }

        const stats = calculateTeamStats(reports, "taishoku");
        setTeamStats(stats);
      } catch (error: any) {
        console.error("データ取得エラー:", error);
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          setError("データを準備中です（Firestoreインデックス構築中）。数分後に再度アクセスしてください。");
        } else if (error.code === 'permission-denied') {
          setError("データへのアクセス権限がありません。ログイン状態を確認してください。");
        } else {
          setError("データの取得に失敗しました。ページをリロードしてください。");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period, customStartDate, customEndDate]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod === "custom") {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
  };

  const applyCustomPeriod = () => {
    if (customStartDate && customEndDate) {
      setPeriod("custom");
      setShowCustomDatePicker(false);
    }
  };

  if (loading || !teamStats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  const todayPosts = Math.floor(teamStats.totalPosts / 7);
  const todayTarget = team.dailyPostGoal * teamStats.memberCount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full animate-pulse"
              style={{ backgroundColor: team.color, boxShadow: `0 0 20px ${team.color}` }}
            />
            退職サポートチーム
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            <span className="text-xs">TikTok</span>
            <Youtube className="h-4 w-4" />
            退職・転職サポート関連のショート動画を発信
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.id}
              variant={period === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange(option.id)}
              className={
                period === option.id
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                  : "!text-[oklch(0.145_0_0)] dark:!text-[oklch(0.985_0_0)]"
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <GlassCard glowColor={team.color} className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" style={{ color: team.color }} />
              <h3 className="text-lg font-semibold">カスタム期間を指定</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">開始日</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">終了日</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={applyCustomPeriod}
                  disabled={!customStartDate || !customEndDate}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                >
                  適用
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomDatePicker(false);
                    setPeriod("week");
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
            {period === "custom" && customStartDate && customEndDate && (
              <p className="text-sm text-muted-foreground mt-2">
                📅 表示期間: {customStartDate} 〜 {customEndDate}
              </p>
            )}
          </div>
        </GlassCard>
      )}

      {/* Today's Progress */}
      <TodayProgress
        current={todayPosts}
        target={todayTarget}
        teamColor={team.color}
        teamName={team.name}
      />

      {/* 全11項目完全実装 */}
      {/* 項目1-4: 基本指標 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard glowColor="#06b6d4" title="総再生数" icon={<Eye className="h-5 w-5" />} value={(teamStats.totalViews || 0).toLocaleString()} subtitle="今週の合計">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#06b6d4" title="総インプレッション" icon={<TrendingUp className="h-5 w-5" />} value={(teamStats.totalImpressions || 0).toLocaleString()} subtitle="今週の合計">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#06b6d4" title="総投稿数" icon={<Video className="h-5 w-5" />} value={(teamStats.totalPosts || 0).toLocaleString()} subtitle="今週の合計">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#06b6d4" title="アクティブメンバー" icon={<Users className="h-5 w-5" />} value={`${teamStats.memberCount || 0}人`} subtitle="報告済み人数">
          <div></div>
        </GlassCard>
      </div>

      {/* 項目5-8: Instagram詳細KPI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard glowColor="#22c55e" title="プロフアクセス数" icon={<Users className="h-5 w-5" />} value={(teamStats.totalProfileAccess || 0).toLocaleString()} subtitle="Instagram">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#f59e0b" title="外部タップ数" icon={<TrendingUp className="h-5 w-5" />} value={(teamStats.totalExternalTaps || 0).toLocaleString()} subtitle="リンククリック">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#8b5cf6" title="インタラクション" icon={<Eye className="h-5 w-5" />} value={(teamStats.totalInteractions || 0).toLocaleString()} subtitle="エンゲージメント">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#06b6d4" title="ストーリー投稿" icon={<Video className="h-5 w-5" />} value={(teamStats.totalStories || 0).toString()} subtitle="週間合計">
          <div></div>
        </GlassCard>
      </div>

      {/* 項目9-11: SNSフォロワー統計 */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glowColor="#e1306c" title="Instagram" icon={<Instagram className="h-5 w-5" />} value={(teamStats.totalIgFollowers || 0).toLocaleString()} subtitle="総フォロワー数">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#ff0000" title="YouTube" icon={<Youtube className="h-5 w-5" />} value={(teamStats.totalYtFollowers || 0).toLocaleString()} subtitle="総フォロワー数">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#000000" title="TikTok" icon={<Video className="h-5 w-5" />} value={(teamStats.totalTiktokFollowers || 0).toLocaleString()} subtitle="総フォロワー数">
          <div></div>
        </GlassCard>
      </div>

      {/* Achievement Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard glowColor="#06b6d4" className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-cyan-500" />
            <h3 className="text-lg font-semibold">目標達成率</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            目標: 1日{team.dailyPostGoal}投稿（Shorts）× 7日 = 週{team.dailyPostGoal * 7}投稿/人
          </p>

          <div className="flex flex-col items-center">
            <CircularProgress
              value={Math.min(teamStats.achievementRate, 100)}
              color="#06b6d4"
              size={180}
              strokeWidth={15}
            />
            <p className="mt-4 text-muted-foreground">
              {teamStats.totalPosts} / {teamStats.totalTargetPosts} 件達成
            </p>
            <div className="w-full mt-6">
              <NeonGauge value={teamStats.totalPosts} max={teamStats.totalTargetPosts} label="チーム達成進捗" color="#06b6d4" />
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="#06b6d4" className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-cyan-500" />
            <h3 className="text-lg font-semibold">チーム概要</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/20">
              <p className="text-sm text-muted-foreground">アクティブメンバー</p>
              <p className="text-2xl font-bold text-cyan-500">{teamStats.memberCount}人</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/20">
              <p className="text-sm text-muted-foreground">達成率</p>
              <p className="text-2xl font-bold text-cyan-500">{teamStats.achievementRate}%</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/20">
              <p className="text-sm text-muted-foreground">100%達成者</p>
              <p className="text-2xl font-bold text-cyan-500">{teamStats.perfectMembers}人</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Additional Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glowColor="#06b6d4" title="総交流数" icon={<Heart className="h-5 w-5" />} value={teamStats.members.reduce((sum: number, m: any) => sum + (m.interactions || 0), 0).toLocaleString()} subtitle="インタラクション合計"><div></div></GlassCard>
        <GlassCard glowColor="#0ea5e9" title="報告回数" icon={<Bookmark className="h-5 w-5" />} value={teamStats.members.reduce((sum: number, m: any) => sum + (m.reports || 0), 0).toLocaleString()} subtitle="総レポート数"><div></div></GlassCard>
        <GlassCard glowColor="#06b6d4" title="平均達成率" icon={<TrendingUp className="h-5 w-5" />} value={`${teamStats.achievementRate}%`} subtitle="チーム平均"><div></div></GlassCard>
      </div>

      {/* Member Rankings */}
      <GlassCard glowColor="#06b6d4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-500" />
          メンバー別パフォーマンス
        </h3>
        {teamStats.members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>まだレポートが送信されていません</p>
            <p className="text-sm mt-2">メンバーが日次レポートを送信すると、ここに表示されます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamStats.members.map((member: any, index: number) => (
              <div key={member.name} className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${member.achievementRate >= 100 ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${index === 0 ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)]" : index < 3 ? "bg-cyan-400/50 text-white" : "bg-white/10"}`}>{index + 1}</span>
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {member.name}
                      {member.achievementRate >= 100 && <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white">🔥 MVP</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">達成率: {member.achievementRate}% ({member.reports}回報告)</p>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-right"><p className="text-muted-foreground">再生数</p><p className="font-bold">{(member.views || 0).toLocaleString()}</p></div>
                  <div className="text-right"><p className="text-muted-foreground">投稿数</p><p className="font-bold">{member.posts || 0}</p></div>
                  <div className="text-right"><p className="text-muted-foreground">交流数</p><p className="font-bold">{(member.interactions || 0).toLocaleString()}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
