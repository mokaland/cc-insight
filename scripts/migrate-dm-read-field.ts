/**
 * Firestore DM Messages Migration Script
 * 既存のDMメッセージに read フィールドを追加
 * 
 * 実行方法:
 * npx tsx scripts/migrate-dm-read-field.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Firebase Admin初期化
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ serviceAccountKey.json が見つかりません');
    console.log('📝 Firebase Console > Project Settings > Service Accounts からダウンロードしてください');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateDmMessages() {
    console.log('🔄 DM メッセージのマイグレーション開始...\n');

    try {
        // dm_messages コレクション全体を取得
        const messagesRef = db.collection('dm_messages');
        const snapshot = await messagesRef.get();

        if (snapshot.empty) {
            console.log('✅ 既存のDMメッセージがありません');
            return;
        }

        console.log(`📊 ${snapshot.size}件のメッセージを処理します\n`);

        // read フィールドがないメッセージを抽出
        const messagesToUpdate: any[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.read === undefined) {
                messagesToUpdate.push({
                    id: doc.id,
                    data: data
                });
            }
        });

        if (messagesToUpdate.length === 0) {
            console.log('✅ すべてのメッセージに read フィールドが存在します');
            return;
        }

        console.log(`⚠️  ${messagesToUpdate.length}件のメッセージに read フィールドがありません`);
        console.log('📝 read: false を追加します...\n');

        // バッチ処理で更新（Firestoreのバッチは最大500件）
        const batchSize = 500;
        const batches = [];

        for (let i = 0; i < messagesToUpdate.length; i += batchSize) {
            const batch = db.batch();
            const chunk = messagesToUpdate.slice(i, i + batchSize);

            chunk.forEach((msg) => {
                const docRef = messagesRef.doc(msg.id);
                batch.update(docRef, {
                    read: false,
                });
            });

            batches.push(batch.commit());
        }

        // 全バッチを実行
        await Promise.all(batches);

        console.log(`✅ ${messagesToUpdate.length}件のメッセージを更新しました\n`);

        // 更新後の確認
        const updatedSnapshot = await messagesRef.get();
        let withReadField = 0;
        let withoutReadField = 0;

        updatedSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.read !== undefined) {
                withReadField++;
            } else {
                withoutReadField++;
            }
        });

        console.log('📊 最終結果:');
        console.log(`  - read フィールドあり: ${withReadField}件`);
        console.log(`  - read フィールドなし: ${withoutReadField}件`);

        if (withoutReadField === 0) {
            console.log('\n✨ マイグレーション完了！すべてのメッセージに read フィールドが追加されました');
        } else {
            console.log('\n⚠️  一部のメッセージに read フィールドがありません');
        }

    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
        process.exit(1);
    }
}

// 実行
migrateDmMessages()
    .then(() => {
        console.log('\n🎉 処理が完了しました');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ 致命的エラー:', error);
        process.exit(1);
    });
