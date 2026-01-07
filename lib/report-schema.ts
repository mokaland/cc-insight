/**
 * CC Insight v2: The Sovereign Command
 * レポートスキーマ - 全項目の完全定義と自動集計システム
 * 
 * 【設計思想】
 * 1. 新しい報告項目を追加してもコード修正不要
 * 2. スキーマに1行追加するだけで自動的に集計・表示
 * 3. チーム別の差異を吸収し、公平な比較を実現
 */

import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

// ===== 型定義 =====

export type MetricCategory = "成果" | "CV" | "エンゲージメント" | "活動量" | "フォロワー";
export type AggregationType = "sum" | "average" | "latest" | "max" | "min";

export interface MetricDefinition {
  key: string;                    // Firestoreのフィールド名
  label: string;                  // 表示ラベル
  icon: string;                   // Lucide Iconの名前
  color: string;                  // 表示カラー
  category: MetricCategory;       // カテゴリ
  aggregation: AggregationType;   // 集計方法
  priority: 1 | 2 | 3;           // 優先度（1が最高）
  showInSummary: boolean;         // サマリーカードに表示するか
  unit?: string;                  // 単位（任意）
  description?: string;           // 説明（任意）
  // 貢献ポイント換算レート（チーム間公平比較用）
  contributionWeight?: number;
}

export interface TeamMetricsSchema {
  displayName: string;
  teams: string[];                // このスキーマを使うチームID
  metrics: MetricDefinition[];
}

// ===== スキーマ定義 =====

export const REPORT_SCHEMA: { [key: string]: TeamMetricsSchema } = {
  // ===== Shorts系チーム（副業・退職サポート）=====
  shorts: {
    displayName: "Shorts系チーム",
    teams: ["fukugyou", "taishoku"],
    metrics: [
      // ━━━ 成果指標（Priority: 1）━━━
      {
        key: "igViews",
        label: "IG再生数",
        icon: "Eye",
        color: "#ec4899",
        category: "成果",
        aggregation: "sum",
        priority: 1,
        showInSummary: true,
        unit: "回",
        description: "Instagram Reelsの総再生数",
        contributionWeight: 0.001, // 1000再生 = 1pt
      },
      {
        key: "igProfileAccess",
        label: "プロフアクセス",
        icon: "UserPlus",
        color: "#a855f7",
        category: "成果",
        aggregation: "sum",
        priority: 2,
        showInSummary: true,
        unit: "回",
        description: "プロフィールへのアクセス数",
        contributionWeight: 0.1, // 10アクセス = 1pt
      },
      
      // ━━━ CV指標（Priority: 1）━━━
      {
        key: "igExternalTaps",
        label: "外部リンクタップ",
        icon: "Link2",
        color: "#06b6d4",
        category: "CV",
        aggregation: "sum",
        priority: 1,
        showInSummary: true,
        unit: "回",
        description: "外部リンクのタップ数（CV最重要指標）",
        contributionWeight: 1.0, // 1タップ = 1pt（最重要）
      },
      
      // ━━━ エンゲージメント（Priority: 2）━━━
      {
        key: "igInteractions",
        label: "インタラクション",
        icon: "MousePointerClick",
        color: "#22c55e",
        category: "エンゲージメント",
        aggregation: "sum",
        priority: 2,
        showInSummary: false,
        unit: "回",
        description: "いいね・コメント・保存の合計",
        contributionWeight: 0.05,
      },
      
      // ━━━ 活動量（Priority: 3）━━━
      {
        key: "weeklyStories",
        label: "ストーリー投稿",
        icon: "FileText",
        color: "#f59e0b",
        category: "活動量",
        aggregation: "sum",
        priority: 3,
        showInSummary: false,
        unit: "件",
        description: "週間ストーリー投稿数",
        contributionWeight: 0.2,
      },
      
      // ━━━ フォロワー（Priority: 2-3）━━━
      {
        key: "igFollowers",
        label: "IGフォロワー",
        icon: "Users",
        color: "#e1306c",
        category: "フォロワー",
        aggregation: "latest", // 最新値を取る
        priority: 2,
        showInSummary: true,
        unit: "人",
        description: "Instagramフォロワー数（最新値）",
      },
      {
        key: "ytFollowers",
        label: "YTフォロワー",
        icon: "Youtube",
        color: "#ff0000",
        category: "フォロワー",
        aggregation: "latest",
        priority: 3,
        showInSummary: false,
        unit: "人",
        description: "YouTubeフォロワー数（最新値）",
      },
      {
        key: "tiktokFollowers",
        label: "TikTokフォロワー",
        icon: "Music",
        color: "#000000",
        category: "フォロワー",
        aggregation: "latest",
        priority: 3,
        showInSummary: false,
        unit: "人",
        description: "TikTokフォロワー数（最新値）",
      },
    ],
  },
  
  // ===== X運用チーム（スマホ物販）=====
  x: {
    displayName: "X運用チーム",
    teams: ["buppan"],
    metrics: [
      // ━━━ 活動量（Priority: 1-2）━━━
      {
        key: "postCount",
        label: "投稿数",
        icon: "FileText",
        color: "#1da1f2",
        category: "活動量",
        aggregation: "sum",
        priority: 1,
        showInSummary: true,
        unit: "件",
        description: "1日の投稿数",
        contributionWeight: 2.0, // 1投稿 = 2pt
      },
      {
        key: "likeCount",
        label: "いいね回り",
        icon: "Heart",
        color: "#ef4444",
        category: "活動量",
        aggregation: "sum",
        priority: 2,
        showInSummary: true,
        unit: "回",
        description: "他アカウントへのいいね活動",
        contributionWeight: 0.5, // 1いいね = 0.5pt
      },
      {
        key: "replyCount",
        label: "リプライ回り",
        icon: "MessageCircle",
        color: "#22c55e",
        category: "活動量",
        aggregation: "sum",
        priority: 2,
        showInSummary: true,
        unit: "回",
        description: "他アカウントへのリプライ活動",
        contributionWeight: 1.0, // 1リプライ = 1pt（質が高い）
      },
      
      // ━━━ 成果指標（将来追加予定）━━━
      // ※ X APIからインプレッション数などを取得できるようになったら追加
      // {
      //   key: "xImpressions",
      //   label: "インプレッション",
      //   icon: "TrendingUp",
      //   color: "#3b82f6",
      //   category: "成果",
      //   aggregation: "sum",
      //   priority: 1,
      //   showInSummary: true,
      //   unit: "回",
      //   contributionWeight: 0.01,
      // },
    ],
  },
};

// ===== ヘルパー関数 =====

/**
 * チームIDからスキーマタイプを取得
 */
export function getSchemaType(teamId: string): "shorts" | "x" | null {
  if (REPORT_SCHEMA.shorts.teams.includes(teamId)) return "shorts";
  if (REPORT_SCHEMA.x.teams.includes(teamId)) return "x";
  return null;
}

/**
 * チームIDからスキーマを取得
 */
export function getTeamSchema(teamId: string): TeamMetricsSchema | null {
  const type = getSchemaType(teamId);
  return type ? REPORT_SCHEMA[type] : null;
}

/**
 * 全てのメトリクス定義を取得
 */
export function getAllMetrics(teamId: string): MetricDefinition[] {
  const schema = getTeamSchema(teamId);
  return schema?.metrics || [];
}

/**
 * カテゴリ別にメトリクスを取得
 */
export function getMetricsByCategory(
  teamId: string,
  category: MetricCategory
): MetricDefinition[] {
  const metrics = getAllMetrics(teamId);
  return metrics.filter(m => m.category === category);
}

/**
 * 優先度別にメトリクスを取得
 */
export function getMetricsByPriority(
  teamId: string,
  priority: 1 | 2 | 3
): MetricDefinition[] {
  const metrics = getAllMetrics(teamId);
  return metrics.filter(m => m.priority === priority);
}

/**
 * サマリー表示用のメトリクスを取得
 */
export function getSummaryMetrics(teamId: string): MetricDefinition[] {
  const metrics = getAllMetrics(teamId);
  return metrics.filter(m => m.showInSummary).sort((a, b) => a.priority - b.priority);
}

/**
 * メトリクスキーから定義を取得
 */
export function getMetricDefinition(
  teamId: string,
  metricKey: string
): MetricDefinition | null {
  const metrics = getAllMetrics(teamId);
  return metrics.find(m => m.key === metricKey) || null;
}

/**
 * Lucide Iconコンポーネントを取得
 */
export function getIcon(iconName: string): LucideIcon | null {
  return (Icons as any)[iconName] || null;
}

/**
 * カテゴリの表示順序を取得
 */
export function getCategoryOrder(): MetricCategory[] {
  return ["成果", "CV", "エンゲージメント", "活動量", "フォロワー"];
}

/**
 * カテゴリの色を取得
 */
export function getCategoryColor(category: MetricCategory): string {
  const colors: { [key in MetricCategory]: string } = {
    "成果": "#ec4899",
    "CV": "#06b6d4",
    "エンゲージメント": "#22c55e",
    "活動量": "#eab308",
    "フォロワー": "#a855f7",
  };
  return colors[category];
}

/**
 * カテゴリのアイコンを取得
 */
export function getCategoryIcon(category: MetricCategory): string {
  const icons: { [key in MetricCategory]: string } = {
    "成果": "TrendingUp",
    "CV": "Target",
    "エンゲージメント": "Heart",
    "活動量": "Zap",
    "フォロワー": "Users",
  };
  return icons[category];
}

// ===== 集計関数 =====

/**
 * レポートデータからメトリクスを集計
 */
export function aggregateMetrics(
  reports: any[],
  teamId: string,
  metricKey: string
): number {
  const definition = getMetricDefinition(teamId, metricKey);
  if (!definition) return 0;
  
  switch (definition.aggregation) {
    case "sum":
      return reports.reduce((sum, r) => sum + (r[metricKey] || 0), 0);
      
    case "average":
      if (reports.length === 0) return 0;
      const total = reports.reduce((sum, r) => sum + (r[metricKey] || 0), 0);
      return Math.round(total / reports.length);
      
    case "latest":
      // 最新の報告から値を取得（フォロワー数など）
      if (reports.length === 0) return 0;
      // createdAtで降順ソート
      const sorted = [...reports].sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      return sorted[0][metricKey] || 0;
      
    case "max":
      return Math.max(...reports.map(r => r[metricKey] || 0));
      
    case "min":
      const values = reports.map(r => r[metricKey] || 0).filter(v => v > 0);
      return values.length > 0 ? Math.min(...values) : 0;
      
    default:
      return 0;
  }
}

/**
 * 全メトリクスを集計
 */
export function aggregateAllMetrics(
  reports: any[],
  teamId: string
): { [key: string]: number } {
  const metrics = getAllMetrics(teamId);
  const result: { [key: string]: number } = {};
  
  metrics.forEach(metric => {
    result[metric.key] = aggregateMetrics(reports, teamId, metric.key);
  });
  
  return result;
}

/**
 * カテゴリ別に集計
 */
export function aggregateByCategory(
  reports: any[],
  teamId: string
): { [category: string]: { [key: string]: number } } {
  const result: { [category: string]: { [key: string]: number } } = {};
  
  getCategoryOrder().forEach(category => {
    const categoryMetrics = getMetricsByCategory(teamId, category);
    result[category] = {};
    
    categoryMetrics.forEach(metric => {
      result[category][metric.key] = aggregateMetrics(reports, teamId, metric.key);
    });
  });
  
  return result;
}

// ===== 貢献ポイント計算 =====

/**
 * 単一レポートの貢献ポイントを計算
 */
export function calculateContributionPoints(
  report: any,
  teamId: string
): number {
  const metrics = getAllMetrics(teamId);
  let total = 0;
  
  metrics.forEach(metric => {
    if (metric.contributionWeight) {
      const value = report[metric.key] || 0;
      total += value * metric.contributionWeight;
    }
  });
  
  return Math.round(total);
}

/**
 * 複数レポートの合計貢献ポイントを計算
 */
export function calculateTotalContributionPoints(
  reports: any[],
  teamId: string
): number {
  return reports.reduce((sum, report) => {
    return sum + calculateContributionPoints(report, teamId);
  }, 0);
}

/**
 * チーム間の公平比較用：全チームの貢献ポイントを計算
 */
export function calculateTeamContributionRanking(
  reportsByTeam: { [teamId: string]: any[] }
): Array<{ teamId: string; teamName: string; points: number; color: string }> {
  const results: Array<{ teamId: string; teamName: string; points: number; color: string }> = [];
  
  Object.entries(reportsByTeam).forEach(([teamId, reports]) => {
    const schema = getTeamSchema(teamId);
    if (!schema) return;
    
    const points = calculateTotalContributionPoints(reports, teamId);
    
    // team-config.tsから色を取得
    const teamConfig = require("./team-config").TEAM_CONFIG[teamId];
    
    results.push({
      teamId,
      teamName: teamConfig?.name || teamId,
      points,
      color: teamConfig?.color || "#a855f7",
    });
  });
  
  return results.sort((a, b) => b.points - a.points);
}

// ===== 数値フォーマット =====

/**
 * メトリクス値をフォーマット
 */
export function formatMetricValue(value: number, metric: MetricDefinition): string {
  if (value === 0) return "0";
  
  // 大きな数値は省略表示
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toLocaleString();
}

/**
 * 単位付きでフォーマット
 */
export function formatWithUnit(value: number, metric: MetricDefinition): string {
  const formatted = formatMetricValue(value, metric);
  return metric.unit ? `${formatted}${metric.unit}` : formatted;
}

// ===== バリデーション =====

/**
 * スキーマの整合性をチェック
 */
export function validateSchema(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 全メトリクスのkeyがユニークかチェック
  const allKeys = new Set<string>();
  Object.values(REPORT_SCHEMA).forEach(schema => {
    schema.metrics.forEach(metric => {
      if (allKeys.has(metric.key)) {
        errors.push(`Duplicate metric key: ${metric.key}`);
      }
      allKeys.add(metric.key);
    });
  });
  
  // アイコン名が有効かチェック
  Object.values(REPORT_SCHEMA).forEach(schema => {
    schema.metrics.forEach(metric => {
      if (!getIcon(metric.icon)) {
        errors.push(`Invalid icon name: ${metric.icon} for metric ${metric.key}`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// 初期化時にバリデーション実行
if (process.env.NODE_ENV === "development") {
  const validation = validateSchema();
  if (!validation.valid) {
    console.error("❌ Report Schema Validation Failed:");
    validation.errors.forEach(error => console.error(`  - ${error}`));
  } else {
    console.log("✅ Report Schema Validated Successfully");
  }
}
