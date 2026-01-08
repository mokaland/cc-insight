/**
 * エナジー履歴遡及記録スクリプト
 * 
 * 目的: 既存のreportsから過去のエナジー獲得履歴を推測し、
 *       energy_historyコレクションに遡及記録を作成
 * 
 * 使用方法: node scripts/backfill-energy-history.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Firebase Admin初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backfillEnergyHistory() {
  console.log('🔄 エナジー履歴遡及記録を開始します...\n');

  try {
    // 1. 全レポートを取得
    console.log('📥 全レポートを取得中...');
    const reportsSnapshot = await db.collection('reports').get();
    const reports = [];
    
    reportsSnapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ ${reports.length}件のレポートを取得しました\n`);

    // 2. ユーザーごとにグループ化
    const reportsByUser = {};
    
    reports.forEach(report => {
      if (!report.userId) return;
      
      if (!reportsByUser[report.userId]) {
        reportsByUser[report.userId] = [];
      }
      
      reportsByUser[report.userId].push(report);
    });

    const userIds = Object.keys(reportsByUser);
    console.log(`👥 ${userIds.length}人のユーザーを検出しました\n`);

    // 3. 各ユーザーの履歴をチェック＆作成
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const userId of userIds) {
      const userReports = reportsByUser[userId];
      
      // ユーザー情報を取得
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.log(`⚠️  ユーザー ${userId} が見つかりません（スキップ）`);
        totalSkipped += userReports.length;
        continue;
      }

      const userData = userDoc.data();
      const displayName = userData.displayName || 'Unknown';

      console.log(`\n👤 ${displayName} (${userId})`);
      console.log(`   レポート数: ${userReports.length}件`);

      let created = 0;
      let skipped = 0;

      for (const report of userReports) {
        // 既存の履歴をチェック
        const historyQuery = await db.collection('energy_history')
          .where('userId', '==', userId)
          .where('sourceType', '==', 'daily_report')
          .where('sourceId', '==', report.id)
          .limit(1)
          .get();

        if (!historyQuery.empty) {
          skipped++;
          continue;
        }

        // エナジー計算（簡易版）
        // - 日報提出: 10E
        // - ストリークボーナス: 計算は複雑なので基本値のみ
        const baseEnergy = 10;

        // 履歴レコードを作成
        await db.collection('energy_history').add({
          userId: userId,
          amount: baseEnergy,
          type: 'earn',
          sourceType: 'daily_report',
          sourceId: report.id,
          description: `日報提出（遡及記録）`,
          createdAt: report.createdAt || admin.firestore.Timestamp.now(),
          metadata: {
            backfilled: true,
            backfilledAt: admin.firestore.Timestamp.now(),
            reportDate: report.date
          }
        });

        created++;
      }

      console.log(`   ✅ 作成: ${created}件 | スキップ: ${skipped}件`);
      
      totalCreated += created;
      totalSkipped += skipped;
    }

    console.log('\n\n🎉 遡及記録が完了しました！');
    console.log(`📊 統計:`);
    console.log(`   - 作成された履歴: ${totalCreated}件`);
    console.log(`   - スキップされた履歴: ${totalSkipped}件`);
    console.log(`   - 処理したユーザー: ${userIds.length}人`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }

  process.exit(0);
}

// 実行
console.log('='.repeat(60));
console.log('  エナジー履歴遡及記録スクリプト');
console.log('='.repeat(60));
console.log('');

backfillEnergyHistory();
