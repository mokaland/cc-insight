"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { GlassCard, NeonGauge } from "@/components/glass-card";
import { Eye, TrendingUp, Video, Users, Target, Briefcase, LogOut, ShoppingBag } from "lucide-react";
import {
  teams,
  getOverallStats,
  getTeamStats,
  getMembersByTeam,
  getMemberStats,
  periodOptions,
  type PeriodType,
  type TeamType,
} from "@/lib/dummy-data";

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodType>("week");
  const [selectedTeam, setSelectedTeam] = useState<TeamType | "all">("all");

  const overallStats = getOverallStats(period);

  const teamIcons = {
    fukugyou: Briefcase,
    taishoku: LogOut,
    buppan: ShoppingBag,
  };

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

        {/* Period Selector - 1Q to 4Q */}
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.id}
              variant={period === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(option.id as PeriodType)}
              className={
                period === option.id
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                  : "border-white/20 hover:bg-white/10"
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overall Stats - White Glassmorphism Cards */}
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
          glowColor="#06b6d4" 
          title="総インプレッション" 
          icon={<TrendingUp className="h-5 w-5" />} 
          value={overallStats.totalImpressions.toLocaleString()} 
          subtitle="全チーム合計"
        >
          <div></div>
        </GlassCard>

        <GlassCard 
          glowColor="#eab308" 
          title="総投稿数" 
          icon={<Video className="h-5 w-5" />} 
          value={overallStats.totalPosts.toLocaleString()} 
          subtitle="全チーム合計"
        >
          <div></div>
        </GlassCard>

        <GlassCard 
          glowColor="#a855f7" 
          title="アクティブメンバー" 
          icon={<Users className="h-5 w-5" />} 
          value={overallStats.totalMembers} 
          subtitle={`平均達成率: ${overallStats.avgAchievementRate}%`}
        >
          <div></div>
        </GlassCard>
      </div>

      {/* Team Tabs */}
      <Tabs defaultValue="all" onValueChange={(v) => setSelectedTeam(v as TeamType | "all")}>
        <TabsList className="grid w-full grid-cols-4 mb-6 bg-white/10 backdrop-blur-xl border border-white/20">
          <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            全チーム
          </TabsTrigger>
          {teams.map((team) => (
            <TabsTrigger 
              key={team.id} 
              value={team.id}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              {team.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All Teams Content */}
        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {teams.map((team) => {
              const teamStats = getTeamStats(team.id, period);
              const Icon = teamIcons[team.id];

              return (
                <GlassCard key={team.id} glowColor={team.color} className="overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${team.gradient} mb-4`} />
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="h-5 w-5" style={{ color: team.color }} />
                    <h3 className="font-semibold">{team.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    目標: 1日{team.dailyPostGoal}投稿
                  </p>
                  
                  <div className="flex items-center justify-center mb-4">
                    <CircularProgress
                      value={Math.min(teamStats.achievementRate, 100)}
                      color={team.color}
                      size={100}
                    />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">再生数</span>
                      <span className="font-medium">{teamStats.totalViews.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">投稿数</span>
                      <span className="font-medium">{teamStats.totalPosts} / {teamStats.totalTargetPosts}</span>
                    </div>
                  </div>

                  {/* Neon Progress Bar */}
                  <div className="mt-4">
                    <NeonGauge
                      value={teamStats.totalPosts}
                      max={teamStats.totalTargetPosts}
                      label="達成率"
                      color={team.color}
                    />
                  </div>

                  {teamStats.perfectMembers > 0 && (
                    <p className="text-sm text-center mt-4">
                      🏆 MVP: {teamStats.perfectMembers}人が目標達成！
                    </p>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </TabsContent>

        {/* Individual Team Content */}
        {teams.map((team) => {
          const teamStats = getTeamStats(team.id, period);
          const teamMembers = getMembersByTeam(team.id);
          const Icon = teamIcons[team.id];

          return (
            <TabsContent key={team.id} value={team.id} className="space-y-6">
              {/* Team Header Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <GlassCard glowColor={team.color} title="再生数" icon={<Eye className="h-5 w-5" />} value={teamStats.totalViews.toLocaleString()}>
                  <div></div>
                </GlassCard>
                <GlassCard glowColor={team.color} title="インプレッション" icon={<TrendingUp className="h-5 w-5" />} value={teamStats.totalImpressions.toLocaleString()}>
                  <div></div>
                </GlassCard>
                <GlassCard glowColor={team.color} title="投稿数" icon={<Video className="h-5 w-5" />} value={`${teamStats.totalPosts} / ${teamStats.totalTargetPosts}`}>
                  <div></div>
                </GlassCard>
                <GlassCard glowColor={team.color} title="達成率" icon={<Target className="h-5 w-5" />} value={`${teamStats.achievementRate}%`}>
                  <div></div>
                </GlassCard>
              </div>

              {/* Team Achievement Meter */}
              <GlassCard glowColor={team.color} className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="h-5 w-5" style={{ color: team.color }} />
                  <h3 className="text-lg font-semibold">{team.name} 達成率メーター</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  目標: 1日{team.dailyPostGoal}投稿 × 7日 = 週{team.dailyPostGoal * 7}投稿
                </p>
                
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <CircularProgress
                    value={Math.min(teamStats.achievementRate, 100)}
                    color={team.color}
                    size={180}
                    strokeWidth={15}
                  />
                  <div className="flex-1 space-y-4 w-full">
                    <NeonGauge
                      value={teamStats.totalPosts}
                      max={teamStats.totalTargetPosts}
                      label="週間達成率"
                      color={team.color}
                    />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-muted-foreground">目標投稿数</p>
                        <p className="text-xl font-bold">{teamStats.totalTargetPosts}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-muted-foreground">実績投稿数</p>
                        <p className="text-xl font-bold">{teamStats.totalPosts}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Member List */}
              <GlassCard glowColor={team.color}>
                <h3 className="text-lg font-semibold mb-4">メンバー別パフォーマンス</h3>
                <div className="space-y-3">
                  {teamMembers
                    .map((member) => ({
                      ...member,
                      stats: getMemberStats(member, period),
                    }))
                    .sort((a, b) => b.stats.views - a.stats.views)
                    .map((member, index) => (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                          member.stats.isPerfect
                            ? "border-2 bg-white/10"
                            : "border-white/10 bg-white/5"
                        }`}
                        style={member.stats.isPerfect ? { borderColor: team.color, boxShadow: `0 0 20px ${team.color}40` } : {}}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{member.avatar}</span>
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              {member.name}
                              {member.stats.isPerfect && (
                                <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: `linear-gradient(90deg, ${team.color}, #a855f7)` }}>
                                  MVP
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              達成率: {member.stats.achievementRate}%
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-muted-foreground">再生数</p>
                            <p className="font-bold">{member.stats.views.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">投稿数</p>
                            <p className="font-bold">{member.stats.posts} / {member.stats.targetPosts}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </GlassCard>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
