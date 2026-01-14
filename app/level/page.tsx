"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Star, Target, Zap, Trophy, Sparkles } from "lucide-react";
import Link from "next/link";
import { getUserGuardianProfile } from "@/lib/firestore";
import {
    calculateLevel,
    getEnergyToNextLevel,
    getLevelTitle,
    MAX_LEVEL,
    ENERGY_PER_LEVEL,
} from "@/lib/guardian-collection";
import { PageLoader } from "@/components/ui/loading-spinner";

// 称号マイルストーン定義
const LEVEL_MILESTONES = [
    { level: 1, title: "ルーキー", emoji: "🌱", description: "冒険の始まり", color: "#94a3b8" },
    { level: 5, title: "見習い", emoji: "🔰", description: "少しずつ成長中", color: "#22c55e" },
    { level: 10, title: "冒険者", emoji: "⚔️", description: "本格的な冒険者", color: "#3b82f6" },
    { level: 25, title: "チャレンジャー", emoji: "🎯", description: "挑戦を恐れない", color: "#8b5cf6" },
    { level: 50, title: "ベテラン", emoji: "🛡️", description: "経験豊富な実力者", color: "#f59e0b" },
    { level: 100, title: "エキスパート", emoji: "⭐", description: "100の壁を突破", color: "#ef4444" },
    { level: 200, title: "マスター", emoji: "👑", description: "真のマスター", color: "#ec4899" },
    { level: 300, title: "英雄", emoji: "🦸", description: "伝説への道を歩む", color: "#14b8a6" },
    { level: 500, title: "伝説の勇者", emoji: "🌟", description: "伝説に名を刻む者", color: "#fbbf24" },
    { level: 999, title: "神", emoji: "✨", description: "究極の存在", color: "#a855f7" },
];

export default function LevelPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [guardianProfile, setGuardianProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
    const maxEnergy = (MAX_LEVEL - 1) * ENERGY_PER_LEVEL; // 199,800E
    const overallProgress = Math.min(100, (totalEarned / maxEnergy) * 100);

    // 現在のマイルストーンを取得
    const currentMilestone = LEVEL_MILESTONES.filter((m) => currentLevel >= m.level).pop();
    const nextMilestone = LEVEL_MILESTONES.find((m) => currentLevel < m.level);

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
                <div className="glass-card rounded-xl p-4 border-2" style={{ borderColor: `${nextMilestone.color}40` }}>
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
            )}

            {/* 全体の進捗 */}
            <div className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-white">MAXレベルへの道</span>
                    </div>
                    <span className="text-sm text-slate-400">Lv.{MAX_LEVEL}</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden mb-2">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 rounded-full"
                    />
                </div>
                <p className="text-xs text-slate-400 text-right">
                    全体の <span className="text-purple-400 font-bold">{overallProgress.toFixed(2)}%</span> 達成
                </p>
            </div>

            {/* レベルロードマップ */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    称号ロードマップ
                </h3>

                <div className="space-y-2">
                    {LEVEL_MILESTONES.map((milestone, index) => {
                        const isAchieved = currentLevel >= milestone.level;
                        const isCurrent = currentMilestone?.level === milestone.level;
                        const isNext = nextMilestone?.level === milestone.level;

                        return (
                            <motion.div
                                key={milestone.level}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isCurrent
                                        ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/50"
                                        : isAchieved
                                            ? "bg-green-500/10 border-green-500/30"
                                            : isNext
                                                ? "bg-white/5 border-white/20"
                                                : "bg-slate-800/30 border-slate-700/30 opacity-60"
                                    }`}
                            >
                                {/* マイルストーンマーカー */}
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isAchieved
                                            ? "bg-gradient-to-br"
                                            : "bg-slate-700/50"
                                        }`}
                                    style={
                                        isAchieved
                                            ? { background: `linear-gradient(135deg, ${milestone.color}40, ${milestone.color}20)`, borderColor: milestone.color, borderWidth: 2 }
                                            : {}
                                    }
                                >
                                    {isAchieved ? milestone.emoji : "🔒"}
                                </div>

                                {/* テキスト */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`font-bold ${isAchieved ? "" : "text-slate-500"}`}
                                            style={{ color: isAchieved ? milestone.color : undefined }}
                                        >
                                            {milestone.title}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                                                NOW
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400">{milestone.description}</p>
                                </div>

                                {/* レベル */}
                                <div className="text-right">
                                    <span
                                        className={`text-sm font-bold ${isAchieved ? "" : "text-slate-500"}`}
                                        style={{ color: isAchieved ? milestone.color : undefined }}
                                    >
                                        Lv.{milestone.level}
                                    </span>
                                    <p className="text-[10px] text-slate-500">
                                        {((milestone.level - 1) * ENERGY_PER_LEVEL).toLocaleString()}E
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
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
                            ボーナスエナジーがもらえます。守護神の特性も活用しよう！
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
