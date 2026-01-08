"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Clock, User, Users, Send } from "lucide-react";
import { collection, query, where, orderBy, getDocs, limit, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { teams } from "@/lib/firestore";

interface MessageReport {
  id: string;
  userId: string;
  name: string;
  team: string;
  teamName: string;
  teamColor: string;
  date: string;
  todayComment: string;
  createdAt: Date;
}

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageReport[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<MessageReport | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/admin/login");
      return;
    }
    loadMessages();
  }, [user, router]);

  async function loadMessages() {
    try {
      setLoading(true);
      
      // 過去30日間の「今日の一言」がある日報を取得
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split("T")[0];
      
      const q = query(
        collection(db, "reports"),
        where("date", ">=", dateStr),
        where("todayComment", "!=", ""),
        orderBy("todayComment"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const msgs: MessageReport[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.todayComment && data.todayComment.trim() !== "") {
          const team = teams.find(t => t.id === data.team);
          msgs.push({
            id: doc.id,
            userId: data.userId || "",
            name: data.name,
            team: data.team,
            teamName: team?.name || data.team,
            teamColor: team?.color || "#ec4899",
            date: data.date,
            todayComment: data.todayComment,
            createdAt: data.createdAt?.toDate() || new Date(data.date),
          });
        }
      });
      
      setMessages(msgs);
    } catch (error) {
      console.error("メッセージ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMessages = selectedTeam === "all" 
    ? messages 
    : messages.filter(m => m.team === selectedTeam);

  // メンバーごとにグループ化
  const memberGroups = filteredMessages.reduce((acc, msg) => {
    const key = `${msg.team}-${msg.name}`;
    if (!acc[key]) {
      acc[key] = {
        name: msg.name,
        team: msg.team,
        teamName: msg.teamName,
        teamColor: msg.teamColor,
        messages: [],
        latestDate: msg.createdAt,
      };
    }
    acc[key].messages.push(msg);
    if (msg.createdAt > acc[key].latestDate) {
      acc[key].latestDate = msg.createdAt;
    }
    return acc;
  }, {} as Record<string, any>);

  const memberList = Object.values(memberGroups).sort((a: any, b: any) => 
    b.latestDate.getTime() - a.latestDate.getTime()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">メッセージを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-purple-500" />
          メンバーメッセージ
        </h1>
        <p className="text-muted-foreground mt-2">
          メンバーからの「今日の一言」を確認できます
        </p>
      </div>

      {/* チームフィルター */}
      <Tabs value={selectedTeam} onValueChange={setSelectedTeam}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            全チーム ({messages.length})
          </TabsTrigger>
          {teams.map((team) => (
            <TabsTrigger key={team.id} value={team.id}>
              {team.name} ({messages.filter(m => m.team === team.id).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* レイアウト：左にメンバーリスト、右にメッセージ詳細 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メンバーリスト */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              メンバー一覧
            </CardTitle>
            <CardDescription>最新報告順</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {memberList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>メッセージがありません</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {memberList.map((member: any) => (
                    <button
                      key={`${member.team}-${member.name}`}
                      onClick={() => setSelectedMember(member.messages[0])}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-l-4 ${
                        selectedMember?.name === member.name && selectedMember?.team === member.team
                          ? 'bg-muted border-l-purple-500'
                          : 'border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold">{member.name}</p>
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `${member.teamColor}20`,
                            color: member.teamColor 
                          }}
                        >
                          {member.teamName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageCircle className="w-3 h-3" />
                        <span>{member.messages.length}件のメッセージ</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{member.latestDate.toLocaleDateString('ja-JP')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* メッセージ詳細 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedMember ? `${selectedMember.name}さんのメッセージ` : 'メッセージ詳細'}
            </CardTitle>
            {selectedMember && (
              <CardDescription>
                <span 
                  className="inline-block px-2 py-0.5 rounded-full text-xs"
                  style={{ 
                    backgroundColor: `${selectedMember.teamColor}20`,
                    color: selectedMember.teamColor 
                  }}
                >
                  {selectedMember.teamName}
                </span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedMember ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>左のリストからメンバーを選択してください</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {memberGroups[`${selectedMember.team}-${selectedMember.name}`].messages.map((msg: MessageReport) => (
                  <div 
                    key={msg.id}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(msg.date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        })}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {msg.createdAt.toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{msg.todayComment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
