/**
 * AI Service Layer
 * 
 * AIプロバイダーを抽象化し、将来的にOpenAI/Claudeへの切替を容易にする設計。
 * 現在はGemini APIを使用。
 */

// AIプロバイダーのインターフェース
interface AIProvider {
    name: string;
    analyze(content: string, systemPrompt: string): Promise<string>;
}

// Gemini API プロバイダー
class GeminiProvider implements AIProvider {
    name = "gemini";
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async analyze(content: string, systemPrompt: string): Promise<string> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

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
            console.error("Gemini API Error:", errorData);
            throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();

        // レスポンスからテキストを抽出
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error("Gemini API returned empty response");
        }

        return text;
    }
}

// デフォルトのフィードバックプロンプト
export const DEFAULT_FEEDBACK_PROMPT = `あなたはSNS運用を指導する運営スタッフです。
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

// AIプロバイダーのインスタンスを取得
function getProvider(): AIProvider {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    // 将来的にここでプロバイダー切替
    // const providerName = process.env.AI_PROVIDER || "gemini";
    // if (providerName === "openai") return new OpenAIProvider(process.env.OPENAI_API_KEY);
    // if (providerName === "claude") return new ClaudeProvider(process.env.CLAUDE_API_KEY);

    return new GeminiProvider(apiKey);
}

/**
 * 投稿に対するフィードバックを生成
 * 
 * @param postContent - 分析対象の投稿テキスト
 * @param customPrompt - カスタムプロンプト（省略時はデフォルト使用）
 * @returns フィードバックテキスト
 */
export async function generatePostFeedback(
    postContent: string,
    customPrompt?: string
): Promise<string> {
    if (!postContent || postContent.trim() === "") {
        return "投稿内容が空のためフィードバックを生成できませんでした。";
    }

    try {
        const provider = getProvider();
        const prompt = customPrompt || DEFAULT_FEEDBACK_PROMPT;

        const feedback = await provider.analyze(postContent, prompt);
        return feedback;
    } catch (error) {
        console.error("AI Feedback Generation Error:", error);
        throw error;
    }
}

/**
 * 複数の投稿に対するフィードバックを一括生成
 * 
 * @param posts - 投稿の配列（URL + テキスト）
 * @param customPrompt - カスタムプロンプト
 * @returns フィードバックの配列
 */
export async function generateMultiplePostFeedbacks(
    posts: { url: string; content: string }[],
    customPrompt?: string
): Promise<{ url: string; content: string; feedback: string }[]> {
    const results = [];

    for (const post of posts) {
        try {
            const feedback = await generatePostFeedback(post.content, customPrompt);
            results.push({
                url: post.url,
                content: post.content,
                feedback,
            });
        } catch (error) {
            console.error(`Feedback generation failed for ${post.url}:`, error);
            results.push({
                url: post.url,
                content: post.content,
                feedback: "フィードバックの生成中にエラーが発生しました。",
            });
        }

        // レート制限対策: 各リクエスト間に少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
}
