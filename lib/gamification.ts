import { Timestamp } from "firebase/firestore";

// レベル定義（MASTER_BLUEPRINTに基づく）
export interface Level {
  level: number;
  name: string;
  icon: string;
  minViews: number;
  maxViews: number;
  color: string;
  glowColor: string;
}

export const LEVELS: Level[] = [
  { level: 1, name: "ルーキー", icon: "🌱", minViews: 0, maxViews: 10000, color: "#6b7280", glowColor: "rgba(107, 114, 128, 0.5)" },
  { level: 2, name: "チャレンジャー", icon: "⭐", minViews: 10001, maxViews: 30000, color: "#06b6d4", glowColor: "rgba(6, 182, 212, 0.5)" },
  { level: 3, name: "アクティブ", icon: "⭐⭐", minViews: 30001, maxViews: 70000, color: "#06b6d4", glowColor: "rgba(6, 182, 212, 0.5)" },
  { level: 4, name: "プロフェッショナル", icon: "⭐⭐⭐⭐", minViews: 70001, maxViews: 150000, color: "#a855f7", glowColor: "rgba(168, 85, 247, 0.5)" },
  { level: 5, name: "エキスパート", icon: "💎", minViews: 150001, maxViews: 300000, color: "#ec4899", glowColor: "rgba(236, 72, 153, 0.5)" },
  { level: 6, name: "マスター", icon: "👑", minViews: 300001, maxViews: 500000, color: "#f59e0b", glowColor: "rgba(245, 158, 11, 0.5)" },
  { level: 7, name: "レジェンド", icon: "🏆", minViews: 500001, maxViews: Infinity, color: "#ef4444", glowColor: "rgba(239, 68, 68, 0.5)" },
];

// バッジ定義
export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "streak" | "achievement" | "ranking" | "growth" | "team";
  condition: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const BADGES: Badge[] = [
  // 継続系
  { id: "streak7", name: "継続の炎", icon: "🔥", description: "7日連続報告達成", category: "streak", condition: "7日連続報告", rarity: "common" },
  { id: "streak30", name: "鉄の意志", icon: "💪", description: "30日連続報告達成", category: "streak", condition: "30日連続報告", rarity: "rare" },
  { id: "streak100", name: "不屈の精神", icon: "⚡", description: "100日連続報告達成", category: "streak", condition: "100日連続報告", rarity: "legendary" },
  
  // 達成系
  { id: "firstReport", name: "はじめの一歩", icon: "👣", description: "初めての報告", category: "achievement", condition: "初回報告", rarity: "common" },
  { id: "firstViral", name: "ブレイクスルー", icon: "🚀", description: "初1万再生達成", category: "achievement", condition: "累計1万再生達成", rarity: "rare" },
  { id: "viral10k", name: "バズマスター", icon: "💥", description: "10万再生達成", category: "achievement", condition: "累計10万再生達成", rarity: "epic" },
  { id: "complete100", name: "完全達成", icon: "🎯", description: "週間目標100%達成", category: "achievement", condition: "週間目標100%達成", rarity: "rare" },
  
  // ランキング系
  { id: "top3weekly", name: "トップランナー", icon: "🥇", description: "週間TOP3入り", category: "ranking", condition: "週間ランキングTOP3", rarity: "epic" },
  { id: "mvp", name: "MVP", icon: "👑", description: "月間1位獲得", category: "ranking", condition: "月間ランキング1位", rarity: "legendary" },
  
  // 成長系
  { id: "growth2x", name: "急成長", icon: "📈", description: "前週比2倍達成", category: "growth", condition: "前週比200%", rarity: "rare" },
  { id: "growth5x", name: "爆発的成長", icon: "🌟", description: "前週比5倍達成", category: "growth", condition: "前週比500%", rarity: "legendary" },
  
  // チーム貢献系
  { id: "teamPlayer", name: "チームプレイヤー", icon: "🤝", description: "チーム達成率向上に貢献", category: "team", condition: "チーム貢献", rarity: "rare" },
];

// レベル計算関数
export function calculateLevel(totalViews: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalViews >= LEVELS[i].minViews) {
      return LEVELS[i];
    }
  }
  return LEVELS[0]; // デフォルトはルーキー
}

// 次のレベルまでの進捗計算
export function calculateLevelProgress(totalViews: number): {
  currentLevel: Level;
  nextLevel: Level | null;
  progress: number;
  viewsToNext: number;
} {
  const currentLevel = calculateLevel(totalViews);
  const currentIndex = LEVELS.findIndex(l => l.level === currentLevel.level);
  const nextLevel = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;
  
  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progress: 100,
      viewsToNext: 0,
    };
  }
  
  const viewsInCurrentLevel = totalViews - currentLevel.minViews;
  const viewsNeededForNext = nextLevel.minViews - currentLevel.minViews;
  const progress = Math.min(100, Math.round((viewsInCurrentLevel / viewsNeededForNext) * 100));
  const viewsToNext = nextLevel.minViews - totalViews;
  
  return {
    currentLevel,
    nextLevel,
    progress,
    viewsToNext,
  };
}

// バッジ取得条件チェック
export function checkBadgeEligibility(
  badgeId: string,
  userData: {
    totalViews: number;
    totalReports: number;
    currentStreak: number;
    weeklyAchievementRate?: number;
    weeklyRank?: number;
    monthlyRank?: number;
    growthRate?: number;
  }
): boolean {
  const badge = BADGES.find(b => b.id === badgeId);
  if (!badge) return false;
  
  switch (badgeId) {
    // 初回報告
    case "firstReport":
      return userData.totalReports >= 1;
    
    // ストリーク系
    case "streak7":
      return userData.currentStreak >= 7;
    case "streak30":
      return userData.currentStreak >= 30;
    case "streak100":
      return userData.currentStreak >= 100;
    
    // 再生数達成系
    case "firstViral":
      return userData.totalViews >= 10000;
    case "viral10k":
      return userData.totalViews >= 100000;
    
    // 目標達成系
    case "complete100":
      return (userData.weeklyAchievementRate || 0) >= 100;
    
    // ランキング系
    case "top3weekly":
      return (userData.weeklyRank || Infinity) <= 3;
    case "mvp":
      return (userData.monthlyRank || Infinity) === 1;
    
    // 成長系
    case "growth2x":
      return (userData.growthRate || 0) >= 200;
    case "growth5x":
      return (userData.growthRate || 0) >= 500;
    
    default:
      return false;
  }
}

// 達成率に応じた色を返す
export function getAchievementColor(rate: number): string {
  if (rate >= 100) return "#22c55e"; // 緑（達成）
  if (rate >= 81) return "#ec4899";  // ピンク（あと少し）
  if (rate >= 61) return "#eab308";  // イエロー（もう少し）
  if (rate >= 31) return "#06b6d4";  // シアン（いい感じ）
  return "#6b7280";                  // グレー（まだまだ）
}

// 達成率に応じたメッセージ
export function getAchievementMessage(rate: number): string {
  if (rate >= 100) return "🎉 達成おめでとう！";
  if (rate >= 81) return "🔥 あと少し！この調子！";
  if (rate >= 61) return "💪 もう少しで達成！";
  if (rate >= 31) return "📈 いい感じです！";
  return "💡 今週も頑張りましょう！";
}

// レアリティカラー
export function getBadgeRarityColor(rarity: Badge["rarity"]): string {
  switch (rarity) {
    case "common": return "#9ca3af";
    case "rare": return "#3b82f6";
    case "epic": return "#a855f7";
    case "legendary": return "#f59e0b";
  }
}

// ストリーク計算（最終報告日からの連続日数）
export function calculateStreak(reports: Array<{ date: string }>): {
  currentStreak: number;
  longestStreak: number;
} {
  if (reports.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }
  
  // 日付でソート（新しい順）
  const sortedReports = [...reports].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let expectedDate = new Date(today);
  
  for (const report of sortedReports) {
    const reportDate = new Date(report.date);
    reportDate.setHours(0, 0, 0, 0);
    
    if (reportDate.getTime() === expectedDate.getTime()) {
      tempStreak++;
      if (currentStreak === 0 || tempStreak === currentStreak + 1) {
        currentStreak = tempStreak;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (reportDate < expectedDate) {
      // 日付が飛んでいる場合はストリーク途切れ
      if (currentStreak === 0) {
        currentStreak = 0; // まだカウント開始していない
      }
      tempStreak = 1;
      expectedDate = new Date(reportDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  return { currentStreak, longestStreak };
}
