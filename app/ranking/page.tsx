"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown, Star, Flame } from "lucide-react";
import {
  teams,
  getRankingByViews,
  getMVPRanking,
  periodOptions,
  type PeriodType,
  type TeamType,
} from "@/lib/dummy-data";

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        bg: "bg-gradient-to-r from-pink-500 to-pink-600",
        glow: "shadow-[0_0_25px_rgba(236,72,153,0.6)]",
        text: "text-white",
        border: "border-pink-400",
        neonColor: "#ec4899",
      };
    case 2:
      return {
        bg: "bg-gradient-to-r from-cyan-500 to-cyan-600",
        glow: "shadow-[0_0_25px_rgba(6,182,212,0.6)]",
        text: "text-white",
        border: "border-cyan-400",
        neonColor: "#06b6d4",
      };
    case 3:
      return {
        bg: "bg-gradient-to-r from-yellow-400 to-yellow-500",
        glow: "shadow-[0_0_25px_rgba(234,179,8,0.6)]",
        text: "text-gray-900",
        border: "border-yellow-400",
        neonColor: "#eab308",
      };
    default:
      return {
        bg: "bg-muted/50",
        glow: "",
        text: "text-foreground",
        border: "border-transparent",
        neonColor: "",
      };
  }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return Crown;
    case 2:
      return Medal;
    case 3:
      return Award;
    default:
      return null;
  }
};

export default function RankingPage() {
  const [period, setPeriod] = useState<PeriodType>("week");
  const [rankingType, setRankingType] = useState<"views" | "mvp">("views");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            ランキング
          </h1>
          <p className="text-muted-foreground mt-2">
            各チームのパフォーマンスランキング
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.id}
              variant={period === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(option.id as PeriodType)}
              className={
                period === option.id
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0"
                  : ""
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Ranking Type Tabs */}
      <Tabs defaultValue="views" onValueChange={(v) => setRankingType(v as "views" | "mvp")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="views" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            再生数ランキング
          </TabsTrigger>
          <TabsTrigger value="mvp" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            MVP（投稿継続）ランキング
          </TabsTrigger>
        </TabsList>

        {/* Views Ranking */}
        <TabsContent value="views" className="space-y-8">
          {/* Overall Top 3 */}
          <Card className="bg-gradient-to-br from-background to-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                全体トップ3（再生数）
              </CardTitle>
              <CardDescription>全チーム合計のトップパフォーマー</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {getRankingByViews("all", period)
                  .slice(0, 3)
                  .map((member, index) => {
                    const rank = index + 1;
                    const style = getRankStyle(rank);
                    const Icon = getRankIcon(rank);
                    const teamInfo = teams.find((t) => t.id === member.team);

                    return (
                      <div
                        key={member.id}
                        className={`relative flex flex-col items-center p-6 rounded-2xl ${style.bg} ${style.glow} border-2 ${style.border}`}
                        style={{
                          boxShadow: `0 0 30px ${style.neonColor}50, inset 0 0 20px ${style.neonColor}20`,
                        }}
                      >
                        {Icon && <Icon className={`w-10 h-10 ${style.text} mb-3`} />}
                        <div className="text-5xl mb-2">
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                        </div>
                        <span className="text-3xl mb-2">{member.avatar}</span>
                        <p className={`${style.text} font-bold text-xl`}>{member.name}</p>
                        <p className={`text-sm ${rank === 3 ? "text-gray-700" : "text-white/80"}`}>
                          {teamInfo?.name}
                        </p>
                        <div className="mt-4 text-center">
                          <p className={`text-xs ${rank === 3 ? "text-gray-700" : "text-white/70"}`}>
                            再生数
                          </p>
                          <p className={`${style.text} font-bold text-2xl`}>
                            {member.stats.views.toLocaleString()}
                          </p>
                        </div>
                        {/* Glow effect overlay */}
                        <div
                          className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
                          style={{
                            background: `radial-gradient(circle at center, ${style.neonColor}40 0%, transparent 70%)`,
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Team Rankings */}
          {teams.map((team) => {
            const rankings = getRankingByViews(team.id, period);

            return (
              <Card key={team.id} className="overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${team.gradient}`} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${team.gradient}`}
                    />
                    {team.name}
                  </CardTitle>
                  <CardDescription>再生数ランキング</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankings.map((member, index) => {
                      const rank = index + 1;
                      const style = getRankStyle(rank);
                      const Icon = getRankIcon(rank);

                      return (
                        <div
                          key={member.id}
                          className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.01] ${
                            rank <= 3
                              ? `${style.bg} ${style.glow} ${style.border}`
                              : "bg-muted/30 border-transparent hover:bg-muted/50"
                          }`}
                          style={
                            rank <= 3
                              ? {
                                  boxShadow: `0 0 20px ${style.neonColor}40`,
                                }
                              : {}
                          }
                        >
                          <div className="flex items-center gap-4">
                            {/* Rank Badge */}
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                                rank <= 3 ? style.text : "bg-muted text-muted-foreground"
                              }`}
                              style={
                                rank <= 3
                                  ? {
                                      background: "rgba(255,255,255,0.2)",
                                      backdropFilter: "blur(10px)",
                                    }
                                  : {}
                              }
                            >
                              {Icon ? <Icon className="w-6 h-6" /> : rank}
                            </div>

                            {/* Member Info */}
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{member.avatar}</span>
                              <div>
                                <p className={`font-semibold text-lg ${rank <= 3 ? style.text : ""}`}>
                                  {member.name}
                                </p>
                                <p
                                  className={`text-sm ${
                                    rank <= 3
                                      ? rank === 3
                                        ? "text-gray-700"
                                        : "text-white/80"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  #{rank} ランカー
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex gap-6 text-right">
                            <div>
                              <p
                                className={`text-xs ${
                                  rank <= 3
                                    ? rank === 3
                                      ? "text-gray-700"
                                      : "text-white/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                再生数
                              </p>
                              <p className={`font-bold text-lg ${rank <= 3 ? style.text : ""}`}>
                                {member.stats.views.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p
                                className={`text-xs ${
                                  rank <= 3
                                    ? rank === 3
                                      ? "text-gray-700"
                                      : "text-white/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                インプレッション
                              </p>
                              <p className={`font-bold text-lg ${rank <= 3 ? style.text : ""}`}>
                                {member.stats.impressions.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* MVP Ranking */}
        <TabsContent value="mvp" className="space-y-8">
          {/* Overall MVP Top 3 */}
          <Card className="bg-gradient-to-br from-background to-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-500" />
                MVP トップ3（投稿継続率）
              </CardTitle>
              <CardDescription>
                目標を完璧に守っているメンバーを表彰
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {getMVPRanking("all", period)
                  .slice(0, 3)
                  .map((member, index) => {
                    const rank = index + 1;
                    const style = getRankStyle(rank);
                    const Icon = getRankIcon(rank);
                    const teamInfo = teams.find((t) => t.id === member.team);

                    return (
                      <div
                        key={member.id}
                        className={`relative flex flex-col items-center p-6 rounded-2xl ${style.bg} ${style.glow} border-2 ${style.border}`}
                        style={{
                          boxShadow: `0 0 30px ${style.neonColor}50, inset 0 0 20px ${style.neonColor}20`,
                        }}
                      >
                        {Icon && <Icon className={`w-10 h-10 ${style.text} mb-3`} />}
                        <div className="text-5xl mb-2">
                          {member.stats.isPerfect ? "🔥" : rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                        </div>
                        <span className="text-3xl mb-2">{member.avatar}</span>
                        <p className={`${style.text} font-bold text-xl`}>{member.name}</p>
                        <p className={`text-sm ${rank === 3 ? "text-gray-700" : "text-white/80"}`}>
                          {teamInfo?.name}
                        </p>
                        <div className="mt-4 text-center">
                          <p className={`text-xs ${rank === 3 ? "text-gray-700" : "text-white/70"}`}>
                            達成率
                          </p>
                          <p className={`${style.text} font-bold text-2xl`}>
                            {member.stats.achievementRate}%
                          </p>
                          {member.stats.isPerfect && (
                            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
                              🏆 PERFECT
                            </span>
                          )}
                        </div>
                        {/* Glow effect overlay */}
                        <div
                          className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
                          style={{
                            background: `radial-gradient(circle at center, ${style.neonColor}40 0%, transparent 70%)`,
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Team MVP Rankings */}
          {teams.map((team) => {
            const rankings = getMVPRanking(team.id, period);

            return (
              <Card key={team.id} className="overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${team.gradient}`} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${team.gradient}`}
                    />
                    {team.name}
                  </CardTitle>
                  <CardDescription>投稿継続（MVP）ランキング</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankings.map((member, index) => {
                      const rank = index + 1;
                      const style = getRankStyle(rank);
                      const Icon = getRankIcon(rank);

                      return (
                        <div
                          key={member.id}
                          className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.01] ${
                            rank <= 3
                              ? `${style.bg} ${style.glow} ${style.border}`
                              : "bg-muted/30 border-transparent hover:bg-muted/50"
                          }`}
                          style={
                            rank <= 3
                              ? {
                                  boxShadow: `0 0 20px ${style.neonColor}40`,
                                }
                              : {}
                          }
                        >
                          <div className="flex items-center gap-4">
                            {/* Rank Badge */}
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                                rank <= 3 ? style.text : "bg-muted text-muted-foreground"
                              }`}
                              style={
                                rank <= 3
                                  ? {
                                      background: "rgba(255,255,255,0.2)",
                                      backdropFilter: "blur(10px)",
                                    }
                                  : {}
                              }
                            >
                              {Icon ? <Icon className="w-6 h-6" /> : rank}
                            </div>

                            {/* Member Info */}
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{member.avatar}</span>
                              <div>
                                <p className={`font-semibold text-lg flex items-center gap-2 ${rank <= 3 ? style.text : ""}`}>
                                  {member.name}
                                  {member.stats.isPerfect && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full ${
                                        rank <= 3 ? "bg-white/20" : "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                      }`}
                                    >
                                      MVP
                                    </span>
                                  )}
                                </p>
                                <p
                                  className={`text-sm ${
                                    rank <= 3
                                      ? rank === 3
                                        ? "text-gray-700"
                                        : "text-white/80"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  目標達成率 {member.stats.achievementRate}%
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex gap-6 text-right">
                            <div>
                              <p
                                className={`text-xs ${
                                  rank <= 3
                                    ? rank === 3
                                      ? "text-gray-700"
                                      : "text-white/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                投稿数
                              </p>
                              <p className={`font-bold text-lg ${rank <= 3 ? style.text : ""}`}>
                                {member.stats.posts} / {member.stats.targetPosts}
                              </p>
                            </div>
                            <div>
                              <p
                                className={`text-xs ${
                                  rank <= 3
                                    ? rank === 3
                                      ? "text-gray-700"
                                      : "text-white/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                達成率
                              </p>
                              <p className={`font-bold text-lg ${rank <= 3 ? style.text : ""}`}>
                                {member.stats.achievementRate}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
