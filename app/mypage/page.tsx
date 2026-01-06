"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { 
  calculateLevel, 
  calculateLevelProgress, 
  BADGES, 
  getBadgeRarityColor,
  calculateStreak,
  getAchievementColor,
  getAchievementMessage 
} from "@/lib/gamification";
import { getReportsByPeriod, calculateTeamStats, teams } from "@/lib/firestore";
import { TrendingUp, Target, Award, Flame, Calendar, Eye, Video, Loader2, LogOut } from "lucide-react";
import Link from "next/link";

export default function MyPage() {
  const { user, userProfile, logout } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [teamRanking, setTeamRanking] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<number>(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !userProfile) return;

      try {
        setLoading(true);

        // 全期間のレポートを取得（累計再生数計算用）
        const allReports = await getReportsByPeriod("1q"); // 適当な長期間
        const myReports = allReports.filter(r => r.userEmail === user.email);

        // 累計再生数計算
        let total = 0;
        myReports.forEach(report => {
          if (report.teamType === "shorts") {
            total += report.igViews || 0;
          }
        });
        setTotalViews(total);

        // 今週のレポート
        const weeklyReports = await getReportsByPeriod("week");
        const myWeeklyReports = weeklyReports.filter(r => r.userEmail === user.email);
        setReports(myWeeklyReports);

        // 週次統計とチーム内ランキング
        const team = teams.find(t => t.id === userProfile.team);
        if (team) {
          const stats = calculateTeamStats(weeklyReports, userProfile.team);
          const myStats = stats.members.find((m: any) => m.name === userProfile.displayName);
          setWeeklyStats(myStats || { views: 0, posts: 0, achievementRate: 0 });
          
          // チーム内ランキング（今週の再生数順、TOP5）
          const ranking = stats.members
            .sort((a: any, b: any) => b.views - a.views)
            .slice(0, 5)
            .map((member: any, index: number) => ({
              ...member,
              rank: index + 1,
              isMe: member.name === userProfile.displayName
            }));
          setTeamRanking(ranking);
          
          // 自分の順位を取得
          const myRankIndex = stats.members
            .sort((a: any, b: any) => b.views - a.views)
            .findIndex((m: any) => m.name === userProfile.displayName);
          setMyRank(myRankIndex + 1);
        }

        // ストリーク計算
        const streakData = calculateStreak(myReports);
        setStreak(streakData);

      } catch (error) {
        console.error("データ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-muted-foreground">マイページを読み込み中...</p>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">ログインしてください</p>
      </div>
    );
  }

  const levelProgress = calculateLevelProgress(totalViews);
  const { currentLevel, nextLevel, progress, viewsToNext } = levelProgress;

  // 仮のバッジ（後で実際のFirestoreデータと連携）
  const earnedBadges = [
    BADGES.find(b => b.id === "firstReport"),
    totalViews >= 10000 ? BADGES.find(b => b.id === "firstViral") : null,
    streak.currentStreak >= 7 ? BADGES.find(b => b.id === "streak7") : null,
  ].filter(Boolean);

  const achievementRate = weeklyStats?.achievementRate || 0;
  const achievementColor = getAchievementColor(achievementRate);
  const achievementMessage = getAchievementMessage(achievementRate);

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            マイページ
          </h1>
          <p className="text-muted-foreground mt-2">
            {userProfile.displayName} の冒険の記録
          </p>
        </div>
      </div>

      {/* レベル＆経験値カード */}
      <GlassCard glowColor={currentLevel.color} className="p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* レベルアイコン */}
          <div className="flex-shrink-0">
            <div 
              className="w-32 h-32 rounded-full flex items-center justify-center text-6xl relative"
              style={{
                backgroundColor: `${currentLevel.color}20`,
                boxShadow: `0 0 40px ${currentLevel.glowColor}, inset 0 0 20px ${currentLevel.glowColor}`,
                border: `3px solid ${currentLevel.color}`,
              }}
            >
              {currentLevel.icon}
              {/* パルスアニメーション */}
              <span 
                className="absolute inset-0 rounded-full animate-ping opacity-75"
                style={{ 
                  border: `2px solid ${currentLevel.color}`,
                  boxShadow: `0 0 20px ${currentLevel.glowColor}`
                }}
              />
            </div>
          </div>

          {/* レベル情報 */}
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold" style={{ color: currentLevel.color }}>
                Lv.{currentLevel.level} {currentLevel.name}
              </h2>
            </div>
            
            <p className="text-muted-foreground mb-4">
              累計経験値（再生数）: {totalViews.toLocaleString()} XP
            </p>

            {/* 経験値ゲージ */}
            {nextLevel ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">次のレベルまで</span>
                  <span className="font-bold" style={{ color: nextLevel.color }}>
                    Lv.{nextLevel.level} {nextLevel.name} {nextLevel.icon}
                  </span>
                </div>
                
                {/* プログレスバー */}
                <div className="relative w-full h-8 bg-white/10 rounded-full overflow-hidden border border-white/20">
                  <div
                    className="h-full transition-all duration-1000 ease-out relative"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${currentLevel.color}, ${nextLevel.color})`,
                      boxShadow: `0 0 20px ${currentLevel.glowColor}`,
                    }}
                  >
                    {/* ネオングロー効果 */}
                    <div 
                      className="absolute inset-0 animate-pulse"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${nextLevel.color}40, transparent)`,
                      }}
                    />
                  </div>
                  
                  {/* パーセンテージ表示 */}
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-lg">
                    {progress}%
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  あと {viewsToNext.toLocaleString()} XP でレベルアップ！
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: currentLevel.color }}>
                  🏆 最高レベル到達！
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  あなたは真のレジェンドです
                </p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 今週の再生数 */}
        <GlassCard glowColor="#ec4899" title="今週の再生数" icon={<Eye className="h-5 w-5" />} value={weeklyStats?.views?.toLocaleString() || "0"} subtitle="Weekly Views">
          <div></div>
        </GlassCard>

        {/* 今週の投稿数 */}
        <GlassCard glowColor="#06b6d4" title="今週の投稿数" icon={<Video className="h-5 w-5" />} value={weeklyStats?.posts?.toString() || "0"} subtitle="Weekly Posts">
          <div></div>
        </GlassCard>

        {/* 目標達成率 */}
        <GlassCard 
          glowColor={achievementColor} 
          title="目標達成率" 
          icon={<Target className="h-5 w-5" />} 
          value={`${achievementRate}%`}
          subtitle={achievementMessage}
        >
          <div></div>
        </GlassCard>

        {/* ストリーク */}
        <GlassCard glowColor="#ef4444" title="連続投稿" icon={<Flame className="h-5 w-5" />} value={`${streak.currentStreak}日`} subtitle={`最長: ${streak.longestStreak}日`}>
          <div></div>
        </GlassCard>
      </div>

      {/* チーム内ランキング */}
      {teamRanking.length > 0 && (
        <GlassCard glowColor="#f59e0b" className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="text-2xl">🏆</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">チーム内ランキング</h3>
              <p className="text-sm text-muted-foreground">
                {teams.find(t => t.id === userProfile?.team)?.name} - 今週の再生数TOP5
              </p>
            </div>
            {myRank > 0 && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">あなたの順位</div>
                <div className="text-2xl font-bold text-yellow-500">#{myRank}</div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {teamRanking.map((member) => {
              const isTopThree = member.rank <= 3;
              const medalEmoji = member.rank === 1 ? "🥇" : member.rank === 2 ? "🥈" : member.rank === 3 ? "🥉" : "";
              
              return (
                <div
                  key={member.name}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    member.isMe
                      ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                      : isTopThree
                      ? "bg-white/10 border-white/20"
                      : "bg-white/5 border-white/10"
                  } hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-4">
                    {/* 順位 */}
                    <div className="flex-shrink-0 w-12 text-center">
                      {medalEmoji ? (
                        <div className="text-3xl">{medalEmoji}</div>
                      ) : (
                        <div className="text-2xl font-bold text-muted-foreground">
                          #{member.rank}
                        </div>
                      )}
                    </div>

                    {/* 名前 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{member.name}</p>
                        {member.isMe && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.posts} 投稿
                      </p>
                    </div>

                    {/* 再生数 */}
                    <div className="text-right">
                      <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        {member.views.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                  </div>

                  {/* プログレスバー（TOP3のみ） */}
                  {isTopThree && (
                    <div className="mt-3">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((member.views / teamRanking[0].views) * 100, 100)}%`,
                            boxShadow: "0 0 10px rgba(234,179,8,0.5)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 全体ランキングへのリンク */}
          <div className="mt-6 text-center">
            <Link href="/ranking">
              <Button
                variant="outline"
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                全体ランキングを見る
              </Button>
            </Link>
          </div>
        </GlassCard>
      )}

      {/* バッジコレクション */}
      <GlassCard glowColor="#a855f7" className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Award className="h-6 w-6 text-purple-500" />
          <h3 className="text-xl font-bold">獲得バッジ</h3>
          <span className="text-sm text-muted-foreground ml-auto">
            {earnedBadges.length} / {BADGES.length}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {BADGES.map((badge) => {
            const isEarned = earnedBadges.some(b => b?.id === badge.id);
            const rarityColor = getBadgeRarityColor(badge.rarity);

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isEarned
                    ? "bg-white/10 border-opacity-100 hover:scale-105"
                    : "bg-white/5 border-white/10 opacity-40 grayscale"
                }`}
                style={{
                  borderColor: isEarned ? rarityColor : undefined,
                  boxShadow: isEarned ? `0 0 15px ${rarityColor}40` : undefined,
                }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <p className="text-xs font-semibold mb-1">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {isEarned && (
                    <div 
                      className="mt-2 text-xs font-bold"
                      style={{ color: rarityColor }}
                    >
                      ✓ 獲得済み
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* クイックアクション */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/report">
          <GlassCard glowColor="#22c55e" className="p-6 cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="text-center">
              <div className="text-5xl mb-3">📝</div>
              <h3 className="text-lg font-bold mb-2">今日の報告</h3>
              <p className="text-sm text-muted-foreground">
                報告してストリークを継続しよう
              </p>
            </div>
          </GlassCard>
        </Link>

        <Link href="/ranking">
          <GlassCard glowColor="#eab308" className="p-6 cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="text-center">
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="text-lg font-bold mb-2">ランキング</h3>
              <p className="text-sm text-muted-foreground">
                他のメンバーと競い合おう
              </p>
            </div>
          </GlassCard>
        </Link>
      </div>

      {/* ログアウト（モバイル用） */}
      <div className="md:hidden">
        <GlassCard glowColor="#ef4444" className="p-6">
          <Button
            onClick={logout}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}
