/**
 * Slack Interactive Components Webhook
 * 目標承認ボタンのクリックを処理
 * NOTE: Firebase REST APIを使用（サーバーサイドではクライアントSDKが動作しないため）
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyGoalApproved, notifyGoalRejected } from "@/lib/slack-notifier";

const FIREBASE_PROJECT_ID = "cc-insight";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const TEAM_NAMES: Record<string, string> = {
    fukugyou: "副業チーム",
    taishoku: "退職サポートチーム",
    buppan: "スマホ物販チーム",
};

interface FirestoreDocument {
    fields: {
        [key: string]: {
            stringValue?: string;
            integerValue?: string;
            booleanValue?: boolean;
            mapValue?: { fields: { [key: string]: any } };
        };
    };
}

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
        const slackUserName = payload.user?.name || payload.user?.username || "Slack User";

        console.log(`[Goal Approval] Action: ${actionId}, Goal: ${goalId}, User: ${slackUserName}`);

        // Firestore REST APIで目標を取得
        const getResponse = await fetch(`${FIRESTORE_BASE_URL}/team_goals/${goalId}`, {
            method: "GET",
        });

        if (!getResponse.ok) {
            console.error("[Goal Approval] Failed to get goal:", await getResponse.text());
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

        const goalDoc = await getResponse.json() as FirestoreDocument;
        const teamId = goalDoc.fields.teamId?.stringValue || "";
        const goalType = goalDoc.fields.type?.stringValue || "monthly";
        const year = goalDoc.fields.year?.integerValue || "";
        const month = goalDoc.fields.month?.integerValue || "";
        const quarter = goalDoc.fields.quarter?.integerValue || "";
        const currentStatus = goalDoc.fields.status?.stringValue || "pending";

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
            // 承認処理 - Firestore REST APIで更新
            const updateResponse = await fetch(`${FIRESTORE_BASE_URL}/team_goals/${goalId}?updateMask.fieldPaths=status&updateMask.fieldPaths=approvedBy&updateMask.fieldPaths=approvedAt`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fields: {
                        status: { stringValue: "approved" },
                        approvedBy: { stringValue: slackUserName },
                        approvedAt: { timestampValue: new Date().toISOString() },
                    },
                }),
            });

            if (!updateResponse.ok) {
                console.error("[Goal Approval] Failed to update goal:", await updateResponse.text());
                throw new Error("Failed to update goal");
            }

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
            const updateResponse = await fetch(`${FIRESTORE_BASE_URL}/team_goals/${goalId}?updateMask.fieldPaths=status&updateMask.fieldPaths=rejectedBy&updateMask.fieldPaths=rejectedAt`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fields: {
                        status: { stringValue: "draft" },
                        rejectedBy: { stringValue: slackUserName },
                        rejectedAt: { timestampValue: new Date().toISOString() },
                    },
                }),
            });

            if (!updateResponse.ok) {
                console.error("[Goal Approval] Failed to update goal:", await updateResponse.text());
                throw new Error("Failed to update goal");
            }

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
                        text: "❌ 処理中にエラーが発生しました。もう一度お試しください。",
                    },
                },
            ],
        });
    }
}
