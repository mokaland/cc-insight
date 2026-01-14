/**
 * DM サービス層
 * 
 * DMメッセージの送受信、既読処理、リアルタイム監視を一元管理
 * UIコンポーネントから Firestore 操作を分離
 */

import {
    collection,
    query,
    where,
    orderBy,
    addDoc,
    getDocs,
    doc,
    writeBatch,
    serverTimestamp,
    onSnapshot,
    Unsubscribe
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DMMessage } from "@/lib/types";

// =====================================
// 管理者UID取得
// =====================================

/**
 * 全管理者のUIDを取得
 */
export async function getAdminUIDs(): Promise<string[]> {
    const usersSnapshot = await getDocs(collection(db, "users"));
    return usersSnapshot.docs
        .filter((doc) => doc.data().role === "admin")
        .map((doc) => doc.id);
}

// =====================================
// メッセージ送信
// =====================================

export interface SendDMMessageParams {
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    message: string;
    isAdmin: boolean;
    participants?: string[];
}

/**
 * DMメッセージを送信
 */
export async function sendDMMessage(params: SendDMMessageParams): Promise<void> {
    const { fromUserId, fromUserName, toUserId, toUserName, message, isAdmin, participants } = params;

    await addDoc(collection(db, "dm_messages"), {
        fromUserId,
        fromUserName,
        toUserId,
        toUserName,
        message: message.trim(),
        isAdmin,
        read: false,
        participants: participants || [fromUserId, toUserId],
        createdAt: serverTimestamp(),
    });
}

/**
 * メンバーから運営へのDMを送信（管理者全員に配信）
 */
export async function sendDMToAdmins(
    fromUserId: string,
    fromUserName: string,
    message: string
): Promise<void> {
    const adminUsers = await getAdminUIDs();

    if (adminUsers.length === 0) {
        throw new Error("管理者が見つかりません");
    }

    const mainAdminId = adminUsers[0];
    const allParticipants = [fromUserId, ...adminUsers];

    await sendDMMessage({
        fromUserId,
        fromUserName,
        toUserId: mainAdminId,
        toUserName: "運営",
        message,
        isAdmin: false,
        participants: allParticipants,
    });
}

// =====================================
// メッセージ取得・監視
// =====================================

/**
 * ユーザーのDMメッセージをリアルタイム監視
 * 送信・受信両方のメッセージを統合して返す
 */
export function subscribeToDMMessages(
    userId: string,
    callback: (messages: DMMessage[]) => void
): Unsubscribe {
    // 受信メッセージ（toUserId == userId）
    const q1 = query(
        collection(db, "dm_messages"),
        where("toUserId", "==", userId),
        orderBy("createdAt", "asc")
    );

    // 送信メッセージ（fromUserId == userId）
    const q2 = query(
        collection(db, "dm_messages"),
        where("fromUserId", "==", userId),
        orderBy("createdAt", "asc")
    );

    let messages1: DMMessage[] = [];
    let messages2: DMMessage[] = [];

    const updateMessages = () => {
        // 両方の結果を統合して重複を除去
        const allMessagesMap = new Map<string, DMMessage>();
        [...messages1, ...messages2].forEach((msg) => {
            allMessagesMap.set(msg.id, msg);
        });

        // createdAtでソート
        const sortedMessages = Array.from(allMessagesMap.values()).sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeA - timeB;
        });

        callback(sortedMessages);
    };

    const unsubscribe1 = onSnapshot(
        q1,
        (snapshot) => {
            messages1 = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as DMMessage));
            updateMessages();
        },
        (error) => {
            console.error("❌ [DM Service] 受信メッセージリスナーエラー:", error);
        }
    );

    const unsubscribe2 = onSnapshot(
        q2,
        (snapshot) => {
            messages2 = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as DMMessage));
            updateMessages();
        },
        (error) => {
            console.error("❌ [DM Service] 送信メッセージリスナーエラー:", error);
        }
    );

    // 両方のリスナーを停止する関数を返す
    return () => {
        unsubscribe1();
        unsubscribe2();
    };
}

/**
 * 未読メッセージ数をリアルタイム監視（バッジ用）
 */
export function subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
): Unsubscribe {
    const q = query(
        collection(db, "dm_messages"),
        where("toUserId", "==", userId)
    );

    return onSnapshot(
        q,
        (snapshot) => {
            // クライアント側で未読フィルタリング
            const unreadMessages = snapshot.docs.filter((doc) => {
                const data = doc.data();
                return data.read !== true;
            });
            callback(unreadMessages.length);
        },
        (error) => {
            console.error("❌ [DM Service] 未読カウントリスナーエラー:", error);
            callback(0);
        }
    );
}

// =====================================
// 既読処理
// =====================================

/**
 * 指定ユーザー宛の未読メッセージを全て既読にする
 */
export async function markMessagesAsRead(userId: string): Promise<number> {
    const q = query(
        collection(db, "dm_messages"),
        where("toUserId", "==", userId),
        where("read", "==", false)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return 0;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((document) => {
        batch.update(doc(db, "dm_messages", document.id), {
            read: true,
            readAt: serverTimestamp(),
        });
    });

    await batch.commit();
    return snapshot.size;
}

/**
 * 管理者が特定ユーザーからのメッセージを既読にする
 * fromUserId（送信者）がtargetUserIdのメッセージを既読にする
 */
export async function markMessagesFromUserAsRead(targetUserId: string): Promise<number> {
    const q = query(
        collection(db, "dm_messages"),
        where("fromUserId", "==", targetUserId),
        where("read", "==", false)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return 0;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((document) => {
        batch.update(doc(db, "dm_messages", document.id), {
            read: true,
            readAt: serverTimestamp(),
        });
    });

    await batch.commit();
    console.log(`📬 [DM Service] ${targetUserId}からのメッセージ${snapshot.size}件を既読に設定`);
    return snapshot.size;
}

// =====================================
// 管理者用：特定ユーザーとのDM監視
// =====================================

/**
 * 管理者が特定ユーザーとのDMを監視
 */
export function subscribeToAdminDMWithUser(
    adminUid: string,
    targetUserId: string,
    callback: (messages: DMMessage[]) => void
): Unsubscribe {
    const q = query(
        collection(db, "dm_messages"),
        where("participants", "array-contains", adminUid),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const msgs: DMMessage[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // 選択中のユーザーとのメッセージのみ表示
                if (data.fromUserId === targetUserId || data.toUserId === targetUserId) {
                    msgs.push({
                        id: doc.id,
                        ...data,
                    } as DMMessage);
                }
            });
            callback(msgs);
        },
        (error) => {
            console.error("❌ [DM Service] 管理者DMリスナーエラー:", error);
        }
    );
}

/**
 * 管理者からユーザーへDMを送信
 */
export async function sendAdminDMToUser(
    adminUid: string,
    adminDisplayName: string,
    targetUserId: string,
    targetDisplayName: string,
    message: string
): Promise<void> {
    await sendDMMessage({
        fromUserId: adminUid,
        fromUserName: adminDisplayName,
        toUserId: targetUserId,
        toUserName: targetDisplayName,
        message,
        isAdmin: true,
        participants: [adminUid, targetUserId],
    });

    // プッシュ通知を送信（バックグラウンドで非同期実行、エラーは無視）
    try {
        await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'dm',
                userId: targetUserId,
                senderName: adminDisplayName,
                messagePreview: message.slice(0, 100),
            }),
        });
        console.log(`📱 [DM] プッシュ通知を送信: ${targetUserId}`);
    } catch (e) {
        console.warn('📱 [DM] プッシュ通知の送信に失敗:', e);
    }
}

/**
 * 管理者用：全メンバーからの未読メッセージ数をリアルタイム監視
 * メンバーごとの未読数をMapで返す
 */
export function subscribeToAdminUnreadCounts(
    callback: (unreadMap: Map<string, number>) => void
): Unsubscribe {
    // メンバーから管理者への全メッセージを監視（isAdmin === false のみ）
    const q = query(
        collection(db, "dm_messages"),
        where("isAdmin", "==", false)
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const unreadMap = new Map<string, number>();

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                // 未読のみカウント
                if (data.read === true) return;

                const fromUserId = data.fromUserId as string;
                const currentCount = unreadMap.get(fromUserId) || 0;
                unreadMap.set(fromUserId, currentCount + 1);
            });

            callback(unreadMap);
        },
        (error) => {
            console.error("❌ [DM Service] 管理者未読カウントリスナーエラー:", error);
            callback(new Map());
        }
    );
}

