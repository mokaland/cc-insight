/**
 * AI Feedback Generation API Route
 * 
 * クライアントからのリクエストを受けて、サーバー側でGemini APIを呼び出す
 * これによりAPIキーをクライアントに露出させない
 */

import { NextRequest, NextResponse } from "next/server";

// デフォルトのフィードバックプロンプト
const DEFAULT_FEEDBACK_PROMPT = `あなたはSNS運用のプロフェッショナルコーチです。
メンバーの投稿を分析し、成長を促すための建設的で詳細なフィードバックを提供してください。

【評価項目】
1. 文章の構成と読みやすさ
2. ターゲット層への訴求力
3. 具体性と説得力
4. エンゲージメントを高める要素（質問、CTA等）
5. 改善点と具体的なアドバイス

【フィードバック形式】
必ず以下の形式で回答してください：

✅ 良い点:
（具体的に2-3点挙げてください）

💡 改善点:
（具体的に1-2点挙げてください）

🎯 次回への提案:
（実践的なアドバイスを1つ）

⭐ 総合評価: X/10

【注意事項】
- 励ましと具体的なアドバイスのバランスを取ってください
- 上から目線ではなく、コーチングの姿勢で
- 日本語で回答してください`;

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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
