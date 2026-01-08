"use client";

import { useState } from "react";
import {
  GUARDIANS,
  GuardianId,
  ATTRIBUTES,
  getPlaceholderStyle,
  getTier1Guardians,
  getGuardianImagePath
} from "@/lib/guardian-collection";
import { setUserDemographics, unlockGuardian } from "@/lib/firestore";
import { Sparkles, Zap } from "lucide-react";

interface GuardianSummoningProps {
  userId: string;
  onComplete: () => void;
}

type SummoningStep = 'demographics' | 'selection' | 'summoning' | 'complete';

export default function GuardianSummoning({ userId, onComplete }: GuardianSummoningProps) {
  const [step, setStep] = useState<SummoningStep>('demographics');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [ageGroup, setAgeGroup] = useState<'10s' | '20s' | '30s' | '40s' | '50plus'>('20s');
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianId | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const tier1Guardians = getTier1Guardians();

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
    
    // 1秒後に召喚演出開始
    setTimeout(async () => {
      setIsProcessing(true);
      
      try {
        // 守護神を解放（無料）
        await unlockGuardian(userId, guardianId, 0);
        
        // 3秒後に完了
        setTimeout(() => {
          setStep('complete');
          setTimeout(() => {
            onComplete();
          }, 2000);
        }, 3000);
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
  // ステップ1: プロフィール入力
  // =====================================
  if (step === 'demographics') {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 md:pb-4 pb-[calc(var(--bottom-nav-height)+3rem)] z-[9999]">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border-2 border-purple-500/30">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">
            🛡️ 守護神との契約
          </h2>
          <p className="text-gray-400 text-center mb-8">
            あなたのプロフィールを教えてください
          </p>

          {/* 性別 */}
          <div className="mb-6">
            <label className="block text-white font-bold mb-3">性別</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'male' as const, label: '男性', image: '/images/ui/gender-male.png' },
                { value: 'female' as const, label: '女性', image: '/images/ui/gender-female.png' },
                { value: 'other' as const, label: 'その他', image: '/images/ui/gender-other.png' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setGender(option.value)}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${gender === option.value
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-purple-500/50'
                    }
                  `}
                >
                  <div className="h-16 w-16 mx-auto mb-2 flex items-center justify-center relative">
                    <img
                      src={option.image}
                      alt={option.label}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-center">{option.label}</span>
                    </div>
                  </div>
                  <div className="text-sm">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 年齢層 */}
          <div className="mb-8">
            <label className="block text-white font-bold mb-3">年齢層</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '10s' as const, label: '10代' },
                { value: '20s' as const, label: '20代' },
                { value: '30s' as const, label: '30代' },
                { value: '40s' as const, label: '40代' },
                { value: '50plus' as const, label: '50代以上' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setAgeGroup(option.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-sm
                    ${ageGroup === option.value
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-purple-500/50'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleDemographicsSubmit}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
          >
            {isProcessing ? '処理中...' : '次へ'}
          </button>
        </div>
      </div>
    );
  }

  // =====================================
  // ステップ2: 御三家選択
  // =====================================
  if (step === 'selection') {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 md:pb-4 pb-[calc(var(--bottom-nav-height)+3rem)] z-[9999] overflow-y-auto">
        <div className="max-w-6xl w-full max-h-[calc(100vh-var(--bottom-nav-height)-6rem)] md:max-h-[90vh] overflow-y-auto py-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-white mb-1">
              ⚡ 守護神召喚の儀式
            </h2>
            <p className="text-gray-400 text-sm">
              3体の守護神から、あなたの相棒を選んでください
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tier1Guardians.map(guardian => {
              const attr = ATTRIBUTES[guardian.attribute];
              const placeholder = getPlaceholderStyle(guardian.id);
              
              return (
                <button
                  key={guardian.id}
                  onClick={() => handleGuardianSelect(guardian.id)}
                  className="p-6 bg-slate-900/50 backdrop-blur-sm rounded-2xl border-2 border-slate-700 hover:border-purple-500 transition-all hover:scale-105 group"
                >
                  {/* 属性 */}
                  <div className="text-center mb-4">
                    <span className="text-4xl">{attr.emoji}</span>
                    <p className="text-sm font-bold mt-2" style={{ color: attr.color }}>
                      {attr.name}属性
                    </p>
                  </div>

                  {/* 画像 */}
                  <div 
                    className="w-full aspect-square rounded-xl mb-4 guardian-floating relative overflow-hidden"
                    style={{ background: placeholder.background }}
                  >
                    <img
                      src={getGuardianImagePath(guardian.id, 0)}
                      alt={guardian.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // 画像読み込み失敗時はプレースホルダー表示
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center hidden">
                      <span className="text-8xl">{placeholder.emoji}</span>
                    </div>
                  </div>

                  {/* 名前 */}
                  <h3 className="text-2xl font-bold text-white mb-2 text-center">
                    {guardian.name}
                    <span className="block text-sm text-gray-400 mt-1">
                      ({guardian.reading})
                    </span>
                  </h3>

                  {/* 説明 */}
                  <p className="text-sm text-gray-400 mb-4 text-center">
                    {guardian.description}
                  </p>

                  {/* 特性 */}
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-purple-400 mb-1">
                      ⚡ {guardian.ability.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {guardian.ability.description}
                    </p>
                  </div>

                  {/* ホバーエフェクト */}
                  <div className="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-purple-400 font-bold">
                      召喚する ✨
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =====================================
  // ステップ3: 召喚演出
  // =====================================
  if (step === 'summoning' && selectedGuardian) {
    const guardian = GUARDIANS[selectedGuardian];
    const placeholder = getPlaceholderStyle(selectedGuardian);
    const attr = ATTRIBUTES[guardian.attribute];
    
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
        {/* 背景の光エフェクト */}
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute inset-0 unlock-burst"
            style={{ 
              background: `radial-gradient(circle, ${attr.gradientFrom}, transparent)` 
            }}
          />
        </div>

        <div className="text-center relative z-10">
          {/* 召喚サークル */}
          <div className="relative mb-8">
            <div 
              className="w-80 h-80 rounded-full flex items-center justify-center evolution-pulse aura-glow"
              style={{ background: placeholder.background }}
            >
              <span className="text-9xl">{placeholder.emoji}</span>
            </div>
            
            {/* キラキラエフェクト */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute sparkle"
                style={{
                  top: `${50 + Math.cos(i * 30 * Math.PI / 180) * 50}%`,
                  left: `${50 + Math.sin(i * 30 * Math.PI / 180) * 50}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              >
                <Sparkles className="text-yellow-400 w-6 h-6" />
              </div>
            ))}
          </div>

          {/* 召喚メッセージ */}
          <div className="text-white">
            <h2 className="text-5xl font-bold mb-4 animate-pulse">
              召喚中...
            </h2>
            <p className="text-2xl mb-4" style={{ color: attr.color }}>
              {guardian.name}
            </p>
            <p className="text-lg text-gray-400">
              契約の儀式を執り行っています
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =====================================
  // ステップ4: 完了
  // =====================================
  if (step === 'complete' && selectedGuardian) {
    const guardian = GUARDIANS[selectedGuardian];
    const attr = ATTRIBUTES[guardian.attribute];
    
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center z-[9999]">
        <div className="text-center">
          <div className="mb-8">
            <Sparkles className="w-24 h-24 mx-auto text-yellow-400 animate-bounce" />
          </div>
          
          <h2 className="text-5xl font-bold text-white mb-4">
            🎉 契約完了！
          </h2>
          
          <p className="text-2xl text-gray-300 mb-2">
            {guardian.name}があなたの守護神になりました
          </p>
          
          <p className="text-lg text-gray-400 mb-8">
            共に成長し、最強を目指しましょう！
          </p>

          <div className="inline-block p-6 bg-slate-900/50 backdrop-blur-sm rounded-xl border-2 border-purple-500/30">
            <Zap className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <p className="text-white font-bold text-xl">
              毎日の報告でエナジーを獲得！
            </p>
            <p className="text-gray-400 text-sm mt-2">
              守護神を育てて進化させよう
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
