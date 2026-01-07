"use client";

import { useState } from "react";
import {
  GUARDIANS,
  GuardianId,
  UserGuardianProfile,
  EVOLUTION_STAGES,
  getEnergyToNextStage,
  getAuraLevel,
  ATTRIBUTES,
  getPlaceholderStyle,
  getGuardianImagePath
} from "@/lib/guardian-collection";
import { investGuardianEnergy } from "@/lib/firestore";
import { Zap, X, TrendingUp, Sparkles } from "lucide-react";

interface EnergyInvestmentModalProps {
  guardianId: GuardianId;
  profile: UserGuardianProfile;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnergyInvestmentModal({
  guardianId,
  profile,
  userId,
  onClose,
  onSuccess
}: EnergyInvestmentModalProps) {
  const [investAmount, setInvestAmount] = useState(10);
  const [isInvesting, setIsInvesting] = useState(false);
  const [showEvolutionAnimation, setShowEvolutionAnimation] = useState(false);
  const [evolutionData, setEvolutionData] = useState<{ from: number; to: number } | null>(null);

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
          // 進化演出を表示
          setEvolutionData({ from: stage, to: result.newStage });
          setShowEvolutionAnimation(true);
          
          // 3秒後に演出を閉じて成功コールバック
          setTimeout(() => {
            setShowEvolutionAnimation(false);
            onSuccess();
          }, 3000);
        } else {
          // 進化しなかった場合は即座に更新
          alert(result.message);
          onSuccess();
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

  // 進化演出中
  if (showEvolutionAnimation && evolutionData) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          {/* 進化エフェクト */}
          <div className="relative">
            <div 
              className="w-64 h-64 rounded-full flex items-center justify-center evolution-pulse aura-glow mb-8"
              style={{ background: placeholder.background }}
            >
              <span className="text-9xl">{placeholder.emoji}</span>
            </div>
            
            {/* キラキラエフェクト */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute sparkle"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.2}s`
                }}
              >
                <Sparkles className="text-yellow-400 w-8 h-8" />
              </div>
            ))}
          </div>

          {/* 進化メッセージ */}
          <div className="text-white">
            <h2 className="text-4xl font-bold mb-4">
              🎉 進化成功！
            </h2>
            <p className="text-2xl mb-2">
              {guardian.name}が
            </p>
            <p className="text-3xl font-bold mb-2" style={{ color: attr.color }}>
              「{EVOLUTION_STAGES[evolutionData.to].name}」
            </p>
            <p className="text-2xl">
              に進化しました！
            </p>
            
            {evolutionData.to === 3 && (
              <div className="mt-6 p-4 bg-purple-900/50 rounded-lg">
                <p className="text-yellow-400 font-bold">
                  ✨ 特性「{guardian.ability.name}」が解放されました！
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-6 max-w-2xl w-full border-2 border-purple-500/30 max-h-[95vh] overflow-y-auto"
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
