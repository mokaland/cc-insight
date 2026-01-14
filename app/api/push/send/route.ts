/**
 * プッシュ通知送信API
 *
 * POST: 通知を送信
 * - userId指定: 特定ユーザーに送信
 * - broadcast: 全ユーザーに送信
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser, sendPushBroadcast, sendDMNotification } from '@/lib/services/push';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, userId, title, body: messageBody, url, senderName, messagePreview } = body;

        // DM通知
        if (type === 'dm' && userId && senderName && messagePreview) {
            const count = await sendDMNotification(userId, senderName, messagePreview);
            return NextResponse.json({ success: true, sent: count });
        }

        // 個別通知
        if (type === 'user' && userId && title && messageBody) {
            const count = await sendPushToUser(userId, {
                title,
                body: messageBody,
                url,
            });
            return NextResponse.json({ success: true, sent: count });
        }

        // ブロードキャスト
        if (type === 'broadcast' && title && messageBody) {
            const result = await sendPushBroadcast({
                title,
                body: messageBody,
                url,
            });
            return NextResponse.json({ ...result, success: true });
        }

        return NextResponse.json(
            { error: 'Invalid request. Required: type (dm|user|broadcast) and corresponding fields' },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('📱 [Push API] Send error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send notification' },
            { status: 500 }
        );
    }
}
