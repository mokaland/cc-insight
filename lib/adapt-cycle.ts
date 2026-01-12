/**
 * CC Insight v2: The Sovereign Command
 * ADAPT Cycle - 10日周期判定システム
 * 
 * 【設計思想】
 * 1. 10日・20日・月末の自動判定
 * 2. 週次/日次混在チームの公平な比較
 * 3. リーダーの責任明確化
 * 4. 菅原副社長の0.5秒把握
 */

import { getReportsByPeriod, Report } from "./firestore";
import { getCurrentDecade, isWeeklyTeam, isDailyTeam, getTeamConfig } from "./team-config";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

// ===== report-schema から移植した関数 =====

/**
 * レポートから貢献ポイントを計算
 * report-schema.ts が削除されたため、ここに直接実装
 */
function calculateTotalContributionPoints(reports: Report[], teamId: string): number {
  let total = 0;

  for (const report of reports) {
    // チームタイプに応じた重み付け
    const config = getTeamConfig(teamId);
    if (!config) continue;

    // 基本ポイント: 報告提出で10pt
    total += 10;

    // フォロワー増加ポイント（各SNSのフォロワー数を合算）
    const followers = (report.igFollowers || 0) + (report.ytFollowers || 0) +
      (report.tiktokFollowers || 0) + (report.xFollowers || 0);
    if (followers > 0) {
      total += Math.floor(followers / 100); // 100フォロワーごとに1pt
    }

    // いいね数ポイント
    if (report.likeCount && report.likeCount > 0) {
      total += Math.floor(report.likeCount / 10);
    }

    // コメント/リプライ数ポイント
    if (report.replyCount && report.replyCount > 0) {
      total += report.replyCount * 5;
    }

    // 投稿数ポイント（各SNSの投稿数を合算）
    const postCount = (report.igPosts || 0) + (report.ytPosts || 0) +
      (report.tiktokPosts || 0) + (report.postCount || 0);
    if (postCount > 0) {
      total += postCount * 3;
    }
  }

  return total;
}

export type DecadePeriod = 1 | 2 | 3; // 1=1-10日, 2=11-20日, 3=21-末日
export type JudgmentStatus = "excellent" | "on_track" | "needs_attention" | "critical";
export type ActionType = "maintain" | "increase" | "decrease" | "pivot";

export interface DecadeJudgment {
  // 基本情報
  teamId: string;
  teamName: string;
  decade: DecadePeriod;
  judgedAt: Date;

  // 実績
  actualValue: number;           // 実際の累計値
  actualProgress: number;         // 実際の進捗率（%）

  // 理想
  idealProgress: number;          // 理想進捗率（33% / 66% / 100%）
  idealValue: number;             // 理想値

  // 判定
  gap: number;                    // 乖離（実績 - 理想）
  gapPercentage: number;          // 乖離率（%）
  status: JudgmentStatus;         // ステータス

  // 目標
  currentMonthlyGoal: number;     // 現在の月間目標
  recommendedGoal?: number;       // 推奨目標（再設定の場合）

  // リーダー対応
  leaderResponse?: {
    respondedAt: Date;
    actionType: ActionType;
    newGoal?: number;
    reason: string;
    respondedBy: string;          // リーダーのUID
  };

  // 24時間無反応フラグ
  escalated: boolean;
  escalatedAt?: Date;
}

// ===== 理想進捗率の定義 =====

const IDEAL_PROGRESS: { [key in DecadePeriod]: number } = {
  1: 33,   // 10日時点: 33%
  2: 66,   // 20日時点: 66%
  3: 100,  // 月末時点: 100%
};

// ===== ステータス判定基準 =====

function determineStatus(gapPercentage: number): JudgmentStatus {
  if (gapPercentage >= 10) return "excellent";      // +10%以上
  if (gapPercentage >= -10) return "on_track";      // ±10%以内
  if (gapPercentage >= -30) return "needs_attention"; // -10%～-30%
  return "critical";                                 // -30%以下
}

// ===== 判定実行 =====

/**
 * 指定したデカードで全チームの判定を実行
 */
export async function executeDecadeJudgment(
  decade: DecadePeriod,
  referenceDate: Date = new Date()
): Promise<DecadeJudgment[]> {
  const judgments: DecadeJudgment[] = [];

  // 今月の全レポートを取得
  const reports = await getReportsByPeriod("month");

  // 月初からデカード終了日までのレポートに絞り込み
  const decadeEndDay = decade === 1 ? 10 : decade === 2 ? 20 : 31;
  const filteredReports = reports.filter(r => {
    const reportDate = new Date(r.date);
    return reportDate.getDate() <= decadeEndDay;
  });

  // チーム別に集計
  const teamIds = ["fukugyou", "taishoku", "buppan"];

  for (const teamId of teamIds) {
    const teamConfig = getTeamConfig(teamId);
    if (!teamConfig) continue;

    const teamReports = filteredReports.filter(r => r.team === teamId);

    // 実績値を計算（貢献ポイント換算）
    const actualValue = calculateTotalContributionPoints(teamReports, teamId);

    // 理想進捗率
    const idealProgress = IDEAL_PROGRESS[decade];

    // 月間目標を取得
    const today = new Date();
    const currentMonthlyGoal = await getMonthlyGoal(teamId, today.getFullYear(), today.getMonth() + 1);

    // 理想値を計算
    const idealValue = Math.round((currentMonthlyGoal * idealProgress) / 100);

    // 実際の進捗率を計算
    const actualProgress = currentMonthlyGoal > 0
      ? Math.round((actualValue / currentMonthlyGoal) * 100)
      : 0;

    // 乖離を計算
    const gap = actualValue - idealValue;
    const gapPercentage = Math.round(actualProgress - idealProgress);

    // ステータス判定
    const status = determineStatus(gapPercentage);

    // 推奨目標を計算（critical/needs_attentionの場合）
    let recommendedGoal: number | undefined;
    if (status === "critical" || status === "needs_attention") {
      // 現在のペースで月末まで進んだ場合の予測値
      const daysInDecade = decadeEndDay;
      const daysInMonth = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() + 1,
        0
      ).getDate();
      const projectedMonthlyValue = Math.round((actualValue / daysInDecade) * daysInMonth);

      // 予測値の80%を推奨目標として設定（現実的な目標）
      recommendedGoal = Math.round(projectedMonthlyValue * 0.8);
    }

    judgments.push({
      teamId,
      teamName: teamConfig.name,
      decade,
      judgedAt: new Date(),
      actualValue,
      actualProgress,
      idealProgress,
      idealValue,
      gap,
      gapPercentage,
      status,
      currentMonthlyGoal,
      recommendedGoal,
      escalated: false,
    });
  }

  return judgments;
}

/**
 * 週次チームの按分計算（副業・退職チーム用）
 * 週次報告を日割りで按分して10日時点の進捗を算出
 */
export function calculateWeeklyTeamProgress(
  reports: Report[],
  teamId: string,
  targetDate: Date
): number {
  // 週次報告の場合、報告日から次の報告日までの期間を
  // 日割りで按分して累計する

  const sorted = [...reports].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalValue = 0;

  for (let i = 0; i < sorted.length; i++) {
    const report = sorted[i];
    const reportDate = new Date(report.date);

    // ターゲット日より後の報告は除外
    if (reportDate > targetDate) break;

    // 貢献ポイントを計算
    const points = calculateTotalContributionPoints([report], teamId);

    // 次の報告日までの日数を取得
    const nextReport = sorted[i + 1];
    const nextReportDate = nextReport ? new Date(nextReport.date) : targetDate;

    // 報告日からターゲット日までの日数
    const daysFromReport = Math.min(
      Math.floor((targetDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24)),
      7 // 最大7日
    );

    // 1週間（7日）で按分
    const dailyValue = points / 7;
    const proportionalValue = dailyValue * daysFromReport;

    totalValue += proportionalValue;
  }

  return Math.round(totalValue);
}

/**
 * 日次チームの累計計算（物販チーム用）
 */
export function calculateDailyTeamProgress(
  reports: Report[],
  teamId: string,
  targetDate: Date
): number {
  // 日次報告の場合、単純に累計
  const filtered = reports.filter(r => new Date(r.date) <= targetDate);
  return calculateTotalContributionPoints(filtered, teamId);
}

// ===== リーダー対応記録 =====

/**
 * リーダーの対応を記録
 */
export function recordLeaderResponse(
  judgment: DecadeJudgment,
  response: {
    actionType: ActionType;
    newGoal?: number;
    reason: string;
    respondedBy: string;
  }
): DecadeJudgment {
  return {
    ...judgment,
    leaderResponse: {
      ...response,
      respondedAt: new Date(),
    },
  };
}

/**
 * 24時間無反応でエスカレーション
 */
export function checkEscalation(judgment: DecadeJudgment): boolean {
  if (judgment.leaderResponse) return false; // すでに対応済み

  const now = new Date();
  const hoursSinceJudgment = (now.getTime() - judgment.judgedAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceJudgment >= 24;
}

// ===== 推奨アクション =====

/**
 * ステータスに応じた推奨アクションを取得
 */
export function getRecommendedAction(status: JudgmentStatus): {
  action: ActionType;
  message: string;
  urgency: "low" | "medium" | "high" | "critical";
} {
  switch (status) {
    case "excellent":
      return {
        action: "maintain",
        message: "素晴らしいペースです！この調子で目標達成を目指しましょう💪",
        urgency: "low",
      };

    case "on_track":
      return {
        action: "maintain",
        message: "順調です！引き続き報告を継続してください✨",
        urgency: "low",
      };

    case "needs_attention":
      return {
        action: "increase",
        message: "ペースアップが必要です。メンバーと対策を話し合いましょう",
        urgency: "medium",
      };

    case "critical":
      return {
        action: "decrease",
        message: "⚠️ 目標の見直しが必要です。現実的な目標に修正しましょう",
        urgency: "critical",
      };
  }
}

// ===== ステータス表示 =====

export function getStatusColor(status: JudgmentStatus): string {
  const colors = {
    excellent: "#22c55e",     // 緑
    on_track: "#3b82f6",      // 青
    needs_attention: "#eab308", // 黄
    critical: "#ef4444",      // 赤
  };
  return colors[status];
}

export function getStatusLabel(status: JudgmentStatus): string {
  const labels = {
    excellent: "🌟 優秀",
    on_track: "✅ 順調",
    needs_attention: "⚠️ 要注意",
    critical: "🚨 危機的",
  };
  return labels[status];
}

export function getStatusDescription(status: JudgmentStatus): string {
  const descriptions = {
    excellent: "理想を大きく上回るペース！",
    on_track: "理想的なペースで進行中",
    needs_attention: "理想より遅れています",
    critical: "大幅に遅れており、対策が必要",
  };
  return descriptions[status];
}

// ===== アクション表示 =====

export function getActionLabel(action: ActionType): string {
  const labels = {
    maintain: "現状維持",
    increase: "ペースアップ",
    decrease: "目標下方修正",
    pivot: "戦略変更",
  };
  return labels[action];
}

export function getActionColor(action: ActionType): string {
  const colors = {
    maintain: "#3b82f6",   // 青
    increase: "#eab308",   // 黄
    decrease: "#f97316",   // オレンジ
    pivot: "#a855f7",      // 紫
  };
  return colors[action];
}

// ===== 判定履歴管理 =====

/**
 * 過去の判定履歴から傾向を分析
 */
export function analyzeJudgmentTrend(
  judgments: DecadeJudgment[]
): {
  improvingTeams: string[];
  decliningTeams: string[];
  stableTeams: string[];
} {
  const improvingTeams: string[] = [];
  const decliningTeams: string[] = [];
  const stableTeams: string[] = [];

  // チーム別にグループ化
  const byTeam: { [teamId: string]: DecadeJudgment[] } = {};
  judgments.forEach(j => {
    if (!byTeam[j.teamId]) byTeam[j.teamId] = [];
    byTeam[j.teamId].push(j);
  });

  // 各チームの傾向を分析
  Object.entries(byTeam).forEach(([teamId, teamJudgments]) => {
    if (teamJudgments.length < 2) {
      stableTeams.push(teamId);
      return;
    }

    // 最新2つの判定を比較
    const sorted = [...teamJudgments].sort((a, b) =>
      b.judgedAt.getTime() - a.judgedAt.getTime()
    );
    const latest = sorted[0];
    const previous = sorted[1];

    const progressChange = latest.actualProgress - previous.actualProgress;

    if (progressChange > 5) {
      improvingTeams.push(teamId);
    } else if (progressChange < -5) {
      decliningTeams.push(teamId);
    } else {
      stableTeams.push(teamId);
    }
  });

  return { improvingTeams, decliningTeams, stableTeams };
}

/**
 * 全チームのサマリーを取得
 */
export function getJudgmentSummary(judgments: DecadeJudgment[]): {
  total: number;
  excellent: number;
  onTrack: number;
  needsAttention: number;
  critical: number;
  averageProgress: number;
  awaitingResponse: number;
} {
  const total = judgments.length;
  const excellent = judgments.filter(j => j.status === "excellent").length;
  const onTrack = judgments.filter(j => j.status === "on_track").length;
  const needsAttention = judgments.filter(j => j.status === "needs_attention").length;
  const critical = judgments.filter(j => j.status === "critical").length;

  const averageProgress = total > 0
    ? Math.round(judgments.reduce((sum, j) => sum + j.actualProgress, 0) / total)
    : 0;

  const awaitingResponse = judgments.filter(j => !j.leaderResponse).length;

  return {
    total,
    excellent,
    onTrack,
    needsAttention,
    critical,
    averageProgress,
    awaitingResponse,
  };
}

// ===== フォーマット関数 =====

/**
 * 数値を見やすくフォーマット
 */
export function formatValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * 乖離率を見やすく表示
 */
export function formatGap(gapPercentage: number): string {
  const sign = gapPercentage > 0 ? "+" : "";
  return `${sign}${gapPercentage}%`;
}
/**
 * 月間目標を取得（Firestore: team_goals collection）
 * document ID format: {teamId}_{year}_{month} (e.g., fukugyou_2025_1)
 */
async function getMonthlyGoal(teamId: string, year: number, month: number): Promise<number> {
  try {
    const docId = `${teamId}_${year}_${month}`;
    const docRef = doc(db, "team_goals", docId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return snapshot.data().goal || 10000;
    }
    return 10000; // Default fallback
  } catch (error) {
    console.error(`Error fetching monthly goal for ${teamId}:`, error);
    return 10000;
  }
}
