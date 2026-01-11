/**
 * レポートサービス層
 * 
 * 日報レポートの作成・取得操作を一元管理
 */

import {
    collection,
    addDoc,
    serverTimestamp,
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
