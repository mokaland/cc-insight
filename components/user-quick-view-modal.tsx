"use client";

import { useState, useEffect } from "react";
import { getUserById, getUserReports, getUserGuardianProfile, getUserSnsAccounts, teams, User } from "@/lib/services/user";
import { Report } from "@/lib/types";
import { SnsAccounts, SnsAccountApproval } from "@/lib/guardian-collection";
import { Button } from "@/components/ui/button";
import {
    X,
    TrendingUp,
    Eye,
    FileText,
    Zap,
    MessageCircle,
    Instagram,
    ExternalLink,
    Flame,
    Mail,
    Star,
    Award,
    Crown,
} from "lucide-react";
import { ButtonLoader } from "@/components/ui/loading-spinner";
import { GUARDIANS, ATTRIBUTES, getGuardianImagePath, GuardianId, EVOLUTION_STAGES } from "@/lib/guardian-collection";
import { useRouter } from "next/navigation";
import { calculateLevel, BADGES, UserBadge, getBadgeRarityColor } from "@/lib/gamification";
import { getUserBadges } from "@/lib/firestore";

interface UserQuickViewModalProps {
    userId: string;
    userName: string;
    onClose: () => void;
}

interface QuickViewData {
    user: User | null;
    reports: Report[];
    guardianData: {
        name: string;
        stageName: string;
        stage: number;
        color: string;
        emoji: string;
        imagePath: string | null;
        energy: number;
    } | null;
    snsAccounts: SnsAccounts | null;
    badges: UserBadge[];
    level: { level: number; name: string; icon: string; color: string } | null;
}

export function UserQuickViewModal({ userId, userName, onClose }: UserQuickViewModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<QuickViewData>({
        user: null,
        reports: [],
        guardianData: null,
        snsAccounts: null,
        badges: [],
        level: null,
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                // 並列でデータ取得
                const [userData, reportsData] = await Promise.all([
                    getUserById(userId),
                    getUserReports(userId),
                ]);

                let guardianData = null;
                let snsData = null;

                // 守護神データ取得
                try {
                    const guardianProfile = await getUserGuardianProfile(userId);
                    if (guardianProfile?.activeGuardianId) {
                        const activeId = guardianProfile.activeGuardianId as GuardianId;
                        const instance = guardianProfile.guardians[activeId];
                        if (instance) {
                            const guardian = GUARDIANS[activeId];
                            const attr = ATTRIBUTES[guardian.attribute];
                            const stageInfo = EVOLUTION_STAGES[instance.stage];
                            guardianData = {
                                name: guardian.name,
                                stageName: stageInfo.name,
                                stage: instance.stage,
                                color: attr.color,
                                emoji: attr.emoji,
                                imagePath: getGuardianImagePath(activeId, instance.stage),
                                energy: instance.investedEnergy || 0,
                            };
                        }
                    }
                } catch (e) {
                    console.error("守護神取得エラー:", e);
                }

                // SNSアカウント取得
                try {
                    snsData = await getUserSnsAccounts(userId);
                } catch (e) {
                    console.error("SNS取得エラー:", e);
                }

                // バッジ取得
                let badges: UserBadge[] = [];
                try {
                    badges = await getUserBadges(userId);
                } catch (e) {
                    console.error("バッジ取得エラー:", e);
                }

                // レベル計算（総活動量から）
                const totalActivity = reportsData.reduce((sum, r) =>
                    sum + (r.likeCount || 0) + (r.replyCount || 0) + (r.igViews || 0), 0
                );
                const levelInfo = calculateLevel(totalActivity);

                setData({
                    user: userData as User | null,
                    reports: reportsData,
                    guardianData,
                    snsAccounts: snsData,
                    badges,
                    level: levelInfo,
                });
            } catch (error) {
                console.error("データ取得エラー:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userId]);

    // 過去7日間の報告数計算
    const reportsLast7Days = data.reports.filter(r => {
        const date = r.createdAt?.toDate?.() || new Date(r.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return date >= sevenDaysAgo;
    }).length;

    // チーム判定
    const team = data.user ? teams.find(t => t.id === data.user!.team) : null;
    const isXTeam = team?.type === "x";

    // 総活動量（X系の場合）または総再生数
    const totalActivity = isXTeam
        ? data.reports.reduce((sum, r) => sum + (r.likeCount || 0) + (r.replyCount || 0), 0)
        : data.reports.reduce((sum, r) => sum + (r.igViews || 0), 0);

    // エナジー（守護神プロファイルから取得、フォールバックは0）
    const energy = data.guardianData ? 0 : 0; // TODO: エナジー取得ロジックを追加

    // SNS承認状態
    const getSnsStatus = (snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x') => {
        const snsData = data.snsAccounts?.[snsKey] as SnsAccountApproval | undefined;
        if (!snsData?.url) return { status: 'none', hasUrl: false };
        return { status: snsData.status, hasUrl: true, url: snsData.url };
    };

    const igStatus = getSnsStatus('instagram');
    const ytStatus = getSnsStatus('youtube');
    const ttStatus = getSnsStatus('tiktok');
    const xStatus = getSnsStatus('x');

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={onClose}
        >
            {/* 背景オーバーレイ */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* モーダルコンテンツ */}
            <div
                className="relative bg-slate-900 rounded-2xl border border-purple-500/30 max-w-lg w-full mx-4 overflow-hidden shadow-2xl"
                style={{ boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.25)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ヘッダー */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">{userName} の詳細</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* コンテンツ */}
                {loading ? (
                    <div className="p-8 flex flex-col items-center justify-center">
                        <ButtonLoader />
                        <p className="mt-3 text-sm text-muted-foreground">読み込み中...</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {/* メインKPI 2x2 */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* 守護神 + ステージ */}
                            <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                                {data.guardianData?.imagePath ? (
                                    <img
                                        src={data.guardianData.imagePath}
                                        alt={data.guardianData.name}
                                        className="w-12 h-12 rounded-full object-cover border-2"
                                        style={{ borderColor: data.guardianData.color }}
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl">
                                        {data.guardianData?.emoji || "🥚"}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold" style={{ color: data.guardianData?.color || "#94a3b8" }}>
                                            {data.guardianData?.name || "未召喚"}
                                        </p>
                                        {data.guardianData && (
                                            <span
                                                className="text-xs px-1.5 py-0.5 rounded font-medium"
                                                style={{
                                                    backgroundColor: `${data.guardianData.color}30`,
                                                    color: data.guardianData.color
                                                }}
                                            >
                                                S{data.guardianData.stage}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {data.guardianData?.stageName || "守護神"} • {data.guardianData?.energy || 0}E
                                    </p>
                                </div>
                            </div>

                            {/* 活動量/再生数 */}
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    {isXTeam ? (
                                        <Zap className="w-4 h-4 text-yellow-500" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-pink-500" />
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {isXTeam ? "総活動量" : "累計再生数"}
                                    </p>
                                </div>
                                <p className={`text-xl font-bold ${isXTeam ? "text-yellow-400" : "text-pink-400"}`}>
                                    {totalActivity.toLocaleString()}
                                </p>
                            </div>

                            {/* 過去7日間報告 */}
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-cyan-500" />
                                    <p className="text-xs text-muted-foreground">過去7日間の報告</p>
                                </div>
                                <p className="text-xl font-bold text-cyan-400">{reportsLast7Days}回</p>
                            </div>

                            {/* 総報告数 */}
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                    <p className="text-xs text-muted-foreground">総報告数</p>
                                </div>
                                <p className="text-xl font-bold text-green-400">{data.reports.length}件</p>
                            </div>
                        </div>

                        {/* SNS状態 */}
                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-2">SNS登録状態</p>
                            <div className="flex gap-2 flex-wrap">
                                {/* Instagram */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${igStatus.status === 'approved' ? 'bg-green-500/20 text-green-300'
                                    : igStatus.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300'
                                        : igStatus.hasUrl ? 'bg-red-500/20 text-red-300'
                                            : 'bg-slate-700 text-slate-500'
                                    }`}>
                                    <Instagram className="w-3 h-3" />
                                    <span className="font-medium">IG</span>
                                    <span>{igStatus.status === 'approved' ? '✓' : igStatus.status === 'pending' ? '...' : igStatus.hasUrl ? '✗' : '-'}</span>
                                </div>
                                {/* YouTube */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${ytStatus.status === 'approved' ? 'bg-green-500/20 text-green-300'
                                    : ytStatus.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300'
                                        : ytStatus.hasUrl ? 'bg-red-500/20 text-red-300'
                                            : 'bg-slate-700 text-slate-500'
                                    }`}>
                                    <span className="text-xs font-bold">YT</span>
                                    <span>{ytStatus.status === 'approved' ? '✓' : ytStatus.status === 'pending' ? '...' : ytStatus.hasUrl ? '✗' : '-'}</span>
                                </div>
                                {/* TikTok */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${ttStatus.status === 'approved' ? 'bg-green-500/20 text-green-300'
                                    : ttStatus.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300'
                                        : ttStatus.hasUrl ? 'bg-red-500/20 text-red-300'
                                            : 'bg-slate-700 text-slate-500'
                                    }`}>
                                    <span className="text-xs font-bold">TT</span>
                                    <span>{ttStatus.status === 'approved' ? '✓' : ttStatus.status === 'pending' ? '...' : ttStatus.hasUrl ? '✗' : '-'}</span>
                                </div>
                                {/* X */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${xStatus.status === 'approved' ? 'bg-green-500/20 text-green-300'
                                    : xStatus.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300'
                                        : xStatus.hasUrl ? 'bg-red-500/20 text-red-300'
                                            : 'bg-slate-700 text-slate-500'
                                    }`}>
                                    <span className="font-bold">𝕏</span>
                                    <span>{xStatus.status === 'approved' ? '✓' : xStatus.status === 'pending' ? '...' : xStatus.hasUrl ? '✗' : '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* レベル + バッジ */}
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    <p className="text-xs text-muted-foreground">レベル</p>
                                </div>
                                {data.level && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-lg">{data.level.icon}</span>
                                        <span className="font-bold" style={{ color: data.level.color }}>
                                            Lv.{data.level.level} {data.level.name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 獲得バッジ */}
                            <div className="flex items-center gap-2 mt-3">
                                <Award className="w-4 h-4 text-purple-400" />
                                <p className="text-xs text-muted-foreground">獲得バッジ</p>
                            </div>
                            {data.badges.length > 0 ? (
                                <div className="flex gap-1.5 flex-wrap mt-2">
                                    {data.badges.map((userBadge) => {
                                        const badge = BADGES.find(b => b.id === userBadge.badgeId);
                                        if (!badge) return null;
                                        return (
                                            <div
                                                key={userBadge.badgeId}
                                                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                                                style={{
                                                    backgroundColor: `${getBadgeRarityColor(badge.rarity)}20`,
                                                    color: getBadgeRarityColor(badge.rarity)
                                                }}
                                                title={badge.description}
                                            >
                                                <span>{badge.icon}</span>
                                                <span className="font-medium">{badge.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 mt-2">まだバッジを獲得していません</p>
                            )}
                        </div>

                        {/* アクションボタン */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                                onClick={() => {
                                    onClose();
                                    router.push(`/admin/users/${userId}`);
                                }}
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                詳細ページへ
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
                                onClick={() => {
                                    onClose();
                                    router.push(`/admin/dm`);
                                }}
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                DMを送る
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
