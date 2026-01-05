"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { GlassCard, TodayProgress, NeonGauge } from "@/components/glass-card";
import { Eye, TrendingUp, Video, Users, Target, Calendar, Bookmark, Heart, Twitter } from "lucide-react";
import { teams, getTeamStats, getMembersByTeam, getMemberStats, periodOptions, type PeriodType } from "@/lib/dummy-data";

const team = teams.find((t) => t.id === "buppan")!;

export default function SmartphoneTeamPage() {
  const [period, setPeriod] = useState<PeriodType>("week");
  const teamStats = getTeamStats("buppan", period);
  const teamMembers = getMembersByTeam("buppan");
  const todayPosts = 18;
  const todayTarget = team.dailyPostGoal * teamMembers.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: team.color, boxShadow: `0 0 20px ${team.color}` }} />
            スマホ物販チーム
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Twitter className="h-4 w-4" />
            X（旧Twitter）で物販・EC・せどり情報を発信
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button key={option.id} variant={period === option.id ? "default" : "outline"} size="sm" onClick={() => setPeriod(option.id as PeriodType)}
              className={period === option.id ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-[0_0_20px_rgba(234,179,8,0.5)]" : "border-white/20 hover:bg-white/10"}>
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <TodayProgress current={todayPosts} target={todayTarget} teamColor={team.color} teamName={team.name} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard glowColor="#eab308" title="総再生数" icon={<Eye className="h-5 w-5" />} value={teamStats.totalViews.toLocaleString()} subtitle="全メンバー合計"><div></div></GlassCard>
        <GlassCard glowColor="#eab308" title="インプレッション" icon={<TrendingUp className="h-5 w-5" />} value={teamStats.totalImpressions.toLocaleString()} subtitle="リーチ数"><div></div></GlassCard>
        <GlassCard glowColor="#eab308" title="投稿数" icon={<Video className="h-5 w-5" />} value={`${teamStats.totalPosts} / ${teamStats.totalTargetPosts}`} subtitle="目標に対する実績"><div></div></GlassCard>
        <GlassCard glowColor="#eab308" title="MVP達成者" icon={<Users className="h-5 w-5" />} value={`${teamStats.perfectMembers}人`} subtitle={`${teamStats.memberCount}人中`}><div></div></GlassCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard glowColor="#eab308" className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">目標達成率</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">目標: 1日{team.dailyPostGoal}ポスト（X）× 7日 = 週{team.dailyPostGoal * 7}ポスト/人</p>
          <div className="flex flex-col items-center">
            <CircularProgress value={Math.min(teamStats.achievementRate, 100)} color="#eab308" size={180} strokeWidth={15} />
            <div className="w-full mt-6">
              <NeonGauge value={teamStats.totalPosts} max={teamStats.totalTargetPosts} label="チーム達成進捗" color="#eab308" />
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="#eab308" className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">週別進捗</h3>
          </div>
          <div className="space-y-5">
            {teamMembers[0]?.weeklyData.map((week) => {
              const weekTotal = teamMembers.reduce((sum, m) => sum + (m.weeklyData.find((w) => w.week === week.week)?.posts || 0), 0);
              const weekTarget = teamMembers.reduce((sum, m) => sum + (m.weeklyData.find((w) => w.week === week.week)?.targetPosts || 0), 0);
              return <NeonGauge key={week.week} value={weekTotal} max={weekTarget} label={`Week ${week.week}`} color="#eab308" />;
            })}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glowColor="#fbbf24" title="保存数" icon={<Bookmark className="h-5 w-5" />} value="15,678" subtitle="ブックマーク数"><div></div></GlassCard>
        <GlassCard glowColor="#f59e0b" title="いいね" icon={<Heart className="h-5 w-5" />} value="67,890" subtitle="総いいね数"><div></div></GlassCard>
        <GlassCard glowColor="#eab308" title="エンゲージメント率" icon={<TrendingUp className="h-5 w-5" />} value="6.1%" subtitle="平均エンゲージメント"><div></div></GlassCard>
      </div>

      <GlassCard glowColor="#eab308">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-yellow-500" />
          メンバー別パフォーマンス
        </h3>
        <div className="space-y-3">
          {teamMembers.map((member) => ({ ...member, stats: getMemberStats(member, period) }))
            .sort((a, b) => b.stats.views - a.stats.views)
            .map((member, index) => (
              <div key={member.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${member.stats.isPerfect ? "border-yellow-500 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.3)]" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${index === 0 ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.6)]" : index < 3 ? "bg-yellow-400/50 text-white" : "bg-white/10"}`}>{index + 1}</span>
                  <span className="text-2xl">{member.avatar}</span>
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {member.name}
                      {member.stats.isPerfect && <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white">🔥 MVP</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">達成率: {member.stats.achievementRate}%</p>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-right"><p className="text-muted-foreground">再生数</p><p className="font-bold">{member.stats.views.toLocaleString()}</p></div>
                  <div className="text-right"><p className="text-muted-foreground">投稿数</p><p className="font-bold">{member.stats.posts} / {member.stats.targetPosts}</p></div>
                </div>
              </div>
            ))}
        </div>
      </GlassCard>
    </div>
  );
}
