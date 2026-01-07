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
import { motion, useSpring, useTransform } from "framer-motion";

// カウントアップコンポーネント
function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { 
    damping: 20, 
    stiffness: 100 
  });
  const display = useTransform(spring, (current) => Math.round(current));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.onChange(setDisplayValue);
    return () => unsubscribe();
  }, [value, spring, display]);

  return <>{displayValue}</>;
}

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
      <div className="min-h-[70vh] flex items-center justify-center relative overflow-hidden cosmic-bg">
        {/* 星雲背景（複数レイヤー） */}
        <div className="absolute inset-0">
          {/* メイン星雲 */}
          <div className="nebula-bg absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl opacity-40" 
               style={{
                 background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.4) 0%, rgba(236, 72, 153, 0.3) 40%, transparent 70%)'
               }} 
          />
          <div className="nebula-bg absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
               style={{
                 background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.3) 0%, rgba(168, 85, 247, 0.2) 40%, transparent 70%)',
                 animationDelay: '5s'
               }} 
          />
          <div className="nebula-bg absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl opacity-20"
               style={{
                 background: 'radial-gradient(ellipse at center, rgba(250, 204, 21, 0.2) 0%, transparent 60%)',
                 animationDelay: '10s'
               }} 
          />
        </div>

        {/* パーティクル星（小さな光点） */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.3,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 2 + 2}s`
              }}
            />
          ))}
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 text-center max-w-md mx-auto px-4">
          {/* 強化された魔法陣 */}
          <div className="relative mb-8">
            <div className="w-56 h-56 mx-auto relative">
              {/* 外側リング（ゆっくり） */}
              <div 
                className="absolute inset-0 rounded-full border-4 animate-spin-slow"
                style={{
                  borderColor: 'rgba(168, 85, 247, 0.4)',
                  filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.6))'
                }}
              />
              {/* 中間リング（中速・逆回転） */}
              <div 
                className="absolute inset-6 rounded-full border-4 animate-spin-medium"
                style={{
                  borderColor: 'rgba(236, 72, 153, 0.4)',
                  filter: 'drop-shadow(0 0 12px rgba(236, 72, 153, 0.6))'
                }}
              />
              {/* 内側リング（速い） */}
              <div 
                className="absolute inset-12 rounded-full border-4 animate-spin-fast"
                style={{
                  borderColor: 'rgba(34, 211, 238, 0.4)',
                  filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.6))'
                }}
              />
              
              {/* 中心のアイコン */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Sparkles className="w-20 h-20 text-purple-400 animate-pulse" 
                             style={{
                               filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.8))'
                             }} 
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 blur-xl animate-pulse" />
                  </div>
                </div>
              </div>

              {/* 回転するルーン風装飾 */}
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 bg-white rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-90px)`,
                    opacity: 0.6,
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
                    animation: `sparkle ${2 + i * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* フローティング＆虹色グローカード */}
          <div className="floating-card rainbow-glow-border backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4 drop-shadow-lg">
              召喚を待つ守護神
            </h2>
            <p className="text-gray-200 mb-8 text-sm">
              あなたの相棒となる守護神を選び、<br />
              共に成長する冒険を始めましょう
            </p>
            
            <Link href="/guardians">
              <Button 
                className="impact-button w-full h-16 text-lg font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white border-0 shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 relative"
              >
                <Sparkles className="w-6 h-6 mr-2" />
                守護神を選ぶ
                <Sparkles className="w-6 h-6 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
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
        <p className="text-xl font-bold text-white">
          {user.displayName || user.email}さんの冒険の記録
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
                <div className="p-4 bg-black/30 rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-xs text-white font-bold mb-1">進化段階</p>
                  <p className="text-2xl font-bold text-white">{stageInfo.name}</p>
                </div>
                <div className="p-4 bg-black/30 rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-xs text-white font-bold mb-1">投資済み</p>
                  <p className="text-2xl font-bold text-purple-400">{investedEnergy}E</p>
                </div>
                <div className="p-4 bg-black/30 rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-xs text-white font-bold mb-1">オーラLv</p>
                  <p className="text-2xl font-bold text-pink-400">{auraLevel}%</p>
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

      {/* エナジー＆ストリーク（ジュエル化 + カウントアップ） */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* 保有エナジー */}
        <motion.div
          initial={{ scale: 0, rotateY: -180 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0 }}
          className="jewel-card glass-premium p-6 rounded-2xl border border-white/20"
        >
          <div className="text-center relative">
            {/* ネオンアイコン */}
            <div className="neon-icon-wrapper mx-auto mb-4">
              <Zap 
                className="w-14 h-14 text-yellow-400 relative z-10" 
                style={{
                  filter: 'drop-shadow(0 0 15px rgba(250, 204, 21, 0.8))'
                }}
              />
              <div className="neon-glow absolute inset-0 bg-yellow-400/50" />
            </div>
            
            {/* ラベル */}
            <p className="stat-label text-sm mb-2 text-gray-300">保有エナジー</p>
            
            {/* カウントアップ数値 */}
            <motion.p 
              className="stat-value text-5xl font-extrabold text-yellow-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
            >
              <AnimatedNumber value={profile.energy.current} />
            </motion.p>

            {/* 宝石のハイライト */}
            <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-yellow-400/10 rounded-full blur-2xl" />
          </div>
        </motion.div>

        {/* 累計獲得 */}
        <motion.div
          initial={{ scale: 0, rotateY: -180 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="jewel-card glass-premium p-6 rounded-2xl border border-white/20"
        >
          <div className="text-center relative">
            {/* ネオンアイコン */}
            <div className="neon-icon-wrapper mx-auto mb-4">
              <TrendingUp 
                className="w-14 h-14 text-purple-400 relative z-10" 
                style={{
                  filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.8))'
                }}
              />
              <div className="neon-glow absolute inset-0 bg-purple-400/50" />
            </div>
            
            {/* ラベル */}
            <p className="stat-label text-sm mb-2 text-gray-300">累計獲得</p>
            
            {/* カウントアップ数値 */}
            <motion.p 
              className="stat-value text-5xl font-extrabold text-purple-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.3 }}
            >
              <AnimatedNumber value={profile.energy.totalEarned} />
            </motion.p>

            {/* 宝石のハイライト */}
            <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-purple-400/10 rounded-full blur-2xl" />
          </div>
        </motion.div>

        {/* ストリーク */}
        <motion.div
          initial={{ scale: 0, rotateY: -180 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="jewel-card glass-premium p-6 rounded-2xl border border-white/20"
        >
          <div className="text-center relative">
            {/* ネオンアイコン */}
            <div className="neon-icon-wrapper mx-auto mb-4">
              <Flame 
                className="w-14 h-14 text-orange-400 relative z-10" 
                style={{
                  filter: 'drop-shadow(0 0 15px rgba(251, 146, 60, 0.8))'
                }}
              />
              <div className="neon-glow absolute inset-0 bg-orange-400/50" />
            </div>
            
            {/* ラベル */}
            <p className="stat-label text-sm mb-2 text-gray-300">ストリーク</p>
            
            {/* カウントアップ数値 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.4 }}
            >
              <p className="stat-value text-5xl font-extrabold text-orange-400">
                <AnimatedNumber value={profile.streak.current} />
                <span className="text-2xl">日</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                最高記録: {profile.streak.max}日 🔥
              </p>
            </motion.div>

            {/* 宝石のハイライト */}
            <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-orange-400/10 rounded-full blur-2xl" />
          </div>
        </motion.div>
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
