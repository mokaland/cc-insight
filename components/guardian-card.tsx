"use client";

import { motion } from "framer-motion";
import { GuardianStyle, GUARDIAN_STYLES, GuardianStage, getGuardianImagePath } from "@/lib/guardian-evolution";

interface GuardianCardProps {
  style: GuardianStyle;
  stage: GuardianStage;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  animate?: boolean;
}

const sizeClasses = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-48 h-48",
  xl: "w-64 h-64"
};

/**
 * 守護神カード - 呼吸するような浮遊アニメーション付き
 */
export function GuardianCard({ 
  style, 
  stage, 
  size = "md", 
  showName = false,
  animate = true 
}: GuardianCardProps) {
  const styleInfo = GUARDIAN_STYLES[style];
  const imagePath = getGuardianImagePath(style, stage.stage);
  
  return (
    <div className="relative inline-block">
      {/* 浮遊アニメーション */}
      <motion.div
        animate={animate ? {
          y: [0, -10, 0],
          scale: [1, 1.02, 1]
        } : undefined}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        {/* オーラエフェクト */}
        {stage.auraColor && (
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background: stage.auraColor,
              opacity: 0.6
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
        {/* 守護神画像 / プレースホルダー */}
        <div 
          className={`${sizeClasses[size]} relative z-10 rounded-2xl overflow-hidden`}
          style={{
            background: `linear-gradient(135deg, ${styleInfo.gradientFrom}, ${styleInfo.gradientTo})`
          }}
        >
          {/* 今後画像が入る場所 */}
          <div className="w-full h-full flex items-center justify-center backdrop-blur-sm bg-black/20">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {styleInfo.japaneseName}
              </div>
              <div className="text-sm text-white/80">
                {stage.name}
              </div>
            </div>
          </div>
          
          {/* 画像読み込み用（将来） */}
          {/* <img 
            src={imagePath} 
            alt={`${styleInfo.name} - ${stage.name}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 画像が見つからない場合はプレースホルダーを表示
              e.currentTarget.style.display = 'none';
            }}
          /> */}
          
          {/* 輝きエフェクト */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-white/0"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2
            }}
          />
        </div>
      </motion.div>
      
      {/* 名前表示 */}
      {showName && (
        <div className="text-center mt-4">
          <div className="text-lg font-bold" style={{ color: styleInfo.color }}>
            {stage.name}
          </div>
          <div className="text-sm text-slate-400">
            {styleInfo.name}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 守護神選択カード - 選択UI用
 */
interface GuardianSelectCardProps {
  style: GuardianStyle;
  selected?: boolean;
  onSelect: () => void;
}

export function GuardianSelectCard({ style, selected, onSelect }: GuardianSelectCardProps) {
  const styleInfo = GUARDIAN_STYLES[style];
  
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative p-6 rounded-2xl border-2 transition-all
        ${selected 
          ? 'border-white shadow-2xl' 
          : 'border-slate-700 hover:border-slate-500'
        }
      `}
      style={{
        background: selected 
          ? `linear-gradient(135deg, ${styleInfo.gradientFrom}40, ${styleInfo.gradientTo}40)`
          : 'rgba(15, 23, 42, 0.8)'
      }}
    >
      {/* 選択マーク */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center"
        >
          <span className="text-xl">✓</span>
        </motion.div>
      )}
      
      {/* プレースホルダー */}
      <div 
        className="w-40 h-40 mx-auto mb-4 rounded-xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${styleInfo.gradientFrom}, ${styleInfo.gradientTo})`
        }}
      >
        <div className="text-6xl font-bold text-white">
          {styleInfo.japaneseName}
        </div>
      </div>
      
      {/* スタイル情報 */}
      <h3 className="text-2xl font-bold mb-2" style={{ color: styleInfo.color }}>
        {styleInfo.japaneseName}
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        {styleInfo.name}
      </p>
      <p className="text-sm text-slate-300">
        {styleInfo.description}
      </p>
      
      {/* 装飾 */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${styleInfo.color}20 0%, transparent 70%)`
        }}
        animate={{
          opacity: selected ? [0.3, 0.6, 0.3] : 0
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      />
    </motion.button>
  );
}

/**
 * 守護神ステータスウィジェット - ダッシュボード用
 */
interface GuardianWidgetProps {
  style: GuardianStyle;
  stage: GuardianStage;
  daysToNext: number;
  progressPercent: number;
}

export function GuardianWidget({ style, stage, daysToNext, progressPercent }: GuardianWidgetProps) {
  const styleInfo = GUARDIAN_STYLES[style];
  
  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-slate-300 mb-4">
        🛡️ あなたの守護神
      </h3>
      
      <div className="flex items-center gap-6">
        {/* 守護神カード */}
        <GuardianCard 
          style={style} 
          stage={stage} 
          size="lg"
          animate={true}
        />
        
        {/* ステータス情報 */}
        <div className="flex-1">
          <div className="mb-4">
            <div className="text-2xl font-bold mb-1" style={{ color: styleInfo.color }}>
              {stage.name}
            </div>
            <div className="text-sm text-slate-400">
              {styleInfo.japaneseName} {styleInfo.name}
            </div>
          </div>
          
          {/* 進捗バー */}
          {daysToNext > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">次の進化まで</span>
                <span className="text-white font-bold">{daysToNext}日</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${styleInfo.gradientFrom}, ${styleInfo.gradientTo})`
                  }}
                />
              </div>
            </div>
          )}
          
          {/* 説明 */}
          <p className="text-sm text-slate-400">
            {stage.description}
          </p>
        </div>
      </div>
    </div>
  );
}
