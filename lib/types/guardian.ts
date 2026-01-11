/**
 * ガーディアンシステム型定義
 * 
 * 注意: lib/guardian-collection.ts から型を re-export
 * 将来的にはこのファイルに型定義を移動し、guardian-collection.ts は
 * ロジックのみを持つようにリファクタリング予定
 */

// guardian-collection.ts から型を re-export
export type {
    // 属性
    GuardianAttribute,

    // ガーディアンID
    GuardianId,

    // 性格
    GuardianPersonality,

    // 進化段階
    EvolutionStage,

    // ガーディアン定義
    GuardianDefinition,
    StageDefinition,

    // インスタンス
    GuardianInstance,
    GuardianMemory,

    // ユーザープロファイル
    UserGuardianProfile,
    UserEnergyData,
    UserStreakData,

    // SNS関連
    SnsApprovalStatus,
    SnsAccountApproval,
    SnsAccounts,
} from "../guardian-collection";

// 定数も re-export
export {
    GUARDIANS,
    ATTRIBUTES,
    EVOLUTION_STAGES,
    MAX_LEVEL,
    ENERGY_PER_LEVEL,
    PROFILE_COMPLETION_BONUS,
    SNS_LABELS,
    SNS_ORDER_BY_TEAM,
} from "../guardian-collection";
