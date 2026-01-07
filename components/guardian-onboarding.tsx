"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gender,
  AgeGroup,
  GuardianStyle,
  GENDER_OPTIONS,
  AGE_GROUP_OPTIONS,
  GUARDIAN_STYLES,
  createNewGuardian
} from "@/lib/guardian-evolution";
import { updateUserProfile, addGuardian } from "@/lib/firestore";
import { GuardianSelectCard } from "./guardian-card";

interface ProfileInputModalProps {
  isOpen: boolean;
  onComplete: (profile: { gender: Gender; ageGroup: AgeGroup }) => void;
}

/**
 * プロフィール入力モーダル
 */
export function ProfileInputModal({ isOpen, onComplete }: ProfileInputModalProps) {
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!gender || !ageGroup) return;
    
    setIsSubmitting(true);
    onComplete({ gender, ageGroup });
  };

  const canSubmit = gender && ageGroup && !isSubmitting;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* モーダル本体 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
              {/* ヘッダー */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-6xl mb-4"
                >
                  ✨
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  あなたについて教えてください
                </h2>
                <p className="text-slate-400">
                  あなたに最適な守護神との出会いをサポートします
                </p>
              </div>

              {/* 性別選択 */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  性別
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {GENDER_OPTIONS.map((option) => (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setGender(option.value)}
                      className={`
                        p-4 rounded-xl border-2 transition-all font-medium
                        ${gender === option.value
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                        }
                      `}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* 年齢層選択 */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  年齢層
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {AGE_GROUP_OPTIONS.map((option) => (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAgeGroup(option.value)}
                      className={`
                        p-4 rounded-xl border-2 transition-all font-medium
                        ${ageGroup === option.value
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                        }
                      `}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* 送信ボタン */}
              <motion.button
                whileHover={canSubmit ? { scale: 1.02 } : undefined}
                whileTap={canSubmit ? { scale: 0.98 } : undefined}
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg transition-all
                  ${canSubmit
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }
                `}
              >
                {isSubmitting ? '処理中...' : '次へ進む'}
              </motion.button>

              {/* プライバシー表示 */}
              <p className="text-xs text-slate-500 text-center mt-4">
                この情報はあなたの体験をカスタマイズするために使用されます
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface GuardianSelectModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: () => void;
}

/**
 * 守護神選択モーダル（御三家）
 */
export function GuardianSelectModal({ isOpen, userId, onComplete }: GuardianSelectModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<GuardianStyle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const handleSelect = (style: GuardianStyle) => {
    setSelectedStyle(style);
  };

  const handleContinue = () => {
    if (!selectedStyle) return;
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedStyle) return;
    
    setIsSubmitting(true);
    try {
      // 新しい守護神を作成
      const newGuardian = createNewGuardian(selectedStyle);
      
      // Firestoreに保存
      await addGuardian(userId, newGuardian);
      
      // 完了コールバック
      onComplete();
    } catch (error) {
      console.error('守護神作成エラー:', error);
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('select');
  };

  const styleInfo = selectedStyle ? GUARDIAN_STYLES[selectedStyle] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
          />

          {/* モーダル本体 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 max-w-6xl w-full shadow-2xl my-8">
              {step === 'select' ? (
                <>
                  {/* 選択ステップ */}
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", duration: 0.8 }}
                      className="text-6xl mb-4"
                    >
                      🛡️
                    </motion.div>
                    <h2 className="text-4xl font-bold text-white mb-3">
                      あなたの守護神を選んでください
                    </h2>
                    <p className="text-slate-400 text-lg">
                      どのスタイルがあなたの心に響きますか？
                    </p>
                  </div>

                  {/* 御三家カード */}
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <GuardianSelectCard
                      style="power"
                      selected={selectedStyle === 'power'}
                      onSelect={() => handleSelect('power')}
                    />
                    <GuardianSelectCard
                      style="beauty"
                      selected={selectedStyle === 'beauty'}
                      onSelect={() => handleSelect('beauty')}
                    />
                    <GuardianSelectCard
                      style="cyber"
                      selected={selectedStyle === 'cyber'}
                      onSelect={() => handleSelect('cyber')}
                    />
                  </div>

                  {/* 決定ボタン */}
                  <motion.button
                    whileHover={selectedStyle ? { scale: 1.02 } : undefined}
                    whileTap={selectedStyle ? { scale: 0.98 } : undefined}
                    onClick={handleContinue}
                    disabled={!selectedStyle}
                    className={`
                      w-full py-5 rounded-xl font-bold text-xl transition-all
                      ${selectedStyle
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-2xl'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }
                    `}
                  >
                    この守護神を選ぶ
                  </motion.button>
                </>
              ) : (
                <>
                  {/* 確認ステップ */}
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-6xl mb-4"
                    >
                      ✨
                    </motion.div>
                    <h2 className="text-4xl font-bold text-white mb-3">
                      本当にこの守護神でよろしいですか？
                    </h2>
                    <p className="text-slate-400">
                      一度選択すると、変更はできません
                    </p>
                  </div>

                  {/* 選択した守護神の詳細 */}
                  {styleInfo && (
                    <div className="max-w-md mx-auto mb-8">
                      <div 
                        className="p-8 rounded-2xl text-center"
                        style={{
                          background: `linear-gradient(135deg, ${styleInfo.gradientFrom}40, ${styleInfo.gradientTo}40)`,
                          border: `2px solid ${styleInfo.color}`
                        }}
                      >
                        <div 
                          className="w-48 h-48 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${styleInfo.gradientFrom}, ${styleInfo.gradientTo})`
                          }}
                        >
                          <div className="text-8xl font-bold text-white">
                            {styleInfo.japaneseName}
                          </div>
                        </div>
                        <h3 className="text-3xl font-bold mb-2" style={{ color: styleInfo.color }}>
                          {styleInfo.japaneseName}
                        </h3>
                        <p className="text-white mb-2">{styleInfo.name}</p>
                        <p className="text-slate-300">{styleInfo.description}</p>
                      </div>
                    </div>
                  )}

                  {/* ボタン */}
                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="flex-1 py-4 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all"
                    >
                      戻る
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      disabled={isSubmitting}
                      className="flex-1 py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all shadow-2xl"
                    >
                      {isSubmitting ? '作成中...' : '決定する！'}
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * オンボーディングフロー統合コンポーネント
 */
interface GuardianOnboardingProps {
  userId: string;
  needsProfile: boolean;
  needsGuardian: boolean;
  onComplete: () => void;
}

export function GuardianOnboarding({
  userId,
  needsProfile,
  needsGuardian,
  onComplete
}: GuardianOnboardingProps) {
  const [showProfileModal, setShowProfileModal] = useState(needsProfile);
  const [showGuardianModal, setShowGuardianModal] = useState(false);

  const handleProfileComplete = async (profile: { gender: Gender; ageGroup: AgeGroup }) => {
    try {
      // Firestoreにプロフィールを保存
      await updateUserProfile(userId, profile);
      
      setShowProfileModal(false);
      
      // 守護神が必要な場合は守護神選択へ
      if (needsGuardian) {
        setTimeout(() => setShowGuardianModal(true), 500);
      } else {
        onComplete();
      }
    } catch (error) {
      console.error('プロフィール保存エラー:', error);
    }
  };

  const handleGuardianComplete = () => {
    setShowGuardianModal(false);
    onComplete();
  };

  // プロフィールが不要で守護神が必要な場合
  if (!needsProfile && needsGuardian) {
    return (
      <GuardianSelectModal
        isOpen={true}
        userId={userId}
        onComplete={onComplete}
      />
    );
  }

  return (
    <>
      <ProfileInputModal
        isOpen={showProfileModal}
        onComplete={handleProfileComplete}
      />
      <GuardianSelectModal
        isOpen={showGuardianModal}
        userId={userId}
        onComplete={handleGuardianComplete}
      />
    </>
  );
}
