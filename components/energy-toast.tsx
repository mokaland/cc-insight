"use client";

import { useEffect, useState } from "react";
import { Zap, Sparkles } from "lucide-react";

interface EnergyToastProps {
  energyEarned: number;
  isLuckyBonus?: boolean;
  onComplete: () => void;
}

export default function EnergyToast({ energyEarned, isLuckyBonus = false, onComplete }: EnergyToastProps) {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: string; delay: string; duration: string }>>([]);

  useEffect(() => {
    // フェードイン
    setTimeout(() => setVisible(true), 100);

    // ラッキーボーナス時は紙吹雪生成
    if (isLuckyBonus) {
      const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.5}s`,
        duration: `${2 + Math.random() * 2}s`
      }));
      setConfetti(confettiPieces);
    }

    // 3秒後にフェードアウト＆完了コールバック
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLuckyBonus, onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      {/* 背景オーバーレイ */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          visible ? 'opacity-60' : 'opacity-0'
        }`}
      />

      {/* ラッキーボーナス時の紙吹雪 */}
      {isLuckyBonus && confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: piece.left,
            top: '-20px',
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            backgroundColor: ['#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#10B981'][piece.id % 5]
          }}
        />
      ))}

      {/* メインコンテンツ */}
      <div 
        className={`relative z-10 transition-all duration-500 ${
          visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <div className="relative">
          {/* グロー効果 */}
          <div 
            className="absolute inset-0 blur-3xl opacity-60"
            style={{
              background: isLuckyBonus 
                ? 'radial-gradient(circle, #F59E0B, #EC4899, transparent)'
                : 'radial-gradient(circle, #EAB308, transparent)'
            }}
          />

          {/* カード */}
          <div 
            className={`relative p-12 rounded-3xl border-4 ${
              isLuckyBonus 
                ? 'bg-gradient-to-br from-yellow-500/20 via-pink-500/20 to-purple-500/20 border-yellow-400'
                : 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500'
            }`}
            style={{
              boxShadow: isLuckyBonus
                ? '0 0 80px rgba(245, 158, 11, 0.8), 0 0 120px rgba(236, 72, 153, 0.6)'
                : '0 0 60px rgba(234, 179, 8, 0.8)'
            }}
          >
            {/* ジャキーン！テキスト */}
            <div className="text-center mb-6">
              <div 
                className={`text-7xl font-black mb-2 ${
                  isLuckyBonus ? 'animate-pulse' : ''
                }`}
                style={{
                  background: isLuckyBonus
                    ? 'linear-gradient(to right, #F59E0B, #EC4899, #8B5CF6)'
                    : 'linear-gradient(to right, #EAB308, #F59E0B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 40px rgba(234, 179, 8, 0.6)'
                }}
              >
                ジャキーン！
              </div>
              {isLuckyBonus && (
                <div className="text-3xl font-bold text-pink-400 animate-bounce">
                  🎊 ラッキーボーナス！🎊
                </div>
              )}
            </div>

            {/* エナジー獲得表示 */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Zap 
                className={`w-20 h-20 text-yellow-400 ${
                  isLuckyBonus ? 'animate-spin' : 'animate-pulse'
                }`} 
              />
              <div className="text-center">
                <div 
                  className="text-8xl font-black"
                  style={{
                    background: isLuckyBonus
                      ? 'linear-gradient(to right, #F59E0B, #EC4899, #8B5CF6)'
                      : 'linear-gradient(to right, #EAB308, #F59E0B)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  +{energyEarned}
                </div>
                <div className="text-3xl font-bold text-yellow-400">
                  エナジー獲得！
                </div>
              </div>
              <Zap 
                className={`w-20 h-20 text-yellow-400 ${
                  isLuckyBonus ? 'animate-spin' : 'animate-pulse'
                }`} 
              />
            </div>

            {/* キラキラエフェクト */}
            <div className="flex items-center justify-center gap-8">
              {[...Array(5)].map((_, i) => (
                <Sparkles
                  key={i}
                  className={`w-8 h-8 text-yellow-400 ${
                    isLuckyBonus ? 'animate-spin' : 'animate-pulse'
                  }`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>

            {/* ラッキーボーナスメッセージ */}
            {isLuckyBonus && (
              <div className="mt-6 text-center">
                <p className="text-xl font-bold text-pink-400">
                  10倍ボーナス発動中！
                </p>
                <p className="text-sm text-purple-300 mt-2">
                  今日はあなたのラッキーデー✨
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
