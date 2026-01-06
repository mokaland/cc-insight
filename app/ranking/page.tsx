"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { Trophy, Eye, MessageCircle, Loader2 } from "lucide-react";
import { subscribeToReports, calculateRankings, Report } from "@/lib/firestore";

const rankingTypes = [
  { id: "views", label: "再生数", icon: Eye },
  { id: "posts", label: "投稿数", icon: MessageCircle },
  { id: "activity", label: "活動量", icon: Trophy },
] as const;

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        bg: "from-pink-500/30 to-pink-600/30",
        border: "border-pink-400",
        glow: "#ec4899",
        badge: "🥇",
        textColor: "text-pink-400",
        neon: "0 0 20px #ec4899, 0 0 40px #ec4899",
      };
    case 2:
      return {
        bg: "from-cyan-500/30 to-cyan-600/30",
        border: "border-cyan-400",
        glow: "#06b6d4",
        badge: "🥈",
        textColor: "text-cyan-400",
        neon: "0 0 20px #06b6d4, 0 0 40px #06b6d4",
      };
    case 3:
      return {
        bg: "from-yellow-500/30 to-yellow-600/30",
        border: "border-yellow-400",
        glow: "#eab308",
        badge: "🥉",
        textColor: "text-yellow-400",
        neon: "0 0 20px #eab308, 0 0 40px #eab308",
      };
    default:
      return {
        bg: "from-white/5 to-white/10",
        border: "border-white/20",
        glow: "#ffffff",
        badge: `#${rank}`,
        textColor: "text-white/70",
        neon: "none",
      };
  }
};

export default function RankingPage() {
  const [rankingType, setRankingType] = useState<"views" | "posts" | "activity">("views");
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

  const rankings = calculateRankings(reports, rankingType);

  if (loading && !initialLoadDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-muted-foreground">ランキングを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            🏆 ランキング
          </h1>
          <p className="text-muted-foreground mt-2">
            チーム内のトップパフォーマー
          </p>
        </div>
        <div className="flex gap-2">
          {rankingTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.id}
                variant={rankingType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => setRankingType(type.id)}
                className={
                  rankingType === type.id
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0"
                    : "border-white/20 hover:bg-white/10"
                }
              >
                <Icon className="w-4 h-4 mr-2" />
                {type.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {rankings.length === 0 && initialLoadDone && (
        <GlassCard glowColor="#a855f7" className="p-8 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold mb-2">まだランキングデータがありません</h3>
          <p className="text-muted-foreground mb-4">
            メンバーが報告を送信すると、ここにランキングが表示されます。
          </p>
          <Button
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            onClick={() => window.open("/report", "_blank")}
          >
            報告フォームを開く
          </Button>
        </GlassCard>
      )}

      {/* Top 3 */}
      {rankings.length >= 1 && (
        <div className="grid gap-6 md:grid-cols-3">
          {rankings.slice(0, 3).map((member: any, index: number) => {
            const rank = index + 1;
            const style = getRankStyle(rank);
            return (
              <GlassCard
                key={`${member.team}-${member.name}`}
                glowColor={style.glow}
                className={`relative overflow-hidden bg-gradient-to-br ${style.bg} border ${style.border} p-6`}
              >
                {/* Neon Border Effect */}
                <div
                  className="absolute inset-0 rounded-xl opacity-50"
                  style={{
                    boxShadow: style.neon,
                    pointerEvents: "none",
                  }}
                />

                {/* Rank Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">{style.badge}</span>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: member.teamColor,
                      boxShadow: `0 0 10px ${member.teamColor}`,
                    }}
                  >
                    {member.teamName}
                  </span>
                </div>

                {/* Member Info */}
                <div className="text-center">
                  <h3 className={`text-2xl font-bold ${style.textColor}`}>
                    {member.name}
                  </h3>
                  <p className="text-4xl font-black mt-3" style={{ textShadow: style.neon }}>
                    {rankingType === "views" && member.views.toLocaleString()}
                    {rankingType === "posts" && member.posts}
                    {rankingType === "activity" && member.activity.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rankingType === "views" && "再生"}
                    {rankingType === "posts" && "投稿"}
                    {rankingType === "activity" && "ポイント"}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Rest of Rankings */}
      {rankings.length > 3 && (
        <GlassCard glowColor="#a855f7" className="p-6">
          <h2 className="text-xl font-bold mb-4">4位以下</h2>
          <div className="space-y-3">
            {rankings.slice(3).map((member: any, index: number) => {
              const rank = index + 4;
              return (
                <div
                  key={`${member.team}-${member.name}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-white/50 w-8">
                      #{rank}
                    </span>
                    <span
                      className="w-2 h-8 rounded-full"
                      style={{
                        backgroundColor: member.teamColor,
                        boxShadow: `0 0 10px ${member.teamColor}`,
                      }}
                    />
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.teamName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {rankingType === "views" && member.views.toLocaleString()}
                      {rankingType === "posts" && member.posts}
                      {rankingType === "activity" && member.activity.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {rankingType === "views" && "再生"}
                      {rankingType === "posts" && "投稿"}
                      {rankingType === "activity" && "ポイント"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
