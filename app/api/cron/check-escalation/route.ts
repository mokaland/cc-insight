import { NextResponse } from 'next/server';
import { getAllUsersSnapshot } from '@/lib/services/report';
import { notifyDangerMembers } from '@/lib/slack-notifier';
import { getTeamConfig } from '@/lib/team-config';

// 🔴 最重要アラート通知（72時間以上放置）
async function sendCriticalAlertToSlack(
  members: Array<{
    displayName: string;
    team: string;
    hoursUnresponsive: number;
    lastReportDaysAgo: number;
    userId: string;
  }>
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_CEO || '';
  if (!webhookUrl) return;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'cc-insight';

  const message = {
    text: `🔴 【最重要アラート】72時間以上放置されているメンバーが${members.length}名います`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔴 最重要アラート：即座の対応が必要です',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*72時間以上活動が停止しているメンバーが${members.length}名検出されました。*\n\n組織の活力維持のため、至急フォローアップをお願いします。`,
        },
      },
      {
        type: 'divider',
      },
      ...members.slice(0, 5).map(m => ({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*🔴 ${m.displayName}*`,
          },
          {
            type: 'mrkdwn',
            text: `*${m.hoursUnresponsive}時間* (${m.lastReportDaysAgo}日前)`,
          },
          {
            type: 'mrkdwn',
            text: `チーム: ${getTeamConfig(m.team)?.name || m.team}`,
          },
          {
            type: 'mrkdwn',
            text: `<https://console.firebase.google.com/project/${projectId}/firestore/data/~2Fusers~2F${m.userId}|Firebaseで確認 →>`,
          },
        ],
      })),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚠️ 72時間以上の無反応は組織からの離脱リスクが極めて高い状態です',
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔴 Active Monitorで確認',
              emoji: true,
            },
            url: 'https://cc-insight.vercel.app/admin/monitor',
            style: 'danger',
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
    console.error('❌ 最重要アラート送信エラー:', error);
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

    console.log('🔍 エスカレーション確認Cron実行開始...');

    // Service層を使用して全ユーザーを取得
    const users = await getAllUsersSnapshot();

    const now = Date.now();
    const fourDaysAgo = now - (4 * 24 * 60 * 60 * 1000);

    // 段階的警告レベルの定義
    const LEVELS = {
      YELLOW: 24,  // 24時間（🟡）
      ORANGE: 48,  // 48時間（🟠）
      RED: 72,     // 72時間（🔴）最重要
    };

    // 2日以上未報告のメンバーを抽出（48時間 = 🟡イエロー基準）
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);

    const riskyMembers: Array<{
      displayName: string;
      team: string;
      lastReportDaysAgo: number;
      totalReports: number;
      hoursUnresponsive: number;
      alertLevel: '🟡' | '🟠' | '🔴';
      alertLevelText: string;
      userId: string;
    }> = [];

    for (const user of users) {
      const userData = user.data;
      const lastReportAt = (userData.lastReportAt as any)?.toMillis?.() || 0;

      if (lastReportAt > 0 && lastReportAt < twoDaysAgo) {
        const hoursSinceLastReport = Math.floor((now - lastReportAt) / (1000 * 60 * 60));
        const daysSinceLastReport = Math.floor(hoursSinceLastReport / 24);

        // 段階的警告レベルの判定
        let alertLevel: '🟡' | '🟠' | '🔴';
        let alertLevelText: string;

        if (hoursSinceLastReport >= LEVELS.RED) {
          alertLevel = '🔴';
          alertLevelText = '【最重要アラート】';
        } else if (hoursSinceLastReport >= LEVELS.ORANGE) {
          alertLevel = '🟠';
          alertLevelText = '【重要警告】';
        } else {
          alertLevel = '🟡';
          alertLevelText = '【通常警告】';
        }

        riskyMembers.push({
          displayName: (userData.displayName as string) || 'Unknown',
          team: (userData.team as string) || 'unknown',
          lastReportDaysAgo: daysSinceLastReport,
          totalReports: (userData.totalReports as number) || 0,
          hoursUnresponsive: hoursSinceLastReport,
          alertLevel,
          alertLevelText,
          userId: user.id,
        });
      }
    }

    // 放置時間が長い順にソート（優先度付け）
    riskyMembers.sort((a, b) => b.hoursUnresponsive - a.hoursUnresponsive);

    // 各警告レベルの集計
    const redCount = riskyMembers.filter(m => m.alertLevel === '🔴').length;
    const orangeCount = riskyMembers.filter(m => m.alertLevel === '🟠').length;
    const yellowCount = riskyMembers.filter(m => m.alertLevel === '🟡').length;

    console.log(`🚨 リスクメンバー検出: ${riskyMembers.length}名`);
    console.log(`   🔴 最重要(72h+): ${redCount}名`);
    console.log(`   🟠 重要(48h+): ${orangeCount}名`);
    console.log(`   🟡 通常(24h+): ${yellowCount}名`);

    // 最も放置されているTOP5をログ出力
    if (riskyMembers.length > 0) {
      console.log('📊 TOP5 最も放置されているメンバー:');
      riskyMembers.slice(0, 5).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.alertLevel} ${m.displayName}: ${m.hoursUnresponsive}時間 (${m.lastReportDaysAgo}日)`);
      });
    }

    // 段階的Slack通知（レベル別に送信）
    if (redCount > 0) {
      // 🔴 最重要アラート（72時間以上）- 強力な警告文言
      const redMembers = riskyMembers.filter(m => m.alertLevel === '🔴');
      await sendCriticalAlertToSlack(redMembers);
      console.log(`🔴 最重要アラート送信: ${redCount}名`);
    }

    if (riskyMembers.length >= 3) {
      // 全体サマリー（3名以上の場合）
      await notifyDangerMembers(riskyMembers);
      console.log('✅ 全体サマリー送信完了');
    } else if (riskyMembers.length > 0) {
      console.log(`⚠️ リスクメンバー${riskyMembers.length}名（3名未満のため全体通知スキップ）`);
    } else {
      console.log('✅ リスクメンバーなし');
    }

    console.log('✅ エスカレーション確認完了');

    return NextResponse.json({
      success: true,
      message: 'エスカレーション確認完了',
      data: {
        totalCount: riskyMembers.length,
        redCount,
        orangeCount,
        yellowCount,
        notified: riskyMembers.length >= 3 || redCount > 0,
        top5: riskyMembers.slice(0, 5).map(m => ({
          name: m.displayName,
          team: getTeamConfig(m.team)?.name || m.team,
          daysAgo: m.lastReportDaysAgo,
          hoursUnresponsive: m.hoursUnresponsive,
          alertLevel: m.alertLevel,
        })),
      },
    });
  } catch (error) {
    console.error('❌ エスカレーション確認Cronエラー:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
