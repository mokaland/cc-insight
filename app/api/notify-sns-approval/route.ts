import { NextRequest, NextResponse } from "next/server";
import { notifySnsApprovalRequest } from "@/lib/slack-notifier";

/**
 * SNS承認申請時のSlack通知API
 * POST /api/notify-sns-approval
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { userId, userName, userEmail, team, snsKey, url } = body;

        // 必須パラメータチェック
        if (!userId || !userName || !snsKey || !url) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Slack通知を送信
        await notifySnsApprovalRequest({
            userId,
            userName,
            userEmail: userEmail || "",
            team: team || "未設定",
            snsKey,
            url,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("SNS approval notification error:", error);
        return NextResponse.json(
            { error: "Failed to send notification" },
            { status: 500 }
        );
    }
}
