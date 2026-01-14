/**
 * デイリーミッション型定義
 * ポケポケ風のデイリーミッション機能
 */

// ミッションタイプ
export type MissionType =
    | "daily_report"        // 日報を報告する
    | "streak_maintain"     // ストリークを維持する
    | "energy_invest"       // エナジーを投資する
    | "guardian_feed"       // 守護神に餌を与える
    | "ranking_check"       // ランキングを確認する
    | "profile_view"        // プロフィールを確認する
    | "dm_check"            // DMを確認する
    | "goal_progress";      // 目標の進捗を確認する

// ミッション定義
export interface MissionDefinition {
    id: string;
    type: MissionType;
    title: string;
    description: string;
    reward: number;        // エナジー報酬
    icon: string;          // 絵文字アイコン
    order: number;         // 表示順
    isDaily: boolean;      // デイリーミッションかどうか
    condition?: {          // 達成条件（オプション）
        minValue?: number;   // 最小値（例: 投資エナジー量）
        targetPage?: string; // 対象ページ
    };
}

// ユーザーのミッション進捗
export interface UserMissionProgress {
    missionId: string;
    completed: boolean;
    completedAt?: Date;
    progress?: number;     // 進捗（0-100%）
    claimed: boolean;      // 報酬を受け取ったか
    claimedAt?: Date;
}

// デイリーミッション状態（Firestore: users/{userId}/dailyMissions/{date}）
export interface DailyMissionState {
    date: string;          // YYYY-MM-DD
    missions: UserMissionProgress[];
    allCompleted: boolean;
    bonusClaimed: boolean; // 全完了ボーナスを受け取ったか
    totalRewardEarned: number;
    createdAt: Date;
    updatedAt: Date;
}

// デフォルトのデイリーミッション定義
export const DEFAULT_DAILY_MISSIONS: MissionDefinition[] = [
    {
        id: "daily_report",
        type: "daily_report",
        title: "日報を報告する",
        description: "今日の日報を報告しよう",
        reward: 5,
        icon: "📊",
        order: 1,
        isDaily: true,
    },
    {
        id: "guardian_feed",
        type: "guardian_feed",
        title: "守護神にエナジーを投資",
        description: "守護神にエナジーを1回投資しよう",
        reward: 3,
        icon: "🛡️",
        order: 2,
        isDaily: true,
        condition: {
            minValue: 1,
        },
    },
    {
        id: "ranking_check",
        type: "ranking_check",
        title: "ランキングを確認",
        description: "ランキングページを見てみよう",
        reward: 2,
        icon: "🏆",
        order: 3,
        isDaily: true,
        condition: {
            targetPage: "/ranking",
        },
    },
    {
        id: "dm_check",
        type: "dm_check",
        title: "DMを確認",
        description: "DMページを確認しよう",
        reward: 2,
        icon: "💬",
        order: 4,
        isDaily: true,
        condition: {
            targetPage: "/dm",
        },
    },
];

// 全完了ボーナス
export const ALL_COMPLETE_BONUS = 5;

// ヘルパー関数
export function getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function createEmptyDailyMissionState(date: string): DailyMissionState {
    return {
        date,
        missions: DEFAULT_DAILY_MISSIONS.map((m) => ({
            missionId: m.id,
            completed: false,
            claimed: false,
        })),
        allCompleted: false,
        bonusClaimed: false,
        totalRewardEarned: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
