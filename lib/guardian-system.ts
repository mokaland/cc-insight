// ============================================
// CC Insight v2: The Guardian's Ascent
// ガーディアン進化システム & XP計算ロジック
// 両チーム対応版（動画チーム / Xチーム）
// ============================================

import { Timestamp } from "firebase/firestore";

// ============================================
// チームタイプ定義
// ============================================

export type TeamType = "shorts" | "x";

export function getTeamType(teamId: string): TeamType {
  // スマホ物販チーム（buppan）のみX型
  if (teamId === "buppan") return "x";
  // 副業チーム、退職サポートチームは動画型
  return "shorts";
}

// ============================================
// ガーディアン進化ステージ定義
// ============================================

export interface GuardianStage {
  stage: number;
  name: string;
  japaneseName: string;
  emoji: string;
  color: string;
  glowColor: string;
  description: string;
  unlockMessage: string;
}

// 共通のガーディアン進化形態（名前は統一）
export const GUARDIAN_FORMS: GuardianStage[] = [
  {
    stage: 1,
    name: "Lumina Puppy",
    japaneseName: "ルミナ・パピー",
    emoji: "🐣",
    color: "#94A3B8",
    glowColor: "rgba(148, 163, 184, 0.6)",
    description: "手のひらサイズの発光する幼獣。君の冒険はここから始まる。",
    unlockMessage: "君の守護獣が目覚めた！一緒に伝説を目指そう！"
  },
  {
    stage: 2,
    name: "Crystal Wyvern",
    japaneseName: "クリスタル・ワイバーン",
    emoji: "🐲",
    color: "#06B6D4",
    glowColor: "rgba(6, 182, 212, 0.6)",
    description: "翼が展開し、クリスタルの鱗が輝く。空へ飛び立つ準備は整った。",
    unlockMessage: "翼が開いた！クリスタル・ワイバーンに進化！"
  },
  {
    stage: 3,
    name: "Neon Drake",
    japaneseName: "ネオン・ドレイク",
    emoji: "🔮",
    color: "#D946EF",
    glowColor: "rgba(217, 70, 239, 0.6)",
    description: "全身にネオンカラーの紋様が浮かび上がる。覚醒の証。",
    unlockMessage: "覚醒した！ネオン・ドレイクに進化！"
  },
  {
    stage: 4,
    name: "Solaris Dragon",
    japaneseName: "ソラリス・ドラゴン",
    emoji: "🌟",
    color: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.6)",
    description: "太陽のオーラを纏う完全体。王冠のような角を持つ。",
    unlockMessage: "完全覚醒！ソラリス・ドラゴンに進化！"
  },
  {
    stage: 5,
    name: "Celestial Omega",
    japaneseName: "セレスティアル・オメガ",
    emoji: "🐉",
    color: "#EC4899",
    glowColor: "rgba(236, 72, 153, 0.6)",
    description: "天空を翔ける伝説の存在。星々のエネルギーを纏う。",
    unlockMessage: "伝説の存在へ...！セレスティアル・オメガに覚醒！"
  }
];

// ============================================
// チーム別Stage解放条件
// ============================================

// 動画チーム（副業・退職サポート）- 再生数ベース
export const SHORTS_STAGE_THRESHOLDS = [
  { stage: 1, minValue: 0 },
  { stage: 2, minValue: 500000 },      // 50万再生
  { stage: 3, minValue: 2000000 },     // 200万再生
  { stage: 4, minValue: 7000000 },     // 700万再生
  { stage: 5, minValue: 20000000 },    // 2,000万再生
];

// Xチーム（スマホ物販）- インプレッションベース
export const TWITTER_STAGE_THRESHOLDS = [
  { stage: 1, minValue: 0 },
  { stage: 2, minValue: 50000 },       // 5万インプレ
  { stage: 3, minValue: 200000 },      // 20万インプレ
  { stage: 4, minValue: 700000 },      // 70万インプレ
  { stage: 5, minValue: 2000000 },     // 200万インプレ
];

// ============================================
// 隠し変異（ミッドポイント・フォーム）
// ============================================

export interface HiddenMutation {
  id: string;
  name: string;
  japaneseName: string;
  triggerValue: number;
  emoji: string;
  color: string;
  effect: string;
  boostMultiplier: number;
  boostDurationDays: number;
  description: string;
  teamType: TeamType | "both";
}

// 動画チーム用隠し変異
export const SHORTS_MUTATIONS: HiddenMutation[] = [
  {
    id: "crimson_eye",
    name: "Crimson Eye",
    japaneseName: "紅蓮の眼",
    triggerValue: 1000000,
    emoji: "👁️",
    color: "#EF4444",
    effect: "瞳が赤く光る",
    boostMultiplier: 1.2,
    boostDurationDays: 3,
    description: "100万再生達成！紅蓮の眼が覚醒した！",
    teamType: "shorts"
  },
  {
    id: "crystal_armor",
    name: "Crystal Armor",
    japaneseName: "氷晶の鎧",
    triggerValue: 3000000,
    emoji: "💎",
    color: "#06B6D4",
    effect: "体にクリスタル装甲",
    boostMultiplier: 1.25,
    boostDurationDays: 3,
    description: "300万再生達成！氷晶の鎧を纏った！",
    teamType: "shorts"
  },
  {
    id: "thunder_wings",
    name: "Thunder Wings",
    japaneseName: "雷鳴の翼",
    triggerValue: 5000000,
    emoji: "⚡",
    color: "#EAB308",
    effect: "翼から稲妻が走る",
    boostMultiplier: 1.3,
    boostDurationDays: 5,
    description: "500万再生達成！雷鳴の翼が解放された！",
    teamType: "shorts"
  },
  {
    id: "twilight_crest",
    name: "Twilight Crest",
    japaneseName: "黄昏の紋章",
    triggerValue: 10000000,
    emoji: "🌅",
    color: "#F97316",
    effect: "額に紋章出現",
    boostMultiplier: 1.4,
    boostDurationDays: 7,
    description: "1,000万再生達成！黄昏の紋章が刻まれた！",
    teamType: "shorts"
  },
  {
    id: "rainbow_awakening",
    name: "Rainbow Awakening",
    japaneseName: "虹彩覚醒",
    triggerValue: 15000000,
    emoji: "🌈",
    color: "#EC4899",
    effect: "全身が虹色に",
    boostMultiplier: 1.5,
    boostDurationDays: 7,
    description: "1,500万再生達成！虹彩覚醒！伝説まであと少し！",
    teamType: "shorts"
  }
];

// Xチーム用隠し変異
export const TWITTER_MUTATIONS: HiddenMutation[] = [
  {
    id: "blue_flame_eye",
    name: "Blue Flame Eye",
    japaneseName: "青い炎の瞳",
    triggerValue: 30000,
    emoji: "🔵",
    color: "#1DA1F2",
    effect: "瞳がTwitterブルーに",
    boostMultiplier: 1.2,
    boostDurationDays: 3,
    description: "3万インプレ達成！青い炎の瞳が覚醒！",
    teamType: "x"
  },
  {
    id: "spread_wings",
    name: "Spread Wings",
    japaneseName: "拡散の羽",
    triggerValue: 80000,
    emoji: "🔄",
    color: "#06B6D4",
    effect: "翼にリポストマークの紋様",
    boostMultiplier: 1.25,
    boostDurationDays: 3,
    description: "8万インプレ達成！拡散の羽が開いた！",
    teamType: "x"
  },
  {
    id: "algorithm_mark",
    name: "Algorithm Mark",
    japaneseName: "アルゴリズムの刻印",
    triggerValue: 150000,
    emoji: "#️⃣",
    color: "#8B5CF6",
    effect: "体に#マークの紋様",
    boostMultiplier: 1.3,
    boostDurationDays: 5,
    description: "15万インプレ達成！アルゴリズムを味方につけた！",
    teamType: "x"
  },
  {
    id: "link_chain",
    name: "Link Chain",
    japaneseName: "リンクの鎖",
    triggerValue: 500000,
    emoji: "🔗",
    color: "#F59E0B",
    effect: "体を光の鎖が巡る",
    boostMultiplier: 1.4,
    boostDurationDays: 7,
    description: "50万インプレ達成！リンクの鎖が輝く！",
    teamType: "x"
  }
];

// ============================================
// 継続バッジ（全チーム共通）
// ============================================

export interface StreakBadge {
  id: string;
  name: string;
  japaneseName: string;
  days: number;
  emoji: string;
  color: string;
  rarity: "common" | "rare" | "epic" | "ssr" | "legend";
  boostMultiplier: number;
  effect: string;
  description: string;
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    id: "streak_7",
    name: "Flame of Continuity",
    japaneseName: "継続の炎",
    days: 7,
    emoji: "🔥",
    color: "#F97316",
    rarity: "common",
    boostMultiplier: 1.1,
    effect: "XP永続1.1倍",
    description: "7日連続報告達成！継続の炎が灯った！"
  },
  {
    id: "streak_30",
    name: "Iron Will",
    japaneseName: "鉄の意志",
    days: 30,
    emoji: "💪",
    color: "#64748B",
    rarity: "rare",
    boostMultiplier: 1.2,
    effect: "XP永続1.2倍",
    description: "30日連続報告達成！鉄の意志が宿った！"
  },
  {
    id: "streak_100",
    name: "Indomitable Evangelist",
    japaneseName: "不屈の伝道師",
    days: 100,
    emoji: "⚔️",
    color: "#8B5CF6",
    rarity: "epic",
    boostMultiplier: 1.3,
    effect: "XP永続1.3倍 + 鉄壁の心変異",
    description: "100日連続報告達成！不屈の伝道師の称号を獲得！"
  },
  {
    id: "streak_200",
    name: "King of Continuity",
    japaneseName: "継続の王者",
    days: 200,
    emoji: "👑",
    color: "#F59E0B",
    rarity: "ssr",
    boostMultiplier: 1.4,
    effect: "XP永続1.4倍 + 王者の冠",
    description: "200日連続報告達成！継続の王者となった！"
  },
  {
    id: "streak_365",
    name: "Eternal Guardian",
    japaneseName: "永遠の守護者",
    days: 365,
    emoji: "🏆",
    color: "#EC4899",
    rarity: "legend",
    boostMultiplier: 1.5,
    effect: "XP永続1.5倍 + 殿堂入り + 専用オーラ",
    description: "365日連続報告達成！永遠の守護者として殿堂入り！"
  }
];

// ============================================
// XP計算ロジック（チーム別）
// ============================================

export interface XPCalculationInput {
  teamType: TeamType;
  // 動画チーム用
  views?: number;
  // Xチーム用
  impressions?: number;
  reposts?: number;
  likes?: number;
  replies?: number;
  profileVisits?: number;
  linkClicks?: number;
  likeGiven?: number;
  replyGiven?: number;
  // 共通
  postCount: number;
  streak: number;
  totalValue: number; // 累計値（進化判定用）
  isWeekend?: boolean;
  isBurningDay?: boolean;
}

export interface XPCalculationResult {
  totalXP: number;
  breakdown: {
    baseXP: number;
    streakMultiplier: number;
    continuityBonus: number;
    eventMultiplier: number;
    weekendMultiplier: number;
  };
}

// 動画チーム用XP計算
function calculateShortsXP(data: XPCalculationInput): XPCalculationResult {
  const views = data.views || 0;
  
  // 再生数XP（対数曲線）
  const viewXP = Math.floor(Math.pow(views, 0.8) * 0.3);
  
  // 投稿XP
  const postXP = data.postCount * 50;
  
  const baseXP = viewXP + postXP;
  
  // ストリーク倍率（最大2.5倍）
  const streakMultiplier = Math.min(1 + (data.streak * 0.05), 2.5);
  
  // 継続ボーナス
  const continuityBonus = getStreakBonus(data.streak);
  
  // イベント倍率
  const eventMultiplier = data.isBurningDay ? 1.5 : 1.0;
  
  // 週末ボーナス
  const weekendMultiplier = data.isWeekend ? 1.2 : 1.0;
  
  const totalXP = Math.floor(
    baseXP * streakMultiplier * continuityBonus * eventMultiplier * weekendMultiplier
  );
  
  return {
    totalXP,
    breakdown: {
      baseXP,
      streakMultiplier,
      continuityBonus,
      eventMultiplier,
      weekendMultiplier
    }
  };
}

// Xチーム用XP計算
function calculateTwitterXP(data: XPCalculationInput): XPCalculationResult {
  // 各指標のXP
  const impressionXP = (data.impressions || 0) * 1.0;
  const repostXP = (data.reposts || 0) * 1000;
  const likeXP = (data.likes || 0) * 10;
  const replyXP = (data.replies || 0) * 50;
  const profileXP = (data.profileVisits || 0) * 100;
  const linkClickXP = (data.linkClicks || 0) * 500;
  const postXP = data.postCount * 50;
  const activityXP = ((data.likeGiven || 0) * 3) + ((data.replyGiven || 0) * 10);
  
  const baseXP = impressionXP + repostXP + likeXP + replyXP + 
                 profileXP + linkClickXP + postXP + activityXP;
  
  // ストリーク倍率
  const streakMultiplier = Math.min(1 + (data.streak * 0.05), 2.5);
  
  // 継続ボーナス
  const continuityBonus = getStreakBonus(data.streak);
  
  // イベント倍率
  const eventMultiplier = data.isBurningDay ? 1.5 : 1.0;
  
  // 週末ボーナス
  const weekendMultiplier = data.isWeekend ? 1.2 : 1.0;
  
  const totalXP = Math.floor(
    baseXP * streakMultiplier * continuityBonus * eventMultiplier * weekendMultiplier
  );
  
  return {
    totalXP,
    breakdown: {
      baseXP,
      streakMultiplier,
      continuityBonus,
      eventMultiplier,
      weekendMultiplier
    }
  };
}

// メインXP計算関数（チーム自動判定）
export function calculateXP(data: XPCalculationInput): XPCalculationResult {
  if (data.teamType === "x") {
    return calculateTwitterXP(data);
  }
  return calculateShortsXP(data);
}

// 継続ボーナス取得
function getStreakBonus(streak: number): number {
  if (streak >= 365) return 1.5;
  if (streak >= 200) return 1.4;
  if (streak >= 100) return 1.3;
  if (streak >= 30) return 1.2;
  if (streak >= 7) return 1.1;
  return 1.0;
}

// ============================================
// ガーディアン進化判定
// ============================================

export function getGuardianStage(totalValue: number, teamType: TeamType): GuardianStage {
  const thresholds = teamType === "x" ? TWITTER_STAGE_THRESHOLDS : SHORTS_STAGE_THRESHOLDS;
  
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalValue >= thresholds[i].minValue) {
      return GUARDIAN_FORMS[i];
    }
  }
  return GUARDIAN_FORMS[0];
}

export function getGuardianProgress(totalValue: number, teamType: TeamType): {
  currentStage: GuardianStage;
  nextStage: GuardianStage | null;
  progress: number;
  valueToNext: number;
  currentThreshold: number;
  nextThreshold: number;
} {
  const thresholds = teamType === "x" ? TWITTER_STAGE_THRESHOLDS : SHORTS_STAGE_THRESHOLDS;
  
  let currentIndex = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalValue >= thresholds[i].minValue) {
      currentIndex = i;
      break;
    }
  }
  
  const currentStage = GUARDIAN_FORMS[currentIndex];
  const nextStage = currentIndex < GUARDIAN_FORMS.length - 1 ? GUARDIAN_FORMS[currentIndex + 1] : null;
  
  const currentThreshold = thresholds[currentIndex].minValue;
  const nextThreshold = nextStage ? thresholds[currentIndex + 1].minValue : currentThreshold;
  
  if (!nextStage) {
    return {
      currentStage,
      nextStage: null,
      progress: 100,
      valueToNext: 0,
      currentThreshold,
      nextThreshold: currentThreshold
    };
  }
  
  const valueInCurrentStage = totalValue - currentThreshold;
  const valueNeededForNext = nextThreshold - currentThreshold;
  const progress = Math.min(100, Math.round((valueInCurrentStage / valueNeededForNext) * 100));
  const valueToNext = nextThreshold - totalValue;
  
  return {
    currentStage,
    nextStage,
    progress,
    valueToNext,
    currentThreshold,
    nextThreshold
  };
}

// ============================================
// 隠し変異判定
// ============================================

export function getUnlockedMutations(totalValue: number, teamType: TeamType): HiddenMutation[] {
  const mutations = teamType === "x" ? TWITTER_MUTATIONS : SHORTS_MUTATIONS;
  return mutations.filter(m => totalValue >= m.triggerValue);
}

export function getActiveMutation(totalValue: number, teamType: TeamType): HiddenMutation | null {
  const unlocked = getUnlockedMutations(totalValue, teamType);
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
}

export function getNextMutation(totalValue: number, teamType: TeamType): HiddenMutation | null {
  const mutations = teamType === "x" ? TWITTER_MUTATIONS : SHORTS_MUTATIONS;
  return mutations.find(m => totalValue < m.triggerValue) || null;
}

// ============================================
// 継続バッジ判定
// ============================================

export function getEarnedStreakBadges(streak: number): StreakBadge[] {
  return STREAK_BADGES.filter(b => streak >= b.days);
}

export function getHighestStreakBadge(streak: number): StreakBadge | null {
  const earned = getEarnedStreakBadges(streak);
  return earned.length > 0 ? earned[earned.length - 1] : null;
}

export function getNextStreakBadge(streak: number): StreakBadge | null {
  return STREAK_BADGES.find(b => streak < b.days) || null;
}

// ============================================
// Legend特典
// ============================================

export interface LegendReward {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  isUnlocked: boolean;
  teamType: TeamType;
}

export function getLegendRewardStatus(totalValue: number, teamType: TeamType): LegendReward {
  const requirement = teamType === "x" ? 2000000 : 20000000;
  const unit = teamType === "x" ? "インプレッション" : "再生";
  
  return {
    id: "sugawara_1on1",
    name: "菅原副社長との1on1個別戦略会議",
    description: `株式会社C-Creation取締役副社長・菅原との直接1on1。あなただけの戦略を立案します。`,
    icon: "👑",
    requirement,
    isUnlocked: totalValue >= requirement,
    teamType
  };
}

// ============================================
// フォーマットユーティリティ
// ============================================

export function formatValue(value: number, teamType: TeamType): string {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(1)}千万`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`;
  }
  return value.toLocaleString();
}

export function formatValueShort(value: number): string {
  if (value >= 10000000) {
    return `${Math.floor(value / 10000000)}千万`;
  }
  if (value >= 10000) {
    return `${Math.floor(value / 10000)}万`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

export function getValueUnit(teamType: TeamType): string {
  return teamType === "x" ? "インプレ" : "再生";
}

export function getTeamAccentColor(teamType: TeamType): string {
  return teamType === "x" ? "#06B6D4" : "#EC4899";
}

// ============================================
// 週末・イベント判定
// ============================================

export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

export function isBurningDay(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  if (day === 5 && hour >= 18) return true;
  if (day === 6) return true;
  if (day === 0) return true;
  
  return false;
}

// ============================================
// バッジレアリティカラー
// ============================================

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "common": return "#9CA3AF";
    case "rare": return "#3B82F6";
    case "epic": return "#8B5CF6";
    case "ssr": return "#F59E0B";
    case "legend": return "#EC4899";
    default: return "#9CA3AF";
  }
}

export function getRarityGlow(rarity: string): string {
  switch (rarity) {
    case "common": return "rgba(156, 163, 175, 0.3)";
    case "rare": return "rgba(59, 130, 246, 0.4)";
    case "epic": return "rgba(139, 92, 246, 0.5)";
    case "ssr": return "rgba(245, 158, 11, 0.6)";
    case "legend": return "rgba(236, 72, 153, 0.7)";
    default: return "rgba(156, 163, 175, 0.3)";
  }
}
