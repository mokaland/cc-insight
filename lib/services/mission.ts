/**
 * デイリーミッションサービス
 * ミッションの取得・更新・達成判定を行う
 */

import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import {
    DailyMissionState,
    UserMissionProgress,
    DEFAULT_DAILY_MISSIONS,
    ALL_COMPLETE_BONUS,
    getTodayDateString,
    createEmptyDailyMissionState,
    MissionType,
} from "@/lib/types/mission";

/**
 * ユーザーの今日のミッション状態を取得
 */
export async function getTodayMissions(userId: string): Promise<DailyMissionState> {
    const today = getTodayDateString();
    const docRef = doc(db, "users", userId, "dailyMissions", today);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as DailyMissionState;
    }

    // 今日のミッション状態がなければ作成
    const newState = createEmptyDailyMissionState(today);
    await setDoc(docRef, {
        ...newState,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return newState;
}

/**
 * ミッションを完了としてマーク
 */
export async function completeMission(
    userId: string,
    missionId: string
): Promise<{ success: boolean; alreadyCompleted: boolean }> {
    const today = getTodayDateString();
    const docRef = doc(db, "users", userId, "dailyMissions", today);

    // 現在の状態を取得
    const state = await getTodayMissions(userId);

    // ミッションを探す
    const missionIndex = state.missions.findIndex((m) => m.missionId === missionId);
    if (missionIndex === -1) {
        return { success: false, alreadyCompleted: false };
    }

    // 既に完了している場合
    if (state.missions[missionIndex].completed) {
        return { success: true, alreadyCompleted: true };
    }

    // ミッションを完了としてマーク
    const updatedMissions = [...state.missions];
    updatedMissions[missionIndex] = {
        ...updatedMissions[missionIndex],
        completed: true,
        completedAt: new Date(),
        progress: 100,
    };

    // 全完了チェック
    const allCompleted = updatedMissions.every((m) => m.completed);

    await updateDoc(docRef, {
        missions: updatedMissions,
        allCompleted,
        updatedAt: serverTimestamp(),
    });

    return { success: true, alreadyCompleted: false };
}

/**
 * ミッションの報酬を受け取る
 */
export async function claimMissionReward(
    userId: string,
    missionId: string
): Promise<{ success: boolean; reward: number; error?: string }> {
    const today = getTodayDateString();
    const docRef = doc(db, "users", userId, "dailyMissions", today);

    // 現在の状態を取得
    const state = await getTodayMissions(userId);

    // ミッションを探す
    const missionIndex = state.missions.findIndex((m) => m.missionId === missionId);
    if (missionIndex === -1) {
        return { success: false, reward: 0, error: "ミッションが見つかりません" };
    }

    const mission = state.missions[missionIndex];

    // 完了していない場合
    if (!mission.completed) {
        return { success: false, reward: 0, error: "ミッションが完了していません" };
    }

    // 既に受け取っている場合
    if (mission.claimed) {
        return { success: false, reward: 0, error: "既に報酬を受け取っています" };
    }

    // ミッション定義から報酬を取得
    const missionDef = DEFAULT_DAILY_MISSIONS.find((m) => m.id === missionId);
    const reward = missionDef?.reward || 0;

    // 報酬を受け取る
    const updatedMissions = [...state.missions];
    updatedMissions[missionIndex] = {
        ...updatedMissions[missionIndex],
        claimed: true,
        claimedAt: new Date(),
    };

    await updateDoc(docRef, {
        missions: updatedMissions,
        totalRewardEarned: state.totalRewardEarned + reward,
        updatedAt: serverTimestamp(),
    });

    // ユーザーのエナジーを増加（プロファイル更新）
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentEnergy = userData.energy || 0;
        await updateDoc(userRef, {
            energy: currentEnergy + reward,
            updatedAt: serverTimestamp(),
        });
    }

    return { success: true, reward };
}

/**
 * 全完了ボーナスを受け取る
 */
export async function claimAllCompletedBonus(
    userId: string
): Promise<{ success: boolean; reward: number; error?: string }> {
    const today = getTodayDateString();
    const docRef = doc(db, "users", userId, "dailyMissions", today);

    // 現在の状態を取得
    const state = await getTodayMissions(userId);

    // 全完了していない場合
    if (!state.allCompleted) {
        return { success: false, reward: 0, error: "全てのミッションを完了してください" };
    }

    // 既に受け取っている場合
    if (state.bonusClaimed) {
        return { success: false, reward: 0, error: "既にボーナスを受け取っています" };
    }

    await updateDoc(docRef, {
        bonusClaimed: true,
        totalRewardEarned: state.totalRewardEarned + ALL_COMPLETE_BONUS,
        updatedAt: serverTimestamp(),
    });

    // ユーザーのエナジーを増加
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentEnergy = userData.energy || 0;
        await updateDoc(userRef, {
            energy: currentEnergy + ALL_COMPLETE_BONUS,
            updatedAt: serverTimestamp(),
        });
    }

    return { success: true, reward: ALL_COMPLETE_BONUS };
}

/**
 * 特定のミッションタイプを完了させる（自動判定用）
 */
export async function triggerMissionComplete(
    userId: string,
    missionType: MissionType
): Promise<void> {
    const missionDef = DEFAULT_DAILY_MISSIONS.find((m) => m.type === missionType);
    if (!missionDef) return;

    await completeMission(userId, missionDef.id);
    console.log(`✅ Mission completed: ${missionType}`);
}

/**
 * ページ訪問によるミッション完了（ランキング確認、DM確認など）
 */
export async function triggerPageVisitMission(
    userId: string,
    pagePath: string
): Promise<void> {
    const matchingMission = DEFAULT_DAILY_MISSIONS.find(
        (m) => m.condition?.targetPage === pagePath
    );

    if (matchingMission) {
        await completeMission(userId, matchingMission.id);
        console.log(`✅ Page visit mission completed: ${pagePath}`);
    }
}
