"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Check,
    Clock,
    AlertTriangle,
    Loader2,
    ChevronRight,
    Users,
    Target,
    Briefcase,
    UserMinus,
    Smartphone,
    Calendar,
} from "lucide-react";
import {
    TeamId,
    FunnelSummary,
    TeamGoal,
    TEAM_FUNNEL_LABELS,
    FunnelKPI,
    MonthlyTrend,
    QuarterlyComparison,
    TeamTrendData,
    getFunnelKeys,
} from "@/lib/types";
import {
    getAllTeamsMonthlySummary,
    getPendingGoals,
    approveGoal,
} from "@/lib/services/kpi";
import {
    getMonthlyTrends,
    getQuarterlyComparisons,
    getAllTeamsTrendData,
} from "@/lib/services/kpi-trend";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

// チーム設定
const TEAM_CONFIG: Record<TeamId, { name: string; color: string; icon: React.ReactNode }> = {
    fukugyou: {
        name: "副業",
        color: "#ec4899",
        icon: <Briefcase className="h-5 w-5" />,
    },
    taishoku: {
        name: "退職サポート",
        color: "#06b6d4",
        icon: <UserMinus className="h-5 w-5" />,
    },
    buppan: {
        name: "スマホ物販",
        color: "#f59e0b",
        icon: <Smartphone className="h-5 w-5" />,
    },
};

// 共通ファネルキー（比較用）
const COMMON_FUNNEL_KEYS = [
    "lineRegistration",
    "consultationBooking",
    "consultationDone",
    "yesAcquired",
    "finalConversion",
    "activeOrPaid",
];

const COMMON_LABELS: Record<string, string> = {
    lineRegistration: "LINE登録",
    consultationBooking: "商談予約",
    consultationDone: "商談実施",
    yesAcquired: "YES獲得",
    finalConversion: "最終CV",
    activeOrPaid: "実働/着金",
};

type TabType = "summary" | "detail" | "trend" | "quarter";

export default function CEODashboardPage() {
    const router = useRouter();
    const { user } = useAuth();

    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [activeTab, setActiveTab] = useState<TabType>("summary");
    const [selectedTeam, setSelectedTeam] = useState<TeamId>("fukugyou");
    const [trendMonths, setTrendMonths] = useState<3 | 6 | 12>(6);

    const [loading, setLoading] = useState(true);
    const [summaries, setSummaries] = useState<FunnelSummary[]>([]);
    const [pendingGoals, setPendingGoals] = useState<TeamGoal[]>([]);
    const [trendData, setTrendData] = useState<TeamTrendData[]>([]);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    // データ読み込み
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [summaryData, goalsData, trends] = await Promise.all([
                    getAllTeamsMonthlySummary(selectedYear, selectedMonth),
                    getPendingGoals(),
                    getAllTeamsTrendData(trendMonths, 4),
                ]);
                setSummaries(summaryData);
                setPendingGoals(goalsData);
                setTrendData(trends);
            } catch (error) {
                console.error("データ取得エラー:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedYear, selectedMonth, trendMonths]);

    // 目標承認
    const handleApproveGoal = async (goalId: string) => {
        if (!user) return;
        setApprovingId(goalId);
        try {
            await approveGoal(goalId, user.uid);
            const goalsData = await getPendingGoals();
            setPendingGoals(goalsData);
        } catch (error) {
            console.error("承認エラー:", error);
            alert("承認に失敗しました");
        } finally {
            setApprovingId(null);
        }
    };

    // 総合達成率を計算
    const getOverallStatus = (summary: FunnelSummary): { rate: number; status: string } => {
        const rate = summary.achievementRate["finalConversion"] ?? 0;
        const dayProgress = summary.dailyProgress;

        if (!dayProgress) return { rate, status: "unknown" };

        if (rate >= dayProgress.expectedRate) return { rate, status: "on_track" };
        if (rate >= dayProgress.expectedRate * 0.7) return { rate, status: "warning" };
        return { rate, status: "critical" };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">データを読み込んでいます...</p>
                </div>
            </div>
        );
    }

    const currentSummary = summaries.find((s) => s.teamId === selectedTeam);
    const currentTrend = trendData.find((t) => t.teamId === selectedTeam);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">📊 事業ダッシュボード</h1>
                    <p className="text-muted-foreground mt-2">
                        {selectedYear}年{selectedMonth}月
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {i + 1}月
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 承認待ちアラート */}
            {pendingGoals.length > 0 && (
                <GlassCard glowColor="#facc15" className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            <span className="font-medium">目標承認待ち: {pendingGoals.length}件</span>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const goal = pendingGoals[0];
                                if (goal) handleApproveGoal(goal.id);
                            }}
                            disabled={approvingId !== null}
                        >
                            {approvingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            承認
                        </Button>
                    </div>
                </GlassCard>
            )}

            {/* タブ */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-fit">
                {[
                    { key: "summary", label: "サマリー" },
                    { key: "detail", label: "チーム詳細" },
                    { key: "trend", label: "月次推移" },
                    { key: "quarter", label: "Q比較" },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as TabType)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key
                                ? "bg-white/20 text-white"
                                : "text-muted-foreground hover:bg-white/10"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* サマリータブ */}
            {activeTab === "summary" && (
                <div className="space-y-6">
                    {/* 日次進捗ヘッダー */}
                    {summaries[0]?.dailyProgress && (
                        <GlassCard glowColor="#8b5cf6" className="p-4">
                            <div className="flex items-center gap-2 text-lg">
                                📈 今月の進捗
                                <span className="text-sm text-muted-foreground">
                                    （{selectedMonth}月{summaries[0].dailyProgress.dayOfMonth}日目 / {summaries[0].dailyProgress.daysInMonth}日 = {summaries[0].dailyProgress.expectedRate}%経過）
                                </span>
                            </div>
                        </GlassCard>
                    )}

                    {/* チーム横並び比較テーブル */}
                    <GlassCard glowColor="#8b5cf6" className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-purple-400" />
                            チーム別ファネル比較（共通指標）
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-2 text-left">チーム</th>
                                        {COMMON_FUNNEL_KEYS.map((key) => (
                                            <th key={key} className="py-2 text-right">{COMMON_LABELS[key]}</th>
                                        ))}
                                        <th className="py-2 text-center">ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaries.map((summary) => {
                                        const teamConfig = TEAM_CONFIG[summary.teamId];
                                        const { rate, status } = getOverallStatus(summary);
                                        const labels = TEAM_FUNNEL_LABELS[summary.teamId];

                                        return (
                                            <>
                                                <tr
                                                    key={summary.teamId}
                                                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                                    onClick={() => router.push(`/team/${summary.teamId}`)}
                                                >
                                                    <td className="py-3 flex items-center gap-2">
                                                        <span
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: teamConfig.color }}
                                                        />
                                                        {teamConfig.name}
                                                    </td>
                                                    {COMMON_FUNNEL_KEYS.map((key) => {
                                                        const actual = (summary.actual as unknown as Record<string, number | undefined>)[key] ?? 0;
                                                        const target = summary.target ? (summary.target as unknown as Record<string, number | undefined>)[key] ?? 0 : 0;
                                                        return (
                                                            <td key={key} className="py-3 text-right">
                                                                <div>{actual}</div>
                                                                <div className="text-xs text-muted-foreground">/{target}</div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${status === "on_track" ? "bg-green-500/20 text-green-400" :
                                                                status === "warning" ? "bg-yellow-500/20 text-yellow-400" :
                                                                    "bg-red-500/20 text-red-400"
                                                            }`}>
                                                            {status === "on_track" ? "✅ 順調" :
                                                                status === "warning" ? "⚠️ 注意" : "🔴 要対策"}
                                                            ({rate}%)
                                                        </span>
                                                    </td>
                                                </tr>
                                                {/* 転換率行 */}
                                                <tr key={`${summary.teamId}-cvr`} className="border-b border-white/5 text-xs text-muted-foreground">
                                                    <td className="py-1 pl-5">↳ 転換率</td>
                                                    {COMMON_FUNNEL_KEYS.map((key, idx) => {
                                                        if (idx === 0) return <td key={key} className="py-1 text-right">-</td>;
                                                        const prevKey = COMMON_FUNNEL_KEYS[idx - 1];
                                                        const rateKey = `${prevKey}To${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                                                        const cvr = summary.conversionRate[rateKey] ?? 0;
                                                        return (
                                                            <td key={key} className="py-1 text-right">{cvr}%</td>
                                                        );
                                                    })}
                                                    <td></td>
                                                </tr>
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* チーム詳細タブ */}
            {activeTab === "detail" && currentSummary && (
                <div className="space-y-6">
                    {/* チーム選択 */}
                    <div className="flex gap-2">
                        {(Object.keys(TEAM_CONFIG) as TeamId[]).map((teamId) => (
                            <button
                                key={teamId}
                                onClick={() => setSelectedTeam(teamId)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedTeam === teamId
                                        ? "text-white"
                                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                    }`}
                                style={selectedTeam === teamId ? { backgroundColor: TEAM_CONFIG[teamId].color } : {}}
                            >
                                {TEAM_CONFIG[teamId].name}
                            </button>
                        ))}
                    </div>

                    {/* フルファネル表示 */}
                    <GlassCard glowColor={TEAM_CONFIG[selectedTeam].color} className="p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            {TEAM_CONFIG[selectedTeam].name}チーム フルファネル
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-2 text-left">ステップ</th>
                                        <th className="py-2 text-right">実績</th>
                                        <th className="py-2 text-right">目標</th>
                                        <th className="py-2 text-right">達成率</th>
                                        <th className="py-2 text-right">転換率</th>
                                        <th className="py-2 text-center">ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(TEAM_FUNNEL_LABELS[selectedTeam]).map(([key, label], idx) => {
                                        const actual = (currentSummary.actual as unknown as Record<string, number | undefined>)[key] ?? 0;
                                        const target = currentSummary.target ? (currentSummary.target as unknown as Record<string, number | undefined>)[key] ?? 0 : 0;
                                        const achRate = currentSummary.achievementRate[key] ?? 0;
                                        const status = currentSummary.dailyProgress?.status[key];

                                        // 転換率キーを計算
                                        const keys = getFunnelKeys(selectedTeam);
                                        let cvr = "-";
                                        if (idx > 0) {
                                            const prevKey = keys[idx - 1];
                                            const rateKey = `${prevKey}To${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                                            const cvrVal = currentSummary.conversionRate[rateKey];
                                            if (cvrVal !== undefined) cvr = `${cvrVal}%`;
                                        }

                                        return (
                                            <tr key={key} className="border-b border-white/5">
                                                <td className="py-2">{label}</td>
                                                <td className="py-2 text-right font-medium">{actual.toLocaleString()}</td>
                                                <td className="py-2 text-right text-muted-foreground">{target.toLocaleString()}</td>
                                                <td className={`py-2 text-right font-semibold ${achRate >= 100 ? "text-green-400" :
                                                        achRate >= 70 ? "text-yellow-400" : "text-red-400"
                                                    }`}>
                                                    {achRate}%
                                                </td>
                                                <td className="py-2 text-right text-muted-foreground">{cvr}</td>
                                                <td className="py-2 text-center">
                                                    {status === "on_track" ? "✅" :
                                                        status === "warning" ? "⚠️" :
                                                            status === "critical" ? "🔴" : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* 月次推移タブ */}
            {activeTab === "trend" && currentTrend && (
                <div className="space-y-6">
                    {/* チーム・期間選択 */}
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex gap-2">
                            {(Object.keys(TEAM_CONFIG) as TeamId[]).map((teamId) => (
                                <button
                                    key={teamId}
                                    onClick={() => setSelectedTeam(teamId)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedTeam === teamId
                                            ? "text-white"
                                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                        }`}
                                    style={selectedTeam === teamId ? { backgroundColor: TEAM_CONFIG[teamId].color } : {}}
                                >
                                    {TEAM_CONFIG[teamId].name}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {([3, 6, 12] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setTrendMonths(m)}
                                    className={`px-3 py-1 rounded-md text-sm ${trendMonths === m
                                            ? "bg-purple-500/20 text-purple-400"
                                            : "bg-white/5 text-muted-foreground"
                                        }`}
                                >
                                    {m}ヶ月
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 折れ線グラフ */}
                    <GlassCard glowColor={TEAM_CONFIG[selectedTeam].color} className="p-6">
                        <h2 className="text-xl font-semibold mb-4">📈 ファネル月次推移</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={currentTrend.monthlyTrends.map((t) => ({
                                    name: `${t.month}月`,
                                    LINE登録: (t.actual as unknown as Record<string, number>).lineRegistration ?? 0,
                                    商談実施: t.actual.consultationDone,
                                    最終CV: t.actual.finalConversion,
                                }))}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                <XAxis dataKey="name" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff20" }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="LINE登録" stroke="#8b5cf6" strokeWidth={2} />
                                <Line type="monotone" dataKey="商談実施" stroke="#06b6d4" strokeWidth={2} />
                                <Line type="monotone" dataKey="最終CV" stroke="#ec4899" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </GlassCard>

                    {/* 月次テーブル */}
                    <GlassCard glowColor={TEAM_CONFIG[selectedTeam].color} className="p-6">
                        <h2 className="text-lg font-semibold mb-4">月次実績テーブル</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-2 text-left">月</th>
                                        <th className="py-2 text-right">LINE登録</th>
                                        <th className="py-2 text-right">商談実施</th>
                                        <th className="py-2 text-right">最終CV</th>
                                        <th className="py-2 text-right">達成率</th>
                                        <th className="py-2 text-center">成長</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentTrend.monthlyTrends.map((t, idx) => {
                                        const achRate = t.achievementRate["finalConversion"] ?? 0;
                                        const growth = t.growthRate?.["finalConversion"];
                                        return (
                                            <tr key={`${t.year}-${t.month}`} className="border-b border-white/5">
                                                <td className="py-2">{t.year}/{t.month}月</td>
                                                <td className="py-2 text-right">
                                                    {((t.actual as unknown as Record<string, number>).lineRegistration ?? 0).toLocaleString()}
                                                </td>
                                                <td className="py-2 text-right">{t.actual.consultationDone.toLocaleString()}</td>
                                                <td className="py-2 text-right font-medium">{t.actual.finalConversion.toLocaleString()}</td>
                                                <td className={`py-2 text-right ${achRate >= 100 ? "text-green-400" :
                                                        achRate >= 70 ? "text-yellow-400" : "text-red-400"
                                                    }`}>
                                                    {achRate}%
                                                </td>
                                                <td className="py-2 text-center">
                                                    {growth !== undefined ? (
                                                        <span className={growth >= 0 ? "text-green-400" : "text-red-400"}>
                                                            {growth >= 0 ? "↑" : "↓"}{Math.abs(growth)}%
                                                        </span>
                                                    ) : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Q比較タブ */}
            {activeTab === "quarter" && currentTrend && (
                <div className="space-y-6">
                    {/* チーム選択 */}
                    <div className="flex gap-2">
                        {(Object.keys(TEAM_CONFIG) as TeamId[]).map((teamId) => (
                            <button
                                key={teamId}
                                onClick={() => setSelectedTeam(teamId)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedTeam === teamId
                                        ? "text-white"
                                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                    }`}
                                style={selectedTeam === teamId ? { backgroundColor: TEAM_CONFIG[teamId].color } : {}}
                            >
                                {TEAM_CONFIG[teamId].name}
                            </button>
                        ))}
                    </div>

                    {/* Q比較テーブル */}
                    <GlassCard glowColor={TEAM_CONFIG[selectedTeam].color} className="p-6">
                        <h2 className="text-xl font-semibold mb-4">📊 クオーター実績比較</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-2 text-left">期間</th>
                                        <th className="py-2 text-right">LINE登録</th>
                                        <th className="py-2 text-right">商談実施</th>
                                        <th className="py-2 text-right">最終CV</th>
                                        <th className="py-2 text-right">達成率</th>
                                        <th className="py-2 text-center">対前Q</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentTrend.quarterlyComparisons.map((q) => {
                                        const achRate = q.achievementRate["finalConversion"] ?? 0;
                                        const growth = q.vsPreQuarter?.growthRate["finalConversion"];
                                        return (
                                            <tr key={`${q.year}-Q${q.quarter}`} className="border-b border-white/5">
                                                <td className="py-2">
                                                    {q.year} Q{q.quarter}
                                                    {q.isInProgress && (
                                                        <span className="ml-2 text-xs text-muted-foreground">(進行中)</span>
                                                    )}
                                                </td>
                                                <td className="py-2 text-right">
                                                    {((q.actual as unknown as Record<string, number>).lineRegistration ?? 0).toLocaleString()}
                                                </td>
                                                <td className="py-2 text-right">{q.actual.consultationDone.toLocaleString()}</td>
                                                <td className="py-2 text-right font-medium">{q.actual.finalConversion.toLocaleString()}</td>
                                                <td className={`py-2 text-right ${achRate >= 100 ? "text-green-400" :
                                                        achRate >= 70 ? "text-yellow-400" : "text-red-400"
                                                    }`}>
                                                    {achRate}%
                                                </td>
                                                <td className="py-2 text-center">
                                                    {growth !== undefined ? (
                                                        <span className={growth >= 0 ? "text-green-400" : "text-red-400"}>
                                                            {growth >= 0 ? "↑" : "↓"}{Math.abs(growth)}%
                                                        </span>
                                                    ) : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
