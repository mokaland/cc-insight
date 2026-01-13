/**
 * Slack Interactive Components Webhook
 * 目標承認ボタンのクリックを処理
 */

import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyGoalApproved, notifyGoalRejected } from "@/lib/slack-notifier";
import { TeamGoal } from "@/lib/types";

// Slack署名検証用シークレット
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();

        // URL encoded payload をパース
        const params = new URLSearchParams(body);
        const payloadString = params.get("payload");

        if (!payloadString) {
            return NextResponse.json({ error: "No payload" }, { status: 400 });
        }

        const payload = JSON.parse(payloadString);

        // アクションを取得
        const actions = payload.actions;
        if (!actions || actions.length === 0) {
            return NextResponse.json({ error: "No actions" }, { status: 400 });
        }

        const action = actions[0];
        const actionId = action.action_id;
        const goalId = action.value;
        const slackUserId = payload.user?.id || "unknown";
        const slackUserName = payload.user?.name || payload.user?.username || "Slack User";

        console.log(`[Goal Approval] Action: ${actionId}, Goal: ${goalId}, User: ${slackUserName}`);

        // 目標を取得
        const goalRef = doc(db, "team_goals", goalId);
        const goalSnap = await getDoc(goalRef);

        if (!goalSnap.exists()) {
            return NextResponse.json({
                response_action: "update",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "❌ 目標が見つかりませんでした。",
                        },
                    },
                ],
            });
        }

        const goal = goalSnap.data() as TeamGoal;

        // 既に処理済みかチェック
        if (goal.status === "approved") {
            return NextResponse.json({
                response_action: "update",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "✅ この目標は既に承認されています。",
                        },
                    },
                ],
            });
        }

        // 期間ラベルを生成
        const periodLabel = goal.type === "monthly"
            ? `${goal.year}年${goal.month}月`
            : `${goal.year}年 Q${goal.quarter}`;

        if (actionId === "approve_goal") {
            // 承認処理
            await updateDoc(goalRef, {
                status: "approved",
                approvedBy: slackUserName,
                approvedAt: Timestamp.now(),
            });

            // 管理者チャンネルに通知
            await notifyGoalApproved({
                goalId,
                teamId: goal.teamId,
                periodLabel,
                approvedBy: slackUserName,
            });

            // Slackメッセージを更新
            return NextResponse.json({
                replace_original: true,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `✅ *目標承認完了*\n\n*${TEAM_NAMES[goal.teamId] || goal.teamId}* の *${periodLabel}* 目標が承認されました。\n\n承認者: ${slackUserName}`,
                        },
                    },
                ],
            });

        } else if (actionId === "reject_goal") {
            // 却下処理
            await updateDoc(goalRef, {
                status: "draft", // 却下された場合はdraftに戻す
                rejectedBy: slackUserName,
                rejectedAt: Timestamp.now(),
            });

            // 通知
            await notifyGoalRejected({
                goalId,
                teamId: goal.teamId,
                periodLabel,
                rejectedBy: slackUserName,
            });

            // Slackメッセージを更新
            return NextResponse.json({
                replace_original: true,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `❌ *目標却下*\n\n*${TEAM_NAMES[goal.teamId] || goal.teamId}* の *${periodLabel}* 目標が却下されました。\n\n却下者: ${slackUserName}`,
                        },
                    },
                ],
            });
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("[Goal Approval] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

const TEAM_NAMES: Record<string, string> = {
    fukugyou: "副業チーム",
    taishoku: "退職サポートチーム",
    buppan: "スマホ物販チーム",
};
