"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Send, ArrowDown } from "lucide-react";
import { DMMessage } from "@/lib/types";
import {
  subscribeToDMMessages,
  sendDMToAdmins,
  markMessagesAsRead,
} from "@/lib/services/dm";
import { motion, AnimatePresence } from "framer-motion";
import { PageLoader } from "@/components/ui/loading-spinner";
import Image from "next/image";

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
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-180px)]">
      {/* メッセージエリア - LINE風の背景 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-4 relative"
        style={{
          background: 'linear-gradient(180deg, #7ec8e3 0%, #a8d8ea 50%, #c8e6f0 100%)',
          scrollBehavior: 'smooth'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-600/70 text-sm">
              運営に質問や相談を送ってみましょう！
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {Array.from(groupedMessages.entries()).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                {/* 日付ヘッダー（LINE風） */}
                <div className="flex justify-center my-4">
                  <span className="px-4 py-1.5 rounded-full bg-slate-500/30 text-xs text-white font-medium shadow-sm">
                    {getDateLabel(new Date(dateKey))}
                  </span>
                </div>

                {msgs.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`flex items-end gap-2 mb-2 ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                  >
                    {/* 運営アバター（左側のみ） */}
                    {msg.isAdmin && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex-shrink-0 flex items-center justify-center shadow-md">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                    )}

                    {/* メッセージバブル + 時刻 */}
                    <div className={`flex items-end gap-1.5 max-w-[75%] ${!msg.isAdmin ? 'flex-row-reverse' : ''}`}>
                      {/* バブル */}
                      <div
                        className={`rounded-2xl px-3 py-2 shadow-sm ${msg.isAdmin
                            ? 'bg-white text-slate-800 rounded-tl-md'
                            : 'bg-[#5ac463] text-white rounded-tr-md'
                          }`}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                      </div>

                      {/* 時刻・既読 */}
                      <div className={`flex flex-col text-[10px] text-slate-500/80 flex-shrink-0 ${!msg.isAdmin ? 'items-end' : 'items-start'}`}>
                        {!msg.isAdmin && (
                          <span className="text-slate-500/70">既読</span>
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
        <div ref={messagesEndRef} />

        {/* スクロールボタン */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="fixed bottom-24 right-4 w-10 h-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center text-slate-600 hover:bg-white transition-colors z-10"
            >
              <ArrowDown className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 入力エリア（LINE風） */}
      <div className="bg-slate-100 border-t border-slate-200 px-2 py-2 flex items-center gap-2">
        <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-700">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Aa"
          disabled={sending}
          className="flex-1 bg-white border-slate-300 rounded-full px-4 py-2 text-[15px] focus:border-slate-400 focus:ring-0"
        />
        <Button
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          size="icon"
          className="w-10 h-10 rounded-full bg-[#5ac463] hover:bg-[#4db356] text-white disabled:opacity-50"
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
    </div>
  );
}
