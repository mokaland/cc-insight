"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, Calendar, Zap, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  getEnergyHistory,
  calculateHistorySummary,
  generateAchievementMessage,
  generateChallengeMessage,
  EnergyHistorySummary,
} from "@/lib/energy-history";

// ============================================
// 共通モーダルラッパー
// ============================================

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalWrapper({ isOpen, onClose, children }: ModalWrapperProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
          />

          {/* モーダルコンテンツ */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:pb-4 pb-[calc(var(--bottom-nav-height)+1rem)]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[calc(100vh-var(--bottom-nav-height)-2rem)] md:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// ① エナジー履歴モーダル
// ============================================

interface EnergyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function EnergyHistoryModal({ isOpen, onClose, userId }: EnergyHistoryModalProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<EnergyHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const records = await getEnergyHistory(userId, 7);
        const sum = calculateHistorySummary(records);
        setSummary(sum);
      } catch (error) {
        console.error("履歴取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, userId]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="glass-premium rounded-3xl border-2 border-yellow-500/30 p-6 relative overflow-hidden">
        {/* 背景グロー */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-yellow-400/10 rounded-full blur-3xl" />

        {/* ヘッダー */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">保有エナジー履歴</h2>
              <p className="text-xs text-gray-400">直近7日間の獲得状況</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">データを読み込んでいます...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6 relative">
            {/* 簡易グラフ */}
            <div className="p-4 rounded-xl bg-black/30 border border-yellow-500/20">
              <p className="text-sm text-gray-400 mb-3">📊 直近7日間の獲得</p>
              <div className="flex items-end justify-between gap-1 h-24">
                {summary.records.slice(0, 7).reverse().map((record, i) => {
                  const maxVal = Math.max(...summary.records.slice(0, 7).map(r => r.totalEarned));
                  const height = (record.totalEarned / maxVal) * 100;
                  const day = new Date(record.date).toLocaleDateString('ja-JP', { weekday: 'short' });
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t transition-all hover:opacity-80"
                           style={{ height: `${height}%` }}
                           title={`${record.totalEarned}E`}
                      />
                      <span className="text-[10px] text-gray-500">{day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">+{summary.totalEarned}E</p>
                <p className="text-xs text-gray-400">7日間の合計獲得</p>
              </div>
            </div>

            {/* ハイライト */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <p className="text-sm font-bold text-yellow-400 mb-3">🔥 今週のハイライト</p>
              <div className="space-y-2 text-sm text-gray-300">
                {summary.bestDay && (
                  <p>├ 最高獲得日: {new Date(summary.bestDay.date).toLocaleDateString('ja-JP')} (+{summary.bestDay.amount}E) ⭐</p>
                )}
                <p>├ 平均獲得: {summary.averagePerDay}E/日</p>
                <p>└ 連続報告: {summary.currentStreak}日継続中！ 🔥</p>
              </div>
            </div>

            {/* 心理的メッセージ */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-purple-300">
                💡 「このペースなら来週も期待大！継続は力なり、あなたは確実に成長しています！」
              </p>
            </div>

            {/* 詳細ボタン */}
            <Button
              onClick={() => {
                onClose();
                router.push("/history");
              }}
              className="w-full h-12 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
            >
              📈 詳細履歴を見る
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">履歴データがありません</p>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

// ============================================
// ② 累計獲得履歴モーダル
// ============================================

interface TotalEarnedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  totalEarned: number;
}

export function TotalEarnedModal({ isOpen, onClose, userId, totalEarned }: TotalEarnedModalProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<EnergyHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const records = await getEnergyHistory(userId, 30);
        const sum = calculateHistorySummary(records);
        setSummary(sum);
      } catch (error) {
        console.error("履歴取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, userId]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="glass-premium rounded-3xl border-2 border-purple-500/30 p-6 relative overflow-hidden">
        {/* 背景グロー */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-purple-400/10 rounded-full blur-3xl" />

        {/* ヘッダー */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">累計獲得の軌跡</h2>
              <p className="text-xs text-gray-400">あなたの冒険記録</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">データを読み込んでいます...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6 relative">
            {/* 累計獲得 */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 text-center">
              <p className="text-sm text-gray-400 mb-2">🏆 全期間累計獲得</p>
              <p className="text-5xl font-bold text-purple-400 mb-2">{totalEarned.toLocaleString()}E</p>
              <p className="text-xs text-gray-400">これまでの全ての努力の証</p>
            </div>

            {/* 月別推移 */}
            <div className="p-4 rounded-xl bg-black/30 border border-purple-500/20">
              <p className="text-sm font-bold text-purple-400 mb-3">📅 直近30日の実績</p>
              <div className="space-y-2 text-sm text-gray-300">
                <p>├ 獲得合計: {summary.totalEarned}E</p>
                <p>├ 報告日数: {summary.periodDays}日</p>
                <p>└ 平均獲得: {summary.averagePerDay}E/日</p>
              </div>
            </div>

            {/* 心理的メッセージ */}
            {generateAchievementMessage(summary).map((msg, i) => (
              <div key={i} className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-purple-300">{msg}</p>
              </div>
            ))}

            {/* 挑戦メッセージ */}
            <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <p className="text-sm text-pink-300">
                🎯 「1月目標まであと{Math.max(0, 1000 - summary.totalEarned)}E！手が届く距離です！」
              </p>
            </div>

            {/* 詳細ボタン */}
            <Button
              onClick={() => {
                onClose();
                router.push("/history");
              }}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
            >
              📈 詳細履歴を見る
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">履歴データがありません</p>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

// ============================================
// ③ ストリーク履歴モーダル
// ============================================

interface StreakHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentStreak: number;
  maxStreak: number;
}

export function StreakHistoryModal({
  isOpen,
  onClose,
  userId,
  currentStreak,
  maxStreak,
}: StreakHistoryModalProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<EnergyHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const records = await getEnergyHistory(userId, 30);
        const sum = calculateHistorySummary(records);
        setSummary(sum);
      } catch (error) {
        console.error("履歴取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, userId]);

  // 簡易カレンダー（当月）
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const reportedDates = summary?.records.map(r => r.date) || [];

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="glass-premium rounded-3xl border-2 border-orange-500/30 p-6 relative overflow-hidden">
        {/* 背景グロー */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-orange-400/10 rounded-full blur-3xl" />

        {/* ヘッダー */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">ストリーク履歴</h2>
              <p className="text-xs text-gray-400">連続報告の記録</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="space-y-6 relative">
            {/* カレンダー */}
            <div className="p-4 rounded-xl bg-black/30 border border-orange-500/20">
              <p className="text-sm text-gray-400 mb-3 text-center">
                📅 {year}年{month}月
              </p>
              
              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                  <div key={day} className="text-center text-xs text-gray-500 font-bold">
                    {day}
                  </div>
                ))}
              </div>

              {/* 日付グリッド */}
              <div className="grid grid-cols-7 gap-1">
                {/* 空白セル */}
                {[...Array(firstDayOfWeek)].map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {/* 日付セル */}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isReported = reportedDates.includes(dateStr);
                  const isToday = day === today.getDate();
                  
                  return (
                    <div
                      key={day}
                      className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
                        isReported
                          ? "bg-orange-500/30 border border-orange-500/50"
                          : "bg-white/5 border border-white/10"
                      } ${isToday ? "ring-2 ring-orange-400" : ""}`}
                    >
                      {isReported ? "🔥" : day}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ストリーク情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/30 text-center">
                <p className="text-xs text-gray-400 mb-1">🔥 現在</p>
                <p className="text-3xl font-bold text-orange-400">{currentStreak}日</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 text-center">
                <p className="text-xs text-gray-400 mb-1">🏆 最高記録</p>
                <p className="text-3xl font-bold text-yellow-400">{maxStreak}日</p>
              </div>
            </div>

            {/* 心理的メッセージ */}
            {currentStreak < maxStreak ? (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm text-orange-300">
                  💪「最高記録まであと{maxStreak - currentStreak}日！超えられる！」
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-300">
                  🎉「自己最高記録更新中！この調子で突き進め！」
                </p>
              </div>
            )}

            {/* 詳細ボタン */}
            <Button
              onClick={() => {
                onClose();
                router.push("/history");
              }}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold"
            >
              📈 詳細履歴を見る
            </Button>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
