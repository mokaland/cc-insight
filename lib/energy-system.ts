/**
 * ⚡ エナジー獲得・投資システム
 * 
 * 報告時のエナジー獲得、ストリークボーナス、ラッキーボーナス、
 * そして守護神への投資ロジックを管理
 * 
 * 🎯 3ヶ月リテンション戦略:
 * - Day 1-3: 爆速成長（毎日進化）
 * - Day 4-10: 加速（2日に1回進化）
 * - Day 11-21: 習慣化（3日に1回進化）
 * - Day 22-42: 定着（5日に1回進化）
 */

import { Timestamp } from "firebase/firestore";
import {
  GuardianId,
  GuardianInstance,
  UserGuardianProfile,
  UserEnergyData,
  UserStreakData,
  GUARDIANS,
  getCurrentStage,
  EVOLUTION_STAGES
} from "./guardian-collection";

// =====================================
// 💰 エナジー獲得システム
// =====================================

const BASE_ENERGY_PER_REPORT = 10;

/**
 * ストリーク日数に応じたボーナス倍率
 */
export function getStreakMultiplier(streakDays: number, hasShishimaru: boolean = false): number {
  let multiplier = 1.0;
  
  if (streakDays >= 31) {
    multiplier = 3.0;
  } else if (streakDays >= 15) {
    multiplier = 2.0;
  } else if (streakDays >= 8) {
    multiplier = 1.5;
  } else if (streakDays >= 4) {
    multiplier = 1.2;
  }
  
  // 獅子丸の特性: ストリークボーナス+0.2
  if (hasShishimaru) {
    multiplier += 0.2;
  }
  
  return multiplier;
}

/**
 * ラッキーボーナス判定
 */
export function checkLuckyBonus(hasShiroko: boolean = false): {
  triggered: boolean;
  multiplier: number;
  message: string;
} {
  const baseChance = hasShiroko ? 0.10 : 0.05; // 白狐で5%→10%
  const roll = Math.random();
  
  if (roll < baseChance) {
    return {
      triggered: true,
      multiplier: 10,
      message: "🎰 ラッキーボーナス発動！エナジー10倍獲得！"
    };
  }
  
  return {
    triggered: false,
    multiplier: 1,
    message: ""
  };
}

/**
 * 週末ボーナス判定
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 日曜日(0) or 土曜日(6)
}

/**
 * 報告時のエナジー獲得量を計算
 */
export interface EnergyEarnResult {
  baseEnergy: number;
  streakMultiplier: number;
  abilityBonus: number;
  luckyBonus: {
    triggered: boolean;
    multiplier: number;
    message: string;
  };
  weekendBonus: {
    triggered: boolean;
    multiplier: number;
  };
  totalEnergy: number;
  breakdown: string[];
}

export function calculateEnergyEarned(
  userProfile: UserGuardianProfile
): EnergyEarnResult {
  const guardians = Object.values(userProfile.guardians).filter(g => g?.unlocked);
  const activeGuardianIds = guardians.map(g => g!.guardianId);
  
  // 特性チェック
  const hasHoryu = activeGuardianIds.includes('horyu') && 
                   guardians.find(g => g!.guardianId === 'horyu')!.stage >= 3;
  const hasShishimaru = activeGuardianIds.includes('shishimaru') && 
                        guardians.find(g => g!.guardianId === 'shishimaru')!.stage >= 3;
  const hasShiroko = activeGuardianIds.includes('shiroko') && 
                     guardians.find(g => g!.guardianId === 'shiroko')!.stage >= 3;
  const hasHoshimaru = activeGuardianIds.includes('hoshimaru') && 
                       guardians.find(g => g!.guardianId === 'hoshimaru')!.stage >= 3;
  
  const breakdown: string[] = [];
  
  // 1. 基本エナジー
  let energy = BASE_ENERGY_PER_REPORT;
  breakdown.push(`基本: ${BASE_ENERGY_PER_REPORT}E`);
  
  // 2. ストリークボーナス
  const streakMultiplier = getStreakMultiplier(userProfile.streak.current, hasShishimaru);
  energy *= streakMultiplier;
  if (streakMultiplier > 1.0) {
    breakdown.push(`ストリーク×${streakMultiplier.toFixed(1)} (${userProfile.streak.current}日連続)`);
  }
  
  // 3. 火龍の特性（エナジー+15%）
  let abilityBonus = 0;
  if (hasHoryu) {
    abilityBonus = energy * 0.15;
    energy += abilityBonus;
    breakdown.push(`火龍の灼熱の意志: +15%`);
  }
  
  // 4. ラッキーボーナス
  const luckyBonus = checkLuckyBonus(hasShiroko);
  if (luckyBonus.triggered) {
    energy *= luckyBonus.multiplier;
    breakdown.push(`🎰 ラッキーボーナス: ×${luckyBonus.multiplier}`);
  }
  
  // 5. 週末ボーナス（星丸）
  const weekendBonus = {
    triggered: false,
    multiplier: 1
  };
  if (hasHoshimaru && isWeekend()) {
    weekendBonus.triggered = true;
    weekendBonus.multiplier = 2.5;
    energy *= 2.5;
    breakdown.push(`✨ 星丸の星の導き: ×2.5 (週末)`);
  }
  
  return {
    baseEnergy: BASE_ENERGY_PER_REPORT,
    streakMultiplier,
    abilityBonus,
    luckyBonus,
    weekendBonus,
    totalEnergy: Math.floor(energy),
    breakdown
  };
}

// =====================================
// 📊 ストリーク更新システム
// =====================================

/**
 * ストリーク猶予時間を取得
 */
export function getStreakGraceHours(userProfile: UserGuardianProfile): number {
  const hasHanase = Object.values(userProfile.guardians)
    .some(g => g?.guardianId === 'hanase' && g.unlocked && g.stage >= 3);
  
  let graceHours = 24; // デフォルト24時間
  
  // 花精の特性: +12時間
  if (hasHanase) {
    graceHours += 12;
  }
  
  return graceHours;
}

/**
 * ストリークを更新
 */
export function updateStreak(
  currentStreak: UserStreakData,
  now: Date = new Date()
): UserStreakData {
  const lastReport = currentStreak.lastReportAt?.toDate();
  
  if (!lastReport) {
    // 初回報告
    return {
      current: 1,
      max: Math.max(1, currentStreak.max),
      multiplier: getStreakMultiplier(1),
      lastReportAt: Timestamp.fromDate(now),
      graceHours: currentStreak.graceHours
    };
  }
  
  const hoursSinceLastReport = (now.getTime() - lastReport.getTime()) / (1000 * 60 * 60);
  const graceHours = currentStreak.graceHours || 24;
  
  let newCurrent = currentStreak.current;
  
  if (hoursSinceLastReport < 24) {
    // 24時間以内: 同日扱い（連続日数変わらず）
    newCurrent = currentStreak.current;
  } else if (hoursSinceLastReport < 24 + graceHours) {
    // 猶予時間内: ストリーク継続
    newCurrent = currentStreak.current + 1;
  } else {
    // 猶予超過: リセット
    newCurrent = 1;
  }
  
  return {
    current: newCurrent,
    max: Math.max(newCurrent, currentStreak.max),
    multiplier: getStreakMultiplier(newCurrent),
    lastReportAt: Timestamp.fromDate(now),
    graceHours
  };
}

// =====================================
// 💎 エナジー投資システム
// =====================================

export interface InvestmentResult {
  success: boolean;
  newGuardian: GuardianInstance;
  evolved: boolean;
  previousStage: number;
  newStage: number;
  remainingEnergy: number;
  message: string;
}

/**
 * 守護神にエナジーを投資
 */
export function investEnergy(
  guardian: GuardianInstance,
  amount: number,
  currentEnergy: number
): InvestmentResult {
  if (amount > currentEnergy) {
    return {
      success: false,
      newGuardian: guardian,
      evolved: false,
      previousStage: guardian.stage,
      newStage: guardian.stage,
      remainingEnergy: currentEnergy,
      message: "エナジーが足りません"
    };
  }
  
  if (amount <= 0) {
    return {
      success: false,
      newGuardian: guardian,
      evolved: false,
      previousStage: guardian.stage,
      newStage: guardian.stage,
      remainingEnergy: currentEnergy,
      message: "投資額は1以上である必要があります"
    };
  }
  
  const previousStage = guardian.stage;
  const newInvestedEnergy = guardian.investedEnergy + amount;
  const newStage = getCurrentStage(newInvestedEnergy);
  const evolved = newStage > previousStage;
  
  const newGuardian: GuardianInstance = {
    ...guardian,
    investedEnergy: newInvestedEnergy,
    stage: newStage,
    abilityActive: newStage >= 3
  };
  
  let message = `${GUARDIANS[guardian.guardianId].name}に${amount}エナジーを投資しました`;
  if (evolved) {
    message = `🎉 ${GUARDIANS[guardian.guardianId].name}が「${EVOLUTION_STAGES[newStage].name}」に進化しました！`;
  }
  
  return {
    success: true,
    newGuardian,
    evolved,
    previousStage,
    newStage,
    remainingEnergy: currentEnergy - amount,
    message
  };
}

// =====================================
// 🎁 報告完了時の総合処理
// =====================================

export interface ReportCompletionResult {
  energyEarned: EnergyEarnResult;
  newEnergyData: UserEnergyData;
  newStreakData: UserStreakData;
  messages: string[];
}

/**
 * 報告完了時の処理
 */
export function processReportCompletion(
  userProfile: UserGuardianProfile,
  now: Date = new Date()
): ReportCompletionResult {
  const messages: string[] = [];
  
  // 1. ストリーク更新
  const newStreakData = updateStreak(userProfile.streak, now);
  
  // ストリーク猶予時間を更新（花精の特性）
  newStreakData.graceHours = getStreakGraceHours(userProfile);
  
  if (newStreakData.current > userProfile.streak.current) {
    messages.push(`🔥 ${newStreakData.current}日連続達成！`);
    if (newStreakData.current === newStreakData.max) {
      messages.push(`🏆 自己最高記録更新！`);
    }
  } else if (newStreakData.current < userProfile.streak.current) {
    messages.push(`⚠️ ストリークがリセットされました`);
  }
  
  // 2. エナジー獲得
  // 更新されたプロファイルを使用して計算
  const tempProfile: UserGuardianProfile = {
    ...userProfile,
    streak: newStreakData
  };
  const energyEarned = calculateEnergyEarned(tempProfile);
  
  messages.push(`💎 ${energyEarned.totalEnergy}エナジー獲得！`);
  
  if (energyEarned.luckyBonus.triggered) {
    messages.push(energyEarned.luckyBonus.message);
  }
  
  // 3. エナジーデータ更新
  const newEnergyData: UserEnergyData = {
    current: userProfile.energy.current + energyEarned.totalEnergy,
    totalEarned: userProfile.energy.totalEarned + energyEarned.totalEnergy,
    lastEarnedAt: Timestamp.fromDate(now)
  };
  
  return {
    energyEarned,
    newEnergyData,
    newStreakData,
    messages
  };
}

// =====================================
// 📈 統計・分析
// =====================================

/**
 * 次の進化までの日数を推定
 */
export function estimateDaysToNextEvolution(
  guardian: GuardianInstance,
  userProfile: UserGuardianProfile
): number | null {
  const currentStage = guardian.stage;
  
  if (currentStage >= 4) {
    return null; // 究極体
  }
  
  const nextStageEnergy = EVOLUTION_STAGES[currentStage + 1].requiredEnergy;
  const remaining = nextStageEnergy - guardian.investedEnergy;
  
  // 1日あたりの平均獲得エナジーを推定
  const streakMultiplier = getStreakMultiplier(userProfile.streak.current);
  const avgDailyEnergy = BASE_ENERGY_PER_REPORT * streakMultiplier;
  
  return Math.ceil(remaining / avgDailyEnergy);
}

/**
 * 全守護神の進捗サマリー
 */
export function getCollectionProgress(userProfile: UserGuardianProfile): {
  unlockedCount: number;
  totalCount: number;
  totalInvestedEnergy: number;
  averageStage: number;
  maxStageReached: number;
} {
  const allGuardians = Object.values(userProfile.guardians).filter(g => g?.unlocked);
  
  return {
    unlockedCount: allGuardians.length,
    totalCount: 6,
    totalInvestedEnergy: allGuardians.reduce((sum, g) => sum + (g?.investedEnergy || 0), 0),
    averageStage: allGuardians.length > 0 
      ? allGuardians.reduce((sum, g) => sum + (g?.stage || 0), 0) / allGuardians.length 
      : 0,
    maxStageReached: Math.max(...allGuardians.map(g => g?.stage || 0), 0)
  };
}

/**
 * 爆速成長期間の判定（Day 1-3）
 */
export function isInRapidGrowthPeriod(registeredAt: Timestamp): boolean {
  const now = new Date();
  const registered = registeredAt.toDate();
  const daysSinceRegistration = (now.getTime() - registered.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceRegistration <= 3;
}

/**
 * 爆速成長ボーナスメッセージ
 */
export function getRapidGrowthMessage(daysSinceRegistration: number): string | null {
  if (daysSinceRegistration <= 3) {
    return `🚀 爆速成長期間！今だけ進化スピード3倍！（あと${Math.ceil(3 - daysSinceRegistration)}日）`;
  }
  return null;
}
