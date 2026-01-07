"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  getUserGuardianProfile,
  unlockGuardian,
  switchActiveGuardian,
  setUserDemographics
} from "@/lib/firestore";
import {
  GUARDIANS,
  GuardianId,
  UserGuardianProfile,
  ATTRIBUTES,
  EVOLUTION_STAGES,
  getAuraLevel,
  canUnlockGuardian,
  getPlaceholderStyle,
  getGuardianImagePath
} from "@/lib/guardian-collection";
import { Lock, Zap, Star, ChevronRight } from "lucide-react";
import EnergyInvestmentModal from "@/components/energy-investment-modal";
import GuardianSummoning from "@/components/guardian-summoning";

export default function GuardiansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserGuardianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianId | null>(null);
  const [showSummoning, setShowSummoning] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const data = await getUserGuardianProfile(user.uid);
      if (data) {
        setProfile(data);
        
        // 初回チェック: 守護神が1体も解放されていない場合は召喚フロー表示
        const hasAnyGuardian = Object.values(data.guardians).some(g => g?.unlocked);
        if (!hasAnyGuardian && !data.gender) {
          // プロフィール未設定 = 完全な初回ユーザー
          setShowSummoning(true);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock(guardianId: GuardianId) {
    if (!user || !profile) return;
    
    const guardian = GUARDIANS[guardianId];
    const condition = guardian.unlockCondition;
    const energyCost = condition.energyCost || 0;
    
    if (confirm(`${guardian.name}を${energyCost}エナジーで解放しますか？`)) {
      const result = await unlockGuardian(user.uid, guardianId, energyCost);
      
      if (result.success) {
        alert(result.message);
        await loadProfile();
      } else {
        alert(result.message);
      }
    }
  }

  async function handleSetActive(guardianId: GuardianId) {
    if (!user) return;
    
    const result = await switchActiveGuardian(user.uid, guardianId);
    
    if (result.success) {
      await loadProfile();
    } else {
      alert(result.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">プロファイルが見つかりません</div>
      </div>
    );
  }

  const tier1 = Object.values(GUARDIANS).filter(g => g.tier === 1);
  const tier2 = Object.values(GUARDIANS).filter(g => g.tier === 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🛡️ 守護神コレクション
          </h1>
          <p className="text-gray-400">
            守護神を集め、育て、最強のパートナーに
          </p>
        </div>

        {/* エナジー表示 */}
        <div className="mb-8 p-6 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">保有エナジー</p>
              <p className="text-4xl font-bold text-yellow-400">
                <Zap className="inline-block w-8 h-8 mr-2" />
                {profile.energy.current}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">累計獲得</p>
              <p className="text-2xl font-bold text-purple-400">
                {profile.energy.totalEarned}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">ストリーク</p>
              <p className="text-2xl font-bold text-orange-400">
                🔥 {profile.streak.current}日
              </p>
            </div>
          </div>
        </div>

        {/* Tier 1: 御三家 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Star className="w-6 h-6 mr-2 text-yellow-400" />
            御三家（初期選択可能）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tier1.map(guardian => {
              const instance = profile.guardians[guardian.id];
              const isUnlocked = instance?.unlocked || false;
              const isActive = profile.activeGuardianId === guardian.id;
              const attr = ATTRIBUTES[guardian.attribute];
              const placeholder = getPlaceholderStyle(guardian.id);
              
              return (
                <GuardianCard
                  key={guardian.id}
                  guardian={guardian}
                  instance={instance}
                  isUnlocked={isUnlocked}
                  isActive={isActive}
                  profile={profile}
                  onUnlock={() => handleUnlock(guardian.id)}
                  onSetActive={() => handleSetActive(guardian.id)}
                  onClick={() => setSelectedGuardian(guardian.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Tier 2: 条件解放 */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Lock className="w-6 h-6 mr-2 text-purple-400" />
            特別な守護神（条件解放）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tier2.map(guardian => {
              const instance = profile.guardians[guardian.id];
              const isUnlocked = instance?.unlocked || false;
              const isActive = profile.activeGuardianId === guardian.id;
              
              return (
                <GuardianCard
                  key={guardian.id}
                  guardian={guardian}
                  instance={instance}
                  isUnlocked={isUnlocked}
                  isActive={isActive}
                  profile={profile}
                  onUnlock={() => handleUnlock(guardian.id)}
                  onSetActive={() => handleSetActive(guardian.id)}
                  onClick={() => setSelectedGuardian(guardian.id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* エナジー投資モーダル */}
      {selectedGuardian && user && profile && (
        <EnergyInvestmentModal
          guardianId={selectedGuardian}
          profile={profile}
          userId={user.uid}
          onClose={() => setSelectedGuardian(null)}
          onSuccess={() => {
            setSelectedGuardian(null);
            loadProfile();
          }}
        />
      )}

      {/* 召喚の儀式（初回ユーザー） */}
      {showSummoning && user && (
        <GuardianSummoning
          userId={user.uid}
          onComplete={() => {
            setShowSummoning(false);
            loadProfile();
          }}
        />
      )}
    </div>
  );
}

// =====================================
// 🎴 守護神カード
// =====================================

interface GuardianCardProps {
  guardian: typeof GUARDIANS[GuardianId];
  instance: any;
  isUnlocked: boolean;
  isActive: boolean;
  profile: UserGuardianProfile;
  onUnlock: () => void;
  onSetActive: () => void;
  onClick: () => void;
}

function GuardianCard({
  guardian,
  instance,
  isUnlocked,
  isActive,
  profile,
  onUnlock,
  onSetActive,
  onClick
}: GuardianCardProps) {
  const attr = ATTRIBUTES[guardian.attribute];
  const placeholder = getPlaceholderStyle(guardian.id);
  const canUnlock = canUnlockGuardian(guardian.id, profile);
  
  const stage = instance?.stage || 0;
  const stageName = EVOLUTION_STAGES[stage]?.name || "未解放";
  const investedEnergy = instance?.investedEnergy || 0;
  const auraLevel = isUnlocked ? getAuraLevel(investedEnergy, stage) : 0;
  
  return (
    <div
      className={`
        relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer
        ${isActive 
          ? 'bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-400 shadow-lg shadow-purple-500/50' 
          : 'bg-slate-900/50 border-slate-700 hover:border-purple-500/50'
        }
        ${!isUnlocked && 'opacity-60'}
      `}
      onClick={onClick}
    >
      {/* アクティブバッジ */}
      {isActive && (
        <div className="absolute top-3 right-3 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
          ACTIVE
        </div>
      )}

      {/* 属性アイコン */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{attr.emoji}</span>
        {isUnlocked && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Stage {stage}</p>
            <p className="text-sm font-bold" style={{ color: attr.color }}>
              {stageName}
            </p>
          </div>
        )}
      </div>

      {/* 守護神画像 */}
      <div 
        className="w-full aspect-square rounded-xl mb-4 relative guardian-floating overflow-hidden"
        style={{ background: placeholder.background }}
      >
        {isUnlocked ? (
          <img
            src={getGuardianImagePath(guardian.id, stage)}
            alt={guardian.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // 画像読み込み失敗時はプレースホルダー表示
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center ${isUnlocked ? 'hidden' : ''}`}>
          <span className="text-8xl">{placeholder.emoji}</span>
        </div>
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Lock className="w-16 h-16 text-gray-400" />
          </div>
        )}
      </div>

      {/* 名前 */}
      <h3 className="text-2xl font-bold mb-1">
        {guardian.name}
        <span className="text-sm text-gray-400 ml-2">({guardian.reading})</span>
      </h3>

      {/* 説明 */}
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
        {guardian.description}
      </p>

      {/* 特性 */}
      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
        <p className="text-xs text-purple-400 mb-1">⚡ 特性: {guardian.ability.name}</p>
        <p className="text-xs text-gray-400">{guardian.ability.description}</p>
        {isUnlocked && stage >= 3 && (
          <p className="text-xs text-green-400 mt-1">✓ 発動中</p>
        )}
        {isUnlocked && stage < 3 && (
          <p className="text-xs text-yellow-400 mt-1">Stage 3で解放</p>
        )}
      </div>

      {/* オーラレベル */}
      {isUnlocked && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">オーラLv</span>
            <span className="text-xs font-bold text-purple-400">{auraLevel}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${auraLevel}%` }}
            />
          </div>
        </div>
      )}

      {/* アクションボタン */}
      {!isUnlocked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canUnlock.canUnlock) {
              onUnlock();
            } else {
              alert(canUnlock.reason);
            }
          }}
          disabled={!canUnlock.canUnlock}
          className={`
            w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center
            ${canUnlock.canUnlock
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-slate-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <Lock className="w-4 h-4 mr-2" />
          {canUnlock.canUnlock ? '解放する' : 'ロック中'}
        </button>
      )}

      {isUnlocked && !isActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetActive();
          }}
          className="w-full py-3 rounded-lg font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all flex items-center justify-center"
        >
          <Star className="w-4 h-4 mr-2" />
          アクティブにする
        </button>
      )}

      {isUnlocked && isActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all flex items-center justify-center"
        >
          エナジーを注入
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      )}
    </div>
  );
}
