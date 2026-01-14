"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getUserGuardianProfile,
  unlockGuardian,
  switchActiveGuardian,
} from "@/lib/firestore";
import {
  GUARDIANS,
  GuardianId,
  UserGuardianProfile,
  ATTRIBUTES,
  canUnlockGuardian,
  getGuardianImagePath
} from "@/lib/guardian-collection";
import { Lock, Zap, Star, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import EnergyInvestmentModal from "@/components/energy-investment-modal";
import GuardianSummoning from "@/components/guardian-summoning";
import GuardianUnlockAnimation from "@/components/guardian-unlock-animation";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/glass-card";
import { PageLoader } from "@/components/ui/loading-spinner";

export default function GuardiansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const investParam = searchParams.get("invest");

  const [profile, setProfile] = useState<UserGuardianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianId | null>(null);
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [showSummoning, setShowSummoning] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [unlockingGuardianId, setUnlockingGuardianId] = useState<GuardianId | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    window.scrollTo(0, 0);
    loadProfile();
  }, [user?.uid]);

  useEffect(() => {
    if (investParam && profile) {
      const guardianId = investParam as GuardianId;
      const guardian = profile.guardians[guardianId];
      if (guardian?.unlocked) {
        setSelectedGuardian(guardianId);
        setShowEnergyModal(true);
        router.replace("/guardians", { scroll: false });
      }
    }
  }, [investParam, profile, router]);

  async function loadProfile() {
    if (!user) return;
    try {
      const data = await getUserGuardianProfile(user.uid);
      if (data) {
        setProfile(data);
        const hasAnyGuardian = Object.values(data.guardians).some(g => g?.unlocked);
        if (!hasAnyGuardian) {
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
    const energyCost = guardian.unlockCondition.energyCost || 0;

    if (confirm(`${guardian.name}を${energyCost}エナジーで解放しますか？`)) {
      const result = await unlockGuardian(user.uid, guardianId, energyCost);
      if (result.success) {
        setUnlockingGuardianId(guardianId);
        setShowUnlockAnimation(true);
      } else {
        alert(result.message);
      }
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">プロファイルが見つかりません</div>
      </div>
    );
  }

  // 解放済み・未解放を分離
  const allGuardians = Object.values(GUARDIANS);
  const unlockedGuardians = allGuardians.filter(g => profile.guardians[g.id]?.unlocked);
  const lockedGuardians = allGuardians.filter(g => !profile.guardians[g.id]?.unlocked);

  // アクティブ守護神
  const activeGuardian = profile.activeGuardianId ? GUARDIANS[profile.activeGuardianId] : null;
  const activeInstance = profile.activeGuardianId ? profile.guardians[profile.activeGuardianId] : null;

  // 進捗計算
  const unlockedStagesCount = Object.values(profile.guardians)
    .filter(g => g?.unlocked)
    .reduce((sum, g) => sum + Math.max(0, g.stage), 0);
  const totalStages = allGuardians.length * 4;
  const completionPercentage = Math.round((unlockedStagesCount / totalStages) * 100);

  return (
    <div className="space-y-6 pb-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🛡️ 守護神図鑑
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {unlockedGuardians.length} / {allGuardians.length} 体を解放
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">保有エナジー</p>
          <p className="text-2xl font-bold text-yellow-400 flex items-center gap-1">
            <Zap className="w-5 h-5" />
            {profile.energy.current.toLocaleString()}
          </p>
        </div>
      </div>

      {/* プログレスバー（マイルストーン付き） */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white font-medium">図鑑完成度</span>
          <span className="text-sm font-bold text-purple-400">{completionPercentage}%</span>
        </div>
        <div className="relative">
          <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"
            />
          </div>
          {/* マイルストーン */}
          <div className="absolute top-0 left-0 right-0 h-4 flex items-center">
            {[25, 50, 75, 100].map((milestone) => (
              <div
                key={milestone}
                className="absolute flex flex-col items-center"
                style={{ left: `${milestone}%`, transform: 'translateX(-50%)' }}
              >
                <div
                  className={`w-3 h-3 rounded-full border-2 ${completionPercentage >= milestone
                    ? 'bg-yellow-400 border-yellow-300'
                    : 'bg-slate-600 border-slate-500'
                    }`}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-500">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </GlassCard>

      {/* アクティブ守護神ヒーローセクション */}
      {activeGuardian && activeInstance && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-0 overflow-hidden">
            <div
              className="relative p-4"
              style={{
                background: `linear-gradient(135deg, ${ATTRIBUTES[activeGuardian.attribute].color}20 0%, transparent 50%)`
              }}
            >
              <div className="flex items-center gap-4">
                {/* 守護神画像 */}
                <div
                  className="w-24 h-24 rounded-2xl overflow-hidden border-3 flex-shrink-0"
                  style={{
                    borderColor: ATTRIBUTES[activeGuardian.attribute].color,
                    boxShadow: `0 0 20px ${ATTRIBUTES[activeGuardian.attribute].color}60`
                  }}
                >
                  <img
                    src={getGuardianImagePath(activeGuardian.id, activeInstance.stage as 0 | 1 | 2 | 3 | 4)}
                    alt={activeGuardian.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-purple-400 fill-purple-400" />
                    <span className="text-xs text-purple-300">現在のパートナー</span>
                  </div>
                  <h3 className="text-xl font-bold text-white truncate">{activeGuardian.name}</h3>
                  <p className="text-sm text-slate-400">Stage {activeInstance.stage} / 4</p>

                  {/* Stage進捗バー */}
                  <div className="mt-2 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(activeInstance.stage / 4) * 100}%`,
                        backgroundColor: ATTRIBUTES[activeGuardian.attribute].color
                      }}
                    />
                  </div>
                </div>

                {/* アクションボタン */}
                <button
                  onClick={() => {
                    setSelectedGuardian(activeGuardian.id);
                    setShowEnergyModal(true);
                  }}
                  className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg"
                >
                  <Zap className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 詳細リンク */}
            <button
              onClick={() => router.push(`/guardian/${activeGuardian.id}`)}
              className="w-full py-3 bg-white/5 border-t border-white/10 flex items-center justify-center gap-2 text-sm text-slate-300 hover:bg-white/10 transition-colors"
            >
              詳細を見る
              <ChevronRight className="w-4 h-4" />
            </button>
          </GlassCard>
        </motion.div>
      )}

      {/* 解放済み守護神（2列グリッド） */}
      {unlockedGuardians.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            解放済み
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {unlockedGuardians.map((guardian) => {
              const instance = profile.guardians[guardian.id];
              const attr = ATTRIBUTES[guardian.attribute];
              const isActive = profile.activeGuardianId === guardian.id;

              return (
                <motion.div
                  key={guardian.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/guardian/${guardian.id}`)}
                  className="relative cursor-pointer"
                >
                  <GlassCard className="p-3 h-full">
                    <div className="flex items-center gap-3">
                      {/* 画像 */}
                      <div
                        className="w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0"
                        style={{
                          borderColor: attr.color,
                          boxShadow: `0 0 10px ${attr.color}40`
                        }}
                      >
                        <img
                          src={getGuardianImagePath(guardian.id, (instance?.stage ?? 0) as 0 | 1 | 2 | 3 | 4)}
                          alt={guardian.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-white text-sm truncate">{guardian.name}</span>
                          {isActive && (
                            <Star className="w-3 h-3 text-purple-400 fill-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400">Stage {instance?.stage ?? 0}</p>
                        <div className="mt-1 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${((instance?.stage ?? 0) / 4) * 100}%`,
                              backgroundColor: attr.color
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 属性バッジ */}
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: `${attr.color}30` }}
                    >
                      {attr.emoji}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 未解放守護神 */}
      {lockedGuardians.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-400 mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            未解放 ({lockedGuardians.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {lockedGuardians.map((guardian) => {
              const attr = ATTRIBUTES[guardian.attribute];
              const unlockCheck = canUnlockGuardian(guardian.id, profile);
              const canUnlock = unlockCheck.canUnlock;
              const energyCost = guardian.unlockCondition.energyCost || 0;

              return (
                <motion.div
                  key={guardian.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => canUnlock && handleUnlock(guardian.id)}
                  className={`relative ${canUnlock ? 'cursor-pointer' : 'opacity-50'}`}
                >
                  <GlassCard className="p-3 h-full bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      {/* ロック画像 */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-600 flex-shrink-0 relative bg-slate-800">
                        <img
                          src="/images/guardians/horyu/stage0.png"
                          alt="???"
                          className="w-full h-full object-cover opacity-30 grayscale"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="w-6 h-6 text-slate-400" />
                        </div>
                      </div>

                      {/* 情報 */}
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-400 text-sm">???</span>
                        <p className="text-xs text-slate-500">Tier {guardian.tier}</p>
                        {canUnlock && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-yellow-500">
                            <Zap className="w-3 h-3" />
                            {energyCost.toLocaleString()}E で解放
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 属性バッジ */}
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-30"
                      style={{ backgroundColor: `${attr.color}30` }}
                    >
                      {attr.emoji}
                    </div>

                    {/* 解放可能バッジ */}
                    {canUnlock && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        解放可能!
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* エナジー投資モーダル */}
      {selectedGuardian && showEnergyModal && user && (
        <EnergyInvestmentModal
          guardianId={selectedGuardian}
          profile={profile}
          userId={user.uid}
          onClose={() => {
            setShowEnergyModal(false);
            setSelectedGuardian(null);
          }}
          onSuccess={() => {
            setShowEnergyModal(false);
            setSelectedGuardian(null);
            loadProfile();
          }}
        />
      )}

      {/* 召喚の儀式（初回） */}
      {showSummoning && user && (
        <GuardianSummoning
          userId={user.uid}
          onComplete={() => {
            setShowSummoning(false);
            loadProfile();
          }}
        />
      )}

      {/* 守護神解放演出 */}
      {showUnlockAnimation && unlockingGuardianId && (
        <GuardianUnlockAnimation
          guardianId={unlockingGuardianId}
          onComplete={() => {
            setShowUnlockAnimation(false);
            setUnlockingGuardianId(null);
            setSelectedGuardian(null);
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
