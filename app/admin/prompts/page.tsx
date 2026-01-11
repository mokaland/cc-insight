"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save, RotateCcw, CheckCircle, AlertCircle, Sparkles, Eye } from "lucide-react";
import { getFeedbackPrompt, saveFeedbackPrompt } from "@/lib/post-feedback";
import { generatePostFeedback, DEFAULT_FEEDBACK_PROMPT } from "@/lib/ai-service";
import { useAuth } from "@/lib/auth-context";

export default function PromptsPage() {
    const { userProfile } = useAuth();
    const [prompt, setPrompt] = useState("");
    const [originalPrompt, setOriginalPrompt] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    // プレビュー用
    const [testContent, setTestContent] = useState("今日は副業について発信しました！サラリーマンでも月5万円を稼ぐ方法を解説。まずは自分の得意分野を見つけることが大切です。#副業 #サラリーマン");
    const [previewResult, setPreviewResult] = useState("");
    const [previewing, setPreviewing] = useState(false);

    useEffect(() => {
        loadPrompt();
    }, []);

    const loadPrompt = async () => {
        try {
            const savedPrompt = await getFeedbackPrompt();
            setPrompt(savedPrompt);
            setOriginalPrompt(savedPrompt);
        } catch (err) {
            console.error("プロンプト読み込みエラー:", err);
            setPrompt(DEFAULT_FEEDBACK_PROMPT);
            setOriginalPrompt(DEFAULT_FEEDBACK_PROMPT);
        }
    };

    const handleSave = async () => {
        if (!userProfile) return;

        setSaving(true);
        setError("");
        setSuccess(false);

        try {
            await saveFeedbackPrompt(prompt, userProfile.displayName);
            setOriginalPrompt(prompt);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("保存エラー:", err);
            setError("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setPrompt(DEFAULT_FEEDBACK_PROMPT);
    };

    const handleRevert = () => {
        setPrompt(originalPrompt);
    };

    const handlePreview = async () => {
        if (!testContent.trim()) return;

        setPreviewing(true);
        setPreviewResult("");

        try {
            const result = await generatePostFeedback(testContent, prompt);
            setPreviewResult(result);
        } catch (err) {
            console.error("プレビューエラー:", err);
            setPreviewResult("エラー: フィードバック生成に失敗しました。APIキーを確認してください。");
        } finally {
            setPreviewing(false);
        }
    };

    const hasChanges = prompt !== originalPrompt;

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Settings className="h-8 w-8 text-purple-500" />
                    AIフィードバック設定
                </h1>
                <p className="text-muted-foreground mt-2">
                    メンバーの投稿に対するAIフィードバックのプロンプトを編集できます
                </p>
            </div>

            {/* メッセージ */}
            {success && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    プロンプトを保存しました
                </div>
            )}
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* プロンプト編集 */}
                <Card className="backdrop-blur-xl bg-white/5 border-purple-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            フィードバックプロンプト
                        </CardTitle>
                        <CardDescription>
                            AIがどのようにフィードバックするかを指示するプロンプトです
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full h-96 px-4 py-3 rounded-lg bg-white/5 border border-purple-500/30 focus:border-purple-500 focus:outline-none resize-none text-sm font-mono"
                            placeholder="プロンプトを入力..."
                        />

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
                                className="bg-gradient-to-r from-purple-500 to-pink-500"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? "保存中..." : "保存"}
                            </Button>
                            <Button
                                onClick={handleRevert}
                                variant="outline"
                                disabled={!hasChanges}
                                className="text-slate-300"
                            >
                                変更を取り消し
                            </Button>
                            <Button
                                onClick={handleReset}
                                variant="ghost"
                                className="text-slate-400"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                デフォルトに戻す
                            </Button>
                        </div>

                        {hasChanges && (
                            <p className="text-sm text-yellow-400">
                                ⚠️ 未保存の変更があります
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* プレビュー */}
                <Card className="backdrop-blur-xl bg-white/5 border-blue-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-blue-500" />
                            プレビュー
                        </CardTitle>
                        <CardDescription>
                            テスト投稿でフィードバックを確認できます
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* テスト投稿入力 */}
                        <div>
                            <label className="text-sm text-slate-300 mb-2 block">テスト投稿内容</label>
                            <textarea
                                value={testContent}
                                onChange={(e) => setTestContent(e.target.value)}
                                className="w-full h-32 px-4 py-3 rounded-lg bg-white/5 border border-blue-500/30 focus:border-blue-500 focus:outline-none resize-none text-sm"
                                placeholder="テスト用の投稿内容を入力..."
                            />
                        </div>

                        <Button
                            onClick={handlePreview}
                            disabled={previewing || !testContent.trim()}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {previewing ? "生成中..." : "フィードバックを生成"}
                        </Button>

                        {/* プレビュー結果 */}
                        {previewResult && (
                            <div className="p-4 rounded-lg bg-white/5 border border-blue-500/20">
                                <h4 className="text-sm font-medium text-blue-400 mb-2">生成されたフィードバック:</h4>
                                <div className="text-sm text-slate-300 whitespace-pre-wrap">
                                    {previewResult}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 使い方ガイド */}
            <Card className="backdrop-blur-xl bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle>📖 プロンプト作成のヒント</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-300">
                    <div>
                        <h4 className="font-medium text-white mb-1">1. 役割を明確に</h4>
                        <p>「あなたはSNS運用のプロフェッショナルコーチです」のように、AIの役割を最初に定義します。</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-white mb-1">2. 評価項目を具体的に</h4>
                        <p>文章の構成、ターゲット層への訴求力、ハッシュタグの使い方など、評価してほしい観点を明示します。</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-white mb-1">3. 出力形式を指定</h4>
                        <p>「良い点」「改善点」「次回への提案」など、フィードバックの形式を指定すると統一感が出ます。</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-white mb-1">4. トーンを調整</h4>
                        <p>「励ましと具体的なアドバイスのバランスを取って」「上から目線ではなく」など、コミュニケーションスタイルを指定できます。</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
