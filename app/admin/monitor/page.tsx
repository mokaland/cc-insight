"use client";

/**
 * CC Insight v2: The Sovereign Command
 * Active Monitor - 離脱防止監視パネル
 * 
 * 【目的】
 * 菅原副社長が管理画面を開いた瞬間、
 * 「今、誰を助けるべきか」が一目で分かる状態にする
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingDown,
  User,
  Calendar,
  MessageCircle,
  ExternalLink,
  AlertTriangle,
  Shield,
  Settings,
  X,
  Users,
  Send
} from "lucide-react";
import { ContentLoader, ButtonLoader } from "@/components/ui/loading-spinner";
import { getAllUsers, User as UserProfile, getReportsByPeriod, Report, getUserRecentReports, detectAnomalies, AnomalyFlags } from "@/lib/firestore";
import { 
  getTeamConfig, 
  getReportStatus, 
  getAlertLevel, 
  getAlertColor,
  ReportStatus 
} from "@/lib/team-config";

interface MemberStatus {
  user: UserProfile;
  status: ReportStatus;
  alertLevel: "safe" | "attention" | "warning" | "danger";
  lastReportDate: Date | null;
  lastReportDaysAgo: number;
  totalReports: number;
  currentStreak: number;
  teamColor: string;
  anomalies?: AnomalyFlags;
  hasAnomalies?: boolean;
}

export default function ActiveMonitorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "danger" | "warning" | "attention" | "safe" | "anomaly">("all");
  const [period, setPeriod] = useState<"week" | "month" | "custom">("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showAnomalySettings, setShowAnomalySettings] = useState(false);

  // 異常値判定の閾値（カスタマイズ可能）
  const [anomalyThresholds, setAnomalyThresholds] = useState({
    minEnergy: 300,              // エナジー下限
    minStage: 3,                 // ステージ下限
    maxAvgViews: 1000,           // 平均再生数上限
    maxAvgPosts: 2,              // 平均投稿数上限
    modifyRatio: 2,              // 修正回数比率
    growthMultiplier: 3          // 成長倍率
  });

  // メンバー比較機能
  const [comparisonMembers, setComparisonMembers] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const toggleMemberForComparison = (userId: string) => {
    setComparisonMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else if (prev.length < 2) {
        return [...prev, userId];
      } else {
        // すでに2人選択済みの場合、最初のを削除して新しいのを追加
        return [prev[1], userId];
      }
    });
  };

  // 一斉通知機能
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "danger" | "warning" | "attention">("danger");
  const [isSending, setIsSending] = useState(false);

  const sendBroadcastNotification = async () => {
    if (!broadcastMessage.trim()) {
      alert("メッセージを入力してください");
      return;
    }

    setIsSending(true);
    try {
      const targetMembers = broadcastTarget === "all"
        ? members
        : members.filter(m => m.alertLevel === broadcastTarget);

      // Slack webhook経由で一斉通知
      // 実際の実装ではバックエンドAPIを呼ぶべきだが、ここでは簡易実装
      const slackMessage = {
        text: `🔔 *一斉通知（${targetMembers.length}人対象）*\n\n${broadcastMessage}\n\n送信者: ${user?.displayName || "管理者"}`
      };

      // 各メンバーにSlack通知を送る（実際にはAPI経由で実装）
      console.log("Broadcasting to:", {
        target: broadcastTarget,
        count: targetMembers.length,
        message: broadcastMessage,
        members: targetMembers.map(m => m.user.displayName)
      });

      alert(`${targetMembers.length}人に通知を送信しました！\n\n（実装完了後はSlack経由で実際に送信されます）`);

      setBroadcastMessage("");
      setShowBroadcast(false);
    } catch (error) {
      console.error("通知送信エラー:", error);
      alert("通知の送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  const loadMemberStatuses = useCallback(async () => {
    setLoading(true);
    try {
      // 全ユーザーを取得
      const allUsers = await getAllUsers();
      const memberUsers = allUsers.filter(u => u.role === "member" && u.status === "approved");

      // 期間に応じてレポートを取得
      let reports: Report[];
      if (period === "custom" && customStartDate && customEndDate) {
        // カスタム期間でフィルタリング
        const allReports = await getReportsByPeriod("month"); // まず全期間取得
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999); // 終了日の最後まで含める

        reports = allReports.filter(r => {
          const reportDate = new Date(r.date);
          return reportDate >= start && reportDate <= end;
        });
      } else {
        reports = await getReportsByPeriod(period);
      }

      // 各メンバーの状況を分析
      const statuses: MemberStatus[] = [];

      for (const member of memberUsers) {
        const memberReports = reports.filter(r => r.userId === member.uid);
        
        // 最終報告日を取得
        let lastReportDate: Date | null = null;
        if (memberReports.length > 0) {
          const sorted = [...memberReports].sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
            return bTime - aTime;
          });
          lastReportDate = sorted[0].createdAt?.toDate() || null;
        }

        // 最終報告からの経過日数
        const lastReportDaysAgo = lastReportDate
          ? Math.floor((Date.now() - lastReportDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // 報告状況とアラートレベルを判定
        const status = getReportStatus(member.team, lastReportDate);
        const alertLevel = getAlertLevel(status);

        // チーム設定から色を取得
        const teamConfig = getTeamConfig(member.team);
        const teamColor = teamConfig?.color || "#a855f7";

        // ストリーク計算（簡易版）
        const currentStreak = calculateSimpleStreak(memberReports);

        // 異常値検知（過去7日間のレポート分析）
        const recentReports = await getUserRecentReports(member.uid, 7);

        // 守護神データからエナジーとステージを取得
        const activeGuardian = member.guardians?.find(g => g.guardianId === member.activeGuardianId);
        const energy = activeGuardian?.investedEnergy || 0;
        const guardianStage = activeGuardian?.stage || 0;

        const anomalies = detectAnomalies(
          recentReports,
          energy,
          guardianStage
        );
        const hasAnomalies = Object.values(anomalies).some(v => v);

        statuses.push({
          user: member,
          status,
          alertLevel,
          lastReportDate,
          lastReportDaysAgo,
          totalReports: memberReports.length,
          currentStreak,
          teamColor,
          anomalies,
          hasAnomalies,
        });
      }

      // 危険度順にソート
      const alertOrder = { danger: 0, warning: 1, attention: 2, safe: 3 };
      statuses.sort((a, b) => {
        if (a.alertLevel !== b.alertLevel) {
          return alertOrder[a.alertLevel] - alertOrder[b.alertLevel];
        }
        // 同じアラートレベルなら、最終報告が古い順
        return b.lastReportDaysAgo - a.lastReportDaysAgo;
      });

      setMembers(statuses);
    } catch (error) {
      console.error("メンバー状況の読み込みエラー:", error);
    } finally {
      setLoading(false);
    }
  }, [period, customStartDate, customEndDate]);

  // 🆕 useEffectを関数定義の後に配置
  useEffect(() => {
    if (user) {
      loadMemberStatuses();
    }
  }, [user, loadMemberStatuses]);

  const calculateSimpleStreak = (reports: Report[]): number => {
    if (reports.length === 0) return 0;
    
    const sorted = [...reports].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const report of sorted) {
      const reportDate = new Date(report.date);
      reportDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);
      
      if (reportDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const filteredMembers = members.filter(m => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "anomaly") return m.hasAnomalies;
    return m.alertLevel === selectedFilter;
  });

  const dangerCount = members.filter(m => m.alertLevel === "danger").length;
  const warningCount = members.filter(m => m.alertLevel === "warning").length;
  const attentionCount = members.filter(m => m.alertLevel === "attention").length;
  const safeCount = members.filter(m => m.alertLevel === "safe").length;
  const anomalyCount = members.filter(m => m.hasAnomalies).length;

  const getStatusLabel = (status: ReportStatus): string => {
    const labels = {
      submitted: "✅ 報告済み",
      pending: "⏳ 保留中",
      overdue: "⚠️ 遅延",
      at_risk: "🚨 離脱リスク",
    };
    return labels[status];
  };

  const getStatusDescription = (member: MemberStatus): string => {
    if (member.lastReportDate) {
      if (member.lastReportDaysAgo === 0) {
        return "今日報告済み";
      } else if (member.lastReportDaysAgo === 1) {
        return "昨日報告済み";
      } else {
        return `${member.lastReportDaysAgo}日前に報告`;
      }
    }
    return "報告なし";
  };

  if (loading) {
    return <ContentLoader text="監視データを読み込み中..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
          🔴 Active Monitor
        </h1>
        <p className="text-muted-foreground mt-2">
          離脱防止監視パネル - リアルタイム報告状況
        </p>
      </div>

      {/* 📅 期間選択UI */}
      <GlassCard glowColor="#8b5cf6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            データ期間
          </h3>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={period === "week" ? "default" : "outline"}
              onClick={() => setPeriod("week")}
              className={period === "week" ? "bg-purple-500 hover:bg-purple-600" : ""}
            >
              週間 (7日)
            </Button>
            <Button
              variant={period === "month" ? "default" : "outline"}
              onClick={() => setPeriod("month")}
              className={period === "month" ? "bg-purple-500 hover:bg-purple-600" : ""}
            >
              月間 (30日)
            </Button>
            <Button
              variant={period === "custom" ? "default" : "outline"}
              onClick={() => setPeriod("custom")}
              className={period === "custom" ? "bg-purple-500 hover:bg-purple-600" : ""}
            >
              カスタム期間
            </Button>
          </div>

          {period === "custom" && (
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  開始日
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  終了日
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div 
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => setSelectedFilter(selectedFilter === "danger" ? "all" : "danger")}
        >
          <GlassCard glowColor="#ef4444">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/20">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">離脱リスク</p>
                <p className="text-2xl font-bold text-red-500">{dangerCount}人</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div 
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => setSelectedFilter(selectedFilter === "warning" ? "all" : "warning")}
        >
          <GlassCard glowColor="#f97316">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-orange-500/20">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">要注意</p>
                <p className="text-2xl font-bold text-orange-500">{warningCount}人</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div 
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => setSelectedFilter(selectedFilter === "attention" ? "all" : "attention")}
        >
          <GlassCard glowColor="#eab308">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-500/20">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">注意</p>
                <p className="text-2xl font-bold text-yellow-500">{attentionCount}人</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => setSelectedFilter(selectedFilter === "safe" ? "all" : "safe")}
        >
          <GlassCard glowColor="#22c55e">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">正常</p>
                <p className="text-2xl font-bold text-green-500">{safeCount}人</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => setSelectedFilter(selectedFilter === "anomaly" ? "all" : "anomaly")}
        >
          <GlassCard glowColor="#a855f7">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-500/20">
                <Settings className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">異常値検知</p>
                <p className="text-2xl font-bold text-purple-500">{anomalyCount}人</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Filter Info */}
      {selectedFilter !== "all" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>
            フィルター: {selectedFilter === "danger" ? "離脱リスク"
              : selectedFilter === "warning" ? "要注意"
              : selectedFilter === "attention" ? "注意"
              : selectedFilter === "anomaly" ? "異常値検知"
              : "正常"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFilter("all")}
            className="ml-2 text-xs"
          >
            すべて表示
          </Button>
        </div>
      )}

      {/* Member List */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <GlassCard glowColor="#a855f7" className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">
              {selectedFilter === "all" ? "メンバーがいません" : "該当者なし"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedFilter === "all" 
                ? "承認済みのメンバーがまだいません"
                : "このアラートレベルに該当するメンバーはいません"}
            </p>
          </GlassCard>
        ) : (
          filteredMembers.map((member) => {
            const alertColor = getAlertColor(member.alertLevel);
            
            return (
              <GlassCard
                key={member.user.uid}
                glowColor={alertColor}
                className="p-4 hover:scale-[1.01] transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Alert Indicator */}
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${alertColor}20`,
                      border: `2px solid ${alertColor}`,
                      boxShadow: `0 0 20px ${alertColor}40`,
                    }}
                  >
                    {member.alertLevel === "danger" && <AlertCircle className="w-8 h-8" style={{ color: alertColor }} />}
                    {member.alertLevel === "warning" && <AlertTriangle className="w-8 h-8" style={{ color: alertColor }} />}
                    {member.alertLevel === "attention" && <Clock className="w-8 h-8" style={{ color: alertColor }} />}
                    {member.alertLevel === "safe" && <CheckCircle2 className="w-8 h-8" style={{ color: alertColor }} />}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        {/* 比較チェックボックス */}
                        <input
                          type="checkbox"
                          checked={comparisonMembers.includes(member.user.uid)}
                          onChange={() => toggleMemberForComparison(member.user.uid)}
                          className="w-5 h-5 rounded border-2 border-purple-500 bg-transparent checked:bg-purple-500 cursor-pointer"
                          title="比較対象に追加"
                        />

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold truncate flex items-center gap-2">
                            {member.user.displayName}
                            <span
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{
                                backgroundColor: `${member.teamColor}20`,
                                color: member.teamColor,
                                border: `1px solid ${member.teamColor}40`
                              }}
                            >
                              {getTeamConfig(member.user.team)?.name}
                            </span>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {member.user.realName} ({member.user.email})
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p 
                          className="text-sm font-bold mb-1"
                          style={{ color: alertColor }}
                        >
                          {getStatusLabel(member.status)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getStatusDescription(member)}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">総報告数</p>
                        <p className="text-lg font-bold">{member.totalReports}件</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">継続日数</p>
                        <p className="text-lg font-bold">{member.currentStreak}日</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">最終報告</p>
                        <p className="text-lg font-bold">
                          {member.lastReportDaysAgo === 0 ? "今日"
                            : member.lastReportDaysAgo === 999 ? "-"
                            : `${member.lastReportDaysAgo}日前`}
                        </p>
                      </div>
                    </div>

                    {/* 異常値フラグ表示 */}
                    {member.hasAnomalies && member.anomalies && (
                      <div className="mb-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold text-purple-400">異常値検知</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-300">
                          {member.anomalies.highEnergyLowOutput && (
                            <div className="flex items-start gap-2">
                              <span>⚠️</span>
                              <span>高エナジーだが成果が低い</span>
                            </div>
                          )}
                          {member.anomalies.frequentModification && (
                            <div className="flex items-start gap-2">
                              <span>📝</span>
                              <span>報告の修正回数が異常に多い</span>
                            </div>
                          )}
                          {member.anomalies.inconsistentGrowth && (
                            <div className="flex items-start gap-2">
                              <span>📈</span>
                              <span>急激な成長（不自然な変化）</span>
                            </div>
                          )}
                          {member.anomalies.suspiciousPattern && (
                            <div className="flex items-start gap-2">
                              <span>🔍</span>
                              <span>怪しい数値パターン</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        style={{ 
                          borderColor: `${alertColor}40`,
                          color: alertColor 
                        }}
                        onClick={() => router.push(`/admin/users/${member.user.uid}`)}
                      >
                        <User className="w-4 h-4 mr-2" />
                        詳細を見る
                      </Button>
                      
                      {member.alertLevel !== "safe" && (
                        <Button
                          size="sm"
                          style={{ 
                            background: `linear-gradient(to right, ${alertColor}, ${member.teamColor})`,
                            color: "white"
                          }}
                          onClick={() => router.push(`/admin/dm`)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          DMで連絡
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={loadMemberStatuses}
          disabled={loading}
          className="bg-gradient-to-r from-pink-500 to-purple-500"
        >
          {loading ? (
            <>
              <ButtonLoader />
              更新中...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              最新状態に更新
            </>
          )}
        </Button>
      </div>

      {/* 比較ボタン（フローティング） */}
      {comparisonMembers.length === 2 && (
        <div className="fixed bottom-24 right-8 z-50 animate-in slide-in-from-bottom-4">
          <Button
            onClick={() => setShowComparison(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-2xl h-14 px-6 text-lg font-bold"
            style={{
              boxShadow: "0 10px 40px rgba(168, 85, 247, 0.5)"
            }}
          >
            <Users className="w-5 h-5 mr-2" />
            2人を比較する
          </Button>
        </div>
      )}

      {/* 一斉通知ボタン（フローティング） */}
      <div className="fixed bottom-24 left-8 z-50">
        <Button
          onClick={() => setShowBroadcast(true)}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 shadow-2xl h-14 px-6 text-lg font-bold"
          style={{
            boxShadow: "0 10px 40px rgba(6, 182, 212, 0.5)"
          }}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          一斉通知
        </Button>
      </div>

      {/* 比較モーダル */}
      {showComparison && comparisonMembers.length === 2 && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border-2 border-purple-500/30 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-purple-500/30 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                <Users className="w-6 h-6" />
                メンバー比較
              </h2>
              <button
                onClick={() => setShowComparison(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {comparisonMembers.map(userId => {
                  const member = members.find(m => m.user.uid === userId);
                  if (!member) return null;

                  const alertColor = getAlertColor(member.alertLevel);

                  return (
                    <div key={userId} className="space-y-4">
                      <div className="text-center pb-4 border-b border-white/10">
                        <h3 className="text-2xl font-bold mb-1">{member.user.displayName}</h3>
                        <p className="text-sm text-slate-400">{member.user.realName}</p>
                        <p className="text-xs text-slate-500">{getTeamConfig(member.user.team)?.name}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-xs text-slate-400 mb-2">ステータス</p>
                          <p className="text-lg font-bold" style={{ color: alertColor }}>
                            {getStatusLabel(member.status)}
                          </p>
                          <p className="text-sm text-slate-400 mt-1">
                            {getStatusDescription(member)}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-slate-400">総報告数</p>
                            <p className="text-2xl font-bold">{member.totalReports}件</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-slate-400">継続日数</p>
                            <p className="text-2xl font-bold">{member.currentStreak}日</p>
                          </div>
                        </div>

                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-1">最終報告</p>
                          <p className="text-lg font-bold">
                            {member.lastReportDaysAgo === 0 ? "今日"
                              : member.lastReportDaysAgo === 999 ? "報告なし"
                              : `${member.lastReportDaysAgo}日前`}
                          </p>
                        </div>

                        {member.hasAnomalies && member.anomalies && (
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                            <p className="text-xs text-orange-400 font-bold mb-2">異常値検知</p>
                            <div className="space-y-1 text-xs text-slate-300">
                              {member.anomalies.highEnergyLowOutput && <div>⚠️ 高エナジーだが成果が低い</div>}
                              {member.anomalies.frequentModification && <div>📝 修正回数が異常に多い</div>}
                              {member.anomalies.inconsistentGrowth && <div>📈 急激な成長</div>}
                              {member.anomalies.suspiciousPattern && <div>🔍 怪しいパターン</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 flex justify-center">
                <Button
                  onClick={() => {
                    setShowComparison(false);
                    setComparisonMembers([]);
                  }}
                  variant="outline"
                  className="border-purple-500/30 text-purple-400"
                >
                  比較を終了
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 一斉通知モーダル */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border-2 border-cyan-500/30 max-w-2xl w-full">
            <div className="sticky top-0 bg-slate-900 border-b border-cyan-500/30 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                一斉通知を送信
              </h2>
              <button
                onClick={() => setShowBroadcast(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 対象選択 */}
              <div>
                <label className="block text-sm font-bold mb-3 text-slate-300">
                  通知対象
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBroadcastTarget("danger")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      broadcastTarget === "danger"
                        ? "bg-red-500/20 border-red-500 text-red-400"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-red-500/50"
                    }`}
                  >
                    <div className="font-bold">離脱リスク</div>
                    <div className="text-xs mt-1">
                      {members.filter(m => m.alertLevel === "danger").length}人
                    </div>
                  </button>
                  <button
                    onClick={() => setBroadcastTarget("warning")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      broadcastTarget === "warning"
                        ? "bg-orange-500/20 border-orange-500 text-orange-400"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-orange-500/50"
                    }`}
                  >
                    <div className="font-bold">要注意</div>
                    <div className="text-xs mt-1">
                      {members.filter(m => m.alertLevel === "warning").length}人
                    </div>
                  </button>
                  <button
                    onClick={() => setBroadcastTarget("attention")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      broadcastTarget === "attention"
                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-yellow-500/50"
                    }`}
                  >
                    <div className="font-bold">注意</div>
                    <div className="text-xs mt-1">
                      {members.filter(m => m.alertLevel === "attention").length}人
                    </div>
                  </button>
                  <button
                    onClick={() => setBroadcastTarget("all")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      broadcastTarget === "all"
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-cyan-500/50"
                    }`}
                  >
                    <div className="font-bold">全員</div>
                    <div className="text-xs mt-1">{members.length}人</div>
                  </button>
                </div>
              </div>

              {/* メッセージ入力 */}
              <div>
                <label className="block text-sm font-bold mb-3 text-slate-300">
                  通知メッセージ
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="例: 今週の報告がまだの方は、本日中に提出をお願いします！"
                  className="w-full h-32 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-slate-500 mt-2">
                  {broadcastMessage.length} / 500文字
                </p>
              </div>

              {/* プレビュー */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <p className="text-xs text-cyan-400 font-bold mb-2">送信プレビュー</p>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">
                  {broadcastMessage || "(メッセージを入力してください)"}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  対象: {broadcastTarget === "all" ? "全メンバー" :
                    broadcastTarget === "danger" ? "離脱リスク" :
                    broadcastTarget === "warning" ? "要注意" : "注意"}
                  （{(broadcastTarget === "all" ? members : members.filter(m => m.alertLevel === broadcastTarget)).length}人）
                </p>
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBroadcast(false)}
                  variant="outline"
                  className="flex-1 border-slate-700"
                  disabled={isSending}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={sendBroadcastNotification}
                  disabled={isSending || !broadcastMessage.trim()}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600"
                >
                  {isSending ? (
                    <>
                      <ButtonLoader />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      送信する
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
