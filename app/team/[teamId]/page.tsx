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
    saveWeeklyKPI,
    confirmWeeklyKPI,
    getWeekNumber,
    emptyFunnelKPI,
    calculateConversionRates,
} from "@/lib/services/kpi";

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

    const conversionRates = summary ? calculateConversionRates(summary.actual) : null;

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
                    {/* ファネル可視化 */}
                    <GlassCard glowColor={teamConfig.color} className="p-6">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" style={{ color: teamConfig.color }} />
                            ファネル分析
                        </h2>
                        <div className="space-y-3">
                            {Object.entries(funnelLabels).map(([key, label], index) => {
                                const value = summary.actual[key as keyof FunnelKPI];
                                const target = summary.target?.[key as keyof FunnelKPI];
                                const rate = summary.achievementRate[key as keyof FunnelKPI];
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
                                                {Object.keys(funnelLabels).map((key) => (
                                                    <td key={key} className="py-2 text-right">
                                                        {week.kpi[key as keyof FunnelKPI].toLocaleString()}
                                                    </td>
                                                ))}
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
                <GlassCard glowColor={teamConfig.color} className="p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Target className="h-5 w-5" style={{ color: teamConfig.color }} />
                        {selectedYear}年{selectedMonth}月 目標設定
                    </h2>
                    {goal && (
                        <div className="mb-4 flex items-center gap-2">
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
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(funnelLabels).map(([key, label]) => (
                            <div key={key}>
                                <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                                <input
                                    type="number"
                                    value={goalInput[key as keyof FunnelKPI]}
                                    onChange={(e) =>
                                        setGoalInput((prev) => ({
                                            ...prev,
                                            [key]: Number(e.target.value),
                                        }))
                                    }
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button
                            onClick={handleSaveGoal}
                            disabled={savingGoal}
                            className="gap-2"
                            style={{
                                background: `linear-gradient(to right, ${teamConfig.color}, #a855f7)`,
                            }}
                        >
                            {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            目標を保存（承認申請）
                        </Button>
                    </div>
                </GlassCard>
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
                            const currentValue = inputKPI[key as keyof FunnelKPI];
                            const target = summary?.target?.[key as keyof FunnelKPI] || 0;
                            const cumulative = summary?.actual[key as keyof FunnelKPI] || 0;
                            const newCumulative = cumulative + currentValue;
                            const rate = target > 0 ? Math.round((newCumulative / target) * 100) : 0;

                            return (
                                <div key={key} className="flex items-center gap-4">
                                    <div className="w-28 text-sm">{label}</div>
                                    <input
                                        type="number"
                                        value={currentValue}
                                        onChange={(e) =>
                                            setInputKPI((prev) => ({
                                                ...prev,
                                                [key]: Number(e.target.value),
                                            }))
                                        }
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
                <GlassCard glowColor={teamConfig.color} className="p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Users className="h-5 w-5" style={{ color: teamConfig.color }} />
                        メンバー一覧
                    </h2>
                    <p className="text-muted-foreground text-center py-8">
                        メンバー管理機能は次のフェーズで実装予定です
                    </p>
                </GlassCard>
            )}

            {activeTab === "alerts" && (
                <GlassCard glowColor={teamConfig.color} className="p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" style={{ color: teamConfig.color }} />
                        アラート
                    </h2>
                    <p className="text-muted-foreground text-center py-8">
                        アラート機能は次のフェーズで実装予定です
                    </p>
                </GlassCard>
            )}
        </div>
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
