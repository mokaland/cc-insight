/**
 * CC Insight v2: The Sovereign Command
 * 10日・20日判定の自動実行Cron
 * 
 * 実行: 毎月11日・21日の朝9:00（JST）
 * スケジュール: 0 9 11,21 * * (UTC: 0 0 11,21 * *)
 */

import { NextResponse } from "next/server";
import { executeDecadeJudgment } from "@/lib/adapt-cycle";
import { getCurrentDecade } from "@/lib/team-config";
import { notifyDecadeJudgmentToCEO, notifyDecadeJudgmentToAdminChannel } from "@/lib/slack-notifier";
import { saveJudgmentHistory } from "@/lib/services/report";

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

    console.log("🎯 ADAPT判定Cron実行開始...");

    // 現在のデカードを取得（前日基準）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const decade = getCurrentDecade(yesterday);

    console.log(`📊 ${decade === 1 ? "10日" : "20日"}時点の判定を実行...`);

    // 判定実行
    const judgments = await executeDecadeJudgment(decade);

    console.log(`✅ 判定完了: ${judgments.length}チーム`);

    // Slack通知
    await Promise.all([
      notifyDecadeJudgmentToCEO(judgments, decade),
      notifyDecadeJudgmentToAdminChannel(judgments, decade),
    ]);

    console.log("🎯 Slack通知送信完了");

    // Service層を使用して判定結果を保存
    await Promise.all(judgments.map(async (judgment) => {
      await saveJudgmentHistory(judgment as unknown as Record<string, unknown>);
    }));

    return NextResponse.json({
      success: true,
      decade,
      judgments: judgments.length,
      message: `✅ ${decade === 1 ? "10日" : "20日"}判定完了。Slack通知送信済み。`,
    });
  } catch (error) {
    console.error("❌ ADAPT判定Cronエラー:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
