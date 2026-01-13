"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Users, User, ArrowDown } from "lucide-react";
import {
  subscribeToAdminDMWithUser,
  sendAdminDMToUser,
  markMessagesFromUserAsRead,
} from "@/lib/services/dm";
import { getAllUsers } from "@/lib/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { DMMessage } from "@/lib/types";

interface UserInfo {
  uid: string;
  realName: string;
  displayName: string;
  team: string;
  teamName: string;
  teamColor: string;
}

// 日付ラベル（LINE風: 1/11(日)）
function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return '今日';
  if (isYesterday) return '昨日';

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = dayNames[date.getDay()];

  return `${month}/${day}(${dayOfWeek})`;
}

// メッセージを日付でグループ化
function groupMessagesByDate(messages: DMMessage[]): Map<string, DMMessage[]> {
  const groups = new Map<string, DMMessage[]>();

  messages.forEach(msg => {
    const date = msg.createdAt?.toDate?.() || new Date();
    const dateKey = date.toDateString();

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(msg);
  });

  return groups;
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    const unsubscribe = subscribeToAdminDMWithUser(
      user.uid,
      selectedUser.uid,
      (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      }
    );

    const markAsRead = async () => {
      try {
        await markMessagesFromUserAsRead(selectedUser.uid);
      } catch (error) {
        console.error("既読処理エラー:", error);
      }
    };
    const timer = setTimeout(markAsRead, 500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [selectedUser, user]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 5);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

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
      inputRef.current?.focus();
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

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4">
      {/* 左サイドバー: メンバーリスト */}
      <div className="w-80 flex-shrink-0 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            メンバー一覧
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{users.length}人のメンバー</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>承認済みメンバーがいません</p>
            </div>
          ) : (
            <div className="space-y-px">
              {users.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-l-4 ${selectedUser?.uid === u.uid
                      ? 'bg-white/10 border-l-purple-500'
                      : 'border-l-transparent'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{u.realName}（{u.displayName}）</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: `${u.teamColor}20`,
                        color: u.teamColor
                      }}
                    >
                      {u.teamName.replace('チーム', '')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右側: チャットエリア */}
      <div
        className="flex-1 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #7ec8e3 0%, #a8d8ea 50%, #c8e6f0 100%)',
        }}
      >
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-slate-600">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>左のリストからメンバーを選択してください</p>
            </div>
          </div>
        ) : (
          <>
            {/* チャットヘッダー */}
            <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-slate-200">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: selectedUser.teamColor }}
              >
                {selectedUser.displayName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">
                  {selectedUser.realName}（{selectedUser.displayName}）
                </p>
                <p className="text-xs" style={{ color: selectedUser.teamColor }}>
                  {selectedUser.teamName}
                </p>
              </div>
            </header>

            {/* メッセージエリア */}
            <main
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-3 py-4 relative"
            >
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-slate-600 text-sm">
                    まだメッセージがありません
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    最初のメッセージを送信してみましょう！
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {Array.from(groupedMessages.entries()).map(([dateKey, msgs]) => (
                    <div key={dateKey}>
                      {/* 日付ヘッダー */}
                      <div className="flex justify-center my-4">
                        <span className="px-4 py-1.5 rounded-full bg-slate-500/40 text-xs text-white font-medium shadow-sm">
                          {getDateLabel(new Date(dateKey))}
                        </span>
                      </div>

                      {msgs.map((msg, idx) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`flex items-end gap-2 mb-2 ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* メンバーアバター（左側） */}
                          {!msg.isAdmin && (
                            <div
                              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md"
                              style={{ backgroundColor: selectedUser.teamColor }}
                            >
                              {selectedUser.displayName.charAt(0)}
                            </div>
                          )}

                          {/* メッセージバブル + 時刻 */}
                          <div className={`flex items-end gap-1.5 max-w-[70%] ${msg.isAdmin ? 'flex-row-reverse' : ''}`}>
                            <div
                              className={`rounded-2xl px-3 py-2 shadow-sm ${msg.isAdmin
                                  ? 'bg-[#5ac463] text-white rounded-tr-md'
                                  : 'bg-white text-slate-800 rounded-tl-md'
                                }`}
                            >
                              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                            </div>

                            <div className={`flex flex-col text-[10px] text-slate-600 flex-shrink-0 ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                              {msg.isAdmin && msg.read && (
                                <span>既読</span>
                              )}
                              <span>
                                {msg.createdAt?.toDate?.()?.toLocaleTimeString('ja-JP', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) || '...'}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </main>

            {/* スクロールボタン */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-24 right-8 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-slate-600 hover:bg-white transition-colors z-10"
                >
                  <ArrowDown className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* 入力エリア */}
            <footer className="flex-shrink-0 bg-slate-100 border-t border-slate-300 px-3 py-2 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
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
                className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                size="icon"
                className="w-10 h-10 rounded-full bg-[#5ac463] hover:bg-[#4db356] text-white disabled:opacity-50 flex-shrink-0"
              >
                {sending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
