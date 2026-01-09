import { NextResponse } from 'next/server';
import { backupAllDataToSheets } from '@/lib/google-sheets-backup';

// Vercel Cronからのみ実行可能
export async function GET(request: Request) {
  try {
    // Cron認証チェック
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting daily backup to Google Sheets...');

    const results = await backupAllDataToSheets();

    const summary = {
      timestamp: new Date().toISOString(),
      reports: results.reports,
      users: results.users,
      guardians: results.guardians,
    };

    console.log('✅ Backup completed:', summary);

    return NextResponse.json({
      success: true,
      message: 'Daily backup completed',
      ...summary,
    });
  } catch (error: any) {
    console.error('❌ Backup cron job failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 手動実行用（管理者のみ）
export async function POST(request: Request) {
  try {
    // 簡易認証（本番では適切な認証を使用）
    const { secret } = await request.json();
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting manual backup to Google Sheets...');

    const results = await backupAllDataToSheets();

    return NextResponse.json({
      success: true,
      message: 'Manual backup completed',
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error: any) {
    console.error('❌ Manual backup failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
