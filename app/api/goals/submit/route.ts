/**
 * 目標提出API
 * 目標を保存し、Slack通知を送信
 */

import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyGoalSubmission } from "@/lib/slack-notifier";
import { TeamGoal, FunnelKPI, TeamId } from "@/lib/types";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { teamId, goalType, year, month, quarter, goals, submittedBy, submittedByName } = body as {
            teamId: TeamId;
            goalType: "monthly" | "quarterly";
            year: number;
            month?: number;
            quarter?: number;
            goals: FunnelKPI;
            submittedBy: string;
            submittedByName: string;
        };

        // バリデーション
        if (!teamId || !goalType || !year || !goals || !submittedBy) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (goalType === "monthly" && !month) {
            return NextResponse.json(
                { error: "Month is required for monthly goals" },
                { status: 400 }
            );
        }

        if (goalType === "quarterly" && !quarter) {
            return NextResponse.json(
                { error: "Quarter is required for quarterly goals" },
                { status: 400 }
            );
        }

        // 目標IDを生成
        const id = goalType === "monthly"
            ? `${teamId}_${year}_${String(month).padStart(2, "0")}`
            : `${teamId}_${year}_Q${quarter}`;

        // 目標データを作成
        const goalData: TeamGoal = {
            id,
            teamId,
            type: goalType,
            year,
            ...(goalType === "monthly" ? { month } : { quarter }),
            goals,
            status: "pending",
            createdBy: submittedBy,
            approvedBy: null,
            createdAt: Timestamp.now(),
            approvedAt: null,
        };

        // Firestoreに保存
        await setDoc(doc(db, "team_goals", id), goalData);

        console.log(`[Goal Submit] Goal saved: ${id}`);

        // Slack通知を送信
        try {
            await notifyGoalSubmission({
                goalId: id,
                teamId,
                goalType,
                year,
                month,
                quarter,
                submittedBy: submittedByName || submittedBy,
                goals,
            });
            console.log(`[Goal Submit] Slack notification sent for: ${id}`);
        } catch (slackError) {
            console.error("[Goal Submit] Slack notification failed:", slackError);
            // Slack通知失敗はエラーとしない（目標は保存済み）
        }

        return NextResponse.json({
            success: true,
            goalId: id,
            message: "目標が提出されました。承認をお待ちください。",
        });

    } catch (error) {
        console.error("[Goal Submit] Error:", error);
        return NextResponse.json(
            { error: "Failed to submit goal" },
            { status: 500 }
        );
    }
}
