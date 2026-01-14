"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Gift, Sparkles, ChevronDown, ChevronUp, Zap, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
    getTodayMissions,
    claimMissionReward,
    claimAllCompletedBonus,
} from "@/lib/services/mission";
import {
    DailyMissionState,
    DEFAULT_DAILY_MISSIONS,
    ALL_COMPLETE_BONUS,
} from "@/lib/types/mission";
import { playSound, vibrate } from "@/lib/sound-service";

interface DailyMissionsProps {
    onRewardClaimed?: (reward: number) => void;
    todayReported?: boolean;
    todayEnergy?: number;
    isFirstDay?: boolean;
}

export function DailyMissions({
    onRewardClaimed,
    todayReported = false,
    todayEnergy = 0,
    isFirstDay = false,
}: DailyMissionsProps) {
    const { user } = useAuth();
    const [missionState, setMissionState] = useState<DailyMissionState | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false); // デフォルト折りたたみ
    const [claimingId, setClaimingId] = useState<string | null>(null);

    // ミッション状態を取得
    const loadMissions = useCallback(async () => {
        if (!user?.uid) return;

        try {
            const state = await getTodayMissions(user.uid);
            setMissionState(state);
        } catch (error) {
            console.error("Failed to load missions:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadMissions();
    }, [loadMissions]);

    // 報酬を受け取る
    const handleClaimReward = async (missionId: string) => {
        if (!user?.uid || claimingId) return;

        setClaimingId(missionId);
        try {
            const result = await claimMissionReward(user.uid, missionId);
            if (result.success) {
                playSound("energy_gain");
                vibrate("success");
                onRewardClaimed?.(result.reward);
                await loadMissions();
            }
        } catch (error) {
            console.error("Failed to claim reward:", error);
        } finally {
            setClaimingId(null);
        }
    };

    // 全完了ボーナスを受け取る
    const handleClaimBonus = async () => {
        if (!user?.uid || claimingId) return;

        setClaimingId("bonus");
        try {
            const result = await claimAllCompletedBonus(user.uid);
            if (result.success) {
                playSound("legendary_drop");
                vibrate("legendary_drop");
                onRewardClaimed?.(result.reward);
                await loadMissions();
            }
        } catch (error) {
            console.error("Failed to claim bonus:", error);
        } finally {
            setClaimingId(null);
        }
    };

    if (loading) {
        return (
            <div className="glass-card rounded-xl p-4 animate-pulse">
                <div className="h-6 bg-slate-700/50 rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 bg-slate-700/50 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!missionState) return null;

    const completedCount = missionState.missions.filter((m) => m.completed).length;
    const totalCount = missionState.missions.length;
    const progress = (completedCount / totalCount) * 100;

    return (
        <div className="glass-card rounded-xl overflow-hidden">
            {/* ヘッダー（報告ステータス統合） */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${todayReported
                        ? "bg-gradient-to-br from-green-500 to-emerald-500"
                        : "bg-gradient-to-br from-purple-500 to-pink-500"
                        }`}>
                        {todayReported ? (
                            <Check className="w-5 h-5 text-white" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-white" />
                        )}
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white">デイリーミッション</h3>
                            {todayReported && todayEnergy > 0 && (
                                <motion.span
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        opacity: 1,
                                    }}
                                    transition={{
                                        scale: {
                                            repeat: Infinity,
                                            repeatType: "reverse",
                                            duration: 1.5,
                                            ease: "easeInOut"
                                        },
                                        opacity: { duration: 0.3 }
                                    }}
                                    className="text-sm font-bold text-yellow-400 px-2 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/40"
                                    style={{
                                        textShadow: '0 0 10px rgba(250, 204, 21, 0.5)',
                                        boxShadow: '0 0 15px rgba(250, 204, 21, 0.3)'
                                    }}
                                >
                                    +{todayEnergy}E
                                </motion.span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">
                            {completedCount}/{totalCount} 完了
                            {!todayReported && !isFirstDay && (
                                <span className="text-red-400 ml-2">• 報告まだ</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* プログレスリング */}
                    <div className="relative w-10 h-10">
                        <svg className="w-10 h-10 -rotate-90">
                            <circle
                                cx="20"
                                cy="20"
                                r="16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="text-slate-700"
                            />
                            <circle
                                cx="20"
                                cy="20"
                                r="16"
                                fill="none"
                                stroke="url(#progressGradient)"
                                strokeWidth="4"
                                strokeDasharray={`${progress} 100`}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                            {Math.round(progress)}%
                        </span>
                    </div>
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </div>
            </button>

            {/* ミッションリスト */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-4 pb-4 space-y-2">
                            {missionState.missions.map((userMission) => {
                                const def = DEFAULT_DAILY_MISSIONS.find(
                                    (m) => m.id === userMission.missionId
                                );
                                if (!def) return null;

                                const canClaim = userMission.completed && !userMission.claimed;
                                const isClaiming = claimingId === userMission.missionId;

                                return (
                                    <motion.div
                                        key={userMission.missionId}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${userMission.completed
                                            ? "bg-green-500/10 border border-green-500/30"
                                            : "bg-slate-800/50 border border-slate-700/50"
                                            }`}
                                        layout
                                    >
                                        {/* アイコン */}
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${userMission.completed
                                                ? "bg-green-500/20"
                                                : "bg-slate-700/50"
                                                }`}
                                        >
                                            {userMission.completed ? (
                                                <Check className="w-5 h-5 text-green-400" />
                                            ) : (
                                                def.icon
                                            )}
                                        </div>

                                        {/* テキスト */}
                                        <div className="flex-1">
                                            <p
                                                className={`font-medium text-sm ${userMission.completed ? "text-green-400" : "text-white"
                                                    }`}
                                            >
                                                {def.title}
                                            </p>
                                            <p className="text-xs text-slate-400">{def.description}</p>
                                        </div>

                                        {/* 報酬 / ボタン */}
                                        {canClaim ? (
                                            <button
                                                onClick={() => handleClaimReward(userMission.missionId)}
                                                disabled={isClaiming}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full text-white text-xs font-bold hover:from-yellow-400 hover:to-amber-400 transition-colors disabled:opacity-50"
                                            >
                                                {isClaiming ? (
                                                    <span className="animate-spin">⏳</span>
                                                ) : (
                                                    <>
                                                        <Gift className="w-3 h-3" />
                                                        +{def.reward}E
                                                    </>
                                                )}
                                            </button>
                                        ) : userMission.claimed ? (
                                            <span className="text-xs text-green-400 font-medium">
                                                獲得済み
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                <Zap className="w-3 h-3" />
                                                +{def.reward}E
                                            </span>
                                        )}
                                    </motion.div>
                                );
                            })}

                            {/* 全完了ボーナス */}
                            {missionState.allCompleted && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`flex items-center gap-3 p-3 rounded-lg ${missionState.bonusClaimed
                                        ? "bg-amber-500/10 border border-amber-500/30"
                                        : "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-amber-500/50"
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center">
                                        <Gift className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-amber-400 text-sm">
                                            🎉 全ミッション完了ボーナス！
                                        </p>
                                        <p className="text-xs text-amber-300/70">
                                            おめでとうございます！
                                        </p>
                                    </div>
                                    {!missionState.bonusClaimed ? (
                                        <button
                                            onClick={handleClaimBonus}
                                            disabled={claimingId === "bonus"}
                                            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full text-white text-sm font-bold hover:from-amber-400 hover:to-yellow-400 transition-colors disabled:opacity-50 animate-pulse"
                                        >
                                            {claimingId === "bonus" ? (
                                                <span className="animate-spin">⏳</span>
                                            ) : (
                                                <>
                                                    <Gift className="w-4 h-4" />
                                                    +{ALL_COMPLETE_BONUS}E
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <span className="text-sm text-amber-400 font-medium">
                                            獲得済み ✓
                                        </span>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
