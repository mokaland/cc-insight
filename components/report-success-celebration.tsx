"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Trophy, Crown, Star } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { getGuardianMessage, getGuardianSubMessage, type UserState } from "@/lib/guardian-messages";

interface ReportSuccessCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  earnedEnergy: number;
  guardianData?: {
    emoji: string;
    name: string;
    color: string;
    stageName: string;
  };
  teamColor: string;
  userState?: UserState; // 🆕 ユーザーの状態情報
}

export function ReportSuccessCelebration({
  isOpen,
  onClose,
  earnedEnergy,
  guardianData,
  teamColor,
  userState,
}: ReportSuccessCelebrationProps) {
  const scrollYRef = useRef(0);

  // 🆕 状態適応型セリフ生成
  const [message] = useState(() => {
    if (userState) {
      return getGuardianMessage(userState);
    }
    // フォールバック（状態情報がない場合）
    return "よくやった！お前の努力は私の力になる！";
  });

  // 🆕 追加の一言（状態に応じた特別メッセージ）
  const [subMessage] = useState(() => {
    if (userState) {
      return getGuardianSubMessage(userState);
    }
    return null;
  });

  // PWA/iOS Safari対応: 背景スクロールを完全に防止
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const preventTouchMove = (e: TouchEvent) => {
        e.preventDefault();
      };
      document.addEventListener('touchmove', preventTouchMove, { passive: false });

      return () => {
        document.removeEventListener('touchmove', preventTouchMove);
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        window.scrollTo(0, scrollYRef.current);
      };
    }
  }, [isOpen]);

  // 🔊 サウンドエフェクト（将来実装用）
  useEffect(() => {
    if (isOpen && earnedEnergy > 0) {
      // playSound("report_success");

      // バイブレーション（モバイル）
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50, 30, 100]);
      }
    }
  }, [isOpen, earnedEnergy]);

  // 3秒後に自動クローズ
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* PWA対応: セーフエリアを含む画面全体を覆う背景 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed z-[9998] bg-black/80"
            style={{
              position: 'fixed',
              top: 'calc(-1 * env(safe-area-inset-top, 0px) - 50px)',
              left: 'calc(-1 * env(safe-area-inset-left, 0px) - 50px)',
              right: 'calc(-1 * env(safe-area-inset-right, 0px) - 50px)',
              bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px) - 50px)',
              minWidth: 'calc(100vw + 100px)',
              minHeight: 'calc(100vh + 100px)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              touchAction: 'none',
            }}
          />

          {/* モーダルコンテナ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
            }}
          >

          {/* ⭐ パーティクル爆発エフェクト（20個の光粒子） */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => {
              const angle = (i * 360) / 20;
              const radius = Math.min(150, window.innerWidth * 0.3);
              const delay = i * 0.03;

              return (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 1,
                    x: "50%",
                    y: "50%",
                    scale: 1,
                  }}
                  animate={{
                    opacity: [1, 1, 0],
                    x: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * radius}px)`,
                    y: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * radius}px)`,
                    scale: [1, 1.5, 0],
                  }}
                  transition={{ 
                    duration: 1.2, 
                    delay,
                    ease: "easeOut"
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${teamColor}, #fbbf24)`,
                    boxShadow: `0 0 20px ${teamColor}`,
                  }}
                />
              );
            })}
          </div>

          {/* 🌟 キラキラ星エフェクト（8個の星） */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => {
              const randomX = 20 + Math.random() * 60;
              const randomY = 20 + Math.random() * 60;
              const delay = 0.2 + i * 0.1;
              
              return (
                <motion.div
                  key={`star-${i}`}
                  initial={{ opacity: 0, scale: 0, rotate: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    rotate: [0, 180, 360],
                  }}
                  transition={{ 
                    duration: 1.5, 
                    delay,
                    ease: "easeOut"
                  }}
                  className="absolute"
                  style={{
                    left: `${randomX}%`,
                    top: `${randomY}%`,
                  }}
                >
                  <Star 
                    className="w-6 h-6"
                    style={{ color: teamColor }}
                    fill={teamColor}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* メインコンテンツカード */}
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              duration: 0.6
            }}
            className="relative z-10 glass-premium p-8 rounded-3xl border-2 max-w-md w-full"
            style={{
              borderColor: teamColor,
              boxShadow: `0 0 60px ${teamColor}80, 0 0 100px ${teamColor}40`,
            }}
          >
            {/* 🎊 トップの祝福アイコン */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-4"
            >
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <span className="text-2xl font-bold text-yellow-400">報告完了！</span>
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
            </motion.div>

            {/* 守護神アニメーション */}
            {guardianData ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ 
                  scale: [0.5, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                  opacity: 1,
                }}
                transition={{ 
                  duration: 0.8,
                  delay: 0.3,
                  times: [0, 0.4, 0.7, 1],
                }}
                className="text-center mb-6"
              >
                <div className="text-8xl mb-3 relative inline-block">
                  {guardianData.emoji}
                  {/* 守護神の後光 */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 rounded-full blur-3xl -z-10"
                    style={{ backgroundColor: guardianData.color }}
                  />
                </div>
                <p 
                  className="text-sm font-bold"
                  style={{ color: guardianData.color }}
                >
                  {guardianData.stageName} - {guardianData.name}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-8xl text-center mb-6"
              >
                🎉
              </motion.div>
            )}

            {/* ⚡ エナジー獲得表示 */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mb-6"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <Zap className="w-10 h-10 text-yellow-400" fill="#fbbf24" />
                <motion.p 
                  className="text-6xl font-extrabold"
                  style={{
                    background: `linear-gradient(135deg, ${teamColor}, #fbbf24, ${teamColor})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundSize: '200% auto',
                  }}
                  animate={{
                    backgroundPosition: ['0% center', '200% center'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  +{earnedEnergy}
                </motion.p>
                <Zap className="w-10 h-10 text-yellow-400" fill="#fbbf24" />
              </div>
              <motion.p 
                className="text-2xl font-bold text-yellow-400"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.1, 1] }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                エナジー獲得！
              </motion.p>
            </motion.div>

            {/* 守護神のセリフ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="space-y-3"
            >
              {/* メインセリフ */}
              <div
                className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  backgroundColor: `${teamColor}15`,
                  borderLeft: `4px solid ${teamColor}`,
                }}
              >
                {/* セリフの光沢エフェクト */}
                <motion.div
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
                
                <div className="relative z-10 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: teamColor }} />
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              {/* 追加の一言（特別な状態の場合のみ表示） */}
              {subMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 }}
                  className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
                >
                  <p className="text-xs text-center text-purple-200 font-medium">
                    {subMessage}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* プログレスバー（自動クローズ表示） */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 3.5, ease: "linear" }}
              className="mt-6 h-1 rounded-full origin-left"
              style={{ backgroundColor: teamColor }}
            />

            {/* タップして閉じる */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-center text-xs text-slate-400 mt-3"
            >
              タップして閉じる
            </motion.p>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
