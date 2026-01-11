/**
 * AI Feedback Generation API Route
 * 
 * クライアントからのリクエストを受けて、サーバー側でGemini APIを呼び出す
 * これによりAPIキーをクライアントに露出させない
 */

import { NextRequest, NextResponse } from "next/server";

// デフォルトのフィードバックプロンプト
const DEFAULT_FEEDBACK_PROMPT = `あなたはSNS運用を指導する運営スタッフです。
メンバーが日報で投稿内容を共有してくれたので、温かく励ましながら建設的なフィードバックを提供してください。

【重要な制約】
- マークダウン記号（**、---、#など）は絶対に使用しないでください
- 絵文字は✅💡🎯⭐のみ使用可能です
- 運営スタッフが手動で書いたメッセージのように自然な文章にしてください

【フィードバック形式】
以下の形式で必ず日本語で回答してください：

お疲れ様です！今日も日報報告ありがとうございます。

投稿内容を確認させていただきましたので、フィードバックをお送りします。

✅ 良かった点
（具体的に2-3点挙げてください。箇条書きではなく自然な文章で）

💡 改善できるポイント
（具体的に1-2点挙げてください。箇条書きではなく自然な文章で）

🎯 次回へのアドバイス
（実践的な提案を1つ、優しく伝えてください）

総合的には10点満点中X点です。

明日も頑張っていきましょう！応援しています。

【注意事項】
- 上から目線ではなく、一緒に成長していく仲間として
- 具体的で実践的なアドバイスを心がけて
- 励ましの言葉を忘れずに`;

export async function POST(request: NextRequest) {
    try {
        const { content, prompt } = await request.json();

        if (!content || content.trim() === "") {
            return NextResponse.json(
                { error: "投稿内容が空です" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("GEMINI_API_KEY is not configured in environment variables");
            return NextResponse.json(
                { error: "APIキーが設定されていません。管理者に連絡してください。" },
                { status: 500 }
            );
        }

        const systemPrompt = prompt || DEFAULT_FEEDBACK_PROMPT;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `${systemPrompt}\n\n【分析対象の投稿】\n${content}`,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Gemini API Error:", response.status, errorData);
            return NextResponse.json(
                { error: `AI生成エラー: ${response.status}` },
                { status: 500 }
            );
        }

        const data = await response.json();

        // レスポンスからテキストを抽出
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return NextResponse.json(
                { error: "AIからの応答が空でした" },
                { status: 500 }
            );
        }

        return NextResponse.json({ feedback: text });

    } catch (error) {
        console.error("AI Feedback API Error:", error);
        return NextResponse.json(
            { error: "フィードバック生成中にエラーが発生しました" },
            { status: 500 }
        );
    }
}
