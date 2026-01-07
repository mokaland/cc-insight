"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { getUserGuardianProfile } from "@/lib/firestore";
import {
  GUARDIANS,
  GuardianId,
  UserGuardianProfile,
  EVOLUTION_STAGES,
  ATTRIBUTES,
  getAuraLevel,
  getPlaceholderStyle,
  getGuardianImagePath
} from "@/lib/guardian-collection";
import { Loader2, Sparkles, Zap, Crown, Flame, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function MyPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserGuardianProfile | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const data = await getUserGuardianProfile(user.uid);
        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error("データ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-muted-foreground">マイページを読み込み中...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">ログインしてください</p>
      </div>
    );
  }

  // アクティブな守護神を取得
  const activeGuardianId = profile.activeGuardianId;
  const activeGuardian = activeGuardianId ? GUARDIANS[activeGuardianId] : null;
  const activeInstance = activeGuardianId ? profile.guardians[activeGuardianId] : null;
  
  if (!activeGuardian || !activeInstance) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">守護神が選択されていません</p>
        <Link href="/guardians">
          <Button>守護神を選ぶ</Button>
        </Link>
      </div>
    );
  }

  const stage = activeInstance.stage;
  const stageInfo = EVOLUTION_STAGES[stage];
  const attr = ATTRIBUTES[activeGuardian.attribute];
  const placeholder = getPlaceholderStyle(activeGuardianId as GuardianId);
  const investedEnergy = activeInstance.investedEnergy;
  const auraLevel = getAuraLevel(investedEnergy, stage);

  return (
    <div className="space-y-8 pb-8">
      {/* ヘッダー */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          マイページ
        </h1>
        <p className="text-muted-foreground">
          {user.email} の冒険の記録
        </p>
      </div>

      {/* 守護神エリア */}
      <GlassCard glowColor={attr.color} className="p-6">
        <div className="flex flex-col gap-6">
          {/* 守護神表示 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* 守護神画像 */}
            <div className="flex-shrink-0 relative">
              <div 
                className="w-40 h-40 rounded-2xl flex items-center justify-center relative guardian-floating overflow-hidden"
                style={{
                  background: placeholder.background,
                  boxShadow: `0 0 40px ${attr.color}60, 0 0 20px ${attr.color}40`,
                  border: `3px solid ${attr.color}`,
                }}
              >
                <img
                  src={getGuardianImagePath(activeGuardianId as GuardianId, stage)}
                  alt={activeGuardian.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center hidden">
                  <span className="text-8xl">{placeholder.emoji}</span>
                </div>
                
                {/* パルスアニメーション */}
                <span 
                  className="absolute inset-0 rounded-2xl animate-ping opacity-30"
                  style={{ 
                    border: `3px solid ${attr.color}`,
                    boxShadow: `0 0 30px ${attr.color}`
                  }}
                />
              </div>

              {/* Stage表示 */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                <div 
                  className="px-4 py-1 rounded-full text-xs font-bold text-white"
                  style={{ 
                    backgroundColor: attr.color,
                    boxShadow: `0 0 20px ${attr.color}`
                  }}
                >
                  Stage {stage}
                </div>
              </div>
            </div>

            {/* 守護神情報 */}
            <div className="flex-1 w-full">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{attr.emoji}</span>
                  <h2 className="text-3xl font-bold" style={{ color: attr.color }}>
                    {activeGuardian.name}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {activeGuardian.reading} - {attr.name}属性
                </p>
                <p className="text-sm" style={{ color: attr.color }}>
                  {stageInfo.name}: {stageInfo.description}
                </p>
              </div>

              {/* ステータス表示 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">進化段階</p>
                  <p className="text-lg font-bold text-white">{stageInfo.name}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">投資済み</p>
                  <p className="text-lg font-bold text-purple-400">{investedEnergy}E</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">オーラLv</p>
                  <p className="text-lg font-bold text-pink-400">{auraLevel}%</p>
                </div>
              </div>

              {/* オーラゲージ */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">オーラレベル</span>
                  <span className="font-bold" style={{ color: attr.color }}>
                    {auraLevel}%
                  </span>
                </div>
                
                <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden border-2 border-white/20">
                  <div
                    className="h-full transition-all duration-1000"
                    style={{
                      width: `${auraLevel}%`,
                      background: `linear-gradient(90deg, ${attr.color}, ${attr.gradientTo})`,
                      boxShadow: `0 0 20px ${attr.color}`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 特性 */}
          {stage >= 3 && (
            <div 
              className="p-4 rounded-xl border-2"
              style={{
                backgroundColor: `${attr.color}10`,
                borderColor: `${attr.color}60`,
                boxShadow: `0 0 20px ${attr.color}40`
              }}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" style={{ color: attr.color }} />
                <div className="flex-1">
                  <p className="font-bold" style={{ color: attr.color }}>
                    特性: {activeGuardian.ability.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeGuardian.ability.description}
                  </p>
                </div>
                <div className="text-green-400 font-bold text-sm">
                  ✓ 発動中
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* エナジー＆ストリーク */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glowColor="#EAB308" className="p-6">
          <div className="text-center">
            <Zap className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
            <p className="text-sm text-muted-foreground mb-1">保有エナジー</p>
            <p className="text-4xl font-bold text-yellow-400">{profile.energy.current}</p>
          </div>
        </GlassCard>

        <GlassCard glowColor="#A855F7" className="p-6">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-purple-400" />
            <p className="text-sm text-muted-foreground mb-1">累計獲得</p>
            <p className="text-4xl font-bold text-purple-400">{profile.energy.totalEarned}</p>
          </div>
        </GlassCard>

        <GlassCard glowColor="#F97316" className="p-6">
          <div className="text-center">
            <Flame className="w-12 h-12 mx-auto mb-3 text-orange-400" />
            <p className="text-sm text-muted-foreground mb-1">ストリーク</p>
            <p className="text-4xl font-bold text-orange-400">{profile.streak.current}日</p>
            <p className="text-xs text-muted-foreground mt-2">
              最高記録: {profile.streak.max}日
            </p>
          </div>
        </GlassCard>
      </div>

      {/* クイックアクション */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/report">
          <GlassCard glowColor="#22C55E" className="p-6 cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="text-center">
              <div className="text-5xl mb-3">📝</div>
              <h3 className="text-lg font-bold mb-2">今日の報告</h3>
              <p className="text-sm text-muted-foreground">
                報告してエナジーを獲得
              </p>
            </div>
          </GlassCard>
        </Link>

        <Link href="/guardians">
          <GlassCard glowColor="#8B5CF6" className="p-6 cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="text-center">
              <div className="text-5xl mb-3">🛡️</div>
              <h3 className="text-lg font-bold mb-2">守護神</h3>
              <p className="text-sm text-muted-foreground">
                守護神を育てて進化させよう
              </p>
            </div>
          </GlassCard>
        </Link>

        <Link href="/ranking">
          <GlassCard glowColor="#EAB308" className="p-6 cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="text-center">
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="text-lg font-bold mb-2">ランキング</h3>
              <p className="text-sm text-muted-foreground">
                他のメンバーと競い合おう
              </p>
            </div>
          </GlassCard>
        </Link>
      </div>
    </div>
  );
}
