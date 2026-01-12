"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPendingSnsApprovals,
  approveSnsAccount,
  rejectSnsAccount,
  type PendingUserSns,
  type PendingSnsItem,
} from "@/lib/firestore";
import { SNS_LABELS, PROFILE_COMPLETION_BONUS, SnsAccountApproval } from "@/lib/guardian-collection";
import { Timestamp } from "@/lib/types";
import {
  Check,
  X,
  ExternalLink,
  Clock,
  Users,
  RefreshCw,
} from "lucide-react";
import { PageLoader } from "@/components/ui/loading-spinner";

export default function SnsApprovalsPage() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<PendingUserSns[]>([]);
  const [processingKey, setProcessingKey] = useState<string | null>(null); // userId_snsKey
  const [rejectingKey, setRejectingKey] = useState<string | null>(null); // userId_snsKey
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPendingApprovals = async () => {
    setLoading(true);
    try {
      const approvals = await getPendingSnsApprovals();
      setPendingApprovals(approvals);
    } catch (error) {
      console.error("Error loading pending approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  // 管理者チェック
  if (userProfile?.role !== "admin") {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">管理者権限が必要です</p>
      </div>
    );
  }

  const handleApprove = async (userId: string, snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x') => {
    if (!user) return;
    const key = `${userId}_${snsKey}`;
    setProcessingKey(key);
    setMessage(null);

    try {
      const result = await approveSnsAccount(userId, snsKey, user.uid);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // リストから該当SNSを削除
        setPendingApprovals(prev => {
          return prev.map(approval => {
            if (approval.userId === userId) {
              return {
                ...approval,
                pendingItems: approval.pendingItems.filter(item => item.snsKey !== snsKey)
              };
            }
            return approval;
          }).filter(approval => approval.pendingItems.length > 0);
        });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '承認処理に失敗しました' });
    } finally {
      setProcessingKey(null);
    }
  };

  const handleReject = async (userId: string, snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x') => {
    if (!user || !rejectionReason.trim()) {
      setMessage({ type: 'error', text: '却下理由を入力してください' });
      return;
    }
    const key = `${userId}_${snsKey}`;
    setProcessingKey(key);
    setMessage(null);

    try {
      const result = await rejectSnsAccount(userId, snsKey, user.uid, rejectionReason.trim());
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // リストから該当SNSを削除
        setPendingApprovals(prev => {
          return prev.map(approval => {
            if (approval.userId === userId) {
              return {
                ...approval,
                pendingItems: approval.pendingItems.filter(item => item.snsKey !== snsKey)
              };
            }
            return approval;
          }).filter(approval => approval.pendingItems.length > 0);
        });
        setRejectingKey(null);
        setRejectionReason("");
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '却下処理に失敗しました' });
    } finally {
      setProcessingKey(null);
    }
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "不明";
    const date = timestamp.toDate();
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 承認待ちの総数を計算
  const totalPendingCount = pendingApprovals.reduce((sum, user) => sum + user.pendingItems.length, 0);

  if (loading) {
    return <PageLoader text="承認待ちリストを読み込み中..." />;
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            SNSアカウント承認
          </h1>
          <p className="text-slate-400 mt-1">
            各SNSアカウントを個別に確認して承認または却下します
          </p>
        </div>
        <Button
          onClick={loadPendingApprovals}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          更新
        </Button>
      </div>

      {/* 統計 */}
      <GlassCard glowColor="#3B82F6" className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalPendingCount}</p>
            <p className="text-sm text-slate-400">承認待ちSNS（{pendingApprovals.length}ユーザー）</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-yellow-400">
              全4SNS承認で +{PROFILE_COMPLETION_BONUS}E 付与
            </p>
          </div>
        </div>
      </GlassCard>

      {/* メッセージ */}
      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-300'
            : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}>
          {message.text}
        </div>
      )}

      {/* 承認待ちリスト */}
      {pendingApprovals.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">承認待ちのリクエストはありません</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <GlassCard key={approval.userId} className="p-6">
              {/* ユーザー情報 */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{approval.userName}</h3>
                  <p className="text-sm text-slate-400">{approval.userEmail}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    チーム: {approval.team}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                    {approval.pendingItems.length}件待ち
                  </span>
                </div>
              </div>

              {/* 個別SNS承認カード */}
              <div className="space-y-3">
                {approval.pendingItems.map((item) => {
                  const snsInfo = SNS_LABELS[item.snsKey];
                  const key = `${approval.userId}_${item.snsKey}`;
                  const isProcessing = processingKey === key;
                  const isRejecting = rejectingKey === key;

                  return (
                    <div key={item.snsKey} className="glass-bg p-4 rounded-xl">
                      {/* SNS情報とリンク */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{snsInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-white">{snsInfo.label}</span>
                          <p className="text-xs text-slate-500">
                            申請: {formatDate(item.submittedAt)}
                          </p>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-lg transition-colors"
                        >
                          <span className="text-xs">確認</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {/* URL表示 */}
                      <p className="text-xs text-slate-400 mb-3 break-all">{item.url}</p>

                      {/* アクションボタン */}
                      {isRejecting ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="却下理由を入力してください"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="bg-white/5 border-slate-600 text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReject(approval.userId, item.snsKey)}
                              disabled={isProcessing}
                              size="sm"
                              className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                              {isProcessing ? '処理中...' : '却下確定'}
                            </Button>
                            <Button
                              onClick={() => {
                                setRejectingKey(null);
                                setRejectionReason("");
                              }}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              キャンセル
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(approval.userId, item.snsKey)}
                            disabled={isProcessing}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            {isProcessing ? '...' : '承認'}
                          </Button>
                          <Button
                            onClick={() => setRejectingKey(key)}
                            disabled={isProcessing}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            却下
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
