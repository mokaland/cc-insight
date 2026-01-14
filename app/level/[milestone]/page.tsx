"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Zap, Star, Check, Lock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getUserGuardianProfile } from "@/lib/firestore";
import { calculateLevel } from "@/lib/guardian-collection";
import {
    getMilestoneById,
    getMilestoneByLevel,
    getNextMilestone,
    MILESTONE_DEFINITIONS,
    SKILL_CATEGORIES,
    MilestoneDefinition,
} from "@/lib/level-milestones";
import { PageLoader } from "@/components/ui/loading-spinner";

export default function MilestoneDetailPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const milestoneId = params.milestone as string;

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
        return <PageLoader text="読み込み中..." />;
    }

    if (!user) {
        router.push("/login");
        return null;
    }

    const milestone = getMilestoneById(milestoneId);
    if (!milestone) {
        router.push("/level");
        return null;
    }

    const totalEarned = guardianProfile?.energy?.totalEarned || 0;
    const currentLevel = calculateLevel(totalEarned);
    const isAchieved = currentLevel >= milestone.level;
    const isCurrent = getMilestoneByLevel(currentLevel)?.id === milestone.id;

    // 前後のマイルストーン
    const currentIndex = MILESTONE_DEFINITIONS.findIndex((m) => m.id === milestone.id);
    const prevMilestone = currentIndex > 0 ? MILESTONE_DEFINITIONS[currentIndex - 1] : null;
    const nextMilestone = currentIndex < MILESTONE_DEFINITIONS.length - 1 ? MILESTONE_DEFINITIONS[currentIndex + 1] : null;

    return (
        <div className="space-y-6 pb-24">
            {/* ヘッダー */}
            <div className="flex items-center gap-3">
                <Link href="/level">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold" style={{ color: milestone.color }}>
                        {milestone.emoji} {milestone.title}
                    </h1>
                    <p className="text-xs text-slate-400">{milestone.levelRange}</p>
                </div>
            </div>

            {/* ヒーローセクション */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl p-6 overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${milestone.color}20, ${milestone.color}05)`,
                    borderColor: `${milestone.color}40`,
                    borderWidth: 1,
                }}
            >
                {/* 背景エフェクト */}
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl"
                        style={{ background: `${milestone.color}10` }}
                    />
                </div>

                <div className="relative">
                    {/* ステータスバッジ */}
                    <div className="flex justify-between items-start mb-4">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                            style={{
                                background: `linear-gradient(135deg, ${milestone.color}30, ${milestone.color}10)`,
                                border: `2px solid ${milestone.color}60`,
                            }}
                        >
                            {milestone.emoji}
                        </motion.div>

                        {isCurrent ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                                ✨ 現在の称号
                            </span>
                        ) : isAchieved ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/40">
                                ✓ 達成済み
                            </span>
                        ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/40">
                                🔒 未解放
                            </span>
                        )}
                    </div>

                    {/* テーマ */}
                    <h2 className="text-2xl font-black mb-2" style={{ color: milestone.color }}>
                        {milestone.theme}
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        {milestone.description}
                    </p>
                </div>
            </motion.div>

            {/* 到達期間の目安 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-xl p-4"
            >
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-white">到達期間の目安</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-slate-400 mb-1">物販チーム（毎日報告）</p>
                        <p className="text-sm font-bold text-cyan-400">{milestone.timeline.daily}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-slate-400 mb-1">退職・副業チーム（週1報告）</p>
                        <p className="text-sm font-bold text-purple-400">{milestone.timeline.weekly}</p>
                    </div>
                </div>
            </motion.div>

            {/* この段階で身につくスキル */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
            >
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <h3 className="font-bold text-white">この段階で身につくスキル</h3>
                </div>

                <div className="space-y-2">
                    {milestone.skills.map((skill, index) => {
                        const category = SKILL_CATEGORIES[skill.category];
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + index * 0.05 }}
                                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm">{category.emoji}</span>
                                    <span
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                        style={{ background: `${category.color}20`, color: category.color }}
                                    >
                                        {category.label}
                                    </span>
                                </div>
                                <p className="font-bold text-white text-sm mb-0.5">{skill.name}</p>
                                <p className="text-xs text-slate-400">{skill.description}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* この段階のあなた */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card rounded-xl p-4"
                style={{
                    background: `linear-gradient(135deg, ${milestone.color}10, transparent)`,
                    borderColor: `${milestone.color}30`,
                }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4" style={{ color: milestone.color }} />
                    <h3 className="font-bold text-white">この段階のあなた</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                    {milestone.mindset}
                </p>
            </motion.div>

            {/* モチベーショナルメッセージ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4"
            >
                <p className="text-center text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {milestone.motivationalMessage}
                </p>
            </motion.div>

            {/* 次のマイルストーンへ */}
            {milestone.nextHint && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💡</span>
                        <h3 className="font-bold text-green-400">次のステップ</h3>
                    </div>
                    <p className="text-sm text-slate-300">{milestone.nextHint}</p>
                </motion.div>
            )}

            {/* ナビゲーション */}
            <div className="flex gap-3">
                {prevMilestone && (
                    <Link href={`/level/${prevMilestone.id}`} className="flex-1">
                        <div className="glass-card rounded-lg p-3 hover:bg-white/5 transition-colors">
                            <p className="text-[10px] text-slate-400 mb-1">← 前の称号</p>
                            <p className="text-sm font-bold" style={{ color: prevMilestone.color }}>
                                {prevMilestone.emoji} {prevMilestone.title}
                            </p>
                        </div>
                    </Link>
                )}
                {nextMilestone && (
                    <Link href={`/level/${nextMilestone.id}`} className="flex-1">
                        <div className="glass-card rounded-lg p-3 hover:bg-white/5 transition-colors text-right">
                            <p className="text-[10px] text-slate-400 mb-1">次の称号 →</p>
                            <p className="text-sm font-bold" style={{ color: nextMilestone.color }}>
                                {nextMilestone.emoji} {nextMilestone.title}
                            </p>
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
}
