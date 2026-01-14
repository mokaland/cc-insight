"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Gift, Sparkles, ChevronDown, ChevronUp, Zap, AlertTriangle, X } from "lucide-react";
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
import { getTodayEnergyBreakdown, type EnergyBreakdownItem } from "@/lib/energy-history";

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
    // 内訳モーダル用
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);
    const [breakdownItems, setBreakdownItems] = useState<EnergyBreakdownItem[]>([]);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);
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

    // 内訳モーダルを表示
    const handleShowBreakdown = async () => {
        if (!user?.uid) return;
        setShowBreakdownModal(true);
        setLoadingBreakdown(true);

        try {
            const today = new Date().toISOString().split('T')[0];
            const items = await getTodayEnergyBreakdown(user.uid, today);

            // ミッション報酬も追加
            if (missionState?.totalRewardEarned && missionState.totalRewardEarned > 0) {
                items.push({
                    type: 'mission_reward',
                    label: 'ミッション達成',
                    icon: '✅',
                    amount: missionState.totalRewardEarned
                });
                items.sort((a, b) => b.amount - a.amount);
            }

            setBreakdownItems(items);
        } catch (error) {
            console.error('Failed to load breakdown:', error);
        } finally {
            setLoadingBreakdown(false);
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
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
                opacity: 1,
                y: 0,
                boxShadow: [
                    '0 0 0px rgba(168, 85, 247, 0)',
                    '0 0 20px rgba(168, 85, 247, 0.4)',
                    '0 0 0px rgba(168, 85, 247, 0)'
                ]
            }}
            transition={{
                opacity: { duration: 0.3 },
                y: { duration: 0.3 },
                boxShadow: {
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut"
                }
            }}
            className="glass-card rounded-xl overflow-hidden border border-purple-500/30"
        >
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
                            {todayEnergy > 0 && (
                                <motion.button
                                    onClick={(e) => {
                                        e.stopPropagation(); // アコーディオン開閉を防ぐ
                                        handleShowBreakdown();
                                    }}
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
                                    className="text-sm font-bold text-yellow-400 px-2 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/40 cursor-pointer hover:bg-yellow-400/30 active:scale-95 transition-all"
                                    style={{
                                        textShadow: '0 0 10px rgba(250, 204, 21, 0.5)',
                                        boxShadow: '0 0 15px rgba(250, 204, 21, 0.3)'
                                    }}
                                >
                                    +{todayEnergy}E
                                </motion.button>
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

            {/* 内訳モーダル */}
            <AnimatePresence>
                {showBreakdownModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowBreakdownModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900/95 border border-yellow-500/30 rounded-2xl p-5 mx-4 max-w-sm w-full shadow-[0_0_30px_rgba(250,204,21,0.2)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* ヘッダー */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="text-2xl">📊</span>
                                    今日の獲得エナジー
                                </h3>
                                <button
                                    onClick={() => setShowBreakdownModal(false)}
                                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* 内訳リスト */}
                            {loadingBreakdown ? (
                                <div className="py-8 text-center text-slate-400">
                                    読み込み中...
                                </div>
                            ) : breakdownItems.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    まだ獲得がありません
                                </div>
                            ) : (
                                <div className="space-y-2 mb-4">
                                    {breakdownItems.map((item, index) => (
                                        <div
                                            key={`${item.type}-${index}`}
                                            className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{item.icon}</span>
                                                <span className="text-sm text-slate-300">{item.label}</span>
                                            </div>
                                            <span className="text-sm font-bold text-yellow-400">
                                                +{item.amount}E
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 合計 */}
                            <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                                <span className="text-sm text-slate-400">合計</span>
                                <span className="text-xl font-bold text-yellow-400 glow-text">
                                    +{todayEnergy}E
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
