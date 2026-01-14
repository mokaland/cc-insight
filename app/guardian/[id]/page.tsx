"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getUserGuardianProfile, updateGuardianMemo } from "@/lib/firestore";
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
  GuardianMemory,
} from "@/lib/guardian-collection";
import { getStageContent, getUnlockedStories } from "@/lib/guardian-stage-content";
import {
  ArrowLeft,
  Lock,
  Zap,
  Star,
  Heart,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Calendar,
  BookOpen,
  Clock,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { Timestamp } from "@/lib/types";

export default function GuardianDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const guardianId = params.id as GuardianId;
  const stageParam = searchParams.get("stage");

  const [profile, setProfile] = useState<UserGuardianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<EvolutionStage>(
    stageParam ? (parseInt(stageParam) as EvolutionStage) : 0 // デフォルトを0に変更
  );
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);

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
    // プロファイル読み込み後、ステージを選択
    if (profile && guardianId) {
      const instance = profile.guardians[guardianId];
      if (instance?.unlocked) {
        // URLパラメータがある場合はそれを優先、なければ現在のステージ
        if (stageParam) {
          const paramStage = parseInt(stageParam) as EvolutionStage;
          // 解放済みステージの範囲内かチェック
          if (paramStage >= 0 && paramStage <= 4) {
            setSelectedStage(paramStage);
          }
        } else {
          // パラメータがない場合は現在のステージを選択
          setSelectedStage(instance.stage as EvolutionStage);
        }
        setMemoText(instance.memo || "");
      }
    }
  }, [profile, guardianId, stageParam]);

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

  async function handleSaveMemo() {
    if (!user || !profile) return;
    setSavingMemo(true);
    try {
      await updateGuardianMemo(user.uid, guardianId, memoText);
      setIsEditingMemo(false);
      await loadProfile();
    } catch (error) {
      console.error("Error saving memo:", error);
    } finally {
      setSavingMemo(false);
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
  const investedEnergy = instance?.investedEnergy || 0;
  const auraLevel = isUnlocked ? getAuraLevel(investedEnergy, currentStage) : 0;
  const memories = instance?.memories || [];

  // 選択したステージが解放済みかどうか（Stage 0も含む）
  const isStageUnlocked = unlockedStages.includes(selectedStage);
  const isEggStage = selectedStage === 0; // Stage 0は卵
  const stageInfo = EVOLUTION_STAGES[selectedStage];
  const stageContent = selectedStage > 0 ? getStageContent(guardianId, selectedStage) : null;
  const unlockedStories = getUnlockedStories(guardianId, unlockedStages);

  // 絆エピソード計算
  const unlockedAt = instance?.unlockedAt;
  const daysTogether = unlockedAt
    ? Math.floor((Date.now() - unlockedAt.toDate().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // フィルタリングされた解放済みステージ（Stage 0を含む、解放済みのみ）
  const displayStages = unlockedStages.filter(s => s >= 0 && s <= 4).sort((a, b) => a - b) as EvolutionStage[];

  return (
    <div className="space-y-6 pb-8 overflow-x-hidden">
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

      {/* 守護神画像（大）とセリフ */}
      <div className="relative">
        <div
          className="w-full aspect-square max-w-md mx-auto rounded-2xl overflow-hidden relative border-4"
          style={{
            background: "transparent",
            borderColor: isStageUnlocked ? attr.color : "#475569",
            boxShadow: isStageUnlocked
              ? `0 0 60px ${attr.color}60`
              : "none",
          }}
        >
          {isStageUnlocked || isEggStage ? (
            <img
              src={isEggStage ? "/images/ui/guardian-egg.png" : getGuardianImagePath(guardianId, selectedStage)}
              alt={isEggStage ? `${guardian.name} 卵` : `${guardian.name} Stage ${selectedStage}`}
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
                backgroundColor: isStageUnlocked || isEggStage
                  ? `${attr.color}cc`
                  : "#47556999",
              }}
            >
              {isEggStage ? "卵" : stageInfo?.name || "???"} (Stage {selectedStage})
            </span>
          </div>
        </div>

        {/* セリフ（吹き出し風） */}
        {isStageUnlocked && stageContent && (
          <div className="mt-4 p-4 glass-premium rounded-xl relative">
            <div
              className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45"
              style={{ backgroundColor: `${attr.color}30` }}
            />
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-white italic">&quot;{stageContent.quote}&quot;</p>
            </div>
          </div>
        )}

        {/* ステージ切り替えボタン（Stage 0-4、解放済みのみ） */}
        {isUnlocked && displayStages.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => {
                const currentIndex = displayStages.indexOf(selectedStage);
                if (currentIndex > 0) {
                  setSelectedStage(displayStages[currentIndex - 1]);
                }
              }}
              disabled={displayStages.indexOf(selectedStage) === 0}
              className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((stage) => {
                const isThisUnlocked = unlockedStages.includes(stage as EvolutionStage);
                const stageLabel = stage === 0 ? "卵" : stage.toString();
                return (
                  <button
                    key={stage}
                    onClick={() => {
                      if (isThisUnlocked) {
                        setSelectedStage(stage as EvolutionStage);
                      }
                    }}
                    disabled={!isThisUnlocked}
                    className={`w-10 h-10 rounded-full font-bold transition-all flex items-center justify-center text-sm ${selectedStage === stage
                      ? "text-white scale-110"
                      : isThisUnlocked
                        ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
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
                    {stageLabel}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                const currentIndex = displayStages.indexOf(selectedStage);
                if (currentIndex < displayStages.length - 1) {
                  setSelectedStage(displayStages[currentIndex + 1]);
                }
              }}
              disabled={
                displayStages.indexOf(selectedStage) ===
                displayStages.length - 1
              }
              className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* 外見の説明 */}
      {isStageUnlocked && stageContent && (
        <div className="glass-bg p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: attr.color }} />
            Stage {selectedStage} の姿
          </h3>
          <p className="text-slate-300 text-sm">{stageContent.appearance}</p>
        </div>
      )}

      {/* ステータス - コンパクト横並び */}
      {isUnlocked && (
        <div className="flex items-center justify-center gap-6 py-3 glass-bg rounded-xl">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">S{currentStage}</p>
            <p className="text-[10px] text-slate-400">{EVOLUTION_STAGES[currentStage]?.name}</p>
          </div>
          <div className="w-px h-8 bg-slate-600" />
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{investedEnergy}E</p>
            <p className="text-[10px] text-slate-400">投資済み</p>
          </div>
          <div className="w-px h-8 bg-slate-600" />
          <div className="text-center">
            <p className="text-2xl font-bold text-pink-400">{auraLevel}%</p>
            <p className="text-[10px] text-slate-400">オーラ</p>
          </div>
        </div>
      )}

      {/* 絆エピソード */}
      {isUnlocked && (
        <div className="glass-premium p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            絆の記録
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-bg p-3 rounded-lg text-center">
              <Calendar className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{daysTogether}</p>
              <p className="text-xs text-slate-400">一緒に過ごした日数</p>
            </div>
            <div className="glass-bg p-3 rounded-lg text-center">
              <Sparkles className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{currentStage}</p>
              <p className="text-xs text-slate-400">進化回数</p>
            </div>
          </div>
        </div>
      )}

      {/* 守護神メモ */}
      {isUnlocked && (
        <div className="glass-bg p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-400" />
              あなたのメモ
            </h3>
            {!isEditingMemo ? (
              <button
                onClick={() => setIsEditingMemo(true)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                編集
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMemo}
                  disabled={savingMemo}
                  className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditingMemo(false);
                    setMemoText(instance?.memo || "");
                  }}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
              </div>
            )}
          </div>
          {isEditingMemo ? (
            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder={`${guardian.name}との思い出や気持ちを書いてみよう...`}
              className="w-full h-24 p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          ) : (
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {instance?.memo || (
                <span className="text-slate-500 italic">
                  タップして{guardian.name}への想いを書いてみよう...
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* 思い出タイムライン */}
      {isUnlocked && memories.length > 0 && (
        <div className="glass-bg p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            思い出タイムライン
          </h3>
          <div className="space-y-3">
            {memories.slice().reverse().slice(0, 5).map((memory, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 glass-bg rounded-lg"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${attr.color}30` }}
                >
                  {memory.type === 'unlock' && <Star className="w-4 h-4" style={{ color: attr.color }} />}
                  {memory.type === 'evolve' && <Sparkles className="w-4 h-4" style={{ color: attr.color }} />}
                  {memory.type === 'streak' && <Zap className="w-4 h-4" style={{ color: attr.color }} />}
                  {memory.type === 'milestone' && <Heart className="w-4 h-4" style={{ color: attr.color }} />}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{memory.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatMemoryDate(memory.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 隠しストーリー */}
      {isUnlocked && unlockedStories.length > 0 && (
        <div className="glass-premium p-4 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-yellow-400" />
            {guardian.name}の物語
          </h3>
          <div className="space-y-4">
            {unlockedStories.map((storyData) => (
              <div
                key={storyData.stage}
                className={`p-4 rounded-lg border-l-4 ${selectedStage === storyData.stage
                  ? "bg-white/10"
                  : "bg-slate-800/30"
                  }`}
                style={{
                  borderColor:
                    selectedStage === storyData.stage
                      ? attr.color
                      : "#475569",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${attr.color}40`, color: attr.color }}
                  >
                    Stage {storyData.stage}
                  </span>
                  <h4 className="text-white font-bold text-sm">
                    {storyData.title}
                  </h4>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {storyData.story}
                </p>
              </div>
            ))}
            {/* 未解放のストーリーへのヒント */}
            {unlockedStories.length < 4 && (
              <div className="p-4 rounded-lg bg-slate-800/30 border-l-4 border-slate-600">
                <p className="text-slate-500 text-sm italic">
                  進化すると新しい物語が解放されます...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 特性スキル */}
      <div className="glass-bg p-4 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          特性スキル
        </h3>
        <p className="text-sm font-bold text-purple-400 mb-1">
          {guardian.ability.name}
        </p>
        {isUnlocked && currentStage >= 3 ? (
          <>
            <p className="text-sm text-slate-300 mb-2">
              {guardian.ability.description}
            </p>
            <p className="text-sm text-green-400">発動中</p>
          </>
        ) : isUnlocked ? (
          <>
            <p className="text-sm text-slate-400 mb-2">
              {stageContent?.abilityHint || "???"}
            </p>
            <p className="text-sm text-yellow-400">Stage 3で解放</p>
          </>
        ) : (
          <p className="text-sm text-slate-500">解放後に使用可能</p>
        )}
      </div>

      {/* アクションボタン */}
      {isUnlocked && (
        <button
          onClick={() => router.push(`/guardians?invest=${guardianId}`)}
          className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          エナジーを注入する
        </button>
      )}
    </div>
  );
}

// 日付フォーマット
function formatMemoryDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
