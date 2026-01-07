/**
 * 🛡️ Guardian（守護神）進化システム
 * 
 * SNS運用メンバーの「相棒」として、毎日の報告で進化していく守護神
 * 
 * 3つのスタイル（御三家）:
 * - 【剛】Power Style: 力強く重厚なファンタジー系
 * - 【雅】Beauty Style: 優美で洗練されたアート系
 * - 【智】Cyber Style: クールで先進的なサイバーパンク系
 * 
 * 進化スケジュール:
 * - 覚醒期 (0-3日): 毎日進化 → 最初の3日間でWOW体験
 * - 成長期 (4-10日): 2日に1回進化
 * - 習慣化期 (11-24日): 3日に1回進化
 * - 定着期 (25-45日): 5日に1回進化
 */

import { Timestamp } from "firebase/firestore";

// =====================================
// 📊 ユーザー属性の定義
// =====================================

export type Gender = "male" | "female" | "other";
export type AgeGroup = "10s" | "20s" | "30s" | "40s" | "50plus";

export const GENDER_OPTIONS = [
  { value: "male" as Gender, label: "男性" },
  { value: "female" as Gender, label: "女性" },
  { value: "other" as Gender, label: "回答しない" },
];

export const AGE_GROUP_OPTIONS = [
  { value: "10s" as AgeGroup, label: "10代" },
  { value: "20s" as AgeGroup, label: "20代" },
  { value: "30s" as AgeGroup, label: "30代" },
  { value: "40s" as AgeGroup, label: "40代" },
  { value: "50plus" as AgeGroup, label: "50代以上" },
];

// =====================================
// 🛡️ 守護神スタイル（御三家）の定義
// =====================================

export type GuardianStyle = "power" | "beauty" | "cyber";

export interface GuardianStyleInfo {
  id: GuardianStyle;
  name: string;
  japaneseName: string;
  description: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  imageFolder: string;
}

export const GUARDIAN_STYLES: Record<GuardianStyle, GuardianStyleInfo> = {
  power: {
    id: "power",
    name: "Power Style",
    japaneseName: "【剛】",
    description: "力強く重厚な、王道ファンタジーの守護神",
    color: "#ef4444",
    gradientFrom: "#dc2626",
    gradientTo: "#f97316",
    imageFolder: "power"
  },
  beauty: {
    id: "beauty",
    name: "Beauty Style",
    japaneseName: "【雅】",
    description: "優美で洗練された、芸術的な守護神",
    color: "#ec4899",
    gradientFrom: "#db2777",
    gradientTo: "#a855f7",
    imageFolder: "beauty"
  },
  cyber: {
    id: "cyber",
    name: "Cyber Style",
    japaneseName: "【智】",
    description: "クールで先進的な、デジタルの守護神",
    color: "#06b6d4",
    gradientFrom: "#0891b2",
    gradientTo: "#3b82f6",
    imageFolder: "cyber"
  }
};

// =====================================
// 🎭 進化段階の定義
// =====================================

export interface GuardianStage {
  stage: number;
  name: string;
  days: number;          // この段階に到達するのに必要な連続日数
  auraColor: string | null;
  auraType?: 'solid' | 'gradient' | 'pulse' | 'rainbow';
  description: string;
  celebrationMessage: string;
}

// 進化段階（全スタイル共通の構造、ビジュアルはスタイルで異なる）
export const GUARDIAN_STAGES: GuardianStage[] = [
  // 【覚醒期】0-3日: 毎日進化（WOW体験）
  { 
    stage: 0, 
    name: "守護の卵", 
    days: 0, 
    auraColor: null,
    description: "あなたの守護神が眠っています",
    celebrationMessage: "守護神の卵を授かりました！毎日の報告で目覚めさせましょう！"
  },
  { 
    stage: 1, 
    name: "目覚め", 
    days: 1, 
    auraColor: null,
    description: "守護神が目を覚ましました",
    celebrationMessage: "🎉 おめでとう！守護神が誕生しました！明日も報告して成長させよう！"
  },
  { 
    stage: 2, 
    name: "芽生え", 
    days: 2, 
    auraColor: null,
    description: "力が芽生え始めています",
    celebrationMessage: "🌟 2日連続達成！守護神が成長しています！"
  },
  { 
    stage: 3, 
    name: "覚醒", 
    days: 3, 
    auraColor: "#ef4444",
    auraType: 'solid',
    description: "初めてのオーラを纏いました",
    celebrationMessage: "🔥 3日連続達成！覚醒し、最初のオーラを獲得！ランキングで輝きます！"
  },

  // 【成長期】4-10日: 2日に1回進化
  { 
    stage: 4, 
    name: "躍動", 
    days: 5, 
    auraColor: "#3b82f6",
    auraType: 'solid',
    description: "力強く躍動しています",
    celebrationMessage: "🌊 5日連続達成！躍動の力を得ました！"
  },
  { 
    stage: 5, 
    name: "昇華", 
    days: 7, 
    auraColor: "#06b6d4",
    auraType: 'gradient',
    description: "1週間の継続で昇華しました",
    celebrationMessage: "💎 1週間連続達成！昇華を遂げました！習慣が根付いています！"
  },
  { 
    stage: 6, 
    name: "輝耀", 
    days: 9, 
    auraColor: "#22c55e",
    auraType: 'gradient',
    description: "眩い輝きを放っています",
    celebrationMessage: "🌿 9日連続達成！輝耀の力が溢れています！"
  },

  // 【習慣化期】11-24日: 3日に1回進化
  { 
    stage: 7, 
    name: "神秘", 
    days: 12, 
    auraColor: "#a855f7",
    auraType: 'gradient',
    description: "神秘の力に目覚めました",
    celebrationMessage: "💜 12日連続達成！神秘の力が宿りました！"
  },
  { 
    stage: 8, 
    name: "烈火", 
    days: 15, 
    auraColor: "#f97316",
    auraType: 'pulse',
    description: "燃え盛る意志を持っています",
    celebrationMessage: "🔥 15日連続達成！烈火の意志を手に入れました！"
  },
  { 
    stage: 9, 
    name: "迅雷", 
    days: 18, 
    auraColor: "#eab308",
    auraType: 'pulse',
    description: "雷のような速さを得ました",
    celebrationMessage: "⚡ 18日連続達成！迅雷の速さを得ました！"
  },
  { 
    stage: 10, 
    name: "聖光", 
    days: 21, 
    auraColor: "#fbbf24",
    auraType: 'pulse',
    description: "3週間の継続で聖なる光を得ました",
    celebrationMessage: "✨ 3週間連続達成！聖光が宿りました！"
  },
  { 
    stage: 11, 
    name: "宝輝", 
    days: 24, 
    auraColor: "#ec4899",
    auraType: 'pulse',
    description: "宝石のように輝いています",
    celebrationMessage: "💎 24日連続達成！宝輝の力で全身が輝いています！"
  },

  // 【定着期】25-45日: 5日に1回進化
  { 
    stage: 12, 
    name: "王威", 
    days: 30, 
    auraColor: "linear-gradient(45deg, #fbbf24, #f59e0b)",
    auraType: 'gradient',
    description: "1ヶ月の継続で王の威厳を得ました",
    celebrationMessage: "👑 1ヶ月連続達成！王威を獲得！あなたは守護神の王です！"
  },
  { 
    stage: 13, 
    name: "伝説", 
    days: 35, 
    auraColor: "linear-gradient(45deg, #a855f7, #ec4899)",
    auraType: 'rainbow',
    description: "伝説として語り継がれる存在に",
    celebrationMessage: "🏆 35日連続達成！伝説に進化！あなたの名は語り継がれる！"
  },
  { 
    stage: 14, 
    name: "神話", 
    days: 40, 
    auraColor: "linear-gradient(45deg, #06b6d4, #3b82f6, #a855f7)",
    auraType: 'rainbow',
    description: "神話の領域に到達しました",
    celebrationMessage: "🌟 40日連続達成！神話の領域へ！"
  },
  { 
    stage: 15, 
    name: "究極", 
    days: 45, 
    auraColor: "linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7)",
    auraType: 'rainbow',
    description: "45日の継続で到達した究極の存在 - Season 1 殿堂入り",
    celebrationMessage: "🌈 45日連続達成！究極の守護神に進化！Season 1 殿堂入りおめでとう！"
  },
];

// =====================================
// 🖼️ 画像パス生成
// =====================================

/**
 * 守護神の画像パスを取得
 */
export function getGuardianImagePath(style: GuardianStyle, stage: number): string {
  const styleInfo = GUARDIAN_STYLES[style];
  return `/images/guardians/${styleInfo.imageFolder}/stage${stage.toString().padStart(2, '0')}.png`;
}

/**
 * プレースホルダー画像（開発用）
 */
export function getPlaceholderImage(style: GuardianStyle, stage: number): string {
  // 実際の画像がない場合のプレースホルダー
  return `/images/guardians/placeholder.png`;
}

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
// 🛡️ 進化判定ロジック
// =====================================

export interface GuardianStatus {
  current: GuardianStage;
  next: GuardianStage | null;
  daysToNext: number;
  isMaxLevel: boolean;
  progressPercent: number;
}

/**
 * 有効ストリークから守護神の進化段階を取得
 */
export function getGuardianStage(effectiveStreak: number): GuardianStatus {
  for (let i = GUARDIAN_STAGES.length - 1; i >= 0; i--) {
    if (effectiveStreak >= GUARDIAN_STAGES[i].days) {
      const current = GUARDIAN_STAGES[i];
      const next = GUARDIAN_STAGES[i + 1] || null;
      const isMaxLevel = i === GUARDIAN_STAGES.length - 1;
      
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
  
  return {
    current: GUARDIAN_STAGES[0],
    next: GUARDIAN_STAGES[1],
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
  previousStage: GuardianStage;
  newStage: GuardianStage;
  isFirstAura: boolean;
} {
  const previousStatus = getGuardianStage(previousEffectiveStreak);
  const newStatus = getGuardianStage(newEffectiveStreak);
  
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

export interface GuardianData {
  id: string;                    // 守護神のユニークID（複数育成対応）
  style: GuardianStyle;          // 選択したスタイル
  name?: string;                 // ユーザーが付けた名前（オプション）
  currentStage: number;
  actualStreak: number;
  boostCount: number;
  effectiveStreak: number;
  lastReportDate: Timestamp | null;
  lastEvolutionDate: Timestamp | null;
  evolutionHistory: EvolutionRecord[];
  seasonNumber: number;
  totalBoostCount: number;
  isActive: boolean;             // 現在アクティブな守護神か
  createdAt: Timestamp;
}

export interface EvolutionRecord {
  stage: number;
  stageName: string;
  date: Timestamp;
  boosted: boolean;
}

export interface UserProfile {
  gender?: Gender;
  ageGroup?: AgeGroup;
  guardians: GuardianData[];     // 複数育成対応（配列）
  activeGuardianId?: string;     // 現在アクティブな守護神のID
  completedSeasons: CompletedSeason[];
}

export interface CompletedSeason {
  guardianId: string;
  seasonNumber: number;
  style: GuardianStyle;
  finalStage: number;
  finalStageName: string;
  completedAt: Timestamp;
  totalDays: number;
  totalBoosts: number;
}

/**
 * 新規守護神データを生成
 */
export function createNewGuardian(style: GuardianStyle, name?: string): GuardianData {
  const id = `guardian_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    style,
    name,
    currentStage: 0,
    actualStreak: 0,
    boostCount: 0,
    effectiveStreak: 0,
    lastReportDate: null,
    lastEvolutionDate: null,
    evolutionHistory: [],
    seasonNumber: 1,
    totalBoostCount: 0,
    isActive: true,
    createdAt: Timestamp.now()
  };
}

/**
 * デフォルトのユーザープロフィールを生成
 */
export function createDefaultUserProfile(): UserProfile {
  return {
    guardians: [],
    completedSeasons: []
  };
}

// =====================================
// 🔄 報告時の守護神更新ロジック
// =====================================

export interface ReportUpdateResult {
  newGuardianData: GuardianData;
  evolved: boolean;
  evolutionInfo: {
    previousStage: GuardianStage;
    newStage: GuardianStage;
    isFirstAura: boolean;
  } | null;
  boostResult: BoostResult;
  streakBroken: boolean;
}

/**
 * 報告時に守護神データを更新
 */
export function updateGuardianOnReport(
  currentData: GuardianData,
  now: Date = new Date()
): ReportUpdateResult {
  const lastReport = currentData.lastReportDate?.toDate() || null;
  
  let newActualStreak = currentData.actualStreak;
  let streakBroken = false;
  
  if (!lastReport) {
    newActualStreak = 1;
  } else {
    const hoursSinceLastReport = (now.getTime() - lastReport.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastReport < 24) {
      // 24時間以内: 同日扱い
    } else if (hoursSinceLastReport < 48) {
      // 24-48時間: ストリーク継続
      newActualStreak = currentData.actualStreak + 1;
    } else {
      // 48時間以上: リセット
      newActualStreak = 1;
      streakBroken = true;
    }
  }
  
  let newBoostCount = streakBroken ? 0 : currentData.boostCount;
  const boostResult = streakBroken ? { triggered: false, message: "", daysAdded: 0 } : checkEvolutionBoost();
  
  if (boostResult.triggered) {
    newBoostCount += boostResult.daysAdded;
  }
  
  const newEffectiveStreak = newActualStreak + newBoostCount;
  
  const evolutionCheck = checkEvolution(
    currentData.effectiveStreak,
    newEffectiveStreak
  );
  
  const newGuardianData: GuardianData = {
    ...currentData,
    actualStreak: newActualStreak,
    boostCount: newBoostCount,
    effectiveStreak: newEffectiveStreak,
    currentStage: evolutionCheck.newStage.stage,
    lastReportDate: Timestamp.fromDate(now),
    totalBoostCount: currentData.totalBoostCount + (boostResult.triggered ? 1 : 0)
  };
  
  if (evolutionCheck.evolved) {
    newGuardianData.lastEvolutionDate = Timestamp.fromDate(now);
    newGuardianData.evolutionHistory = [
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
    newGuardianData,
    evolved: evolutionCheck.evolved,
    evolutionInfo: evolutionCheck.evolved ? evolutionCheck : null,
    boostResult,
    streakBroken
  };
}

// =====================================
// 💬 パーソナライズメッセージエンジン
// =====================================

interface MessageContext {
  userName: string;
  gender?: Gender;
  ageGroup?: AgeGroup;
  style?: GuardianStyle;
  stage?: number;
  streak?: number;
}

type MessageType = 
  | 'welcome'           // 初回登録
  | 'report_success'    // 報告完了
  | 'evolution'         // 進化時
  | 'streak_warning'    // ストリーク警告
  | 'boost_triggered'   // 確変発動
  | 'encouragement';    // 励まし

/**
 * パーソナライズされたメッセージを取得
 */
export function getPersonalizedMessage(
  type: MessageType,
  context: MessageContext
): string {
  const { userName, gender, ageGroup, style, stage, streak } = context;
  
  // 敬称の決定
  const honorific = getHonorific(gender, ageGroup);
  const displayName = `${userName}${honorific}`;
  
  // スタイルに応じた口調
  const tone = getTone(gender, ageGroup, style);
  
  switch (type) {
    case 'welcome':
      return getWelcomeMessage(displayName, tone);
    case 'report_success':
      return getReportSuccessMessage(displayName, tone, streak || 0);
    case 'evolution':
      return getEvolutionMessage(displayName, tone, stage || 0);
    case 'streak_warning':
      return getStreakWarningMessage(displayName, tone, streak || 0);
    case 'boost_triggered':
      return getBoostTriggeredMessage(displayName, tone);
    case 'encouragement':
      return getEncouragementMessage(displayName, tone, streak || 0);
    default:
      return `${displayName}、今日も頑張りましょう！`;
  }
}

// 敬称の決定
function getHonorific(gender?: Gender, ageGroup?: AgeGroup): string {
  if (!gender || !ageGroup) return "さん";
  
  // 40代以上の男性には「氏」も選択肢に
  if (gender === "male" && (ageGroup === "40s" || ageGroup === "50plus")) {
    return Math.random() > 0.5 ? "さん" : "氏";
  }
  
  return "さん";
}

// 口調の種類
type Tone = 'formal' | 'friendly' | 'cute' | 'cool';

// スタイル・属性に応じた口調を決定
function getTone(gender?: Gender, ageGroup?: AgeGroup, style?: GuardianStyle): Tone {
  // スタイル優先
  if (style === "beauty" && gender === "female") return "cute";
  if (style === "cyber") return "cool";
  if (style === "power" && (ageGroup === "40s" || ageGroup === "50plus")) return "formal";
  
  // デフォルト
  if (ageGroup === "10s" || ageGroup === "20s") return "friendly";
  if (ageGroup === "40s" || ageGroup === "50plus") return "formal";
  
  return "friendly";
}

// 各種メッセージ生成
function getWelcomeMessage(name: string, tone: Tone): string {
  switch (tone) {
    case 'cute':
      return `${name}、ようこそ！✨ 一緒に頑張っていきましょうね！`;
    case 'cool':
      return `${name}、システムへのアクセスを確認。共に成長していこう。`;
    case 'formal':
      return `${name}、ご登録ありがとうございます。着実に成果を積み上げていきましょう。`;
    default:
      return `${name}、ようこそ！一緒に頑張っていきましょう！`;
  }
}

function getReportSuccessMessage(name: string, tone: Tone, streak: number): string {
  switch (tone) {
    case 'cute':
      return `${name}、今日も報告お疲れさま！✨ ${streak}日連続、すごいです！`;
    case 'cool':
      return `${name}、報告を確認。${streak}日連続達成。データは正常に記録された。`;
    case 'formal':
      return `${name}、本日の報告を受領いたしました。${streak}日連続、この調子で参りましょう。`;
    default:
      return `${name}、今日も報告お疲れさま！${streak}日連続達成！`;
  }
}

function getEvolutionMessage(name: string, tone: Tone, stage: number): string {
  const stageName = GUARDIAN_STAGES[stage]?.name || "新しい段階";
  
  switch (tone) {
    case 'cute':
      return `${name}、きゃー！✨「${stageName}」に進化しました！おめでとう！🎉`;
    case 'cool':
      return `${name}、進化シークエンス完了。「${stageName}」にアップグレード。`;
    case 'formal':
      return `${name}、おめでとうございます。「${stageName}」への進化を遂げられました。`;
    default:
      return `${name}、おめでとう！「${stageName}」に進化しました！🎉`;
  }
}

function getStreakWarningMessage(name: string, tone: Tone, streak: number): string {
  switch (tone) {
    case 'cute':
      return `${name}、大変！💦 ${streak}日連続の記録が消えちゃうかも...！早めに報告してね！`;
    case 'cool':
      return `${name}、警告：${streak}日連続記録の維持には報告が必要だ。`;
    case 'formal':
      return `${name}、${streak}日連続の記録維持のため、本日中の報告をお願いいたします。`;
    default:
      return `${name}、${streak}日連続の記録が消えそう！早めに報告してね！`;
  }
}

function getBoostTriggeredMessage(name: string, tone: Tone): string {
  switch (tone) {
    case 'cute':
      return `${name}、やったー！🎰✨ 進化ブースト発動！ラッキーだね！`;
    case 'cool':
      return `${name}、進化ブーストが発動した。幸運だな。`;
    case 'formal':
      return `${name}、おめでとうございます。進化ブーストが発動いたしました。`;
    default:
      return `${name}、ラッキー！🎰 進化ブースト発動！`;
  }
}

function getEncouragementMessage(name: string, tone: Tone, streak: number): string {
  switch (tone) {
    case 'cute':
      return `${name}、${streak}日も続いてるなんてすごい！✨ 私も応援してるよ！`;
    case 'cool':
      return `${name}、${streak}日継続。悪くないペースだ。`;
    case 'formal':
      return `${name}、${streak}日間の継続、素晴らしいですね。引き続き期待しております。`;
    default:
      return `${name}、${streak}日連続！この調子で頑張ろう！`;
  }
}

// =====================================
// 🎨 表示用ヘルパー関数
// =====================================

/**
 * オーラのCSSスタイルを生成
 */
export function getAuraStyle(stage: GuardianStage): React.CSSProperties | null {
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

/**
 * スタイルに応じたカラーを取得
 */
export function getStyleColors(style: GuardianStyle): { primary: string; gradient: string } {
  const info = GUARDIAN_STYLES[style];
  return {
    primary: info.color,
    gradient: `linear-gradient(135deg, ${info.gradientFrom}, ${info.gradientTo})`
  };
}
