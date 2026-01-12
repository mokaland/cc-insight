"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/glass-card";
import { getUserGuardianProfile } from "@/lib/firestore";
import {
    GUARDIANS,
    GuardianId,
    UserGuardianProfile,
    ATTRIBUTES,
    getGuardianImagePath,
    calculateLevel,
    getLevelTitle,
} from "@/lib/guardian-collection";
import { Target, Trophy, Zap, TrendingUp, Calendar, Sparkles, Check, ArrowRight, Flame } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { PageLoader } from "@/components/ui/loading-spinner";

// 月間目標のテンプレート
const GOAL_TEMPLATES = {
    energy: [
        { label: '初心者', target: 500, description: '毎週1回報告を続けよう' },
        { label: '習慣化', target: 1500, description: '毎日の報告を習慣に' },
        { label: 'アクティブ', target: 3000, description: 'パフォーマンス報告も意識' },
        { label: 'パワーユーザー', target: 5000, description: '全力で活動！' },
    ],
    streak: [
        { label: '1週間継続', target: 7, description: '7日間連続報告' },
        { label: '2週間継続', target: 14, description: '14日間連続報告' },
        { label: '1ヶ月継続', target: 30, description: '30日間連続報告' },
    ],
    evolution: [
        { label: '成長体到達', target: 2, description: 'Stage 2に進化' },
        { label: '成熟体到達', target: 3, description: 'Stage 3に進化' },
        { label: '究極体到達', target: 4, description: '最終形態に！' },
    ]
};

// 守護神からの応援メッセージ
function getGuardianMessage(progress: number, guardianId?: GuardianId): string {
    const guardian = guardianId ? GUARDIANS[guardianId] : null;
    const guardianName = guardian?.name || '守護神';

    if (progress >= 100) {
        return `🎉 素晴らしい！${guardianName}は誇りに思っている！`;
    } else if (progress >= 75) {
        return `✨ ゴールはもうすぐそこだ！${guardianName}が応援している！`;
    } else if (progress >= 50) {
        return `🔥 折り返し地点を過ぎた！この調子だ！`;
    } else if (progress >= 25) {
        return `💪 順調な滑り出し！${guardianName}が見守っている`;
    } else if (progress > 0) {
        return `🌱 始まりは小さくても大きく育つ！一緒に頑張ろう`;
    } else {
        return `⏳ 目標に向けて最初の一歩を踏み出そう！`;
    }
}

export default function GoalsPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<UserGuardianProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // 月の情報
    const currentMonth = useMemo(() => {
        const now = new Date();
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
            daysPassed: now.getDate(),
            daysRemaining: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate(),
        };
    }, []);

    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                const guardianProfile = await getUserGuardianProfile(user.uid);
                setProfile(guardianProfile);
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    if (authLoading || loading) {
        return <PageLoader />;
    }

    if (!user || !userProfile) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <p className="text-slate-400">ログインが必要です</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <p className="text-slate-400">プロファイルを読み込み中...</p>
            </div>
        );
    }

    // 現在の進捗を計算
    const totalEarned = profile.energy.totalEarned || 0;
    const currentLevel = calculateLevel(totalEarned);
    const currentStreak = profile.streak.current || 0;
    const activeGuardianId = profile.activeGuardianId as GuardianId | undefined;
    const activeGuardian = activeGuardianId ? GUARDIANS[activeGuardianId] : null;
    const activeInstance = activeGuardianId ? profile.guardians[activeGuardianId] : null;
    const currentStage = activeInstance?.stage || 0;
    const attr = activeGuardian ? ATTRIBUTES[activeGuardian.attribute] : null;

    // 今月の目標（デフォルト設定）
    const monthlyEnergyGoal = 1500; // デフォルト目標
    const energyProgress = Math.min(100, Math.round((totalEarned / monthlyEnergyGoal) * 100));
    const streakGoal = 30;
    const streakProgress = Math.min(100, Math.round((currentStreak / streakGoal) * 100));
    const evolutionGoal = 4;
    const evolutionProgress = Math.min(100, Math.round((currentStage / evolutionGoal) * 100));

    // 総合進捗
    const overallProgress = Math.round((energyProgress + streakProgress + evolutionProgress) / 3);
    const guardianMessage = getGuardianMessage(overallProgress, activeGuardianId);

    return (
        <div className="space-y-4 md:space-y-6 md:pb-8">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                        今月の目標
                    </h1>
                    <p className="text-sm text-slate-400">
                        {currentMonth.year}年{currentMonth.month}月 （残り{currentMonth.daysRemaining}日）
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-yellow-400" />
                    <span className="text-lg font-bold text-yellow-400">{currentMonth.month}月</span>
                </div>
            </div>

            {/* 守護神からのメッセージ */}
            {activeGuardian && attr && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-4 border"
                    style={{
                        backgroundColor: `${attr.color}10`,
                        borderColor: `${attr.color}40`
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                            style={{ border: `2px solid ${attr.color}` }}
                        >
                            <Image
                                src={getGuardianImagePath(activeGuardianId!, currentStage)}
                                alt={activeGuardian.name}
                                width={48}
                                height={48}
                                className="object-contain"
                            />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">{activeGuardian.name}より</p>
                            <p className="text-sm font-medium text-white">{guardianMessage}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* 総合進捗 */}
            <GlassCard className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-lg font-bold text-white">総合進捗</h2>
                    <span className="ml-auto text-2xl font-bold text-yellow-400">{overallProgress}%</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                    />
                </div>
            </GlassCard>

            {/* 個別目標カード */}
            <div className="space-y-3">
                {/* エナジー目標 */}
                <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-bold text-white">エナジー獲得</h3>
                        <span className="ml-auto text-sm text-slate-400">
                            {totalEarned >= 1000 ? `${(totalEarned / 1000).toFixed(1)}k` : totalEarned} / {monthlyEnergyGoal}E
                        </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${energyProgress}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{energyProgress}% 達成</span>
                        {energyProgress >= 100 ? (
                            <span className="text-green-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> 目標達成！
                            </span>
                        ) : (
                            <span>残り {monthlyEnergyGoal - totalEarned}E</span>
                        )}
                    </div>
                </GlassCard>

                {/* ストリーク目標 */}
                <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <h3 className="font-bold text-white">連続報告</h3>
                        <span className="ml-auto text-sm text-slate-400">
                            {currentStreak} / {streakGoal}日
                        </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${streakProgress}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{streakProgress}% 達成</span>
                        {streakProgress >= 100 ? (
                            <span className="text-green-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> 目標達成！
                            </span>
                        ) : (
                            <span>残り {streakGoal - currentStreak}日</span>
                        )}
                    </div>
                </GlassCard>

                {/* 進化目標 */}
                <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <h3 className="font-bold text-white">守護神進化</h3>
                        <span className="ml-auto text-sm text-slate-400">
                            Stage {currentStage} / {evolutionGoal}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${evolutionProgress}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{evolutionProgress}% 達成</span>
                        {evolutionProgress >= 100 ? (
                            <span className="text-green-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> 究極体到達！
                            </span>
                        ) : (
                            <span>次の進化まで {4 - currentStage} ステージ</span>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* 報告へのCTA */}
            <Link href="/report">
                <GlassCard className="p-4 hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-white">今日の報告で目標に近づこう</p>
                                <p className="text-xs text-slate-400">報告するとエナジーを獲得できます</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                    </div>
                </GlassCard>
            </Link>
        </div>
    );
}
