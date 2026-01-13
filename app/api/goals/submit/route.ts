/**
 * 目標提出通知API
 * クライアント側でFirestore保存後、このAPIでSlack通知を送信
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyGoalSubmission } from "@/lib/slack-notifier";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            goalId,
            teamId,
            goalType,
            year,
            month,
            quarter,
            submittedBy,
            goals,
        } = body;

        // バリデーション
        if (!goalId || !teamId || !goalType || !year || !goals || !submittedBy) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        console.log(`[Goal Notify] Sending Slack notification for: ${goalId}`);

        // Slack通知を送信
        await notifyGoalSubmission({
            goalId,
            teamId,
            goalType,
            year,
            month,
            quarter,
            submittedBy,
            goals,
        });

        console.log(`[Goal Notify] Slack notification sent for: ${goalId}`);

        return NextResponse.json({
            success: true,
            message: "Slack通知を送信しました",
        });
    } catch (error) {
        console.error("[Goal Notify] Error:", error);
        return NextResponse.json(
            { error: "Failed to send notification" },
            { status: 500 }
        );
    }
}
