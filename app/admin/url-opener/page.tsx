"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Play, Copy, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UrlItem {
    name?: string;
    date: string;
    url: string;
}

export default function UrlOpenerPage() {
    const [urls, setUrls] = useState<UrlItem[]>([]);
    const [title, setTitle] = useState("投稿URL一覧");
    const [isOpening, setIsOpening] = useState(false);
    const [openedCount, setOpenedCount] = useState(0);
    const [copyMessage, setCopyMessage] = useState<string | null>(null);

    useEffect(() => {
        // sessionStorageからURLデータを取得
        const storedData = sessionStorage.getItem("urlOpenerData");
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                setUrls(data.urls || []);
                setTitle(data.title || "投稿URL一覧");
            } catch (e) {
                console.error("Failed to parse URL data:", e);
            }
        }
    }, []);

    // 全URLを一括で開く
    const openAllUrls = () => {
        if (urls.length === 0 || isOpening) return;

        setIsOpening(true);
        setOpenedCount(0);

        // 最初の1つは即座に開く（ユーザーアクションとして）
        window.open(urls[0].url, "_blank");
        setOpenedCount(1);

        // 残りを200msごとに順次開く
        let index = 1;
        const interval = setInterval(() => {
            if (index < urls.length) {
                window.open(urls[index].url, "_blank");
                setOpenedCount(index + 1);
                index++;
            } else {
                clearInterval(interval);
                setIsOpening(false);
            }
        }, 200);
    };

    // 全URLをクリップボードにコピー
    const copyAllUrls = async () => {
        const urlText = urls.map(item => item.url).join('\n');
        try {
            await navigator.clipboard.writeText(urlText);
            setCopyMessage(`${urls.length}件のURLをコピーしました`);
            setTimeout(() => setCopyMessage(null), 3000);
        } catch (error) {
            console.error('コピー失敗:', error);
            setCopyMessage('コピーに失敗しました');
            setTimeout(() => setCopyMessage(null), 3000);
        }
    };

    if (urls.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center text-white">
                    <ExternalLink className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h1 className="text-2xl font-bold mb-2">URLデータがありません</h1>
                    <p className="text-slate-400 mb-6">ダッシュボードからURL一覧を開いてください</p>
                    <Link href="/dashboard/smartphone">
                        <Button className="bg-gradient-to-r from-blue-500 to-cyan-500">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            ダッシュボードに戻る
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* ヘッダー */}
                <div className="mb-6">
                    <Link href="/dashboard/smartphone" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        ダッシュボードに戻る
                    </Link>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ExternalLink className="w-6 h-6 text-blue-400" />
                        {title}
                    </h1>
                    <p className="text-slate-400 mt-1">全{urls.length}件のURL</p>
                </div>

                {/* 成功メッセージ */}
                {copyMessage && (
                    <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2 text-green-300">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{copyMessage}</span>
                    </div>
                )}

                {/* アクションボタン */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <Button
                        onClick={openAllUrls}
                        disabled={isOpening}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        {isOpening
                            ? `開いています... (${openedCount}/${urls.length})`
                            : `全${urls.length}件を一括で開く`}
                    </Button>
                    <Button
                        onClick={copyAllUrls}
                        variant="outline"
                        className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        全URLをコピー
                    </Button>
                </div>

                {/* 注意書き */}
                <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
                    💡 <strong>一括で開くには</strong>: Chrome設定 → プライバシーとセキュリティ → サイトの設定 → ポップアップとリダイレクト →
                    「ポップアップの送信やリダイレクトの使用を許可する」に <code className="bg-blue-500/20 px-1 rounded">cc-insight.vercel.app</code> を追加してください
                </div>

                {/* URL一覧 */}
                <div className="space-y-3">
                    {urls.map((item, index) => (
                        <div
                            key={index}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                                    {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    {item.name && (
                                        <p className="text-yellow-400 text-sm font-medium">{item.name}</p>
                                    )}
                                    <p className="text-slate-400 text-xs">{item.date}</p>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 hover:underline text-sm break-all"
                                    >
                                        {item.url}
                                    </a>
                                </div>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4 text-blue-400" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
