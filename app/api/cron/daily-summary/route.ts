import { NextResponse } from 'next/server';
import { sendDailySummary } from '@/lib/slack-notifier';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('📊 デイリーサマリーCron実行開始...');
    
    // Firestoreから実データを取得
    const usersRef = collection(db, 'users');
    const reportsRef = collection(db, 'reports');
    
    // 全メンバー取得
    const usersSnapshot = await getDocs(usersRef);
    const totalMembers = usersSnapshot.size;
    
    // 本日0時のタイムスタンプ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);
    
    // 本日の報告取得
    const todayReportsQuery = query(
      reportsRef,
      where('createdAt', '>=', todayTimestamp)
    );
    const todayReportsSnapshot = await getDocs(todayReportsQuery);
    const todayReports = todayReportsSnapshot.size;
    
    // アクティブメンバー数（本日報告したユーザー）
    const activeUserIds = new Set(
      todayReportsSnapshot.docs.map(doc => doc.data().userId)
    );
    const activeToday = activeUserIds.size;
    
    // 離脱リスク・要注意メンバーのカウント
    let dangerCount = 0;
    let warningCount = 0;
    
    const now = Date.now();
    const fourDaysAgo = now - (4 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const lastReportAt = userData.lastReportAt?.toMillis() || 0;
      
      if (lastReportAt < fourDaysAgo) {
        dangerCount++;
      } else if (lastReportAt < twoDaysAgo) {
        warningCount++;
      }
    }
    
    // Slack通知送信
    await sendDailySummary({
      totalMembers,
      activeToday,
      dangerCount,
      warningCount,
      todayReports,
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
