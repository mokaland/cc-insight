// Firestoreのテストデータを削除するスクリプト
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBqSzA1wFGTRd2yFQyBdGyct9tl_zNceOQ",
  authDomain: "cc-insight.firebaseapp.com",
  projectId: "cc-insight",
  storageBucket: "cc-insight.firebasestorage.app",
  messagingSenderId: "359311670016",
  appId: "1:359311670016:web:998b8236071c672f46d1e5"
};

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
