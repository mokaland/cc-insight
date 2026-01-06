"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { Trophy, Crown, Medal, Eye, FileText, Heart, Loader2 } from "lucide-react";
import { subscribeToReports, calculateRankings, teams, Report } from "@/lib/firestore";

const periodOptions = [
  { id: "week", label: "今週" },
  { id: "month", label: "今月" },
  { id: "1q", label: "1Q" },
  { id: "2q", label: "2Q" },
  { id: "3q", label: "3Q" },
  { id: "4q", label: "4Q" },
];

const rankColors = [
  { bg: "from-pink-500 to-rose-500", glow: "#ec4899", icon: "👑" },
  { bg: "from-cyan-400 to-blue-500", glow: "#06b6d4", icon: "🥈" },
  { bg: "from-yellow-400 to-orange-500", glow: "#eab308", icon: "🥉" },
];

export default function RankingPage() {
  const [period, setPeriod] = useState("week");
  const [rankingType, setRankingType] = useState<"views" | "posts" | "activity">("views");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToReports((data) => {
      setReports(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const rankings = calculateRankings(reports, rankingType);
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              ランキング
            </span>
          </h1>
          <p className="text-muted-foreground mt-2">
            各チームのパフォーマンスランキング
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

      {/* Ranking Type Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        <Button
          variant={rankingType === "views" ? "default" : "ghost"}
          onClick={() => setRankingType("views")}
          className={rankingType === "views" ? "bg-pink-500/20 text-pink-400" : ""}
        >
          <Eye className="w-4 h-4 mr-2" />
          再生数ランキング
        </Button>
        <Button
          variant={rankingType === "posts" ? "default" : "ghost"}
          onClick={() => setRankingType("posts")}
          className={rankingType === "posts" ? "bg-cyan-500/20 text-cyan-400" : ""}
        >
          <FileText className="w-4 h-4 mr-2" />
          投稿数ランキング
        </Button>
        <Button
          variant={rankingType === "activity" ? "default" : "ghost"}
          onClick={() => setRankingType("activity")}
          className={rankingType === "activity" ? "bg-yellow-500/20 text-yellow-400" : ""}
        >
          <Heart className="w-4 h-4 mr-2" />
          活動量ランキング
        </Button>
      </div>

      {/* Empty State */}
      {rankings.length === 0 ? (
        <GlassCard glowColor="#a855f7" className="p-8 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold mb-2">まだランキングデータがありません</h3>
          <p className="text-muted-foreground mb-4">
            メンバーが報告を送信すると、ランキングが表示されます。
          </p>
          <Button
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            onClick={() => window.open("/report", "_blank")}
          >
            報告フォームを開く
          </Button>
        </GlassCard>
      ) : (
        <>
          {/* Top 3 Podium */}
          <GlassCard glowColor="#a855f7" className="p-8">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-500" />
              全体トップ3（{rankingType === "views" ? "再生数" : rankingType === "posts" ? "投稿数" : "活動量"}）
            </h2>
            <p className="text-muted-foreground mb-6">全チーム合計のトップパフォーマー</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {top3.map((member: any, index) => (
                <div
                  key={`${member.team}-${member.name}`}
                  className={`relative p-6 rounded-2xl bg-gradient-to-br ${rankColors[index]?.bg || "from-gray-500 to-gray-600"} text-white overflow-hidden`}
                  style={{
                    boxShadow: `0 0 40px ${rankColors[index]?.glow || "#666"}60`,
                  }}
                >
                  {/* Rank Badge */}
                  <div className="absolute top-4 right-4 text-4xl">
                    {rankColors[index]?.icon || "🏅"}
                  </div>
                  
                  {/* Rank Number */}
                  <div className="text-6xl font-black opacity-20 absolute -bottom-4 -left-2">
                    {index + 1}
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="text-4xl mb-2">
                      {index === 0 ? "👑" : index === 1 ? "🥈" : "🥉"}
                    </div>
                    <h3 className="text-xl font-bold">{member.name}</h3>
                    <p className="text-sm opacity-80 mb-4">{member.teamName}</p>
                    <div className="text-3xl font-bold">
                      {rankingType === "views" 
                        ? member.views.toLocaleString() 
                        : rankingType === "posts"
                        ? member.posts
                        : member.activity.toLocaleString()}
                    </div>
                    <p className="text-sm opacity-80">
                      {rankingType === "views" ? "再生数" : rankingType === "posts" ? "投稿数" : "活動量"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Rest of Rankings */}
          {rest.length > 0 && (
            <GlassCard glowColor="#06b6d4" className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Medal className="w-5 h-5 text-cyan-500" />
                4位以降
              </h3>
              <div className="space-y-3">
                {rest.map((member: any, index) => (
                  <div
                    key={`${member.team}-${member.name}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
                        {index + 4}
                      </span>
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.teamName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {rankingType === "views" 
                          ? member.views.toLocaleString() 
                          : rankingType === "posts"
                          ? member.posts
                          : member.activity.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {rankingType === "views" ? "再生数" : rankingType === "posts" ? "投稿数" : "活動量"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Team Rankings */}
          <div className="grid gap-6 md:grid-cols-3">
            {teams.map((team) => {
              const teamRankings = rankings.filter((m: any) => m.team === team.id);
              return (
                <GlassCard key={team.id} glowColor={team.color} className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <h3 className="font-semibold">{team.name}</h3>
                  </div>
                  {teamRankings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">データなし</p>
                  ) : (
                    <div className="space-y-2">
                      {teamRankings.slice(0, 5).map((member: any, idx) => (
                        <div
                          key={member.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-center">{idx + 1}</span>
                            <span>{member.name}</span>
                          </div>
                          <span className="font-medium">
                            {rankingType === "views" 
                              ? member.views.toLocaleString() 
                              : rankingType === "posts"
                              ? member.posts
                              : member.activity.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
