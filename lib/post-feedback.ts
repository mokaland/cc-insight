/**
 * Post Feedback System
 * 
 * 投稿に対するAIフィードバックの生成、保存、DM送信を管理
 */

import { db } from "./firebase";
import {
    collection,
    addDoc,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { generatePostFeedback, DEFAULT_FEEDBACK_PROMPT } from "./ai-service";

// フィードバック型定義
export interface PostFeedback {
    id?: string;
    reportId: string;
    userId: string;
    userName: string;
    postUrl: string;
    postContent: string;
    feedback: string;
    aiProvider: string;
    createdAt: Timestamp;
    dmSent: boolean;
    dmMessageId?: string;
}

// プロンプト設定型定義
export interface AISettings {
    prompt: string;
    updatedAt: Timestamp;
    updatedBy: string;
}

/**
 * カスタムプロンプトを取得
 */
export async function getFeedbackPrompt(): Promise<string> {
    try {
        const docRef = doc(db, "ai_settings", "post_feedback_prompt");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as AISettings;
            return data.prompt || DEFAULT_FEEDBACK_PROMPT;
        }

        return DEFAULT_FEEDBACK_PROMPT;
    } catch (error) {
        console.error("Error fetching feedback prompt:", error);
        return DEFAULT_FEEDBACK_PROMPT;
    }
}

/**
 * カスタムプロンプトを保存
 */
export async function saveFeedbackPrompt(
    prompt: string,
    updatedBy: string
): Promise<void> {
    const docRef = doc(db, "ai_settings", "post_feedback_prompt");
    await setDoc(docRef, {
        prompt,
        updatedAt: serverTimestamp(),
        updatedBy,
    });
}

/**
 * フィードバックを生成してFirestoreに保存
 */
export async function generateAndSaveFeedback(
    reportId: string,
    posts: { url: string; content: string }[],
    userId: string,
    userName: string
): Promise<PostFeedback[]> {
    // 空の投稿をフィルタリング
    const validPosts = posts.filter(p => p.content && p.content.trim() !== "");

    if (validPosts.length === 0) {
        console.log("No valid posts to analyze");
        return [];
    }

    // カスタムプロンプトを取得
    const customPrompt = await getFeedbackPrompt();

    const feedbacks: PostFeedback[] = [];

    for (const post of validPosts) {
        try {
            console.log(`🤖 Generating feedback for post: ${post.url.substring(0, 50)}...`);

            // AIフィードバック生成
            const feedbackText = await generatePostFeedback(post.content, customPrompt);

            // Firestoreに保存
            const feedbackData = {
                reportId,
                userId,
                userName,
                postUrl: post.url,
                postContent: post.content,
                feedback: feedbackText,
                aiProvider: "gemini",
                createdAt: serverTimestamp(),
                dmSent: false,
            };

            const docRef = await addDoc(collection(db, "post_feedbacks"), feedbackData);

            feedbacks.push({
                ...feedbackData,
                id: docRef.id,
                createdAt: Timestamp.now(),
            });

            console.log(`✅ Feedback saved: ${docRef.id}`);

            // レート制限対策
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.error(`Error generating feedback for ${post.url}:`, error);
            // エラーがあっても他の投稿の処理は続行
        }
    }

    return feedbacks;
}

/**
 * フィードバックをDMとして送信
 */
export async function sendFeedbackAsDM(
    feedbacks: PostFeedback[],
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    toUserName: string
): Promise<void> {
    if (feedbacks.length === 0) return;

    // 全フィードバックを1つのDMにまとめる
    let dmMessage = `【📊 投稿フィードバック】\n\n`;
    dmMessage += `${toUserName}さん、お疲れ様です！\n`;
    dmMessage += `本日の投稿${feedbacks.length}件について、AIによるフィードバックをお届けします。\n\n`;
    dmMessage += `━━━━━━━━━━━━━━━━━━\n\n`;

    feedbacks.forEach((fb, index) => {
        dmMessage += `【投稿 ${index + 1}】\n`;
        dmMessage += `📝 投稿内容:\n${fb.postContent.substring(0, 100)}${fb.postContent.length > 100 ? '...' : ''}\n\n`;
        dmMessage += `🤖 フィードバック:\n${fb.feedback}\n\n`;
        if (index < feedbacks.length - 1) {
            dmMessage += `━━━━━━━━━━━━━━━━━━\n\n`;
        }
    });

    dmMessage += `\n✨ 引き続き頑張っていきましょう！`;

    try {
        // DMを送信
        const dmRef = await addDoc(collection(db, "dm_messages"), {
            fromUserId,
            fromUserName,
            toUserId,
            toUserName,
            message: dmMessage,
            isAdmin: true,
            isAutoFeedback: true, // 自動フィードバックフラグ
            participants: [fromUserId, toUserId],
            createdAt: serverTimestamp(),
        });

        console.log(`📨 Feedback DM sent: ${dmRef.id}`);

        // 各フィードバックのdmSentフラグを更新
        for (const fb of feedbacks) {
            if (fb.id) {
                const feedbackRef = doc(db, "post_feedbacks", fb.id);
                await setDoc(feedbackRef, {
                    dmSent: true,
                    dmMessageId: dmRef.id
                }, { merge: true });
            }
        }
    } catch (error) {
        console.error("Error sending feedback DM:", error);
        throw error;
    }
}

/**
 * フィードバック生成からDM送信まで一括処理
 * 
 * @param reportId - レポートID
 * @param posts - 投稿配列（URL + 内容）
 * @param userId - メンバーのユーザーID
 * @param userName - メンバーの表示名
 * @param adminId - 送信元の管理者ID
 * @param adminName - 送信元の管理者名
 */
export async function processPostFeedback(
    reportId: string,
    posts: { url: string; content: string }[],
    userId: string,
    userName: string,
    adminId: string,
    adminName: string
): Promise<void> {
    try {
        // 1. フィードバック生成・保存
        const feedbacks = await generateAndSaveFeedback(
            reportId,
            posts,
            userId,
            userName
        );

        if (feedbacks.length === 0) {
            console.log("No feedbacks generated, skipping DM");
            return;
        }

        // 2. DMとして送信
        await sendFeedbackAsDM(
            feedbacks,
            adminId,
            adminName,
            userId,
            userName
        );

        console.log(`✅ Feedback process complete: ${feedbacks.length} feedbacks sent to ${userName}`);
    } catch (error) {
        console.error("Error in processPostFeedback:", error);
        throw error;
    }
}
