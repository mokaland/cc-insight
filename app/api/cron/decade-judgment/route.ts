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

export async function GET(request: Request) {
  try {
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
    
    // TODO: Firestoreに判定結果を保存
    
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
