import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { notifyDangerMembers } from '@/lib/slack-notifier';
import { getTeamConfig } from '@/lib/team-config';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🔍 エスカレーション確認Cron実行開始...');
    
    // Firestoreから全ユーザーを取得
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const now = Date.now();
    const fourDaysAgo = now - (4 * 24 * 60 * 60 * 1000);
    
    // 4日以上未報告のメンバーを抽出（放置時間順にソート）
    const dangerMembers: Array<{
      displayName: string;
      team: string;
      lastReportDaysAgo: number;
      totalReports: number;
      hoursUnresponsive: number; // 追加：放置時間（時間単位）
    }> = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const lastReportAt = userData.lastReportAt?.toMillis() || 0;
      
      if (lastReportAt > 0 && lastReportAt < fourDaysAgo) {
        const hoursSinceLastReport = Math.floor((now - lastReportAt) / (1000 * 60 * 60));
        const daysSinceLastReport = Math.floor(hoursSinceLastReport / 24);
        
        dangerMembers.push({
          displayName: userData.displayName || 'Unknown',
          team: userData.team || 'unknown',
          lastReportDaysAgo: daysSinceLastReport,
          totalReports: userData.totalReports || 0,
          hoursUnresponsive: hoursSinceLastReport,
        });
      }
    }
    
    // 放置時間が長い順にソート（優先度付け）
    dangerMembers.sort((a, b) => b.hoursUnresponsive - a.hoursUnresponsive);
    
    console.log(`🚨 離脱リスクメンバー検出: ${dangerMembers.length}名`);
    
    // 最も放置されているTOP5をログ出力
    if (dangerMembers.length > 0) {
      console.log('📊 TOP5 最も放置されているメンバー:');
      dangerMembers.slice(0, 5).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.displayName}: ${m.hoursUnresponsive}時間 (${m.lastReportDaysAgo}日)`);
      });
    }
    
    // 危険なメンバーが5名以上いる場合のみSlack通知
    if (dangerMembers.length >= 5) {
      await notifyDangerMembers(dangerMembers);
      console.log('✅ Slack通知送信完了');
    } else if (dangerMembers.length > 0) {
      console.log(`⚠️ 離脱リスク${dangerMembers.length}名（5名未満のため通知スキップ）`);
    } else {
      console.log('✅ 離脱リスクメンバーなし');
    }
    
    console.log('✅ エスカレーション確認完了');
    
    return NextResponse.json({
      success: true,
      message: 'エスカレーション確認完了',
      data: {
        dangerCount: dangerMembers.length,
        notified: dangerMembers.length >= 5,
        top5: dangerMembers.slice(0, 5).map(m => ({
          name: m.displayName,
          team: getTeamConfig(m.team)?.name || m.team,
          daysAgo: m.lastReportDaysAgo,
          hoursUnresponsive: m.hoursUnresponsive,
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
