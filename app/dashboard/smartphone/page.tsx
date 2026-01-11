"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { GlassCard, TodayProgress, NeonGauge } from "@/components/glass-card";
import { FileText, Heart, MessageCircle, Users, Target, Calendar, TrendingUp, Twitter, ExternalLink, ChevronDown, ChevronUp, Copy, CheckCircle } from "lucide-react";
import { getReportsByPeriod, calculateTeamStats, teams, Report } from "@/lib/firestore";

const team = teams.find((t) => t.id === "buppan")!;

const periodOptions = [
  { id: "today", label: "今日" },
  { id: "week", label: "今週" },
  { id: "month", label: "今月" },
  { id: "1q", label: "1Q" },
  { id: "2q", label: "2Q" },
  { id: "3q", label: "3Q" },
  { id: "4q", label: "4Q" },
  { id: "custom", label: "期間指定" },
];

// メンバーごとの投稿URL情報
interface MemberPostUrls {
  name: string;
  urls: { date: string; url: string }[];
}

export default function SmartphoneTeamPage() {
  const [period, setPeriod] = useState("week");
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // 投稿URL関連の状態
  const [reports, setReports] = useState<Report[]>([]);
  const [memberPostUrls, setMemberPostUrls] = useState<MemberPostUrls[]>([]);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let fetchedReports: Report[];

        if (period === "custom" && customStartDate && customEndDate) {
          const { collection: dbCollection, query, where, orderBy, getDocs } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");

          const q = query(
            dbCollection(db, "reports"),
            where("date", ">=", customStartDate),
            where("date", "<=", customEndDate),
            where("team", "==", "buppan"),
            orderBy("date", "desc")
          );

          const snapshot = await getDocs(q);
          fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
        } else if (period === "custom") {
          fetchedReports = await getReportsByPeriod("week", "buppan");
        } else {
          fetchedReports = await getReportsByPeriod(period, "buppan");
        }

        setReports(fetchedReports);
        const stats = calculateTeamStats(fetchedReports, "buppan");
        setTeamStats(stats);

        // メンバーごとの投稿URLを抽出
        const urlsByMember: { [name: string]: { date: string; url: string }[] } = {};
        fetchedReports.forEach(report => {
          if (report.postUrls && report.postUrls.length > 0) {
            if (!urlsByMember[report.name]) {
              urlsByMember[report.name] = [];
            }
            report.postUrls.forEach(url => {
              if (url.trim()) {
                urlsByMember[report.name].push({ date: report.date, url });
              }
            });
          }
        });

        const memberUrlsList: MemberPostUrls[] = Object.entries(urlsByMember)
          .map(([name, urls]) => ({ name, urls }))
          .sort((a, b) => b.urls.length - a.urls.length);

        setMemberPostUrls(memberUrlsList);
      } catch (error) {
        console.error("データ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period, customStartDate, customEndDate]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod === "custom") {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
  };

  const applyCustomPeriod = () => {
    if (customStartDate && customEndDate) {
      setPeriod("custom");
      setShowCustomDatePicker(false);
    }
  };

  // コピー完了メッセージの状態
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  // メンバー個別のURLをクリップボードにコピー
  const copyMemberUrls = async (memberName: string) => {
    const member = memberPostUrls.find(m => m.name === memberName);
    if (member) {
      const urlText = member.urls.map(({ url }) => url).join('\n');
      try {
        await navigator.clipboard.writeText(urlText);
        setCopyMessage(`${member.name}さんの${member.urls.length}件のURLをコピーしました`);
        setTimeout(() => setCopyMessage(null), 3000);
      } catch (error) {
        console.error('コピー失敗:', error);
        setCopyMessage('コピーに失敗しました');
        setTimeout(() => setCopyMessage(null), 3000);
      }
    }
  };

  // 期間全体のURLをクリップボードにコピー
  const copyAllUrls = async () => {
    const allUrls: string[] = [];
    memberPostUrls.forEach(member => {
      member.urls.forEach(({ url }) => {
        allUrls.push(url);
      });
    });
    const urlText = allUrls.join('\n');
    try {
      await navigator.clipboard.writeText(urlText);
      setCopyMessage(`全${allUrls.length}件のURLをコピーしました`);
      setTimeout(() => setCopyMessage(null), 3000);
    } catch (error) {
      console.error('コピー失敗:', error);
      setCopyMessage('コピーに失敗しました');
      setTimeout(() => setCopyMessage(null), 3000);
    }
  };

  // 全投稿URL数を計算
  const totalUrlCount = memberPostUrls.reduce((sum, m) => sum + m.urls.length, 0);

  if (loading || !teamStats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  const todayPosts = Math.floor(teamStats.totalPosts / 7);
  const todayTarget = team.dailyPostGoal * teamStats.memberCount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full animate-pulse"
              style={{ backgroundColor: team.color, boxShadow: `0 0 20px ${team.color}` }}
            />
            スマホ物販チーム
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Twitter className="h-4 w-4" />
            スマホ物販・X運用関連のコンテンツを発信
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.id}
              variant={period === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange(option.id)}
              className={
                period === option.id
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                  : "!text-[oklch(0.145_0_0)] dark:!text-[oklch(0.985_0_0)]"
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <GlassCard glowColor={team.color} className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" style={{ color: team.color }} />
              <h3 className="text-lg font-semibold">カスタム期間を指定</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">開始日</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">終了日</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={applyCustomPeriod}
                  disabled={!customStartDate || !customEndDate}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                >
                  適用
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomDatePicker(false);
                    setPeriod("week");
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
            {period === "custom" && customStartDate && customEndDate && (
              <p className="text-sm text-muted-foreground mt-2">
                📅 表示期間: {customStartDate} 〜 {customEndDate}
              </p>
            )}
          </div>
        </GlassCard>
      )}

      {/* Today's Progress */}
      <TodayProgress
        current={todayPosts}
        target={todayTarget}
        teamColor={team.color}
        teamName={team.name}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <GlassCard glowColor="#eab308" title="総投稿数" icon={<FileText className="h-5 w-5" />} value={(teamStats.totalPosts || 0).toLocaleString()} subtitle="全メンバー合計">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#eab308" title="Xフォロワー" icon={<Twitter className="h-5 w-5" />} value={(teamStats.totalXFollowers || 0).toLocaleString()} subtitle="現在の総数">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#eab308" title="いいね回り" icon={<Heart className="h-5 w-5" />} value={teamStats.members.reduce((sum: number, m: any) => sum + (m.likes || 0), 0).toLocaleString()} subtitle="エンゲージメント">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#eab308" title="リプライ回り" icon={<MessageCircle className="h-5 w-5" />} value={teamStats.members.reduce((sum: number, m: any) => sum + (m.replies || 0), 0).toLocaleString()} subtitle="交流活動">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#eab308" title="MVP達成者" icon={<Users className="h-5 w-5" />} value={`${teamStats.perfectMembers}人`} subtitle={`${teamStats.memberCount}人中`}>
          <div></div>
        </GlassCard>
      </div>

      {/* 🆕 投稿URL一括確認セクション（常に表示） */}
      <GlassCard glowColor="#3b82f6" className="p-4 md:p-6">
        {/* コピー成功メッセージ */}
        {copyMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2 text-green-300">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{copyMessage}</span>
          </div>
        )}

        {/* ヘッダー（モバイル対応：縦並び） */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold">投稿URL一括確認</h3>
            <span className="text-sm text-muted-foreground">（{totalUrlCount}件）</span>
          </div>
          {totalUrlCount > 0 && (
            <Button
              onClick={copyAllUrls}
              className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
            >
              <Copy className="h-4 w-4 mr-2" />
              全{totalUrlCount}件のURLをコピー
            </Button>
          )}
        </div>

        {totalUrlCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ExternalLink className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>この期間の投稿URLはありません</p>
            <p className="text-xs mt-1">メンバーが日報で投稿URLを報告すると表示されます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memberPostUrls.map((member) => (
              <div
                key={member.name}
                className="border border-white/10 rounded-xl overflow-hidden bg-white/5"
              >
                {/* メンバーヘッダー（モバイル対応） */}
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 cursor-pointer hover:bg-white/5 transition-colors gap-2"
                  onClick={() => setExpandedMember(expandedMember === member.name ? null : member.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold flex-shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.urls.length}件の投稿URL</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-11 md:ml-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyMemberUrls(member.name);
                      }}
                      className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10 text-xs md:text-sm"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      URLをコピー
                    </Button>
                    {expandedMember === member.name ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* URL一覧（展開時・モバイル対応） */}
                {expandedMember === member.name && (
                  <div className="border-t border-white/10 p-3 md:p-4 space-y-2 bg-black/20">
                    {member.urls.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start md:items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <span className="text-xs text-muted-foreground min-w-[70px] flex-shrink-0">
                          {item.date}
                        </span>
                        <span className="flex-1 text-sm text-blue-400 hover:text-blue-300 break-all">
                          {item.url}
                        </span>
                        <ExternalLink className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Achievement Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard glowColor="#eab308" className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">目標達成率</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            目標: 1日{team.dailyPostGoal}投稿 × 7日 = 週{team.dailyPostGoal * 7}投稿/人
          </p>

          <div className="flex flex-col items-center">
            <CircularProgress
              value={Math.min(teamStats.achievementRate, 100)}
              color="#eab308"
              size={180}
              strokeWidth={15}
            />
            <p className="mt-4 text-muted-foreground">
              {teamStats.totalPosts} / {teamStats.totalTargetPosts} 件達成
            </p>
            <div className="w-full mt-6">
              <NeonGauge value={teamStats.totalPosts} max={teamStats.totalTargetPosts} label="チーム達成進捗" color="#eab308" />
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="#eab308" className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">チーム概要</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5 border border-yellow-500/20">
              <p className="text-sm text-muted-foreground">アクティブメンバー</p>
              <p className="text-2xl font-bold text-yellow-500">{teamStats.memberCount}人</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-yellow-500/20">
              <p className="text-sm text-muted-foreground">達成率</p>
              <p className="text-2xl font-bold text-yellow-500">{teamStats.achievementRate}%</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-yellow-500/20">
              <p className="text-sm text-muted-foreground">100%達成者</p>
              <p className="text-2xl font-bold text-yellow-500">{teamStats.perfectMembers}人</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Additional Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glowColor="#f59e0b" title="総活動数" icon={<TrendingUp className="h-5 w-5" />} value={teamStats.members.reduce((sum: number, m: any) => sum + (m.likes || 0) + (m.replies || 0), 0).toLocaleString()} subtitle="いいね+リプライ合計"><div></div></GlassCard>
        <GlassCard glowColor="#eab308" title="報告回数" icon={<FileText className="h-5 w-5" />} value={teamStats.members.reduce((sum: number, m: any) => sum + (m.reports || 0), 0).toLocaleString()} subtitle="総レポート数"><div></div></GlassCard>
        <GlassCard glowColor="#f59e0b" title="平均達成率" icon={<Target className="h-5 w-5" />} value={`${teamStats.achievementRate}%`} subtitle="チーム平均"><div></div></GlassCard>
      </div>

      {/* Member Rankings */}
      <GlassCard glowColor="#eab308">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-yellow-500" />
          メンバー別パフォーマンス
        </h3>
        {teamStats.members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>まだレポートが送信されていません</p>
            <p className="text-sm mt-2">メンバーが日次レポートを送信すると、ここに表示されます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamStats.members.map((member: any, index: number) => {
              const memberUrls = memberPostUrls.find(m => m.name === member.name);
              return (
                <div key={member.name} className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${member.achievementRate >= 100 ? "border-yellow-500 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.3)]" : "border-white/10 bg-white/5"}`}>
                  <div className="flex items-center gap-4">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${index === 0 ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.6)]" : index < 3 ? "bg-yellow-400/50 text-white" : "bg-white/10"}`}>{index + 1}</span>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {member.name}
                        {member.achievementRate >= 100 && <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white">MVP</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">達成率: {member.achievementRate}% ({member.reports}回報告)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    {/* 投稿URLコピーボタン */}
                    {memberUrls && memberUrls.urls.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyMemberUrls(member.name)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                        title={`${memberUrls.urls.length}件のURLをコピー`}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {memberUrls.urls.length}件
                      </Button>
                    )}
                    <div className="text-right"><p className="text-muted-foreground">Xフォロワー</p><p className="font-bold">{(member.xFollowers || 0).toLocaleString()}</p></div>
                    <div className="text-right"><p className="text-muted-foreground">投稿数</p><p className="font-bold">{(member.posts || 0).toLocaleString()}</p></div>
                    <div className="text-right"><p className="text-muted-foreground">いいね</p><p className="font-bold">{(member.likes || 0).toLocaleString()}</p></div>
                    <div className="text-right"><p className="text-muted-foreground">リプライ</p><p className="font-bold">{(member.replies || 0).toLocaleString()}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
