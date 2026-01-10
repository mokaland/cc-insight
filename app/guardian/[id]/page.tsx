"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { getUserGuardianProfile } from "@/lib/firestore";
import {
  GUARDIANS,
  GuardianId,
  UserGuardianProfile,
  ATTRIBUTES,
  EVOLUTION_STAGES,
  getAuraLevel,
  getPlaceholderStyle,
  getGuardianImagePath,
  EvolutionStage,
} from "@/lib/guardian-collection";
import { ArrowLeft, Lock, Zap, Star, Heart, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

// 守護神の性格・特徴データ
const GUARDIAN_PERSONALITIES: Record<
  GuardianId,
  {
    personality: string;
    traits: string[];
    backstory: string;
    favoriteThings: string[];
    quote: string;
  }
> = {
  horyu: {
    personality: "勇敢で正義感が強い",
    traits: ["リーダーシップ", "決断力", "熱血"],
    backstory:
      "古来より炎の山に住む伝説の龍。困難に立ち向かう者を守護する。",
    favoriteThings: ["挑戦", "成長", "仲間"],
    quote: "炎のように燃え上がれ！君の可能性は無限大だ！",
  },
  shishimaru: {
    personality: "冷静沈着で知恵に溢れる",
    traits: ["戦略性", "忍耐力", "洞察力"],
    backstory: "森の奥深くで瞑想する白獅子。静かな力で導く賢者。",
    favoriteThings: ["思考", "計画", "瞑想"],
    quote: "焦らず、着実に。真の強さは心の平穏から生まれる。",
  },
  hanase: {
    personality: "優しく穏やかで癒しの存在",
    traits: ["共感力", "包容力", "癒し"],
    backstory:
      "花園に住む精霊。疲れた心を癒し、再び歩む力を与える。",
    favoriteThings: ["自然", "調和", "笑顔"],
    quote: "大丈夫、一歩ずつでいいの。あなたは一人じゃないわ。",
  },
  shiroko: {
    personality: "神秘的で直感力が鋭い",
    traits: ["直感", "神秘", "変化適応"],
    backstory:
      "月光に照らされた湖に現れる白狐。未来を予見し導く。",
    favoriteThings: ["月夜", "静寂", "変化"],
    quote: "運命は変えられる。君の選択が未来を創る。",
  },
  kitama: {
    personality: "好奇心旺盛でエネルギッシュ",
    traits: ["活発", "創造性", "楽観性"],
    backstory: "黄金の森で踊る妖精。笑顔と希望を運ぶ使者。",
    favoriteThings: ["冒険", "発見", "お祭り"],
    quote: "楽しもう！人生は一度きりの大冒険だよ！",
  },
  hoshimaru: {
    personality: "高貴で威厳があり完璧主義",
    traits: ["完璧主義", "野心", "カリスマ"],
    backstory:
      "星々の彼方から降臨した究極の守護神。選ばれし者のみと契約する。",
    favoriteThings: ["完璧", "達成", "栄光"],
    quote: "限界など存在しない。我と共に頂へ登るのだ。",
  },
};

export default function GuardianDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const guardianId = params.id as GuardianId;

  const [profile, setProfile] = useState<UserGuardianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<EvolutionStage>(0);

  // 守護神が存在するか確認
  const guardian = GUARDIANS[guardianId];
  const isValidGuardian = !!guardian;

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    // プロファイル読み込み後、現在のステージを選択
    if (profile && guardianId) {
      const instance = profile.guardians[guardianId];
      if (instance?.unlocked) {
        setSelectedStage(instance.stage);
      }
    }
  }, [profile, guardianId]);

  async function loadProfile() {
    if (!user) return;

    try {
      const data = await getUserGuardianProfile(user.uid);
      if (data) {
        setProfile(data);
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

  if (!isValidGuardian) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-white text-xl">守護神が見つかりません</div>
        <button
          onClick={() => router.push("/guardians")}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          図鑑に戻る
        </button>
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

  const instance = profile.guardians[guardianId];
  const isUnlocked = instance?.unlocked || false;
  const currentStage = instance?.stage || 0;
  const unlockedStages = instance?.unlockedStages || (isUnlocked ? [0] : []);
  const isActive = profile.activeGuardianId === guardianId;
  const attr = ATTRIBUTES[guardian.attribute];
  const personality = GUARDIAN_PERSONALITIES[guardianId];
  const investedEnergy = instance?.investedEnergy || 0;
  const auraLevel = isUnlocked ? getAuraLevel(investedEnergy, currentStage) : 0;

  // 選択したステージが解放済みかどうか
  const isStageUnlocked = unlockedStages.includes(selectedStage);
  const stageInfo = EVOLUTION_STAGES[selectedStage];

  return (
    <div className="space-y-6 pb-8">
      {/* 戻るボタン */}
      <button
        onClick={() => router.push("/guardians")}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>図鑑に戻る</span>
      </button>

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{attr.emoji}</span>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              {guardian.name}
              {isActive && (
                <Star className="w-6 h-6 text-purple-400 fill-purple-400" />
              )}
            </h1>
            <p className="text-slate-400">{guardian.reading}</p>
          </div>
        </div>
        {isUnlocked && (
          <div className="text-right">
            <p className="text-xs text-slate-400">現在のステージ</p>
            <p className="text-2xl font-bold text-purple-400">
              Stage {currentStage}
            </p>
          </div>
        )}
      </div>

      {/* 守護神画像（大） */}
      <div className="relative">
        <div
          className="w-full aspect-square max-w-md mx-auto rounded-2xl overflow-hidden relative border-4"
          style={{
            background: getPlaceholderStyle(guardianId).background,
            borderColor: isStageUnlocked ? attr.color : "#475569",
            boxShadow: isStageUnlocked
              ? `0 0 60px ${attr.color}60`
              : "none",
          }}
        >
          {isStageUnlocked ? (
            <img
              src={getGuardianImagePath(guardianId, selectedStage)}
              alt={`${guardian.name} Stage ${selectedStage}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = "/images/ui/guardian-egg.png";
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/50">
              <Lock className="w-20 h-20 text-white/40 mb-4" />
              <p className="text-white/60 text-lg">未解放</p>
            </div>
          )}

          {/* ステージ表示 */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span
              className="text-white text-sm font-bold px-4 py-2 rounded-full"
              style={{
                backgroundColor: isStageUnlocked
                  ? `${attr.color}cc`
                  : "#47556999",
              }}
            >
              {stageInfo.name} (Stage {selectedStage})
            </span>
          </div>
        </div>

        {/* ステージ切り替えボタン */}
        {isUnlocked && unlockedStages.length > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => {
                const currentIndex = unlockedStages.indexOf(selectedStage);
                if (currentIndex > 0) {
                  setSelectedStage(unlockedStages[currentIndex - 1]);
                }
              }}
              disabled={unlockedStages.indexOf(selectedStage) === 0}
              className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <div className="flex gap-2">
              {unlockedStages.map((stage) => (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`w-10 h-10 rounded-full font-bold transition-all ${
                    selectedStage === stage
                      ? "text-white scale-110"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                  style={{
                    backgroundColor:
                      selectedStage === stage ? attr.color : undefined,
                    boxShadow:
                      selectedStage === stage
                        ? `0 0 20px ${attr.color}`
                        : "none",
                  }}
                >
                  {stage}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const currentIndex = unlockedStages.indexOf(selectedStage);
                if (currentIndex < unlockedStages.length - 1) {
                  setSelectedStage(unlockedStages[currentIndex + 1]);
                }
              }}
              disabled={
                unlockedStages.indexOf(selectedStage) ===
                unlockedStages.length - 1
              }
              className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* 進化ステージ一覧（スタンプカード風） */}
      <div className="glass-premium p-4 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">進化履歴</h3>
        <div className="flex justify-between">
          {EVOLUTION_STAGES.map((stageData, index) => {
            const stageNum = stageData.stage as EvolutionStage;
            const isThisStageUnlocked = unlockedStages.includes(stageNum);
            const isCurrentStage = currentStage === stageNum;

            return (
              <button
                key={stageNum}
                onClick={() => {
                  if (isThisStageUnlocked) {
                    setSelectedStage(stageNum);
                  }
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  isThisStageUnlocked
                    ? "cursor-pointer hover:bg-white/10"
                    : "cursor-default opacity-50"
                } ${selectedStage === stageNum ? "bg-white/10" : ""}`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    isThisStageUnlocked
                      ? "border-purple-500"
                      : "border-slate-600"
                  }`}
                  style={{
                    backgroundColor: isThisStageUnlocked
                      ? `${attr.color}40`
                      : "#1e293b",
                    boxShadow:
                      isCurrentStage && isThisStageUnlocked
                        ? `0 0 15px ${attr.color}`
                        : "none",
                  }}
                >
                  {isThisStageUnlocked ? (
                    <span className="text-white font-bold">{stageNum}</span>
                  ) : (
                    <span className="text-slate-500 text-lg">?</span>
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isThisStageUnlocked ? "text-white" : "text-slate-500"
                  }`}
                >
                  {isThisStageUnlocked ? stageData.name : "???"}
                </span>
                {isCurrentStage && isThisStageUnlocked && (
                  <span className="text-xs text-purple-400">現在</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ステータス */}
      {isUnlocked && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-bg p-4 rounded-xl text-center">
            <p className="text-xs text-slate-400 mb-1">現在Stage</p>
            <p className="text-2xl font-bold text-white">{currentStage}</p>
            <p className="text-xs text-slate-400">
              {EVOLUTION_STAGES[currentStage]?.name}
            </p>
          </div>
          <div className="glass-bg p-4 rounded-xl text-center">
            <p className="text-xs text-slate-400 mb-1">投資済み</p>
            <p className="text-2xl font-bold text-purple-400">
              {investedEnergy}E
            </p>
          </div>
          <div className="glass-bg p-4 rounded-xl text-center">
            <p className="text-xs text-slate-400 mb-1">オーラLv</p>
            <p className="text-2xl font-bold text-pink-400">{auraLevel}%</p>
          </div>
        </div>
      )}

      {/* 説明 */}
      <div className="glass-bg p-4 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-2">説明</h3>
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
              {personality.traits.map((trait) => (
                <span
                  key={trait}
                  className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">好きなこと</p>
            <div className="flex flex-wrap gap-2">
              {personality.favoriteThings.map((thing) => (
                <span key={thing} className="text-sm text-slate-300">
                  {thing}
                </span>
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
          <p className="text-sm text-purple-300 italic">
            &quot;{personality.quote}&quot;
          </p>
        </div>
      </div>

      {/* 特性スキル */}
      <div className="glass-bg p-4 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-2">特性スキル</h3>
        <p className="text-sm font-bold text-purple-400 mb-1">
          {guardian.ability.name}
        </p>
        <p className="text-sm text-slate-300 mb-2">
          {guardian.ability.description}
        </p>
        {isUnlocked && currentStage >= 3 && (
          <p className="text-sm text-green-400">発動中</p>
        )}
        {isUnlocked && currentStage < 3 && (
          <p className="text-sm text-yellow-400">Stage 3で解放</p>
        )}
        {!isUnlocked && (
          <p className="text-sm text-slate-500">解放後に使用可能</p>
        )}
      </div>

      {/* アクションボタン */}
      {isUnlocked && (
        <button
          onClick={() => router.push("/guardians")}
          className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          エナジーを注入する
        </button>
      )}
    </div>
  );
}
