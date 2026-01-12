"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Shield } from "lucide-react";
import { DMMessage } from "@/lib/types";
import {
  subscribeToDMMessages,
  sendDMToAdmins,
  markMessagesAsRead,
} from "@/lib/services/dm";

export default function MemberDMPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (userProfile?.status !== "approved") {
      router.push("/pending-approval");
      return;
    }

    console.log('💬 [DM Page] メッセージリスナー開始:', user.uid);

    // サービス層を使用してメッセージを監視
    const unsubscribe = subscribeToDMMessages(user.uid, (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    return () => {
      console.log('💬 [DM Page] メッセージリスナー停止');
      unsubscribe();
    };
  }, [user, userProfile, router]);

  // ページを開いたときに未読メッセージを既読にする
  useEffect(() => {
    if (!user?.uid) return;

    const timer = setTimeout(async () => {
      try {
        console.log('📖 [DM Read] 既読処理開始:', user.uid);
        const count = await markMessagesAsRead(user.uid);
        if (count > 0) {
          console.log(`✅ [DM Read] ${count}件のメッセージを既読にしました`);
        } else {
          console.log('✅ [DM Read] 未読メッセージなし');
        }
      } catch (error) {
        console.error("❌ [DM Read] 既読処理エラー:", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user?.uid]);

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

  return (
    <div className="space-y-6 pb-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-purple-500" />
          運営とのDM
        </h1>
        <p className="text-muted-foreground mt-2">
          運営に直接メッセージを送れます
        </p>
      </div>

      {/* チャットエリア */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            運営チャット
          </CardTitle>
          <CardDescription>
            質問や相談があればお気軽にどうぞ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* メッセージエリア */}
            <div className="h-[400px] overflow-y-auto p-4 bg-muted/20 rounded-lg space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>まだメッセージがありません</p>
                  <p className="text-sm mt-2">運営に質問や相談を送ってみましょう！</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${msg.isAdmin
                          ? 'bg-card border border-border'
                          : 'bg-purple-500 text-white'
                        }`}
                    >
                      {msg.isAdmin && (
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          運営
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.isAdmin ? 'text-muted-foreground' : 'text-purple-100'
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
        </CardContent>
      </Card>
    </div>
  );
}
