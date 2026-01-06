"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { Eye, TrendingUp, Video, Users, Loader2 } from "lucide-react";
import { subscribeToReports, calculateOverallStats, calculateTeamStats, teams, Report } from "@/lib/firestore";

const periodOptions = [
  { id: "week", label: "今週" },
  { id: "month", label: "今月" },
  { id: "1q", label: "1Q" },
  { id: "2q", label: "2Q" },
  { id: "3q", label: "3Q" },
  { id: "4q", label: "4Q" },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState("week");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    // 最大3秒でローディング終了
    const timeout = setTimeout(() => {
      setLoading(false);
      setInitialLoadDone(true);
    }, 3000);

    const unsubscribe = subscribeToReports((data) => {
      setReports(data);
      setLoading(false);
      setInitialLoadDone(true);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const overallStats = calculateOverallStats(reports);

  if (loading && !initialLoadDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-muted-foreground">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            全体サマリー
          </h1>
          <p className="text-muted-foreground mt-2">
            全チームのパフォーマンス概要
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.id}
              variant={period === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(option.id)}
              className={
                period === option.id
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0"
                  : "border-white/20 hover:bg-white/10"
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard
          glowColor="#ec4899"
          title="総再生数"
          icon={<Eye className="h-5 w-5" />}
          value={overallStats.totalViews.toLocaleString()}
          subtitle="全チーム合計"
        >
          <div></div>
        </GlassCard>
        <GlassCard
          glowColor="#a855f7"
          title="総インプレッション"
          icon={<TrendingUp className="h-5 w-5" />}
          value={overallStats.totalImpressions.toLocaleString()}
          subtitle="全チーム合計"
        >
          <div></div>
        </GlassCard>
        <GlassCard
          glowColor="#06b6d4"
          title="総投稿数"
          icon={<Video className="h-5 w-5" />}
          value={overallStats.totalPosts.toString()}
          subtitle="全チーム合計"
        >
          <div></div>
        </GlassCard>
        <GlassCard
          glowColor="#eab308"
          title="アクティブメンバー"
          icon={<Users className="h-5 w-5" />}
          value={`${overallStats.activeMembers}人`}
          subtitle="報告済み"
        >
          <div></div>
        </GlassCard>
      </div>

      {/* Team Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
        >
          全チーム
        </Button>
        {teams.map((team) => (
          <Button
            key={team.id}
            variant="outline"
            size="sm"
            className="border-white/20 hover:bg-white/10"
          >
            {team.name}
          </Button>
        ))}
      </div>

      {/* Team Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {teams.map((team) => {
          const teamStats = calculateTeamStats(reports, team.id);
          return (
            <GlassCard
              key={team.id}
              glowColor={team.color}
              className="p-6 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-4 h-4 rounded-full animate-pulse"
                  style={{
                    backgroundColor: team.color,
                    boxShadow: `0 0 15px ${team.color}`,
                  }}
                />
                <h3 className="text-lg font-semibold">{team.name}</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">メンバー</span>
                  <span className="font-bold">{teamStats.memberCount}人</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">総再生数</span>
                  <span className="font-bold">{teamStats.totalViews.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">投稿数</span>
                  <span className="font-bold">{teamStats.totalPosts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">達成率</span>
                  <span 
                    className="font-bold"
                    style={{ color: teamStats.achievementRate >= 80 ? "#22c55e" : team.color }}
                  >
                    {teamStats.achievementRate}%
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(teamStats.achievementRate, 100)}%`,
                      backgroundColor: team.color,
                      boxShadow: `0 0 10px ${team.color}`,
                    }}
                  />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Empty State */}
      {reports.length === 0 && initialLoadDone && (
        <GlassCard glowColor="#a855f7" className="p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">まだデータがありません</h3>
          <p className="text-muted-foreground mb-4">
            メンバーが /report から報告を送信すると、ここにリアルタイムで表示されます。
          </p>
          <Button
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            onClick={() => window.open("/report", "_blank")}
          >
            報告フォームを開く
          </Button>
        </GlassCard>
      )}
    </div>
  );
}
