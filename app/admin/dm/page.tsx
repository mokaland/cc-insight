"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Clock, User, Users } from "lucide-react";
import {
  subscribeToAdminDMWithUser,
  sendAdminDMToUser,
  markMessagesFromUserAsRead,
} from "@/lib/services/dm";
import { getAllUsers } from "@/lib/firestore";

import { DMMessage } from "@/lib/types";

interface UserInfo {
  uid: string;
  realName: string;
  displayName: string;
  team: string;
  teamName: string;
  teamColor: string;
}

export default function AdminDMPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const teams = [
    { id: "fukugyou", name: "副業チーム", color: "#ec4899" },
    { id: "taishoku", name: "退職サポートチーム", color: "#06b6d4" },
    { id: "buppan", name: "スマホ物販チーム", color: "#eab308" },
  ];

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      const memberUsers = allUsers
        .filter(u => u.status === "approved" && u.role === "member")
        .map(u => {
          const team = teams.find(t => t.id === u.team);
          return {
            uid: u.uid,
            realName: u.realName,
            displayName: u.displayName,
            team: u.team,
            teamName: team?.name || u.team,
            teamColor: team?.color || "#ec4899",
          };
        });
      setUsers(memberUsers);
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

  useEffect(() => {
    if (!selectedUser || !user) return;

    // サービス層を使用してメッセージを監視
    const unsubscribe = subscribeToAdminDMWithUser(
      user.uid,
      selectedUser.uid,
      (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      }
    );

    // 🆕 ユーザーからのメッセージを既読にする
    const markAsRead = async () => {
      try {
        await markMessagesFromUserAsRead(selectedUser.uid);
      } catch (error) {
        console.error("既読処理エラー:", error);
      }
    };
    // 少し遅延して既読処理（UIが落ち着いてから）
    const timer = setTimeout(markAsRead, 500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [selectedUser, user]);

  async function sendMessage() {
    if (!newMessage.trim() || !selectedUser || !user || !userProfile) return;

    try {
      setSending(true);
      await sendAdminDMToUser(
        user.uid,
        userProfile.displayName,
        selectedUser.uid,
        selectedUser.displayName,
        newMessage
      );
      setNewMessage("");
    } catch (error) {
      console.error("メッセージ送信エラー:", error);
      alert("メッセージの送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-purple-500" />
          DMチャット
        </h1>
        <p className="text-muted-foreground mt-2">
          メンバーと直接やり取りできます
        </p>
      </div>

      {/* レイアウト：左にユーザーリスト、右にチャット */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ユーザーリスト */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              メンバー一覧
            </CardTitle>
            <CardDescription>{users.length}人のメンバー</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>承認済みメンバーがいません</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {users.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-l-4 ${selectedUser?.uid === u.uid
                        ? 'bg-muted border-l-purple-500'
                        : 'border-l-transparent'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold">{u.realName}（{u.displayName}）</p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${u.teamColor}20`,
                            color: u.teamColor
                          }}
                        >
                          {u.teamName}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* チャットエリア */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 w-5" />
              {selectedUser ? `${selectedUser.displayName}さんとのDM` : 'チャット'}
            </CardTitle>
            {selectedUser && (
              <CardDescription>
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: `${selectedUser.teamColor}20`,
                    color: selectedUser.teamColor
                  }}
                >
                  {selectedUser.teamName}
                </span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>左のリストからメンバーを選択してください</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* メッセージエリア */}
                <div className="h-[400px] overflow-y-auto p-4 bg-muted/20 rounded-lg space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>まだメッセージがありません</p>
                      <p className="text-sm mt-2">最初のメッセージを送信してみましょう！</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${msg.isAdmin
                            ? 'bg-purple-500 text-white'
                            : 'bg-card border border-border'
                            }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-xs mt-1 ${msg.isAdmin ? 'text-purple-100' : 'text-muted-foreground'
                            }`}>
                            {msg.createdAt?.toDate?.()?.toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) || '送信中...'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 入力エリア */}
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="メッセージを入力..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
