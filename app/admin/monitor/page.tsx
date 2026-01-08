"use client";

/**
 * CC Insight v2: The Sovereign Command
 * Active Monitor - 離脱防止監視パネル
 * 
 * 【目的】
 * 菅原副社長が管理画面を開いた瞬間、
 * 「今、誰を助けるべきか」が一目で分かる状態にする
 */

import { useState, useEffect } from "react";
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
  Settings
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

  useEffect(() => {
    if (user) {
      loadMemberStatuses();
    }
  }, [user, period, customStartDate, customEndDate]);

  const loadMemberStatuses = async () => {
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
  };

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
    </div>
  );
}
