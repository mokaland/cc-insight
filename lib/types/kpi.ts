/**
 * 事業KPI関連の型定義
 * CC Insight v3: ファネルKPI・目標管理
 */

import { Timestamp } from "firebase/firestore";
import type { TeamId } from "./user";

/**
 * チームごとのファネル定義
 * Shorts系（副業・退職）: 12ステップ
 * X系（物販）: 9ステップ
 */
export const TEAM_FUNNEL_LABELS: Record<TeamId, Record<string, string>> = {
    fukugyou: {
        igViews: "閲覧数",
        igInteractions: "インタラクション数",
        igProfileAccess: "プロフアクセス数",
        igExternalTaps: "外部リンクタップ数",
        pv: "PV数",
        uu: "UU数",
        lineRegistration: "LINE登録数",
        consultationBooking: "商談予約数",
        consultationDone: "商談実施数",
        yesAcquired: "YES獲得数",
        finalConversion: "サロン入会数",
        activeOrPaid: "実働数",
    },
    taishoku: {
        igViews: "閲覧数",
        igInteractions: "インタラクション数",
        igProfileAccess: "プロフアクセス数",
        igExternalTaps: "外部リンクタップ数",
        pv: "PV数",
        uu: "UU数",
        lineRegistration: "LINE登録数",
        consultationBooking: "商談予約数",
        consultationDone: "商談実施数",
        yesAcquired: "YES獲得数",
        finalConversion: "成約数",
        activeOrPaid: "着金数",
    },
    buppan: {
        xFollowers: "フォロワー数",
        pv: "PV数",
        uu: "UU数",
        lineRegistration: "LINE登録数",
        consultationBooking: "商談予約数",
        consultationDone: "商談実施数",
        yesAcquired: "YES獲得数",
        finalConversion: "成約数",
        activeOrPaid: "着金数",
    },
};

/**
 * ファネルKPIのキー一覧取得
 */
export function getFunnelKeys(teamId: TeamId): string[] {
    return Object.keys(TEAM_FUNNEL_LABELS[teamId]);
}

/**
 * ファネルKPIデータ
 * チームタイプによりオプショナルフィールドが異なる
 */
export interface FunnelKPI {
    // SNS Top-Funnel (Shorts系: 副業・退職)
    igViews?: number;
    igInteractions?: number;
    igProfileAccess?: number;
    igExternalTaps?: number;

    // SNS Top-Funnel (X系: 物販)
    xFollowers?: number;

    // Business Bottom-Funnel (共通)
    pv: number;
    uu: number;
    lineRegistration: number;
    consultationBooking: number;
    consultationDone: number;
    yesAcquired: number;
    finalConversion: number; // 副業: サロン入会 / 退職・スマホ: 成約
    activeOrPaid: number;    // 副業: 実働 / 退職・スマホ: 着金
}

/**
 * 目標タイプ
 */
export type GoalType = "monthly" | "quarterly";

/**
 * 目標ステータス
 */
export type GoalStatus = "draft" | "pending" | "approved";

/**
 * チーム目標
 */
export interface TeamGoal {
    id: string;
    teamId: TeamId;
    type: GoalType;
    year: number;
    month?: number;    // monthly の場合
    quarter?: number;  // quarterly の場合（1, 2, 3, 4）
    goals: FunnelKPI;
    status: GoalStatus;
    createdBy: string;      // 統括UID
    approvedBy: string | null;  // 副社長UID
    createdAt: Timestamp;
    approvedAt: Timestamp | null;
}

/**
 * 週次KPIステータス
 */
export type WeeklyKPIStatus = "draft" | "confirmed";

/**
 * 週次KPI
 */
export interface TeamWeeklyKPI {
    id: string;
    teamId: TeamId;
    year: number;
    weekNumber: number;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    kpi: FunnelKPI;
    status: WeeklyKPIStatus;
    enteredBy: string; // 統括UID
    createdAt: Timestamp;
    confirmedAt: Timestamp | null;
}

/**
 * 日次進捗ステータス
 */
export type DailyProgressStatus = "on_track" | "warning" | "critical";

/**
 * ファネル集計結果（累計 + 目標 + 達成率）
 */
export interface FunnelSummary {
    teamId: TeamId;
    period: {
        type: "monthly" | "quarterly" | "custom";
        year: number;
        month?: number;
        quarter?: number;
        startDate?: string;
        endDate?: string;
    };
    actual: FunnelKPI;      // 実績
    target: FunnelKPI | null;  // 目標（目標がない場合はnull）
    achievementRate: Record<string, number>; // 達成率（%）- 動的キー
    conversionRate: Record<string, number>;  // 転換率（%）- 動的キー（例: "igViewsToIgInteractions"）

    // 日次進捗（リアルタイム達成率把握用）
    dailyProgress?: {
        dayOfMonth: number;          // 今日が何日目か
        daysInMonth: number;         // 月の日数
        expectedRate: number;        // 期待達成率（%）
        actualRate: Record<string, number>;      // 各KPIの実際達成率
        status: Record<string, DailyProgressStatus>;  // 各KPIのステータス
    };
}

/**
 * 週次推移データ（グラフ用）
 */
export interface WeeklyTrend {
    weekNumber: number;
    startDate: string;
    endDate: string;
    kpi: FunnelKPI;
}
