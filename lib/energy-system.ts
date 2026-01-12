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
  EVOLUTION_STAGES,
  createEvolutionMemory,
  GuardianMemory
} from "./guardian-collection";
import { recordEnergyHistory, EnergyBreakdown } from "./energy-history";

// =====================================
// 💰 エナジー獲得システム v4
// =====================================

// チーム別ベースエナジー（10倍スケール）
const BASE_ENERGY_WEEKLY = 150;   // 副業・退職チーム（週1報告）
const BASE_ENERGY_DAILY = 30;     // スマホ物販チーム（毎日報告）
const BASE_ENERGY_PER_REPORT = 100; // 従来の基本値（互換性維持）

/**
 * パフォーマンスエナジー計算（Shorts系）
 * 1万再生 = 10E、100万再生リール = 300E、フォロワー30人 = 10E
 */
export function calculatePerformanceEnergy(reportData: {
  views?: number;
  viralReels100k?: number;    // 100万再生以上のリール数
  followerGrowth?: number;
  likes?: number;             // X系: いいね数
  replies?: number;           // X系: リプライ数
  posts?: number;             // X系: 投稿数
  teamType?: 'shorts' | 'x';
}): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = 0;

  if (reportData.teamType === 'shorts') {
    // Shorts系（副業・退職チーム）
    if (reportData.views && reportData.views > 0) {
      const viewsEnergy = Math.floor(reportData.views / 10000) * 10;
      if (viewsEnergy > 0) {
        total += viewsEnergy;
        breakdown.push(`再生数: +${viewsEnergy}E (${(reportData.views / 10000).toFixed(1)}万再生)`);
      }
    }

    if (reportData.viralReels100k && reportData.viralReels100k > 0) {
      const viralEnergy = reportData.viralReels100k * 300;
      total += viralEnergy;
      breakdown.push(`100万再生リール: +${viralEnergy}E (${reportData.viralReels100k}本)`);
    }

    if (reportData.followerGrowth && reportData.followerGrowth > 0) {
      const followerEnergy = Math.floor(reportData.followerGrowth / 30) * 10;
      if (followerEnergy > 0) {
        total += followerEnergy;
        breakdown.push(`フォロワー増加: +${followerEnergy}E (+${reportData.followerGrowth}人)`);
      }
    }
  } else if (reportData.teamType === 'x') {
    // X系（スマホ物販チーム）
    if (reportData.posts && reportData.posts > 0) {
      const postsEnergy = reportData.posts * 30;
      total += postsEnergy;
      breakdown.push(`投稿数: +${postsEnergy}E (${reportData.posts}投稿)`);
    }

    const activity = (reportData.likes || 0) + (reportData.replies || 0);
    if (activity > 0) {
      const activityEnergy = Math.floor(activity / 50) * 20;
      if (activityEnergy > 0) {
        total += activityEnergy;
        breakdown.push(`いいね+リプ: +${activityEnergy}E (${activity}活動)`);
      }
    }

    if (reportData.followerGrowth && reportData.followerGrowth > 0) {
      const followerEnergy = Math.floor(reportData.followerGrowth / 30) * 10;
      if (followerEnergy > 0) {
        total += followerEnergy;
        breakdown.push(`フォロワー増加: +${followerEnergy}E (+${reportData.followerGrowth}人)`);
      }
    }
  }

  return { total, breakdown };
}

/**
 * 継続ボーナス計算（マイルストーン達成時のみ付与）
 * 達成時に一度だけボーナスを付与する形式
 */
export function calculateContinuityBonus(currentStreak: number, previousStreak: number): {
  bonus: number;
  milestone: string | null;
} {
  // 週次ストリーク用のマイルストーン（週数 -> ボーナスE）
  const milestones: [number, number, string][] = [
    [4, 300, '4週連続達成！'],        // 1ヶ月
    [12, 1000, '12週連続達成！'],     // 3ヶ月
    [26, 3000, '半年継続達成！'],     // 6ヶ月
    [52, 8000, '1年継続達成！'],      // 1年
  ];

  for (const [weeks, bonus, message] of milestones) {
    // 今回のストリークでマイルストーンを達成し、前回は未達成だった場合
    if (currentStreak >= weeks && previousStreak < weeks) {
      return { bonus, milestone: message };
    }
  }

  return { bonus: 0, milestone: null };
}

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
  performanceEnergy: number;       // 🆕 パフォーマンスE
  continuityBonus: number;         // 🆕 継続ボーナス
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
  milestoneMessage?: string;       // 🆕 マイルストーン達成メッセージ
}

export interface ReportPerformanceData {
  views?: number;
  viralReels100k?: number;
  followerGrowth?: number;
  likes?: number;
  replies?: number;
  posts?: number;
}

export function calculateEnergyEarned(
  userProfile: UserGuardianProfile,
  reportData?: ReportPerformanceData,
  teamType?: 'shorts' | 'x',
  previousStreak?: number
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

  // 2. 🆕 パフォーマンスE
  let performanceEnergy = 0;
  if (reportData && teamType) {
    const perfResult = calculatePerformanceEnergy({ ...reportData, teamType });
    performanceEnergy = perfResult.total;
    if (performanceEnergy > 0) {
      energy += performanceEnergy;
      breakdown.push(...perfResult.breakdown);
    }
  }

  // 3. ストリークボーナス
  const streakMultiplier = getStreakMultiplier(userProfile.streak.current, hasShishimaru);
  energy *= streakMultiplier;
  if (streakMultiplier > 1.0) {
    breakdown.push(`ストリーク×${streakMultiplier.toFixed(1)} (${userProfile.streak.current}日連続)`);
  }

  // 4. 火龍の特性（エナジー+15%）
  let abilityBonus = 0;
  if (hasHoryu) {
    abilityBonus = energy * 0.15;
    energy += abilityBonus;
    breakdown.push(`火龍の灼熱の意志: +15%`);
  }

  // 5. ラッキーボーナス
  const luckyBonus = checkLuckyBonus(hasShiroko);
  if (luckyBonus.triggered) {
    energy *= luckyBonus.multiplier;
    breakdown.push(`🎰 ラッキーボーナス: ×${luckyBonus.multiplier}`);
  }

  // 6. 週末ボーナス（星丸）
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

  // 7. 🆕 継続ボーナス（マイルストーン）
  let continuityBonus = 0;
  let milestoneMessage: string | undefined;
  if (previousStreak !== undefined) {
    const contResult = calculateContinuityBonus(userProfile.streak.current, previousStreak);
    continuityBonus = contResult.bonus;
    if (continuityBonus > 0) {
      energy += continuityBonus;
      milestoneMessage = contResult.milestone || undefined;
      breakdown.push(`🏆 ${milestoneMessage}: +${continuityBonus}E`);
    }
  }

  return {
    baseEnergy: BASE_ENERGY_PER_REPORT,
    performanceEnergy,
    continuityBonus,
    streakMultiplier,
    abilityBonus,
    luckyBonus,
    weekendBonus,
    totalEnergy: Math.floor(energy),
    breakdown,
    milestoneMessage
  };
}

// =====================================
// 📊 ストリーク更新システム
// =====================================

/**
 * チームタイプに応じたストリークモードを取得
 * shorts = 副業・退職チーム（週1報告でOK）
 * x = スマホ物販チーム（毎日報告）
 */
export type StreakMode = 'daily' | 'weekly';

export function getStreakMode(teamType?: 'shorts' | 'x'): StreakMode {
  // 副業・退職チーム（Shorts系）は週次ストリーク
  if (teamType === 'shorts') return 'weekly';
  // スマホ物販チーム（X系）は日次ストリーク
  return 'daily';
}

/**
 * ストリーク猶予時間を取得
 */
export function getStreakGraceHours(
  userProfile: UserGuardianProfile,
  streakMode: StreakMode = 'daily'
): number {
  const hasHanase = Object.values(userProfile.guardians)
    .some(g => g?.guardianId === 'hanase' && g.unlocked && g.stage >= 3);

  // 週次モードの場合は7日（168時間）
  let graceHours = streakMode === 'weekly' ? 168 : 24;

  // 花精の特性: +12時間（日次）/ +24時間（週次）
  if (hasHanase) {
    graceHours += streakMode === 'weekly' ? 24 : 12;
  }

  return graceHours;
}

/**
 * ストリークを更新（週次/日次対応）
 */
export function updateStreak(
  currentStreak: UserStreakData,
  now: Date = new Date(),
  streakMode: StreakMode = 'daily'
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
  const graceHours = currentStreak.graceHours || (streakMode === 'weekly' ? 168 : 24);

  // 週次モードと日次モードで期間を分ける
  const periodHours = streakMode === 'weekly' ? 168 : 24; // 7日 or 1日

  let newCurrent = currentStreak.current;

  if (hoursSinceLastReport < periodHours) {
    // 期間内: 同期間扱い（連続数変わらず）
    newCurrent = currentStreak.current;
  } else if (hoursSinceLastReport < periodHours + graceHours) {
    // 猶予時間内: ストリーク継続・インクリメント
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

  // Stage 4（究極体）は最終形態のため、これ以上投資できない
  if (guardian.stage >= 4) {
    return {
      success: false,
      newGuardian: guardian,
      evolved: false,
      previousStage: guardian.stage,
      newStage: guardian.stage,
      remainingEnergy: currentEnergy,
      message: "究極体はこれ以上成長できません"
    };
  }

  const previousStage = guardian.stage;
  const newInvestedEnergy = guardian.investedEnergy + amount;
  const newStage = getCurrentStage(newInvestedEnergy);
  const evolved = newStage > previousStage;

  // 解放済みステージを更新（図鑑用）
  // 既存のunlockedStagesがなければ現在のstageまでを全て解放済みとして初期化
  let unlockedStages = guardian.unlockedStages
    ? [...guardian.unlockedStages]
    : Array.from({ length: previousStage + 1 }, (_, i) => i as 0 | 1 | 2 | 3 | 4);

  // 進化した場合、previousStageからnewStageまでの全ての中間ステージを追加
  // 例: Stage 1 → Stage 3 の場合、Stage 2 と Stage 3 の両方を追加
  if (evolved) {
    for (let s = previousStage + 1; s <= newStage; s++) {
      if (!unlockedStages.includes(s as 0 | 1 | 2 | 3 | 4)) {
        unlockedStages.push(s as 0 | 1 | 2 | 3 | 4);
      }
    }
    // ソートして順序を保証
    unlockedStages.sort((a, b) => a - b);
  }

  // 思い出を更新（進化した場合のみ）
  let memories = guardian.memories ? [...guardian.memories] : [];
  if (evolved) {
    const evolutionMemory = createEvolutionMemory(guardian.guardianId, newStage);
    memories.push({
      ...evolutionMemory,
      date: Timestamp.now()
    } as GuardianMemory);
  }

  const newGuardian: GuardianInstance = {
    ...guardian,
    investedEnergy: newInvestedEnergy,
    stage: newStage,
    abilityActive: newStage >= 3,
    unlockedStages,
    memories
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
  historyData: {
    breakdown: EnergyBreakdown;
    streakDay: number;
  };
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

  // 4. 履歴記録用データ
  const historyBreakdown: EnergyBreakdown = {
    dailyReport: BASE_ENERGY_PER_REPORT,
    streakBonus: Math.floor(BASE_ENERGY_PER_REPORT * (energyEarned.streakMultiplier - 1)),
    performanceBonus: Math.floor(energyEarned.abilityBonus),
    weeklyBonus: 0, // 週次ボーナスは別途実装
  };

  return {
    energyEarned,
    newEnergyData,
    newStreakData,
    messages,
    historyData: {
      breakdown: historyBreakdown,
      streakDay: newStreakData.current,
    }
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
