"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { GlassCard, TodayProgress, NeonGauge } from "@/components/glass-card";
import { Heart, MessageCircle, FileText, Users, Target, Calendar } from "lucide-react";
import { getReportsByPeriod, calculateTeamStats, teams } from "@/lib/firestore";

const team = teams.find((t) => t.id === "buppan")!;

const periodOptions = [
  { id: "week", label: "今週" },
  { id: "month", label: "今月" },
  { id: "1q", label: "1Q" },
  { id: "2q", label: "2Q" },
  { id: "3q", label: "3Q" },
  { id: "4q", label: "4Q" },
];

export default function BuppanTeamPage() {
  const [period, setPeriod] = useState("week");
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const reports = await getReportsByPeriod(period, "buppan");
        const stats = calculateTeamStats(reports, "buppan");
        setTeamStats(stats);
      } catch (error) {
        console.error("データ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period]);

  if (loading || !teamStats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
              style={{ backgroundColor: team.color, boxShadow: `0 0 15px ${team.color}` }}
            />
            {team.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            スマホ物販・X運用関連のコンテンツを発信
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.id}
              variant={period === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(option.id)}
              className={
                period === option.id
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
                  : ""
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Today's Progress */}
      <TodayProgress
        current={todayPosts}
        target={todayTarget}
        teamColor={team.color}
        teamName={team.name}
      />

      {/* Glassmorphism Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard glowColor="#eab308" title="総投稿数" icon={<FileText className="h-5 w-5" />} value={teamStats.totalPosts.toLocaleString()} subtitle="全メンバー合計">
          <div></div>
        </GlassCard>

        <GlassCard glowColor="#eab308" title="いいね回り" icon={<Heart className="h-5 w-5" />} value={teamStats.totalLikes.toLocaleString()} subtitle="エンゲージメント">
          <div></div>
        </GlassCard>

        <GlassCard glowColor="#eab308" title="リプライ回り" icon={<MessageCircle className="h-5 w-5" />} value={teamStats.totalReplies.toLocaleString()} subtitle="交流活動">
          <div></div>
        </GlassCard>

        <GlassCard glowColor="#eab308" title="MVP達成者" icon={<Users className="h-5 w-5" />} value={`${teamStats.perfectMembers}人`} subtitle={`${teamStats.memberCount}人中`}>
          <div></div>
        </GlassCard>
      </div>

      {/* X（Twitter）詳細統計 */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glowColor="#1da1f2" title="Xフォロワー合計" icon={<Users className="h-5 w-5" />} value={(teamStats.totalXFollowers || 0).toLocaleString()} subtitle="現在の総フォロワー数">
          <div></div>
        </GlassCard>

        <GlassCard glowColor="#1da1f2" title="いいね回り合計" icon={<Heart className="h-5 w-5" />} value={teamStats.totalLikes.toLocaleString()} subtitle="X (Twitter)">
          <div></div>
        </GlassCard>

        <GlassCard glowColor="#1da1f2" title="リプライ回り合計" icon={<MessageCircle className="h-5 w-5" />} value={teamStats.totalReplies.toLocaleString()} subtitle="X (Twitter)">
          <div></div>
        </GlassCard>
      </div>

      {/* Achievement & Progress */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Circular Progress */}
        <GlassCard glowColor="#eab308" className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">目標達成率</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            目標: 1日{team.dailyPostGoal}投稿 × 7日 = 週{team.dailyPostGoal * 7}投稿/人
          </p>
          
          <div className="flex flex-col items-center justify-center">
            <CircularProgress 
              value={Math.min(teamStats.achievementRate, 100)} 
              color="#eab308" 
              size={180}
              strokeWidth={15}
            />
            <p className="mt-4 text-muted-foreground">
              {teamStats.totalPosts} / {teamStats.totalTargetPosts} 件達成
            </p>
            
            <div className="w-full mt-6">
              <NeonGauge
                value={teamStats.totalPosts}
                max={teamStats.totalTargetPosts}
                label="チーム達成進捗"
                color="#eab308"
              />
            </div>
          </div>
        </GlassCard>

        {/* Team Overview */}
        <GlassCard glowColor="#eab308" className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">チーム概要</h3>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5 border border-yellow-500/20">
              <p className="text-sm text-muted-foreground">アクティブメンバー</p>
              <p className="text-2xl font-bold text-yellow-500">{teamStats.memberCount}人</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-yellow-500/20">
              <p className="text-sm text-muted-foreground">達成率</p>
              <p className="text-2xl font-bold text-yellow-500">{teamStats.achievementRate}%</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-yellow-500/20">
              <p className="text-sm text-muted-foreground">100%達成者</p>
              <p className="text-2xl font-bold text-yellow-500">{teamStats.perfectMembers}人</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Member Rankings */}
      <Card className="overflow-hidden border-yellow-500/20">
        <div className="h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-yellow-500" />
            メンバー別パフォーマンス
          </CardTitle>
          <CardDescription>各メンバーの詳細な統計</CardDescription>
        </CardHeader>
        <CardContent>
          {teamStats.members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>まだレポートが送信されていません</p>
              <p className="text-sm mt-2">メンバーが日次レポートを送信すると、ここに表示されます</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamStats.members.map((member: any, index: number) => (
                <div
                  key={member.name}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:scale-[1.01] ${
                    member.achievementRate >= 100
                      ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)] bg-yellow-500/5"
                      : "border-transparent bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.6)]"
                          : index === 1
                          ? "bg-yellow-400 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                          : index === 2
                          ? "bg-yellow-300 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {member.name}
                        {member.achievementRate >= 100 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                            🔥 MVP
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        達成率: {member.achievementRate}% ({member.reports}回報告)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-8 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">投稿数</p>
                      <p className="font-bold">{member.posts.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">いいね回り</p>
                      <p className="font-bold">{(member.likes || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">リプライ回り</p>
                      <p className="font-bold">{(member.replies || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
