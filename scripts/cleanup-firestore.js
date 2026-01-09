// Firestoreのテストデータを削除するスクリプト
// 使用前に環境変数を設定してください:
// export FIREBASE_API_KEY="your-api-key"
// export FIREBASE_PROJECT_ID="cc-insight"

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// 環境変数から設定を読み込み
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "cc-insight.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "cc-insight",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "cc-insight.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// APIキーがない場合はエラー
if (!firebaseConfig.apiKey) {
  console.error('❌ FIREBASE_API_KEY 環境変数が設定されていません');
  console.log('使用方法: FIREBASE_API_KEY="your-key" node scripts/cleanup-firestore.js');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllReports() {
  console.log('🗑️  Firestoreのレポートデータを削除中...');
  
  try {
    const reportsRef = collection(db, 'reports');
    const snapshot = await getDocs(reportsRef);
    
    if (snapshot.empty) {
      console.log('✅ 削除するデータはありません');
      return 0;
    }
    
    let count = 0;
    const deletePromises = snapshot.docs.map(async (docSnapshot) => {
      await deleteDoc(doc(db, 'reports', docSnapshot.id));
      count++;
      console.log(`  削除: ${docSnapshot.id}`);
    });
    
    await Promise.all(deletePromises);
    console.log(`✅ ${count}件のレポートを削除しました`);
    return count;
  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

deleteAllReports()
  .then(() => {
    console.log('\n🎉 クリーンアップ完了！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('クリーンアップに失敗しました:', error);
    process.exit(1);
  });
