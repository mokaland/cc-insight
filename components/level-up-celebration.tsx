"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { getLevelTitle } from "@/lib/guardian-collection";

interface LevelUpCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  beforeLevel: number;
  afterLevel: number;
  newTitle?: string; // 称号が変わった場合のみ
}

export function LevelUpCelebration({
  isOpen,
  onClose,
  beforeLevel,
  afterLevel,
  newTitle,
}: LevelUpCelebrationProps) {
  // 称号が変わったかチェック
  const beforeTitle = getLevelTitle(beforeLevel);
  const afterTitle = getLevelTitle(afterLevel);
  const titleChanged = beforeTitle !== afterTitle;
  const scrollYRef = useRef(0);

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

  // バイブレーション
  useEffect(() => {
    if (isOpen) {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    }
  }, [isOpen]);

  // 4秒後に自動クローズ
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
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
            className="fixed z-[9998] bg-gradient-to-b from-purple-900/80 via-indigo-900/80 to-black/90"
            style={{
              position: 'fixed',
              top: 'calc(-1 * env(safe-area-inset-top, 0px) - 50px)',
              left: 'calc(-1 * env(safe-area-inset-left, 0px) - 50px)',
              right: 'calc(-1 * env(safe-area-inset-right, 0px) - 50px)',
              bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px) - 50px)',
              minWidth: 'calc(100vw + 100px)',
              minHeight: 'calc(100vh + 100px)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
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
            onClick={onClose}
          >

          {/* キラキラパーティクル */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: i % 2 === 0
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -100],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 1,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* メインコンテンツ */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="relative z-10 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* アイコン */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto mb-6 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-2xl"
              style={{
                boxShadow: '0 0 60px rgba(251, 191, 36, 0.6), 0 0 120px rgba(251, 191, 36, 0.3)',
              }}
            >
              <TrendingUp className="w-12 h-12 text-white" />
            </motion.div>

            {/* タイトル */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
              レベルアップ！
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </motion.h2>

            {/* レベル表示 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="flex items-center justify-center gap-4 mb-6"
            >
              <span className="text-4xl font-bold text-slate-400">
                Lv.{beforeLevel}
              </span>
              <motion.span
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-3xl text-yellow-400"
              >
                →
              </motion.span>
              <motion.span
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
                className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400"
                style={{
                  textShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
                }}
              >
                Lv.{afterLevel}
              </motion.span>
            </motion.div>

            {/* 称号変更表示 */}
            {titleChanged && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-premium rounded-xl p-4 border border-purple-500/30 mb-4"
                style={{
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)',
                }}
              >
                <div className="flex items-center justify-center gap-2 text-purple-300 mb-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm">称号が変わりました！</span>
                  <Star className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  「{afterTitle}」に昇格！
                </p>
              </motion.div>
            )}

            {/* 閉じるヒント */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-slate-400"
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
