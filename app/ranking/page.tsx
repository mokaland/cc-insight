"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, Eye, Users, TrendingUp, Heart, MessageCircle, Instagram, 
  Youtube, Loader2, Crown, Medal, Award, ChevronRight, Zap
} from "lucide-react";
import { subscribeToReports, calculateTeamStats, teams, Report, getUserGuardianProfile } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import { GUARDIANS, ATTRIBUTES, getGuardianImagePath, GuardianId, EVOLUTION_STAGES } from "@/lib/guardian-collection";
import { MemberDetailModal } from "@/components/member-detail-modal";

const getMedalIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-slate-400" />;
    case 3:
      return <Award className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="text-lg font-bold text-slate-400">#{rank}</span>;
  }
};

export default function AllTeamsRankingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardianProfiles, setGuardianProfiles] = useState<{ [userId: string]: any }>({});
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
      if (reports.length === 0 && !error) {
        setError("データの読み込みに時間がかかっています。");
      }
    }, 5000);

    try {
      const unsubscribe = subscribeToReports(async (data) => {
        setReports(data);
        
        // 各レポートのuserIdから守護神データを取得
        const profiles: { [userId: string]: any } = {};
        const uniqueUserIds = Array.from(new Set(data.map(r => r.userId).filter(Boolean)));
        
        await Promise.all(
          uniqueUserIds.map(async (userId) => {
            if (userId) {
              try {
                const profile = await getUserGuardianProfile(userId);
                if (profile) {
                  profiles[userId] = profile;
                }
              } catch (error) {
                console.error(`Failed to fetch guardian for user ${userId}:`, error);
              }
            }
          })
        );
        
        setGuardianProfiles(profiles);
        setLoading(false);
        setError(null);
        clearTimeout(timeout);
      });

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (err: any) {
      console.error("ランキングデータ取得エラー:", err);
      setError("データの取得に失敗しました。");
      setLoading(false);
      clearTimeout(timeout);
    }
  }, []);

  if (!authLoading && !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Trophy className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-100 mb-2">ログインが必要です</h2>
        <p className="text-slate-300 mb-6">ランキングを表示するにはログインしてください</p>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-slate-300">ランキングを読み込み中...</p>
      </div>
    );
  }

  // チームごとの統計を計算
  const teamStats = teams.map(team => {
    const stats = calculateTeamStats(reports, team.id);
    return {
      ...team,
      stats
    };
  });

  return (
    <div className="space-y-12 pb-12">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
          🏆 全チームランキング
        </h1>
        <p className="text-slate-300">タップで詳細を表示</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-600 text-center">
          {error}
        </div>
      )}

      {/* チームごとのランキング */}
      {teamStats.map((teamData) => {
        const { id, name, color, type, stats } = teamData;
        const isShorts = type === "shorts";
        
        // メンバーをソート（Shorts: 再生数、X: 活動量）
        const sortedMembers = [...stats.members].sort((a: any, b: any) => {
          if (isShorts) {
            return b.views - a.views;
          } else {
            // X系: いいね + リプライの合計
            const aActivity = (a.likes || 0) + (a.replies || 0);
            const bActivity = (b.likes || 0) + (b.replies || 0);
            return bActivity - aActivity;
          }
        });

        // チームサマリー計算
        const totalMembers = sortedMembers.length;
        const avgViews = totalMembers > 0 ? Math.round(stats.totalViews / totalMembers) : 0;
        const avgPosts = totalMembers > 0 ? Math.round(stats.totalPosts / totalMembers) : 0;
        const avgActivity = isShorts 
          ? totalMembers > 0 ? Math.round(stats.totalInteractions / totalMembers) : 0
          : totalMembers > 0 ? Math.round((stats.totalLikes + stats.totalReplies) / totalMembers) : 0;

        return (
          <section key={id} className="space-y-6">
            {/* チームヘッダー */}
            <div 
              className="rounded-2xl p-6 border-2"
              style={{
                backgroundColor: `${color}10`,
                borderColor: `${color}40`,
                boxShadow: `0 0 40px ${color}20`
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full animate-pulse"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                  />
                  <h2 className="text-2xl font-bold" style={{ color }}>
                    {name}
                  </h2>
                </div>
                <div className="text-sm text-slate-300">
                  {totalMembers}人のメンバー
                </div>
              </div>

              {/* チームサマリー */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isShorts ? (
                  <>
                    {/* Shorts系KPI */}
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">総再生数</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalViews.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">平均: {avgViews.toLocaleString()}</p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">プロフアクセス</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalProfileAccess.toLocaleString()}
                      </p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">インタラクション</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalInteractions.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">平均: {avgActivity.toLocaleString()}</p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Instagram className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">総フォロワー</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {(stats.totalIgFollowers + stats.totalYtFollowers + stats.totalTiktokFollowers).toLocaleString()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* X系KPI */}
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">いいね回り</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalLikes.toLocaleString()}
                      </p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">リプライ回り</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalReplies.toLocaleString()}
                      </p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">総活動量</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {(stats.totalLikes + stats.totalReplies).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">平均: {avgActivity.toLocaleString()}</p>
                    </div>
                    <div className="glass-bg rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4" style={{ color }} />
                        <p className="text-xs text-slate-300">総投稿数</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {stats.totalPosts}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">平均: {avgPosts}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* メンバーランキング */}
            {sortedMembers.length === 0 ? (
              <div className="glass-premium rounded-2xl p-12 text-center border border-white/20">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-slate-300">まだレポートが送信されていません</p>
              </div>
            ) : (
              <div className="glass-premium rounded-2xl border border-white/20 shadow-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5" style={{ color }} />
                    メンバーランキング
                  </h3>
                  <div className="space-y-3">
                    {/* 🎨 テスト用ダミーデータ（5段階演出確認用） */}
                    {[
                      { 
                        name: '最強さん👑', 
                        views: 500000, 
                        posts: 50, 
                        energy: 3570,
                        stage: 'top10', 
                        guardianStage: 4, 
                        guardianColor: '#FFD700',
                        interactions: 50000,
                        profileAccess: 5000,
                        reports: 30,
                        achievementRate: 150
                      },
                      { 
                        name: '上位さん✨', 
                        views: 100000, 
                        posts: 30, 
                        energy: 326,
                        stage: 'top30', 
                        guardianStage: 3, 
                        guardianColor: '#EC4899',
                        interactions: 10000,
                        profileAccess: 1000,
                        reports: 20,
                        achievementRate: 120
                      },
                      { 
                        name: '中堅さん', 
                        views: 50000, 
                        posts: 20, 
                        energy: 60,
                        stage: 'middle', 
                        guardianStage: 2, 
                        guardianColor: '#22D3EE',
                        interactions: 5000,
                        profileAccess: 500,
                        reports: 15,
                        achievementRate: 100
                      },
                      { 
                        name: '低迷さん😰', 
                        views: 10000, 
                        posts: 10, 
                        energy: 10,
                        stage: 'bottom30', 
                        guardianStage: 1, 
                        guardianColor: '#94a3b8',
                        interactions: 1000,
                        profileAccess: 100,
                        reports: 8,
                        achievementRate: 60
                      },
                      { 
                        name: '呪われたさん💤', 
                        views: 1000, 
                        posts: 2, 
                        energy: 5,
                        stage: 'bottom10', 
                        guardianStage: 0, 
                        guardianColor: '#64748b', 
                        cursed: true,
                        interactions: 100,
                        profileAccess: 10,
                        reports: 2,
                        achievementRate: 20
                      },
                    ].map((dummyMember, dummyIndex) => {
                      const rank = dummyIndex + 1;
                      const isTop3 = rank <= 3;
                      
                      return (
                        <div
                          key={`dummy-${dummyIndex}`}
                          onClick={() => {
                            setSelectedMember({
                              ...dummyMember,
                              guardianData: {
                                color: dummyMember.guardianColor,
                                stageName: `Stage ${dummyMember.guardianStage}`,
                                name: "テスト守護神",
                                emoji: dummyMember.cursed ? '😴' : '⚔️',
                                imagePath: '/images/guardians/hoshimaru/stage0.png'
                              }
                            });
                            setSelectedTeam({ name, color, isShorts });
                          }}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer ranking-${dummyMember.stage} hover:-translate-y-1 hover:shadow-xl ${
                            isTop3
                              ? "border-2"
                              : "border border-slate-700"
                          }`}
                          style={
                            isTop3
                              ? {
                                  borderColor: `${color}40`,
                                  backgroundColor: `${color}05`,
                                  boxShadow: `0 0 20px ${color}20`,
                                }
                              : undefined
                          }
                        >
                          {/* ランク */}
                          <div className="w-10 flex-shrink-0 flex justify-center">
                            {getMedalIcon(rank)}
                          </div>

                          {/* 守護神アバター - 新構造 */}
                          <div className={`guardian-avatar ranking-${dummyMember.stage}`}>
                            <div className="guardian-avatar-inner">
                              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                                {dummyMember.cursed ? '😴' : dummyMember.guardianStage === 4 ? '👑' : dummyMember.guardianStage === 3 ? '⚔️' : dummyMember.guardianStage === 2 ? '🛡️' : dummyMember.guardianStage === 1 ? '🌱' : '🥚'}
                              </div>
                            </div>
                            {/* 💤オーバーレイ */}
                            {dummyMember.stage === 'bottom10' && (
                              <div className="sleep-overlay">💤</div>
                            )}
                          </div>

                          {/* メンバー情報 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-bold truncate ${dummyMember.cursed ? 'text-slate-500' : 'text-slate-100'}`}>
                                {dummyMember.name}
                              </p>
                              {rank === 1 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
                                  👑 1st
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span style={{ color: dummyMember.guardianColor }} className="font-medium">
                                {dummyMember.cursed ? '呪い状態' : `Stage ${dummyMember.guardianStage}`}
                              </span>
                              <span>•</span>
                              <span>テスト用</span>
                            </div>
                          </div>

                          {/* エナジー表示（メインKPI） */}
                          <div className="text-right">
                            <p className="text-xs text-slate-400 mb-0.5">エナジー</p>
                            <p className="text-xl font-bold" style={{ color }}>
                              {dummyMember.energy}E
                            </p>
                          </div>

                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      );
                    })}

                    {/* 実際のメンバーデータ */}
                    {sortedMembers.map((member: any, index: number) => {
                      const rank = index + 1;
                      const isTop3 = rank <= 3;
                      
                      // ユーザーIDからレポートを逆引き
                      const memberReport = reports.find(r => r.name === member.name && r.team === id);
                      const userId = memberReport?.userId;
                      
                      // 守護神データ取得
                      let guardianData: any = null;
                      
                      if (userId && guardianProfiles[userId]) {
                        const profile = guardianProfiles[userId];
                        const guardianId = profile.activeGuardianId;
                        
                        if (guardianId && profile.guardians[guardianId]) {
                          const guardian = GUARDIANS[guardianId as GuardianId];
                          const instance = profile.guardians[guardianId];
                          const attr = ATTRIBUTES[guardian.attribute];
                          const stageInfo = EVOLUTION_STAGES[instance.stage];
                          
                          guardianData = {
                            guardianId,
                            stage: instance.stage,
                            imagePath: getGuardianImagePath(guardianId as GuardianId, instance.stage),
                            color: attr.color,
                            name: guardian.name,
                            stageName: stageInfo.name,
                            emoji: attr.emoji
                          };
                        }
                      }
                      
                      // フォールバック（守護神未選択）
                      const fallbackGuardian = {
                        emoji: "🥚",
                        name: "未召喚",
                        color: "#94a3b8"
                      };

                      // エナジー計算（仮）
                      const energy = Math.floor(member.views / 100 + member.posts * 2);

                      return (
                        <div
                          key={member.name}
                          onClick={() => {
                            setSelectedMember({
                              ...member,
                              energy,
                              guardianData
                            });
                            setSelectedTeam({ name, color, isShorts });
                          }}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
                            isTop3
                              ? "border-2"
                              : "border border-slate-700"
                          }`}
                          style={
                            isTop3
                              ? {
                                  borderColor: `${color}40`,
                                  backgroundColor: `${color}05`,
                                  boxShadow: `0 0 20px ${color}20`,
                                }
                              : undefined
                          }
                        >
                          {/* ランク */}
                          <div className="w-10 flex-shrink-0 flex justify-center">
                            {getMedalIcon(rank)}
                          </div>

                          {/* 守護神アバター - 新構造 */}
                          {guardianData ? (
                            <div className="guardian-avatar">
                              <div 
                                className="absolute inset-0 rounded-full animate-pulse"
                                style={{
                                  border: `2px solid ${guardianData.color}`,
                                  boxShadow: `0 0 15px ${guardianData.color}80`,
                                }}
                              />
                              <div 
                                className="absolute inset-1 rounded-full opacity-20"
                                style={{
                                  background: `radial-gradient(circle, ${guardianData.color} 0%, transparent 70%)`
                                }}
                              />
                              <div className="guardian-avatar-inner">
                                <img
                                  src={guardianData.imagePath}
                                  alt={guardianData.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden absolute inset-0 flex items-center justify-center text-2xl">
                                  {guardianData.emoji}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                              style={{
                                backgroundColor: `${fallbackGuardian.color}20`,
                                boxShadow: `0 0 15px ${fallbackGuardian.color}`,
                                border: `2px solid ${fallbackGuardian.color}`,
                              }}
                            >
                              {fallbackGuardian.emoji}
                            </div>
                          )}

                          {/* メンバー情報 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-100 truncate">
                                {member.name}
                              </p>
                              {rank === 1 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
                                  👑 1st
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span style={{ color: guardianData ? guardianData.color : fallbackGuardian.color }} className="font-medium">
                                {guardianData ? guardianData.stageName : fallbackGuardian.name}
                              </span>
                              <span>•</span>
                              <span>{member.reports}回報告</span>
                            </div>
                          </div>

                          {/* エナジー表示（メインKPI） */}
                          <div className="text-right">
                            <p className="text-xs text-slate-400 mb-0.5">エナジー</p>
                            <p className="text-xl font-bold" style={{ color }}>
                              {energy}E
                            </p>
                          </div>

                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* 詳細モーダル */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        teamColor={selectedTeam?.color || '#EC4899'}
        teamName={selectedTeam?.name || ''}
        isShorts={selectedTeam?.isShorts || true}
      />
    </div>
  );
}
