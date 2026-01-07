import { NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/slack-notifier';

export async function GET() {
  try {
    await sendTestNotification();
    return NextResponse.json({
      success: true,
      message: 'Slack通知テスト送信完了',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
