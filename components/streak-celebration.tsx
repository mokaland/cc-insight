"use client";

import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

/**
 * 🔥 ストリーク祝福ポップアップ
 * 
 * 報告完了時に表示される「脳汁放出」演出
 * メンバーの継続モチベーションを最大化
 */

interface StreakCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: {
    newStreak: number;
    isNewRecord: boolean;
    xpBonus: number;
    celebrationMessage: {
      title: string;
      message: string;
      emoji: string;
      color: string;
    };
  };
}

export function StreakCelebration({ isOpen, onClose, streakData }: StreakCelebrationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // 自動的に5秒後に閉じる
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  const { newStreak, isNewRecord, xpBonus, celebrationMessage } = streakData;

  return (
    <>
      {/* PWA対応: セーフエリアを含む画面全体を覆う背景 */}
      <div
        className={`fixed z-[9998] transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        style={{
          position: 'fixed',
          top: 'calc(-1 * env(safe-area-inset-top, 0px) - 50px)',
          left: 'calc(-1 * env(safe-area-inset-left, 0px) - 50px)',
          right: 'calc(-1 * env(safe-area-inset-right, 0px) - 50px)',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px) - 50px)',
          minWidth: 'calc(100vw + 100px)',
          minHeight: 'calc(100vh + 100px)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          touchAction: 'none',
        }}
        onClick={handleClose}
      />

      {/* モーダルコンテナ */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}
      >
      
      {/* メインコンテンツ */}
      <div 
        className={`relative w-full max-w-md transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        <div 
          className="relative overflow-hidden rounded-3xl border-2 p-8 text-center shadow-2xl"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: celebrationMessage.color,
            boxShadow: `0 0 40px ${celebrationMessage.color}80, 0 0 80px ${celebrationMessage.color}40`
          }}
        >
          {/* 閉じるボタン */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>

          {/* アニメーション背景 */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="absolute inset-0 animate-pulse"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${celebrationMessage.color}40, transparent 70%)`
              }}
            />
          </div>

          {/* メイン絵文字（巨大） */}
          <div className="relative mb-6">
            <div 
              className="text-8xl animate-bounce"
              style={{
                filter: `drop-shadow(0 0 20px ${celebrationMessage.color})`
              }}
            >
              {celebrationMessage.emoji}
            </div>
            
            {/* 新記録バッジ */}
            {isNewRecord && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                NEW RECORD!
              </div>
            )}
          </div>

          {/* タイトル */}
          <h2 
            className="text-3xl font-bold mb-3"
            style={{ color: celebrationMessage.color }}
          >
            {celebrationMessage.title}
          </h2>

          {/* メッセージ */}
          <p className="text-lg text-slate-300 mb-6">
            {celebrationMessage.message}
          </p>

          {/* ストリーク表示 */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div 
                className="text-5xl font-bold mb-1"
                style={{ color: celebrationMessage.color }}
              >
                {newStreak}
              </div>
              <div className="text-sm text-slate-400">連続日数</div>
            </div>

            {xpBonus > 1.0 && (
              <>
                <div className="text-3xl text-slate-600">×</div>
                <div className="text-center">
                  <div className="text-5xl font-bold mb-1 text-yellow-400">
                    {xpBonus.toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-400">XPボーナス</div>
                </div>
              </>
            )}
          </div>

          {/* プログレスバー */}
          <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
            <div
              className="h-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min((newStreak % 30) / 30 * 100, 100)}%`,
                backgroundColor: celebrationMessage.color,
                boxShadow: `0 0 10px ${celebrationMessage.color}`
              }}
            />
          </div>

          {/* 次のマイルストーン */}
          {newStreak < 7 && (
            <p className="text-sm text-slate-500">
              💎 習慣の青炎まであと {7 - newStreak} 日
            </p>
          )}
          {newStreak >= 7 && newStreak < 30 && (
            <p className="text-sm text-slate-500">
              👑 守護神の煌めきまであと {30 - newStreak} 日
            </p>
          )}
          {newStreak >= 30 && (
            <p className="text-sm text-slate-500">
              ✨ あなたは伝説のメンバーです！
            </p>
          )}

          {/* 励ましメッセージ */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              🔥 火を絶やすな！明日も報告して記録を伸ばそう！
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

/**
 * 🔥 ストリーク警告バナー
 * 
 * 損失回避バイアスを利用した警告表示
 * 20時間経過で表示開始
 */

interface StreakWarningBannerProps {
  warning: {
    shouldWarn: boolean;
    message: string;
    urgency: "info" | "warning" | "critical";
  } | null;
  onClose: () => void;
}

export function StreakWarningBanner({ warning, onClose }: StreakWarningBannerProps) {
  if (!warning || !warning.shouldWarn) return null;

  const urgencyStyles = {
    info: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      icon: "ℹ️"
    },
    warning: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      icon: "⚠️"
    },
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      icon: "🚨"
    }
  };

  const style = urgencyStyles[warning.urgency];

  return (
    <div 
      className={`${style.bg} ${style.border} ${style.text} border-2 rounded-xl p-4 mb-6 animate-pulse`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5">
          {style.icon}
        </div>
        <div className="flex-1">
          <p className="font-medium leading-relaxed">
            {warning.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
