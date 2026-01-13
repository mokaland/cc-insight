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
} from "lucide-react";
import { TeamId, FunnelSummary, TeamGoal, TEAM_FUNNEL_LABELS } from "@/lib/types";
import {
    getAllTeamsMonthlySummary,
    getPendingGoals,
    approveGoal,
} from "@/lib/services/kpi";

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

export default function CEODashboardPage() {
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

    const [loading, setLoading] = useState(true);
    const [summaries, setSummaries] = useState<FunnelSummary[]>([]);
    const [pendingGoals, setPendingGoals] = useState<TeamGoal[]>([]);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    // データ読み込み
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [summaryData, goalsData] = await Promise.all([
                    getAllTeamsMonthlySummary(selectedYear, selectedMonth),
                    getPendingGoals(),
                ]);
                setSummaries(summaryData);
                setPendingGoals(goalsData);
            } catch (error) {
                console.error("データ取得エラー:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedYear, selectedMonth]);

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

    // 最終コンバージョンの達成率を取得
    const getFinalConversionRate = (summary: FunnelSummary) => {
        return summary.achievementRate.finalConversion || 0;
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
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <span className="font-medium">目標承認待ち: {pendingGoals.length}件</span>
                    </div>
                </GlassCard>
            )}

            {/* チームサマリーカード */}
            <div className="grid gap-6 md:grid-cols-3">
                {summaries.map((summary) => {
                    const teamConfig = TEAM_CONFIG[summary.teamId];
                    const rate = getFinalConversionRate(summary);
                    const labels = TEAM_FUNNEL_LABELS[summary.teamId];
                    const finalLabel = labels.finalConversion;
                    const finalValue = summary.actual.finalConversion;
                    const finalTarget = summary.target?.finalConversion || 0;

                    return (
                        <div
                            key={summary.teamId}
                            onClick={() => router.push(`/team/${summary.teamId}`)}
                            className="cursor-pointer hover:scale-[1.02] transition-transform"
                        >
                            <GlassCard
                                glowColor={teamConfig.color}
                                className="p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${teamConfig.color}20` }}
                                        >
                                            {teamConfig.icon}
                                        </div>
                                        <h3 className="text-lg font-semibold">{teamConfig.name}チーム</h3>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>

                                {/* 最終コンバージョン */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">{finalLabel}</span>
                                        <span className="font-bold">
                                            {finalValue} / {finalTarget}
                                        </span>
                                    </div>
                                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${Math.min(rate, 100)}%`,
                                                background: `linear-gradient(to right, ${teamConfig.color}, ${teamConfig.color}aa)`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-end mt-1">
                                        <span
                                            className={`text-lg font-bold ${rate >= 100
                                                ? "text-green-400"
                                                : rate >= 80
                                                    ? "text-yellow-400"
                                                    : "text-red-400"
                                                }`}
                                        >
                                            {rate}%
                                        </span>
                                    </div>
                                </div>

                                {/* ファネル要約 */}
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <div className="flex justify-between">
                                        <span>LINE登録</span>
                                        <span>{summary.actual.lineRegistration.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>商談実施</span>
                                        <span>{summary.actual.consultationDone.toLocaleString()}</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    );
                })}
            </div>

            {/* 承認待ち目標一覧 */}
            {pendingGoals.length > 0 && (
                <GlassCard glowColor="#a855f7" className="p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-400" />
                        目標承認待ち
                    </h2>
                    <div className="space-y-4">
                        {pendingGoals.map((goal) => {
                            const teamConfig = TEAM_CONFIG[goal.teamId];
                            return (
                                <div
                                    key={goal.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${teamConfig.color}20` }}
                                        >
                                            {teamConfig.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium">{teamConfig.name}チーム</p>
                                            <p className="text-sm text-muted-foreground">
                                                {goal.type === "monthly"
                                                    ? `${goal.year}年${goal.month}月`
                                                    : `${goal.year}年 Q${goal.quarter}`}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleApproveGoal(goal.id)}
                                        disabled={approvingId === goal.id}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        {approvingId === goal.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Check className="h-4 w-4" />
                                        )}
                                        承認
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            )}

            {/* ファネル全体比較 */}
            <GlassCard glowColor="#8b5cf6" className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    チーム別ファネル比較
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-2 text-left">チーム</th>
                                <th className="py-2 text-right">LINE登録</th>
                                <th className="py-2 text-right">商談予約</th>
                                <th className="py-2 text-right">商談実施</th>
                                <th className="py-2 text-right">YES獲得</th>
                                <th className="py-2 text-right">最終CV</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaries.map((summary) => {
                                const teamConfig = TEAM_CONFIG[summary.teamId];
                                return (
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
                                        <td className="py-3 text-right">
                                            {summary.actual.lineRegistration.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right">
                                            {summary.actual.consultationBooking.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right">
                                            {summary.actual.consultationDone.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right">
                                            {summary.actual.yesAcquired.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right font-bold">
                                            {summary.actual.finalConversion.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
