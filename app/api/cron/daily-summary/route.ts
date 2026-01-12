import { NextResponse } from 'next/server';
import { sendDailySummary } from '@/lib/slack-notifier';
import { getAllUsersSnapshot, getReportsSince } from '@/lib/services/report';

// アチーブメントメッセージ生成（選択理論心理学・内的コントロール）
function generateAchievementMessage(stats: {
  activeRate: number;
  dangerCount: number;
  totalMembers: number;
  todayReports: number;
}): string {
  const { activeRate, dangerCount, totalMembers, todayReports } = stats;

  // 選択理論心理学に基づくメッセージ（外的コントロール排除、内的コントロール促進）
  const messages = [];

  if (activeRate >= 80) {
    messages.push('🌟 素晴らしい！チームの自律性が高まっています');
    messages.push('💪 メンバー一人ひとりが「自分の目標」に焦点を当てている証拠です');
  } else if (activeRate >= 60) {
    messages.push('✨ 着実な進捗です。自己管理の習慣が定着してきています');
    messages.push('🎯 「やらされている」ではなく「やりたいからやる」状態を目指しましょう');
  } else if (activeRate >= 40) {
    messages.push('🔄 改善の余地があります。メンバーが「自分で選択している」実感を持てていますか？');
    messages.push('💡 批判や強制ではなく、対話を通じて内発的動機を引き出しましょう');
  } else {
    messages.push('⚠️ 組織の活力低下が見られます。外的コントロールに頼っていませんか？');
    messages.push('🤝 信頼関係を築き、メンバーが「自分の人生を自分で決めている」感覚を取り戻すサポートを');
  }

  if (dangerCount > 0) {
    messages.push(`\n📌 ${dangerCount}名が離脱リスク状態 - 彼らの「欲求」を理解し、自律的な選択をサポートする対話が必要です`);
  }

  if (todayReports >= totalMembers * 0.5) {
    messages.push(`\n🚀 本日${todayReports}件の報告 - 自己責任を持って行動するメンバーが増えています`);
  }

  return messages.join('\n');
}

// メッセージ付きサマリー送信（既存関数を拡張）
async function sendDailySummaryWithMessage(data: {
  totalMembers: number;
  activeToday: number;
  dangerCount: number;
  warningCount: number;
  todayReports: number;
  achievementMessage: string;
}): Promise<void> {
  // 既存のSlack通知を送信
  await sendDailySummary({
    totalMembers: data.totalMembers,
    activeToday: data.activeToday,
    dangerCount: data.dangerCount,
    warningCount: data.warningCount,
    todayReports: data.todayReports,
  });

  // アチーブメントメッセージを追加送信
  const webhookUrl = process.env.SLACK_WEBHOOK_CEO || '';
  if (!webhookUrl) return;

  const message = {
    text: '💭 リーダーへのメッセージ',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💭 アチーブメントの視点*\n\n${data.achievementMessage}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '選択理論心理学: 人は外からコントロールできない。内発的動機を引き出す環境を作ることが真のリーダーシップ',
          },
        ],
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('❌ アチーブメントメッセージ送信エラー:', error);
  }
}

export async function GET(request: Request) {
  try {
    // 🔐 セキュリティ強化: Vercel Cron専用ヘッダーチェック + Bearer token
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Vercel Cronからのリクエストでない、または認証トークンが一致しない場合は拒否
    if (!vercelCronHeader || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      console.warn('⚠️ 不正なCronアクセス試行を検出:', {
        hasVercelHeader: !!vercelCronHeader,
        hasToken: !!token,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('📊 デイリーサマリーCron実行開始...');

    // Service層を使用してデータ取得
    const users = await getAllUsersSnapshot();
    const totalMembers = users.length;

    // 本日0時のタイムスタンプ
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 本日の報告取得 (Service層を使用)
    const todayReportsData = await getReportsSince(today);
    const todayReports = todayReportsData.length;

    // アクティブメンバー数（本日報告したユーザー）
    const activeUserIds = new Set(
      todayReportsData.map(report => report.userId)
    );
    const activeToday = activeUserIds.size;

    // 離脱リスク・要注意メンバーのカウント
    let dangerCount = 0;
    let warningCount = 0;

    const now = Date.now();
    const fourDaysAgo = now - (4 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);

    for (const user of users) {
      const userData = user.data;
      const lastReportAt = (userData.lastReportAt as any)?.toMillis?.() || 0;

      if (lastReportAt < fourDaysAgo) {
        dangerCount++;
      } else if (lastReportAt < twoDaysAgo) {
        warningCount++;
      }
    }

    // アチーブメントメッセージ生成（選択理論心理学・内的コントロール）
    const achievementMessage = generateAchievementMessage({
      activeRate: Math.round((activeToday / totalMembers) * 100),
      dangerCount,
      totalMembers,
      todayReports,
    });

    // Slack通知送信
    await sendDailySummaryWithMessage({
      totalMembers,
      activeToday,
      dangerCount,
      warningCount,
      todayReports,
      achievementMessage,
    });

    console.log('✅ デイリーサマリー送信完了');

    return NextResponse.json({
      success: true,
      message: 'デイリーサマリー送信完了',
      data: {
        totalMembers,
        activeToday,
        dangerCount,
        warningCount,
        todayReports,
      },
    });
  } catch (error) {
    console.error('❌ デイリーサマリーCronエラー:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
