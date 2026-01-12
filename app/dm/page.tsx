"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Shield, User, Sparkles, Clock, ArrowDown } from "lucide-react";
import { DMMessage } from "@/lib/types";
import {
  subscribeToDMMessages,
  sendDMToAdmins,
  markMessagesAsRead,
} from "@/lib/services/dm";
import { motion, AnimatePresence } from "framer-motion";
import { PageLoader } from "@/components/ui/loading-spinner";

// 日付をグループ化するためのヘルパー
function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return '今日';
  if (isYesterday) return '昨日';

  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
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

export default function MemberDMPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (userProfile?.status !== "approved") {
      router.push("/pending-approval");
      return;
    }

    const unsubscribe = subscribeToDMMessages(user.uid, (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [user, userProfile, router]);

  // 既読処理
  useEffect(() => {
    if (!user?.uid) return;

    const timer = setTimeout(async () => {
      try {
        await markMessagesAsRead(user.uid);
      } catch (error) {
        console.error("既読処理エラー:", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user?.uid]);

  // スクロール監視
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
    if (!newMessage.trim() || !user || !userProfile) return;

    try {
      setSending(true);
      await sendDMToAdmins(user.uid, userProfile.displayName, newMessage);
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

  if (authLoading) {
    return <PageLoader />;
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-8">
      {/* ヘッダー */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600/90 via-violet-600/90 to-indigo-600/90 p-5 md:p-6">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                運営とのDM
              </h1>
              <p className="text-sm text-purple-100">
                質問・相談・報告なんでもOK
              </p>
            </div>
          </div>
        </div>
        <Sparkles className="absolute top-4 right-4 w-6 h-6 text-purple-200 opacity-50" />
      </div>

      {/* チャットエリア */}
      <GlassCard className="p-0 overflow-hidden">
        {/* チャットヘッダー */}
        <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-violet-500/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900"></div>
            </div>
            <div>
              <p className="font-semibold text-white">運営チーム</p>
              <p className="text-xs text-green-400">オンライン</p>
            </div>
          </div>
        </div>

        {/* メッセージエリア */}
        <div
          ref={scrollContainerRef}
          className="h-[50vh] md:h-[400px] overflow-y-auto p-4 space-y-4 relative"
          style={{ scrollBehavior: 'smooth' }}
        >
          {messages.length === 0 ? (
            // 空状態
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-purple-400 opacity-60" />
              </div>
              <p className="text-slate-300 font-medium">まだメッセージがありません</p>
              <p className="text-sm text-slate-500 mt-2">
                運営に質問や相談を送ってみましょう！<br />
                24時間以内に返信します 💬
              </p>
            </motion.div>
          ) : (
            // メッセージ一覧
            <AnimatePresence>
              {Array.from(groupedMessages.entries()).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  {/* 日付ヘッダー */}
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 rounded-full bg-slate-700/50 text-xs text-slate-400">
                      {getDateLabel(new Date(dateKey))}
                    </span>
                  </div>

                  {/* その日のメッセージ */}
                  {msgs.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-end gap-2 mb-3 ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                    >
                      {/* 運営アバター */}
                      {msg.isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex-shrink-0 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                      )}

                      {/* メッセージバブル */}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.isAdmin
                            ? 'bg-slate-700/60 text-white rounded-bl-md'
                            : 'bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-br-md'
                          }`}
                      >
                        {msg.isAdmin && (
                          <p className="text-xs text-purple-300 mb-1 font-medium">
                            運営チーム
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                        <div className={`flex items-center gap-1 mt-1.5 ${msg.isAdmin ? 'justify-start' : 'justify-end'
                          }`}>
                          <Clock className="w-3 h-3 opacity-50" />
                          <span className="text-[10px] opacity-50">
                            {msg.createdAt?.toDate?.()?.toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) || '送信中...'}
                          </span>
                        </div>
                      </div>

                      {/* ユーザーアバター */}
                      {!msg.isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex-shrink-0 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* スクロールボタン */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-20 right-4 w-10 h-10 rounded-full bg-purple-500 shadow-lg flex items-center justify-center text-white hover:bg-purple-600 transition-colors"
            >
              <ArrowDown className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* 入力エリア */}
        <div className="p-4 border-t border-white/10 bg-slate-800/50">
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
              className="flex-1 bg-slate-700/50 border-slate-600 focus:border-purple-500 placeholder:text-slate-500"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white px-4"
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
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Enterで送信 • 24時間以内に返信します
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
