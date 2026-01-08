"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAllUsers, updateUserStatus, updateUserRole, teams, User } from "@/lib/firestore";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Check, 
  X, 
  Ban, 
  Shield, 
  Mail,
  Calendar,
  Filter,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AdminUsersPage() {
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ユーザー一覧を取得
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error("ユーザー取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...users];

    // 検索フィルタ
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // ステータスフィルタ
    if (statusFilter !== "all") {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    // チームフィルタ
    if (teamFilter !== "all") {
      filtered = filtered.filter(u => u.team === teamFilter);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, statusFilter, teamFilter, users]);

  // ユーザー承認
  const handleApprove = async (userId: string) => {
    if (!user) return;
    
    try {
      setActionLoading(userId);
      await updateUserStatus(userId, "approved", user.uid);
      await loadUsers();
    } catch (error) {
      console.error("承認エラー:", error);
      alert("承認に失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

  // ユーザー停止
  const handleSuspend = async (userId: string) => {
    if (!user) return;
    if (!confirm("このユーザーを停止しますか？")) return;
    
    try {
      setActionLoading(userId);
      await updateUserStatus(userId, "suspended", user.uid);
      await loadUsers();
    } catch (error) {
      console.error("停止エラー:", error);
      alert("停止に失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

  // ユーザー拒否
  const handleReject = async (userId: string) => {
    if (!user) return;
    if (!confirm("このユーザーを拒否しますか？")) return;
    
    try {
      setActionLoading(userId);
      await updateUserStatus(userId, "suspended", user.uid);
      await loadUsers();
    } catch (error) {
      console.error("拒否エラー:", error);
      alert("拒否に失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

  // 統計
  const pendingCount = users.filter(u => u.status === "pending").length;
  const approvedCount = users.filter(u => u.status === "approved").length;
  const suspendedCount = users.filter(u => u.status === "suspended").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-muted-foreground">ユーザー情報を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-[calc(var(--bottom-nav-height)+1rem)] md:pb-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 bg-clip-text text-transparent">
          ユーザー管理
        </h1>
        <p className="text-muted-foreground mt-2">
          メンバーの承認・管理
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard glowColor="#6b7280" title="総ユーザー数" icon={<Users className="h-5 w-5" />} value={users.length.toString()} subtitle="登録済み">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#eab308" title="承認待ち" icon={<Calendar className="h-5 w-5" />} value={pendingCount.toString()} subtitle="要対応">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#22c55e" title="承認済み" icon={<Check className="h-5 w-5" />} value={approvedCount.toString()} subtitle="アクティブ">
          <div></div>
        </GlassCard>
        <GlassCard glowColor="#ef4444" title="停止中" icon={<Ban className="h-5 w-5" />} value={suspendedCount.toString()} subtitle="無効">
          <div></div>
        </GlassCard>
      </div>

      {/* 検索・フィルタ */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            検索・フィルタ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="名前・メールで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>

          {/* フィルタボタン */}
          <div className="flex flex-wrap gap-2 relative z-10">
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                setStatusFilter("all");
              }}
              className={cn(
                "relative z-10",
                statusFilter === "all" && "bg-gradient-to-r from-purple-500 to-indigo-500"
              )}
              style={{ touchAction: "manipulation" }}
            >
              全て
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                setStatusFilter("pending");
              }}
              className={cn(
                "relative z-10",
                statusFilter === "pending" && "bg-gradient-to-r from-yellow-500 to-orange-500"
              )}
              style={{ touchAction: "manipulation" }}
            >
              承認待ち
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "approved" ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                setStatusFilter("approved");
              }}
              className={cn(
                "relative z-10",
                statusFilter === "approved" && "bg-gradient-to-r from-green-500 to-emerald-500"
              )}
              style={{ touchAction: "manipulation" }}
            >
              承認済み
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "suspended" ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                setStatusFilter("suspended");
              }}
              className={cn(
                "relative z-10",
                statusFilter === "suspended" && "bg-gradient-to-r from-red-500 to-pink-500"
              )}
              style={{ touchAction: "manipulation" }}
            >
              停止中
            </Button>
          </div>

          {/* チームフィルタ */}
          <div className="flex flex-wrap gap-2 relative z-10">
            <span className="text-sm text-muted-foreground self-center">チーム:</span>
            <Button
              size="sm"
              variant={teamFilter === "all" ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                setTeamFilter("all");
              }}
              className="relative z-10"
              style={{ touchAction: "manipulation" }}
            >
              全チーム
            </Button>
            {teams.map((team) => (
              <Button
                key={team.id}
                size="sm"
                variant={teamFilter === team.id ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  setTeamFilter(team.id);
                }}
                className="relative z-10"
                style={{
                  backgroundColor: teamFilter === team.id ? team.color : undefined,
                  touchAction: "manipulation",
                }}
              >
                {team.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ユーザーリスト */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle>ユーザー一覧 ({filteredUsers.length}名)</CardTitle>
          <CardDescription>クリックして詳細を表示</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>該当するユーザーが見つかりません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const team = teams.find(t => t.id === u.team);
                const isActionLoading = actionLoading === u.uid;

                return (
                  <div
                    key={u.uid}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => window.location.href = `/admin/users/${u.uid}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* ユーザー情報 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {u.realName || u.displayName}
                            {u.realName && (
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({u.displayName})
                              </span>
                            )}
                          </h3>
                          {u.role === "admin" && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              管理者
                            </span>
                          )}
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: 
                                u.status === "approved" ? "#22c55e20" :
                                u.status === "pending" ? "#eab30820" :
                                "#ef444420",
                              color: 
                                u.status === "approved" ? "#22c55e" :
                                u.status === "pending" ? "#eab308" :
                                "#ef4444",
                            }}
                          >
                            {u.status === "approved" ? "承認済み" :
                             u.status === "pending" ? "承認待ち" :
                             "停止中"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {u.email}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${team?.color}20`,
                              color: team?.color,
                            }}
                          >
                            {team?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {u.createdAt?.toDate?.()?.toLocaleDateString("ja-JP") || "不明"}
                          </span>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex gap-2">
                        {u.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(u.uid)}
                              disabled={isActionLoading}
                              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  承認
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReject(u.uid)}
                              disabled={isActionLoading}
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4 mr-1" />
                              拒否
                            </Button>
                          </>
                        )}
                        {u.status === "approved" && u.role !== "admin" && (
                          <Button
                            size="sm"
                            onClick={() => handleSuspend(u.uid)}
                            disabled={isActionLoading}
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Ban className="w-4 h-4 mr-1" />
                                停止
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
