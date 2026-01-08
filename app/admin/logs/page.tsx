"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getErrorLogs,
  getErrorLogsByLevel,
  deleteOldErrorLogs,
  type ErrorLog
} from "@/lib/firestore";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  Trash2,
  RefreshCw,
  Download,
  Filter,
  Clock,
  User,
  Code
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";

export default function AdminLogsPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ErrorLog[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"all" | "error" | "warning" | "info">("all");
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // 管理者チェック
    if (!user || userProfile?.role !== "admin") {
      router.push("/");
      return;
    }

    loadLogs();
  }, [user, userProfile]);

  useEffect(() => {
    // フィルター適用
    if (selectedLevel === "all") {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter(log => log.level === selectedLevel));
    }
  }, [selectedLevel, logs]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const fetchedLogs = await getErrorLogs(200);
      setLogs(fetchedLogs);
    } catch (error) {
      console.error("ログ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOldLogs = async () => {
    if (!confirm("30日以上前のログを削除しますか？")) return;

    setIsDeleting(true);
    try {
      const deletedCount = await deleteOldErrorLogs(30);
      alert(`${deletedCount}件のログを削除しました`);
      loadLogs();
    } catch (error) {
      console.error("ログ削除エラー:", error);
      alert("ログの削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportLogsToCSV = () => {
    const headers = [
      '日時',
      'レベル',
      'ソース',
      'メッセージ',
      'ユーザーID',
      'ユーザーEmail',
      'URL'
    ];

    const rows = filteredLogs.map(log => [
      log.timestamp.toDate().toLocaleString('ja-JP'),
      log.level,
      log.source,
      log.message.replace(/,/g, '，'), // カンマをエスケープ
      log.userId || '',
      log.userEmail || '',
      log.url || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];

    link.setAttribute('href', url);
    link.setAttribute('download', `エラーログ_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: "text-red-500" };
      case "warning":
        return { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", icon: "text-yellow-500" };
      case "info":
        return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "text-blue-500" };
      default:
        return { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-400", icon: "text-slate-500" };
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertTriangle className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      case "info":
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const errorCount = logs.filter(l => l.level === "error").length;
  const warningCount = logs.filter(l => l.level === "warning").length;
  const infoCount = logs.filter(l => l.level === "info").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <RefreshCw className="w-12 h-12 animate-spin text-purple-500" />
        <p className="text-slate-300">ログを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
            📊 エラーログ管理
          </h1>
          <p className="text-slate-300">システム全体のエラーと警告を監視</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={exportLogsToCSV}
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </Button>
          <Button
            onClick={handleDeleteOldLogs}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? "削除中..." : "古いログ削除"}
          </Button>
          <Button onClick={loadLogs} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <RefreshCw className="w-4 h-4 mr-2" />
            再読込
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard glowColor="#8B5CF6" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Info className="w-6 h-6 text-purple-400" />
            <p className="text-sm text-slate-300">総ログ数</p>
          </div>
          <p className="text-3xl font-bold text-purple-400">{logs.length}</p>
        </GlassCard>

        <div
          className="cursor-pointer transition-all"
          onClick={() => setSelectedLevel(selectedLevel === "error" ? "all" : "error")}
        >
          <GlassCard
            glowColor="#EF4444"
            className={`p-6 ${selectedLevel === "error" ? "ring-2 ring-red-500" : ""}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <p className="text-sm text-slate-300">エラー</p>
            </div>
            <p className="text-3xl font-bold text-red-400">{errorCount}</p>
          </GlassCard>
        </div>

        <div
          className="cursor-pointer transition-all"
          onClick={() => setSelectedLevel(selectedLevel === "warning" ? "all" : "warning")}
        >
          <GlassCard
            glowColor="#EAB308"
            className={`p-6 ${selectedLevel === "warning" ? "ring-2 ring-yellow-500" : ""}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <p className="text-sm text-slate-300">警告</p>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{warningCount}</p>
          </GlassCard>
        </div>

        <div
          className="cursor-pointer transition-all"
          onClick={() => setSelectedLevel(selectedLevel === "info" ? "all" : "info")}
        >
          <GlassCard
            glowColor="#3B82F6"
            className={`p-6 ${selectedLevel === "info" ? "ring-2 ring-blue-500" : ""}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-blue-400" />
              <p className="text-sm text-slate-300">情報</p>
            </div>
            <p className="text-3xl font-bold text-blue-400">{infoCount}</p>
          </GlassCard>
        </div>
      </div>

      {/* フィルター状態 */}
      {selectedLevel !== "all" && (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Filter className="w-4 h-4" />
          <span>フィルター: {selectedLevel === "error" ? "エラーのみ" : selectedLevel === "warning" ? "警告のみ" : "情報のみ"}</span>
          <button
            onClick={() => setSelectedLevel("all")}
            className="ml-2 text-purple-400 hover:text-purple-300 underline"
          >
            クリア
          </button>
        </div>
      )}

      {/* ログリスト */}
      <GlassCard glowColor="#8B5CF6" className="p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          ログ一覧 ({filteredLogs.length}件)
        </h2>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>該当するログはありません</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredLogs.map((log) => {
              const colors = getLevelColor(log.level);
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 rounded-xl border ${colors.bg} ${colors.border} cursor-pointer transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-start gap-3">
                    <div className={colors.icon}>
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold ${colors.text} uppercase`}>
                          {log.level}
                        </span>
                        <span className="text-xs text-slate-400">
                          {log.timestamp.toDate().toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white mb-1">{log.source}</p>
                      <p className="text-sm text-slate-300 truncate">{log.message}</p>
                      {(log.userId || log.userEmail) && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <User className="w-3 h-3" />
                          <span>{log.userEmail || log.userId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* 詳細モーダル */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 md:pb-4 pb-[calc(var(--bottom-nav-height)+3rem)]"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="glass-premium rounded-2xl border border-white/20 p-6 max-w-3xl w-full max-h-[calc(100vh-var(--bottom-nav-height)-6rem)] md:max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">ログ詳細</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getLevelColor(selectedLog.level).bg} ${getLevelColor(selectedLog.level).text}`}>
                {selectedLog.level.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div className="glass-bg p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-400">発生日時</p>
                </div>
                <p className="text-white">
                  {selectedLog.timestamp.toDate().toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>

              <div className="glass-bg p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-400">ソース</p>
                </div>
                <p className="text-white">{selectedLog.source}</p>
              </div>

              <div className="glass-bg p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-2">メッセージ</p>
                <p className="text-white break-words">{selectedLog.message}</p>
              </div>

              {selectedLog.stack && (
                <div className="glass-bg p-4 rounded-xl">
                  <p className="text-xs text-slate-400 mb-2">スタックトレース</p>
                  <pre className="text-xs text-slate-300 overflow-x-auto bg-black/30 p-3 rounded">
                    {selectedLog.stack}
                  </pre>
                </div>
              )}

              {(selectedLog.userId || selectedLog.userEmail) && (
                <div className="glass-bg p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <p className="text-xs text-slate-400">ユーザー情報</p>
                  </div>
                  {selectedLog.userEmail && (
                    <p className="text-white text-sm mb-1">{selectedLog.userEmail}</p>
                  )}
                  {selectedLog.userId && (
                    <p className="text-slate-400 text-xs">ID: {selectedLog.userId}</p>
                  )}
                </div>
              )}

              {selectedLog.url && (
                <div className="glass-bg p-4 rounded-xl">
                  <p className="text-xs text-slate-400 mb-2">URL</p>
                  <p className="text-white text-sm break-all">{selectedLog.url}</p>
                </div>
              )}

              {selectedLog.userAgent && (
                <div className="glass-bg p-4 rounded-xl">
                  <p className="text-xs text-slate-400 mb-2">User Agent</p>
                  <p className="text-slate-300 text-xs break-all">{selectedLog.userAgent}</p>
                </div>
              )}

              {selectedLog.additionalData && Object.keys(selectedLog.additionalData).length > 0 && (
                <div className="glass-bg p-4 rounded-xl">
                  <p className="text-xs text-slate-400 mb-2">追加データ</p>
                  <pre className="text-xs text-slate-300 overflow-x-auto bg-black/30 p-3 rounded">
                    {JSON.stringify(selectedLog.additionalData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <Button
              onClick={() => setSelectedLog(null)}
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              閉じる
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
