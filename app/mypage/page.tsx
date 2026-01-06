"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { 
  getTeamType,
  getGuardianProgress,
  getTeamAccentColor,
  getValueUnit,
  formatValue,
  getLegendRewardStatus,
  getActiveMutation,
  getHighestStreakBadge,
  getEarnedStreakBadges,
  STREAK_BADGES,
  getRarityColor,
  getRarityGlow
} from "@/lib/guardian-system";
import { calculateStreak } from "@/lib/gamification";
import { getReportsByPeriod, teams } from "@/lib/firestore";
import { Loader2, Sparkles, Lock, Crown, Flame, Award } from "lucide-react";
import Link from "next/link";

export default function MyPage() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });

  useEffect(() => {
    const loadData = async () => {
      if (!user || !userProfile) return;

      try {
        setLoading(true);

        // 全期間のレポートを取得
        const allReports = await getReportsByPeriod("1q");
        const myReports = allReports.filter(r => r.userEmail === user.email);

        // チームタイプに応じた累計値を計算
        const teamType = getTeamType(userProfile.team);
        let total = 0;

        myReports.forEach(report => {
          if (teamType === "shorts") {
            // 動画チーム：再生数
            total += report.igViews || 0;
          } else {
            // Xチーム：インプレッション
            // 注：現在のFirestoreにはインプレッション項目がないため、
            // 仮でいいね+リプライ×100で簡易計算（後でFirestoreに追加）
            const estimatedImpressions = ((report.likeCount || 0) + (report.replyCount || 0)) * 100;
            total += estimatedImpressions;
          }
        });

        setTotalValue(total);

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

  // チーム情報取得
  const teamType = getTeamType(userProfile.team);
  const teamAccentColor = getTeamAccentColor(teamType);
  const valueUnit = getValueUnit(teamType);
  const teamInfo = teams.find(t => t.id === userProfile.team);

  // ガーディアン進化情報
  const guardianProgress = getGuardianProgress(totalValue, teamType);
  const { currentStage, nextStage, progress, valueToNext } = guardianProgress;

  // Legend特典
  const legendReward = getLegendRewardStatus(totalValue, teamType);

  // 隠し変異
  const activeMutation = getActiveMutation(totalValue, teamType);

  // 継続バッジ
  const highestStreakBadge = getHighestStreakBadge(streak.currentStreak);
  const earnedStreakBadges = getEarnedStreakBadges(streak.currentStreak);

  return (
    <div className="space-y-8 pb-8">
      {/* ヘッダー */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" style={{ color: teamAccentColor }}>
          マイページ
        </h1>
        <p className="text-muted-foreground">
          {userProfile.displayName} の冒険の記録
        </p>
        {highestStreakBadge && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{highestStreakBadge.emoji}</span>
            <span className="font-bold" style={{ color: highestStreakBadge.color }}>
              {highestStreakBadge.japaneseName}
            </span>
          </div>
        )}
      </div>

      {/* ガーディアン進化エリア */}
      <GlassCard glowColor={currentStage.glowColor} className="p-8">
        <div className="flex flex-col gap-6">
          {/* ガーディアン表示 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* アバター */}
            <div className="flex-shrink-0 relative">
              <div 
                className="w-40 h-40 rounded-full flex items-center justify-center text-8xl relative"
                style={{
                  backgroundColor: `${currentStage.color}20`,
                  boxShadow: `0 0 60px ${currentStage.glowColor}, 0 0 40px ${currentStage.glowColor}, inset 0 0 30px ${currentStage.glowColor}`,
                  border: `4px solid ${currentStage.color}`,
                }}
              >
                {currentStage.emoji}
                
                {/* パルスアニメーション */}
                <span 
                  className="absolute inset-0 rounded-full animate-ping opacity-40"
                  style={{ 
                    border: `3px solid ${currentStage.color}`,
                    boxShadow: `0 0 30px ${currentStage.glowColor}`
                  }}
                />

                {/* 継続バッジ（100日以上で王冠表示） */}
                {streak.currentStreak >= 100 && (
                  <div className="absolute -top-4 -right-4 text-4xl animate-bounce">
                    {streak.currentStreak >= 200 ? "👑" : "⚔️"}
                  </div>
                )}

                {/* 隠し変異エフェクト */}
                {activeMutation && (
                  <div 
                    className="absolute -bottom-2 text-3xl"
                    style={{ 
                      filter: `drop-shadow(0 0 10px ${activeMutation.color})`
                    }}
                  >
                    {activeMutation.emoji}
                  </div>
                )}
              </div>

              {/* Stage表示 */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                <div 
                  className="px-4 py-1 rounded-full text-xs font-bold text-white"
                  style={{ 
                    backgroundColor: currentStage.color,
                    boxShadow: `0 0 20px ${currentStage.glowColor}`
                  }}
                >
                  Stage {currentStage.stage}
                </div>
              </div>
            </div>

            {/* 進化情報 */}
            <div className="flex-1 w-full">
              <div className="mb-4">
                <h2 className="text-3xl font-bold mb-2" style={{ color: currentStage.color }}>
                  {currentStage.japaneseName}
                </h2>
                <p className="text-sm text-muted-foreground mb-2">
                  {currentStage.name}
                </p>
                <p className="text-sm" style={{ color: currentStage.color }}>
                  {currentStage.description}
                </p>
              </div>

              {/* 累計値表示 */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                  {formatValue(totalValue, teamType)}
                </span>
                <span className="text-xl text-muted-foreground">{valueUnit}</span>
              </div>

              {/* 進化ゲージ */}
              {nextStage ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">次の進化まで</span>
                    <span className="font-bold" style={{ color: nextStage.color }}>
                      {nextStage.japaneseName} {nextStage.emoji}
                    </span>
                  </div>
                  
                  <div className="relative w-full h-10 bg-white/10 rounded-full overflow-hidden border-2 border-white/20">
                    <div
                      className="h-full transition-all duration-1000 ease-out relative"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${currentStage.color}, ${nextStage.color})`,
                        boxShadow: `0 0 30px ${currentStage.glowColor}`,
                      }}
                    >
                      <div 
                        className="absolute inset-0 animate-pulse"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${nextStage.color}60, transparent)`,
                        }}
                      />
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {progress}%
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      あと {formatValue(valueToNext, teamType)} {valueUnit}
                    </span>
                    <span className="text-muted-foreground">
                      {formatValue(guardianProgress.nextThreshold, teamType)} {valueUnit} で進化
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl border-2 border-pink-500/50">
                  <p className="text-2xl font-bold mb-2" style={{ color: currentStage.color }}>
                    🏆 伝説の存在！
                  </p>
                  <p className="text-sm text-muted-foreground">
                    あなたは最高峰に到達しました
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 隠し変異情報 */}
          {activeMutation && (
            <div 
              className="p-4 rounded-xl border-2"
              style={{
                backgroundColor: `${activeMutation.color}10`,
                borderColor: `${activeMutation.color}60`,
                boxShadow: `0 0 20px ${activeMutation.color}40`
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeMutation.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: activeMutation.color }}>
                    {activeMutation.japaneseName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeMutation.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: activeMutation.color }}>
                    XP {activeMutation.boostMultiplier}倍
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Legend特典カード */}
      <GlassCard 
        glowColor={legendReward.isUnlocked ? getRarityGlow("legend") : "rgba(107, 114, 128, 0.3)"}
        className="p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <Crown className="h-8 w-8" style={{ color: legendReward.isUnlocked ? "#EC4899" : "#6B7280" }} />
          <h3 className="text-2xl font-bold" style={{ color: legendReward.isUnlocked ? "#EC4899" : "#6B7280" }}>
            伝説の特典
          </h3>
        </div>

        {legendReward.isUnlocked ? (
          /* UNLOCKED状態 */
          <div className="space-y-6">
            <div 
              className="p-8 rounded-2xl border-4 relative overflow-hidden"
              style={{
                backgroundColor: "#EC489920",
                borderColor: "#EC4899",
                boxShadow: "0 0 40px rgba(236, 72, 153, 0.6), 0 0 80px rgba(236, 72, 153, 0.3)"
              }}
            >
              {/* 背景アニメーション */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent animate-pulse" />
              
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-4 animate-bounce">👑</div>
                <h4 className="text-2xl font-bold mb-4 text-pink-500">
                  ✨ UNLOCKED ✨
                </h4>
                <p className="text-xl font-bold mb-2">{legendReward.name}</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {legendReward.description}
                </p>
                
                <Button
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-bold px-8 py-6 text-lg"
                  style={{ boxShadow: "0 0 30px rgba(236, 72, 153, 0.6)" }}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  申請する
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  獲得日: {new Date().toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl">
              <p className="text-sm font-bold text-yellow-500">
                🏅 伝説到達者: 全国 ○位 / ○名中
              </p>
            </div>
          </div>
        ) : (
          /* LOCKED状態 */
          <div className="space-y-6">
            <div 
              className="p-8 rounded-2xl border-4 relative overflow-hidden"
              style={{
                backgroundColor: "rgba(107, 114, 128, 0.1)",
                borderColor: "#6B7280",
                boxShadow: "0 0 20px rgba(107, 114, 128, 0.2)"
              }}
            >
              <div className="text-center">
                <Lock className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h4 className="text-xl font-bold mb-2 text-gray-500">🔒 LOCKED</h4>
                <p className="text-lg font-bold mb-4">{legendReward.name}</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {legendReward.description}
                </p>
                
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-400">
                    「Stage 5到達で解放」
                  </p>
                  
                  {/* 進捗バー */}
                  <div className="w-full h-8 bg-white/10 rounded-full overflow-hidden border-2 border-white/20">
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${Math.min((totalValue / legendReward.requirement) * 100, 100)}%`,
                        background: `linear-gradient(90deg, ${teamAccentColor}, #EC4899)`,
                        boxShadow: `0 0 20px ${teamAccentColor}60`
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>現在: {formatValue(totalValue, teamType)} {valueUnit}</span>
                    <span>目標: {formatValue(legendReward.requirement, teamType)} {valueUnit}</span>
                  </div>

                  <p className="text-xl font-bold" style={{ color: teamAccentColor }}>
                    {Math.round((totalValue / legendReward.requirement) * 100)}% 達成
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-muted-foreground">
                ✨ この特典を手に入れた者: ○名
              </p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* 継続バッジコレクション */}
      <GlassCard glowColor={teamAccentColor} className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Flame className="h-6 w-6" style={{ color: teamAccentColor }} />
          <h3 className="text-xl font-bold">継続バッジ</h3>
          <span className="text-sm text-muted-foreground ml-auto">
            {earnedStreakBadges.length} / {STREAK_BADGES.length}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STREAK_BADGES.map((badge) => {
            const isEarned = streak.currentStreak >= badge.days;
            const rarityColor = getRarityColor(badge.rarity);
            const rarityGlow = getRarityGlow(badge.rarity);

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isEarned
                    ? "hover:scale-105"
                    : "opacity-40 grayscale"
                }`}
                style={{
                  backgroundColor: isEarned ? `${rarityColor}10` : "rgba(107, 114, 128, 0.05)",
                  borderColor: isEarned ? rarityColor : "#6B7280",
                  boxShadow: isEarned ? `0 0 20px ${rarityGlow}` : undefined
                }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{badge.emoji}</div>
                  <p className="text-xs font-bold mb-1">{badge.japaneseName}</p>
                  <p className="text-xs text-muted-foreground mb-2">{badge.days}日</p>
                  {isEarned && (
                    <div className="text-xs font-bold" style={{ color: rarityColor }}>
                      ✓ {badge.effect}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <p className="text-lg font-bold">
              現在のストリーク: <span className="text-orange-500">{streak.currentStreak}日</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            最長記録: {streak.longestStreak}日
          </p>
        </div>
      </GlassCard>

      {/* クイックアクション */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/report">
          <GlassCard glowColor="#22C55E" className="p-6 cursor-pointer hover:scale-[1.02] transition-transform">
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
          <GlassCard glowColor="#EAB308" className="p-6 cursor-pointer hover:scale-[1.02] transition-transform">
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
    </div>
  );
}
