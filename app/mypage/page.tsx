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
  getGuardianImagePath,
  getEnergyToNextStage,
  calculateLevel,
  getLevelTitle,
  getEnergyToNextLevel,
  SNS_ORDER_BY_TEAM,
  SNS_LABELS,
  SnsAccounts,
  SnsAccountApproval,
  PROFILE_COMPLETION_BONUS
} from "@/lib/guardian-collection";
import { getUserSnsAccounts, saveSnsAccount } from "@/lib/firestore";
import { Sparkles, Crown, Settings, Check, Gift, Clock, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { motion, useSpring, useTransform } from "framer-motion";
import {
  EnergyHistoryModal,
  TotalEarnedModal,
  StreakHistoryModal,
} from "@/components/energy-history-modal";
import { PageLoader } from "@/components/ui/loading-spinner";
import { StreakWarningBanner } from "@/components/streak-celebration";

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
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);

  // 新規登録当日かどうかを判定
  const isFirstDay = (() => {
    if (!userProfile?.createdAt) return false;
    // Timestamp型の場合はtoDate()を呼ぶ、そうでなければDateとして扱う
    const createdAt = userProfile.createdAt as any;
    const createdDate = typeof createdAt.toDate === 'function'
      ? createdAt.toDate()
      : new Date(createdAt);
    const today = new Date();
    return (
      createdDate.getFullYear() === today.getFullYear() &&
      createdDate.getMonth() === today.getMonth() &&
      createdDate.getDate() === today.getDate()
    );
  })();
  const [profile, setProfile] = useState<UserGuardianProfile | null>(null);
  const [todayReported, setTodayReported] = useState(false);
  const [todayEnergy, setTodayEnergy] = useState(0);
  const [streakWarning, setStreakWarning] = useState<{
    shouldWarn: boolean;
    message: string;
    urgency: "info" | "warning" | "critical";
  } | null>(null);
  const [showWarning, setShowWarning] = useState(true);

  // モーダル状態管理
  const [energyModalOpen, setEnergyModalOpen] = useState(false);
  const [totalModalOpen, setTotalModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);

  // SNS設定
  const [snsAccounts, setSnsAccounts] = useState<SnsAccounts>({});
  const [snsLoading, setSnsLoading] = useState(false);
  const [snsMessage, setSnsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 個別SNS保存処理用の状態（フックはトップレベルで宣言する必要がある）
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [inputUrls, setInputUrls] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const data = await getUserGuardianProfile(user.uid);
        if (data) {
          setProfile(data);
        }

        // 今日の報告チェック
        const { getTodayReport } = await import("@/lib/firestore");
        const today = new Date().toISOString().split("T")[0];
        const todayReport = await getTodayReport(user.uid, today);

        if (todayReport) {
          setTodayReported(true);
          // 今日のエナジー取得（energy_historyから取得）
          const { getTodayEnergyHistory } = await import("@/lib/energy-history");
          const todayHistory = await getTodayEnergyHistory(user.uid, today);
          setTodayEnergy(todayHistory?.totalEarned || 0);
        } else {
          // 📅 ストリーク警告ロジック
          const { getLastReport } = await import("@/lib/firestore");
          const lastReport = await getLastReport(user.uid);

          if (lastReport) {
            const lastReportDate = new Date(lastReport.date);
            const now = new Date();
            const hoursSinceLastReport = (now.getTime() - lastReportDate.getTime()) / (1000 * 60 * 60);

            // 20時間経過で警告開始
            if (hoursSinceLastReport >= 20 && hoursSinceLastReport < 23) {
              setStreakWarning({
                shouldWarn: true,
                message: `⚠️ ストリーク継続の危機！あと${Math.floor(24 - hoursSinceLastReport)}時間以内に報告しないと${data?.streak.current || 0}日連続が途切れます`,
                urgency: "warning"
              });
            } else if (hoursSinceLastReport >= 23) {
              setStreakWarning({
                shouldWarn: true,
                message: `🚨 緊急！あと${Math.floor(60 - ((hoursSinceLastReport - 23) * 60))}分でストリークが途切れます！今すぐ報告してください`,
                urgency: "critical"
              });
            }
          }
        }
        // SNSアカウント情報を取得
        const snsData = await getUserSnsAccounts(user.uid);
        if (snsData) {
          setSnsAccounts(snsData);
        }
      } catch (error) {
        console.error("データ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // inputUrlsを初期化（snsAccountsが変更されたとき）
  useEffect(() => {
    const urls: {[key: string]: string} = {};
    const snsKeys = ['instagram', 'youtube', 'tiktok', 'x'] as const;
    snsKeys.forEach(key => {
      const snsData = snsAccounts[key] as SnsAccountApproval | undefined;
      urls[key] = snsData?.url || '';
    });
    setInputUrls(urls);
  }, [snsAccounts]);

  if (loading) {
    return <PageLoader text="マイページを読み込み中..." />;
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

  // レベル計算
  const totalEarned = profile.energy.totalEarned || 0;
  const currentLevel = calculateLevel(totalEarned);
  const levelTitle = getLevelTitle(currentLevel);
  const levelProgress = getEnergyToNextLevel(totalEarned);

  // チームに応じたSNS入力順序
  const teamId = userProfile?.team as keyof typeof SNS_ORDER_BY_TEAM || 'fukugyou';
  const snsOrder = SNS_ORDER_BY_TEAM[teamId] || SNS_ORDER_BY_TEAM.fukugyou;

  const handleSaveSingleSns = async (snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x') => {
    if (!user) return;
    setSavingKey(snsKey);
    setSnsMessage(null);

    try {
      const result = await saveSnsAccount(user.uid, snsKey, inputUrls[snsKey] || '');

      if (result.success) {
        setSnsMessage({ type: 'success', text: result.message });
        // ステート更新
        setSnsAccounts(prev => ({
          ...prev,
          [snsKey]: {
            url: inputUrls[snsKey]?.trim() || undefined,
            status: inputUrls[snsKey]?.trim() ? 'pending' : 'none',
          } as SnsAccountApproval
        }));
      } else {
        setSnsMessage({ type: 'error', text: result.message });
      }
    } catch {
      setSnsMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSavingKey(null);
    }
  };

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
            {/* チュートリアル誘導 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mb-6 text-center"
            >
              <p className="text-xs text-purple-300 mb-2 tracking-wide">
                ✨ 召喚の準備が整いました ✨
              </p>
              <p className="text-xs text-gray-400">
                中央の魔法陣から、あなたの運命の相棒を選んでください
              </p>
            </motion.div>

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
    <div className="space-y-8 md:pb-8">
      {/* ヘッダー */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          マイページ
        </h1>
        <p className="text-xl font-bold text-white">
          {user.displayName || user.email}さんの冒険の記録
        </p>
      </div>

      {/* ⚠️ ストリーク警告バナー */}
      {streakWarning && showWarning && (
        <StreakWarningBanner
          warning={streakWarning}
          onClose={() => setShowWarning(false)}
        />
      )}

      {/* 📅 今日の報告ステータス */}
      {todayReported ? (
        <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-center animate-in fade-in duration-500">
          <span className="text-6xl mb-4 block animate-bounce">✅</span>
          <h3 className="text-2xl font-bold text-green-400 mb-2">今日の報告完了！</h3>
          <p className="text-slate-300 text-lg mb-1">獲得エナジー: <span className="text-yellow-400 font-bold">+{todayEnergy}E</span></p>
          <p className="text-sm text-slate-400 mt-3">
            次の報告: 明日の0時以降
          </p>
        </div>
      ) : isFirstDay ? (
        /* 新規登録当日はウェルカムメッセージを表示 */
        <div className="bg-purple-500/20 border-2 border-purple-500 rounded-xl p-6 text-center animate-in fade-in duration-500">
          <span className="text-6xl mb-4 block">✨</span>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            ようこそ、契約者よ！
          </h3>
          <p className="text-slate-300 mb-4">
            守護神との契約が完了しました。<br />
            これからあなたの成長の旅が始まります。
          </p>

          {/* 次のステップ案内 */}
          <div className="bg-black/30 rounded-xl p-4 mt-4 text-left">
            <p className="text-sm text-purple-300 font-bold mb-3 text-center">
              📋 はじめの一歩
            </p>
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">1.</span>
                <span><strong>明日から日報を報告</strong>して、エナジーを獲得しましょう</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">2.</span>
                <span>獲得したエナジーを<strong>守護神に投資</strong>して進化させましょう</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">3.</span>
                <span><strong>連続報告（ストリーク）</strong>でボーナスエナジーを獲得！</span>
              </li>
            </ul>
          </div>

          <p className="text-slate-400 text-xs mt-4">
            守護神があなたの成長を見守っています ✨
          </p>
        </div>
      ) : (
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 text-center animate-pulse">
          <span className="text-6xl mb-4 block">⚠️</span>
          <h3 className="text-2xl font-bold text-red-400 mb-2">今日の報告がまだです</h3>
          <p className="text-slate-300 mb-4">ストリークを維持するために報告しましょう</p>
          <Link href="/report">
            <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold px-8 py-3 text-lg">
              今すぐ報告する 🔥
            </Button>
          </Link>
        </div>
      )}

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

              {/* 🎯 進化予告表示 */}
              {(() => {
                const evolutionInfo = getEnergyToNextStage(investedEnergy, activeGuardianId as GuardianId);
                if (!evolutionInfo) return null; // 究極体は進化不可

                const nextStage = EVOLUTION_STAGES[stage + 1];
                const progressPercent = Math.round((evolutionInfo.current / evolutionInfo.required) * 100);

                return (
                  <div
                    className="mt-6 p-4 rounded-xl border-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{
                      backgroundColor: `${attr.color}05`,
                      borderColor: `${attr.color}40`,
                      boxShadow: `0 0 20px ${attr.color}20`
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5" style={{ color: attr.color }} />
                      <h3 className="font-bold" style={{ color: attr.color }}>
                        次の進化まで
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {/* 次の進化段階情報 */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">目標</p>
                          <p className="font-bold text-white text-lg">
                            {nextStage.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">必要エナジー</p>
                          <p className="font-bold text-yellow-400 text-2xl">
                            {evolutionInfo.remaining}E
                          </p>
                        </div>
                      </div>

                      {/* プログレスバー */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">進化までの進捗</span>
                          <span className="font-bold" style={{ color: attr.color }}>
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="relative w-full h-6 bg-black/40 rounded-full overflow-hidden border-2 border-white/20">
                          <div
                            className="h-full transition-all duration-1000 flex items-center justify-center"
                            style={{
                              width: `${progressPercent}%`,
                              background: `linear-gradient(90deg, ${attr.color}, ${attr.gradientTo})`,
                              boxShadow: `0 0 15px ${attr.color}`,
                            }}
                          >
                            {progressPercent > 20 && (
                              <span className="text-xs font-bold text-white drop-shadow-lg">
                                {evolutionInfo.current} / {evolutionInfo.required}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 励ましメッセージ */}
                      <div className="text-center pt-2">
                        {evolutionInfo.remaining <= 50 ? (
                          <p className="text-sm font-medium" style={{ color: attr.color }}>
                            🔥 もう少しで進化！あと {evolutionInfo.remaining}E 稼ごう！
                          </p>
                        ) : evolutionInfo.remaining <= 100 ? (
                          <p className="text-sm text-slate-300">
                            💪 着実に成長中！このペースで続けよう
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">
                            🌱 毎日の報告が成長への近道です
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
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
      <div className="grid gap-4 grid-cols-3">
        {/* 保有エナジー */}
        <motion.div
          initial={{ scale: 0, rotateY: -180 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0 }}
          onClick={() => setEnergyModalOpen(true)}
          className="jewel-card glass-premium p-4 rounded-2xl border border-white/20 cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="text-center relative">
            {/* 神聖アセット: エナジーオーブ */}
            <div className="neon-icon-wrapper mx-auto mb-2 relative w-12 h-12">
              <Image
                src="/images/ui/energy-orb.png"
                alt="Energy"
                width={48}
                height={48}
                className="relative z-10 guardian-floating"
                style={{
                  filter: 'drop-shadow(0 0 15px rgba(250, 204, 21, 0.8))'
                }}
              />
              <div className="neon-glow absolute inset-0 bg-yellow-400/50 rounded-full" />
            </div>
            
            {/* ラベル */}
            <p className="stat-label text-xs mb-1 text-gray-300 whitespace-nowrap">保有<br className="sm:hidden"/>エナジー</p>
            {/* 世界観テキスト */}
            <p className="text-[9px] text-gray-500 mb-2 leading-tight">進化の力</p>
            
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
          onClick={() => setTotalModalOpen(true)}
          className="jewel-card glass-premium p-4 rounded-2xl border border-white/20 cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="text-center relative">
            {/* 神聖アセット: ジェム */}
            <div className="neon-icon-wrapper mx-auto mb-2 relative w-12 h-12">
              <Image
                src="/images/ui/gem.png"
                alt="Gem"
                width={48}
                height={48}
                className="relative z-10 guardian-floating"
                style={{
                  filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.8))'
                }}
              />
              <div className="neon-glow absolute inset-0 bg-purple-400/50 rounded-full" />
            </div>
            
            {/* ラベル */}
            <p className="stat-label text-xs mb-1 text-gray-300 whitespace-nowrap">累計<br className="sm:hidden"/>獲得</p>
            {/* 世界観テキスト */}
            <p className="text-[9px] text-gray-500 mb-2 leading-tight">冒険の証</p>
            
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
          onClick={() => setStreakModalOpen(true)}
          className="jewel-card glass-premium p-4 rounded-2xl border border-white/20 cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="text-center relative">
            {/* 神聖アセット: ストリーク炎 */}
            <div className="neon-icon-wrapper mx-auto mb-2 relative w-12 h-12">
              <Image
                src="/images/ui/streak-1.png"
                alt="Streak"
                width={48}
                height={48}
                className="relative z-10 guardian-floating"
                style={{
                  filter: 'drop-shadow(0 0 15px rgba(251, 146, 60, 0.8))'
                }}
              />
              <div className="neon-glow absolute inset-0 bg-orange-400/50 rounded-full" />
            </div>
            
            {/* ラベル */}
            <p className="stat-label text-xs mb-1 text-gray-300 whitespace-nowrap">ストリーク</p>
            {/* 世界観テキスト */}
            <p className="text-[9px] text-gray-500 mb-2 leading-tight">連続の絆</p>
            
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

      {/* 💎 エナジー獲得の内訳 */}
      <GlassCard glowColor="#F59E0B" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">エナジー獲得の内訳</h2>
        </div>

        <div className="space-y-3">
          {/* ベースエナジー */}
          <div className="glass-bg p-4 rounded-xl border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-xl">📝</span>
                </div>
                <div>
                  <p className="font-bold text-white">日報提出</p>
                  <p className="text-xs text-gray-400">毎日の基本報酬</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-400">+10E</p>
            </div>
          </div>

          {/* ストリークボーナス */}
          {profile.streak.current >= 3 && (
            <div className="glass-bg p-4 rounded-xl border border-orange-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Image src="/images/ui/streak-1.png" alt="Streak" width={20} height={20} className="opacity-80" />
                </div>
                  <div>
                    <p className="font-bold text-white">ストリークボーナス</p>
                    <p className="text-xs text-gray-400">
                      {profile.streak.current}日連続報告中 🔥
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-orange-400">
                  +{Math.min(profile.streak.current * 2, 20)}E
                </p>
              </div>
            </div>
          )}

          {/* 成果ボーナス */}
          <div className="glass-bg p-4 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Image src="/images/ui/gem.png" alt="Performance" width={20} height={20} className="opacity-80" />
                </div>
                <div>
                  <p className="font-bold text-white">成果ボーナス</p>
                  <p className="text-xs text-gray-400">
                    再生数・活動量に応じて変動
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-400">変動</p>
            </div>
          </div>

          {/* 週次ボーナス */}
          <div className="glass-bg p-4 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-white">週次ボーナス</p>
                  <p className="text-xs text-gray-400">
                    週間目標達成時
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-400">+50E</p>
            </div>
          </div>
        </div>

        {/* エナジー獲得のヒント */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
          <p className="text-sm text-gray-300 mb-2">
            💡 <span className="font-bold">エナジーを効率よく獲得するコツ</span>
          </p>
          <ul className="text-xs text-gray-400 space-y-1 ml-4">
            <li>• 毎日報告を続けてストリークボーナスを最大化</li>
            <li>• 高い成果（再生数・活動量）で追加ボーナス獲得</li>
            <li>• 週間目標を達成して大量エナジーを獲得</li>
          </ul>
        </div>
      </GlassCard>

      {/* クイックアクション */}
      <div className="grid gap-4 grid-cols-3">
        <Link href="/report">
          <GlassCard glowColor="#22C55E" className="p-4 cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="text-center">
              <div className="text-4xl mb-2">📝</div>
              <h3 className="text-sm font-bold mb-1 whitespace-nowrap">今日の<br className="sm:hidden"/>報告</h3>
              <p className="text-xs text-muted-foreground leading-tight">
                エナジー獲得
              </p>
            </div>
          </GlassCard>
        </Link>

        <Link href="/guardians">
          <GlassCard glowColor="#8B5CF6" className="p-4 cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="text-center">
              <div className="text-4xl mb-2">🛡️</div>
              <h3 className="text-sm font-bold mb-1 whitespace-nowrap">守護神</h3>
              <p className="text-xs text-muted-foreground leading-tight">
                進化させよう
              </p>
            </div>
          </GlassCard>
        </Link>

        <Link href="/ranking">
          <GlassCard glowColor="#EAB308" className="p-4 cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="text-center">
              <div className="text-4xl mb-2">🏆</div>
              <h3 className="text-sm font-bold mb-1 whitespace-nowrap">ランキング</h3>
              <p className="text-xs text-muted-foreground leading-tight">
                競い合おう
              </p>
            </div>
          </GlassCard>
        </Link>
      </div>

      {/* 🎯 レベル & 称号 */}
      <GlassCard glowColor="#F59E0B" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">レベル & 称号</h2>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* レベル表示 */}
          <div className="text-center">
            <p className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400">
              Lv.{currentLevel}
            </p>
            <p className="text-xl font-bold text-purple-400 mt-2">
              {levelTitle}
            </p>
          </div>

          {/* レベル進捗バー */}
          {levelProgress && (
            <div className="flex-1 w-full">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Lv.{levelProgress.currentLevel}</span>
                <span>Lv.{levelProgress.nextLevel}</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                次のレベルまで あと {levelProgress.remaining}E
              </p>
            </div>
          )}

          {currentLevel >= 999 && (
            <div className="flex-1 text-center">
              <p className="text-xl text-yellow-400 font-bold">MAX LEVEL!</p>
              <p className="text-sm text-slate-400 mt-1">最高レベルに到達しました</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* 📱 SNSアカウント設定（個別承認対応） */}
      <GlassCard glowColor="#3B82F6" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">SNSアカウント設定</h2>
        </div>

        {/* 全SNS承認完了時のボーナス表示 */}
        {snsAccounts.completionBonusClaimed && (
          <div className="glass-bg p-3 rounded-xl border border-green-500/30 mb-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">全SNS承認済み・ボーナス{PROFILE_COMPLETION_BONUS}E受取済み</p>
          </div>
        )}

        {/* ボーナス案内（ボーナス未受取の場合） */}
        {!snsAccounts.completionBonusClaimed && (
          <div className="glass-bg p-3 rounded-xl border border-yellow-500/30 mb-4 flex items-center gap-3">
            <Gift className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-300">
                全4つのSNSが承認されると <span className="font-bold">{PROFILE_COMPLETION_BONUS}エナジー</span> 獲得！
              </p>
              <p className="text-xs text-yellow-300/70">※各SNSのプロフィールページURLを入力して個別に送信してください</p>
            </div>
          </div>
        )}

        {/* SNS入力フォーム（個別承認対応） */}
        <div className="space-y-4">
          {snsOrder.map((snsKey) => {
            const snsInfo = SNS_LABELS[snsKey];
            const snsData = snsAccounts[snsKey] as SnsAccountApproval | undefined;
            const status = snsData?.status || 'none';
            const isApproved = status === 'approved';
            const isPending = status === 'pending';
            const isRejected = status === 'rejected';
            const currentUrl = inputUrls[snsKey] || '';
            const hasChanged = currentUrl !== (snsData?.url || '');

            return (
              <div key={snsKey} className="glass-bg p-4 rounded-xl">
                {/* ヘッダー：SNS名とステータス */}
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2 text-white">
                    <span className="text-lg">{snsInfo.icon}</span>
                    {snsInfo.label}
                  </Label>
                  {/* ステータスバッジ */}
                  {isApproved && (
                    <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                      <Check className="w-3 h-3" /> 承認済み
                    </span>
                  )}
                  {isPending && (
                    <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3 animate-pulse" /> 審査中
                    </span>
                  )}
                  {isRejected && (
                    <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                      <AlertCircle className="w-3 h-3" /> 却下
                    </span>
                  )}
                </div>

                {/* 却下理由 */}
                {isRejected && snsData?.rejectionReason && (
                  <p className="text-xs text-red-300/70 mb-2">却下理由: {snsData.rejectionReason}</p>
                )}

                {/* URL入力 + 送信ボタン */}
                <div className="flex gap-2">
                  <Input
                    placeholder={snsInfo.placeholder}
                    value={currentUrl}
                    onChange={(e) => setInputUrls(prev => ({
                      ...prev,
                      [snsKey]: e.target.value
                    }))}
                    disabled={isApproved}
                    className={`flex-1 bg-white/5 border-slate-600 ${isApproved ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                  {!isApproved && (
                    <Button
                      onClick={() => handleSaveSingleSns(snsKey)}
                      disabled={savingKey === snsKey || (!hasChanged && !isRejected)}
                      size="sm"
                      className={`px-4 ${
                        hasChanged || isRejected
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {savingKey === snsKey ? '...' : isRejected ? '再申請' : '送信'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* メッセージ表示 */}
        {snsMessage && (
          <div className={`mt-4 p-3 rounded-xl ${
            snsMessage.type === 'success'
              ? 'bg-green-500/20 border border-green-500/30 text-green-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}>
            {snsMessage.text}
          </div>
        )}
      </GlassCard>

      {/* モーダル */}
      <EnergyHistoryModal
        isOpen={energyModalOpen}
        onClose={() => setEnergyModalOpen(false)}
        userId={user.uid}
      />
      
      <TotalEarnedModal
        isOpen={totalModalOpen}
        onClose={() => setTotalModalOpen(false)}
        userId={user.uid}
        totalEarned={profile.energy.totalEarned}
      />
      
      <StreakHistoryModal
        isOpen={streakModalOpen}
        onClose={() => setStreakModalOpen(false)}
        userId={user.uid}
        currentStreak={profile.streak.current}
        maxStreak={profile.streak.max}
      />
    </div>
  );
}
