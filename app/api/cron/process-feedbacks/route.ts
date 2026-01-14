import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    Timestamp,
} from "firebase/firestore";
import { generateAndSaveFeedback, sendFeedbackAsDM } from "@/lib/post-feedback";

/**
 * スケジュールされた投稿フィードバックを処理するCron API
 * 
 * Vercel Cronで1分毎に実行される想定
 * scheduled_feedbacksコレクションから実行時刻を過ぎたフィードバック予約を取得し処理
 */
export async function GET(request: Request) {
    try {
        // 🔐 セキュリティ強化: Vercel Cron専用ヘッダーチェック + Bearer token
        const vercelCronHeader = request.headers.get('x-vercel-cron');
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        // Vercel Cronからのリクエストでない、または認証トークンが一致しない場合は拒否
        if (!vercelCronHeader || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
            console.warn('⚠️ 不正なCronアクセス試行を検出:', {
                hasVercelHeader: !!vercelCronHeader,
                hasToken: !!token,
                timestamp: new Date().toISOString(),
            });
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        console.log('📬 フィードバック処理Cron実行開始...');

        const now = Timestamp.now();

        // 実行予定時刻を過ぎた未処理のフィードバック予約を取得
        const scheduledRef = collection(db, "scheduled_feedbacks");
        const q = query(
            scheduledRef,
            where("status", "==", "pending"),
            where("scheduledAt", "<=", now)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("📭 No scheduled feedbacks to process");
            return NextResponse.json({
                success: true,
                message: "No feedbacks to process",
                processed: 0
            });
        }

        console.log(`📬 Found ${snapshot.size} scheduled feedbacks to process`);

        let processedCount = 0;
        let errorCount = 0;

        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            const docRef = doc(db, "scheduled_feedbacks", docSnapshot.id);

            try {
                // ステータスを処理中に更新（重複処理防止）
                await updateDoc(docRef, { status: "processing" });

                console.log(`🤖 Processing feedback for ${data.userName}...`);

                // フィードバック生成
                const feedbacks = await generateAndSaveFeedback(
                    data.reportId,
                    data.posts,
                    data.userId,
                    data.userName
                );

                if (feedbacks.length > 0) {
                    // DM送信
                    await sendFeedbackAsDM(
                        feedbacks,
                        data.adminId,
                        data.adminName,
                        data.userId,
                        data.userName
                    );

                    console.log(`✅ Feedback sent to ${data.userName}: ${feedbacks.length} posts`);
                } else {
                    console.log(`⚠️ No valid feedbacks generated for ${data.userName}`);
                }

                // ステータスを完了に更新
                await updateDoc(docRef, {
                    status: "completed",
                    completedAt: Timestamp.now(),
                    feedbackCount: feedbacks.length
                });

                processedCount++;

            } catch (error: any) {
                console.error(`❌ Error processing feedback for ${data.userName}:`, error);

                // エラー状態に更新
                await updateDoc(docRef, {
                    status: "error",
                    error: error.message || "Unknown error",
                    errorAt: Timestamp.now()
                });

                errorCount++;
            }

            // レート制限対策（各処理間に500ms待機）
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`📊 Processed: ${processedCount}, Errors: ${errorCount}`);

        return NextResponse.json({
            success: true,
            processed: processedCount,
            errors: errorCount
        });

    } catch (error: any) {
        console.error("❌ Cron job error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process feedbacks" },
            { status: 500 }
        );
    }
}
