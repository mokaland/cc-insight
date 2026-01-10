"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  GUARDIANS,
  GuardianId,
  ATTRIBUTES,
  getPlaceholderStyle,
  getTier1Guardians,
  getGuardianImagePath
} from "@/lib/guardian-collection";
import { setUserDemographics, unlockGuardian } from "@/lib/firestore";
import { Sparkles, Zap, Star, Shield, Flame } from "lucide-react";

// PWA対応: スクロールロック用のカスタムフック
function useScrollLock(isLocked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (isLocked) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
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
  }, [isLocked]);
}

interface GuardianSummoningProps {
  userId: string;
  onComplete: () => void;
}

type SummoningStep = 'prologue' | 'demographics' | 'selection' | 'summoning' | 'complete';

// タイプライター風テキスト表示コンポーネント
function TypewriterText({
  text,
  delay = 50,
  onComplete,
  className = ""
}: {
  text: string;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, delay, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}

// パーティクルエフェクトコンポーネント
function ParticleEffect({ count = 20, color = "purple" }: { count?: number; color?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full animate-float-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: color === "purple" ? "#a855f7" :
                            color === "gold" ? "#fbbf24" :
                            color === "cyan" ? "#22d3ee" : "#ec4899",
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            opacity: 0.6 + Math.random() * 0.4,
          }}
        />
      ))}
    </div>
  );
}

// 魔法陣コンポーネント
function MagicCircle({ size = "lg", spinning = true }: { size?: "sm" | "md" | "lg"; spinning?: boolean }) {
  const sizeClass = size === "lg" ? "w-80 h-80" : size === "md" ? "w-48 h-48" : "w-32 h-32";

  return (
    <div className={`relative ${sizeClass}`}>
      {/* 外側のリング */}
      <div
        className={`absolute inset-0 rounded-full border-2 border-purple-500/50 ${spinning ? 'animate-spin-slow' : ''}`}
        style={{
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.5), inset 0 0 30px rgba(168, 85, 247, 0.2)'
        }}
      />
      {/* 中間のリング */}
      <div
        className={`absolute inset-4 rounded-full border border-pink-500/40 ${spinning ? 'animate-spin-medium' : ''}`}
        style={{
          boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)'
        }}
      />
      {/* 内側のリング */}
      <div
        className={`absolute inset-8 rounded-full border border-cyan-500/30 ${spinning ? 'animate-spin-reverse' : ''}`}
        style={{
          boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)'
        }}
      />
      {/* 中心のグロー */}
      <div
        className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20"
        style={{
          boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)'
        }}
      />
    </div>
  );
}

export default function GuardianSummoning({ userId, onComplete }: GuardianSummoningProps) {
  const [step, setStep] = useState<SummoningStep>('prologue');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [ageGroup, setAgeGroup] = useState<'10s' | '20s' | '30s' | '40s' | '50plus'>('20s');
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianId | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // プロローグ用の状態
  const [prologuePhase, setProloguePhase] = useState(0);
  const [showPrologueButton, setShowPrologueButton] = useState(false);

  // 守護神選択用の状態
  const [revealedGuardians, setRevealedGuardians] = useState<number>(0);
  const [selectedGuardianForPreview, setSelectedGuardianForPreview] = useState<GuardianId | null>(null);

  const tier1Guardians = getTier1Guardians();

  // PWA対応: 召喚画面表示中は背景スクロールをロック
  useScrollLock(true);

  // プロローグの進行
  const advancePrologue = useCallback(() => {
    if (prologuePhase < 4) {
      setProloguePhase(prev => prev + 1);
    }
  }, [prologuePhase]);

  // プロローグ完了時にボタン表示
  useEffect(() => {
    if (prologuePhase === 4) {
      const timer = setTimeout(() => setShowPrologueButton(true), 500);
      return () => clearTimeout(timer);
    }
  }, [prologuePhase]);

  // 守護神の順次表示
  useEffect(() => {
    if (step === 'selection' && revealedGuardians < tier1Guardians.length) {
      const timer = setTimeout(() => {
        setRevealedGuardians(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [step, revealedGuardians, tier1Guardians.length]);

  async function handleDemographicsSubmit() {
    setIsProcessing(true);

    try {
      await setUserDemographics(userId, gender, ageGroup);
      setStep('selection');
    } catch (error) {
      console.error("Error setting demographics:", error);
      alert("エラーが発生しました");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleGuardianSelect(guardianId: GuardianId) {
    setSelectedGuardian(guardianId);
    setStep('summoning');

    // 召喚処理
    setTimeout(async () => {
      setIsProcessing(true);

      try {
        await unlockGuardian(userId, guardianId, 0);

        setTimeout(() => {
          setStep('complete');
        }, 4000);
      } catch (error) {
        console.error("Error unlocking guardian:", error);
        alert("エラーが発生しました");
        setStep('selection');
      } finally {
        setIsProcessing(false);
      }
    }, 1000);
  }

  // =====================================
  // 第0幕: プロローグ（導入演出）
  // =====================================
  if (step === 'prologue') {
    const prologueTexts = [
      "あなたは選ばれし者...",
      "この世界には、成長を見守る守護神が存在する",
      "古より伝わりし契約の儀式",
      "今、その時が訪れた..."
    ];

    return (
      <>
        {/* PWA対応: セーフエリア外まで背景を拡張 */}
        <div
          className="fixed z-[9998] bg-black"
          style={{
            top: '-100px',
            left: '-100px',
            right: '-100px',
            bottom: '-100px',
          }}
        />

        <div
          className="fixed inset-0 flex flex-col items-center justify-center z-[9999] overflow-hidden"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
          }}
        >
          {/* 背景の星空エフェクト */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/50 to-slate-950" />
            <ParticleEffect count={30} color="purple" />
          </div>

        {/* 中央の魔法陣（フェードイン） */}
        <div
          className={`absolute transition-all duration-2000 ${
            prologuePhase >= 1 ? 'opacity-30 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          <MagicCircle size="lg" spinning={true} />
        </div>

        {/* テキスト表示エリア - 2cm下に配置 */}
        <div className="relative z-10 text-center px-8 max-w-2xl mt-8">
          {prologueTexts.map((text, index) => (
            <div
              key={index}
              className={`mb-6 transition-all duration-1000 ${
                prologuePhase >= index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {prologuePhase === index ? (
                <TypewriterText
                  text={text}
                  delay={70}
                  onComplete={advancePrologue}
                  className="text-xl md:text-2xl text-gray-200 font-light tracking-wider"
                />
              ) : prologuePhase > index ? (
                <p className="text-xl md:text-2xl text-gray-400 font-light tracking-wider">
                  {text}
                </p>
              ) : null}
            </div>
          ))}

          {/* 儀式を始めるボタン */}
          <div
            className={`mt-12 transition-all duration-1000 ${
              showPrologueButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <button
              onClick={() => setStep('demographics')}
              className="relative px-12 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600
                         text-white text-xl font-bold rounded-full
                         hover:from-purple-500 hover:via-pink-500 hover:to-purple-500
                         transition-all duration-300 transform hover:scale-105
                         shadow-lg shadow-purple-500/50"
              style={{
                animation: 'pulse 2s ease-in-out infinite'
              }}
            >
              <span className="relative z-10 flex items-center gap-3">
                <Shield className="w-6 h-6" />
                儀式を始める
                <Shield className="w-6 h-6" />
              </span>
              {/* ボタンの光エフェクト */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 blur-xl opacity-50" />
            </button>
          </div>
        </div>

        {/* 画面タップで進行（モバイル対応） */}
        {prologuePhase < 4 && (
          <button
            onClick={advancePrologue}
            className="absolute inset-0 z-20 cursor-pointer"
            aria-label="次へ進む"
          />
        )}
      </div>
      </>
    );
  }

  // =====================================
  // 第1幕: 契約者の証明（プロフィール入力）
  // =====================================
  if (step === 'demographics') {
    return (
      <>
        {/* PWA対応: セーフエリア外まで背景を拡張 */}
        <div
          className="fixed z-[9998] bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950"
          style={{
            top: '-100px',
            left: '-100px',
            right: '-100px',
            bottom: '-100px',
          }}
        />
        <div
          className="fixed inset-0 flex items-start justify-center p-4 z-[9999] overflow-y-auto"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
        {/* 背景の魔法陣 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <MagicCircle size="lg" spinning={true} />
        </div>

        <ParticleEffect count={15} color="purple" />

        <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border-2 border-purple-500/30
                        shadow-2xl shadow-purple-500/20">
          {/* タイトル - 魔法的なデザイン */}
          <div className="text-center mb-8">
            {/* 神秘的なシンボル */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
              {/* 外側の回転リング */}
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-spin-slow" />
              {/* 中間リング */}
              <div className="absolute inset-2 rounded-full border border-pink-500/40 animate-spin-reverse" />
              {/* 内側のグロー */}
              <div
                className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-600/40 to-pink-600/40"
                style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}
              />
              {/* 中央のアイコン */}
              <div className="relative z-10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-purple-300" />
              </div>
              {/* 装飾の星 */}
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
              <Star className="absolute -bottom-1 -left-1 w-3 h-3 text-pink-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent mb-2">
              契約者の証明
            </h2>
            <p className="text-gray-400 text-sm italic">
              汝の姿を示せ...
            </p>
          </div>

          {/* 性別選択 */}
          <div className="mb-6">
            <label className="block text-purple-300 font-medium mb-3 text-sm tracking-wider">
              ◆ 性別
            </label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'male' as const, label: '男性', icon: '♂' },
                { value: 'female' as const, label: '女性', icon: '♀' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setGender(option.value)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-300
                    ${gender === option.value
                      ? 'bg-purple-600/40 border-purple-400 text-white scale-105 shadow-lg shadow-purple-500/30'
                      : 'bg-slate-800/50 border-slate-700 text-gray-400 hover:border-purple-500/50 hover:bg-slate-800'
                    }
                  `}
                >
                  <div className="text-3xl mb-2">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                  {gender === option.value && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full flex items-center justify-center">
                      <span className="text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 年齢層選択 */}
          <div className="mb-8">
            <label className="block text-purple-300 font-medium mb-3 text-sm tracking-wider">
              ◆ 年齢層
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '10s' as const, label: '10代' },
                { value: '20s' as const, label: '20代' },
                { value: '30s' as const, label: '30代' },
                { value: '40s' as const, label: '40代' },
                { value: '50plus' as const, label: '50代+' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setAgeGroup(option.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-300 text-sm
                    ${ageGroup === option.value
                      ? 'bg-purple-600/40 border-purple-400 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-gray-400 hover:border-purple-500/50'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 次へボタン */}
          <button
            onClick={handleDemographicsSubmit}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600
                       hover:from-purple-500 hover:to-pink-500
                       text-white font-bold rounded-xl transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50
                       transform hover:scale-[1.02]"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                処理中...
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 w-full">
                <Sparkles className="w-5 h-5" />
                <span>守護神を選ぶ</span>
                <Sparkles className="w-5 h-5" />
              </span>
            )}
          </button>
        </div>
      </div>
      </>
    );
  }

  // =====================================
  // 第2幕: 御三家の降臨（守護神選択）
  // =====================================
  if (step === 'selection') {
    return (
      <>
        {/* PWA対応: セーフエリア外まで背景を拡張 */}
        <div
          className="fixed z-[9998] bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950"
          style={{
            top: '-100px',
            left: '-100px',
            right: '-100px',
            bottom: '-100px',
          }}
        />
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8rem)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
        <ParticleEffect count={25} color="gold" />

        <div className="min-h-full flex flex-col items-center justify-start p-4 pt-4">
          {/* タイトル - 上部見切れ防止 */}
          <div className="text-center mb-6 mt-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl md:text-2xl font-bold text-white">
                守護神召喚の儀式
              </h2>
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-gray-400 text-xs">
              3体の守護神から、あなたの相棒を選んでください
            </p>
          </div>

          {/* 守護神カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
            {tier1Guardians.map((guardian, index) => {
              const attr = ATTRIBUTES[guardian.attribute];
              const placeholder = getPlaceholderStyle(guardian.id);
              const isRevealed = index < revealedGuardians;
              const isSelected = selectedGuardianForPreview === guardian.id;

              return (
                <div
                  key={guardian.id}
                  className={`transition-all duration-1000 ${
                    isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                  }`}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  <button
                    onClick={() => {
                      setSelectedGuardianForPreview(guardian.id);
                    }}
                    disabled={!isRevealed}
                    className={`
                      w-full p-6 rounded-2xl border-2 transition-all duration-300
                      ${isSelected
                        ? 'bg-slate-800/80 border-purple-400 scale-105 shadow-2xl shadow-purple-500/40'
                        : 'bg-slate-900/60 border-slate-700 hover:border-purple-500/50 hover:scale-[1.02]'
                      }
                      backdrop-blur-sm
                    `}
                  >
                    {/* 属性バッジ */}
                    <div className="flex justify-center mb-4">
                      <span
                        className="px-4 py-1 rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: `${attr.color}20`,
                          color: attr.color,
                          boxShadow: `0 0 20px ${attr.color}40`
                        }}
                      >
                        {attr.emoji} {attr.name}属性
                      </span>
                    </div>

                    {/* 守護神画像 */}
                    <div
                      className={`
                        w-full aspect-square rounded-xl mb-4 relative overflow-hidden
                        ${isSelected ? 'guardian-floating' : ''}
                      `}
                      style={{
                        background: placeholder.background,
                        boxShadow: isSelected ? `0 0 40px ${attr.color}50` : 'none'
                      }}
                    >
                      <img
                        src={getGuardianImagePath(guardian.id, 0)}
                        alt={guardian.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center hidden">
                        <span className="text-7xl">{placeholder.emoji}</span>
                      </div>
                    </div>

                    {/* 名前 */}
                    <h3 className="text-xl font-bold text-white mb-1">
                      {guardian.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">
                      ({guardian.reading})
                    </p>

                    {/* セリフ */}
                    <div
                      className="p-3 rounded-lg mb-4 text-sm italic"
                      style={{ backgroundColor: `${attr.color}10` }}
                    >
                      <p style={{ color: attr.color }}>
                        「{guardian.attribute === 'power'
                          ? '我が力で、汝の道を切り拓こう'
                          : guardian.attribute === 'beauty'
                          ? '我が知恵で、汝を導こう'
                          : '我が技術で、汝を守ろう'
                        }」
                      </p>
                    </div>

                    {/* 能力 */}
                    <div className="p-3 bg-slate-800/50 rounded-lg text-left">
                      <p className="text-xs text-purple-400 mb-1 font-bold">
                        ⚡ {guardian.ability.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {guardian.ability.description}
                      </p>
                    </div>
                  </button>

                  {/* 選択ボタン - カードとの間隔を確保 */}
                  {isSelected && (
                    <button
                      onClick={() => handleGuardianSelect(guardian.id)}
                      className="w-full mt-4 mb-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600
                                 hover:from-purple-500 hover:to-pink-500
                                 text-white font-bold rounded-xl transition-all
                                 shadow-lg shadow-purple-500/30 animate-pulse"
                    >
                      この守護神と契約する
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </>
    );
  }

  // =====================================
  // 第3幕: 契約の儀式（召喚演出）
  // =====================================
  if (step === 'summoning' && selectedGuardian) {
    const guardian = GUARDIANS[selectedGuardian];
    const attr = ATTRIBUTES[guardian.attribute];
    const placeholder = getPlaceholderStyle(selectedGuardian);

    return (
      <>
        {/* PWA対応: セーフエリア外まで背景を拡張 */}
        <div
          className="fixed z-[9998] bg-black"
          style={{
            top: '-100px',
            left: '-100px',
            right: '-100px',
            bottom: '-100px',
          }}
        />
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999] overflow-hidden"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
          }}
        >
        {/* 背景の放射状グラデーション */}
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `radial-gradient(circle at center, ${attr.color}30, transparent 70%)`
          }}
        />

        {/* パーティクルエフェクト */}
        <ParticleEffect count={40} color="gold" />

        {/* 魔法陣 */}
        <div className="absolute">
          <div className="relative">
            {/* 外側の大きな魔法陣 */}
            <div className="absolute -inset-20 opacity-30">
              <MagicCircle size="lg" spinning={true} />
            </div>

            {/* メインの魔法陣 */}
            <MagicCircle size="lg" spinning={true} />
          </div>
        </div>

        {/* 守護神のシルエット */}
        <div className="relative z-10 text-center">
          <div
            className="w-64 h-64 md:w-80 md:h-80 rounded-full flex items-center justify-center mx-auto mb-8
                       evolution-pulse overflow-hidden"
            style={{
              background: placeholder.background,
              boxShadow: `0 0 80px ${attr.color}80, 0 0 120px ${attr.color}40`
            }}
          >
            <img
              src={getGuardianImagePath(selectedGuardian, 0)}
              alt={guardian.name}
              className="w-full h-full object-contain"
            />
          </div>

          {/* キラキラエフェクト */}
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute sparkle"
              style={{
                top: `${50 + Math.cos(i * 22.5 * Math.PI / 180) * 55}%`,
                left: `${50 + Math.sin(i * 22.5 * Math.PI / 180) * 55}%`,
                animationDelay: `${i * 0.1}s`
              }}
            >
              <Sparkles
                className="w-5 h-5"
                style={{ color: i % 2 === 0 ? '#fbbf24' : attr.color }}
              />
            </div>
          ))}

          {/* テキスト */}
          <div className="relative z-20">
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                color: attr.color,
                textShadow: `0 0 30px ${attr.color}`
              }}
            >
              契約成立...
            </h2>
            <p className="text-2xl text-white mb-2">
              {guardian.name}
            </p>
            <p className="text-lg text-gray-400 animate-pulse">
              魂の絆を結んでいます...
            </p>
          </div>
        </div>

        {/* 光線エフェクト */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-40 origin-bottom"
            style={{
              background: `linear-gradient(to top, ${attr.color}, transparent)`,
              transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
              opacity: 0.3,
              animation: 'pulse 2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>
      </>
    );
  }

  // =====================================
  // 第4幕: 冒険の始まり（完了画面）
  // =====================================
  if (step === 'complete' && selectedGuardian) {
    const guardian = GUARDIANS[selectedGuardian];
    const attr = ATTRIBUTES[guardian.attribute];
    const placeholder = getPlaceholderStyle(selectedGuardian);

    return (
      <>
        {/* PWA対応: セーフエリア外まで背景を拡張 */}
        <div
          className="fixed z-[9998] bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950"
          style={{
            top: '-100px',
            left: '-100px',
            right: '-100px',
            bottom: '-100px',
          }}
        />
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999] overflow-hidden"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
          }}
        >
        <ParticleEffect count={30} color="gold" />

        <div className="text-center px-4 max-w-lg">
          {/* 守護神イメージ */}
          <div
            className="w-48 h-48 md:w-56 md:h-56 mx-auto mb-6 rounded-full flex items-center justify-center
                       guardian-floating overflow-hidden"
            style={{
              background: placeholder.background,
              boxShadow: `0 0 60px ${attr.color}60`
            }}
          >
            <img
              src={getGuardianImagePath(selectedGuardian, 0)}
              alt={guardian.name}
              className="w-full h-full object-contain"
            />
          </div>

          {/* 契約完了メッセージ */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                契約完了！
              </h2>
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </div>

            <p
              className="text-xl md:text-2xl font-bold mb-2"
              style={{ color: attr.color }}
            >
              {guardian.name}
            </p>
            <p className="text-gray-300">
              があなたの守護神になりました
            </p>
          </div>

          {/* 守護神のセリフ */}
          <div
            className="p-4 rounded-xl mb-8 border"
            style={{
              backgroundColor: `${attr.color}10`,
              borderColor: `${attr.color}30`
            }}
          >
            <p className="text-lg italic" style={{ color: attr.color }}>
              「さあ、共に歩もう。汝の成長を、我が見守ろう」
            </p>
          </div>

          {/* 案内カード */}
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap className="w-6 h-6 text-yellow-400" />
              <p className="text-white font-bold text-lg">
                毎日の報告でエナジーを獲得！
              </p>
            </div>
            <p className="text-gray-400 text-sm">
              守護神を育てて進化させよう
            </p>
          </div>

          {/* 冒険を始めるボタン */}
          <button
            onClick={onComplete}
            className="px-12 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600
                       hover:from-purple-500 hover:via-pink-500 hover:to-purple-500
                       text-white text-xl font-bold rounded-full transition-all duration-300
                       transform hover:scale-105 shadow-lg shadow-purple-500/50"
          >
            <span className="flex items-center gap-3">
              <Star className="w-6 h-6" />
              冒険を始める
              <Star className="w-6 h-6" />
            </span>
          </button>
        </div>
      </div>
      </>
    );
  }

  return null;
}
