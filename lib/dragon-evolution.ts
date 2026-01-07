/**
 * 🐉 アカウント守護龍 進化システム
 * 
 * SNS運用メンバーのアカウントを守る龍が、
 * 毎日の報告（数字というエネルギー）を糧に進化していく
 * 
 * 進化スケジュール:
 * - 覚醒期 (0-3日): 毎日進化 → 最初の3日間でWOW体験
 * - 成長期 (4-10日): 2日に1回進化
 * - 習慣化期 (11-24日): 3日に1回進化
 * - 定着期 (25-45日): 5日に1回進化
 */

import { Timestamp } from "firebase/firestore";

// =====================================
// 🐉 進化段階の定義
// =====================================

export interface DragonStage {
  stage: number;
  name: string;
  imageUrl: string;
  days: number;          // この段階に到達するのに必要な連続日数
  auraColor: string | null;  // ランキングでのオーラ色（nullはオーラなし）
  auraType?: 'solid' | 'gradient' | 'pulse' | 'rainbow';  // オーラの種類
  description: string;
  celebrationMessage: string;
}

export const DRAGON_STAGES: DragonStage[] = [
  // 【覚醒期】0-3日: 毎日進化（WOW体験）
  { 
    stage: 0, 
    name: "守護の卵", 
    imageUrl: "/images/dragons/stage00_egg.png", 
    days: 0, 
    auraColor: null,
    description: "あなたの守護龍が眠っています",
    celebrationMessage: "守護龍の卵を授かりました！毎日の報告で目覚めさせましょう！"
  },
  { 
    stage: 1, 
    name: "幼龍", 
    imageUrl: "/images/dragons/stage01_baby.png", 
    days: 1, 
    auraColor: null,
    description: "卵から生まれたばかりの幼い龍",
    celebrationMessage: "🎉 おめでとう！守護龍が誕生しました！明日も報告して成長させよう！"
  },
  { 
    stage: 2, 
    name: "成長龍", 
    imageUrl: "/images/dragons/stage02_growing.png", 
    days: 2, 
    auraColor: null,
    description: "少しずつ力をつけ始めた龍",
    celebrationMessage: "🌟 2日連続達成！守護龍が成長しています！"
  },
  { 
    stage: 3, 
    name: "若龍", 
    imageUrl: "/images/dragons/stage03_young.png", 
    days: 3, 
    auraColor: "#ef4444", // 赤オーラ
    auraType: 'solid',
    description: "初めてのオーラを纏った若き龍",
    celebrationMessage: "🔥 3日連続達成！若龍に進化し、最初のオーラを獲得！ランキングで輝きます！"
  },

  // 【成長期】4-10日: 2日に1回進化
  { 
    stage: 4, 
    name: "飛龍", 
    imageUrl: "/images/dragons/stage04_flying.png", 
    days: 5, 
    auraColor: "#3b82f6", // 青オーラ
    auraType: 'solid',
    description: "大空を舞う力を得た龍",
    celebrationMessage: "🌊 5日連続達成！飛龍に進化！大空を舞う力を得ました！"
  },
  { 
    stage: 5, 
    name: "蒼龍", 
    imageUrl: "/images/dragons/stage05_blue.png", 
    days: 7, 
    auraColor: "#06b6d4", // シアンオーラ
    auraType: 'gradient',
    description: "1週間の継続で蒼き輝きを得た龍",
    celebrationMessage: "💎 1週間連続達成！蒼龍に進化！習慣が根付いています！"
  },
  { 
    stage: 6, 
    name: "翠龍", 
    imageUrl: "/images/dragons/stage06_emerald.png", 
    days: 9, 
    auraColor: "#22c55e", // 緑オーラ
    auraType: 'gradient',
    description: "生命の力を宿した翠の龍",
    celebrationMessage: "🌿 9日連続達成！翠龍に進化！生命の力が溢れています！"
  },

  // 【習慣化期】11-24日: 3日に1回進化
  { 
    stage: 7, 
    name: "紫龍", 
    imageUrl: "/images/dragons/stage07_purple.png", 
    days: 12, 
    auraColor: "#a855f7", // 紫オーラ
    auraType: 'gradient',
    description: "神秘の力に目覚めた紫の龍",
    celebrationMessage: "💜 12日連続達成！紫龍に進化！神秘の力が宿りました！"
  },
  { 
    stage: 8, 
    name: "炎龍", 
    imageUrl: "/images/dragons/stage08_fire.png", 
    days: 15, 
    auraColor: "#f97316", // オレンジオーラ
    auraType: 'pulse',
    description: "灼熱の炎を操る龍",
    celebrationMessage: "🔥 15日連続達成！炎龍に進化！灼熱の力を手に入れました！"
  },
  { 
    stage: 9, 
    name: "雷龍", 
    imageUrl: "/images/dragons/stage09_thunder.png", 
    days: 18, 
    auraColor: "#eab308", // 黄オーラ
    auraType: 'pulse',
    description: "稲妻を纏う雷の龍",
    celebrationMessage: "⚡ 18日連続達成！雷龍に進化！稲妻の速さを得ました！"
  },
  { 
    stage: 10, 
    name: "聖龍", 
    imageUrl: "/images/dragons/stage10_holy.png", 
    days: 21, 
    auraColor: "#fbbf24", // 金オーラ
    auraType: 'pulse',
    description: "3週間の継続で聖なる力を得た龍",
    celebrationMessage: "✨ 3週間連続達成！聖龍に進化！聖なる光が宿りました！"
  },
  { 
    stage: 11, 
    name: "宝石龍", 
    imageUrl: "/images/dragons/stage11_jewel.png", 
    days: 24, 
    auraColor: "#ec4899", // ピンクオーラ
    auraType: 'pulse',
    description: "全身が宝石のように輝く龍",
    celebrationMessage: "💎 24日連続達成！宝石龍に進化！全身が輝いています！"
  },

  // 【定着期】25-45日: 5日に1回進化
  { 
    stage: 12, 
    name: "王龍", 
    imageUrl: "/images/dragons/stage12_king.png", 
    days: 30, 
    auraColor: "linear-gradient(45deg, #fbbf24, #f59e0b)", // 金グラデーション
    auraType: 'gradient',
    description: "1ヶ月の継続で王の称号を得た龍",
    celebrationMessage: "👑 1ヶ月連続達成！王龍に進化！あなたは龍の王です！"
  },
  { 
    stage: 13, 
    name: "伝説龍", 
    imageUrl: "/images/dragons/stage13_legend.png", 
    days: 35, 
    auraColor: "linear-gradient(45deg, #a855f7, #ec4899)", // 紫ピンクグラデーション
    auraType: 'rainbow',
    description: "伝説として語り継がれる龍",
    celebrationMessage: "🏆 35日連続達成！伝説龍に進化！あなたの名は伝説となる！"
  },
  { 
    stage: 14, 
    name: "神話龍", 
    imageUrl: "/images/dragons/stage14_myth.png", 
    days: 40, 
    auraColor: "linear-gradient(45deg, #06b6d4, #3b82f6, #a855f7)", // マルチグラデーション
    auraType: 'rainbow',
    description: "神話の領域に到達した龍",
    celebrationMessage: "🌟 40日連続達成！神話龍に進化！神話の領域へ！"
  },
  { 
    stage: 15, 
    name: "虹龍", 
    imageUrl: "/images/dragons/stage15_rainbow.png", 
    days: 45, 
    auraColor: "linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7)", // 虹色
    auraType: 'rainbow',
    description: "45日の継続で到達した究極の龍 - Season 1 殿堂入り",
    celebrationMessage: "🌈 45日連続達成！虹龍に進化！Season 1 殿堂入りおめでとう！"
  },
];

// =====================================
// 🎰 確変（フィーバー）ロジック
// =====================================

const BOOST_CHANCE = 0.05; // 5% = 1/20の確率

export interface BoostResult {
  triggered: boolean;
  message: string;
  daysAdded: number;
}

/**
 * 報告完了時に確変（進化ブースト）を判定
 * 1/20の確率で発動し、進化日数を1日短縮
 */
export function checkEvolutionBoost(): BoostResult {
  const roll = Math.random();
  
  if (roll < BOOST_CHANCE) {
    return {
      triggered: true,
      message: "🎰 進化ブースト発動！次の進化まであと1日短縮！",
      daysAdded: 1
    };
  }
  
  return {
    triggered: false,
    message: "",
    daysAdded: 0
  };
}

// =====================================
// 🐉 進化判定ロジック
// =====================================

export interface DragonStatus {
  current: DragonStage;
  next: DragonStage | null;
  daysToNext: number;
  isMaxLevel: boolean;
  progressPercent: number;  // 次の進化までの進捗率
}

/**
 * 有効ストリーク（実際の連続日数 + ブースト加算）から龍の進化段階を取得
 */
export function getDragonStage(effectiveStreak: number): DragonStatus {
  // 逆順で最初にマッチする段階を返す
  for (let i = DRAGON_STAGES.length - 1; i >= 0; i--) {
    if (effectiveStreak >= DRAGON_STAGES[i].days) {
      const current = DRAGON_STAGES[i];
      const next = DRAGON_STAGES[i + 1] || null;
      const isMaxLevel = i === DRAGON_STAGES.length - 1;
      
      let daysToNext = 0;
      let progressPercent = 100;
      
      if (next) {
        daysToNext = next.days - effectiveStreak;
        const daysInCurrentStage = effectiveStreak - current.days;
        const daysNeededForNext = next.days - current.days;
        progressPercent = Math.min(100, Math.round((daysInCurrentStage / daysNeededForNext) * 100));
      }
      
      return {
        current,
        next,
        daysToNext,
        isMaxLevel,
        progressPercent
      };
    }
  }
  
  // デフォルト: 卵
  return {
    current: DRAGON_STAGES[0],
    next: DRAGON_STAGES[1],
    daysToNext: 1,
    isMaxLevel: false,
    progressPercent: 0
  };
}

/**
 * 進化が発生したかどうかを判定
 */
export function checkEvolution(
  previousEffectiveStreak: number,
  newEffectiveStreak: number
): {
  evolved: boolean;
  previousStage: DragonStage;
  newStage: DragonStage;
  isFirstAura: boolean;  // 初めてオーラを獲得したか
} {
  const previousStatus = getDragonStage(previousEffectiveStreak);
  const newStatus = getDragonStage(newEffectiveStreak);
  
  const evolved = newStatus.current.stage > previousStatus.current.stage;
  const isFirstAura = !previousStatus.current.auraColor && !!newStatus.current.auraColor;
  
  return {
    evolved,
    previousStage: previousStatus.current,
    newStage: newStatus.current,
    isFirstAura
  };
}

// =====================================
// 📊 Firestore用データ構造
// =====================================

export interface DragonData {
  currentStage: number;       // 現在の進化段階（0-15）
  actualStreak: number;       // 実際の連続日数
  boostCount: number;         // 確変で獲得した日数の合計
  effectiveStreak: number;    // actualStreak + boostCount
  lastReportDate: Timestamp | null;  // 最後の報告日時
  lastEvolutionDate: Timestamp | null;  // 最後の進化日時
  evolutionHistory: EvolutionRecord[];  // 進化履歴
  seasonNumber: number;       // 現在のシーズン番号
  totalBoostCount: number;    // 累計確変発動回数
}

export interface EvolutionRecord {
  stage: number;
  stageName: string;
  date: Timestamp;
  boosted: boolean;  // この進化が確変で早まったか
}

/**
 * 新規ユーザー用のデフォルト龍データを生成
 */
export function createDefaultDragonData(): DragonData {
  return {
    currentStage: 0,
    actualStreak: 0,
    boostCount: 0,
    effectiveStreak: 0,
    lastReportDate: null,
    lastEvolutionDate: null,
    evolutionHistory: [],
    seasonNumber: 1,
    totalBoostCount: 0
  };
}

// =====================================
// 🔄 報告時の龍更新ロジック
// =====================================

export interface ReportUpdateResult {
  newDragonData: DragonData;
  evolved: boolean;
  evolutionInfo: {
    previousStage: DragonStage;
    newStage: DragonStage;
    isFirstAura: boolean;
  } | null;
  boostResult: BoostResult;
  streakBroken: boolean;  // ストリークが途切れたか
}

/**
 * 報告時に龍データを更新
 * 
 * @param currentData 現在の龍データ
 * @param lastReportDate 最後の報告日時
 * @param now 現在時刻
 */
export function updateDragonOnReport(
  currentData: DragonData,
  now: Date = new Date()
): ReportUpdateResult {
  const lastReport = currentData.lastReportDate?.toDate() || null;
  
  // ストリーク判定
  let newActualStreak = currentData.actualStreak;
  let streakBroken = false;
  
  if (!lastReport) {
    // 初回報告
    newActualStreak = 1;
  } else {
    const hoursSinceLastReport = (now.getTime() - lastReport.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastReport < 24) {
      // 24時間以内: 同日扱い、ストリーク変化なし
      // ただし、報告日時は更新
    } else if (hoursSinceLastReport < 48) {
      // 24-48時間: ストリーク継続（+1）
      newActualStreak = currentData.actualStreak + 1;
    } else {
      // 48時間以上: ストリーク途切れ（リセット）
      newActualStreak = 1;
      streakBroken = true;
    }
  }
  
  // ストリークが途切れた場合、ブーストもリセット
  let newBoostCount = streakBroken ? 0 : currentData.boostCount;
  
  // 確変チェック（ストリークが途切れていない場合のみ）
  const boostResult = streakBroken ? { triggered: false, message: "", daysAdded: 0 } : checkEvolutionBoost();
  
  if (boostResult.triggered) {
    newBoostCount += boostResult.daysAdded;
  }
  
  const newEffectiveStreak = newActualStreak + newBoostCount;
  
  // 進化判定
  const evolutionCheck = checkEvolution(
    currentData.effectiveStreak,
    newEffectiveStreak
  );
  
  // 新しい龍データを構築
  const newDragonData: DragonData = {
    ...currentData,
    actualStreak: newActualStreak,
    boostCount: newBoostCount,
    effectiveStreak: newEffectiveStreak,
    currentStage: evolutionCheck.newStage.stage,
    lastReportDate: Timestamp.fromDate(now),
    totalBoostCount: currentData.totalBoostCount + (boostResult.triggered ? 1 : 0)
  };
  
  // 進化した場合、履歴に追加
  if (evolutionCheck.evolved) {
    newDragonData.lastEvolutionDate = Timestamp.fromDate(now);
    newDragonData.evolutionHistory = [
      ...currentData.evolutionHistory,
      {
        stage: evolutionCheck.newStage.stage,
        stageName: evolutionCheck.newStage.name,
        date: Timestamp.fromDate(now),
        boosted: boostResult.triggered
      }
    ];
  }
  
  return {
    newDragonData,
    evolved: evolutionCheck.evolved,
    evolutionInfo: evolutionCheck.evolved ? evolutionCheck : null,
    boostResult,
    streakBroken
  };
}

// =====================================
// 🏆 シーズン関連（将来拡張用）
// =====================================

export interface SeasonData {
  seasonNumber: number;
  completedDragons: CompletedDragon[];
}

export interface CompletedDragon {
  seasonNumber: number;
  finalStage: number;
  finalStageName: string;
  completedAt: Timestamp;
  totalDays: number;
  totalBoosts: number;
}

/**
 * シーズンクリア（殿堂入り）処理
 * 虹龍（stage 15）到達時に呼び出す
 */
export function completeSeason(
  dragonData: DragonData,
  now: Date = new Date()
): {
  completedDragon: CompletedDragon;
  newSeasonDragonData: DragonData;
  inheritedBonus: number;  // 継承ボーナス（次シーズンの初期ブースト）
} {
  const finalStage = DRAGON_STAGES[dragonData.currentStage];
  
  // 殿堂入り記録
  const completedDragon: CompletedDragon = {
    seasonNumber: dragonData.seasonNumber,
    finalStage: dragonData.currentStage,
    finalStageName: finalStage.name,
    completedAt: Timestamp.fromDate(now),
    totalDays: dragonData.actualStreak,
    totalBoosts: dragonData.totalBoostCount
  };
  
  // 継承ボーナス計算（前シーズンの最終段階に応じて）
  // 虹龍到達 = 5日分のブースト、それ以下は段階に応じて減少
  const inheritedBonus = Math.floor(dragonData.currentStage / 3);
  
  // 新シーズン用の龍データ
  const newSeasonDragonData: DragonData = {
    currentStage: 0,
    actualStreak: 0,
    boostCount: inheritedBonus,  // 継承ボーナスを初期ブーストとして付与
    effectiveStreak: inheritedBonus,
    lastReportDate: null,
    lastEvolutionDate: null,
    evolutionHistory: [],
    seasonNumber: dragonData.seasonNumber + 1,
    totalBoostCount: 0
  };
  
  return {
    completedDragon,
    newSeasonDragonData,
    inheritedBonus
  };
}

// =====================================
// 🎨 表示用ヘルパー関数
// =====================================

/**
 * オーラのCSSスタイルを生成
 */
export function getAuraStyle(stage: DragonStage): React.CSSProperties | null {
  if (!stage.auraColor) return null;
  
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    inset: '-8px',
    borderRadius: '50%',
    zIndex: -1
  };
  
  switch (stage.auraType) {
    case 'solid':
      return {
        ...baseStyle,
        background: stage.auraColor,
        opacity: 0.5,
        filter: 'blur(8px)'
      };
    case 'gradient':
      return {
        ...baseStyle,
        background: stage.auraColor,
        opacity: 0.6,
        filter: 'blur(12px)'
      };
    case 'pulse':
      return {
        ...baseStyle,
        background: stage.auraColor,
        opacity: 0.7,
        filter: 'blur(16px)',
        animation: 'pulse 2s ease-in-out infinite'
      };
    case 'rainbow':
      return {
        ...baseStyle,
        background: stage.auraColor,
        opacity: 0.8,
        filter: 'blur(20px)',
        animation: 'rainbow-rotate 3s linear infinite'
      };
    default:
      return null;
  }
}

/**
 * 次の進化までの残り日数をフレンドリーな文字列で返す
 */
export function getDaysToNextText(daysToNext: number): string {
  if (daysToNext === 0) return "最終進化到達！";
  if (daysToNext === 1) return "あと1日で進化！";
  return `あと${daysToNext}日で進化`;
}

/**
 * 進化段階に応じたランキング表示用のクラス名を返す
 */
export function getRankingAuraClass(stage: number): string {
  if (stage >= 15) return "aura-rainbow";
  if (stage >= 12) return "aura-gold";
  if (stage >= 7) return "aura-purple";
  if (stage >= 4) return "aura-blue";
  if (stage >= 3) return "aura-red";
  return "";
}
