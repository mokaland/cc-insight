"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Target, Zap, Trophy, Sparkles, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { getUserGuardianProfile } from "@/lib/firestore";
import {
    calculateLevel,
    getEnergyToNextLevel,
    getLevelTitle,
    MAX_LEVEL,
    ENERGY_PER_LEVEL,
} from "@/lib/guardian-collection";
import {
    MILESTONE_DEFINITIONS,
    getMilestoneByLevel,
    getNextMilestone,
} from "@/lib/level-milestones";
import { PageLoader } from "@/components/ui/loading-spinner";

export default function LevelPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [guardianProfile, setGuardianProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const currentMilestoneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadData() {
            if (!user?.uid) return;
            try {
                const profile = await getUserGuardianProfile(user.uid);
                setGuardianProfile(profile);
            } catch (error) {
                console.error("Failed to load guardian profile:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user?.uid]);

    // 現在のマイルストーンにスクロール
    useEffect(() => {
        if (!loading && currentMilestoneRef.current) {
            setTimeout(() => {
                currentMilestoneRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 500);
        }
    }, [loading]);

    if (authLoading || loading) {
        return <PageLoader text="レベル情報を読み込み中..." />;
    }

    if (!user || !guardianProfile) {
        router.push("/login");
        return null;
    }

    const totalEarned = guardianProfile?.energy?.totalEarned || 0;
    const currentLevel = calculateLevel(totalEarned);
    const levelProgress = getEnergyToNextLevel(totalEarned);
    const currentTitle = getLevelTitle(currentLevel);

    // 全体の進捗率を計算（レベル999まで）
    const maxEnergy = (MAX_LEVEL - 1) * ENERGY_PER_LEVEL;
    const overallProgress = Math.min(100, (totalEarned / maxEnergy) * 100);

    // 現在と次のマイルストーン
    const currentMilestone = getMilestoneByLevel(currentLevel);
    const nextMilestone = getNextMilestone(currentLevel);

    return (
        <div className="space-y-6 pb-24">
            {/* ヘッダー */}
            <div className="flex items-center gap-3">
                <Link href="/mypage">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                        レベルジャーニー
                    </h1>
                    <p className="text-xs text-slate-400">あなたの冒険の軌跡</p>
                </div>
            </div>

            {/* 現在レベル - ヒーローセクション */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-gradient-to-br from-yellow-500/20 via-amber-500/15 to-orange-500/20 border border-yellow-500/40 rounded-2xl p-6 overflow-hidden"
            >
                {/* 背景エフェクト */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 mb-4"
                        style={{ boxShadow: "0 0 40px rgba(251, 191, 36, 0.5)" }}
                    >
                        <span className="text-4xl font-black text-white">{currentLevel}</span>
                    </motion.div>

                    <h2 className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 bg-clip-text text-transparent mb-1">
                        Lv.{currentLevel}
                    </h2>
                    <p className="text-lg font-bold text-purple-400 mb-4">
                        {currentMilestone?.emoji} {currentTitle}
                    </p>

                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span>累計獲得: <span className="text-yellow-400 font-bold">{totalEarned.toLocaleString()}E</span></span>
                    </div>
                </div>
            </motion.div>

            {/* 次のレベルまで */}
            {levelProgress && (
                <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-medium text-white">次のレベルまで</span>
                        </div>
                        <span className="text-sm text-slate-400">Lv.{currentLevel + 1}</span>
                    </div>
                    <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden mb-2">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${levelProgress.progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        />
                    </div>
                    <p className="text-xs text-slate-400 text-right">
                        あと <span className="text-cyan-400 font-bold">{levelProgress.remaining}E</span>
                    </p>
                </div>
            )}

            {/* 次のマイルストーンまで */}
            {nextMilestone && (
                <Link href={`/level/${nextMilestone.id}`}>
                    <div
                        className="glass-card rounded-xl p-4 border-2 cursor-pointer hover:bg-white/5 transition-all"
                        style={{ borderColor: `${nextMilestone.color}40` }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4" style={{ color: nextMilestone.color }} />
                                <span className="text-sm font-medium text-white">次の称号まで</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-lg">{nextMilestone.emoji}</span>
                                <span className="text-sm font-bold" style={{ color: nextMilestone.color }}>
                                    {nextMilestone.title}
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden mb-2">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${Math.min(100, (currentLevel / nextMilestone.level) * 100)}%`,
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${nextMilestone.color}80, ${nextMilestone.color})` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 text-right">
                            あと <span className="font-bold" style={{ color: nextMilestone.color }}>
                                {nextMilestone.level - currentLevel}レベル
                            </span>（{((nextMilestone.level - currentLevel) * ENERGY_PER_LEVEL).toLocaleString()}E）
                        </p>
                    </div>
                </Link>
            )}

            {/* 全体の進捗 - ビジュアルマップ */}
            <div className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-white">冒険の地図</span>
                    </div>
                    <span className="text-xs text-slate-400">Lv.{MAX_LEVEL}まで {overallProgress.toFixed(1)}%</span>
                </div>

                {/* ビジュアルマップ */}
                <div className="relative">
                    {/* 道 */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-500 via-purple-500 to-slate-700" />

                    <div className="space-y-0">
                        {MILESTONE_DEFINITIONS.map((milestone, index) => {
                            const isAchieved = currentLevel >= milestone.level;
                            const isCurrent = currentMilestone?.id === milestone.id;
                            const isNext = nextMilestone?.id === milestone.id;

                            return (
                                <Link key={milestone.id} href={`/level/${milestone.id}`}>
                                    <motion.div
                                        ref={isCurrent ? currentMilestoneRef : null}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`relative flex items-center gap-3 py-3 px-2 rounded-lg cursor-pointer transition-all hover:bg-white/5 ${isCurrent ? "bg-gradient-to-r from-yellow-500/15 to-transparent" : ""
                                            }`}
                                    >
                                        {/* マーカー */}
                                        <div className="relative z-10">
                                            {isCurrent ? (
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${milestone.color}, ${milestone.color}80)`,
                                                        boxShadow: `0 0 20px ${milestone.color}60`,
                                                    }}
                                                >
                                                    <MapPin className="w-5 h-5 text-white" />
                                                </motion.div>
                                            ) : (
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${isAchieved
                                                            ? ""
                                                            : "bg-slate-800 border-slate-600"
                                                        }`}
                                                    style={
                                                        isAchieved
                                                            ? {
                                                                background: `linear-gradient(135deg, ${milestone.color}30, ${milestone.color}10)`,
                                                                borderColor: milestone.color,
                                                            }
                                                            : {}
                                                    }
                                                >
                                                    {isAchieved ? milestone.emoji : "🔒"}
                                                </div>
                                            )}
                                        </div>

                                        {/* コンテンツ */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`font-bold text-sm truncate ${isAchieved ? "" : "text-slate-500"
                                                        }`}
                                                    style={{ color: isAchieved ? milestone.color : undefined }}
                                                >
                                                    {milestone.title}
                                                </span>
                                                {isCurrent && (
                                                    <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                                                        現在地
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 truncate">{milestone.theme}</p>
                                        </div>

                                        {/* レベル */}
                                        <div className="flex items-center gap-1">
                                            <span
                                                className={`text-xs font-bold ${isAchieved ? "" : "text-slate-500"}`}
                                                style={{ color: isAchieved ? milestone.color : undefined }}
                                            >
                                                {milestone.levelRange}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                        </div>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 豆知識 */}
            <div className="glass-card rounded-xl p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div>
                        <p className="font-bold text-purple-400 mb-1">レベルアップのコツ</p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            毎日の日報報告でエナジーを獲得！ストリーク（連続報告）を維持すると
                            ボーナスエナジーがもらえます。各称号をタップして詳細を確認しよう！
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
