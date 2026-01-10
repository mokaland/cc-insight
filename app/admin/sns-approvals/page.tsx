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
} from "@/lib/firestore";
import { SnsAccounts, SNS_LABELS, PROFILE_COMPLETION_BONUS } from "@/lib/guardian-collection";
import { Timestamp } from "firebase/firestore";
import {
  Check,
  X,
  ExternalLink,
  Clock,
  Users,
  RefreshCw,
} from "lucide-react";
import { PageLoader } from "@/components/ui/loading-spinner";

interface PendingApproval {
  userId: string;
  userName: string;
  userEmail: string;
  team: string;
  snsAccounts: SnsAccounts;
  submittedAt: Timestamp | null;
}

export default function SnsApprovalsPage() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
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

  const handleApprove = async (userId: string) => {
    if (!user) return;
    setProcessingUserId(userId);
    setMessage(null);

    try {
      const result = await approveSnsAccount(userId, user.uid);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // リストから削除
        setPendingApprovals(prev => prev.filter(a => a.userId !== userId));
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '承認処理に失敗しました' });
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!user || !rejectionReason.trim()) {
      setMessage({ type: 'error', text: '却下理由を入力してください' });
      return;
    }
    setProcessingUserId(userId);
    setMessage(null);

    try {
      const result = await rejectSnsAccount(userId, user.uid, rejectionReason.trim());
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // リストから削除
        setPendingApprovals(prev => prev.filter(a => a.userId !== userId));
        setRejectingUserId(null);
        setRejectionReason("");
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '却下処理に失敗しました' });
    } finally {
      setProcessingUserId(null);
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

  const getSnsUrl = (type: string, username: string): string => {
    const cleanUsername = username.replace('@', '');
    switch (type) {
      case 'instagram':
        return `https://instagram.com/${cleanUsername}`;
      case 'youtube':
        return `https://youtube.com/@${cleanUsername}`;
      case 'tiktok':
        return `https://tiktok.com/@${cleanUsername}`;
      case 'x':
        return `https://x.com/${cleanUsername}`;
      default:
        return '#';
    }
  };

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
            メンバーのSNSアカウントを確認して承認または却下します
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
            <p className="text-2xl font-bold text-white">{pendingApprovals.length}</p>
            <p className="text-sm text-slate-400">承認待ち</p>
          </div>
        </div>
      </GlassCard>

      {/* メッセージ */}
      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success'
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
                    チーム: {approval.team} | 申請日時: {formatDate(approval.submittedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-yellow-400">
                    承認すると +{PROFILE_COMPLETION_BONUS}E 付与
                  </p>
                </div>
              </div>

              {/* SNSアカウント一覧 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {(['instagram', 'youtube', 'tiktok', 'x'] as const).map((snsKey) => {
                  const value = approval.snsAccounts[snsKey];
                  const snsInfo = SNS_LABELS[snsKey];
                  if (!value) return null;

                  return (
                    <div key={snsKey} className="glass-bg p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{snsInfo.icon}</span>
                        <span className="text-xs text-slate-400">{snsInfo.label}</span>
                      </div>
                      <a
                        href={getSnsUrl(snsKey, value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 break-all"
                      >
                        {value}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  );
                })}
              </div>

              {/* アクションボタン */}
              {rejectingUserId === approval.userId ? (
                <div className="space-y-3">
                  <Input
                    placeholder="却下理由を入力してください"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="bg-white/5 border-slate-600"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleReject(approval.userId)}
                      disabled={processingUserId === approval.userId}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {processingUserId === approval.userId ? '処理中...' : '却下を確定'}
                    </Button>
                    <Button
                      onClick={() => {
                        setRejectingUserId(null);
                        setRejectionReason("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(approval.userId)}
                    disabled={processingUserId === approval.userId}
                    className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {processingUserId === approval.userId ? '処理中...' : '承認'}
                  </Button>
                  <Button
                    onClick={() => setRejectingUserId(approval.userId)}
                    disabled={processingUserId === approval.userId}
                    variant="outline"
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    却下
                  </Button>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
