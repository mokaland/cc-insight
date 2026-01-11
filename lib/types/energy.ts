/**
 * エナジー履歴型定義
 * 
 * Firestore コレクション: energy_history
 */

import { Timestamp } from "firebase/firestore";

/**
 * エナジー獲得内訳
 */
export interface EnergyBreakdown {
    dailyReport: number;        // 日報提出ボーナス
    streakBonus: number;        // ストリークボーナス
    performanceBonus: number;   // 成果ボーナス
    weeklyBonus: number;        // 週次ボーナス
}

/**
 * エナジー履歴レコード
 */
export interface EnergyHistoryRecord {
    id: string;                 // ドキュメントID（{userId}_{date}）
    userId: string;
    date: string;               // YYYY-MM-DD
    breakdown: EnergyBreakdown;
    totalEarned: number;        // その日の合計
    streakDay: number;          // その日のストリーク日数
    createdAt: Timestamp;
}

/**
 * エナジー履歴サマリー
 */
export interface EnergyHistorySummary {
    totalEarned: number;
    periodDays: number;
    averagePerDay: number;
    bestDay: { date: string; amount: number } | null;
    currentStreak: number;
    maxStreak: number;
    records: EnergyHistoryRecord[];
}
