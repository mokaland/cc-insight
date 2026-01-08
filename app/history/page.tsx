"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getEnergyHistory,
  calculateHistorySummary,
  generateAchievementMessage,
  generateChallengeMessage,
  EnergyHistoryRecord,
  EnergyHistorySummary,
} from "@/lib/energy-history";
import { TrendingUp, Calendar, Zap, Flame, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<"7" | "30" | "all">("7");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EnergyHistorySummary | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const periodDays = period === "all" ? "all" : parseInt(period);
        const records = await getEnergyHistory(user.uid, periodDays);
        const sum = calculateHistorySummary(records);
        setSummary(sum);
      } catch (error) {
        console.error("履歴取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user, period]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="border-white/20 hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            📊 成長の記録
          </h1>
          <p className="text-muted-foreground mt-1">
            あなたの冒険の軌跡を振り返りましょう
          </p>
        </div>
      </div>

      {/* 期間タブ */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "7" | "30" | "all")} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/20">
          <TabsTrigger value="7" className="data-[state=active]:bg-yellow-500/20">
            📅 7日
          </TabsTrigger>
          <TabsTrigger value="30" className="data-[state=active]:bg-purple-500/20">
            📆 30日
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-pink-500/20">
            📈 全期間
          </TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6 mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">データを読み込んでいます...</p>
            </div>
          ) : summary && summary.records.length > 0 ? (
            <>
              {/* サマリーカード */}
              <div className="grid gap-4 md:grid-cols-4">
                <GlassCard glowColor="#eab308" className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <p className="text-sm text-muted-foreground">期間内獲得</p>
                  </div>
                  <p className="text-3xl font-bold text-yellow-400">
                    {summary.totalEarned}E
                  </p>
                </GlassCard>

                <GlassCard glowColor="#8b5cf6" className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <p className="text-sm text-muted-foreground">報告日数</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-400">
                    {summary.periodDays}日
                  </p>
                </GlassCard>

                <GlassCard glowColor="#ec4899" className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-pink-400" />
                    <p className="text-sm text-muted-foreground">平均獲得</p>
                  </div>
                  <p className="text-3xl font-bold text-pink-400">
                    {summary.averagePerDay}E/日
                  </p>
                </GlassCard>

                <GlassCard glowColor="#f97316" className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <p className="text-sm text-muted-foreground">最長ストリーク</p>
                  </div>
                  <p className="text-3xl font-bold text-orange-400">
                    {summary.maxStreak}日
                  </p>
                </GlassCard>
              </div>

              {/* ハイライト */}
              {summary.bestDay && (
                <GlassCard glowColor="#eab308" className="p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-yellow-400">🌟</span>
                    期間内ハイライト
                  </h2>
                  <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                    <p className="text-lg font-bold text-yellow-400 mb-2">
                      最高獲得日: {new Date(summary.bestDay.date).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </p>
                    <p className="text-4xl font-extrabold text-yellow-400">
                      +{summary.bestDay.amount}E
                    </p>
                  </div>
                </GlassCard>
              )}

              {/* 心理的メッセージ */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* 達成感メッセージ */}
                <GlassCard glowColor="#8b5cf6" className="p-6">
                  <h3 className="text-lg font-bold mb-4 text-purple-400">
                    🎉 あなたの成果
                  </h3>
                  <div className="space-y-3">
                    {generateAchievementMessage(summary).map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                      >
                        <p className="text-sm text-purple-200">{msg}</p>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>

                {/* 挑戦メッセージ */}
                <GlassCard glowColor="#ec4899" className="p-6">
                  <h3 className="text-lg font-bold mb-4 text-pink-400">
                    💪 次の目標
                  </h3>
                  <div className="space-y-3">
                    {generateChallengeMessage(summary, 1000).map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20"
                      >
                        <p className="text-sm text-pink-200">{msg}</p>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* 詳細履歴 */}
              <GlassCard glowColor="#6366f1" className="p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  📋 詳細履歴
                </h2>
                <div className="space-y-3">
                  {summary.records.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-white">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-white">
                              {new Date(record.date).toLocaleDateString('ja-JP', {
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short'
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ストリーク: {record.streakDay}日目 🔥
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-400">
                            +{record.totalEarned}E
                          </p>
                        </div>
                      </div>

                      {/* 内訳 */}
                      <div className="pl-13 space-y-1 text-sm">
                        {record.breakdown.dailyReport > 0 && (
                          <p className="text-muted-foreground">
                            ├ 📝 日報提出: <span className="text-green-400">+{record.breakdown.dailyReport}E</span>
                          </p>
                        )}
                        {record.breakdown.streakBonus > 0 && (
                          <p className="text-muted-foreground">
                            ├ 🔥 ストリークボーナス: <span className="text-orange-400">+{record.breakdown.streakBonus}E</span>
                          </p>
                        )}
                        {record.breakdown.performanceBonus > 0 && (
                          <p className="text-muted-foreground">
                            ├ 📈 成果ボーナス: <span className="text-purple-400">+{record.breakdown.performanceBonus}E</span>
                          </p>
                        )}
                        {record.breakdown.weeklyBonus > 0 && (
                          <p className="text-muted-foreground">
                            └ 👑 週次ボーナス: <span className="text-blue-400">+{record.breakdown.weeklyBonus}E</span>
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </>
          ) : (
            <GlassCard glowColor="#6b7280" className="p-12 text-center">
              <p className="text-muted-foreground mb-2">
                この期間の履歴データがありません
              </p>
              <p className="text-sm text-muted-foreground">
                日報を提出すると、ここに記録が表示されます
              </p>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
