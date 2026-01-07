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

export type GuardianId = 'horyu' | 'shishimaru' | 'hanase' | 'shiroko' | 'kitama' | 'hoshimaru';

export type GuardianPersonality = 'hot' | 'cheerful' | 'gentle' | 'mysterious' | 'logical' | 'cosmic';

export interface GuardianDefinition {
  id: GuardianId;
  name: string;
  reading: string;
  attribute: GuardianAttribute;
  tier: 1 | 2;
  personality: GuardianPersonality;
  description: string;
  ability: {
    name: string;
    description: string;
    effectType: 'energy_boost' | 'streak_bonus' | 'streak_grace' | 'lucky_boost' | 'cost_reduce' | 'weekend_bonus';
    effectValue: number;
  };
  unlockCondition: {
    type: 'initial' | 'energy' | 'evolution';
    energyCost?: number;
    requiredGuardianId?: GuardianId;
    requiredStage?: number;
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
      energyCost: 300,
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
      energyCost: 300,
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
      energyCost: 300,
      requiredGuardianId: 'kitama',
      requiredStage: 2
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
    requiredEnergy: 30,     // Day 1-2で到達可能
    auraIntensity: 20
  },
  {
    stage: 2,
    name: '成長体',
    description: '力が芽生え始めた姿',
    requiredEnergy: 150,    // Day 5-7で到達可能
    auraIntensity: 50
  },
  {
    stage: 3,
    name: '成熟体',
    description: '特性が発動する完成形',
    requiredEnergy: 600,    // Day 14-21で到達可能
    auraIntensity: 80
  },
  {
    stage: 4,
    name: '究極体',
    description: '最強の姿。伝説の存在',
    requiredEnergy: 2000,   // Day 45-60で到達可能
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

export interface GuardianInstance {
  guardianId: GuardianId;
  unlocked: boolean;
  unlockedAt: Timestamp | null;
  stage: EvolutionStage;
  investedEnergy: number;
  abilityActive: boolean;    // stage >= 3 で true
  nickname?: string;         // ユーザーが付けた愛称
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
      if (userProfile.energy.current >= 200) {
        return { canUnlock: true };
      }
      return { canUnlock: false, reason: 'エナジーが足りません（200必要）' };
    
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
  return {
    guardianId,
    unlocked: true,
    unlockedAt: Timestamp.now(),
    stage: 0,
    investedEnergy: 0,
    abilityActive: false
  };
}

/**
 * 画像パスを取得
 */
export function getGuardianImagePath(guardianId: GuardianId, stage: EvolutionStage): string {
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
