/**
 * DMメッセージ型定義
 * 
 * 重要: docs/02_SCHEMA.md に基づき、全フィールドを定義
 * Firestore コレクション: dm_messages
 */

import { Timestamp } from "firebase/firestore";

/**
 * DMメッセージ型
 * 
 * フィールド統一:
 * - read: boolean (isRead ではなく read を使用)
 * - readAt: 既読日時
 * - participants: 参加者UID一覧
 */
export interface DMMessage {
    // ドキュメントID
    id: string;

    // 送信者情報
    fromUserId: string;
    fromUserName: string;

    // 受信者情報
    toUserId: string;
    toUserName: string;

    // メッセージ内容
    message: string;

    // 作成日時
    createdAt: Timestamp;

    // 管理者フラグ
    isAdmin: boolean;

    // 既読管理
    read: boolean;              // 既読フラグ（isRead ではなく read を使用）
    readAt?: Timestamp;         // 既読日時

    // 参加者（複数管理者対応）
    participants?: string[];    // 参加者UID一覧
}

/**
 * DMメッセージ作成時のペイロード（id, readAt は自動生成）
 */
export type CreateDMMessagePayload = Omit<DMMessage, 'id' | 'readAt'>;
