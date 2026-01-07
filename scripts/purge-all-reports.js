/**
 * 全報告データ削除スクリプト
 * 
 * 目的: Firestoreのreportsコレクション内の全ドキュメントを削除
 * 注意: usersコレクションは削除しません
 * 
 * 実行方法:
 * node scripts/purge-all-reports.js
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

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function countReports() {
  console.log('\n📊 レポート数をカウント中...\n');
  
  try {
    const snapshot = await db.collection('reports').get();
    return snapshot.size;
  } catch (error) {
    console.error('❌ カウントエラー:', error);
    return 0;
  }
}

async function purgeAllReports() {
  console.log('\n🔥 全レポートを削除中...\n');
  
  try {
    const batchSize = 500; // Firestoreのバッチ制限
    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
      // バッチで削除
      const snapshot = await db.collection('reports')
        .limit(batchSize)
        .get();

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      await batch.commit();
      console.log(`✅ ${deletedCount}件削除完了...`);

      // 次のバッチがあるか確認
      if (snapshot.size < batchSize) {
        hasMore = false;
      }
    }

    console.log(`\n🎉 削除完了: 合計 ${deletedCount}件のレポートを削除しました！\n`);
    return deletedCount;
  } catch (error) {
    console.error('\n❌ 削除エラー:', error);
    throw error;
  }
}

async function verifyDeletion() {
  console.log('\n🔍 削除確認中...\n');
  
  try {
    const snapshot = await db.collection('reports').get();
    const remainingCount = snapshot.size;
    
    if (remainingCount === 0) {
      console.log('✅ 確認完了: reportsコレクションは空です！\n');
      return true;
    } else {
      console.log(`⚠️  警告: まだ ${remainingCount}件のレポートが残っています\n`);
      return false;
    }
  } catch (error) {
    console.error('❌ 確認エラー:', error);
    return false;
  }
}

async function checkUsersCollection() {
  console.log('👥 usersコレクションを確認中...\n');
  
  try {
    const snapshot = await db.collection('users').get();
    console.log(`✅ usersコレクション: ${snapshot.size}人のユーザーが保持されています\n`);
    return snapshot.size;
  } catch (error) {
    console.error('❌ usersコレクション確認エラー:', error);
    return 0;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔥 全報告データ削除スクリプト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  警告: このスクリプトはreportsコレクションの');
  console.log('         全てのドキュメントを削除します。\n');
  console.log('✅ usersコレクション（ユーザー情報）は保持されます。\n');

  try {
    // レポート数をカウント
    const reportCount = await countReports();
    console.log(`📊 現在のレポート数: ${reportCount}件\n`);

    if (reportCount === 0) {
      console.log('✅ レポートは既に0件です。削除する必要はありません。\n');
      rl.close();
      process.exit(0);
    }

    // usersコレクションを確認
    await checkUsersCollection();

    // 最終確認
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  最終確認');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const confirm1 = await question(`本当に ${reportCount}件の全レポートを削除しますか？ (yes/no): `);
    
    if (confirm1.toLowerCase() !== 'yes') {
      console.log('\n❌ キャンセルしました\n');
      rl.close();
      process.exit(0);
    }

    const confirm2 = await question('\n再確認: この操作は取り消せません。実行しますか？ (YES/NO): ');
    
    if (confirm2 !== 'YES') {
      console.log('\n❌ キャンセルしました（YESと入力する必要があります）\n');
      rl.close();
      process.exit(0);
    }

    console.log('\n🔥 削除を開始します...\n');
    
    // 削除実行
    const deletedCount = await purgeAllReports();

    // 削除確認
    const verified = await verifyDeletion();

    if (verified) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 完了');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`削除されたレポート数: ${deletedCount}件`);
      console.log('reportsコレクション: 空');
      console.log('usersコレクション: 保持\n');
      console.log('次のステップ:');
      console.log('1. ダッシュボードを確認（全て0になっているはず）');
      console.log('2. ランキングページを確認（データなし表示）');
      console.log('3. 新しい報告を送信してテスト\n');
    } else {
      console.log('⚠️  削除は完了しましたが、一部データが残っている可能性があります\n');
      console.log('もう一度スクリプトを実行してください。\n');
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
