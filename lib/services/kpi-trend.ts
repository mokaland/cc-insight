/**
 * KPI トレンドサービス
 * CEO Dashboard用の月次推移・Q比較データ取得
 */

import {
    TeamId,
    FunnelKPI,
    MonthlyTrend,
    QuarterlyComparison,
    TeamTrendData,
    TEAM_FUNNEL_LABELS,
    getFunnelKeys,
} from "@/lib/types";
import {
    getMonthlyFunnelSummary,
    emptyFunnelKPI,
    sumFunnelKPIs,
    calculateConversionRates,
    calculateAchievementRate,
} from "./kpi";

// ============================================
// 月次推移
// ============================================

/**
 * 指定期間の月次推移データを取得
 */
export async function getMonthlyTrends(
    teamId: TeamId,
    months: number = 6
): Promise<MonthlyTrend[]> {
    const now = new Date();
    const trends: MonthlyTrend[] = [];

    for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;

        try {
            const summary = await getMonthlyFunnelSummary(teamId, year, month);

            trends.push({
                year,
                month,
                actual: summary.actual,
                target: summary.target,
                achievementRate: summary.achievementRate,
                conversionRate: summary.conversionRate,
            });
        } catch (error) {
            console.error(`月次データ取得エラー (${year}/${month}):`, error);
            trends.push({
                year,
                month,
                actual: emptyFunnelKPI(teamId),
                target: null,
                achievementRate: {},
                conversionRate: {},
            });
        }
    }

    // 前月比成長率を計算
    for (let i = 1; i < trends.length; i++) {
        const current = trends[i];
        const previous = trends[i - 1];
        const keys = getFunnelKeys(teamId);
        const growthRate: Record<string, number> = {};

        for (const key of keys) {
            const currVal = (current.actual as unknown as Record<string, number | undefined>)[key] ?? 0;
            const prevVal = (previous.actual as unknown as Record<string, number | undefined>)[key] ?? 0;

            if (prevVal > 0) {
                growthRate[key] = Math.round(((currVal - prevVal) / prevVal) * 100);
            } else {
                growthRate[key] = currVal > 0 ? 100 : 0;
            }
        }

        current.growthRate = growthRate;
    }

    return trends;
}

// ============================================
// クオーター比較
// ============================================

/**
 * 指定Qの実績を集計
 */
async function getQuarterlyActual(
    teamId: TeamId,
    year: number,
    quarter: number
): Promise<{ actual: FunnelKPI; target: FunnelKPI | null }> {
    const startMonth = (quarter - 1) * 3 + 1;
    const months = [startMonth, startMonth + 1, startMonth + 2];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const actuals: FunnelKPI[] = [];
    const targets: FunnelKPI[] = [];

    for (const month of months) {
        // 未来の月はスキップ
        if (year > currentYear || (year === currentYear && month > currentMonth)) {
            continue;
        }

        try {
            const summary = await getMonthlyFunnelSummary(teamId, year, month);
            actuals.push(summary.actual);
            if (summary.target) {
                targets.push(summary.target);
            }
        } catch (error) {
            console.error(`Q実績取得エラー (${year} Q${quarter} ${month}月):`, error);
        }
    }

    return {
        actual: actuals.length > 0 ? sumFunnelKPIs(actuals, teamId) : emptyFunnelKPI(teamId),
        target: targets.length > 0 ? sumFunnelKPIs(targets, teamId) : null,
    };
}

/**
 * クオーター比較データを取得
 */
export async function getQuarterlyComparisons(
    teamId: TeamId,
    quarters: number = 4
): Promise<QuarterlyComparison[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);

    const comparisons: QuarterlyComparison[] = [];

    let year = currentYear;
    let quarter = currentQuarter;

    for (let i = 0; i < quarters; i++) {
        const { actual, target } = await getQuarterlyActual(teamId, year, quarter);

        const isInProgress = year === currentYear && quarter === currentQuarter;
        const achievementRate = target
            ? calculateAchievementRate(actual, target, teamId)
            : {};
        const conversionRate = calculateConversionRates(actual, teamId);

        comparisons.unshift({
            year,
            quarter,
            actual,
            target,
            achievementRate,
            conversionRate,
            isInProgress,
        });

        // 前のQへ
        quarter--;
        if (quarter === 0) {
            quarter = 4;
            year--;
        }
    }

    // 対前Q成長率を計算
    for (let i = 1; i < comparisons.length; i++) {
        const current = comparisons[i];
        const previous = comparisons[i - 1];
        const keys = getFunnelKeys(teamId);
        const growthRate: Record<string, number> = {};

        for (const key of keys) {
            const currVal = (current.actual as unknown as Record<string, number | undefined>)[key] ?? 0;
            const prevVal = (previous.actual as unknown as Record<string, number | undefined>)[key] ?? 0;

            if (prevVal > 0) {
                growthRate[key] = Math.round(((currVal - prevVal) / prevVal) * 100);
            }
        }

        current.vsPreQuarter = { growthRate };
    }

    return comparisons;
}

// ============================================
// 全チームトレンド取得
// ============================================

/**
 * 全チームのトレンドデータを取得
 */
export async function getAllTeamsTrendData(
    months: number = 6,
    quarters: number = 4
): Promise<TeamTrendData[]> {
    const teamIds: TeamId[] = ["fukugyou", "taishoku", "buppan"];

    const results = await Promise.all(
        teamIds.map(async (teamId) => {
            const [monthlyTrends, quarterlyComparisons] = await Promise.all([
                getMonthlyTrends(teamId, months),
                getQuarterlyComparisons(teamId, quarters),
            ]);

            return {
                teamId,
                monthlyTrends,
                quarterlyComparisons,
            };
        })
    );

    return results;
}
