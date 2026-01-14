/**
 * CC Insight v2: The Sovereign Command
 * Slack Notifier - 0.5秒で把握できる通知システム
 * 
 * 【設計思想】
 * 1. 菅原副社長のSlack DMへ最重要情報を即時通知
 * 2. 管理者用チャンネルへ詳細レポート
 * 3. 24時間無反応時の自動エスカレーション
 * 4. リッチなフォーマットで視認性を最大化
 */

import { DecadeJudgment, getStatusLabel, formatGap, formatValue, JudgmentStatus } from "./adapt-cycle";
import { getTeamConfig } from "./team-config";

// ===== Slack設定 =====

const SLACK_WEBHOOK_URLS = {
  // 菅原副社長DM用
  ceo: process.env.SLACK_WEBHOOK_CEO || "",
  // 管理者チャンネル用
  admin: process.env.SLACK_WEBHOOK_ADMIN || "",
};

interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
}

// ===== 10日判定結果通知 =====

/**
 * ADAPT判定結果を菅原副社長のDMに通知
 */
export async function notifyDecadeJudgmentToCEO(
  judgments: DecadeJudgment[],
  decade: 1 | 2 | 3
): Promise<void> {
  const decadeLabel = decade === 1 ? "10日" : decade === 2 ? "20日" : "月末";
  const now = new Date();
  const month = now.getMonth() + 1;

  // 危機的状況のチームを抽出
  const criticalTeams = judgments.filter(j => j.status === "critical");
  const needsAttentionTeams = judgments.filter(j => j.status === "needs_attention");
  const excellentTeams = judgments.filter(j => j.status === "excellent");

  // 概要テキスト
  let summaryText = `🎯 *${month}月 ${decadeLabel}時点 ADAPT判定*\n\n`;

  if (criticalTeams.length > 0) {
    summaryText += `🚨 *危機的: ${criticalTeams.length}チーム*\n`;
    criticalTeams.forEach(t => {
      summaryText += `   └ ${t.teamName}: ${t.actualProgress}% (${formatGap(t.gapPercentage)})\n`;
    });
    summaryText += `\n`;
  }

  if (needsAttentionTeams.length > 0) {
    summaryText += `⚠️ *要注意: ${needsAttentionTeams.length}チーム*\n`;
    needsAttentionTeams.forEach(t => {
      summaryText += `   └ ${t.teamName}: ${t.actualProgress}% (${formatGap(t.gapPercentage)})\n`;
    });
    summaryText += `\n`;
  }

  if (excellentTeams.length > 0) {
    summaryText += `🌟 *優秀: ${excellentTeams.length}チーム*\n`;
    excellentTeams.forEach(t => {
      summaryText += `   └ ${t.teamName}: ${t.actualProgress}% (${formatGap(t.gapPercentage)})\n`;
    });
    summaryText += `\n`;
  }

  // リーダー対応状況
  const awaitingResponse = judgments.filter(j => !j.leaderResponse).length;
  if (awaitingResponse > 0) {
    summaryText += `⏳ *リーダー対応待ち: ${awaitingResponse}チーム*\n`;
  }

  summaryText += `\n📊 詳細: https://cc-insight.vercel.app/admin/adapt`;

  const message: SlackMessage = {
    text: summaryText,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🎯 ${month}月 ${decadeLabel}時点 ADAPT判定`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: summaryText,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📊 詳細を確認",
              emoji: true,
            },
            url: "https://cc-insight.vercel.app/admin/adapt",
            style: criticalTeams.length > 0 ? "danger" : "primary",
          },
        ],
      },
    ],
  };

  await sendSlackMessage(SLACK_WEBHOOK_URLS.ceo, message);
}

/**
 * 管理者チャンネルに詳細レポートを通知
 */
export async function notifyDecadeJudgmentToAdminChannel(
  judgments: DecadeJudgment[],
  decade: 1 | 2 | 3
): Promise<void> {
  const decadeLabel = decade === 1 ? "10日" : decade === 2 ? "20日" : "月末";
  const now = new Date();
  const month = now.getMonth() + 1;

  // 各チームの詳細をAttachmentとして追加
  const attachments = judgments.map(j => {
    const teamConfig = getTeamConfig(j.teamId);
    const color = getStatusColorCode(j.status);

    return {
      color,
      title: `${j.teamName} ${getStatusLabel(j.status)}`,
      fields: [
        {
          title: "実績",
          value: `${formatValue(j.actualValue)}pt (${j.actualProgress}%)`,
          short: true,
        },
        {
          title: "理想",
          value: `${formatValue(j.idealValue)}pt (${j.idealProgress}%)`,
          short: true,
        },
        {
          title: "乖離",
          value: formatGap(j.gapPercentage),
          short: true,
        },
        {
          title: "リーダー対応",
          value: j.leaderResponse
            ? `✅ 対応済み (${j.leaderResponse.actionType})`
            : "⏳ 対応待ち",
          short: true,
        },
      ],
      footer: `判定日時: ${j.judgedAt.toLocaleString("ja-JP")}`,
    };
  });

  const message: SlackMessage = {
    text: `📊 ${month}月 ${decadeLabel}時点 ADAPT判定結果（詳細）`,
    attachments,
  };

  await sendSlackMessage(SLACK_WEBHOOK_URLS.admin, message);
}

// ===== 24時間無反応エスカレーション =====

/**
 * リーダーが24時間対応しない場合のエスカレーション通知
 */
export async function notifyEscalation(
  judgment: DecadeJudgment
): Promise<void> {
  const teamConfig = getTeamConfig(judgment.teamId);
  const hoursSinceJudgment = Math.floor(
    (Date.now() - judgment.judgedAt.getTime()) / (1000 * 60 * 60)
  );

  const message: SlackMessage = {
    text: `🚨 *エスカレーション通知*\n\n${judgment.teamName}の10日判定に${hoursSinceJudgment}時間対応がありません。`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 エスカレーション通知",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${judgment.teamName}*の10日判定に*${hoursSinceJudgment}時間*対応がありません。\n\nステータス: ${getStatusLabel(judgment.status)}\n進捗率: ${judgment.actualProgress}% (${formatGap(judgment.gapPercentage)})`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*判定日時*\n${judgment.judgedAt.toLocaleString("ja-JP")}`,
          },
          {
            type: "mrkdwn",
            text: `*経過時間*\n${hoursSinceJudgment}時間`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "🔴 直接確認する",
              emoji: true,
            },
            url: `https://cc-insight.vercel.app/admin/adapt?team=${judgment.teamId}`,
            style: "danger",
          },
        ],
      },
    ],
  };

  // 菅原副社長DMと管理者チャンネルの両方に通知
  await Promise.all([
    sendSlackMessage(SLACK_WEBHOOK_URLS.ceo, message),
    sendSlackMessage(SLACK_WEBHOOK_URLS.admin, message),
  ]);
}

// ===== リーダー対応完了通知 =====

/**
 * リーダーが対応を完了した際の通知
 */
export async function notifyLeaderResponse(
  judgment: DecadeJudgment
): Promise<void> {
  if (!judgment.leaderResponse) return;

  const action = judgment.leaderResponse;
  const teamConfig = getTeamConfig(judgment.teamId);

  const message: SlackMessage = {
    text: `✅ ${judgment.teamName}のリーダーが対応しました`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✅ リーダー対応完了",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${judgment.teamName}*のリーダーが判定に対応しました。`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*対応内容*\n${getActionLabel(action.actionType)}`,
          },
          {
            type: "mrkdwn",
            text: `*新目標*\n${action.newGoal ? formatValue(action.newGoal) + "pt" : "変更なし"}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*対応理由*\n${action.reason}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `対応日時: ${action.respondedAt.toLocaleString("ja-JP")}`,
          },
        ],
      },
    ],
  };

  await sendSlackMessage(SLACK_WEBHOOK_URLS.admin, message);
}

// ===== Active Monitor通知（離脱リスク） =====

/**
 * 離脱リスクメンバーの緊急通知
 */
export async function notifyDangerMembers(
  members: Array<{
    displayName: string;
    team: string;
    lastReportDaysAgo: number;
    totalReports: number;
  }>
): Promise<void> {
  if (members.length === 0) return;

  const message: SlackMessage = {
    text: `🚨 *離脱リスクメンバー検出: ${members.length}名*`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚨 離脱リスクメンバー検出`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${members.length}名*のメンバーが4日以上未報告です。`,
        },
      },
      ...members.slice(0, 5).map(m => ({
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*${m.displayName}*`,
          },
          {
            type: "mrkdwn",
            text: `${m.lastReportDaysAgo}日前 | ${getTeamConfig(m.team)?.name}`,
          },
        ],
      })),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📊 Active Monitorで確認",
              emoji: true,
            },
            url: "https://cc-insight.vercel.app/admin/monitor",
            style: "danger",
          },
        ],
      },
    ],
  };

  await sendSlackMessage(SLACK_WEBHOOK_URLS.ceo, message);
}

// ===== デイリーサマリー =====

/**
 * 毎朝の状況サマリー通知
 */
export async function sendDailySummary(data: {
  totalMembers: number;
  activeToday: number;
  dangerCount: number;
  warningCount: number;
  todayReports: number;
}): Promise<void> {
  const activeRate = data.totalMembers > 0
    ? Math.round((data.activeToday / data.totalMembers) * 100)
    : 0;

  const message: SlackMessage = {
    text: `☀️ *本日のサマリー*`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "☀️ 本日のサマリー",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*アクティブメンバー*\n${data.activeToday}/${data.totalMembers}名 (${activeRate}%)`,
          },
          {
            type: "mrkdwn",
            text: `*本日の報告*\n${data.todayReports}件`,
          },
          {
            type: "mrkdwn",
            text: `*離脱リスク*\n🚨 ${data.dangerCount}名`,
          },
          {
            type: "mrkdwn",
            text: `*要注意*\n⚠️ ${data.warningCount}名`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📊 管理画面を開く",
              emoji: true,
            },
            url: "https://cc-insight.vercel.app/admin/monitor",
            style: data.dangerCount > 0 ? "danger" : "primary",
          },
        ],
      },
    ],
  };

  await sendSlackMessage(SLACK_WEBHOOK_URLS.ceo, message);
}

// ===== ヘルパー関数 =====

function getActionLabel(action: string): string {
  const labels: { [key: string]: string } = {
    maintain: "現状維持",
    increase: "ペースアップ",
    decrease: "目標下方修正",
    pivot: "戦略変更",
  };
  return labels[action] || action;
}

function getStatusColorCode(status: JudgmentStatus): string {
  const colors = {
    excellent: "#22c55e",
    on_track: "#3b82f6",
    needs_attention: "#eab308",
    critical: "#ef4444",
  };
  return colors[status];
}

/**
 * Slack Webhook経由でメッセージ送信
 */
async function sendSlackMessage(webhookUrl: string, message: SlackMessage): Promise<void> {
  if (!webhookUrl) {
    console.warn("Slack Webhook URL not configured");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log("✅ Slack通知送信成功:", message.text);
  } catch (error) {
    console.error("❌ Slack通知送信エラー:", error);
    // エラーを投げずにログのみ（通知失敗でアプリを止めない）
  }
}

// ===== テスト用関数 =====

/**
 * テスト通知を送信
 */
export async function sendTestNotification(): Promise<void> {
  const message: SlackMessage = {
    text: "🧪 CC Insight テスト通知",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🧪 *CC Insight テスト通知*\n\nSlack通知機能が正常に動作しています✅",
        },
      },
    ],
  };

  await Promise.all([
    sendSlackMessage(SLACK_WEBHOOK_URLS.ceo, message),
    sendSlackMessage(SLACK_WEBHOOK_URLS.admin, message),
  ]);
}

// ===== 目標承認通知 =====

const TEAM_NAMES: Record<string, string> = {
  fukugyou: "副業チーム",
  taishoku: "退職サポートチーム",
  buppan: "スマホ物販チーム",
};

/**
 * 目標提出時の承認依頼通知を送信
 */
export async function notifyGoalSubmission(data: {
  goalId: string;
  teamId: string;
  goalType: "monthly" | "quarterly";
  year: number;
  month?: number;
  quarter?: number;
  submittedBy: string;
  goals: {
    pv: number;
    uu: number;
    lineRegistration: number;
    consultationBooking: number;
    consultationDone: number;
    yesAcquired: number;
    finalConversion: number;
    activeOrPaid: number;
  };
}): Promise<void> {
  const teamName = TEAM_NAMES[data.teamId] || data.teamId;
  const periodLabel = data.goalType === "monthly"
    ? `${data.year}年${data.month}月`
    : `${data.year}年 Q${data.quarter}`;

  const message: SlackMessage = {
    text: `📝 目標承認依頼: ${teamName} ${periodLabel}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📝 目標承認依頼",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${teamName}*から*${periodLabel}*の目標が提出されました。`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*PV*\n${data.goals.pv.toLocaleString()}`,
          },
          {
            type: "mrkdwn",
            text: `*UU*\n${data.goals.uu.toLocaleString()}`,
          },
          {
            type: "mrkdwn",
            text: `*LINE登録*\n${data.goals.lineRegistration.toLocaleString()}`,
          },
          {
            type: "mrkdwn",
            text: `*商談完了*\n${data.goals.consultationDone.toLocaleString()}`,
          },
          {
            type: "mrkdwn",
            text: `*YES獲得*\n${data.goals.yesAcquired.toLocaleString()}`,
          },
          {
            type: "mrkdwn",
            text: `*最終成約*\n${data.goals.finalConversion.toLocaleString()}`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `提出者: ${data.submittedBy} | 目標ID: ${data.goalId}`,
          },
        ],
      },
      {
        type: "actions",
        block_id: `goal_approval_${data.goalId}`,
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "✅ 承認",
              emoji: true,
            },
            style: "primary",
            action_id: "approve_goal",
            value: data.goalId,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "❌ 却下",
              emoji: true,
            },
            style: "danger",
            action_id: "reject_goal",
            value: data.goalId,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📊 詳細を確認",
              emoji: true,
            },
            url: `https://cc-insight-app.vercel.app/team/${data.teamId}?tab=goal`,
          },
        ],
      },
    ],
  };

  await sendSlackMessage(SLACK_WEBHOOK_URLS.ceo, message);
}

/**
 * 目標承認完了通知を送信
 */
export async function notifyGoalApproved(data: {
  goalId: string;
  teamId: string;
  periodLabel: string;
  approvedBy: string;
}): Promise<void> {
  const teamName = TEAM_NAMES[data.teamId] || data.teamId;

  const message: SlackMessage = {
    text: `✅ 目標承認完了: ${teamName} ${data.periodLabel}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *${teamName}*の*${data.periodLabel}*目標が承認されました。\n\n承認者: ${data.approvedBy}`,
        },
      },
    ],
  };

  await sendSlackMessage(SLACK_WEBHOOK_URLS.admin, message);
}

/**
 * 目標却下通知を送信
 */
export async function notifyGoalRejected(data: {
  goalId: string;
  teamId: string;
  periodLabel: string;
  rejectedBy: string;
  reason?: string;
}): Promise<void> {
  const teamName = TEAM_NAMES[data.teamId] || data.teamId;

  const message: SlackMessage = {
    text: `❌ 目標却下: ${teamName} ${data.periodLabel}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `❌ *${teamName}*の*${data.periodLabel}*目標が却下されました。\n\n却下者: ${data.rejectedBy}${data.reason ? `\n理由: ${data.reason}` : ""}`,
        },
      },
    ],
  };

  await Promise.all([
    sendSlackMessage(SLACK_WEBHOOK_URLS.ceo, message),
    sendSlackMessage(SLACK_WEBHOOK_URLS.admin, message),
  ]);
}

// ===== SNS承認申請通知 =====

const SNS_ICONS: Record<string, string> = {
  instagram: "📸",
  youtube: "📺",
  tiktok: "🎵",
  x: "𝕏",
};

const SNS_NAMES: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X (Twitter)",
};

/**
 * SNS承認申請があった際に管理者チャンネルに通知
 */
export async function notifySnsApprovalRequest(data: {
  userId: string;
  userName: string;
  userEmail: string;
  team: string;
  snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x';
  url: string;
}): Promise<void> {
  const teamName = TEAM_NAMES[data.team] || data.team || "未設定";
  const snsIcon = SNS_ICONS[data.snsKey] || "🔗";
  const snsName = SNS_NAMES[data.snsKey] || data.snsKey;

  const message: SlackMessage = {
    text: `🆕 SNS承認申請: ${data.userName}さんが${snsName}を登録しました`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🆕 SNS承認申請",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${data.userName}*（${teamName}）が*${snsName}*アカウントを登録しました。`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*${snsIcon} ${snsName}*\n<${data.url}|${data.url.substring(0, 50)}...>`,
          },
          {
            type: "mrkdwn",
            text: `*メール*\n${data.userEmail}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📋 SNS承認画面を開く",
              emoji: true,
            },
            url: "https://cc-insight-app.vercel.app/admin/sns-approvals",
            style: "primary",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "🔗 URLを確認",
              emoji: true,
            },
            url: data.url,
          },
        ],
      },
    ],
  };

  // 管理者チャンネルに通知
  await sendSlackMessage(SLACK_WEBHOOK_URLS.admin, message);
}
