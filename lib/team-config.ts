/**
 * CC Insight v2: The Sovereign Command
 * チーム設定 - 報告サイクル・リマインド・目標管理の完全定義
 */

// ===== チーム報告サイクル型定義 =====
export type ReportCycle = "daily" | "weekly";

export interface ReminderSchedule {
  // 日次チーム用
  hour?: number;
  minute?: number;
  // 週次チーム用（締切からの日数）
  daysBefore?: number;
  // 翌日フォロー用
  nextDay?: boolean;
  // メッセージタイプ
  type: "gentle" | "supportive" | "urgent" | "followup";
}

export interface TeamConfig {
  id: string;
  name: string;
  color: string;
  type: "shorts" | "x";
  
  // ===== 報告サイクル設定 =====
  reportCycle: ReportCycle;
  
  // 日次チーム: 毎日の締切時刻
  // 週次チーム: 週の締切曜日・時刻
  reportDeadline: {
    dayOfWeek?: number;  // 0=日曜, 1=月曜, ..., 6=土曜
    hour: number;
    minute: number;
  };
  
  // リマインドスケジュール
  reminderSchedule: ReminderSchedule[];
  
  // 目標設定
  dailyPostGoal?: number;
  weeklyGoals?: {
    [metricKey: string]: number;
  };
}

// ===== チーム設定マスター =====
export const TEAM_CONFIG: { [key: string]: TeamConfig } = {
  // ===== 副業チーム（週次報告）- Shortsチーム =====
  fukugyou: {
    id: "fukugyou",
    name: "副業チーム",
    color: "#ec4899",
    type: "shorts",
    
    // 週次報告
    reportCycle: "weekly",
    reportDeadline: {
      dayOfWeek: 0,  // 日曜日
      hour: 23,
      minute: 59,
    },
    
    // リマインドスケジュール
    reminderSchedule: [
      // 金曜 19:30 - 軽い声かけ
      { daysBefore: 2, hour: 19, minute: 30, type: "gentle" },
      // 土曜 19:30 - 応援
      { daysBefore: 1, hour: 19, minute: 30, type: "supportive" },
      // 日曜 12:00 - 最終リマインド
      { daysBefore: 0, hour: 12, minute: 0, type: "urgent" },
      // 月曜 8:00 - フォローアップ（未報告者のみ）
      { nextDay: true, hour: 8, minute: 0, type: "followup" },
    ],
    
    dailyPostGoal: 3,
  },
  
  // ===== 退職サポートチーム（週次報告）=====
  taishoku: {
    id: "taishoku",
    name: "退職サポートチーム",
    color: "#06b6d4",
    type: "shorts",
    
    // 週次報告
    reportCycle: "weekly",
    reportDeadline: {
      dayOfWeek: 0,  // 日曜日
      hour: 23,
      minute: 59,
    },
    
    // リマインドスケジュール（副業チームと同様）
    reminderSchedule: [
      { daysBefore: 2, hour: 19, minute: 30, type: "gentle" },
      { daysBefore: 1, hour: 19, minute: 30, type: "supportive" },
      { daysBefore: 0, hour: 12, minute: 0, type: "urgent" },
      { nextDay: true, hour: 8, minute: 0, type: "followup" },
    ],
    
    dailyPostGoal: 2,
  },
  
  // ===== スマホ物販チーム（日次報告）- Xチーム =====
  buppan: {
    id: "buppan",
    name: "スマホ物販チーム",
    color: "#eab308",
    type: "x",
    
    // 日次報告
    reportCycle: "daily",
    reportDeadline: {
      hour: 23,
      minute: 59,
    },
    
    // リマインドスケジュール
    reminderSchedule: [
      // 当日 19:30 - 軽い声かけ
      { hour: 19, minute: 30, type: "gentle" },
      // 当日 22:00 - 応援
      { hour: 22, minute: 0, type: "supportive" },
      // 翌朝 8:00 - フォローアップ
      { nextDay: true, hour: 8, minute: 0, type: "followup" },
    ],
    
    dailyPostGoal: 5,
  },
};

// ===== ヘルパー関数 =====

/**
 * チームIDからチーム設定を取得
 */
export function getTeamConfig(teamId: string): TeamConfig | null {
  return TEAM_CONFIG[teamId] || null;
}

/**
 * 全チームの設定を取得
 */
export function getAllTeamConfigs(): TeamConfig[] {
  return Object.values(TEAM_CONFIG);
}

/**
 * チームの報告サイクルが週次かどうか
 */
export function isWeeklyTeam(teamId: string): boolean {
  const config = getTeamConfig(teamId);
  return config?.reportCycle === "weekly";
}

/**
 * チームの報告サイクルが日次かどうか
 */
export function isDailyTeam(teamId: string): boolean {
  const config = getTeamConfig(teamId);
  return config?.reportCycle === "daily";
}

/**
 * 今週の報告締切日時を取得（週次チーム用）
 */
export function getWeeklyDeadline(teamId: string, referenceDate: Date = new Date()): Date {
  const config = getTeamConfig(teamId);
  if (!config || config.reportCycle !== "weekly") {
    throw new Error(`${teamId} is not a weekly team`);
  }
  
  const deadline = new Date(referenceDate);
  const currentDay = deadline.getDay();
  const targetDay = config.reportDeadline.dayOfWeek || 0;
  
  // 今週の締切曜日までの日数を計算
  let daysUntilDeadline = targetDay - currentDay;
  if (daysUntilDeadline < 0) {
    daysUntilDeadline += 7; // 次週の締切
  }
  
  deadline.setDate(deadline.getDate() + daysUntilDeadline);
  deadline.setHours(config.reportDeadline.hour, config.reportDeadline.minute, 59, 999);
  
  return deadline;
}

/**
 * 今日の報告締切日時を取得（日次チーム用）
 */
export function getDailyDeadline(teamId: string, referenceDate: Date = new Date()): Date {
  const config = getTeamConfig(teamId);
  if (!config || config.reportCycle !== "daily") {
    throw new Error(`${teamId} is not a daily team`);
  }
  
  const deadline = new Date(referenceDate);
  deadline.setHours(config.reportDeadline.hour, config.reportDeadline.minute, 59, 999);
  
  return deadline;
}

/**
 * 報告期間のラベルを取得
 */
export function getPeriodLabel(teamId: string, period: "today" | "week" | "month"): string {
  const config = getTeamConfig(teamId);
  if (!config) return "";
  
  if (config.reportCycle === "daily") {
    switch (period) {
      case "today": return "今日";
      case "week": return "今週累計";
      case "month": return "今月累計";
    }
  } else {
    switch (period) {
      case "today": return "今週分";
      case "week": return "今週分";
      case "month": return "今月累計";
    }
  }
  return "";
}

/**
 * 週の開始日を取得（月曜始まり）
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始に
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 週の終了日を取得（日曜終わり）
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * 今月のデカード（10日周期）を取得
 * @returns 1 = 1-10日, 2 = 11-20日, 3 = 21-末日
 */
export function getCurrentDecade(date: Date = new Date()): 1 | 2 | 3 {
  const day = date.getDate();
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

/**
 * 次のデカード判定日を取得
 * 10日・20日・月末の翌朝9:00
 */
export function getNextDecadeJudgmentDate(date: Date = new Date()): Date {
  const day = date.getDate();
  const result = new Date(date);
  
  if (day < 10) {
    result.setDate(11); // 10日の翌日
  } else if (day < 20) {
    result.setDate(21); // 20日の翌日
  } else {
    // 翌月1日
    result.setMonth(result.getMonth() + 1, 1);
  }
  
  result.setHours(9, 0, 0, 0); // 朝9:00
  return result;
}

// ===== 報告状況の判定 =====

export type ReportStatus = "submitted" | "pending" | "overdue" | "at_risk";

/**
 * ユーザーの報告状況を判定
 */
export function getReportStatus(
  teamId: string,
  lastReportDate: Date | null,
  now: Date = new Date()
): ReportStatus {
  const config = getTeamConfig(teamId);
  if (!config) return "at_risk";
  
  if (config.reportCycle === "daily") {
    return getDailyReportStatus(lastReportDate, now);
  } else {
    return getWeeklyReportStatus(teamId, lastReportDate, now);
  }
}

function getDailyReportStatus(lastReportDate: Date | null, now: Date): ReportStatus {
  if (!lastReportDate) return "at_risk";
  
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const lastReport = new Date(lastReportDate);
  lastReport.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today.getTime() - lastReport.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) return "submitted";  // 今日報告済み
  if (daysDiff === 1) return "pending";    // 昨日は報告、今日はまだ
  if (daysDiff <= 3) return "overdue";     // 2-3日空き
  return "at_risk";                         // 4日以上空き
}

function getWeeklyReportStatus(
  teamId: string,
  lastReportDate: Date | null,
  now: Date
): ReportStatus {
  if (!lastReportDate) return "at_risk";
  
  const weekStart = getWeekStart(now);
  const lastReport = new Date(lastReportDate);
  
  // 今週の報告があるか
  if (lastReport >= weekStart) {
    return "submitted";
  }
  
  // 先週の報告があるか
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  if (lastReport >= lastWeekStart) {
    return "pending"; // 先週は報告、今週はまだ
  }
  
  // 2週間以上空いているか
  const twoWeeksAgo = new Date(weekStart);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  if (lastReport >= twoWeeksAgo) {
    return "overdue";
  }
  
  return "at_risk";
}

/**
 * ステータスに応じたアラートレベル
 */
export function getAlertLevel(status: ReportStatus): "safe" | "attention" | "warning" | "danger" {
  switch (status) {
    case "submitted": return "safe";
    case "pending": return "attention";
    case "overdue": return "warning";
    case "at_risk": return "danger";
  }
}

/**
 * アラートレベルの色を取得
 */
export function getAlertColor(level: "safe" | "attention" | "warning" | "danger"): string {
  switch (level) {
    case "safe": return "#22c55e";      // 緑
    case "attention": return "#eab308"; // 黄
    case "warning": return "#f97316";   // オレンジ
    case "danger": return "#ef4444";    // 赤
  }
}
