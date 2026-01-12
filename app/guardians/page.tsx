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
  EVOLUTION_STAGES,
  getAuraLevel,
  canUnlockGuardian,
  getPlaceholderStyle,
  getGuardianImagePath
} from "@/lib/guardian-collection";
import { Lock, Zap, Star, ChevronRight, X, Heart, Sparkles, ClipboardList, ArrowRight } from "lucide-react";
import EnergyInvestmentModal from "@/components/energy-investment-modal";
import GuardianSummoning from "@/components/guardian-summoning";
import GuardianUnlockAnimation from "@/components/guardian-unlock-animation";

// 守護神の性格・特徴データ
const GUARDIAN_PERSONALITIES: Record<GuardianId, {
  personality: string;
  traits: string[];
  backstory: string;
  favoriteThings: string[];
  quote: string;
}> = {
  horyu: {
    personality: "勇敢で正義感が強い",
    traits: ["リーダーシップ", "決断力", "熱血"],
    backstory: "古来より炎の山に住む伝説の龍。困難に立ち向かう者を守護する。",
    favoriteThings: ["挑戦", "成長", "仲間"],
    quote: "炎のように燃え上がれ！君の可能性は無限大だ！"
  },
  shishimaru: {
    personality: "冷静沈着で知恵に溢れる",
    traits: ["戦略性", "忍耐力", "洞察力"],
    backstory: "森の奥深くで瞑想する白獅子。静かな力で導く賢者。",
    favoriteThings: ["思考", "計画", "瞑想"],
    quote: "焦らず、着実に。真の強さは心の平穏から生まれる。"
  },
  hanase: {
    personality: "優しく穏やかで癒しの存在",
    traits: ["共感力", "包容力", "癒し"],
    backstory: "花園に住む精霊。疲れた心を癒し、再び歩む力を与える。",
    favoriteThings: ["自然", "調和", "笑顔"],
    quote: "大丈夫、一歩ずつでいいの。あなたは一人じゃないわ。"
  },
  shiroko: {
    personality: "神秘的で直感力が鋭い",
    traits: ["直感", "神秘", "変化適応"],
    backstory: "月光に照らされた湖に現れる白狐。未来を予見し導く。",
    favoriteThings: ["月夜", "静寂", "変化"],
    quote: "運命は変えられる。君の選択が未来を創る。"
  },
  kitama: {
    personality: "好奇心旺盛でエネルギッシュ",
    traits: ["活発", "創造性", "楽観性"],
    backstory: "黄金の森で踊る妖精。笑顔と希望を運ぶ使者。",
    favoriteThings: ["冒険", "発見", "お祭り"],
    quote: "楽しもう！人生は一度きりの大冒険だよ！"
  },
  hoshimaru: {
    personality: "高貴で威厳があり完璧主義",
    traits: ["完璧主義", "野心", "カリスマ"],
    backstory: "星々の彼方から降臨した究極の守護神。選ばれし者のみと契約する。",
    favoriteThings: ["完璧", "達成", "栄光"],
    quote: "限界など存在しない。我と共に頂へ登るのだ。"
  },
  // T3 エンドコンテンツ
  ryuoh: {
    personality: "威厳に満ちた王者",
    traits: ["覇気", "無限の闘志", "統率力"],
    backstory: "火龍と獅子丸の魂が融合して生まれた伝説の龍王。その咆哮はチーム全体を奮い立たせる。",
    favoriteThings: ["勝利", "栄光", "仲間の成長"],
    quote: "我と共に頂点へ。全ての障壁を打ち砕け！"
  },
  koukirin: {
    personality: "神聖で慈愛に満ちた存在",
    traits: ["祝福", "神秘", "幸運"],
    backstory: "花精と白狐の魂が昇華して現れた聖なる麒麟。その存在は全てに幸運をもたらす。",
    favoriteThings: ["調和", "祝福", "奇跡"],
    quote: "あなたには神の加護がある。恐れるものは何もない。"
  },
  tenshin: {
    personality: "超越的な叡智を持つ",
    traits: ["全知", "宇宙的視野", "最適解"],
    backstory: "機珠と星丸が融合した宇宙的知性体。全ての道を見通し、最適な選択へと導く。",
    favoriteThings: ["真理", "効率", "進化"],
    quote: "宇宙の摂理が君を導く。最善の道は既に見えている。"
  },
};

export default function GuardiansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const investParam = searchParams.get("invest");

  const [profile, setProfile] = useState<UserGuardianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianId | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [showSummoning, setShowSummoning] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [unlockingGuardianId, setUnlockingGuardianId] = useState<GuardianId | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // ページ遷移時にスクロールをトップにリセット
    window.scrollTo(0, 0);

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // URLパラメータでエナジー投資モーダルを自動で開く
  useEffect(() => {
    if (investParam && profile) {
      const guardianId = investParam as GuardianId;
      const guardian = profile.guardians[guardianId];
      if (guardian?.unlocked) {
        setSelectedGuardian(guardianId);
        setShowEnergyModal(true);
        // URLからパラメータを削除
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

        // 守護神を1体も持っていない場合は召喚画面を表示
        // （途中離脱後の再ログインでも召喚フローに戻れるようにする）
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">プロファイルが見つかりません</div>
      </div>
    );
  }

  const allGuardians = Object.values(GUARDIANS);

  // 進捗計算：各守護神のstage 1-4 を含めて計算（stage 0は卵なので除外）
  // 6体 × 4段階 = 24コレクション
  const unlockedStagesCount = Object.values(profile.guardians)
    .filter(g => g?.unlocked)
    .reduce((sum, g) => sum + Math.max(0, g.stage), 0); // stage 1-4 のみカウント
  const totalStages = allGuardians.length * 4; // 6体 × 4段階 = 24
  const completionPercentage = Math.round((unlockedStagesCount / totalStages) * 100);

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            🛡️ 守護神図鑑
          </h1>
          <p className="text-slate-300">
            コレクション進捗: <span className="text-2xl font-bold text-purple-400">{unlockedStagesCount}</span>
            <span className="text-slate-400"> / {totalStages}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400 mb-1">保有エナジー</p>
          <p className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
            <Zap className="w-8 h-8" />
            {profile.energy.current}
          </p>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="glass-premium p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">図鑑完成度</span>
          <span className="text-sm font-bold text-purple-400">
            {completionPercentage}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 transition-all duration-1000"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* 新規メンバー向けガイダンスカード */}
      {unlockedStagesCount === 0 && (
        <div className="glass-premium p-6 rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                守護神を育てよう！
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                毎日の日報報告でエナジーを獲得して、守護神を進化させましょう。
                継続報告でボーナスエナジーも獲得できます！
              </p>
              <button
                onClick={() => router.push("/report")}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-5 h-5" />
                日報報告を始める
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 守護神図鑑（スタンプカード風） */}
      <div className="glass-premium p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">守護神コレクション</h2>
          <p className="text-sm text-slate-400">タップで詳細を見る</p>
        </div>

        {/* ヘッダー行（Stage 1-4のみ） */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          <div className="text-center text-xs text-slate-500" />
          {[1, 2, 3, 4].map((stage) => (
            <div key={stage} className="text-center text-xs text-slate-400">
              Stage {stage}
            </div>
          ))}
        </div>

        {/* 守護神ごとの行（6行 × 4ステージ = 24個） */}
        <div className="space-y-3">
          {allGuardians.map((guardian) => {
            const instance = profile.guardians[guardian.id];
            const isUnlocked = instance?.unlocked || false;
            const unlockedStages = instance?.unlockedStages || (isUnlocked ? [0] : []);
            const currentStage = instance?.stage || 0;
            const isActive = profile.activeGuardianId === guardian.id;
            const attr = ATTRIBUTES[guardian.attribute];

            return (
              <div key={guardian.id} className="grid grid-cols-5 gap-2 items-center">
                {/* 守護神名 */}
                <div
                  className="text-center cursor-pointer group"
                  onClick={() => router.push(`/guardian/${guardian.id}`)}
                >
                  <span
                    className={`text-xs font-bold ${isUnlocked ? "text-white" : "text-slate-500"} group-hover:text-purple-400 transition-colors`}
                  >
                    {isUnlocked ? guardian.name : "???"}
                  </span>
                  {isActive && (
                    <Star className="w-3 h-3 text-purple-400 fill-purple-400 inline ml-1" />
                  )}
                </div>

                {/* ステージ1〜4のスタンプ（Stage 0は卵なので除外） */}
                {[1, 2, 3, 4].map((stage) => {
                  const isStageUnlocked = unlockedStages.includes(stage as 0 | 1 | 2 | 3 | 4);
                  const isCurrentStage = currentStage === stage && isUnlocked;

                  return (
                    <button
                      key={stage}
                      onClick={() => {
                        if (isStageUnlocked) {
                          router.push(`/guardian/${guardian.id}?stage=${stage}`);
                        } else if (isUnlocked) {
                          setSelectedGuardian(guardian.id);
                          setShowEnergyModal(true);
                        } else {
                          setSelectedGuardian(guardian.id);
                          setShowDetailModal(true);
                        }
                      }}
                      className={`
                        aspect-square rounded-full flex items-center justify-center overflow-hidden
                        transition-all duration-200 border-2
                        ${isStageUnlocked
                          ? "hover:scale-110 cursor-pointer"
                          : isUnlocked
                            ? "hover:scale-105 cursor-pointer opacity-40"
                            : "cursor-pointer opacity-20"
                        }
                        ${isCurrentStage ? "ring-2 ring-purple-400 ring-offset-1 ring-offset-slate-900" : ""}
                      `}
                      style={{
                        borderColor: isStageUnlocked ? attr.color : "#475569",
                        backgroundColor: isStageUnlocked ? "#ffffff" : "#1e293b",
                        boxShadow: isStageUnlocked ? `0 0 10px ${attr.color}40` : "none",
                      }}
                    >
                      {isStageUnlocked ? (
                        <div className="w-full h-full flex items-center justify-center bg-white">
                          <img
                            src={getGuardianImagePath(guardian.id, stage as 0 | 1 | 2 | 3 | 4)}
                            alt={`${guardian.name} Stage ${stage}`}
                            className="w-[90%] h-[90%] object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const fallback = document.createElement("span");
                                fallback.className = "text-lg";
                                fallback.textContent = attr.emoji;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm font-bold">?</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-purple-500/50 border border-purple-500" />
            <span>解放済み</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
              <span className="text-[8px]">?</span>
            </div>
            <span>未解放</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-600 ring-1 ring-purple-400" />
            <span>現在のステージ</span>
          </div>
        </div>
      </div>

      {/* 旧スタイル守護神グリッド（エナジー投資用） */}
      <div className="glass-premium p-4 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4">クイックアクセス</h2>
        <div className="grid grid-cols-3 gap-4">
          {allGuardians.map(guardian => {
            const instance = profile.guardians[guardian.id];
            const isUnlocked = instance?.unlocked || false;
            const isActive = profile.activeGuardianId === guardian.id;

            return (
              <GuardianGridItem
                key={guardian.id}
                guardian={guardian}
                instance={instance}
                isUnlocked={isUnlocked}
                isActive={isActive}
                onClick={() => {
                  setSelectedGuardian(guardian.id);
                  setShowDetailModal(true);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedGuardian && showDetailModal && (
        <GuardianDetailModal
          guardianId={selectedGuardian}
          profile={profile}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedGuardian(null);
          }}
          onUnlock={async () => {
            if (!user) return;
            const guardian = GUARDIANS[selectedGuardian];
            const energyCost = guardian.unlockCondition.energyCost || 0;

            if (confirm(`${guardian.name}を${energyCost}エナジーで解放しますか？`)) {
              const result = await unlockGuardian(user.uid, selectedGuardian, energyCost);
              if (result.success) {
                // 解放成功：召喚の儀演出を開始
                setShowDetailModal(false);
                setUnlockingGuardianId(selectedGuardian);
                setShowUnlockAnimation(true);
              } else {
                alert(result.message);
              }
            }
          }}
          onSetActive={async () => {
            if (!user) return;
            await switchActiveGuardian(user.uid, selectedGuardian);
            await loadProfile();
            setShowDetailModal(false);
          }}
          onInvestEnergy={() => {
            setShowDetailModal(false);
            setShowEnergyModal(true);
          }}
        />
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

// =====================================
// 🎴 守護神グリッドアイテム（円形）
// =====================================

interface GuardianGridItemProps {
  guardian: typeof GUARDIANS[GuardianId];
  instance: any;
  isUnlocked: boolean;
  isActive: boolean;
  onClick: () => void;
}

function GuardianGridItem({ guardian, instance, isUnlocked, isActive, onClick }: GuardianGridItemProps) {
  const attr = ATTRIBUTES[guardian.attribute];
  const placeholder = getPlaceholderStyle(guardian.id);
  const stage = instance?.stage || 0;

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer group"
    >
      {/* 円形フレーム */}
      <div
        className={`
          aspect-square rounded-full overflow-hidden relative
          border-4 transition-all duration-300
          ${isUnlocked
            ? `border-${attr.color} shadow-lg group-hover:scale-110`
            : 'border-slate-600 group-hover:scale-105'
          }
          ${isActive ? 'ring-4 ring-purple-400 ring-offset-4 ring-offset-slate-900' : ''}
        `}
        style={{
          borderColor: isUnlocked ? attr.color : '#475569',
          boxShadow: isUnlocked ? `0 0 30px ${attr.color}80` : 'none',
        }}
      >
        {/* 背景 */}
        <div
          className="absolute inset-0"
          style={{ background: placeholder.background }}
        />

        {/* 守護神画像 */}
        {isUnlocked ? (
          <img
            src={getGuardianImagePath(guardian.id, stage)}
            alt={guardian.name}
            className="w-full h-full object-contain relative z-10"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          // 未解放：全て卵（stage0）を暗く表示
          <div className="relative w-full h-full">
            <img
              src="/images/guardians/horyu/stage0.png"
              alt="???"
              className="w-full h-full object-contain opacity-30 grayscale"
            />
            <div className="absolute inset-0 bg-black/50" />
            <Lock className="absolute inset-0 m-auto w-12 h-12 text-white/80" />
          </div>
        )}

        {/* プレースホルダー絵文字（画像失敗時・非表示） */}
        <div className="absolute inset-0 flex items-center justify-center text-6xl hidden">
          {placeholder.emoji}
        </div>

        {/* アクティブマーク */}
        {isActive && (
          <div className="absolute top-2 right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center z-20 animate-pulse">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
        )}

        {/* ホバーオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-end justify-center pb-2">
          <span className="text-white text-xs font-bold">詳細を見る</span>
        </div>
      </div>

      {/* 名前 */}
      <p className={`text-center mt-2 text-sm font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
        {isUnlocked ? guardian.name : '???'}
      </p>

      {/* Stage表示 */}
      {isUnlocked && (
        <p className="text-center text-xs text-slate-400">
          Stage {stage}
        </p>
      )}
    </div>
  );
}

// =====================================
// 📋 守護神詳細モーダル
// =====================================

interface GuardianDetailModalProps {
  guardianId: GuardianId;
  profile: UserGuardianProfile;
  onClose: () => void;
  onUnlock: () => void;
  onSetActive: () => void;
  onInvestEnergy: () => void;
}

function GuardianDetailModal({
  guardianId,
  profile,
  onClose,
  onUnlock,
  onSetActive,
  onInvestEnergy
}: GuardianDetailModalProps) {
  const guardian = GUARDIANS[guardianId];
  const instance = profile.guardians[guardianId];
  const isUnlocked = instance?.unlocked || false;
  const isActive = profile.activeGuardianId === guardianId;
  const attr = ATTRIBUTES[guardian.attribute];
  const personality = GUARDIAN_PERSONALITIES[guardianId];
  const canUnlock = canUnlockGuardian(guardianId, profile);

  const stage = instance?.stage || 0;
  const stageName = EVOLUTION_STAGES[stage]?.name || "未解放";
  const investedEnergy = instance?.investedEnergy || 0;
  const auraLevel = isUnlocked ? getAuraLevel(investedEnergy, stage) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 md:pb-4 pb-[calc(var(--bottom-nav-height)+3rem)]"
      onClick={onClose}
    >
      <div
        className="glass-premium rounded-2xl border border-white/20 max-w-2xl w-full max-h-[calc(100vh-var(--bottom-nav-height)-6rem)] md:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 glass-premium border-b border-white/10 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{attr.emoji}</span>
            <div>
              <h2 className="text-3xl font-bold text-white">{guardian.name}</h2>
              <p className="text-slate-400">{guardian.reading}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 守護神画像 */}
          <div
            className="w-64 h-64 mx-auto rounded-2xl overflow-hidden relative"
            style={{ background: getPlaceholderStyle(guardianId).background }}
          >
            <img
              src={getGuardianImagePath(guardianId, stage)}
              alt={guardian.name}
              className={`w-full h-full object-contain ${!isUnlocked && 'blur-sm opacity-40'}`}
            />
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-20 h-20 text-white/60" />
              </div>
            )}
          </div>

          {/* ステータス */}
          {isUnlocked && (
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-bg p-4 rounded-xl text-center">
                <p className="text-xs text-slate-400 mb-1">Stage</p>
                <p className="text-2xl font-bold text-white">{stage}</p>
                <p className="text-xs text-slate-400">{stageName}</p>
              </div>
              <div className="glass-bg p-4 rounded-xl text-center">
                <p className="text-xs text-slate-400 mb-1">投資済み</p>
                <p className="text-2xl font-bold text-purple-400">{investedEnergy}E</p>
              </div>
              <div className="glass-bg p-4 rounded-xl text-center">
                <p className="text-xs text-slate-400 mb-1">オーラLv</p>
                <p className="text-2xl font-bold text-pink-400">{auraLevel}%</p>
              </div>
            </div>
          )}

          {/* 説明 */}
          <div className="glass-bg p-4 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-2">📖 説明</h3>
            <p className="text-slate-300 text-sm">{guardian.description}</p>
          </div>

          {/* 性格・特徴 */}
          <div className="glass-bg p-4 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              性格・特徴
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">性格</p>
                <p className="text-white">{personality.personality}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">特性</p>
                <div className="flex flex-wrap gap-2">
                  {personality.traits.map(trait => (
                    <span key={trait} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">好きなこと</p>
                <div className="flex flex-wrap gap-2">
                  {personality.favoriteThings.map(thing => (
                    <span key={thing} className="text-sm text-slate-300">💖 {thing}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* バックストーリー */}
          <div className="glass-bg p-4 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              バックストーリー
            </h3>
            <p className="text-slate-300 text-sm mb-3">{personality.backstory}</p>
            <div className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm text-purple-300 italic">"{personality.quote}"</p>
            </div>
          </div>

          {/* 特性スキル */}
          <div className="glass-bg p-4 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-2">⚡ 特性スキル</h3>
            <p className="text-sm font-bold text-purple-400 mb-1">{guardian.ability.name}</p>
            <p className="text-sm text-slate-300 mb-2">{guardian.ability.description}</p>
            {isUnlocked && stage >= 3 && (
              <p className="text-sm text-green-400">✓ 発動中</p>
            )}
            {isUnlocked && stage < 3 && (
              <p className="text-sm text-yellow-400">⚠️ Stage 3で解放</p>
            )}
            {!isUnlocked && (
              <p className="text-sm text-slate-500">解放後に使用可能</p>
            )}
          </div>

          {/* 解放条件 */}
          {!isUnlocked && (
            <div className="glass-bg p-4 rounded-xl border border-yellow-500/30">
              <h3 className="text-lg font-bold text-white mb-2">🔓 解放条件</h3>
              <p className="text-sm text-slate-300">{canUnlock.reason || '条件を満たしていません'}</p>
              {guardian.unlockCondition.energyCost && (
                <p className="text-sm text-yellow-400 mt-2">
                  必要エナジー: {guardian.unlockCondition.energyCost}E
                </p>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            {!isUnlocked && (
              <button
                onClick={onUnlock}
                disabled={!canUnlock.canUnlock}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                  ${canUnlock.canUnlock
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                <Lock className="w-5 h-5" />
                {canUnlock.canUnlock ? '解放する' : canUnlock.reason}
              </button>
            )}

            {isUnlocked && !isActive && (
              <button
                onClick={onSetActive}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white transition-all flex items-center justify-center gap-2"
              >
                <Star className="w-5 h-5" />
                アクティブにする
              </button>
            )}

            {isUnlocked && isActive && (
              <button
                onClick={onInvestEnergy}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                エナジーを注入
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
