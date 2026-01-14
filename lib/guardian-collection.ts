/**
 * 🛡️ 守護神コレクションシステム v2.0
 * 
 * 6体の守護神を集め、育てる戦略育成システム
 * 
 * 🔥 剛属性: 火龍(ほりゅう), 獅子丸(ししまる)
 * 💜 雅属性: 花精(はなせ), 白狐(しろこ)
 * ⚡ 智属性: 機珠(きたま), 星丸(ほしまる)
 * 
 * ティア制:
 * - T1: 初期選択可能（火龍/花精/機珠）
 * - T2: 条件解放（同属性T1をLv2以上で解放可能）
 */

import { Timestamp } from "firebase/firestore";

// =====================================
// 📱 SNSアカウント設定
// =====================================

// SNS承認状態
export type SnsApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

// 個別SNSアカウントの承認情報
export interface SnsAccountApproval {
  url?: string;                        // プロフィールURL
  status: SnsApprovalStatus;           // 承認状態
  submittedAt?: Timestamp;             // 申請日時
  reviewedAt?: Timestamp;              // 審査日時
  reviewedBy?: string;                 // 審査した管理者のUID
  rejectionReason?: string;            // 却下理由（あれば）
}

export interface SnsAccounts {
  // 各SNSの個別承認情報
  instagram?: SnsAccountApproval;
  youtube?: SnsAccountApproval;
  tiktok?: SnsAccountApproval;
  x?: SnsAccountApproval;

  // 全体フラグ（後方互換性のため残す）
  profileCompleted?: boolean;          // 全て承認済みフラグ
  completedAt?: Timestamp;             // 完了日時
  completionBonusClaimed?: boolean;    // 完了ボーナス受取済みフラグ
}

// チーム別SNS入力順序
export const SNS_ORDER_BY_TEAM = {
  fukugyou: ['instagram', 'youtube', 'tiktok', 'x'] as const,
  taishoku: ['instagram', 'youtube', 'tiktok', 'x'] as const,
  buppan: ['x', 'instagram', 'youtube', 'tiktok'] as const,
};

export const SNS_LABELS: Record<string, { label: string; placeholder: string; icon: string; urlPattern: RegExp }> = {
  instagram: {
    label: 'Instagram',
    placeholder: 'https://instagram.com/username',
    icon: '📷',
    urlPattern: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/
  },
  youtube: {
    label: 'YouTube',
    placeholder: 'https://youtube.com/@channelname',
    icon: '🎬',
    urlPattern: /^https?:\/\/(www\.)?youtube\.com\/(@[a-zA-Z0-9_.-]+|channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+)\/?$/
  },
  tiktok: {
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@username',
    icon: '🎵',
    urlPattern: /^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/
  },
  x: {
    label: 'X (Twitter)',
    placeholder: 'https://x.com/username',
    icon: '𝕏',
    urlPattern: /^https?:\/\/(www\.)?(x|twitter)\.com\/[a-zA-Z0-9_]+\/?$/
  },
};

// プロフィール完成ボーナス
export const PROFILE_COMPLETION_BONUS = 300; // 300エナジー（10倍スケール）

// =====================================
// 🎯 レベルシステム
// =====================================

export const MAX_LEVEL = 999;
export const ENERGY_PER_LEVEL = 200; // 200エナジーごとに1レベルアップ

/**
 * 累計獲得エナジーからレベルを計算
 * Level = min(999, floor(totalEnergyEarned / 200) + 1)
 */
export function calculateLevel(totalEnergyEarned: number): number {
  return Math.min(MAX_LEVEL, Math.floor(totalEnergyEarned / ENERGY_PER_LEVEL) + 1);
}

/**
 * 次のレベルまでに必要なエナジーを計算
 */
export function getEnergyToNextLevel(totalEnergyEarned: number): {
  currentLevel: number;
  nextLevel: number;
  currentEnergy: number;
  requiredForNext: number;
  remaining: number;
  progress: number; // 0-100%
} | null {
  const currentLevel = calculateLevel(totalEnergyEarned);

  if (currentLevel >= MAX_LEVEL) {
    return null; // MAX達成
  }

  const nextLevel = currentLevel + 1;
  const requiredForNext = (nextLevel - 1) * ENERGY_PER_LEVEL;
  const currentLevelStart = (currentLevel - 1) * ENERGY_PER_LEVEL;
  const energyInCurrentLevel = totalEnergyEarned - currentLevelStart;
  const remaining = requiredForNext - totalEnergyEarned;
  const progress = Math.round((energyInCurrentLevel / ENERGY_PER_LEVEL) * 100);

  return {
    currentLevel,
    nextLevel,
    currentEnergy: totalEnergyEarned,
    requiredForNext,
    remaining: Math.max(0, remaining),
    progress: Math.min(100, progress),
  };
}

/**
 * レベルに応じた称号を取得
 */
export function getLevelTitle(level: number): string {
  if (level >= 500) return '伝説の勇者';
  if (level >= 300) return '英雄';
  if (level >= 200) return 'マスター';
  if (level >= 100) return 'エキスパート';
  if (level >= 50) return 'ベテラン';
  if (level >= 25) return 'チャレンジャー';
  if (level >= 10) return '冒険者';
  if (level >= 5) return '見習い';
  return 'ルーキー';
}

// =====================================
// 🎭 属性定義
// =====================================

export type GuardianAttribute = 'power' | 'beauty' | 'cyber';

export const ATTRIBUTES: Record<GuardianAttribute, {
  name: string;
  emoji: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  power: {
    name: '剛',
    emoji: '🔥',
    color: '#ef4444',
    gradientFrom: '#dc2626',
    gradientTo: '#f97316'
  },
  beauty: {
    name: '雅',
    emoji: '💜',
    color: '#a855f7',
    gradientFrom: '#9333ea',
    gradientTo: '#ec4899'
  },
  cyber: {
    name: '智',
    emoji: '⚡',
    color: '#06b6d4',
    gradientFrom: '#0891b2',
    gradientTo: '#3b82f6'
  }
};

// =====================================
// 🐉 守護神キャラクター定義
// =====================================

export type GuardianId =
  // T1 (初期選択)
  | 'horyu' | 'hanase' | 'kitama'
  // T2 (条件解放)
  | 'shishimaru' | 'shiroko' | 'hoshimaru'
  // T3 (エンドコンテンツ)
  | 'ryuoh' | 'koukirin' | 'tenshin';

export type GuardianPersonality = 'hot' | 'cheerful' | 'gentle' | 'mysterious' | 'logical' | 'cosmic' | 'majestic' | 'divine' | 'enlightened';

export interface GuardianDefinition {
  id: GuardianId;
  name: string;
  reading: string;
  attribute: GuardianAttribute;
  tier: 1 | 2 | 3;
  personality: GuardianPersonality;
  description: string;
  ability: {
    name: string;
    description: string;
    effectType: 'energy_boost' | 'streak_bonus' | 'streak_grace' | 'lucky_boost' | 'cost_reduce' | 'weekend_bonus' | 'ultimate_boost' | 'team_aura' | 'performance_boost';
    effectValue: number;
  };
  unlockCondition: {
    type: 'initial' | 'energy' | 'evolution' | 'mastery';
    energyCost?: number;
    requiredGuardianId?: GuardianId;
    requiredStage?: number;
    requiredUltimateCount?: number; // T3用：究極体到達数
  };
}

export const GUARDIANS: Record<GuardianId, GuardianDefinition> = {
  // =====================================
  // 🔥 剛属性
  // =====================================
  horyu: {
    id: 'horyu',
    name: '火龍',
    reading: 'ほりゅう',
    attribute: 'power',
    tier: 1,
    personality: 'hot',
    description: '情熱と勝利を司る東洋の龍。炎のような熱い魂で、あなたの挑戦を後押しする。',
    ability: {
      name: '灼熱の意志',
      description: '報告時のエナジー獲得量が+15%',
      effectType: 'energy_boost',
      effectValue: 0.15
    },
    unlockCondition: {
      type: 'initial'
    }
  },
  shishimaru: {
    id: 'shishimaru',
    name: '獅子丸',
    reading: 'ししまる',
    attribute: 'power',
    tier: 2,
    personality: 'cheerful',
    description: '元気いっぱいの聖なる獅子。やんちゃだけど、いつもあなたの味方！',
    ability: {
      name: '獅子の加護',
      description: 'ストリークボーナス倍率が+0.2',
      effectType: 'streak_bonus',
      effectValue: 0.2
    },
    unlockCondition: {
      type: 'evolution',
      energyCost: 3000,
      requiredGuardianId: 'horyu',
      requiredStage: 2 // 成長体以上
    }
  },

  // =====================================
  // 💜 雅属性
  // =====================================
  hanase: {
    id: 'hanase',
    name: '花精',
    reading: 'はなせ',
    attribute: 'beauty',
    tier: 1,
    personality: 'gentle',
    description: '花々の精霊。優しく穏やかに、あなたの心を癒しながら成長を見守る。',
    ability: {
      name: '花の癒し',
      description: 'ストリーク猶予時間が+12時間',
      effectType: 'streak_grace',
      effectValue: 12
    },
    unlockCondition: {
      type: 'initial'
    }
  },
  shiroko: {
    id: 'shiroko',
    name: '白狐',
    reading: 'しろこ',
    attribute: 'beauty',
    tier: 2,
    personality: 'mysterious',
    description: '神秘的な九尾の白狐。幸運を呼び込む不思議な力を持つ。',
    ability: {
      name: '狐の幻術',
      description: 'ラッキーボーナス発生率が5%→10%',
      effectType: 'lucky_boost',
      effectValue: 0.10
    },
    unlockCondition: {
      type: 'evolution',
      energyCost: 3000,
      requiredGuardianId: 'hanase',
      requiredStage: 2
    }
  },

  // =====================================
  // ⚡ 智属性
  // =====================================
  kitama: {
    id: 'kitama',
    name: '機珠',
    reading: 'きたま',
    attribute: 'cyber',
    tier: 1,
    personality: 'logical',
    description: 'レトロな機械仕掛けの守護神。論理的かつ効率的にあなたをサポート。',
    ability: {
      name: '効率演算',
      description: '進化に必要なエナジーが-15%',
      effectType: 'cost_reduce',
      effectValue: 0.15
    },
    unlockCondition: {
      type: 'initial'
    }
  },
  hoshimaru: {
    id: 'hoshimaru',
    name: '星丸',
    reading: 'ほしまる',
    attribute: 'cyber',
    tier: 2,
    personality: 'cosmic',
    description: '宇宙の神秘を纏う存在。星々の導きで、特別な日に大きな力を発揮する。',
    ability: {
      name: '星の導き',
      description: '週末の報告でエナジー2.5倍',
      effectType: 'weekend_bonus',
      effectValue: 2.5
    },
    unlockCondition: {
      type: 'evolution',
      energyCost: 3000,
      requiredGuardianId: 'kitama',
      requiredStage: 2
    }
  },

  // =====================================
  // 👑 T3 エンドコンテンツ
  // =====================================
  ryuoh: {
    id: 'ryuoh',
    name: '龍王',
    reading: 'りゅうおう',
    attribute: 'power',
    tier: 3,
    personality: 'majestic',
    description: '火龍と獅子丸の力が融合した伝説の存在。無限の闘志でチーム全体を鼓舞する。',
    ability: {
      name: '覇王の咆哮',
      description: '全てのエナジー獲得が+30%、ストリークボーナス+0.5',
      effectType: 'ultimate_boost',
      effectValue: 0.3
    },
    unlockCondition: {
      type: 'mastery',
      energyCost: 10000,
      requiredUltimateCount: 2, // 剛属性2体を究極体に
    }
  },
  koukirin: {
    id: 'koukirin',
    name: '光麒麟',
    reading: 'こうきりん',
    attribute: 'beauty',
    tier: 3,
    personality: 'divine',
    description: '花精と白狐の魂が昇華した神聖な麒麟。その存在はチームに幸運をもたらす。',
    ability: {
      name: '神光の祝福',
      description: 'ラッキーボーナス発生率3倍、ストリーク猶予+48時間',
      effectType: 'lucky_boost',
      effectValue: 3.0
    },
    unlockCondition: {
      type: 'mastery',
      energyCost: 10000,
      requiredUltimateCount: 2, // 雅属性2体を究極体に
    }
  },
  tenshin: {
    id: 'tenshin',
    name: '天神',
    reading: 'てんしん',
    attribute: 'cyber',
    tier: 3,
    personality: 'enlightened',
    description: '機珠と星丸が融合した宇宙的知性体。全てを見通す眼で最適な道を示す。',
    ability: {
      name: '宇宙の叡智',
      description: 'パフォーマンスE獲得量2倍、進化コスト-30%',
      effectType: 'performance_boost',
      effectValue: 2.0
    },
    unlockCondition: {
      type: 'mastery',
      energyCost: 10000,
      requiredUltimateCount: 2, // 智属性2体を究極体に
    }
  }
};

// =====================================
// 🎯 進化段階定義（4段階 + オーラレベル）
// =====================================

export type EvolutionStage = 0 | 1 | 2 | 3 | 4;

export interface StageDefinition {
  stage: EvolutionStage;
  name: string;
  description: string;
  requiredEnergy: number;
  auraIntensity: number; // 0-100 オーラの強さ
}

// 爆速成長曲線：最初の3日で劇的変化
export const EVOLUTION_STAGES: StageDefinition[] = [
  {
    stage: 0,
    name: '卵',
    description: 'まだ眠っている状態',
    requiredEnergy: 0,
    auraIntensity: 0
  },
  {
    stage: 1,
    name: '幼体',
    description: '目覚めたばかりの姿',
    requiredEnergy: 300,     // Day 1-2で到達可能
    auraIntensity: 20
  },
  {
    stage: 2,
    name: '成長体',
    description: '力が芽生え始めた姿',
    requiredEnergy: 1500,    // Day 5-7で到達可能
    auraIntensity: 50
  },
  {
    stage: 3,
    name: '成熟体',
    description: '特性が発動する完成形',
    requiredEnergy: 6000,    // Day 14-21で到達可能
    auraIntensity: 80
  },
  {
    stage: 4,
    name: '究極体',
    description: '最強の姿。伝説の存在',
    requiredEnergy: 20000,   // Day 45-60で到達可能
    auraIntensity: 100
  }
];

// レベル毎のオーラ強化（進化間の細かい成長実感）
export function getAuraLevel(investedEnergy: number, stage: EvolutionStage): number {
  const currentStage = EVOLUTION_STAGES[stage];
  const nextStage = EVOLUTION_STAGES[stage + 1];

  if (!nextStage) {
    // 究極体は常に最大
    return 100;
  }

  const progressInStage = investedEnergy - currentStage.requiredEnergy;
  const energyForNextStage = nextStage.requiredEnergy - currentStage.requiredEnergy;
  const progress = progressInStage / energyForNextStage;

  // オーラ強度を線形補間
  const baseAura = currentStage.auraIntensity;
  const targetAura = nextStage.auraIntensity;

  return Math.min(100, Math.round(baseAura + (targetAura - baseAura) * progress));
}

// =====================================
// 📊 Firestore データ構造
// =====================================

// 思い出タイムライン用
export interface GuardianMemory {
  type: 'unlock' | 'evolve' | 'streak' | 'milestone';
  date: Timestamp;
  stage?: EvolutionStage;
  streakDays?: number;
  message: string;
}

export interface GuardianInstance {
  guardianId: GuardianId;
  unlocked: boolean;
  unlockedAt: Timestamp | null;
  stage: EvolutionStage;
  investedEnergy: number;
  abilityActive: boolean;    // stage >= 3 で true
  nickname?: string;         // ユーザーが付けた愛称
  unlockedStages?: EvolutionStage[];  // 解放済みステージ履歴（図鑑用）
  memo?: string;             // ユーザーが自由に書けるメモ
  memories?: GuardianMemory[]; // 思い出タイムライン
}

export interface UserEnergyData {
  current: number;
  totalEarned: number;
  lastEarnedAt: Timestamp | null;
}

export interface UserStreakData {
  current: number;
  max: number;
  multiplier: number;
  lastReportAt: Timestamp | null;
  graceHours: number;        // 猶予時間（花精の特性で増加）
}

export interface UserGuardianProfile {
  gender?: 'male' | 'female' | 'other';
  ageGroup?: '10s' | '20s' | '30s' | '40s' | '50plus';
  energy: UserEnergyData;
  streak: UserStreakData;
  guardians: { [key in GuardianId]?: GuardianInstance };
  activeGuardianId: GuardianId | null;
  registeredAt: Timestamp;
}

// =====================================
// 🔧 ヘルパー関数
// =====================================

/**
 * 守護神の現在の進化段階を取得
 */
export function getCurrentStage(investedEnergy: number): EvolutionStage {
  for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
    if (investedEnergy >= EVOLUTION_STAGES[i].requiredEnergy) {
      return EVOLUTION_STAGES[i].stage;
    }
  }
  return 0;
}

/**
 * 次の進化に必要なエナジー量を計算
 */
export function getEnergyToNextStage(
  investedEnergy: number,
  guardianId: GuardianId
): { required: number; current: number; remaining: number } | null {
  const currentStage = getCurrentStage(investedEnergy);
  const nextStageIndex = currentStage + 1;

  if (nextStageIndex >= EVOLUTION_STAGES.length) {
    return null; // 究極体は進化不可
  }

  const guardian = GUARDIANS[guardianId];
  let requiredEnergy = EVOLUTION_STAGES[nextStageIndex].requiredEnergy;

  // 機珠の特性: コスト-15%
  if (hasActiveAbility('kitama', guardianId)) {
    requiredEnergy = Math.floor(requiredEnergy * 0.85);
  }

  return {
    required: requiredEnergy,
    current: investedEnergy,
    remaining: Math.max(0, requiredEnergy - investedEnergy)
  };
}

/**
 * 特性が発動しているか確認
 */
export function hasActiveAbility(abilityOwnerId: GuardianId, checkGuardianId: GuardianId): boolean {
  // 同じ守護神なら自分の特性は使えない（他の守護神への効果）
  // この関数は実際のユーザーデータと組み合わせて使用
  return false; // 実装は energy-system.ts で行う
}

/**
 * T1守護神のリストを取得
 */
export function getTier1Guardians(): GuardianDefinition[] {
  return Object.values(GUARDIANS).filter(g => g.tier === 1);
}

/**
 * T2守護神のリストを取得
 */
export function getTier2Guardians(): GuardianDefinition[] {
  return Object.values(GUARDIANS).filter(g => g.tier === 2);
}

/**
 * 属性で守護神をフィルタ
 */
export function getGuardiansByAttribute(attribute: GuardianAttribute): GuardianDefinition[] {
  return Object.values(GUARDIANS).filter(g => g.attribute === attribute);
}

/**
 * 解放条件を満たしているか確認
 */
export function canUnlockGuardian(
  guardianId: GuardianId,
  userProfile: UserGuardianProfile
): { canUnlock: boolean; reason?: string } {
  const guardian = GUARDIANS[guardianId];
  const condition = guardian.unlockCondition;

  // すでに解放済み
  const existing = userProfile.guardians[guardianId];
  if (existing?.unlocked) {
    return { canUnlock: false, reason: 'すでに解放済みです' };
  }

  switch (condition.type) {
    case 'initial':
      // 初期選択可能（1体も持っていない場合のみ無料）
      const hasAny = Object.values(userProfile.guardians).some(g => g?.unlocked);
      if (!hasAny) {
        return { canUnlock: true };
      }
      // 2体目以降はエナジーが必要
      if (userProfile.energy.current >= 2000) {
        return { canUnlock: true };
      }
      return { canUnlock: false, reason: 'エナジーが足りません（2000必要）' };

    case 'evolution':
      // 前提守護神の進化が必要
      const required = userProfile.guardians[condition.requiredGuardianId!];
      if (!required?.unlocked) {
        return { canUnlock: false, reason: `${GUARDIANS[condition.requiredGuardianId!].name}を先に解放してください` };
      }
      if (required.stage < condition.requiredStage!) {
        return { canUnlock: false, reason: `${GUARDIANS[condition.requiredGuardianId!].name}を成長体まで育ててください` };
      }
      if (userProfile.energy.current < (condition.energyCost || 0)) {
        return { canUnlock: false, reason: `エナジーが足りません（${condition.energyCost}必要）` };
      }
      return { canUnlock: true };

    default:
      return { canUnlock: false, reason: '不明なエラー' };
  }
}

/**
 * 新規ユーザープロファイルを作成
 */
export function createNewUserProfile(): UserGuardianProfile {
  return {
    energy: {
      current: 0,
      totalEarned: 0,
      lastEarnedAt: null
    },
    streak: {
      current: 0,
      max: 0,
      multiplier: 1.0,
      lastReportAt: null,
      graceHours: 24 // デフォルト24時間
    },
    guardians: {},
    activeGuardianId: null,
    registeredAt: Timestamp.now()
  };
}

/**
 * 守護神インスタンスを作成
 */
export function createGuardianInstance(guardianId: GuardianId): GuardianInstance {
  const guardian = GUARDIANS[guardianId];
  const now = Timestamp.now();

  return {
    guardianId,
    unlocked: true,
    unlockedAt: now,
    stage: 0,
    investedEnergy: 0,
    abilityActive: false,
    unlockedStages: [0],  // 初期ステージを解放済みとして記録
    memo: "",
    memories: [
      {
        type: 'unlock',
        date: now,
        stage: 0,
        message: `${guardian.name}と運命の出会いを果たした`
      }
    ]
  };
}

/**
 * 思い出を追加
 */
export function addGuardianMemory(
  guardian: GuardianInstance,
  memory: Omit<GuardianMemory, 'date'>
): GuardianInstance {
  const newMemory: GuardianMemory = {
    ...memory,
    date: Timestamp.now()
  };

  return {
    ...guardian,
    memories: [...(guardian.memories || []), newMemory]
  };
}

/**
 * 進化時の思い出を作成
 */
export function createEvolutionMemory(guardianId: GuardianId, newStage: EvolutionStage): Omit<GuardianMemory, 'date'> {
  const guardian = GUARDIANS[guardianId];
  const stageName = EVOLUTION_STAGES[newStage].name;

  return {
    type: 'evolve',
    stage: newStage,
    message: `${guardian.name}が「${stageName}」に進化した`
  };
}

/**
 * ストリーク達成時の思い出を作成
 */
export function createStreakMemory(guardianId: GuardianId, streakDays: number): Omit<GuardianMemory, 'date'> | null {
  // 特定の日数でのみ記録（7, 14, 21, 30, 50, 100日など）
  const milestones = [7, 14, 21, 30, 50, 100];
  if (!milestones.includes(streakDays)) return null;

  const guardian = GUARDIANS[guardianId];

  return {
    type: 'streak',
    streakDays,
    message: `${guardian.name}と${streakDays}日連続で共に歩んだ`
  };
}

/**
 * 画像パスを取得
 * Stage 0 (卵) の場合:
 * - T1 (初期選択可能): 各ガーディアン固有の白い卵 (stage0.png)
 * - T2以降: 共通の黒い卵 (guardian-egg.png)
 */
export function getGuardianImagePath(guardianId: GuardianId, stage: EvolutionStage): string {
  // Stage 0 は卵画像
  if (stage === 0) {
    const guardian = GUARDIANS[guardianId];
    // T1は各ガーディアン固有の白い卵を使用
    if (guardian.tier === 1) {
      return `/images/guardians/${guardianId}/stage0.png`;
    }
    // T2以降は共通の黒い卵を使用
    return '/images/guardians/guardian-egg.png';
  }
  return `/images/guardians/${guardianId}/stage${stage}.png`;
}

/**
 * プレースホルダー（開発用）
 */
export function getPlaceholderStyle(guardianId: GuardianId): {
  background: string;
  emoji: string;
} {
  const guardian = GUARDIANS[guardianId];
  const attr = ATTRIBUTES[guardian.attribute];

  return {
    background: `linear-gradient(135deg, ${attr.gradientFrom}, ${attr.gradientTo})`,
    emoji: attr.emoji
  };
}

// =====================================
// 🎆 進化フィナーレ演出設定
// =====================================

export interface GuardianFinaleEffect {
  // 背景パーティクルの種類
  particleEmoji: string[];
  // 背景のグラデーションカラー
  bgGradient: string[];
  // 背景のキーカラー
  accentColor: string;
  // パーティクルの動きタイプ
  particleMotion: 'float' | 'spiral' | 'scatter' | 'fall' | 'orbit' | 'twinkle';
}

/**
 * ガーディアンごとのフィナーレエフェクト設定
 */
export const GUARDIAN_FINALE_EFFECTS: Record<GuardianId, GuardianFinaleEffect> = {
  // 火龍 - 燃え上がる炎と熱気
  horyu: {
    particleEmoji: ['🔥', '✨', '💥', '⚡'],
    bgGradient: ['#dc2626', '#f97316', '#fbbf24'],
    accentColor: '#ef4444',
    particleMotion: 'float'
  },
  // 獅子丸 - 元気な光と星
  shishimaru: {
    particleEmoji: ['⭐', '🌟', '💫', '✨'],
    bgGradient: ['#f97316', '#eab308', '#fbbf24'],
    accentColor: '#f59e0b',
    particleMotion: 'scatter'
  },
  // 花精 - 舞い散る花びら
  hanase: {
    particleEmoji: ['🌸', '🌺', '💮', '🏵️'],
    bgGradient: ['#ec4899', '#f472b6', '#fbbf24'],
    accentColor: '#ec4899',
    particleMotion: 'fall'
  },
  // 白狐 - 神秘的な桜と狐火
  shiroko: {
    particleEmoji: ['🌸', '✨', '🦊', '💜'],
    bgGradient: ['#a855f7', '#c084fc', '#f0abfc'],
    accentColor: '#a855f7',
    particleMotion: 'spiral'
  },
  // 機珠 - デジタルエフェクト
  kitama: {
    particleEmoji: ['⚡', '💠', '🔷', '✨'],
    bgGradient: ['#06b6d4', '#0891b2', '#3b82f6'],
    accentColor: '#06b6d4',
    particleMotion: 'orbit'
  },
  // 星丸 - 宇宙と星々
  hoshimaru: {
    particleEmoji: ['⭐', '🌟', '💫', '🌠'],
    bgGradient: ['#3b82f6', '#6366f1', '#8b5cf6'],
    accentColor: '#6366f1',
    particleMotion: 'twinkle'
  },
  // T3: 龍王 - 覇気と炎
  ryuoh: {
    particleEmoji: ['👑', '🔥', '⚡', '💥'],
    bgGradient: ['#dc2626', '#b91c1c', '#fbbf24'],
    accentColor: '#dc2626',
    particleMotion: 'float'
  },
  // T3: 光麒麟 - 神聖な光
  koukirin: {
    particleEmoji: ['✨', '💛', '🌟', '👑'],
    bgGradient: ['#fbbf24', '#f59e0b', '#fcd34d'],
    accentColor: '#f59e0b',
    particleMotion: 'spiral'
  },
  // T3: 天神 - 宇宙と叡智
  tenshin: {
    particleEmoji: ['🌌', '✨', '💠', '⭐'],
    bgGradient: ['#6366f1', '#4f46e5', '#8b5cf6'],
    accentColor: '#6366f1',
    particleMotion: 'orbit'
  }
};

/**
 * ステージに応じたオーラ設定
 */
export interface StageAuraConfig {
  glowIntensity: number;  // 0-100
  glowColor: string;
  glowLayers: number;     // 光の層の数
  hasRainbow: boolean;    // 虹色エフェクト
  hasGoldenRing: boolean; // 金の輪
}

export function getStageAuraConfig(stage: EvolutionStage, guardianId: GuardianId): StageAuraConfig {
  const guardian = GUARDIANS[guardianId];
  const attr = ATTRIBUTES[guardian.attribute];

  switch (stage) {
    case 1:
      return {
        glowIntensity: 30,
        glowColor: attr.color,
        glowLayers: 1,
        hasRainbow: false,
        hasGoldenRing: false
      };
    case 2:
      return {
        glowIntensity: 50,
        glowColor: attr.color,
        glowLayers: 2,
        hasRainbow: false,
        hasGoldenRing: false
      };
    case 3:
      return {
        glowIntensity: 70,
        glowColor: attr.color,
        glowLayers: 3,
        hasRainbow: false,
        hasGoldenRing: true
      };
    case 4:
      return {
        glowIntensity: 100,
        glowColor: '#fbbf24', // ゴールド
        glowLayers: 4,
        hasRainbow: true,
        hasGoldenRing: true
      };
    default:
      return {
        glowIntensity: 20,
        glowColor: attr.color,
        glowLayers: 1,
        hasRainbow: false,
        hasGoldenRing: false
      };
  }
}
