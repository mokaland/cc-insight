"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { 
  getAllUsers, 
  getUserGuardianProfile, 
  getUserRecentReports,
  detectAnomalies,
  type AnomalyFlags,
  subscribeToReports,
  type Report
} from "@/lib/firestore";
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Zap,
  ChevronRight,
  Loader2,
  Eye,
  Clock,
  Database,
  Download
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";

interface UserAuditData {
  userId: string;
  displayName: string;
  team: string;
  energy: number;
  guardianStage: number;
  recentReports: Report[];
  anomalyFlags: AnomalyFlags;
  consistencyScore: number; // 言行一致スコア（0-100）
  dataIntegrityIssues: DataIntegrityIssue[]; // 🆕 データ整合性の問題
}

interface DataIntegrityIssue {
  type: "duplicate" | "timeAnomaly" | "missingData" | "stageMismatch";
  severity: "high" | "medium" | "low";
  message: string;
}

export default function AdminAuditPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState<UserAuditData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserAuditData | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null); // 🆕 最終チェック時刻
  const [autoRefresh, setAutoRefresh] = useState(false); // 🆕 自動更新ON/OFF

  const loadAuditData = useCallback(async () => {
    try {
      setLoading(true);
      const users = await getAllUsers();
      const auditResults: UserAuditData[] = [];

      for (const u of users) {
        if (u.status !== "approved") continue;

        // 守護神プロファイル取得
        const profile = await getUserGuardianProfile(u.uid);
        if (!profile) continue;

        // 過去7日間のレポート取得
        const reports = await getUserRecentReports(u.uid, 7);

        // 守護神のstage取得（安全）
        const activeGuardian = profile.activeGuardianId 
          ? profile.guardians[profile.activeGuardianId as keyof typeof profile.guardians]
          : null;
        const guardianStage = activeGuardian?.stage || 0;

        // 異常値検知
        const anomalies = detectAnomalies(
          reports,
          profile.energy.current,
          guardianStage
        );

        // 言行一致スコア計算
        const consistencyScore = calculateConsistencyScore(
          profile.energy.current,
          guardianStage,
          reports
        );

        // 🆕 データ整合性チェック
        const integrityIssues = checkDataIntegrity(
          u.uid,
          profile.energy.current,
          guardianStage,
          reports
        );

        auditResults.push({
          userId: u.uid,
          displayName: u.displayName,
          team: u.team,
          energy: profile.energy.current,
          guardianStage,
          recentReports: reports,
          anomalyFlags: anomalies,
          consistencyScore,
          dataIntegrityIssues: integrityIssues
        });
      }

      // 異常値が多い順にソート
      auditResults.sort((a, b) => {
        const aAnomalies = Object.values(a.anomalyFlags).filter(Boolean).length;
        const bAnomalies = Object.values(b.anomalyFlags).filter(Boolean).length;
        return bAnomalies - aAnomalies;
      });

      setAuditData(auditResults);
      setLastCheckTime(new Date()); // 🆕 最終チェック時刻を更新
    } catch (error) {
      console.error("監査データ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 管理者チェックとデータ読み込み
  useEffect(() => {
    if (!user || userProfile?.role !== "admin") {
      router.push("/");
      return;
    }
    loadAuditData();
  }, [user, userProfile, router, loadAuditData]);

  // 🆕 自動更新（5分ごと）
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log("自動更新: 監査データを再読込中...");
      loadAuditData();
    }, 5 * 60 * 1000); // 5分

    return () => clearInterval(interval);
  }, [autoRefresh, loadAuditData]);

  // 🆕 データ整合性チェック
  const checkDataIntegrity = (
    userId: string,
    energy: number,
    guardianStage: number,
    reports: Report[]
  ): DataIntegrityIssue[] => {
    const issues: DataIntegrityIssue[] = [];

    // 1. 重複レポートチェック（同日に複数回報告）
    const dateMap = new Map<string, number>();
    reports.forEach(report => {
      const count = dateMap.get(report.date) || 0;
      dateMap.set(report.date, count + 1);
    });
    dateMap.forEach((count, date) => {
      if (count > 1) {
        issues.push({
          type: "duplicate",
          severity: "medium",
          message: `${date}に${count}回の重複報告`
        });
      }
    });

    // 2. 時系列異常チェック
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    reports.forEach(report => {
      const reportDate = new Date(report.date);
      if (reportDate > now) {
        issues.push({
          type: "timeAnomaly",
          severity: "high",
          message: `未来日付の報告: ${report.date}`
        });
      } else if (reportDate < oneMonthAgo) {
        issues.push({
          type: "timeAnomaly",
          severity: "low",
          message: `30日以上前の報告: ${report.date}`
        });
      }
    });

    // 3. データ欠損チェック
    reports.forEach((report, index) => {
      const hasViews = (report.igViews || 0) > 0 || (report.postCount || 0) > 0;
      const hasPosts = ((report.igPosts || 0) + (report.ytPosts || 0) + (report.tiktokPosts || 0)) > 0;
      if (!hasViews && !hasPosts) {
        issues.push({
          type: "missingData",
          severity: "medium",
          message: `${report.date}: 活動データが全てゼロ`
        });
      }
    });

    // 4. Stage/Energyミスマッチ
    const expectedEnergy = guardianStage * 100;
    if (guardianStage > 0 && Math.abs(energy - expectedEnergy) > expectedEnergy * 2) {
      issues.push({
        type: "stageMismatch",
        severity: "high",
        message: `Stage ${guardianStage}に対してエナジー ${energy}E が異常（期待値: ${expectedEnergy}E）`
      });
    }

    return issues;
  };

  // 言行一致スコア計算（0-100）
  const calculateConsistencyScore = (
    energy: number,
    guardianStage: number,
    reports: Report[]
  ): number => {
    if (reports.length === 0) return 100;

    // 期待値計算
    const expectedEnergy = guardianStage * 100; // Stage 1 = 100E, Stage 2 = 200E...
    const avgViews = reports.reduce((sum, r) => sum + (r.igViews || r.postCount || 0), 0) / reports.length;
    const expectedViews = guardianStage * 1000; // Stage 1 = 1000, Stage 2 = 2000...

    // 乖離度
    const energyGap = Math.abs(energy - expectedEnergy) / Math.max(expectedEnergy, 1);
    const viewsGap = Math.abs(avgViews - expectedViews) / Math.max(expectedViews, 1);

    // スコア（乖離が少ないほど高スコア）
    const score = 100 - Math.min((energyGap + viewsGap) * 50, 100);
    return Math.round(Math.max(0, score));
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getConsistencyLabel = (score: number) => {
    if (score >= 80) return "健全";
    if (score >= 60) return "注意";
    if (score >= 40) return "警告";
    return "要調査";
  };

  // 🆕 CSVエクスポート
  const exportAuditToCSV = () => {
    const headers = [
      'ユーザー名',
      'チーム',
      'Stage',
      'エナジー',
      '言行一致スコア',
      '評価',
      '異常値数',
      'データ整合性問題数',
      '過去7日間の報告回数'
    ];

    const rows = auditData.map(data => {
      const anomalyCount = Object.values(data.anomalyFlags).filter(Boolean).length;
      return [
        data.displayName,
        data.team,
        data.guardianStage,
        data.energy,
        data.consistencyScore,
        getConsistencyLabel(data.consistencyScore),
        anomalyCount,
        data.dataIntegrityIssues.length,
        data.recentReports.length
      ];
    });

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
    link.setAttribute('download', `監査データ_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
        <p className="text-slate-300">監査データを分析中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
            🔍 管理者監査ダッシュボード
          </h1>
          <p className="text-slate-300">全メンバーの異常値と言行一致スコアを監視</p>
          {lastCheckTime && (
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-400">
                最終チェック: {lastCheckTime.toLocaleString('ja-JP')}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* 自動更新トグル */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-purple-500 bg-transparent checked:bg-purple-500 cursor-pointer"
            />
            <span className="text-sm text-slate-300">自動更新（5分毎）</span>
          </label>

          {/* CSV出力 */}
          <Button
            onClick={exportAuditToCSV}
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </Button>

          {/* 再読込 */}
          <Button onClick={loadAuditData} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <Shield className="w-4 h-4 mr-2" />
            再読込
          </Button>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-5 gap-4">
        <GlassCard glowColor="#EF4444" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="text-sm text-slate-300">要調査</p>
          </div>
          <p className="text-3xl font-bold text-red-400">
            {auditData.filter(d => d.consistencyScore < 40).length}人
          </p>
        </GlassCard>

        <GlassCard glowColor="#F97316" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <p className="text-sm text-slate-300">警告</p>
          </div>
          <p className="text-3xl font-bold text-orange-400">
            {auditData.filter(d => d.consistencyScore >= 40 && d.consistencyScore < 60).length}人
          </p>
        </GlassCard>

        <GlassCard glowColor="#EAB308" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-6 h-6 text-yellow-400" />
            <p className="text-sm text-slate-300">注意</p>
          </div>
          <p className="text-3xl font-bold text-yellow-400">
            {auditData.filter(d => d.consistencyScore >= 60 && d.consistencyScore < 80).length}人
          </p>
        </GlassCard>

        <GlassCard glowColor="#22C55E" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-green-400" />
            <p className="text-sm text-slate-300">健全</p>
          </div>
          <p className="text-3xl font-bold text-green-400">
            {auditData.filter(d => d.consistencyScore >= 80).length}人
          </p>
        </GlassCard>

        {/* 🆕 データ整合性カード */}
        <GlassCard glowColor="#06B6D4" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-cyan-400" />
            <p className="text-sm text-slate-300">データ問題</p>
          </div>
          <p className="text-3xl font-bold text-cyan-400">
            {auditData.filter(d => d.dataIntegrityIssues.length > 0).length}人
          </p>
          <p className="text-xs text-slate-400 mt-1">
            計{auditData.reduce((sum, d) => sum + d.dataIntegrityIssues.length, 0)}件
          </p>
        </GlassCard>
      </div>

      {/* 監査リスト */}
      <GlassCard glowColor="#EC4899" className="p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          全メンバー監査結果
        </h2>

        <div className="space-y-3">
          {auditData.map((data) => {
            const anomalyCount = Object.values(data.anomalyFlags).filter(Boolean).length;
            const hasAnomalies = anomalyCount > 0;

            return (
              <div
                key={data.userId}
                onClick={() => setSelectedUser(data)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                  hasAnomalies
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* ステータスアイコン */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      hasAnomalies ? "bg-red-500/20" : "bg-green-500/20"
                    }`}>
                      {hasAnomalies ? (
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                      ) : (
                        <Shield className="w-6 h-6 text-green-400" />
                      )}
                    </div>

                    {/* ユーザー情報 */}
                    <div>
                      <p className="font-bold text-white">{data.displayName}</p>
                      <p className="text-xs text-slate-400">
                        {data.team} | Stage {data.guardianStage} | {data.energy}E
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* 言行一致スコア */}
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-1">言行一致</p>
                      <p className={`text-2xl font-bold ${getConsistencyColor(data.consistencyScore)}`}>
                        {data.consistencyScore}
                      </p>
                      <p className={`text-xs ${getConsistencyColor(data.consistencyScore)}`}>
                        {getConsistencyLabel(data.consistencyScore)}
                      </p>
                    </div>

                    {/* 異常値数 */}
                    {hasAnomalies && (
                      <div className="text-right">
                        <p className="text-xs text-slate-400 mb-1">異常値</p>
                        <p className="text-2xl font-bold text-red-400">{anomalyCount}</p>
                      </div>
                    )}

                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>

                {/* 異常フラグ表示 */}
                {hasAnomalies && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.anomalyFlags.highEnergyLowOutput && (
                      <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">
                        ⚠️ エナジー高/成果低
                      </span>
                    )}
                    {data.anomalyFlags.frequentModification && (
                      <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full">
                        ⚠️ 頻繁な修正
                      </span>
                    )}
                    {data.anomalyFlags.inconsistentGrowth && (
                      <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                        ⚠️ 不自然な成長
                      </span>
                    )}
                    {data.anomalyFlags.suspiciousPattern && (
                      <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                        ⚠️ 怪しいパターン
                      </span>
                    )}
                  </div>
                )}

                {/* 🆕 データ整合性問題表示 */}
                {data.dataIntegrityIssues.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-400">
                        データ整合性問題 ({data.dataIntegrityIssues.length}件)
                      </span>
                    </div>
                    <div className="space-y-1">
                      {data.dataIntegrityIssues.slice(0, 2).map((issue, idx) => (
                        <p key={idx} className="text-xs text-slate-300">
                          {issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟡" : "⚪️"} {issue.message}
                        </p>
                      ))}
                      {data.dataIntegrityIssues.length > 2 && (
                        <p className="text-xs text-slate-400">
                          他{data.dataIntegrityIssues.length - 2}件...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 詳細モーダル（簡易版） */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 md:pb-4 pb-[calc(var(--bottom-nav-height)+3rem)]"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="glass-premium rounded-2xl border border-white/20 p-6 max-w-2xl w-full max-h-[calc(100vh-var(--bottom-nav-height)-6rem)] md:max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              {selectedUser.displayName}の詳細
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-bg p-4 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">言行一致スコア</p>
                  <p className={`text-3xl font-bold ${getConsistencyColor(selectedUser.consistencyScore)}`}>
                    {selectedUser.consistencyScore}
                  </p>
                </div>
                <div className="glass-bg p-4 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">過去7日間の報告</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {selectedUser.recentReports.length}回
                  </p>
                </div>
              </div>

              <div className="glass-bg p-4 rounded-xl">
                <p className="text-sm font-bold text-white mb-2">異常フラグ</p>
                {Object.values(selectedUser.anomalyFlags).every(v => !v) ? (
                  <p className="text-green-400">✓ 異常なし</p>
                ) : (
                  <div className="space-y-1">
                    {selectedUser.anomalyFlags.highEnergyLowOutput && (
                      <p className="text-red-400">⚠️ エナジー高いが成果低い</p>
                    )}
                    {selectedUser.anomalyFlags.frequentModification && (
                      <p className="text-orange-400">⚠️ 修正頻度が異常</p>
                    )}
                    {selectedUser.anomalyFlags.inconsistentGrowth && (
                      <p className="text-yellow-400">⚠️ 成長が不自然</p>
                    )}
                    {selectedUser.anomalyFlags.suspiciousPattern && (
                      <p className="text-purple-400">⚠️ 怪しいパターン</p>
                    )}
                  </div>
                )}
              </div>

              {/* 🆕 データ整合性問題詳細 */}
              {selectedUser.dataIntegrityIssues.length > 0 && (
                <div className="glass-bg p-4 rounded-xl">
                  <p className="text-sm font-bold text-white mb-2">
                    データ整合性問題 ({selectedUser.dataIntegrityIssues.length}件)
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedUser.dataIntegrityIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-xs ${
                          issue.severity === "high"
                            ? "bg-red-500/10 text-red-400"
                            : issue.severity === "medium"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-slate-500/10 text-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span>
                            {issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟡" : "⚪️"}
                          </span>
                          <div>
                            <p className="font-bold mb-1">
                              {issue.type === "duplicate"
                                ? "重複報告"
                                : issue.type === "timeAnomaly"
                                ? "時系列異常"
                                : issue.type === "missingData"
                                ? "データ欠損"
                                : "Stage/Energyミスマッチ"}
                            </p>
                            <p>{issue.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setSelectedUser(null)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              >
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
