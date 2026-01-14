"use client";

import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Zap } from "lucide-react";
import { playSound, vibrate, getSoundService } from "@/lib/sound-service";

interface PackOpeningModalProps {
    isOpen: boolean;
    onComplete: (earnedEnergy: number) => void;
    earnedEnergy: number;
    rarity?: "common" | "rare" | "epic" | "legendary";
    teamColor?: string;
}

/**
 * ポケポケ風パック開封演出
 * - スワイプで開封
 * - レア度に応じたエフェクト
 * - バイブレーション連動
 */
export function PackOpeningModal({
    isOpen,
    onComplete,
    earnedEnergy,
    rarity = "common",
    teamColor = "#ec4899",
}: PackOpeningModalProps) {
    const [phase, setPhase] = useState<"idle" | "opening" | "reveal">("idle");
    const [swipeProgress, setSwipeProgress] = useState(0);
    const scrollYRef = useRef(0);

    // レア度に応じた色設定
    const rarityColors = {
        common: { primary: "#60a5fa", glow: "#3b82f6" },      // 青
        rare: { primary: "#a78bfa", glow: "#8b5cf6" },        // 紫
        epic: { primary: "#f472b6", glow: "#ec4899" },        // ピンク
        legendary: { primary: "#fbbf24", glow: "#f59e0b" },   // ゴールド
    };

    const colors = rarityColors[rarity];

    // スワイプ開封のしきい値
    const SWIPE_THRESHOLD = 150;

    // PWA対応: 背景スクロール防止
    useEffect(() => {
        if (isOpen) {
            scrollYRef.current = window.scrollY;
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollYRef.current}px`;
            document.body.style.width = "100%";
            document.body.style.overflow = "hidden";

            return () => {
                document.body.style.position = "";
                document.body.style.top = "";
                document.body.style.width = "";
                document.body.style.overflow = "";
                window.scrollTo(0, scrollYRef.current);
            };
        }
    }, [isOpen]);

    // フェーズリセット & サウンド初期化
    useEffect(() => {
        if (isOpen) {
            setPhase("idle");
            setSwipeProgress(0);
            // ユーザー操作後なのでAudioContext初期化
            getSoundService().initialize();
        }
    }, [isOpen]);

    // スワイプハンドラ
    const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const progress = Math.min(Math.abs(info.offset.y) / SWIPE_THRESHOLD, 1);
        setSwipeProgress(progress);

        // スワイプ中のバイブレーション
        if (progress > 0.3 && progress < 0.7) {
            vibrate(10);
        }
    }, []);

    const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (Math.abs(info.offset.y) > SWIPE_THRESHOLD) {
            // 開封成功！
            setPhase("opening");

            // 🔊 開封サウンド
            playSound("pack_open");

            // 開封時の強いバイブレーション
            if (rarity === "legendary") {
                vibrate("legendary_drop");
            } else if (rarity === "epic") {
                vibrate("rare_drop");
            } else {
                vibrate("pack_open");
            }

            // 開封アニメーション後にリザルト表示
            setTimeout(() => {
                setPhase("reveal");
                // 🔊 リビールサウンド
                if (rarity === "legendary") {
                    playSound("legendary_drop");
                } else if (rarity === "epic" || rarity === "rare") {
                    playSound("rare_drop");
                } else {
                    playSound("pack_reveal");
                }
                // 🔊 エナジー獲得サウンド
                setTimeout(() => playSound("energy_gain"), 300);
            }, 800);

            // リザルト表示後に完了
            setTimeout(() => {
                onComplete(earnedEnergy);
            }, 2500);
        } else {
            // スワイプ不十分でリセット
            setSwipeProgress(0);
        }
    }, [rarity, onComplete, earnedEnergy]);

    // タップで開封（スワイプが難しい場合のフォールバック）
    const handleTapOpen = useCallback(() => {
        if (phase === "idle") {
            setPhase("opening");

            // 🔊 開封サウンド & バイブレーション
            playSound("pack_open");
            vibrate("pack_open");

            setTimeout(() => {
                setPhase("reveal");
                playSound("pack_reveal");
                setTimeout(() => playSound("energy_gain"), 300);
            }, 800);

            setTimeout(() => {
                onComplete(earnedEnergy);
            }, 2500);
        }
    }, [phase, onComplete, earnedEnergy]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 背景オーバーレイ */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9998] bg-black/90"
                        style={{
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                    />

                    {/* メインコンテナ */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4"
                    >
                        {/* Phase: idle - パック表示 */}
                        {phase === "idle" && (
                            <>
                                {/* インストラクション */}
                                <motion.p
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white/80 text-sm mb-8"
                                >
                                    ↕️ スワイプしてパックを開封
                                </motion.p>

                                {/* パックカード */}
                                <motion.div
                                    drag="y"
                                    dragConstraints={{ top: 0, bottom: 0 }}
                                    dragElastic={0.5}
                                    onDrag={handleDrag}
                                    onDragEnd={handleDragEnd}
                                    onTap={handleTapOpen}
                                    whileTap={{ scale: 0.98 }}
                                    className="relative cursor-grab active:cursor-grabbing"
                                    style={{
                                        filter: `drop-shadow(0 0 ${30 + swipeProgress * 50}px ${colors.glow})`,
                                    }}
                                >
                                    {/* パック本体 */}
                                    <motion.div
                                        className="relative w-64 h-96 rounded-2xl overflow-hidden"
                                        style={{
                                            background: `linear-gradient(145deg, ${colors.primary}40, ${colors.glow}60)`,
                                            border: `3px solid ${colors.primary}`,
                                            boxShadow: `
                        0 0 40px ${colors.glow}40,
                        inset 0 0 60px ${colors.glow}20
                      `,
                                        }}
                                        animate={{
                                            rotateY: swipeProgress * 15,
                                            rotateX: swipeProgress * 5,
                                        }}
                                    >
                                        {/* パック模様 */}
                                        <div className="absolute inset-0 opacity-20">
                                            <div className="absolute inset-0"
                                                style={{
                                                    backgroundImage: `repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 10px,
                            ${colors.primary}30 10px,
                            ${colors.primary}30 20px
                          )`,
                                                }}
                                            />
                                        </div>

                                        {/* 中央ロゴ */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.1, 1],
                                                    rotate: [0, 5, -5, 0],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                }}
                                            >
                                                <Zap
                                                    className="w-24 h-24"
                                                    style={{ color: colors.primary }}
                                                    fill={colors.glow}
                                                />
                                            </motion.div>

                                            <p className="mt-4 text-2xl font-bold text-white/90">
                                                ENERGY PACK
                                            </p>

                                            {rarity !== "common" && (
                                                <motion.p
                                                    className="mt-2 text-sm font-bold uppercase tracking-wider"
                                                    style={{ color: colors.primary }}
                                                    animate={{ opacity: [0.6, 1, 0.6] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                >
                                                    {rarity === "legendary" ? "★ LEGENDARY ★" :
                                                        rarity === "epic" ? "✦ EPIC ✦" : "◆ RARE ◆"}
                                                </motion.p>
                                            )}
                                        </div>

                                        {/* 開封線のヒント */}
                                        <motion.div
                                            className="absolute top-0 left-0 right-0 h-1"
                                            style={{ backgroundColor: colors.primary }}
                                            animate={{
                                                opacity: [0.5, 1, 0.5],
                                                scaleX: [0.8, 1, 0.8],
                                            }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        />

                                        {/* スワイプ進捗インジケーター */}
                                        {swipeProgress > 0 && (
                                            <motion.div
                                                className="absolute top-2 left-1/2 -translate-x-1/2"
                                                style={{
                                                    width: `${swipeProgress * 100}%`,
                                                    height: 4,
                                                    backgroundColor: colors.primary,
                                                    borderRadius: 2,
                                                }}
                                            />
                                        )}
                                    </motion.div>

                                    {/* レジェンダリーのオーラ */}
                                    {rarity === "legendary" && (
                                        <motion.div
                                            className="absolute inset-0 rounded-2xl -z-10"
                                            style={{
                                                background: `radial-gradient(circle, ${colors.glow}40, transparent 70%)`,
                                            }}
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                opacity: [0.5, 0.8, 0.5],
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}
                                </motion.div>

                                {/* タップのヒント */}
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.6 }}
                                    transition={{ delay: 2 }}
                                    className="text-white/50 text-xs mt-8"
                                >
                                    またはタップで開封
                                </motion.p>
                            </>
                        )}

                        {/* Phase: opening - 開封中 */}
                        {phase === "opening" && (
                            <motion.div
                                initial={{ scale: 1 }}
                                animate={{
                                    scale: [1, 1.5, 0],
                                    rotate: [0, 180, 360],
                                    opacity: [1, 1, 0],
                                }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                                className="relative"
                            >
                                {/* パックが開く演出 */}
                                <div
                                    className="w-64 h-96 rounded-2xl"
                                    style={{
                                        background: `linear-gradient(145deg, ${colors.primary}, ${colors.glow})`,
                                        boxShadow: `0 0 100px ${colors.glow}`,
                                    }}
                                />

                                {/* 光線エフェクト */}
                                {[...Array(12)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute top-1/2 left-1/2 w-2 h-32 origin-bottom"
                                        style={{
                                            background: `linear-gradient(to top, ${colors.primary}, transparent)`,
                                            transform: `rotate(${i * 30}deg)`,
                                        }}
                                        initial={{ scaleY: 0 }}
                                        animate={{ scaleY: [0, 1, 0] }}
                                        transition={{ duration: 0.6, delay: i * 0.05 }}
                                    />
                                ))}
                            </motion.div>
                        )}

                        {/* Phase: reveal - 結果表示 */}
                        {phase === "reveal" && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                className="text-center"
                            >
                                {/* パーティクル */}
                                {[...Array(20)].map((_, i) => {
                                    const angle = (i * 360) / 20;
                                    const radius = 120;
                                    return (
                                        <motion.div
                                            key={i}
                                            className="absolute w-3 h-3 rounded-full"
                                            style={{
                                                left: "50%",
                                                top: "50%",
                                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.glow})`,
                                                boxShadow: `0 0 10px ${colors.glow}`,
                                            }}
                                            initial={{ x: 0, y: 0, opacity: 1 }}
                                            animate={{
                                                x: Math.cos((angle * Math.PI) / 180) * radius,
                                                y: Math.sin((angle * Math.PI) / 180) * radius,
                                                opacity: 0,
                                                scale: [1, 1.5, 0],
                                            }}
                                            transition={{ duration: 1, delay: i * 0.02 }}
                                        />
                                    );
                                })}

                                {/* エナジー表示 */}
                                <motion.div
                                    className="flex items-center justify-center gap-4 mb-6"
                                    initial={{ y: 50 }}
                                    animate={{ y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Zap className="w-12 h-12 text-yellow-400" fill="#fbbf24" />
                                    <motion.span
                                        className="text-7xl font-extrabold"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}, #fbbf24)`,
                                            backgroundClip: "text",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent",
                                        }}
                                        animate={{
                                            scale: [1, 1.1, 1],
                                        }}
                                        transition={{ duration: 0.5, delay: 0.5 }}
                                    >
                                        +{earnedEnergy}
                                    </motion.span>
                                    <Zap className="w-12 h-12 text-yellow-400" fill="#fbbf24" />
                                </motion.div>

                                <motion.p
                                    className="text-2xl font-bold text-yellow-400"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    エナジー獲得！
                                </motion.p>

                                {rarity !== "common" && (
                                    <motion.div
                                        className="mt-4 flex items-center justify-center gap-2"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.8 }}
                                    >
                                        <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
                                        <span
                                            className="text-sm font-bold uppercase tracking-wider"
                                            style={{ color: colors.primary }}
                                        >
                                            {rarity === "legendary" ? "LEGENDARY BONUS!" :
                                                rarity === "epic" ? "EPIC BONUS!" : "RARE DROP!"}
                                        </span>
                                        <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
