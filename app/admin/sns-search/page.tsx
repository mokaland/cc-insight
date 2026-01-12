"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { getAllUsers, teams, User } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search,
    Users,
    ExternalLink,
    Loader2,
    X,
    Smartphone,
} from "lucide-react";
import { SnsAccounts, SnsAccountApproval, SNS_LABELS } from "@/lib/types";

interface UserWithSns extends User {
    snsAccounts?: SnsAccounts;
}

export default function AdminSnsSearchPage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserWithSns[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeam, setSelectedTeam] = useState<string>("all");
    const [selectedUser, setSelectedUser] = useState<UserWithSns | null>(null);

    // ユーザー一覧を取得
    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const allUsers = await getAllUsers();
            // 承認済みメンバーのみ
            const approvedMembers = allUsers.filter(
                (u) => u.status === "approved" && u.role === "member"
            );
            setUsers(approvedMembers);
        } catch (error) {
            console.error("ユーザー取得エラー:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user || userProfile?.role !== "admin") {
            router.push("/admin/login");
            return;
        }
        loadUsers();
    }, [user, userProfile, router, loadUsers]);

    // フィルタリング（チーム + 検索クエリ）
    const filteredUsers = useMemo(() => {
        let filtered = [...users];

        // チームフィルタ
        if (selectedTeam !== "all") {
            filtered = filtered.filter((u) => u.team === selectedTeam);
        }

        // 検索フィルタ（ニックネーム + 本名 + ふりがな であいまい検索）
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(
                (u) =>
                    u.displayName.toLowerCase().includes(query) ||
                    u.realName.toLowerCase().includes(query) ||
                    (u.furigana && u.furigana.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [users, selectedTeam, searchQuery]);

    // SNSポップオーバーの内容
    const renderSnsPopover = (user: UserWithSns) => {
        const snsAccounts = user.snsAccounts;
        const snsKeys = ["instagram", "youtube", "tiktok", "x"] as const;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-slate-900 border border-white/20 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white">
                                {user.realName}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {user.displayName}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* SNSリスト */}
                    <div className="space-y-3">
                        {snsKeys.map((key) => {
                            const snsData = snsAccounts?.[key] as SnsAccountApproval | undefined;
                            const label = SNS_LABELS[key];
                            const hasAccount = snsData?.url && snsData?.status === "approved";

                            return (
                                <div
                                    key={key}
                                    className={`flex items-center justify-between p-3 rounded-xl border ${hasAccount
                                        ? "bg-white/5 border-white/20"
                                        : "bg-slate-800/50 border-slate-700/50 opacity-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{label.icon}</span>
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {label.label}
                                            </p>
                                            {hasAccount ? (
                                                <p className="text-xs text-slate-400 truncate max-w-[180px]">
                                                    {snsData.url}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500">未登録</p>
                                            )}
                                        </div>
                                    </div>
                                    {hasAccount && (
                                        <a
                                            href={snsData.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-80 transition-opacity"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* 閉じるボタン */}
                    <Button
                        onClick={() => setSelectedUser(null)}
                        className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white"
                    >
                        閉じる
                    </Button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* ヘッダー */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3">
                    <Smartphone className="w-8 h-8 text-pink-500" />
                    SNSアカウント検索
                </h1>
                <p className="text-muted-foreground mt-2">
                    メンバーのSNSアカウントをワンクリックで確認
                </p>
            </div>

            {/* 検索・フィルタ */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">検索</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* チーム選択 */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant={selectedTeam === "all" ? "default" : "outline"}
                            onClick={() => setSelectedTeam("all")}
                            className={
                                selectedTeam === "all"
                                    ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                                    : ""
                            }
                        >
                            全チーム
                        </Button>
                        {teams.map((team) => (
                            <Button
                                key={team.id}
                                size="sm"
                                variant={selectedTeam === team.id ? "default" : "outline"}
                                onClick={() => setSelectedTeam(team.id)}
                                style={{
                                    backgroundColor:
                                        selectedTeam === team.id ? team.color : undefined,
                                }}
                            >
                                {team.name}
                            </Button>
                        ))}
                    </div>

                    {/* 名前検索 */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="名前で検索（ニックネーム・本名）..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white/5 border-white/10 text-lg h-12"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 検索結果 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        検索結果 ({filteredUsers.length}名)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>該当するメンバーが見つかりません</p>
                            {searchQuery && (
                                <p className="text-sm mt-2">
                                    検索条件を変更してみてください
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map((u) => {
                                const team = teams.find((t) => t.id === u.team);
                                const snsAccounts = u.snsAccounts;
                                const hasSns = snsAccounts && Object.keys(snsAccounts).some(
                                    (key) => {
                                        const data = snsAccounts[key as keyof SnsAccounts];
                                        return data && typeof data === 'object' && 'status' in data && data.status === 'approved';
                                    }
                                );

                                return (
                                    <div
                                        key={u.uid}
                                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                    >
                                        {/* ユーザー情報 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-semibold text-white truncate">
                                                    {u.realName}
                                                </h3>
                                                <span className="text-sm text-slate-400 truncate">
                                                    ({u.displayName})
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="px-2 py-0.5 rounded text-xs"
                                                    style={{
                                                        backgroundColor: `${team?.color}20`,
                                                        color: team?.color,
                                                    }}
                                                >
                                                    {team?.name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* SNSボタン */}
                                        <Button
                                            size="sm"
                                            onClick={() => setSelectedUser(u)}
                                            className={`flex items-center gap-2 ${hasSns
                                                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                                                : "bg-slate-700 text-slate-400"
                                                }`}
                                        >
                                            <Smartphone className="w-4 h-4" />
                                            SNS
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SNSポップオーバー */}
            {selectedUser && renderSnsPopover(selectedUser)}
        </div>
    );
}
