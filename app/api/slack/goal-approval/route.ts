/**
 * Slack Interactive Components Webhook
 * 目標承認ボタンのクリックを処理
 * NOTE: Firebase Admin SDKを使用（セキュリティルールをバイパス）
 */

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { notifyGoalApproved, notifyGoalRejected } from "@/lib/slack-notifier";

const TEAM_NAMES: Record<string, string> = {
    fukugyou: "副業チーム",
    taishoku: "退職サポートチーム",
    buppan: "スマホ物販チーム",
};

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();

        // URL encoded payload をパース
        const params = new URLSearchParams(body);
        const payloadString = params.get("payload");

        if (!payloadString) {
            console.error("[Goal Approval] No payload in request");
            return NextResponse.json({ error: "No payload" }, { status: 400 });
        }

        const payload = JSON.parse(payloadString);

        // アクションを取得
        const actions = payload.actions;
        if (!actions || actions.length === 0) {
            console.error("[Goal Approval] No actions in payload");
            return NextResponse.json({ error: "No actions" }, { status: 400 });
        }

        const action = actions[0];
        const actionId = action.action_id;
        const goalId = action.value;
        const slackUserName = payload.user?.name || payload.user?.username || "Slack User";

        console.log(`[Goal Approval] Action: ${actionId}, Goal: ${goalId}, User: ${slackUserName}`);

        // Firebase Admin SDKでFirestoreにアクセス
        const db = getAdminFirestore();
        const goalRef = db.collection("team_goals").doc(goalId);
        const goalSnap = await goalRef.get();

        if (!goalSnap.exists) {
            console.error(`[Goal Approval] Goal not found: ${goalId}`);
            return NextResponse.json({
                replace_original: true,
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

        const goal = goalSnap.data();
        if (!goal) {
            return NextResponse.json({
                replace_original: true,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "❌ 目標データが不正です。",
                        },
                    },
                ],
            });
        }

        const teamId = goal.teamId || "";
        const goalType = goal.type || "monthly";
        const year = goal.year || "";
        const month = goal.month || "";
        const quarter = goal.quarter || "";
        const currentStatus = goal.status || "pending";

        // 既に処理済みかチェック
        if (currentStatus === "approved") {
            return NextResponse.json({
                replace_original: true,
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
        const periodLabel = goalType === "monthly"
            ? `${year}年${month}月`
            : `${year}年 Q${quarter}`;

        if (actionId === "approve_goal") {
            // 承認処理
            await goalRef.update({
                status: "approved",
                approvedBy: slackUserName,
                approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[Goal Approval] Goal approved: ${goalId}`);

            // 管理者チャンネルに通知（バックグラウンド）
            try {
                await notifyGoalApproved({
                    goalId,
                    teamId,
                    periodLabel,
                    approvedBy: slackUserName,
                });
            } catch (e) {
                console.warn("[Goal Approval] Notification failed:", e);
            }

            // Slackメッセージを更新
            return NextResponse.json({
                replace_original: true,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `✅ *目標承認完了*\n\n*${TEAM_NAMES[teamId] || teamId}* の *${periodLabel}* 目標が承認されました。\n\n承認者: ${slackUserName}`,
                        },
                    },
                ],
            });

        } else if (actionId === "reject_goal") {
            // 却下処理
            await goalRef.update({
                status: "draft",
                rejectedBy: slackUserName,
                rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[Goal Approval] Goal rejected: ${goalId}`);

            // 通知（バックグラウンド）
            try {
                await notifyGoalRejected({
                    goalId,
                    teamId,
                    periodLabel,
                    rejectedBy: slackUserName,
                });
            } catch (e) {
                console.warn("[Goal Approval] Notification failed:", e);
            }

            // Slackメッセージを更新
            return NextResponse.json({
                replace_original: true,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `❌ *目標却下*\n\n*${TEAM_NAMES[teamId] || teamId}* の *${periodLabel}* 目標が却下されました。\n\n却下者: ${slackUserName}`,
                        },
                    },
                ],
            });
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("[Goal Approval] Error:", error);
        return NextResponse.json({
            replace_original: true,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `❌ 処理中にエラーが発生しました。\n\nエラー: ${error instanceof Error ? error.message : "Unknown error"}`,
                    },
                },
            ],
        });
    }
}
