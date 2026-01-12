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
import { getUserSnsAccounts, saveSnsAccount, saveSnsAccounts } from "@/lib/firestore";
import { Sparkles, Crown, Settings, Check, Gift, Clock, AlertCircle, Zap, ArrowRight, ChevronDown } from "lucide-react";
import EnergyInvestmentModal from "@/components/energy-investment-modal";
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
  const [inputUrls, setInputUrls] = useState<{ [key: string]: string }>({});

  // エナジー投資モーダル
  const [showEnergyModal, setShowEnergyModal] = useState(false);

  // SNS設定の折りたたみ状態
  const [snsExpanded, setSnsExpanded] = useState(false);

  // エナジー内訳の折りたたみ状態
  const [energyBreakdownExpanded, setEnergyBreakdownExpanded] = useState(false);

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
    const urls: { [key: string]: string } = {};
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

  // 一括保存処理（入力されているすべてのURLを一括で送信）
  const handleSaveAllSns = async () => {
    if (!user) return;
    setSavingKey('all');
    setSnsMessage(null);

    try {
      const result = await saveSnsAccounts(user.uid, {
        instagram: inputUrls.instagram || '',
        youtube: inputUrls.youtube || '',
        tiktok: inputUrls.tiktok || '',
        x: inputUrls.x || ''
      });

      if (result.success) {
        setSnsMessage({ type: 'success', text: result.message });
        // ステート更新（変更されたSNSのみ）
        const snsKeys = ['instagram', 'youtube', 'tiktok', 'x'] as const;
        setSnsAccounts(prev => {
          const updated = { ...prev };
          for (const key of snsKeys) {
            const url = inputUrls[key]?.trim();
            const current = prev[key] as SnsAccountApproval | undefined;
            // 承認済みはスキップ、URLが変更された場合のみ更新
            if (current?.status !== 'approved' && url && url !== current?.url) {
              updated[key] = {
                url,
                status: 'pending' as const,
              } as SnsAccountApproval;
            }
          }
          return updated;
        });
      } else {
        setSnsMessage({ type: 'error', text: result.message });
      }
    } catch {
      setSnsMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSavingKey(null);
    }
  };

  // 変更があるかどうかをチェック（一括送信ボタンの有効/無効判定用）
  const hasAnyChanges = (() => {
    const snsKeys = ['instagram', 'youtube', 'tiktok', 'x'] as const;
    for (const key of snsKeys) {
      const snsData = snsAccounts[key] as SnsAccountApproval | undefined;
      if (snsData?.status === 'approved') continue; // 承認済みはスキップ
      const currentUrl = inputUrls[key]?.trim() || '';
      const savedUrl = snsData?.url || '';
      if (currentUrl !== savedUrl) return true;
    }
    return false;
  })();

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
    <div className="space-y-4 md:space-y-6 md:pb-8">
      {/* ヘッダー - コンパクト */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            マイページ
          </h1>
          <p className="text-sm text-slate-400">
            {user.displayName || user.email}
          </p>
        </div>
      </div>

      {/* ⚠️ ストリーク警告バナー */}
      {streakWarning && showWarning && (
        <StreakWarningBanner
          warning={streakWarning}
          onClose={() => setShowWarning(false)}
        />
      )}

      {/* 📅 今日の報告ステータス - コンパクト */}
      {todayReported ? (
        <div className="bg-green-500/15 border border-green-500/40 rounded-lg p-3 flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-400">今日の報告完了！</p>
            <p className="text-xs text-slate-400">獲得: <span className="text-yellow-400 font-medium">+{todayEnergy}E</span></p>
          </div>
        </div>
      ) : isFirstDay ? (
        /* 新規登録当日はウェルカムメッセージを表示 - コンパクト */
        <div className="bg-purple-500/15 border border-purple-500/40 rounded-lg p-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✨</span>
            <p className="font-semibold text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ようこそ、契約者よ！
            </p>
          </div>
          <p className="text-xs text-slate-400">
            明日から日報を報告してエナジーを獲得しましょう
          </p>
        </div>
      ) : (
        <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">今日の報告がまだです</p>
            <p className="text-xs text-slate-400">ストリークを維持しましょう</p>
          </div>
          <Link href="/report">
            <Button size="sm" className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-3 py-1.5 h-auto">
              報告する
            </Button>
          </Link>
        </div>
      )}

      {/* 🎯 レベル & 称号 - コンパクト */}
      <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{currentLevel}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-400">Lv.{currentLevel}</p>
              <p className="text-xs text-purple-400 font-medium">{levelTitle}</p>
            </div>
          </div>
          {levelProgress && (
            <div className="flex-1 max-w-[120px] ml-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-right">
                次まで {levelProgress.remaining}E
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 守護神エリア - コンパクト */}
      <GlassCard glowColor={attr.color} className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* 守護神表示 - 横並び */}
          <div className="flex items-center gap-3">
            {/* 守護神画像 - 小さく */}
            <div className="flex-shrink-0 relative">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center relative overflow-hidden"
                style={{
                  background: placeholder.background,
                  border: `2px solid ${attr.color}`,
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
                  <span className="text-4xl">{placeholder.emoji}</span>
                </div>
              </div>

              {/* Stage表示 */}
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: attr.color }}
                >
                  S{stage}
                </div>
              </div>
            </div>

            {/* 守護神情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xl">{attr.emoji}</span>
                <h2 className="text-lg sm:text-xl font-bold truncate" style={{ color: attr.color }}>
                  {activeGuardian.name}
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                {stageInfo.name} • {attr.name}属性
              </p>

              {/* ステータス - インライン */}
              <div className="flex gap-2">
                <div className="flex-1 bg-black/30 rounded-lg p-1.5 text-center">
                  <p className="text-[9px] text-slate-400">投資済み</p>
                  <p className="text-sm font-bold text-purple-400">{investedEnergy}E</p>
                </div>
                <div className="flex-1 bg-black/30 rounded-lg p-1.5 text-center">
                  <p className="text-[9px] text-slate-400">オーラ</p>
                  <p className="text-sm font-bold text-pink-400">{auraLevel}%</p>
                </div>
              </div>
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

                  {/* 励ましメッセージ or 進化可能ボタン */}
                  <div className="text-center pt-2">
                    {profile.energy.current >= evolutionInfo.remaining ? (
                      /* 進化可能！ */
                      <button
                        onClick={() => setShowEnergyModal(true)}
                        className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 text-white transition-all flex items-center justify-center gap-2 animate-pulse shadow-lg"
                        style={{
                          boxShadow: `0 0 30px rgba(250, 204, 21, 0.6)`
                        }}
                      >
                        <Zap className="w-6 h-6" />
                        今すぐ進化可能！ タップして進化させよう
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    ) : evolutionInfo.remaining <= 50 ? (
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

                  {/* エナジー投資ボタン（進化可能でない場合も表示） */}
                  {profile.energy.current < evolutionInfo.remaining && profile.energy.current > 0 && (
                    <button
                      onClick={() => setShowEnergyModal(true)}
                      className="w-full mt-3 py-2 rounded-lg font-medium text-sm border-2 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                      style={{
                        borderColor: attr.color,
                        color: attr.color,
                        backgroundColor: `${attr.color}10`
                      }}
                    >
                      <Zap className="w-4 h-4" />
                      エナジーを投資して進化を早める
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 特性 */}
          {stage >= 3 && (
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: `${attr.color}08`,
                borderColor: `${attr.color}40`,
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: attr.color }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: attr.color }}>
                    特性: {activeGuardian.ability.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {activeGuardian.ability.description}
                  </p>
                </div>
                <div className="text-green-400 font-bold text-xs">
                  ✓ 発動中
                </div>
              </div>
            </div>
          )
          }
        </div >
      </GlassCard >

      {/* 📊 6カード統合グリッド（3x2） - PWAモバイル対応・同サイズ統一 */}
      <div className="grid gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {/* 保有エナジー */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0 }}
          onClick={() => setEnergyModalOpen(true)}
          className="glass-premium p-3 rounded-xl border border-yellow-500/30 cursor-pointer active:scale-95 transition-transform aspect-square flex flex-col items-center justify-center"
        >
          <div className="w-8 h-8 mb-1">
            <Image
              src="/images/ui/energy-orb.png"
              alt="Energy"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.8))' }}
            />
          </div>
          <p className="text-[10px] text-gray-400 text-center leading-tight">保有エナジー</p>
          <p className="text-lg font-bold text-yellow-400">
            <AnimatedNumber value={profile.energy.current} />
          </p>
        </motion.div>

        {/* 累計獲得 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          onClick={() => setTotalModalOpen(true)}
          className="glass-premium p-3 rounded-xl border border-purple-500/30 cursor-pointer active:scale-95 transition-transform aspect-square flex flex-col items-center justify-center"
        >
          <div className="w-8 h-8 mb-1">
            <Image
              src="/images/ui/gem.png"
              alt="Gem"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.8))' }}
            />
          </div>
          <p className="text-[10px] text-gray-400 text-center leading-tight">累計獲得</p>
          <p className="text-lg font-bold text-purple-400">
            <AnimatedNumber value={profile.energy.totalEarned} />
          </p>
        </motion.div>

        {/* 連続報告 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={() => setStreakModalOpen(true)}
          className="glass-premium p-3 rounded-xl border border-orange-500/30 cursor-pointer active:scale-95 transition-transform aspect-square flex flex-col items-center justify-center"
        >
          <div className="w-8 h-8 mb-1">
            <Image
              src="/images/ui/streak-1.png"
              alt="Streak"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 6px rgba(251, 146, 60, 0.8))' }}
            />
          </div>
          <p className="text-[10px] text-gray-400 text-center leading-tight">連続報告</p>
          <p className="text-lg font-bold text-orange-400">
            <AnimatedNumber value={profile.streak.current} /><span className="text-xs">日</span>
          </p>
        </motion.div>

        {/* 日報 */}
        <Link
          href="/report"
          className="glass-premium p-3 rounded-xl border border-green-500/30 cursor-pointer active:scale-95 transition-all aspect-square flex flex-col items-center justify-center"
        >
          <div className="text-3xl mb-1">📝</div>
          <p className="text-[10px] text-gray-400 text-center leading-tight">日報</p>
          <p className="text-xs font-bold text-green-400">入力する</p>
        </Link>

        {/* 守護神図鑑 */}
        <Link
          href="/guardians"
          className="glass-premium p-3 rounded-xl border border-purple-500/30 cursor-pointer active:scale-95 transition-all aspect-square flex flex-col items-center justify-center"
        >
          <div className="text-3xl mb-1">🛡️</div>
          <p className="text-[10px] text-gray-400 text-center leading-tight">守護神図鑑</p>
          <p className="text-xs font-bold text-purple-400">見る</p>
        </Link>

        {/* ランキング */}
        <Link
          href="/ranking"
          className="glass-premium p-3 rounded-xl border border-yellow-500/30 cursor-pointer active:scale-95 transition-all aspect-square flex flex-col items-center justify-center"
        >
          <div className="text-3xl mb-1">🏆</div>
          <p className="text-[10px] text-gray-400 text-center leading-tight">ランキング</p>
          <p className="text-xs font-bold text-yellow-400">確認</p>
        </Link>
      </div>

      {/* 💎 エナジー獲得の内訳 - 折りたたみ式 */}
      <div className="glass-bg rounded-xl border border-yellow-500/20 overflow-hidden">
        <button
          onClick={() => setEnergyBreakdownExpanded(!energyBreakdownExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">エナジー獲得の内訳</h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${energyBreakdownExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {energyBreakdownExpanded && (
          <div className="p-3 pt-0 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2">
              {/* 日報提出 */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <span className="text-xs text-white">日報提出</span>
                </div>
                <span className="text-sm font-bold text-green-400">+10E</span>
              </div>
              {/* ストリーク */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-xs text-white">ストリーク</span>
                </div>
                <span className="text-sm font-bold text-orange-400">+{Math.min((profile.streak.current || 0) * 2, 20)}E</span>
              </div>
              {/* 成果 */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <span className="text-xs text-white">成果</span>
                </div>
                <span className="text-sm font-bold text-purple-400">変動</span>
              </div>
              {/* 週次 */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <span className="text-xs text-white">週次目標</span>
                </div>
                <span className="text-sm font-bold text-blue-400">+50E</span>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* 📱 SNSアカウント設定 - 折りたたみ式 */}
      <div className="glass-bg rounded-xl border border-blue-500/20 overflow-hidden">
        {/* ヘッダー（クリックで展開） */}
        <button
          onClick={() => setSnsExpanded(!snsExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">SNSアカウント設定</h3>
            {snsAccounts.completionBonusClaimed && (
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">完了</span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${snsExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* 展開コンテンツ */}
        {snsExpanded && (
          <div className="p-3 pt-0 border-t border-white/10">
            {/* 全SNS承認完了時のボーナス表示 */}
            {snsAccounts.completionBonusClaimed && (
              <div className="p-2 rounded-lg border border-green-500/30 mb-3 flex items-center gap-2 bg-green-500/10">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-300">全SNS承認済み・ボーナス{PROFILE_COMPLETION_BONUS}E受取済み</p>
              </div>
            )}

            {/* ボーナス案内（ボーナス未受取の場合） */}
            {!snsAccounts.completionBonusClaimed && (
              <div className="p-2 rounded-lg border border-yellow-500/30 mb-3 flex items-center gap-2 bg-yellow-500/10">
                <Gift className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-xs text-yellow-300">
                  4SNS承認で <span className="font-bold">{PROFILE_COMPLETION_BONUS}E</span> 獲得！
                </p>
              </div>
            )}

            {/* SNS入力フォーム（コンパクト） */}
            <div className="space-y-2">
              {snsOrder.map((snsKey) => {
                const snsInfo = SNS_LABELS[snsKey];
                const snsData = snsAccounts[snsKey] as SnsAccountApproval | undefined;
                const status = snsData?.status || 'none';
                const isApproved = status === 'approved';
                const isPending = status === 'pending';
                const isRejected = status === 'rejected';
                const currentUrl = inputUrls[snsKey] || '';

                return (
                  <div key={snsKey} className="flex items-center gap-2">
                    <span className="text-lg w-6 flex-shrink-0">{snsInfo.icon}</span>
                    <Input
                      placeholder={snsInfo.placeholder}
                      value={currentUrl}
                      onChange={(e) => setInputUrls(prev => ({
                        ...prev,
                        [snsKey]: e.target.value
                      }))}
                      disabled={isApproved || isPending}
                      className={`flex-1 h-8 text-xs bg-white/5 border-slate-600 ${(isApproved || isPending) ? 'opacity-60' : ''}`}
                    />
                    {isApproved && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    {isPending && <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse" />}
                    {isRejected && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* 一括送信ボタン */}
            <Button
              onClick={handleSaveAllSns}
              disabled={savingKey === 'all' || !hasAnyChanges}
              className={`w-full mt-3 h-9 text-sm font-bold ${hasAnyChanges
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                : 'bg-slate-600 cursor-not-allowed'
                }`}
            >
              {savingKey === 'all' ? '送信中...' : hasAnyChanges ? '一括送信' : '変更なし'}
            </Button>

            {/* メッセージ表示 */}
            {snsMessage && (
              <div className={`mt-2 p-2 rounded-lg text-xs ${snsMessage.type === 'success'
                ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                : 'bg-red-500/20 border border-red-500/30 text-red-300'
                }`}>
                {snsMessage.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* モーダル */}
      < EnergyHistoryModal
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

      {/* エナジー投資モーダル */}
      {
        activeGuardianId && showEnergyModal && (
          <EnergyInvestmentModal
            guardianId={activeGuardianId}
            profile={profile}
            userId={user.uid}
            onClose={() => setShowEnergyModal(false)}
            onSuccess={async () => {
              setShowEnergyModal(false);
              // プロファイルを再読み込み
              const data = await getUserGuardianProfile(user.uid);
              if (data) {
                setProfile(data);
              }
            }}
          />
        )
      }
    </div >
  );
}
