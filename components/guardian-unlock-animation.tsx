"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GUARDIANS,
  GuardianId,
  ATTRIBUTES,
  getPlaceholderStyle,
  getGuardianImagePath,
} from "@/lib/guardian-collection";
import { Sparkles, Star } from "lucide-react";

// 召喚の儀のフェーズ
type SummoningPhase =
  | "idle"
  | "preparing"     // Phase 1: 儀式準備 - 魔法陣出現
  | "channeling"    // Phase 2: エナジー収束 - 光の粒子
  | "summoning"     // Phase 3: 召喚の瞬間 - フラッシュ
  | "manifesting"   // Phase 4: 顕現 - 守護神出現
  | "blessing";     // Phase 5: 祝福 - 契約完了

interface GuardianUnlockAnimationProps {
  guardianId: GuardianId;
  onComplete: () => void;
}

export default function GuardianUnlockAnimation({
  guardianId,
  onComplete,
}: GuardianUnlockAnimationProps) {
  const [phase, setPhase] = useState<SummoningPhase>("idle");
  const guardian = GUARDIANS[guardianId];
  const attr = ATTRIBUTES[guardian.attribute];
  const placeholder = getPlaceholderStyle(guardianId);

  // 召喚演出の設定
  const SUMMONING_CONFIG = {
    totalDuration: 7000,
    preparingDuration: 1200,
    channelingDuration: 1500,
    summoningDuration: 600,
    manifestingDuration: 1500,
    blessingDuration: 2200,
    particleCount: 30,
    sparkleCount: 15,
  };

  // フェーズ進行
  useEffect(() => {
    // Phase 1: 儀式準備
    setPhase("preparing");

    // Phase 2: エナジー収束
    const timer1 = setTimeout(
      () => setPhase("channeling"),
      SUMMONING_CONFIG.preparingDuration
    );

    // Phase 3: 召喚の瞬間
    const timer2 = setTimeout(
      () => setPhase("summoning"),
      SUMMONING_CONFIG.preparingDuration + SUMMONING_CONFIG.channelingDuration
    );

    // Phase 4: 顕現
    const timer3 = setTimeout(
      () => setPhase("manifesting"),
      SUMMONING_CONFIG.preparingDuration +
        SUMMONING_CONFIG.channelingDuration +
        SUMMONING_CONFIG.summoningDuration
    );

    // Phase 5: 祝福
    const timer4 = setTimeout(
      () => setPhase("blessing"),
      SUMMONING_CONFIG.preparingDuration +
        SUMMONING_CONFIG.channelingDuration +
        SUMMONING_CONFIG.summoningDuration +
        SUMMONING_CONFIG.manifestingDuration
    );

    // 完了
    const timer5 = setTimeout(() => {
      onComplete();
    }, SUMMONING_CONFIG.totalDuration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] overflow-hidden">
      {/* 背景グラデーション */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "summoning" ? 0 : 1 }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${attr.color}20, transparent 70%),
                       linear-gradient(to bottom, #0f0a1a, #1a0a2e, #0f0a1a)`,
        }}
      />

      {/* Phase 3: ホワイトアウトフラッシュ */}
      <AnimatePresence>
        {phase === "summoning" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.6, times: [0, 0.1, 0.7, 1] }}
            className="absolute inset-0 bg-white z-50"
          />
        )}
      </AnimatePresence>

      {/* 魔法陣（複数レイヤー） */}
      <motion.div
        initial={{ opacity: 0, scale: 0, rotate: 0 }}
        animate={{
          opacity:
            phase === "summoning"
              ? 0
              : phase === "preparing"
              ? 0.8
              : phase === "channeling"
              ? 1
              : 0.4,
          scale:
            phase === "preparing"
              ? 1
              : phase === "channeling"
              ? 1.3
              : phase === "manifesting" || phase === "blessing"
              ? 1.5
              : 0,
          rotate: phase === "channeling" ? 360 : phase === "preparing" ? 180 : 0,
        }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="absolute w-[500px] h-[500px] md:w-[600px] md:h-[600px]"
      >
        {/* 外側の魔法陣 */}
        <svg viewBox="0 0 200 200" className="w-full h-full absolute">
          <defs>
            <linearGradient
              id="summonGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={attr.color} />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor={attr.color} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke="url(#summonGradient)"
            strokeWidth="2"
            opacity="0.8"
            filter="url(#glow)"
          />
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="url(#summonGradient)"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <circle
            cx="100"
            cy="100"
            r="75"
            fill="none"
            stroke="url(#summonGradient)"
            strokeWidth="1"
            opacity="0.4"
          />
          {/* 六芒星 */}
          <polygon
            points="100,10 116,55 170,55 126,85 142,140 100,110 58,140 74,85 30,55 84,55"
            fill="none"
            stroke="url(#summonGradient)"
            strokeWidth="2"
            opacity="0.8"
            filter="url(#glow)"
          />
          {/* 内側の装飾 */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <g key={i}>
              <line
                x1="100"
                y1="100"
                x2={100 + 90 * Math.cos((angle * Math.PI) / 180)}
                y2={100 + 90 * Math.sin((angle * Math.PI) / 180)}
                stroke="url(#summonGradient)"
                strokeWidth="1"
                opacity="0.5"
              />
              {/* ルーン文字風の装飾 */}
              <circle
                cx={100 + 65 * Math.cos((angle * Math.PI) / 180)}
                cy={100 + 65 * Math.sin((angle * Math.PI) / 180)}
                r="5"
                fill="none"
                stroke="url(#summonGradient)"
                strokeWidth="1"
                opacity="0.7"
              />
            </g>
          ))}
        </svg>

        {/* 内側の回転する魔法陣 */}
        <motion.svg
          viewBox="0 0 200 200"
          className="w-full h-full absolute"
          animate={{ rotate: [0, -360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="100"
            cy="100"
            r="50"
            fill="none"
            stroke={attr.color}
            strokeWidth="1"
            strokeDasharray="10 5"
            opacity="0.6"
          />
        </motion.svg>
      </motion.div>

      {/* Phase 2: 光の粒子収束 */}
      {(phase === "channeling" || phase === "preparing") && (
        <>
          {[...Array(SUMMONING_CONFIG.particleCount)].map((_, i) => {
            const angle = (i / SUMMONING_CONFIG.particleCount) * Math.PI * 2;
            const radius = 300 + Math.random() * 200;
            return (
              <motion.div
                key={`particle-${i}`}
                initial={{
                  x: Math.cos(angle) * radius,
                  y: Math.sin(angle) * radius,
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: phase === "channeling" ? [0, 1, 0] : 0,
                  scale: phase === "channeling" ? [0, 1.5, 0] : 0,
                }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.04,
                  ease: "easeIn",
                }}
                className="absolute z-20"
              >
                <Star
                  className="w-5 h-5 fill-current"
                  style={{ color: i % 2 === 0 ? attr.color : "#fbbf24" }}
                />
              </motion.div>
            );
          })}
        </>
      )}

      {/* 召喚カード（守護神表示） */}
      <div className="relative z-10" style={{ perspective: "1500px" }}>
        <motion.div
          initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
          animate={{
            rotateY:
              phase === "preparing" || phase === "channeling"
                ? 180
                : phase === "summoning"
                ? 90
                : 0,
            scale:
              phase === "preparing"
                ? 0.8
                : phase === "channeling"
                ? 0.9
                : phase === "summoning"
                ? 0.9
                : phase === "manifesting"
                ? [0.9, 1.15, 1]
                : 1,
            opacity:
              phase === "preparing"
                ? 0.5
                : phase === "channeling"
                ? 0.8
                : phase === "summoning"
                ? 0.5
                : 1,
          }}
          transition={{
            duration: phase === "manifesting" ? 1.2 : 0.8,
            ease: "easeOut",
          }}
          className="relative"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* カード裏面（儀式中） */}
          <motion.div
            animate={{
              opacity: phase === "manifesting" || phase === "blessing" ? 0 : 1,
            }}
            className="w-56 h-72 md:w-64 md:h-80 rounded-2xl overflow-hidden border-4 relative"
            style={{
              borderColor: attr.color,
              background: `linear-gradient(135deg, ${attr.color}40, #1a0a2e)`,
              boxShadow: `0 0 50px ${attr.color}80`,
              backfaceVisibility: "hidden",
            }}
          >
            {/* 神秘的なパターン */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-32 h-32 rounded-full border-4 border-dashed animate-spin-slow"
                style={{ borderColor: `${attr.color}60` }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-50">?</span>
            </div>
          </motion.div>

          {/* カード表面（守護神） */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === "manifesting" || phase === "blessing" ? 1 : 0,
            }}
            transition={{ opacity: { duration: 0.1 } }}
            className="absolute inset-0 w-56 h-72 md:w-64 md:h-80 rounded-2xl overflow-hidden border-4"
            style={{
              borderColor: "#fbbf24",
              background: placeholder.background,
              boxShadow: `0 0 80px #fbbf24, 0 0 120px ${attr.color}`,
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
            }}
          >
            <img
              src={getGuardianImagePath(guardianId, 0)}
              alt={guardian.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                // 画像読み込み失敗時は卵画像を表示
                e.currentTarget.src = "/images/ui/guardian-egg.png";
              }}
            />
            {/* Stage 0 バッジ */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="text-yellow-400 text-sm font-bold bg-black/70 px-3 py-1 rounded-full">
                Stage 0
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Phase 4: 衝撃波エフェクト */}
      <AnimatePresence>
        {phase === "manifesting" && (
          <>
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={`shockwave-${i}`}
                initial={{ scale: 0.5, opacity: 0.9 }}
                animate={{ scale: 4, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, delay: i * 0.15 }}
                className="absolute w-64 h-64 rounded-full border-4"
                style={{ borderColor: i % 2 === 0 ? attr.color : "#fbbf24" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Phase 4 & 5: 紙吹雪 */}
      {(phase === "manifesting" || phase === "blessing") && (
        <>
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={`confetti-${i}`}
              initial={{
                y: -50,
                x: (Math.random() - 0.5) * 500,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: 600,
                x: (Math.random() - 0.5) * 700,
                rotate: Math.random() * 720,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2.5 + Math.random(),
                delay: Math.random() * 0.8,
                ease: "easeOut",
              }}
              className="absolute top-0"
              style={{
                width: 8 + Math.random() * 10,
                height: 8 + Math.random() * 10,
                background:
                  i % 3 === 0
                    ? "#fbbf24"
                    : i % 3 === 1
                    ? attr.color
                    : "#fff",
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              }}
            />
          ))}
        </>
      )}

      {/* Phase 5: 祝福メッセージ */}
      <AnimatePresence>
        {phase === "blessing" && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-16 md:bottom-24 text-center px-4"
          >
            <motion.h2
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4"
            >
              ✨ 契約成立！
            </motion.h2>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xl md:text-2xl text-gray-300 mb-2">
                <span style={{ color: attr.color }} className="font-bold">
                  {guardian.name}
                </span>{" "}
                が
              </p>
              <p className="text-xl md:text-2xl text-gray-300 mb-4">
                あなたの守護神になりました！
              </p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="inline-block p-3 bg-gradient-to-r from-purple-900/80 to-pink-900/80 rounded-xl border border-yellow-400/50"
              >
                <p className="text-yellow-400 font-bold">
                  🎯 エナジーを注入して育てよう！
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* キラキラエフェクト（常時） */}
      {phase !== "summoning" && (
        <>
          {[...Array(SUMMONING_CONFIG.sparkleCount)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.3, 0],
              }}
              transition={{
                duration: 1.3 + Math.random() * 0.5,
                delay: i * 0.15,
                repeat: Infinity,
                repeatDelay: Math.random() * 0.6,
              }}
              className="absolute"
              style={{
                top: `${5 + Math.random() * 90}%`,
                left: `${5 + Math.random() * 90}%`,
              }}
            >
              <Sparkles
                className="w-6 h-6"
                style={{ color: i % 2 === 0 ? attr.color : "#fbbf24" }}
              />
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}
