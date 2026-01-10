"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GUARDIANS,
  GuardianId,
  UserGuardianProfile,
  EVOLUTION_STAGES,
  EvolutionStage,
  getEnergyToNextStage,
  getAuraLevel,
  ATTRIBUTES,
  getPlaceholderStyle,
  getGuardianImagePath
} from "@/lib/guardian-collection";
import { investGuardianEnergy } from "@/lib/firestore";
import { Zap, X, TrendingUp, Sparkles, Star, Heart, Eye } from "lucide-react";
import { getEvolutionMessage } from "@/lib/guardian-messages";

// 進化演出のフェーズ
type EvolutionPhase =
  | "idle"
  | "cardify"      // Phase 1: カード化 + 魔法陣出現
  | "charging"     // Phase 2: 光の収束 + 回転加速
  | "flash"        // Phase 3: ホワイトアウト + タメ
  | "reveal"       // Phase 4: カード裏返し + 新生
  | "finale";      // Phase 5: フィナーレ

// 進化レベル別の演出設定
interface EvolutionConfig {
  totalDuration: number;      // 総演出時間
  cardifyDuration: number;    // Phase 1 の長さ
  chargingDuration: number;   // Phase 2 の長さ
  flashDuration: number;      // Phase 3 の長さ
  revealDuration: number;     // Phase 4 の長さ
  finaleDuration: number;     // Phase 5 の長さ
  particleCount: number;      // 光の粒子数
  confettiCount: number;      // 紙吹雪の数
  shockwaveCount: number;     // 衝撃波の数
  sparkleCount: number;       // キラキラの数
  magicCircleScale: number;   // 魔法陣の最大スケール
  cardRotations: number;      // カード回転数
  skipAllowed: boolean;       // スキップ可能か
}

// 進化レベル別の設定を取得
function getEvolutionConfig(targetStage: number): EvolutionConfig {
  switch (targetStage) {
    case 1: // 0→1: シンプルな目覚め
      return {
        totalDuration: 4000,
        cardifyDuration: 800,
        chargingDuration: 800,
        flashDuration: 400,
        revealDuration: 800,
        finaleDuration: 1200,
        particleCount: 10,
        confettiCount: 15,
        shockwaveCount: 2,
        sparkleCount: 6,
        magicCircleScale: 1.2,
        cardRotations: 720,
        skipAllowed: true,
      };
    case 2: // 1→2: 力が溢れる
      return {
        totalDuration: 5000,
        cardifyDuration: 1000,
        chargingDuration: 1000,
        flashDuration: 500,
        revealDuration: 1000,
        finaleDuration: 1500,
        particleCount: 15,
        confettiCount: 25,
        shockwaveCount: 3,
        sparkleCount: 10,
        magicCircleScale: 1.3,
        cardRotations: 1080,
        skipAllowed: true,
      };
    case 3: // 2→3: 覚醒！特性解放
      return {
        totalDuration: 7000,
        cardifyDuration: 1200,
        chargingDuration: 1400,
        flashDuration: 600,
        revealDuration: 1200,
        finaleDuration: 2600,
        particleCount: 25,
        confettiCount: 40,
        shockwaveCount: 4,
        sparkleCount: 15,
        magicCircleScale: 1.5,
        cardRotations: 1800,
        skipAllowed: true,
      };
    case 4: // 3→4: 究極覚醒！
      return {
        totalDuration: 10000,
        cardifyDuration: 1500,
        chargingDuration: 2000,
        flashDuration: 800,
        revealDuration: 1500,
        finaleDuration: 4200,
        particleCount: 40,
        confettiCount: 60,
        shockwaveCount: 5,
        sparkleCount: 20,
        magicCircleScale: 2.0,
        cardRotations: 2520,
        skipAllowed: false,
      };
    default:
      return {
        totalDuration: 5000,
        cardifyDuration: 1000,
        chargingDuration: 1000,
        flashDuration: 500,
        revealDuration: 1000,
        finaleDuration: 1500,
        particleCount: 15,
        confettiCount: 25,
        shockwaveCount: 3,
        sparkleCount: 10,
        magicCircleScale: 1.3,
        cardRotations: 1080,
        skipAllowed: true,
      };
  }
}

interface EnergyInvestmentModalProps {
  guardianId: GuardianId;
  profile: UserGuardianProfile;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// 投資成功時のメッセージを生成
function getSuccessMessage(amount: number, remaining: number | null, guardianName: string): { title: string; message: string; emoji: string } {
  if (remaining !== null && remaining <= 0) {
    return {
      title: "進化準備完了！",
      message: `${guardianName}が進化の光に包まれています...`,
      emoji: "✨"
    };
  }

  if (amount >= 100) {
    return {
      title: "大量投資！",
      message: `${guardianName}が力強く輝いています！`,
      emoji: "🔥"
    };
  }

  if (amount >= 50) {
    return {
      title: "素晴らしい投資！",
      message: `${guardianName}が喜んでいます！`,
      emoji: "💫"
    };
  }

  if (remaining !== null && remaining <= 50) {
    return {
      title: "あと少し！",
      message: `進化まであと${remaining}E！`,
      emoji: "🌟"
    };
  }

  return {
    title: "エナジー注入成功！",
    message: `${guardianName}が成長しています`,
    emoji: "💎"
  };
}

export default function EnergyInvestmentModal({
  guardianId,
  profile,
  userId,
  onClose,
  onSuccess
}: EnergyInvestmentModalProps) {
  const router = useRouter();
  const [investAmount, setInvestAmount] = useState(10);
  const [isInvesting, setIsInvesting] = useState(false);
  const [showEvolutionAnimation, setShowEvolutionAnimation] = useState(false);
  const [evolutionData, setEvolutionData] = useState<{ from: number; to: number } | null>(null);
  const [evolutionPhase, setEvolutionPhase] = useState<EvolutionPhase>("idle");
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successData, setSuccessData] = useState<{ amount: number; remaining: number | null; newInvested: number } | null>(null);

  // 現在の進化設定を取得
  const evolutionConfig = evolutionData ? getEvolutionConfig(evolutionData.to) : null;

  // 進化演出のフェーズ進行
  useEffect(() => {
    if (!showEvolutionAnimation || !evolutionData) {
      setEvolutionPhase("idle");
      return;
    }

    const config = getEvolutionConfig(evolutionData.to);

    // Phase 1: カード化 (0ms)
    setEvolutionPhase("cardify");

    // Phase 2: 光の収束
    const timer1 = setTimeout(
      () => setEvolutionPhase("charging"),
      config.cardifyDuration
    );

    // Phase 3: フラッシュ
    const timer2 = setTimeout(
      () => setEvolutionPhase("flash"),
      config.cardifyDuration + config.chargingDuration
    );

    // Phase 4: 新生の顕現
    const timer3 = setTimeout(
      () => setEvolutionPhase("reveal"),
      config.cardifyDuration + config.chargingDuration + config.flashDuration
    );

    // Phase 5: フィナーレ
    const timer4 = setTimeout(
      () => setEvolutionPhase("finale"),
      config.cardifyDuration + config.chargingDuration + config.flashDuration + config.revealDuration
    );

    // 終了はボタンクリックで行うため、タイマーでの自動終了を削除

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [showEvolutionAnimation, evolutionData]);

  const guardian = GUARDIANS[guardianId];
  const instance = profile.guardians[guardianId];
  const attr = ATTRIBUTES[guardian.attribute];
  const placeholder = getPlaceholderStyle(guardianId);
  
  if (!instance || !instance.unlocked) {
    return null;
  }

  const stage = instance.stage;
  const investedEnergy = instance.investedEnergy;
  const auraLevel = getAuraLevel(investedEnergy, stage);
  const nextStageInfo = getEnergyToNextStage(investedEnergy, guardianId);
  const currentEnergy = profile.energy.current;

  async function handleInvest() {
    if (investAmount <= 0 || investAmount > currentEnergy) {
      alert("エナジーが不足しています");
      return;
    }

    setIsInvesting(true);

    try {
      const result = await investGuardianEnergy(userId, guardianId, investAmount);
      
      if (result.success) {
        if (result.evolved) {
          // 進化演出を表示（useEffectでフェーズ管理）
          setEvolutionData({ from: stage, to: result.newStage });
          setShowEvolutionAnimation(true);
        } else {
          // 進化しなかった場合は成功演出を表示
          const newInvested = investedEnergy + investAmount;
          const newNextStageInfo = getEnergyToNextStage(newInvested, guardianId);
          setSuccessData({
            amount: investAmount,
            remaining: newNextStageInfo?.remaining ?? null,
            newInvested
          });
          setShowSuccessAnimation(true);

          // 2.5秒後に演出を閉じて成功コールバック
          setTimeout(() => {
            setShowSuccessAnimation(false);
            onSuccess();
          }, 2500);
        }
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error investing:", error);
      alert("エラーが発生しました");
    } finally {
      setIsInvesting(false);
    }
  }

  // 投資成功演出（進化なし）
  if (showSuccessAnimation && successData) {
    const successMsg = getSuccessMessage(successData.amount, successData.remaining, guardian.name);

    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999]">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="text-center px-8"
        >
          {/* エナジー吸収エフェクト */}
          <div className="relative mb-8">
            {/* 背景のグロー */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.5 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${attr.color}40, transparent)` }}
            />

            {/* 守護神アイコン */}
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.1, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              className="w-40 h-40 mx-auto rounded-full flex items-center justify-center relative"
              style={{ background: placeholder.background }}
            >
              <span className="text-7xl">{placeholder.emoji}</span>

              {/* エナジー粒子 */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200,
                    opacity: 1,
                    scale: 1
                  }}
                  animate={{
                    x: 0,
                    y: 0,
                    opacity: 0,
                    scale: 0
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.05,
                    ease: "easeIn"
                  }}
                  className="absolute"
                >
                  <Zap className="w-6 h-6 text-yellow-400" />
                </motion.div>
              ))}
            </motion.div>

            {/* キラキラエフェクト */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                transition={{
                  duration: 1.5,
                  delay: 0.3 + i * 0.15,
                  repeat: 1,
                  repeatDelay: 0.5
                }}
                className="absolute"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${20 + Math.random() * 60}%`
                }}
              >
                <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
              </motion.div>
            ))}
          </div>

          {/* 投資額表示 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <p className="text-6xl font-bold text-yellow-400 mb-2">
              +{successData.amount}E
            </p>
            <p className="text-xl text-gray-300">
              注入完了！
            </p>
          </motion.div>

          {/* メッセージ */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <p className="text-5xl mb-3">{successMsg.emoji}</p>
            <h2 className="text-3xl font-bold text-white mb-2">
              {successMsg.title}
            </h2>
            <p className="text-xl text-gray-300">
              {successMsg.message}
            </p>
          </motion.div>

          {/* プログレスバー */}
          {successData.remaining !== null && successData.remaining > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="max-w-xs mx-auto"
            >
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>次の進化まで</span>
                <span className="text-yellow-400 font-bold">あと {successData.remaining}E</span>
              </div>
              <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((successData.newInvested) / (successData.newInvested + successData.remaining)) * 100)}%` }}
                  transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // 進化演出中 - 神秘のカード召喚演出
  if (showEvolutionAnimation && evolutionData && evolutionConfig) {
    const oldPlaceholder = getPlaceholderStyle(guardianId);
    const oldStageImage = getGuardianImagePath(guardianId, evolutionData.from as EvolutionStage);
    const newStageImage = getGuardianImagePath(guardianId, evolutionData.to as EvolutionStage);
    const config = evolutionConfig;

    return (
      <div
        className="fixed inset-0 bg-black flex flex-col items-center z-[9999] overflow-hidden"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)",
          justifyContent: "center"
        }}
      >
        {/* 背景の暗転グラデーション */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: evolutionPhase === "flash" ? 0 : 1 }}
          className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/50 to-slate-950"
        />

        {/* 究極進化（Stage 4）専用：属性オーラエフェクト */}
        {evolutionData.to === 4 && evolutionPhase !== "flash" && (
          <>
            {/* 属性カラーのパルスオーラ */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-[600px] h-[600px] rounded-full"
              style={{
                background: `radial-gradient(circle, ${attr.color}40 0%, transparent 70%)`,
              }}
            />
            {/* 外側のエネルギーリング */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`energy-ring-${i}`}
                animate={{
                  scale: [0.8, 2, 2.5],
                  opacity: [0.8, 0.3, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 1,
                  ease: "easeOut",
                }}
                className="absolute w-64 h-64 rounded-full border-2"
                style={{ borderColor: attr.color }}
              />
            ))}
          </>
        )}

        {/* Phase 3: ホワイトアウトフラッシュ */}
        <AnimatePresence>
          {evolutionPhase === "flash" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: config.flashDuration / 1000, times: [0, 0.1, 0.7, 1] }}
              className="absolute inset-0 bg-white z-50"
            />
          )}
        </AnimatePresence>

        {/* 魔法陣 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
          animate={{
            opacity: evolutionPhase === "flash" ? 0 : evolutionPhase === "cardify" ? 0.6 : evolutionPhase === "charging" ? 1 : 0.3,
            scale: evolutionPhase === "charging" ? config.magicCircleScale : 1,
            rotate: evolutionPhase === "charging" ? 360 : evolutionPhase === "cardify" ? 180 : 0
          }}
          transition={{ duration: config.chargingDuration / 1000, ease: "easeInOut" }}
          className="absolute w-80 h-80 md:w-96 md:h-96"
        >
          {/* 外側の円 */}
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="magicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={attr.color} />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="95" fill="none" stroke="url(#magicGradient)" strokeWidth="2" opacity="0.8" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="url(#magicGradient)" strokeWidth="1" opacity="0.6" />
            <circle cx="100" cy="100" r="65" fill="none" stroke="url(#magicGradient)" strokeWidth="1" opacity="0.4" />
            {/* 魔法陣の模様 */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={100 + 90 * Math.cos((angle * Math.PI) / 180)}
                y2={100 + 90 * Math.sin((angle * Math.PI) / 180)}
                stroke="url(#magicGradient)"
                strokeWidth="1"
                opacity="0.5"
              />
            ))}
            {/* 六芒星 */}
            <polygon
              points="100,15 118,60 175,60 128,90 145,145 100,115 55,145 72,90 25,60 82,60"
              fill="none"
              stroke="url(#magicGradient)"
              strokeWidth="1.5"
              opacity="0.7"
            />
          </svg>
        </motion.div>

        {/* Phase 2: 光の粒子収束 */}
        {(evolutionPhase === "charging" || evolutionPhase === "cardify") && (
          <>
            {[...Array(config.particleCount)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                initial={{
                  x: (Math.random() - 0.5) * (400 + config.particleCount * 10),
                  y: (Math.random() - 0.5) * (400 + config.particleCount * 10),
                  opacity: 0,
                  scale: 0
                }}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: evolutionPhase === "charging" ? [0, 1, 0] : 0,
                  scale: evolutionPhase === "charging" ? [0, 1, 0] : 0
                }}
                transition={{
                  duration: config.chargingDuration / 1000,
                  delay: i * (0.8 / config.particleCount),
                  ease: "easeIn"
                }}
                className="absolute z-20"
              >
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ))}
          </>
        )}

        {/* カード本体 */}
        <div className="relative z-10" style={{ perspective: "1000px" }}>
          <motion.div
            initial={{ rotateY: 0, scale: 1 }}
            animate={{
              rotateY:
                evolutionPhase === "cardify" ? 0 :
                evolutionPhase === "charging" ? config.cardRotations :
                evolutionPhase === "flash" ? config.cardRotations :
                evolutionPhase === "reveal" ? config.cardRotations + 180 :
                evolutionPhase === "finale" ? config.cardRotations + 180 : 0,
              scale:
                evolutionPhase === "cardify" ? [1, 0.95] :
                evolutionPhase === "charging" ? 0.9 :
                evolutionPhase === "flash" ? 0.9 :
                evolutionPhase === "reveal" ? [0.9, 1.1, 1] :
                evolutionPhase === "finale" ? 1 : 1,
            }}
            transition={{
              rotateY: {
                duration: evolutionPhase === "charging" ? config.chargingDuration / 1000 : evolutionPhase === "reveal" ? config.revealDuration / 1000 : 0.5,
                ease: evolutionPhase === "charging" ? "easeIn" : "easeOut"
              },
              scale: { duration: 0.5 }
            }}
            className="relative"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* カード表面（旧ステージ） */}
            <motion.div
              animate={{
                opacity: evolutionPhase === "reveal" || evolutionPhase === "finale" ? 0 : 1
              }}
              className="w-48 h-64 md:w-56 md:h-72 rounded-2xl overflow-hidden border-4 relative"
              style={{
                borderColor: attr.color,
                background: `linear-gradient(135deg, ${attr.color}20, ${attr.color}40)`,
                boxShadow: `0 0 ${evolutionPhase === "charging" ? 60 : 30}px ${attr.color}80`,
                backfaceVisibility: "hidden"
              }}
            >
              {/* カード内のグラデーション背景 */}
              <div
                className="absolute inset-0"
                style={{ background: oldPlaceholder.background }}
              >
                <motion.img
                  src={oldStageImage}
                  alt={guardian.name}
                  className="w-full h-full object-contain"
                  animate={{
                    opacity: evolutionPhase === "cardify" ? [1, 0.7] : evolutionPhase === "charging" ? 0.5 : 1
                  }}
                  onError={(e) => {
                    // 画像読み込み失敗時は卵画像を表示
                    e.currentTarget.src = "/images/ui/guardian-egg.png";
                  }}
                />
              </div>
              {/* ステージ表示 */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-white text-sm font-bold bg-black/50 px-3 py-1 rounded-full">
                  Stage {evolutionData.from}
                </span>
              </div>
            </motion.div>

            {/* カード裏面（新ステージ） */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: evolutionPhase === "reveal" || evolutionPhase === "finale" ? 1 : 0,
              }}
              transition={{
                opacity: { duration: 0.1 },
                boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
              className="absolute inset-0 w-48 h-64 md:w-56 md:h-72 rounded-2xl overflow-hidden border-4"
              style={{
                borderColor: evolutionData.to === 4 ? attr.color : "#fbbf24",
                background: `linear-gradient(135deg, #fbbf2440, ${attr.color}60)`,
                boxShadow: `0 0 80px #fbbf24, 0 0 120px ${attr.color}`,
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden"
              }}
            >
              {/* 新しい守護神画像 */}
              <div
                className="absolute inset-0"
                style={{ background: oldPlaceholder.background }}
              >
                <img
                  src={newStageImage}
                  alt={guardian.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // 画像読み込み失敗時は卵画像を表示
                    e.currentTarget.src = "/images/ui/guardian-egg.png";
                  }}
                />
              </div>
              {/* 新ステージ表示 */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-yellow-400 text-sm font-bold bg-black/70 px-3 py-1 rounded-full">
                  Stage {evolutionData.to}
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Phase 4: 衝撃波エフェクト */}
        <AnimatePresence>
          {evolutionPhase === "reveal" && (
            <>
              {[...Array(config.shockwaveCount)].map((_, i) => (
                <motion.div
                  key={`shockwave-${i}`}
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: 2 + config.shockwaveCount * 0.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: config.revealDuration / 1000, delay: i * 0.12 }}
                  className="absolute w-64 h-64 rounded-full border-4"
                  style={{ borderColor: attr.color }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Phase 4-5: 金色の紙吹雪（revealとfinaleフェーズ） */}
        {(evolutionPhase === "reveal" || evolutionPhase === "finale") && (
          <>
            {[...Array(config.confettiCount)].map((_, i) => (
              <motion.div
                key={`confetti-${i}`}
                initial={{
                  y: -20,
                  x: (Math.random() - 0.5) * (300 + config.confettiCount * 5),
                  rotate: 0,
                  opacity: 1
                }}
                animate={{
                  y: 500,
                  x: (Math.random() - 0.5) * (400 + config.confettiCount * 5),
                  rotate: Math.random() * 720,
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: 2 + Math.random() * (config.finaleDuration / 2000),
                  delay: Math.random() * 0.8,
                  ease: "easeOut"
                }}
                className="absolute top-0"
                style={{
                  width: 6 + Math.random() * 10,
                  height: 6 + Math.random() * 10,
                  background: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? attr.color : "#fff",
                  borderRadius: Math.random() > 0.5 ? "50%" : "2px"
                }}
              />
            ))}
          </>
        )}

        {/* キラキラエフェクト（フラッシュ以外） */}
        {evolutionPhase !== "flash" && (
          <>
            {[...Array(config.sparkleCount)].map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0]
                }}
                transition={{
                  duration: 1.2 + Math.random() * 0.5,
                  delay: i * (1.5 / config.sparkleCount),
                  repeat: Infinity,
                  repeatDelay: Math.random() * 0.8
                }}
                className="absolute"
                style={{
                  top: `${5 + Math.random() * 90}%`,
                  left: `${5 + Math.random() * 90}%`
                }}
              >
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </motion.div>
            ))}
          </>
        )}

        {/* Phase 5: フィナーレ - メッセージ（カードの上）とボタン（下部） */}
        <AnimatePresence>
          {evolutionPhase === "finale" && (
            <>
              {/* ガーディアンからのメッセージ（カードの上） */}
              {(() => {
                const evolutionMessage = getEvolutionMessage(guardianId, evolutionData.to as EvolutionStage);
                if (!evolutionMessage) return null;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="absolute top-0 left-0 right-0 px-6 text-center z-20"
                    style={{
                      paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)"
                    }}
                  >
                    <div
                      className="inline-block px-6 py-4 rounded-2xl backdrop-blur-md max-w-sm mx-auto"
                      style={{
                        background: `linear-gradient(135deg, ${attr.color}20, ${attr.color}10)`,
                        border: `1px solid ${attr.color}40`,
                        boxShadow: `0 4px 30px ${attr.color}20`
                      }}
                    >
                      {/* メッセージ本文（3行） */}
                      <div className="space-y-1 mb-3">
                        {evolutionMessage.lines.map((line, index) => (
                          <motion.p
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + index * 0.2, duration: 0.4 }}
                            className="text-white text-sm md:text-base leading-relaxed"
                          >
                            {line}
                          </motion.p>
                        ))}
                      </div>

                      {/* ガーディアン名 */}
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.3, duration: 0.4 }}
                        className="text-right text-xs md:text-sm"
                        style={{ color: attr.color }}
                      >
                        ─ {evolutionMessage.guardianName}より
                      </motion.p>
                    </div>
                  </motion.div>
                );
              })()}

              {/* ボタン（下部に配置） */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-0 left-0 right-0 px-4"
                style={{
                  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)"
                }}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto"
                >
                  {/* 詳細を見るボタン */}
                  <button
                    onClick={() => {
                      setShowEvolutionAnimation(false);
                      onSuccess();
                      router.push(`/guardian/${guardianId}`);
                    }}
                    className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${attr.color}, ${attr.color}cc)`,
                      boxShadow: `0 0 30px ${attr.color}80`,
                    }}
                  >
                    <Eye className="w-5 h-5" />
                    詳細を見る
                  </button>

                  {/* 閉じるボタン */}
                  <button
                    onClick={() => {
                      setShowEvolutionAnimation(false);
                      onSuccess();
                    }}
                    className="w-full py-3 rounded-xl font-bold text-white/80 bg-slate-800/80 hover:bg-slate-700/80 transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    閉じる
                  </button>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:pb-4 pb-[calc(var(--bottom-nav-height)+4rem)] z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-6 pb-8 max-w-2xl w-full border-2 border-purple-500/30 max-h-[calc(100vh-var(--bottom-nav-height)-8rem)] md:max-h-[95vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {guardian.name}
              <span className="text-gray-400 text-sm ml-2">({guardian.reading})</span>
            </h2>
            <p className="text-gray-400 text-sm">{guardian.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* 守護神画像 */}
        <div 
          className="w-full aspect-square max-h-[30vh] rounded-xl mb-4 guardian-floating relative overflow-hidden"
          style={{ background: placeholder.background }}
        >
          <img
            src={getGuardianImagePath(guardianId, stage)}
            alt={guardian.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // 画像読み込み失敗時はプレースホルダー表示
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center hidden">
            <span className="text-9xl">{placeholder.emoji}</span>
          </div>
          
          {/* 現在のステージバッジ */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-xs text-gray-400">Stage</p>
            <p className="text-2xl font-bold" style={{ color: attr.color }}>
              {stage}
            </p>
          </div>
        </div>

        {/* 現在の状態 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">進化段階</p>
            <p className="text-lg font-bold text-white">
              {EVOLUTION_STAGES[stage].name}
            </p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">投資済み</p>
            <p className="text-lg font-bold text-purple-400">
              {investedEnergy}E
            </p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">オーラLv</p>
            <p className="text-lg font-bold text-pink-400">
              {auraLevel}%
            </p>
          </div>
        </div>

        {/* 次の進化まで */}
        {nextStageInfo && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-300">
                次の進化まで
              </p>
              <p className="text-lg font-bold text-yellow-400">
                あと {nextStageInfo.remaining}E
              </p>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${(nextStageInfo.current / nextStageInfo.required) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 特性 */}
        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
          <p className="text-sm text-purple-400 mb-2 flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            特性: {guardian.ability.name}
          </p>
          <p className="text-sm text-gray-400 mb-2">
            {guardian.ability.description}
          </p>
          {stage >= 3 ? (
            <p className="text-sm text-green-400 font-bold">✓ 発動中</p>
          ) : (
            <p className="text-sm text-yellow-400">Stage 3で解放</p>
          )}
        </div>

        {/* エナジー投資 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-white font-bold flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-400" />
              投資するエナジー
            </label>
            <p className="text-gray-400">
              保有: <span className="text-yellow-400 font-bold">{currentEnergy}E</span>
            </p>
          </div>
          
          <input
            type="range"
            min="0"
            max={Math.min(currentEnergy, 500)}
            step="10"
            value={investAmount}
            onChange={(e) => setInvestAmount(parseInt(e.target.value))}
            className="w-full mb-3"
          />
          
          <div className="flex items-center justify-between mb-4">
            <input
              type="number"
              value={investAmount}
              onChange={(e) => setInvestAmount(Math.max(0, Math.min(currentEnergy, parseInt(e.target.value) || 0)))}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg w-32"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setInvestAmount(Math.min(currentEnergy, 10))}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
              >
                10
              </button>
              <button
                onClick={() => setInvestAmount(Math.min(currentEnergy, 50))}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
              >
                50
              </button>
              <button
                onClick={() => setInvestAmount(Math.min(currentEnergy, 100))}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
              >
                100
              </button>
              <button
                onClick={() => setInvestAmount(currentEnergy)}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        {/* 投資ボタン */}
        <button
          onClick={handleInvest}
          disabled={isInvesting || investAmount <= 0 || investAmount > currentEnergy}
          className={`
            w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center
            ${investAmount > 0 && investAmount <= currentEnergy
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
              : 'bg-slate-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isInvesting ? (
            <>処理中...</>
          ) : (
            <>
              <TrendingUp className="w-5 h-5 mr-2" />
              {investAmount}エナジーを注入する
            </>
          )}
        </button>
      </div>
    </div>
  );
}
