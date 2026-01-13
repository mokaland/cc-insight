"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import {
    BarChart3,
    Target,
    FileEdit,
    Users,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Calendar,
    Save,
    Check,
    Loader2,
} from "lucide-react";
import {
    TeamId,
    FunnelKPI,
    TEAM_FUNNEL_LABELS,
    TeamGoal,
    TeamWeeklyKPI,
    FunnelSummary,
} from "@/lib/types";
import {
    getMonthlyFunnelSummary,
    getWeeklyKPIsByMonth,
    getMonthlyGoal,
    setMonthlyGoal,
    getQuarterlyGoal,
    setQuarterlyGoal,
    saveWeeklyKPI,
    confirmWeeklyKPI,
    getWeekNumber,
    emptyFunnelKPI,
    calculateConversionRates,
    getTeamMembers,
    getTeamAlerts,
    MemberAlert,
} from "@/lib/services/kpi";
import { User } from "@/lib/types";

// チーム設定
const TEAM_CONFIG: Record<TeamId, { name: string; color: string }> = {
    fukugyou: { name: "副業", color: "#ec4899" },
    taishoku: { name: "退職サポート", color: "#06b6d4" },
    buppan: { name: "スマホ物販", color: "#f59e0b" },
};

type TabId = "funnel" | "goal" | "input" | "members" | "alerts";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "funnel", label: "ファネル", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "goal", label: "目標設定", icon: <Target className="h-4 w-4" /> },
    { id: "input", label: "週次入力", icon: <FileEdit className="h-4 w-4" /> },
    { id: "members", label: "メンバー", icon: <Users className="h-4 w-4" /> },
    { id: "alerts", label: "アラート", icon: <AlertTriangle className="h-4 w-4" /> },
];

function TeamDashboardContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const teamId = params.teamId as TeamId;
    const teamConfig = TEAM_CONFIG[teamId];
    const funnelLabels = TEAM_FUNNEL_LABELS[teamId];

    const initialTab = (searchParams.get("tab") as TabId) || "funnel";
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);
    const [loading, setLoading] = useState(true);

    // 現在の月
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

    // データ
    const [summary, setSummary] = useState<FunnelSummary | null>(null);
    const [weeklyKPIs, setWeeklyKPIs] = useState<TeamWeeklyKPI[]>([]);
    const [goal, setGoal] = useState<TeamGoal | null>(null);

    // 入力フォーム
    const [inputKPI, setInputKPI] = useState<FunnelKPI>(emptyFunnelKPI());
    const [inputWeek, setInputWeek] = useState(getWeekNumber(now));
    const [saving, setSaving] = useState(false);

    // 目標フォーム
    const [goalInput, setGoalInput] = useState<FunnelKPI>(emptyFunnelKPI());
    const [savingGoal, setSavingGoal] = useState(false);

    // タブ変更
    const handleTabChange = (tab: TabId) => {
        setActiveTab(tab);
        router.push(`/team/${teamId}?tab=${tab}`, { scroll: false });
    };

    // データ読み込み
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [summaryData, weeklyData, goalData] = await Promise.all([
                    getMonthlyFunnelSummary(teamId, selectedYear, selectedMonth),
                    getWeeklyKPIsByMonth(teamId, selectedYear, selectedMonth),
                    getMonthlyGoal(teamId, selectedYear, selectedMonth),
                ]);
                setSummary(summaryData);
                setWeeklyKPIs(weeklyData);
                setGoal(goalData);
                if (goalData) {
                    setGoalInput(goalData.goals);
                }
            } catch (error) {
                console.error("データ取得エラー:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [teamId, selectedYear, selectedMonth]);

    // 週次KPI保存
    const handleSaveWeeklyKPI = async (confirm: boolean = false) => {
        if (!user) return;
        setSaving(true);
        try {
            const weekStart = new Date(selectedYear, 0, 1 + (inputWeek - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            await saveWeeklyKPI(
                teamId,
                selectedYear,
                inputWeek,
                weekStart.toISOString().split("T")[0],
                weekEnd.toISOString().split("T")[0],
                inputKPI,
                user.uid,
                confirm ? "confirmed" : "draft"
            );

            // 再読み込み
            const weeklyData = await getWeeklyKPIsByMonth(teamId, selectedYear, selectedMonth);
            setWeeklyKPIs(weeklyData);
            const summaryData = await getMonthlyFunnelSummary(teamId, selectedYear, selectedMonth);
            setSummary(summaryData);

            alert(confirm ? "入力を確定しました！" : "下書き保存しました");
        } catch (error) {
            console.error("保存エラー:", error);
            alert("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    // 目標保存
    const handleSaveGoal = async () => {
        if (!user) return;
        setSavingGoal(true);
        try {
            await setMonthlyGoal(teamId, selectedYear, selectedMonth, goalInput, user.uid);
            const goalData = await getMonthlyGoal(teamId, selectedYear, selectedMonth);
            setGoal(goalData);
            alert("目標を保存しました（承認待ち）");
        } catch (error) {
            console.error("目標保存エラー:", error);
            alert("保存に失敗しました");
        } finally {
            setSavingGoal(false);
        }
    };

    if (!teamConfig) {
        return <div className="p-8 text-center">チームが見つかりません</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div
                        className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                        style={{ borderColor: teamConfig.color }}
                    />
                    <p className="text-muted-foreground">データを読み込んでいます...</p>
                </div>
            </div>
        );
    }

    const conversionRates = summary ? calculateConversionRates(summary.actual, teamId) : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <span
                            className="w-4 h-4 rounded-full animate-pulse"
                            style={{
                                backgroundColor: teamConfig.color,
                                boxShadow: `0 0 20px ${teamConfig.color}`,
                            }}
                        />
                        {teamConfig.name}チーム
                    </h1>
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

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                            : "text-muted-foreground hover:bg-white/10"
                            }`}
                    >
                        {tab.icon}
                        <span className="font-medium">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "funnel" && summary && (
                <div className="space-y-6">
                    {/* 日次進捗ダッシュボード */}
                    {summary.dailyProgress && (
                        <GlassCard glowColor={teamConfig.color} className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    📈 今月の進捗
                                    <span className="text-sm font-normal text-muted-foreground">
                                        （{selectedMonth}/{summary.dailyProgress.dayOfMonth}日目・{summary.dailyProgress.expectedRate}%経過）
                                    </span>
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="py-2 text-left">ステップ</th>
                                            <th className="py-2 text-right">実績</th>
                                            <th className="py-2 text-right">目標</th>
                                            <th className="py-2 text-right">達成率</th>
                                            <th className="py-2 text-center">ステータス</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(funnelLabels).map(([key, label]) => {
                                            const actual = (summary.actual as unknown as Record<string, number | undefined>)[key] ?? 0;
                                            const target = summary.target ? (summary.target as unknown as Record<string, number | undefined>)[key] ?? 0 : 0;
                                            const rate = summary.dailyProgress!.actualRate[key] ?? 0;
                                            const status = summary.dailyProgress!.status[key];

                                            return (
                                                <tr key={key} className="border-b border-white/5">
                                                    <td className="py-2">{label}</td>
                                                    <td className="py-2 text-right font-medium">{actual.toLocaleString()}</td>
                                                    <td className="py-2 text-right text-muted-foreground">{target.toLocaleString()}</td>
                                                    <td className={`py-2 text-right font-semibold ${status === "on_track" ? "text-green-400" :
                                                            status === "warning" ? "text-yellow-400" : "text-red-400"
                                                        }`}>
                                                        {rate}%
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        {status === "on_track" ? "✅ 順調" :
                                                            status === "warning" ? "⚠️ 注意" : "🔴 要対策"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    )}

                    {/* ファネル可視化 */}
                    <GlassCard glowColor={teamConfig.color} className="p-6">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" style={{ color: teamConfig.color }} />
                            ファネル分析
                        </h2>
                        <div className="space-y-3">
                            {Object.entries(funnelLabels).map(([key, label], index) => {
                                const value = (summary.actual as unknown as Record<string, number | undefined>)[key] ?? 0;
                                const target = summary.target ? (summary.target as unknown as Record<string, number | undefined>)[key] : undefined;
                                const rate = summary.achievementRate[key];
                                const maxValue = Math.max(summary.actual.pv, 1);
                                const width = Math.max((value / maxValue) * 100, 5);

                                return (
                                    <div key={key} className="flex items-center gap-4">
                                        <div className="w-28 text-sm text-muted-foreground">{label}</div>
                                        <div className="flex-1 relative">
                                            <div
                                                className="h-8 rounded-lg flex items-center px-3 text-white font-medium text-sm"
                                                style={{
                                                    width: `${width}%`,
                                                    background: `linear-gradient(to right, ${teamConfig.color}, ${teamConfig.color}aa)`,
                                                }}
                                            >
                                                {value.toLocaleString()}
                                            </div>
                                        </div>
                                        {target && (
                                            <div className="w-24 text-right text-sm">
                                                <span
                                                    className={
                                                        rate && rate >= 100
                                                            ? "text-green-400"
                                                            : rate && rate >= 80
                                                                ? "text-yellow-400"
                                                                : "text-red-400"
                                                    }
                                                >
                                                    {rate}%
                                                </span>
                                                <span className="text-muted-foreground ml-1">/{target.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {index > 0 && conversionRates && (
                                            <div className="w-16 text-xs text-muted-foreground">
                                                ↓ {Object.values(conversionRates)[index - 1]}%
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>

                    {/* 週次推移 */}
                    <GlassCard glowColor={teamConfig.color} className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" style={{ color: teamConfig.color }} />
                            週次推移
                        </h2>
                        {weeklyKPIs.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                週次データがありません。「週次入力」タブから入力してください。
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="py-2 text-left">週</th>
                                            {Object.values(funnelLabels).map((label) => (
                                                <th key={label} className="py-2 text-right">
                                                    {label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weeklyKPIs.map((week) => (
                                            <tr key={week.id} className="border-b border-white/5">
                                                <td className="py-2">W{week.weekNumber}</td>
                                                {Object.keys(funnelLabels).map((key) => {
                                                    const val = (week.kpi as unknown as Record<string, number | undefined>)[key] ?? 0;
                                                    return (
                                                        <td key={key} className="py-2 text-right">
                                                            {val.toLocaleString()}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </GlassCard>
                </div>
            )}

            {activeTab === "goal" && (
                <GoalSettingTab
                    teamId={teamId}
                    teamConfig={teamConfig}
                    funnelLabels={funnelLabels}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                />
            )}

            {activeTab === "input" && (
                <GlassCard glowColor={teamConfig.color} className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <FileEdit className="h-5 w-5" style={{ color: teamConfig.color }} />
                            週次KPI入力
                        </h2>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <select
                                value={inputWeek}
                                onChange={(e) => setInputWeek(Number(e.target.value))}
                                className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                            >
                                {[...Array(52)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        Week {i + 1}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(funnelLabels).map(([key, label]) => {
                            const currentValue = (inputKPI as unknown as Record<string, number | undefined>)[key] ?? 0;
                            const target = summary?.target ? (summary.target as unknown as Record<string, number | undefined>)[key] ?? 0 : 0;
                            const cumulative = summary?.actual ? (summary.actual as unknown as Record<string, number | undefined>)[key] ?? 0 : 0;
                            const newCumulative = cumulative + currentValue;
                            const rate = target > 0 ? Math.round((newCumulative / target) * 100) : 0;

                            return (
                                <div key={key} className="flex items-center gap-4">
                                    <div className="w-28 text-sm">{label}</div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={currentValue === 0 ? '' : currentValue}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setInputKPI((prev) => ({
                                                ...prev,
                                                [key]: val === '' ? 0 : parseInt(val, 10) || 0,
                                            }));
                                        }}
                                        placeholder="0"
                                        className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                                    />
                                    <div className="flex-1 text-sm text-muted-foreground">
                                        累計: {newCumulative.toLocaleString()}
                                        {target > 0 && (
                                            <>
                                                <span className="mx-2">/</span>
                                                {target.toLocaleString()}
                                                <span
                                                    className={`ml-2 ${rate >= 100 ? "text-green-400" : rate >= 80 ? "text-yellow-400" : "text-red-400"
                                                        }`}
                                                >
                                                    ({rate}%)
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => handleSaveWeeklyKPI(false)} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            下書き保存
                        </Button>
                        <Button
                            onClick={() => handleSaveWeeklyKPI(true)}
                            disabled={saving}
                            style={{
                                background: `linear-gradient(to right, ${teamConfig.color}, #a855f7)`,
                            }}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            確定
                        </Button>
                    </div>
                </GlassCard>
            )}

            {activeTab === "members" && (
                <MembersTab teamId={teamId} teamConfig={teamConfig} />
            )}

            {activeTab === "alerts" && (
                <AlertsTab
                    teamId={teamId}
                    teamConfig={teamConfig}
                    year={selectedYear}
                    month={selectedMonth}
                />
            )}
        </div>
    );
}

// 目標設定タブコンポーネント（月間のみ入力、Q自動計算）
function GoalSettingTab({
    teamId,
    teamConfig,
    funnelLabels,
    selectedYear,
    selectedMonth,
}: {
    teamId: TeamId;
    teamConfig: { name: string; color: string };
    funnelLabels: Record<string, string>;
    selectedYear: number;
    selectedMonth: number;
}) {
    const { user, userProfile } = useAuth();
    const [goal, setGoal] = useState<TeamGoal | null>(null);
    const [goalInput, setGoalInput] = useState<FunnelKPI>(emptyFunnelKPI(teamId));
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // クオーターサマリー用state
    const [quarterSummary, setQuarterSummary] = useState<{
        quarterlyTotal: FunnelKPI;
        confirmedMonths: number;
        status: "complete" | "partial" | "none";
    } | null>(null);

    const currentQuarter = Math.ceil(selectedMonth / 3);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // 月次目標を取得
                const goalData = await getMonthlyGoal(teamId, selectedYear, selectedMonth);
                setGoal(goalData);
                if (goalData) {
                    setGoalInput(goalData.goals);
                } else {
                    setGoalInput(emptyFunnelKPI(teamId));
                }

                // クオーターサマリーを取得（自動計算）
                const { getQuarterlyGoalSummary } = await import("@/lib/services/kpi");
                const qSummary = await getQuarterlyGoalSummary(teamId, selectedYear, currentQuarter);
                setQuarterSummary(qSummary);
            } catch (error) {
                console.error("目標取得エラー:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [teamId, selectedYear, selectedMonth, currentQuarter]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            // 月次目標を保存
            const result = await setMonthlyGoal(teamId, selectedYear, selectedMonth, goalInput, user.uid);
            const goalId = result.id;

            // Slack通知API呼び出し（バックグラウンドで実行、失敗しても無視）
            try {
                await fetch("/api/goals/submit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        goalId,
                        teamId,
                        goalType: "monthly",
                        year: selectedYear,
                        month: selectedMonth,
                        submittedBy: userProfile?.displayName || user.email || "Unknown",
                        goals: goalInput,
                    }),
                });
            } catch (slackError) {
                console.warn("Slack通知送信エラー（無視）:", slackError);
            }

            // 再読み込み
            const goalData = await getMonthlyGoal(teamId, selectedYear, selectedMonth);
            setGoal(goalData);

            // クオーターサマリーも再取得
            const { getQuarterlyGoalSummary } = await import("@/lib/services/kpi");
            const qSummary = await getQuarterlyGoalSummary(teamId, selectedYear, currentQuarter);
            setQuarterSummary(qSummary);

            alert("目標を提出しました！承認をお待ちください。");
        } catch (error) {
            console.error("目標保存エラー:", error);
            alert("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <GlassCard glowColor={teamConfig.color} className="p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: teamConfig.color }} />
                </div>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* 月次目標入力カード */}
            <GlassCard glowColor={teamConfig.color} className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Target className="h-5 w-5" style={{ color: teamConfig.color }} />
                        {selectedYear}年{selectedMonth}月 目標設定
                    </h2>
                    {goal && (
                        <span
                            className={`px-3 py-1 rounded-full text-sm ${goal.status === "approved"
                                ? "bg-green-500/20 text-green-400"
                                : goal.status === "pending"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                        >
                            {goal.status === "approved"
                                ? "✓ 承認済み"
                                : goal.status === "pending"
                                    ? "⏳ 承認待ち"
                                    : "下書き"}
                        </span>
                    )}
                </div>

                {/* 入力フォーム */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(funnelLabels).map(([key, label]) => {
                        const value = (goalInput as unknown as Record<string, number | undefined>)[key] ?? 0;
                        return (
                            <div key={key}>
                                <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={value === 0 ? "" : value}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setGoalInput((prev) => ({
                                            ...prev,
                                            [key]: val === "" ? 0 : parseInt(val, 10) || 0,
                                        }));
                                    }}
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                                    disabled={goal?.status === "pending" || goal?.status === "approved"}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* 保存ボタン */}
                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={saving || goal?.status === "pending" || goal?.status === "approved"}
                        className="gap-2"
                        style={{
                            background: `linear-gradient(to right, ${teamConfig.color}, #a855f7)`,
                        }}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        目標を保存（承認申請）
                    </Button>
                </div>
            </GlassCard>

            {/* Q目標（自動計算）カード */}
            <GlassCard glowColor={teamConfig.color} className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        📊 Q{currentQuarter}目標（自動計算）
                    </h3>
                    {quarterSummary && (
                        <span className={`px-3 py-1 rounded-full text-xs ${quarterSummary.status === "complete"
                            ? "bg-green-500/20 text-green-400"
                            : quarterSummary.status === "partial"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}>
                            {quarterSummary.confirmedMonths}/3ヶ月確定
                        </span>
                    )}
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                    各月の目標を合計した値が自動的にクオーター目標として表示されます
                </p>

                {quarterSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(funnelLabels).map(([key, label]) => {
                            const value = (quarterSummary.quarterlyTotal as unknown as Record<string, number | undefined>)[key] ?? 0;
                            return (
                                <div key={key} className="p-3 bg-white/5 rounded-lg">
                                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                                    <div className="text-lg font-semibold" style={{ color: teamConfig.color }}>
                                        {value.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>
        </div>
    );
}

// メンバータブコンポーネント
function MembersTab({
    teamId,
    teamConfig,
}: {
    teamId: TeamId;
    teamConfig: { name: string; color: string };
}) {
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await getTeamMembers(teamId);
                setMembers(data);
            } catch (error) {
                console.error("メンバー取得エラー:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [teamId]);

    if (loading) {
        return (
            <GlassCard glowColor={teamConfig.color} className="p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: teamConfig.color }} />
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard glowColor={teamConfig.color} className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Users className="h-5 w-5" style={{ color: teamConfig.color }} />
                メンバー一覧
                <span className="text-sm text-muted-foreground ml-2">({members.length}名)</span>
            </h2>
            {members.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                    このチームにはまだメンバーがいません
                </p>
            ) : (
                <div className="space-y-3">
                    {members.map((member) => (
                        <div
                            key={member.uid}
                            className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                                style={{ backgroundColor: `${teamConfig.color}40` }}
                            >
                                {member.displayName?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">{member.displayName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {member.realName && `(${member.realName})`}
                                </p>
                            </div>
                            <div className="text-right text-sm">
                                {member.currentStreak && member.currentStreak > 0 ? (
                                    <span className="text-green-400">🔥 {member.currentStreak}日連続</span>
                                ) : (
                                    <span className="text-muted-foreground">ストリークなし</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>
    );
}

// アラートタブコンポーネント
function AlertsTab({
    teamId,
    teamConfig,
    year,
    month,
}: {
    teamId: TeamId;
    teamConfig: { name: string; color: string };
    year: number;
    month: number;
}) {
    const [alerts, setAlerts] = useState<MemberAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await getTeamAlerts(teamId, year, month);
                setAlerts(data);
            } catch (error) {
                console.error("アラート取得エラー:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [teamId, year, month]);

    if (loading) {
        return (
            <GlassCard glowColor={teamConfig.color} className="p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: teamConfig.color }} />
                </div>
            </GlassCard>
        );
    }

    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const warningAlerts = alerts.filter((a) => a.severity === "warning");

    return (
        <GlassCard glowColor={teamConfig.color} className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: teamConfig.color }} />
                アラート
                {alerts.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-sm bg-red-500/20 text-red-400">
                        {alerts.length}件
                    </span>
                )}
            </h2>
            {alerts.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-4xl mb-2">✨</div>
                    <p className="text-green-400 font-medium">問題なし！</p>
                    <p className="text-muted-foreground text-sm">すべてのメンバーが正常に活動しています</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {criticalAlerts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                                🚨 重要 ({criticalAlerts.length}件)
                            </h3>
                            <div className="space-y-2">
                                {criticalAlerts.map((alert, i) => (
                                    <div
                                        key={i}
                                        className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{alert.displayName}</span>
                                            <span className="text-sm text-red-400">{alert.message}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {warningAlerts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                                ⚠️ 注意 ({warningAlerts.length}件)
                            </h3>
                            <div className="space-y-2">
                                {warningAlerts.map((alert, i) => (
                                    <div
                                        key={i}
                                        className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{alert.displayName}</span>
                                            <span className="text-sm text-yellow-400">{alert.message}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </GlassCard>
    );
}

export default function TeamDashboardPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-screen">
                    <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <TeamDashboardContent />
        </Suspense>
    );
}
