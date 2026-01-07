/**
 * CC Insight v2: The Sovereign Command
 * Slack通知テストAPI
 * 
 * 使い方: http://localhost:3001/api/test-slack にアクセス
 */

import { NextResponse } from "next/server";
import { sendTestNotification } from "@/lib/slack-notifier";

export async function GET(request: Request) {
  try {
    console.log("🧪 Slack通知テスト開始...");
    
    await sendTestNotification();
    
    return NextResponse.json({
      success: true,
      message: "✅ Slack通知テスト送信完了！菅原副社長のDMと管理者チャンネルを確認してください。",
    });
  } catch (error) {
    console.error("❌ Slack通知テストエラー:", error);
    
    return NextResponse.json({
      success: false,
      message: "❌ Slack通知テスト失敗",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
