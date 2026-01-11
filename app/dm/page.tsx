"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Shield } from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  getDocs,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import { DMMessage } from "@/lib/types";

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

    // 🔧 修正: toUserId と fromUserId の両方でクエリを実行
    // participants array-contains はセキュリティルールと不一致のため使用しない

    // 自分宛てのメッセージ
    const q1 = query(
      collection(db, "dm_messages"),
      where("toUserId", "==", user.uid),
      orderBy("createdAt", "asc")
    );

    // 自分からのメッセージ
    const q2 = query(
      collection(db, "dm_messages"),
      where("fromUserId", "==", user.uid),
      orderBy("createdAt", "asc")
    );

    let messages1: DMMessage[] = [];
    let messages2: DMMessage[] = [];

    const updateMessages = () => {
      // 両方の結果を統合して重複を除去
      const allMessagesMap = new Map<string, DMMessage>();
      [...messages1, ...messages2].forEach(msg => {
        allMessagesMap.set(msg.id, msg);
      });

      // createdAtでソート
      const sortedMessages = Array.from(allMessagesMap.values()).sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      setMessages(sortedMessages);
      scrollToBottom();
    };

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      messages1 = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as DMMessage));
      console.log(`💬 [DM Page] 受信メッセージ: ${messages1.length}件`);
      updateMessages();
    }, (error) => {
      console.error('❌ [DM Page] 受信メッセージリスナーエラー:', error);
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      messages2 = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as DMMessage));
      console.log(`💬 [DM Page] 送信メッセージ: ${messages2.length}件`);
      updateMessages();
    }, (error) => {
      console.error('❌ [DM Page] 送信メッセージリスナーエラー:', error);
    });

    return () => {
      console.log('💬 [DM Page] メッセージリスナー停止');
      unsubscribe1();
      unsubscribe2();
    };
  }, [user, userProfile, router]);

  // 🆕 ページを開いたときに未読メッセージを既読にする
  useEffect(() => {
    if (!user?.uid) return;

    const markMessagesAsRead = async () => {
      try {
        console.log('📖 [DM Read] 既読処理開始:', user.uid);

        // 自分宛ての未読メッセージを取得
        const q = query(
          collection(db, "dm_messages"),
          where("toUserId", "==", user.uid),
          where("read", "==", false)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log('✅ [DM Read] 未読メッセージなし');
          return;
        }

        console.log(`📝 [DM Read] ${snapshot.size}件の未読メッセージを既読処理中...`);

        // バッチ処理で一括更新
        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => {
          batch.update(doc(db, "dm_messages", document.id), {
            read: true,
            readAt: serverTimestamp()
          });
        });

        await batch.commit();
        console.log(`✅ [DM Read] ${snapshot.size}件のメッセージを既読にしました`);
      } catch (error) {
        console.error("❌ [DM Read] 既読処理エラー:", error);
      }
    };

    // 少し遅延させて実行（メッセージ読み込み完了後）
    const timer = setTimeout(() => {
      markMessagesAsRead();
    }, 1000); // 1秒に短縮

    return () => clearTimeout(timer);
  }, [user?.uid]);  // 🔧 修正: user?.uid のみに依存（messagesを削除）

  async function sendMessage() {
    if (!newMessage.trim() || !user || !userProfile) return;

    try {
      setSending(true);

      // 🔧 全管理者のUIDを取得
      const usersSnapshot = await getDocs(collection(db, "users"));
      const adminUsers = usersSnapshot.docs
        .filter(doc => doc.data().role === "admin")
        .map(doc => doc.id);

      if (adminUsers.length === 0) {
        alert("管理者が見つかりません");
        return;
      }

      // 最初の管理者をメイン送信先とし、全管理者をparticipantsに含める
      const mainAdminId = adminUsers[0];
      const allParticipants = [user.uid, ...adminUsers];

      await addDoc(collection(db, "dm_messages"), {
        fromUserId: user.uid,
        fromUserName: userProfile.displayName,
        toUserId: mainAdminId,
        toUserName: "運営",
        message: newMessage.trim(),
        isAdmin: false,
        read: false, // 🆕 未読フラグ
        participants: allParticipants, // 全管理者が見えるように
        createdAt: serverTimestamp(),
      });
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
            運営とのチャット
          </CardTitle>
          <CardDescription>
            質問や相談などお気軽にお送りください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* メッセージエリア */}
            <div className="h-[500px] overflow-y-auto p-4 bg-muted/20 rounded-lg space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>まだメッセージがありません</p>
                  <p className="text-sm mt-2">運営にメッセージを送信してみましょう！</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.fromUserId === user?.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${msg.fromUserId === user?.uid
                        ? 'bg-blue-500 text-white'
                        : 'bg-purple-500 text-white'
                        }`}
                    >
                      {msg.fromUserId !== user?.uid && (
                        <p className="text-xs mb-1 opacity-80">運営</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.fromUserId === user?.uid ? 'text-blue-100' : 'text-purple-100'
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
                className="bg-blue-500 hover:bg-blue-600"
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
