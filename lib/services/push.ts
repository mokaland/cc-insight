/**
 * Web Push 通知サービス
 *
 * バックエンドからプッシュ通知を送信するためのサービス層
 */

import webpush from 'web-push';
import * as admin from 'firebase-admin';

// VAPID設定（環境変数から取得）
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@c-creation.co.jp';

// web-push設定
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Firebase Admin SDKの初期化
function getAdminFirestore() {
    if (admin.apps.length === 0) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(serviceAccount)),
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: "cc-insight",
            });
        }
    }
    return admin.firestore();
}

// 型定義
export interface PushSubscription {
    endpoint: string;
    expirationTime: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface StoredSubscription {
    id: string;
    userId: string;
    subscription: PushSubscription;
    createdAt: Date;
    userAgent?: string;
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    actions?: { action: string; title: string }[];
}

// =====================================
// Subscription 管理
// =====================================

/**
 * プッシュ通知の購読を保存
 */
export async function savePushSubscription(
    userId: string,
    subscription: PushSubscription,
    userAgent?: string
): Promise<string> {
    const db = getAdminFirestore();
    // endpointをIDとして使用（重複防止）
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64').slice(0, 100);

    await db.collection('push_subscriptions').doc(subscriptionId).set({
        userId,
        subscription,
        userAgent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`📱 [Push] Subscription saved for user: ${userId}`);
    return subscriptionId;
}

/**
 * ユーザーの購読を取得
 */
export async function getUserSubscriptions(userId: string): Promise<StoredSubscription[]> {
    const db = getAdminFirestore();
    const snapshot = await db.collection('push_subscriptions').where('userId', '==', userId).get();

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<StoredSubscription, 'id'>),
    }));
}

/**
 * 購読を削除
 */
export async function deletePushSubscription(subscriptionId: string): Promise<void> {
    const db = getAdminFirestore();
    await db.collection('push_subscriptions').doc(subscriptionId).delete();
    console.log(`📱 [Push] Subscription deleted: ${subscriptionId}`);
}

// =====================================
// プッシュ通知送信
// =====================================

/**
 * 特定ユーザーにプッシュ通知を送信
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
        console.log(`📱 [Push] No subscriptions for user: ${userId}`);
        return 0;
    }

    const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        url: payload.url || '/',
        tag: payload.tag || 'default',
        actions: payload.actions || [],
    });

    let successCount = 0;

    for (const stored of subscriptions) {
        try {
            await webpush.sendNotification(stored.subscription, pushPayload);
            successCount++;
            console.log(`📱 [Push] Sent to ${userId} (${stored.id.slice(0, 10)}...)`);
        } catch (error: any) {
            console.error(`📱 [Push] Failed for ${stored.id}:`, error.message);

            // 購読が無効な場合は削除
            if (error.statusCode === 410 || error.statusCode === 404) {
                await deletePushSubscription(stored.id);
            }
        }
    }

    return successCount;
}

/**
 * 全ユーザーにプッシュ通知を送信（ブロードキャスト）
 */
export async function sendPushBroadcast(payload: PushPayload): Promise<{ total: number; success: number }> {
    const db = getAdminFirestore();
    const snapshot = await db.collection('push_subscriptions').get();

    const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        url: payload.url || '/',
        tag: payload.tag || 'broadcast',
        actions: payload.actions || [],
    });

    let successCount = 0;
    const total = snapshot.size;

    for (const docSnapshot of snapshot.docs) {
        const stored = docSnapshot.data() as Omit<StoredSubscription, 'id'>;

        try {
            await webpush.sendNotification(stored.subscription, pushPayload);
            successCount++;
        } catch (error: any) {
            console.error(`📱 [Push] Broadcast failed for ${docSnapshot.id}:`, error.message);

            if (error.statusCode === 410 || error.statusCode === 404) {
                await deletePushSubscription(docSnapshot.id);
            }
        }
    }

    console.log(`📱 [Push] Broadcast complete: ${successCount}/${total}`);
    return { total, success: successCount };
}

/**
 * DM受信時の通知を送信
 */
export async function sendDMNotification(
    recipientUserId: string,
    senderName: string,
    messagePreview: string
): Promise<number> {
    return sendPushToUser(recipientUserId, {
        title: `💬 ${senderName}さんからのメッセージ`,
        body: messagePreview.slice(0, 100),
        url: '/dm',
        tag: `dm-${senderName}`,
    });
}

/**
 * VAPID公開キーを取得（クライアント用）
 */
export function getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
}
