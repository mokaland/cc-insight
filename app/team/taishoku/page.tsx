"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { Eye, TrendingUp, Video, Users, Target, Calendar } from "lucide-react";
import {
  teams,
  getTeamStats,
  getMembersByTeam,
  getMemberStats,
  periodOptions,
  type PeriodType,
} from "@/lib/dummy-data";

const team = teams.find((t) => t.id === "taishoku")!;

export default function TaishokuTeamPage() {
  const [period, setPeriod] = useState<PeriodType>("week");
  
  const teamStats = getTeamStats("taishoku", period);
  const teamMembers = getMembersByTeam("taishoku");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-500" />
            {team.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            退職・転職・キャリアチェンジ関連のコンテンツを発信
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
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0"
                  : ""
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総再生数</CardTitle>
            <Eye className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamStats.totalViews.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">インプレッション</CardTitle>
            <TrendingUp className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamStats.totalImpressions.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">投稿数</CardTitle>
            <Video className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamStats.totalPosts} / {teamStats.totalTargetPosts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">メンバー数</CardTitle>
            <Users className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.memberCount}人</div>
            <p className="text-xs text-muted-foreground">
              MVP: {teamStats.perfectMembers}人
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Achievement & Progress */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Circular Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-500" />
              目標達成率
            </CardTitle>
            <CardDescription>
              目標: 1日{team.dailyPostGoal}投稿 × 7日 = 週{team.dailyPostGoal * 7}投稿
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <CircularProgress 
              value={Math.min(teamStats.achievementRate, 100)} 
              color="#06b6d4" 
              size={180}
              strokeWidth={15}
            />
            <p className="mt-4 text-muted-foreground">
              {teamStats.totalPosts} / {teamStats.totalTargetPosts} 件達成
            </p>
            {/* Neon Progress Bar */}
            <div className="w-full mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>達成進捗</span>
                <span className="font-bold">{teamStats.achievementRate}%</span>
              </div>
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(teamStats.achievementRate, 100)}%`,
                    boxShadow: "0 0 15px #06b6d4, 0 0 30px #06b6d440",
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-500" />
              週別進捗
            </CardTitle>
            <CardDescription>週ごとの投稿数と目標</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamMembers[0]?.weeklyData.map((week) => {
              // 全メンバーの週間合計を計算
              const weekTotal = teamMembers.reduce(
                (sum, m) => sum + (m.weeklyData.find((w) => w.week === week.week)?.posts || 0),
                0
              );
              const weekTarget = teamMembers.reduce(
                (sum, m) => sum + (m.weeklyData.find((w) => w.week === week.week)?.targetPosts || 0),
                0
              );
              const weekRate = Math.round((weekTotal / weekTarget) * 100);

              return (
                <div key={week.week} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Week {week.week}</span>
                    <span className="text-muted-foreground">
                      {weekTotal} / {weekTarget} ({weekRate}%)
                    </span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                      style={{ 
                        width: `${Math.min(weekRate, 100)}%`,
                        boxShadow: "0 0 10px #06b6d4",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-500" />
            メンバー別パフォーマンス
          </CardTitle>
          <CardDescription>メンバーの詳細な統計</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers
              .map((member) => ({
                ...member,
                stats: getMemberStats(member, period),
              }))
              .sort((a, b) => b.stats.views - a.stats.views)
              .map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    member.stats.isPerfect
                      ? "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      : "border-transparent bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        index === 0
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                          : index === 1
                          ? "bg-cyan-400 text-white"
                          : index === 2
                          ? "bg-cyan-300 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-2xl">{member.avatar}</span>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {member.name}
                        {member.stats.isPerfect && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                            MVP
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        達成率: {member.stats.achievementRate}%
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-8 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">再生数</p>
                      <p className="font-bold">{member.stats.views.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">投稿数</p>
                      <p className="font-bold">
                        {member.stats.posts} / {member.stats.targetPosts}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">インプレッション</p>
                      <p className="font-bold">{member.stats.impressions.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
