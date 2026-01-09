/**
 * エナジー履歴システム
 * Phase 15: 成長実感システム
 */

import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";

// ============================================
// 型定義
// ============================================

export interface EnergyBreakdown {
  dailyReport: number;        // 日報提出ボーナス
  streakBonus: number;        // ストリークボーナス
  performanceBonus: number;   // 成果ボーナス
  weeklyBonus: number;        // 週次ボーナス
}

export interface EnergyHistoryRecord {
  id: string;
  userId: string;
  date: string;               // "2025-01-08"
  breakdown: EnergyBreakdown;
  totalEarned: number;        // その日の合計
  streakDay: number;          // その日のストリーク日数
  createdAt: Timestamp | Date;
}

export interface EnergyHistorySummary {
  totalEarned: number;
  periodDays: number;
  averagePerDay: number;
  bestDay: { date: string; amount: number } | null;
  currentStreak: number;
  maxStreak: number;
  records: EnergyHistoryRecord[];
}

// ============================================
// 履歴記録関数
// ============================================

/**
 * エナジー獲得を履歴に記録
 * 同じ日に既に記録がある場合はスキップ（1日1回のみ記録）
 */
export async function recordEnergyHistory(
  userId: string,
  date: string,
  breakdown: EnergyBreakdown,
  streakDay: number
): Promise<void> {
  const docId = `${userId}_${date}`;

  // 既に記録済みかチェック
  const existingDoc = await getDoc(doc(db, "energy_history", docId));
  if (existingDoc.exists()) {
    console.log("📝 エナジー履歴は既に記録済み:", docId);
    return;
  }

  const totalEarned =
    breakdown.dailyReport +
    breakdown.streakBonus +
    breakdown.performanceBonus +
    breakdown.weeklyBonus;

  const record: Omit<EnergyHistoryRecord, "id"> = {
    userId,
    date,
    breakdown,
    totalEarned,
    streakDay,
    createdAt: Timestamp.now(),
  };

  await setDoc(doc(db, "energy_history", docId), record);
}

/**
 * 今日の履歴を取得（既に記録済みかチェック）
 */
export async function getTodayEnergyHistory(
  userId: string,
  date: string
): Promise<EnergyHistoryRecord | null> {
  const docId = `${userId}_${date}`;
  const docRef = doc(db, "energy_history", docId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as EnergyHistoryRecord;
  }
  return null;
}

// ============================================
// 履歴取得関数
// ============================================

/**
 * 期間指定でエナジー履歴を取得
 */
export async function getEnergyHistory(
  userId: string,
  periodDays: number | "all" = 30
): Promise<EnergyHistoryRecord[]> {
  let q;
  
  if (periodDays === "all") {
    q = query(
      collection(db, "energy_history"),
      where("userId", "==", userId),
      orderBy("date", "desc")
    );
  } else {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString().split("T")[0];

    q = query(
      collection(db, "energy_history"),
      where("userId", "==", userId),
      where("date", ">=", startDateStr),
      orderBy("date", "desc")
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EnergyHistoryRecord[];
}

/**
 * 履歴のサマリーを計算
 */
export function calculateHistorySummary(
  records: EnergyHistoryRecord[]
): EnergyHistorySummary {
  if (records.length === 0) {
    return {
      totalEarned: 0,
      periodDays: 0,
      averagePerDay: 0,
      bestDay: null,
      currentStreak: 0,
      maxStreak: 0,
      records: [],
    };
  }

  // 合計獲得
  const totalEarned = records.reduce((sum, r) => sum + r.totalEarned, 0);

  // 最高獲得日
  const bestRecord = records.reduce((best, r) => 
    r.totalEarned > best.totalEarned ? r : best
  );

  // 平均
  const averagePerDay = Math.round(totalEarned / records.length * 10) / 10;

  // ストリーク計算
  const currentStreak = records.length > 0 ? records[0].streakDay : 0;
  const maxStreak = Math.max(...records.map((r) => r.streakDay), 0);

  return {
    totalEarned,
    periodDays: records.length,
    averagePerDay,
    bestDay: { date: bestRecord.date, amount: bestRecord.totalEarned },
    currentStreak,
    maxStreak,
    records,
  };
}

// ============================================
// 心理的メッセージ生成
// ============================================

/**
 * 達成感を強調するメッセージを生成
 */
export function generateAchievementMessage(
  summary: EnergyHistorySummary,
  previousPeriodTotal?: number
): string[] {
  const messages: string[] = [];

  // 最高記録ハイライト
  if (summary.bestDay) {
    messages.push(
      `🌟 ${summary.bestDay.date}に${summary.bestDay.amount}Eを獲得！これはあなたの輝かしい記録です！`
    );
  }

  // 成長率
  if (previousPeriodTotal && previousPeriodTotal > 0) {
    const growthRate = Math.round(
      ((summary.totalEarned - previousPeriodTotal) / previousPeriodTotal) * 100
    );
    if (growthRate > 0) {
      messages.push(`📈 前期間比+${growthRate}%成長！確実に進化しています！`);
    }
  }

  // ストリーク
  if (summary.currentStreak >= 7) {
    messages.push(
      `🔥 ${summary.currentStreak}日連続報告中！この炎を絶やすな！`
    );
  }

  // 平均
  if (summary.averagePerDay >= 25) {
    messages.push(
      `💪 平均${summary.averagePerDay}E/日！トップクラスのペースです！`
    );
  }

  return messages;
}

/**
 * 挑戦意欲を刺激するメッセージを生成
 */
export function generateChallengeMessage(
  summary: EnergyHistorySummary,
  targetEnergy?: number
): string[] {
  const messages: string[] = [];

  // 目標までの距離
  if (targetEnergy) {
    const remaining = targetEnergy - summary.totalEarned;
    if (remaining > 0) {
      messages.push(`🎯 目標まであと${remaining}E！手が届く距離です！`);
    } else {
      messages.push(`🏆 目標達成！次はさらに高みを目指しましょう！`);
    }
  }

  // ストリーク挑戦
  if (summary.currentStreak < summary.maxStreak) {
    const diff = summary.maxStreak - summary.currentStreak;
    messages.push(
      `🔥 最高記録${summary.maxStreak}日まであと${diff}日！超えられる！`
    );
  }

  // 潜在力
  if (summary.bestDay && summary.averagePerDay > 0) {
    const potential = Math.round(summary.bestDay.amount * 30);
    messages.push(
      `💎 最高記録ペースなら月間${potential}E獲得可能！あなたにはその力がある！`
    );
  }

  // 励まし
  messages.push(`💪 「あなたにはもっとできる」それを証明する番です！`);

  return messages;
}

/**
 * カレンダー用のストリークデータを生成
 */
export function generateStreakCalendar(
  records: EnergyHistoryRecord[],
  year: number,
  month: number
): { [date: string]: { reported: boolean; streak: number; earned: number } } {
  const calendar: { [date: string]: { reported: boolean; streak: number; earned: number } } = {};

  // 指定月のすべての日を初期化
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendar[dateStr] = { reported: false, streak: 0, earned: 0 };
  }

  // 履歴データを反映
  for (const record of records) {
    if (calendar[record.date]) {
      calendar[record.date] = {
        reported: true,
        streak: record.streakDay,
        earned: record.totalEarned,
      };
    }
  }

  return calendar;
}
