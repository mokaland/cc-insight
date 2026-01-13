/**
 * 事業KPI Service
 * CC Insight v3: 目標管理・週次KPI・ファネル集計
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    TeamId,
    FunnelKPI,
    TeamGoal,
    TeamWeeklyKPI,
    FunnelSummary,
    WeeklyTrend,
    GoalStatus,
    WeeklyKPIStatus,
} from "@/lib/types";

// ============================================
// 目標管理
// ============================================

/**
 * 月間目標を作成/更新
 */
export async function setMonthlyGoal(
    teamId: TeamId,
    year: number,
    month: number,
    goals: FunnelKPI,
    createdBy: string
): Promise<TeamGoal> {
    const id = `${teamId}_${year}_${String(month).padStart(2, "0")}`;
    const goalData: TeamGoal = {
        id,
        teamId,
        type: "monthly",
        year,
        month,
        goals,
        status: "pending",
        createdBy,
        approvedBy: null,
        createdAt: Timestamp.now(),
        approvedAt: null,
    };

    await setDoc(doc(db, "team_goals", id), goalData);
    return goalData;
}

/**
 * クォーター目標を作成/更新
 */
export async function setQuarterlyGoal(
    teamId: TeamId,
    year: number,
    quarter: number,
    goals: FunnelKPI,
    createdBy: string
): Promise<TeamGoal> {
    const id = `${teamId}_${year}_Q${quarter}`;
    const goalData: TeamGoal = {
        id,
        teamId,
        type: "quarterly",
        year,
        quarter,
        goals,
        status: "pending",
        createdBy,
        approvedBy: null,
        createdAt: Timestamp.now(),
        approvedAt: null,
    };

    await setDoc(doc(db, "team_goals", id), goalData);
    return goalData;
}

/**
 * 目標を取得
 */
export async function getGoal(goalId: string): Promise<TeamGoal | null> {
    const docRef = doc(db, "team_goals", goalId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as TeamGoal;
}

/**
 * チームの月間目標を取得
 */
export async function getMonthlyGoal(
    teamId: TeamId,
    year: number,
    month: number
): Promise<TeamGoal | null> {
    const id = `${teamId}_${year}_${String(month).padStart(2, "0")}`;
    return getGoal(id);
}

/**
 * チームのクォーター目標を取得
 */
export async function getQuarterlyGoal(
    teamId: TeamId,
    year: number,
    quarter: number
): Promise<TeamGoal | null> {
    const id = `${teamId}_${year}_Q${quarter}`;
    return getGoal(id);
}

/**
 * 目標を承認
 */
export async function approveGoal(
    goalId: string,
    approvedBy: string
): Promise<void> {
    const docRef = doc(db, "team_goals", goalId);
    await updateDoc(docRef, {
        status: "approved" as GoalStatus,
        approvedBy,
        approvedAt: Timestamp.now(),
    });
}

/**
 * 承認待ちの目標一覧を取得
 * インデックス不要: 全件取得後にフィルタリング
 */
export async function getPendingGoals(): Promise<TeamGoal[]> {
    const snapshot = await getDocs(collection(db, "team_goals"));
    const results: TeamGoal[] = [];

    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as TeamGoal;
        if (data.status === "pending") {
            results.push(data);
        }
    });

    // createdAtで降順ソート
    results.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
    });

    return results;
}

// ============================================
// 週次KPI
// ============================================

/**
 * 週番号を計算
 */
export function getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor(
        (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    );
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

/**
 * 週次KPIを保存
 */
export async function saveWeeklyKPI(
    teamId: TeamId,
    year: number,
    weekNumber: number,
    startDate: string,
    endDate: string,
    kpi: FunnelKPI,
    enteredBy: string,
    status: WeeklyKPIStatus = "draft"
): Promise<TeamWeeklyKPI> {
    const id = `${teamId}_${year}_w${String(weekNumber).padStart(2, "0")}`;
    const kpiData: TeamWeeklyKPI = {
        id,
        teamId,
        year,
        weekNumber,
        startDate,
        endDate,
        kpi,
        status,
        enteredBy,
        createdAt: Timestamp.now(),
        confirmedAt: status === "confirmed" ? Timestamp.now() : null,
    };

    await setDoc(doc(db, "team_weekly_kpi", id), kpiData);
    return kpiData;
}

/**
 * 週次KPIを確定
 */
export async function confirmWeeklyKPI(kpiId: string): Promise<void> {
    const docRef = doc(db, "team_weekly_kpi", kpiId);
    await updateDoc(docRef, {
        status: "confirmed" as WeeklyKPIStatus,
        confirmedAt: Timestamp.now(),
    });
}

/**
 * 週次KPIを取得
 */
export async function getWeeklyKPI(
    teamId: TeamId,
    year: number,
    weekNumber: number
): Promise<TeamWeeklyKPI | null> {
    const id = `${teamId}_${year}_w${String(weekNumber).padStart(2, "0")}`;
    const docRef = doc(db, "team_weekly_kpi", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as TeamWeeklyKPI;
}

/**
 * チームの週次KPI一覧を取得（年指定）
 * インデックス不要: ドキュメントIDでフィルタリング
 */
export async function getWeeklyKPIsByYear(
    teamId: TeamId,
    year: number
): Promise<TeamWeeklyKPI[]> {
    // 全ドキュメント取得してクライアント側でフィルタリング
    // ドキュメントIDが `${teamId}_${year}_w${weekNumber}` 形式なので効率的
    const snapshot = await getDocs(collection(db, "team_weekly_kpi"));
    const results: TeamWeeklyKPI[] = [];

    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as TeamWeeklyKPI;
        if (data.teamId === teamId && data.year === year) {
            results.push(data);
        }
    });

    // 週番号でソート
    results.sort((a, b) => a.weekNumber - b.weekNumber);
    return results;
}

/**
 * チームの週次KPI一覧を取得（月指定）
 */
export async function getWeeklyKPIsByMonth(
    teamId: TeamId,
    year: number,
    month: number
): Promise<TeamWeeklyKPI[]> {
    const allWeeks = await getWeeklyKPIsByYear(teamId, year);

    // 月に属する週をフィルタリング
    return allWeeks.filter((week) => {
        const startMonth = new Date(week.startDate).getMonth() + 1;
        const endMonth = new Date(week.endDate).getMonth() + 1;
        return startMonth === month || endMonth === month;
    });
}

// ============================================
// ファネル集計
// ============================================

/**
 * 空のファネルKPI
 */
export function emptyFunnelKPI(): FunnelKPI {
    return {
        pv: 0,
        uu: 0,
        lineRegistration: 0,
        consultationBooking: 0,
        consultationDone: 0,
        yesAcquired: 0,
        finalConversion: 0,
        activeOrPaid: 0,
    };
}

/**
 * ファネルKPIを合計
 */
export function sumFunnelKPIs(kpis: FunnelKPI[]): FunnelKPI {
    return kpis.reduce((acc, kpi) => ({
        pv: acc.pv + kpi.pv,
        uu: acc.uu + kpi.uu,
        lineRegistration: acc.lineRegistration + kpi.lineRegistration,
        consultationBooking: acc.consultationBooking + kpi.consultationBooking,
        consultationDone: acc.consultationDone + kpi.consultationDone,
        yesAcquired: acc.yesAcquired + kpi.yesAcquired,
        finalConversion: acc.finalConversion + kpi.finalConversion,
        activeOrPaid: acc.activeOrPaid + kpi.activeOrPaid,
    }), emptyFunnelKPI());
}

/**
 * 転換率を計算
 */
export function calculateConversionRates(kpi: FunnelKPI) {
    const safeRate = (num: number, denom: number) =>
        denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;

    return {
        pvToUu: safeRate(kpi.uu, kpi.pv),
        uuToLine: safeRate(kpi.lineRegistration, kpi.uu),
        lineToBooking: safeRate(kpi.consultationBooking, kpi.lineRegistration),
        bookingToDone: safeRate(kpi.consultationDone, kpi.consultationBooking),
        doneToYes: safeRate(kpi.yesAcquired, kpi.consultationDone),
        yesToFinal: safeRate(kpi.finalConversion, kpi.yesAcquired),
        finalToActive: safeRate(kpi.activeOrPaid, kpi.finalConversion),
    };
}

/**
 * 達成率を計算
 */
export function calculateAchievementRate(
    actual: FunnelKPI,
    target: FunnelKPI
): Partial<Record<keyof FunnelKPI, number>> {
    const result: Partial<Record<keyof FunnelKPI, number>> = {};
    const keys: (keyof FunnelKPI)[] = [
        "pv", "uu", "lineRegistration", "consultationBooking",
        "consultationDone", "yesAcquired", "finalConversion", "activeOrPaid"
    ];

    for (const key of keys) {
        if (target[key] > 0) {
            result[key] = Math.round((actual[key] / target[key]) * 100);
        }
    }

    return result;
}

/**
 * 月間ファネルサマリーを取得
 */
export async function getMonthlyFunnelSummary(
    teamId: TeamId,
    year: number,
    month: number
): Promise<FunnelSummary> {
    // 週次KPIを取得して集計
    const weeklyKPIs = await getWeeklyKPIsByMonth(teamId, year, month);
    const actual = sumFunnelKPIs(weeklyKPIs.map((w) => w.kpi));

    // 目標を取得
    const goal = await getMonthlyGoal(teamId, year, month);
    const target = goal?.goals || null;

    // 達成率を計算
    const achievementRate = target
        ? calculateAchievementRate(actual, target)
        : {};

    // 転換率を計算
    const conversionRate = calculateConversionRates(actual);

    return {
        teamId,
        period: { type: "monthly", year, month },
        actual,
        target,
        achievementRate,
        conversionRate,
    };
}

/**
 * 週次推移データを取得（グラフ用）
 */
export async function getWeeklyTrends(
    teamId: TeamId,
    year: number,
    month?: number
): Promise<WeeklyTrend[]> {
    const weeklyKPIs = month
        ? await getWeeklyKPIsByMonth(teamId, year, month)
        : await getWeeklyKPIsByYear(teamId, year);

    return weeklyKPIs.map((w) => ({
        weekNumber: w.weekNumber,
        startDate: w.startDate,
        endDate: w.endDate,
        kpi: w.kpi,
    }));
}

/**
 * 全チームの月間サマリーを取得
 */
export async function getAllTeamsMonthlySummary(
    year: number,
    month: number
): Promise<FunnelSummary[]> {
    const teamIds: TeamId[] = ["fukugyou", "taishoku", "buppan"];
    const summaries = await Promise.all(
        teamIds.map((teamId) => getMonthlyFunnelSummary(teamId, year, month))
    );
    return summaries;
}

// ============================================
// メンバー管理
// ============================================

import { User } from "@/lib/types";

/**
 * チームメンバー一覧を取得
 */
export async function getTeamMembers(teamId: TeamId): Promise<User[]> {
    const snapshot = await getDocs(collection(db, "users"));
    const members: User[] = [];

    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as User;
        if (data.team === teamId && data.status === "approved") {
            members.push(data);
        }
    });

    // 名前でソート
    members.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
    return members;
}

/**
 * メンバーの最新レポート日を取得
 */
export async function getMemberLastReportDates(
    memberIds: string[]
): Promise<Record<string, Timestamp | null>> {
    const result: Record<string, Timestamp | null> = {};

    // 初期化
    memberIds.forEach(id => { result[id] = null; });

    // レポートを取得
    const snapshot = await getDocs(collection(db, "reports"));
    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = data.userId;
        const createdAt = data.createdAt as Timestamp | undefined;

        if (userId && memberIds.includes(userId) && createdAt) {
            if (!result[userId] || createdAt.toMillis() > (result[userId]?.toMillis() || 0)) {
                result[userId] = createdAt;
            }
        }
    });

    return result;
}

// ============================================
// アラート判定
// ============================================

export interface MemberAlert {
    userId: string;
    displayName: string;
    type: "unreported" | "low_activity" | "goal_at_risk";
    message: string;
    severity: "warning" | "critical";
    daysWithoutReport?: number;
}

/**
 * チームアラートを取得
 */
export async function getTeamAlerts(
    teamId: TeamId,
    year: number,
    month: number
): Promise<MemberAlert[]> {
    const alerts: MemberAlert[] = [];

    // メンバー取得
    const members = await getTeamMembers(teamId);
    if (members.length === 0) return alerts;

    // 最終レポート日を取得
    const lastReportDates = await getMemberLastReportDates(
        members.map(m => m.uid)
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 未報告アラート判定
    members.forEach((member) => {
        const lastReport = lastReportDates[member.uid];
        if (!lastReport) {
            // 一度も報告なし
            alerts.push({
                userId: member.uid,
                displayName: member.displayName,
                type: "unreported",
                message: "まだ日報が提出されていません",
                severity: "critical",
            });
        } else {
            const lastDate = lastReport.toDate();
            const diffDays = Math.floor(
                (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (diffDays >= 7) {
                alerts.push({
                    userId: member.uid,
                    displayName: member.displayName,
                    type: "unreported",
                    message: `${diffDays}日間報告がありません`,
                    severity: "critical",
                    daysWithoutReport: diffDays,
                });
            } else if (diffDays >= 3) {
                alerts.push({
                    userId: member.uid,
                    displayName: member.displayName,
                    type: "unreported",
                    message: `${diffDays}日間報告がありません`,
                    severity: "warning",
                    daysWithoutReport: diffDays,
                });
            }
        }
    });

    // 目標達成率アラート
    const summary = await getMonthlyFunnelSummary(teamId, year, month);
    if (summary.target && summary.achievementRate.finalConversion !== undefined) {
        const rate = summary.achievementRate.finalConversion;
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(year, month, 0).getDate();
        const expectedRate = Math.round((dayOfMonth / daysInMonth) * 100);

        if (rate < expectedRate * 0.7) {
            alerts.push({
                userId: "team",
                displayName: "チーム全体",
                type: "goal_at_risk",
                message: `目標達成率 ${rate}% (期待値: ${expectedRate}%)`,
                severity: "critical",
            });
        } else if (rate < expectedRate * 0.9) {
            alerts.push({
                userId: "team",
                displayName: "チーム全体",
                type: "goal_at_risk",
                message: `目標達成率 ${rate}% (期待値: ${expectedRate}%)`,
                severity: "warning",
            });
        }
    }

    // 重要度でソート
    alerts.sort((a, b) => {
        if (a.severity === "critical" && b.severity !== "critical") return -1;
        if (a.severity !== "critical" && b.severity === "critical") return 1;
        return 0;
    });

    return alerts;
}

// ============================================
// 権限チェック
// ============================================

import { UserRole } from "@/lib/types";

/**
 * チームダッシュボードの編集権限をチェック
 * @param userRole ユーザーのロール
 * @param userTeam ユーザーの所属チーム
 * @param targetTeam 対象のチーム
 * @returns 編集可能かどうか
 */
export function canEditTeamDashboard(
    userRole: UserRole | undefined,
    userTeam: TeamId | undefined,
    targetTeam: TeamId
): boolean {
    // 管理者は全チーム編集可能
    if (userRole === "admin") {
        return true;
    }

    // チーム統括は自チームのみ編集可能
    if (userRole === "teamLead" && userTeam === targetTeam) {
        return true;
    }

    // それ以外は編集不可
    return false;
}

/**
 * チームダッシュボードの閲覧権限をチェック
 * @param userRole ユーザーのロール
 * @param userTeam ユーザーの所属チーム
 * @param targetTeam 対象のチーム
 * @returns 閲覧可能かどうか
 */
export function canViewTeamDashboard(
    userRole: UserRole | undefined,
    userTeam: TeamId | undefined,
    targetTeam: TeamId
): boolean {
    // 管理者は全チーム閲覧可能
    if (userRole === "admin") {
        return true;
    }

    // チーム統括は自チームのみ閲覧可能
    if (userRole === "teamLead" && userTeam === targetTeam) {
        return true;
    }

    // 一般メンバーは自チームのみ閲覧可能
    if (userRole === "member" && userTeam === targetTeam) {
        return true;
    }

    // それ以外は閲覧不可
    return false;
}

/**
 * 権限レベルを取得
 */
export function getPermissionLevel(
    userRole: UserRole | undefined
): "none" | "view" | "edit" | "admin" {
    if (userRole === "admin") return "admin";
    if (userRole === "teamLead") return "edit";
    if (userRole === "member") return "view";
    return "none";
}
