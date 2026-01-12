/**
 * ユーザーサービス層
 * 
 * ユーザー関連の操作を一元管理
 * 主に lib/firestore.ts から re-export
 */

import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Report } from "@/lib/types";

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
    getUserSnsAccounts,
    teams,
    // 型
    type User,
} from "@/lib/firestore";

// =====================================
// ユーザー取得関数
// =====================================

/**
 * ユーザーIDでユーザー情報を取得
 */
export async function getUserById(userId: string) {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
        return { uid: userDoc.id, ...userDoc.data() };
    }
    return null;
}

/**
 * ユーザーのレポート一覧を取得（最新順）
 */
export async function getUserReports(userId: string): Promise<Report[]> {
    const q = query(
        collection(db, "reports"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Report));
}
