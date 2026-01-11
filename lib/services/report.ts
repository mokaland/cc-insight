/**
 * レポートサービス層
 * 
 * 日報レポートの作成・取得操作を一元管理
 */

import {
    collection,
    addDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Report, TeamType } from "@/lib/types";

// lib/firestore.ts から既存関数を re-export
export {
    subscribeToReports,
    getReportsByPeriod,
    calculateTeamStats,
    calculateOverallStats,
    calculateRankings,
    deleteAllReports,
    getTodayReport,
    getLastReport,
    updateReport,
    getUserRecentReports,
    getPreviousFollowerCounts,
} from "@/lib/firestore";

// =====================================
// レポート作成
// =====================================

export interface CreateReportParams {
    team: string;
    teamType: TeamType;
    name: string;
    date: string;
    userId?: string;
    userEmail?: string;
    realName?: string;
    modifyCount?: number;
    // Shorts系
    accountId?: string;
    igViews?: number;
    igProfileAccess?: number;
    igExternalTaps?: number;
    igInteractions?: number;
    weeklyStories?: number;
    igFollowers?: number;
    ytFollowers?: number;
    tiktokFollowers?: number;
    todayComment?: string;
    igPosts?: number;
    ytPosts?: number;
    tiktokPosts?: number;
    // X系
    postCount?: number;
    postUrls?: string[];
    posts?: { url: string; content: string }[];
    likeCount?: number;
    replyCount?: number;
    xFollowers?: number;
}

/**
 * 日報レポートを作成
 */
export async function createReport(params: CreateReportParams): Promise<string> {
    const docRef = await addDoc(collection(db, "reports"), {
        ...params,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

// =====================================
// カスタム期間でのレポート取得
// =====================================

import { query, where, orderBy, getDocs, limit } from "firebase/firestore";

/**
 * カスタム期間でレポートを取得
 */
export async function getReportsByCustomPeriod(
    startDate: string,
    endDate: string,
    teamId: string
): Promise<Report[]> {
    const q = query(
        collection(db, "reports"),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        where("team", "==", teamId),
        orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Report));
}

// =====================================
// 今日の一言付きレポート取得
// =====================================

export interface MessageReport {
    id: string;
    userId: string;
    name: string;
    team: string;
    date: string;
    todayComment: string;
    createdAt: Date;
}

/**
 * 過去N日間の「今日の一言」がある日報を取得
 */
export async function getReportsWithTodayComment(daysAgo: number = 30, maxResults: number = 100): Promise<MessageReport[]> {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysAgo);
    const dateStr = pastDate.toISOString().split("T")[0];

    const q = query(
        collection(db, "reports"),
        where("date", ">=", dateStr),
        where("todayComment", "!=", ""),
        orderBy("todayComment"),
        orderBy("createdAt", "desc"),
        limit(maxResults)
    );

    const snapshot = await getDocs(q);
    const results: MessageReport[] = [];

    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.todayComment && data.todayComment.trim() !== "") {
            results.push({
                id: doc.id,
                userId: data.userId || "",
                name: data.name,
                team: data.team,
                date: data.date,
                todayComment: data.todayComment,
                createdAt: data.createdAt?.toDate() || new Date(data.date),
            });
        }
    });

    return results;
}

// teams定数もre-export
export { teams } from "@/lib/firestore";

// =====================================
// API Routes (Cron) 用関数
// =====================================


/**
 * 指定日時以降のレポートを取得
 */
export async function getReportsSince(sinceDate: Date): Promise<Report[]> {
    const timestamp = Timestamp.fromDate(sinceDate);
    const q = query(
        collection(db, "reports"),
        where("createdAt", ">=", timestamp)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Report));
}

/**
 * 全ユーザーの生データを取得（Cron用）
 */
export async function getAllUsersSnapshot() {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
    }));
}

/**
 * 判定結果を保存（decade-judgment用）
 */
export async function saveJudgmentHistory(judgment: Record<string, unknown>): Promise<string> {
    const historyRef = collection(db, "judgment_history");
    const docRef = await addDoc(historyRef, {
        ...judgment,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}
