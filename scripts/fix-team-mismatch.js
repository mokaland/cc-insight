/**
 * チーム不一致データ修正スクリプト
 * 
 * 目的: usersコレクションのteam情報とreportsコレクションのteam情報の不一致を検出・修正
 * 
 * 実行方法:
 * node scripts/fix-team-mismatch.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Firebase Admin初期化
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ユーザー入力を取得
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function scanTeamMismatches() {
  console.log('\n🔍 チーム不一致データをスキャン中...\n');

  try {
    // 1. 全ユーザーを取得
    const usersSnapshot = await db.collection('users').get();
    const userTeamMap = {};
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      userTeamMap[doc.id] = {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        realName: data.realName,
        team: data.team
      };
    });

    console.log(`✅ ユーザー取得完了: ${Object.keys(userTeamMap).length}人\n`);

    // 2. 全レポートを取得
    const reportsSnapshot = await db.collection('reports').get();
    const mismatches = [];
    let totalReports = 0;
    let correctReports = 0;

    reportsSnapshot.forEach(doc => {
      totalReports++;
      const reportData = doc.data();
      const userId = reportData.userId;
      const reportTeam = reportData.team;
      
      if (!userId) {
        console.log(`⚠️  レポート ${doc.id}: userIdが未設定`);
        return;
      }

      const userInfo = userTeamMap[userId];
      
      if (!userInfo) {
        console.log(`⚠️  レポート ${doc.id}: ユーザーID ${userId} がusersコレクションに存在しません`);
        return;
      }

      const correctTeam = userInfo.team;

      if (reportTeam !== correctTeam) {
        mismatches.push({
          reportId: doc.id,
          userId: userId,
          userName: userInfo.displayName || userInfo.realName || 'Unknown',
          userEmail: userInfo.email,
          correctTeam: correctTeam,
          wrongTeam: reportTeam,
          date: reportData.date,
          createdAt: reportData.createdAt?.toDate?.() || 'Unknown'
        });
      } else {
        correctReports++;
      }
    });

    console.log(`\n📊 スキャン結果:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`総レポート数: ${totalReports}`);
    console.log(`正しいチーム: ${correctReports} (${Math.round(correctReports / totalReports * 100)}%)`);
    console.log(`不一致レポート: ${mismatches.length} (${Math.round(mismatches.length / totalReports * 100)}%)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (mismatches.length === 0) {
      console.log('✅ 不一致データは見つかりませんでした！');
      return [];
    }

    // 不一致データの詳細を表示
    console.log('❌ 不一致データの詳細:\n');
    
    // チーム別に集計
    const byTeam = {};
    mismatches.forEach(m => {
      const key = `${m.wrongTeam} → ${m.correctTeam}`;
      if (!byTeam[key]) {
        byTeam[key] = [];
      }
      byTeam[key].push(m);
    });

    Object.keys(byTeam).forEach(key => {
      console.log(`\n【${key}】: ${byTeam[key].length}件`);
      byTeam[key].slice(0, 5).forEach(m => {
        console.log(`  - ${m.userName} (${m.userEmail})`);
        console.log(`    日付: ${m.date}, 作成: ${m.createdAt}`);
        console.log(`    レポートID: ${m.reportId}`);
      });
      if (byTeam[key].length > 5) {
        console.log(`  ... 他 ${byTeam[key].length - 5}件`);
      }
    });

    return mismatches;
  } catch (error) {
    console.error('❌ スキャンエラー:', error);
    throw error;
  }
}

async function fixTeamMismatches(mismatches, action) {
  console.log(`\n🔧 ${action === 'fix' ? '修正' : '削除'}処理を開始します...\n`);

  const batch = db.batch();
  let batchCount = 0;
  let totalProcessed = 0;

  try {
    for (const mismatch of mismatches) {
      const reportRef = db.collection('reports').doc(mismatch.reportId);
      
      if (action === 'fix') {
        // team フィールドを正しい値に修正
        batch.update(reportRef, { 
          team: mismatch.correctTeam,
          // 修正履歴を記録
          fixedAt: admin.firestore.FieldValue.serverTimestamp(),
          fixedFrom: mismatch.wrongTeam,
          fixNote: 'Auto-fixed by fix-team-mismatch.js'
        });
        console.log(`✅ 修正: ${mismatch.reportId} (${mismatch.wrongTeam} → ${mismatch.correctTeam})`);
      } else if (action === 'delete') {
        // レポートを削除
        batch.delete(reportRef);
        console.log(`🗑️  削除: ${mismatch.reportId} (${mismatch.wrongTeam})`);
      }

      batchCount++;
      totalProcessed++;

      // Firestoreのバッチ制限（500件）を考慮
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`\n✅ バッチコミット完了 (${totalProcessed}/${mismatches.length})\n`);
        batchCount = 0;
      }
    }

    // 残りのバッチをコミット
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n✅ 最終バッチコミット完了\n`);
    }

    console.log(`\n🎉 処理完了: ${totalProcessed}件の${action === 'fix' ? '修正' : '削除'}が完了しました！\n`);
  } catch (error) {
    console.error(`❌ ${action === 'fix' ? '修正' : '削除'}エラー:`, error);
    throw error;
  }
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 チーム不一致データ修正スクリプト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // スキャン実行
    const mismatches = await scanTeamMismatches();

    if (mismatches.length === 0) {
      rl.close();
      process.exit(0);
    }

    // ユーザーに確認
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('実行オプション:');
    console.log('  1. 修正 (正しいチームに変更)');
    console.log('  2. 削除 (不一致データを削除)');
    console.log('  3. キャンセル');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const choice = await question('選択してください (1/2/3): ');

    if (choice === '1') {
      const confirm = await question(`\n⚠️  ${mismatches.length}件のレポートを修正しますか？ (yes/no): `);
      if (confirm.toLowerCase() === 'yes') {
        await fixTeamMismatches(mismatches, 'fix');
      } else {
        console.log('\n❌ キャンセルしました');
      }
    } else if (choice === '2') {
      const confirm = await question(`\n⚠️  ${mismatches.length}件のレポートを削除しますか？ (yes/no): `);
      if (confirm.toLowerCase() === 'yes') {
        await fixTeamMismatches(mismatches, 'delete');
      } else {
        console.log('\n❌ キャンセルしました');
      }
    } else {
      console.log('\n❌ キャンセルしました');
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// 実行
main();
