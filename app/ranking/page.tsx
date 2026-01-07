"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Eye, MessageCircle, Loader2, Crown, Medal, Award } from "lucide-react";
import { subscribeToReports, calculateRankings, Report } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { getTeamType, getGuardianStage, type TeamType } from "@/lib/guardian-system";

const rankingTypes = [
  { id: "views", label: "再生数", icon: Eye },
  { id: "posts", label: "投稿数", icon: MessageCircle },
  { id: "activity", label: "活動量", icon: Trophy },
] as const;

const getMedalIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-8 h-8 text-yellow-500" />;
    case 2:
      return <Medal className="w-8 h-8 text-slate-400" />;
    case 3:
      return <Award className="w-8 h-8 text-amber-600" />;
    default:
      return <span className="text-2xl font-bold text-slate-400">#{rank}</span>;
  }
};

const getRankStyle = (rank: number, teamColor: string) => {
  switch (rank) {
    case 1:
      return {
        bg: "bg-white",
        border: "border-yellow-400/30",
        shadow: `0 0 30px ${teamColor}40, 0 4px 20px rgba(0,0,0,0.1)`,
        textColor: "text-slate-900",
        scale: "md:scale-105",
      };
    case 2:
      return {
        bg: "bg-white",
        border: "border-slate-300/30",
        shadow: `0 0 25px ${teamColor}30, 0 4px 16px rgba(0,0,0,0.08)`,
        textColor: "text-slate-900",
        scale: "md:scale-100",
      };
    case 3:
      return {
        bg: "bg-white",
        border: "border-amber-600/30",
        shadow: `0 0 20px ${teamColor}25, 0 4px 12px rgba(0,0,0,0.06)`,
        textColor: "text-slate-900",
        scale: "md:scale-100",
      };
    default:
      return {
        bg: "bg-white",
        border: "border-slate-200",
        shadow: "0 2px 8px rgba(0,0,0,0.04)",
        textColor: "text-slate-900",
        scale: "md:scale-100",
      };
  }
};

export default function RankingPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rankingType, setRankingType] = useState<"views" | "posts" | "activity">("views");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 最大5秒でローディング終了
    const timeout = setTimeout(() => {
      setLoading(false);
      setInitialLoadDone(true);
      if (reports.length === 0 && !error) {
        setError("データの読み込みに時間がかかっています。Firestoreインデックスが構築中の可能性があります。");
      }
    }, 5000);

    try {
      const unsubscribe = subscribeToReports((data) => {
        setReports(data);
        setLoading(false);
        setInitialLoadDone(true);
        setError(null);
        clearTimeout(timeout);
      });

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (err: any) {
      console.error("ランキングデータ取得エラー:", err);
      setError("データの取得に失敗しました。Firestoreインデックスを作成してください。");
      setLoading(false);
      setInitialLoadDone(true);
      clearTimeout(timeout);
    }
  }, []);

  // チーム別フィルタリング：ログインユーザーと同じチームのメンバーのみ表示
  const filteredReports = userProfile?.team 
    ? reports.filter(report => report.team === userProfile.team)
    : reports;

  const rankings = calculateRankings(filteredReports, rankingType);

  // 未ログインの場合
  if (!authLoading && !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Trophy className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">ログインが必要です</h2>
        <p className="text-slate-600 mb-6">ランキングを表示するにはログインしてください</p>
        <Button
          onClick={() => router.push("/login")}
          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
        >
          ログインページへ
        </Button>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-slate-600">ランキングを読み込み中...</p>
      </div>
    );
  }

  // チームカラー取得
  const teamColor = userProfile?.team === "fukugyou" ? "#ec4899" 
    : userProfile?.team === "taishoku" ? "#06b6d4"
    : userProfile?.team === "buppan" ? "#eab308"
    : "#a855f7";

  const teamName = userProfile?.team === "fukugyou" ? "副業チーム"
    : userProfile?.team === "taishoku" ? "退職サポートチーム"
    : userProfile?.team === "buppan" ? "スマホ物販チーム"
    : "全チーム";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ 
              color: teamColor,
              filter: `drop-shadow(0 0 20px ${teamColor}40)`
            }}
          >
            🏆 {teamName} ランキング
          </h1>
          <p className="text-slate-600">
            チーム内のトップパフォーマー
          </p>
        </div>
        <div className="flex gap-2">
          {rankingTypes.map((type) => {
            const Icon = type.icon;
            const isActive = rankingType === type.id;
            return (
              <Button
                key={type.id}
                variant="outline"
                size="sm"
                onClick={() => setRankingType(type.id)}
                className={
                  isActive
                    ? "border-2 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }
                style={isActive ? {
                  backgroundColor: teamColor,
                  borderColor: teamColor,
                  boxShadow: `0 0 20px ${teamColor}40`
                } : undefined}
              >
                <Icon className="w-4 h-4 mr-2" />
                {type.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {rankings.length === 0 && initialLoadDone && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-lg">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">まだランキングデータがありません</h3>
          <p className="text-slate-600 mb-6">
            メンバーが報告を送信すると、ここにランキングが表示されます。
          </p>
          <Button
            className="text-white"
            style={{ 
              background: `linear-gradient(to right, ${teamColor}, #a855f7)`,
              boxShadow: `0 0 20px ${teamColor}40`
            }}
            onClick={() => router.push("/report")}
          >
            報告フォームへ
          </Button>
        </div>
      )}

      {/* Top 3 */}
      {rankings.length >= 1 && (
        <div className="grid gap-6 md:grid-cols-3">
          {rankings.slice(0, 3).map((member: any, index: number) => {
            const rank = index + 1;
            const style = getRankStyle(rank, teamColor);
            
            // ガーディアンStage計算
            const teamType = getTeamType(member.team);
            const totalValue = rankingType === "views" ? member.views : member.views;
            const guardianStage = getGuardianStage(totalValue, teamType);
            
            return (
              <div
                key={`${member.team}-${member.name}`}
                className={`${style.bg} rounded-2xl border-2 ${style.border} p-6 transition-all duration-300 hover:-translate-y-1 ${style.scale}`}
                style={{ boxShadow: style.shadow }}
              >
                {/* Medal Icon */}
                <div className="flex items-center justify-center mb-4">
                  {getMedalIcon(rank)}
                </div>

                {/* Guardian Avatar */}
                <div className="flex justify-center mb-4">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-5xl relative"
                    style={{
                      backgroundColor: `${guardianStage.color}20`,
                      boxShadow: `0 0 30px ${guardianStage.glowColor}, inset 0 0 15px ${guardianStage.glowColor}`,
                      border: `3px solid ${guardianStage.color}`,
                    }}
                  >
                    {guardianStage.emoji}
                    {guardianStage.stage === 5 && (
                      <span className="absolute -top-2 -right-2 text-2xl animate-pulse">👑</span>
                    )}
                  </div>
                </div>

                {/* Guardian Stage */}
                <div className="text-center mb-4">
                  <p className="text-xs text-slate-500 mb-1">Stage {guardianStage.stage}</p>
                  <p className="text-sm font-bold" style={{ color: guardianStage.color }}>
                    {guardianStage.japaneseName}
                  </p>
                </div>

                {/* Member Info */}
                <div className="text-center">
                  <h3 className={`text-2xl font-bold ${style.textColor} mb-1`}>
                    {member.name}
                  </h3>
                  <div
                    className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white mb-4"
                    style={{ 
                      backgroundColor: teamColor,
                      boxShadow: `0 0 15px ${teamColor}50`
                    }}
                  >
                    {member.teamName}
                  </div>
                  <p 
                    className="text-5xl font-black"
                    style={{ 
                      color: teamColor,
                      filter: `drop-shadow(0 0 15px ${teamColor}40)`
                    }}
                  >
                    {rankingType === "views" && member.views.toLocaleString()}
                    {rankingType === "posts" && member.posts}
                    {rankingType === "activity" && member.activity.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {rankingType === "views" && "再生"}
                    {rankingType === "posts" && "投稿"}
                    {rankingType === "activity" && "ポイント"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of Rankings */}
      {rankings.length > 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">4位以下</h2>
          <div className="space-y-3">
            {rankings.slice(3).map((member: any, index: number) => {
              const rank = index + 4;
              
              // ガーディアンStage計算
              const teamType = getTeamType(member.team);
              const totalValue = rankingType === "views" ? member.views : member.views;
              const guardianStage = getGuardianStage(totalValue, teamType);
              
              return (
                <div
                  key={`${member.team}-${member.name}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all duration-200 border border-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-slate-400 w-8">
                      #{rank}
                    </span>
                    
                    {/* Guardian Avatar (Small) */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl relative flex-shrink-0"
                      style={{
                        backgroundColor: `${guardianStage.color}20`,
                        boxShadow: `0 0 15px ${guardianStage.glowColor}`,
                        border: `2px solid ${guardianStage.color}`,
                      }}
                    >
                      {guardianStage.emoji}
                      {guardianStage.stage === 5 && (
                        <span className="absolute -top-1 -right-1 text-sm">👑</span>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        {guardianStage.stage === 5 && (
                          <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-500 text-xs font-bold">
                            LEGEND
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{member.teamName}</span>
                        <span>•</span>
                        <span style={{ color: guardianStage.color }} className="font-medium">
                          {guardianStage.japaneseName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p 
                      className="text-2xl font-bold"
                      style={{ color: teamColor }}
                    >
                      {rankingType === "views" && member.views.toLocaleString()}
                      {rankingType === "posts" && member.posts}
                      {rankingType === "activity" && member.activity.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500 font-medium">
                      {rankingType === "views" && "再生"}
                      {rankingType === "posts" && "投稿"}
                      {rankingType === "activity" && "ポイント"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
