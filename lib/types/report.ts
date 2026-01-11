/**
 * 日報レポート型定義
 * 
 * Firestore コレクション: reports
 */

import { Timestamp } from "firebase/firestore";

// チームタイプ
export type TeamType = 'shorts' | 'x';

/**
 * 投稿詳細（AIフィードバック用）
 */
export interface PostDetail {
    url: string;
    content: string;
}

/**
 * 日報レポート型
 */
export interface Report {
    // 基本情報
    id: string;
    team: string;
    teamType: TeamType;
    name: string;
    date: string;                 // YYYY-MM-DD
    createdAt: Timestamp;

    // ユーザー紐付け
    userId?: string;
    userEmail?: string;

    // Shorts系フィールド
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

    // SNS別投稿数（Shorts系）
    igPosts?: number;
    ytPosts?: number;
    tiktokPosts?: number;

    // X系フィールド
    postCount?: number;
    postUrls?: string[];
    posts?: PostDetail[];         // AIフィードバック用
    likeCount?: number;
    replyCount?: number;
    xFollowers?: number;
}

/**
 * チーム情報
 */
export interface TeamInfo {
    id: string;
    name: string;
    color: string;
    type: TeamType;
    dailyPostGoal: number;
}

/**
 * チーム定数
 */
export const TEAMS: TeamInfo[] = [
    { id: "fukugyou", name: "副業チーム", color: "#ec4899", type: "shorts", dailyPostGoal: 3 },
    { id: "taishoku", name: "退職サポートチーム", color: "#06b6d4", type: "shorts", dailyPostGoal: 2 },
    { id: "buppan", name: "スマホ物販チーム", color: "#eab308", type: "x", dailyPostGoal: 5 },
];
