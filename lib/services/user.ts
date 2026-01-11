/**
 * ユーザーサービス層
 * 
 * ユーザー関連の操作を一元管理
 * 主に lib/firestore.ts から re-export
 */

// lib/firestore.ts から既存関数を re-export
export {
    getAllUsers,
    updateUserStatus,
    updateUserRole,
    getUserBadges,
    updateUserBadges,
    getUserStats,
    // 守護神システム
    getUserGuardianProfile,
    getBulkUserGuardianProfiles,
    updateUserGuardianProfile,
    setUserDemographics,
    unlockGuardian,
    investGuardianEnergy,
    processReportWithEnergy,
    switchActiveGuardian,
    updateGuardianMemo,
    isGuardianProfileInitialized,
    hasAnyGuardian,
    hasGuardian,
    isProfileCompleted,
    // 型
    type User,
} from "@/lib/firestore";
