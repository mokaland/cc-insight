/**
 * プッシュ購読管理API
 *
 * POST: 購読を保存
 * DELETE: 購読を削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscription, deletePushSubscription, getVapidPublicKey } from '@/lib/services/push';

export async function GET() {
    // VAPID公開キーを返す
    const vapidPublicKey = getVapidPublicKey();

    if (!vapidPublicKey) {
        return NextResponse.json(
            { error: 'VAPID key not configured' },
            { status: 500 }
        );
    }

    return NextResponse.json({ vapidPublicKey });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, subscription, userAgent } = body;

        if (!userId || !subscription) {
            return NextResponse.json(
                { error: 'userId and subscription are required' },
                { status: 400 }
            );
        }

        const subscriptionId = await savePushSubscription(userId, subscription, userAgent);

        return NextResponse.json({
            success: true,
            subscriptionId,
        });
    } catch (error: any) {
        console.error('📱 [Push API] Save error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save subscription' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subscriptionId = searchParams.get('id');

        if (!subscriptionId) {
            return NextResponse.json(
                { error: 'subscriptionId is required' },
                { status: 400 }
            );
        }

        await deletePushSubscription(subscriptionId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('📱 [Push API] Delete error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete subscription' },
            { status: 500 }
        );
    }
}
