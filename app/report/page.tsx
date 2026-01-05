"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Send, 
  User, 
  Calendar, 
  Eye, 
  UserPlus,
  Link2,
  MousePointerClick,
  Instagram,
  Youtube,
  Twitter,
  CheckCircle2,
  AlertCircle,
  Users,
  Heart,
  MessageCircle,
  FileText,
  Plus,
  Trash2,
  Sparkles
} from "lucide-react";

const teams = [
  { id: "fukugyou", name: "副業チーム", color: "#ec4899", type: "shorts" },
  { id: "taishoku", name: "退職サポートチーム", color: "#06b6d4", type: "shorts" },
  { id: "buppan", name: "スマホ物販チーム", color: "#eab308", type: "x" },
];

export default function ReportPage() {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Shorts系（副業・退職）用の12項目
  const [accountId, setAccountId] = useState("");
  const [igViews, setIgViews] = useState("");
  const [igProfileAccess, setIgProfileAccess] = useState("");
  const [igExternalTaps, setIgExternalTaps] = useState("");
  const [igInteractions, setIgInteractions] = useState("");
  const [weeklyStories, setWeeklyStories] = useState("");
  const [igFollowers, setIgFollowers] = useState("");
  const [ytFollowers, setYtFollowers] = useState("");
  const [tiktokFollowers, setTiktokFollowers] = useState("");
  const [todayComment, setTodayComment] = useState("");

  // X運用（物販）用の項目
  const [xPostCount, setXPostCount] = useState("");
  const [xPostUrls, setXPostUrls] = useState<string[]>([""]);
  const [xLikeCount, setXLikeCount] = useState("");
  const [xReplyCount, setXReplyCount] = useState("");
  const [xTodayComment, setXTodayComment] = useState("");

  const selectedTeamData = teams.find(t => t.id === selectedTeam);
  const isXTeam = selectedTeamData?.type === "x";
  const teamColor = selectedTeamData?.color || "#ec4899";

  const addUrlField = () => {
    setXPostUrls([...xPostUrls, ""]);
  };

  const removeUrlField = (index: number) => {
    setXPostUrls(xPostUrls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...xPostUrls];
    newUrls[index] = value;
    setXPostUrls(newUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (isXTeam) {
        // X運用チーム用データ
        await addDoc(collection(db, "reports"), {
          team: selectedTeam,
          teamType: "x",
          name: name.trim(),
          date: date,
          postCount: parseInt(xPostCount) || 0,
          postUrls: xPostUrls.filter(url => url.trim() !== ""),
          likeCount: parseInt(xLikeCount) || 0,
          replyCount: parseInt(xReplyCount) || 0,
          todayComment: xTodayComment,
          createdAt: serverTimestamp(),
        });
      } else {
        // Shorts系チーム用データ
        await addDoc(collection(db, "reports"), {
          team: selectedTeam,
          teamType: "shorts",
          name: name.trim(),
          date: date,
          accountId: accountId,
          igViews: parseInt(igViews) || 0,
          igProfileAccess: parseInt(igProfileAccess) || 0,
          igExternalTaps: parseInt(igExternalTaps) || 0,
          igInteractions: parseInt(igInteractions) || 0,
          weeklyStories: parseInt(weeklyStories) || 0,
          igFollowers: parseInt(igFollowers) || 0,
          ytFollowers: parseInt(ytFollowers) || 0,
          tiktokFollowers: parseInt(tiktokFollowers) || 0,
          todayComment: todayComment,
          createdAt: serverTimestamp(),
        });
      }

      setSuccess(true);
      // フォームリセット
      resetForm();
    } catch (err) {
      console.error(err);
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    // Shorts系
    setAccountId("");
    setIgViews("");
    setIgProfileAccess("");
    setIgExternalTaps("");
    setIgInteractions("");
    setWeeklyStories("");
    setIgFollowers("");
    setYtFollowers("");
    setTiktokFollowers("");
    setTodayComment("");
    // X系
    setXPostCount("");
    setXPostUrls([""]);
    setXLikeCount("");
    setXReplyCount("");
    setXTodayComment("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-500"
          style={{ backgroundColor: `${teamColor}10` }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-500"
          style={{ backgroundColor: `${teamColor}05` }}
        />
      </div>

      <div className="max-w-2xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold bg-clip-text text-transparent mb-2"
            style={{ backgroundImage: `linear-gradient(to right, ${teamColor}, #a855f7, #06b6d4)` }}
          >
            📊 日次レポート
          </h1>
          <p className="text-muted-foreground">
            SNSの数値を報告してください
          </p>
        </div>

        <Card 
          className="backdrop-blur-xl border-2 transition-all duration-300"
          style={{ 
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: selectedTeam ? `${teamColor}40` : 'rgba(255,255,255,0.1)',
            boxShadow: selectedTeam ? `0 0 40px ${teamColor}20` : 'none'
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" style={{ color: teamColor }} />
              レポート送信
            </CardTitle>
            <CardDescription>
              入力内容は即座にダッシュボードに反映されます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Success/Error Messages */}
              {success && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <p className="font-medium">送信完了！</p>
                    <p className="text-sm text-green-400/80">レポートが正常に送信されました</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              {/* Team Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  所属チーム選択
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeam(team.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedTeam === team.id
                          ? "bg-white/10 scale-[1.02]"
                          : "border-white/10 hover:border-white/30 bg-white/5"
                      }`}
                      style={selectedTeam === team.id ? { 
                        borderColor: team.color,
                        boxShadow: `0 0 25px ${team.color}40`
                      } : {}}
                    >
                      <span 
                        className="w-3 h-3 rounded-full inline-block mr-2 animate-pulse"
                        style={{ backgroundColor: team.color, boxShadow: `0 0 10px ${team.color}` }}
                      />
                      <span className="font-medium">{team.name}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {team.type === "x" ? "X (Twitter)" : "Instagram / TikTok / YouTube"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 選択後のフォーム */}
              {selectedTeam && (
                <>
                  {/* Name & Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        お名前
                      </Label>
                      <Input
                        id="name"
                        placeholder="山田太郎"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-white/5 border-white/10 focus:border-pink-500"
                        style={{ borderColor: `${teamColor}30` }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        日付
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-white/5 border-white/10"
                        style={{ borderColor: `${teamColor}30` }}
                        required
                      />
                    </div>
                  </div>

                  {/* X運用チーム用フォーム */}
                  {isXTeam ? (
                    <div className="space-y-6 pt-4 border-t border-yellow-500/20">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Twitter className="w-5 h-5" />
                        <span className="font-semibold">X (Twitter) 活動報告</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-yellow-500" />
                            本日の投稿数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={xPostCount}
                            onChange={(e) => setXPostCount(e.target.value)}
                            className="bg-white/5 border-yellow-500/30 focus:border-yellow-500"
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <Heart className="w-4 h-4 text-yellow-500" />
                            いいね回り数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={xLikeCount}
                            onChange={(e) => setXLikeCount(e.target.value)}
                            className="bg-white/5 border-yellow-500/30 focus:border-yellow-500"
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <MessageCircle className="w-4 h-4 text-yellow-500" />
                            リプライ回り数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={xReplyCount}
                            onChange={(e) => setXReplyCount(e.target.value)}
                            className="bg-white/5 border-yellow-500/30 focus:border-yellow-500"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* 投稿URL */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-yellow-500" />
                          投稿したポストのURL
                        </Label>
                        {xPostUrls.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="https://x.com/..."
                              value={url}
                              onChange={(e) => updateUrl(index, e.target.value)}
                              className="bg-white/5 border-yellow-500/30 focus:border-yellow-500"
                            />
                            {xPostUrls.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeUrlField(index)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addUrlField}
                          className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          URLを追加
                        </Button>
                      </div>

                      {/* 今日の一言 */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          今日の一言
                        </Label>
                        <textarea
                          placeholder="今日の振り返りや気づきを書いてください..."
                          value={xTodayComment}
                          onChange={(e) => setXTodayComment(e.target.value)}
                          className="w-full h-24 px-3 py-2 rounded-md bg-white/5 border border-yellow-500/30 focus:border-yellow-500 focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Shorts系チーム用フォーム */
                    <div className="space-y-6 pt-4 border-t" style={{ borderColor: `${teamColor}20` }}>
                      <div className="flex items-center gap-2" style={{ color: teamColor }}>
                        <Instagram className="w-5 h-5" />
                        <span className="font-semibold">Instagram / TikTok / YouTube 活動報告</span>
                      </div>

                      {/* アカウントID */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <User className="w-4 h-4" style={{ color: teamColor }} />
                          アカウントID
                        </Label>
                        <Input
                          placeholder="@your_account"
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          className="bg-white/5"
                          style={{ borderColor: `${teamColor}30` }}
                        />
                      </div>

                      {/* Instagram数値 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <Eye className="w-4 h-4" style={{ color: teamColor }} />
                            IG 閲覧数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={igViews}
                            onChange={(e) => setIgViews(e.target.value)}
                            className="bg-white/5"
                            style={{ borderColor: `${teamColor}30` }}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <UserPlus className="w-4 h-4" style={{ color: teamColor }} />
                            プロフアクセス数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={igProfileAccess}
                            onChange={(e) => setIgProfileAccess(e.target.value)}
                            className="bg-white/5"
                            style={{ borderColor: `${teamColor}30` }}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <Link2 className="w-4 h-4" style={{ color: teamColor }} />
                            外部リンクタップ
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={igExternalTaps}
                            onChange={(e) => setIgExternalTaps(e.target.value)}
                            className="bg-white/5"
                            style={{ borderColor: `${teamColor}30` }}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <MousePointerClick className="w-4 h-4" style={{ color: teamColor }} />
                            インタラクション数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={igInteractions}
                            onChange={(e) => setIgInteractions(e.target.value)}
                            className="bg-white/5"
                            style={{ borderColor: `${teamColor}30` }}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4" style={{ color: teamColor }} />
                            週のストーリー数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={weeklyStories}
                            onChange={(e) => setWeeklyStories(e.target.value)}
                            className="bg-white/5"
                            style={{ borderColor: `${teamColor}30` }}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <Instagram className="w-4 h-4" style={{ color: teamColor }} />
                            IG フォロワー数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={igFollowers}
                            onChange={(e) => setIgFollowers(e.target.value)}
                            className="bg-white/5"
                            style={{ borderColor: `${teamColor}30` }}
                            min="0"
                          />
                        </div>
                      </div>

                      {/* 他プラットフォームフォロワー */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <Youtube className="w-4 h-4 text-red-500" />
                            YouTube フォロワー数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={ytFollowers}
                            onChange={(e) => setYtFollowers(e.target.value)}
                            className="bg-white/5"
                            style={{ borderColor: `${teamColor}30` }}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4" style={{ color: teamColor }} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                            TikTok フォロワー数
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={tiktokFollowers}
                            onChange={(e) => setTiktokFollowers(e.target.value)}
                            className="bg-white/5"
                            style={{ borderColor: `${teamColor}30` }}
                            min="0"
                          />
                        </div>
                      </div>

                      {/* 今日の一言 */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" style={{ color: teamColor }} />
                          今日の一言
                        </Label>
                        <textarea
                          placeholder="今日の振り返りや気づきを書いてください..."
                          value={todayComment}
                          onChange={(e) => setTodayComment(e.target.value)}
                          className="w-full h-24 px-3 py-2 rounded-md bg-white/5 focus:outline-none resize-none"
                          style={{ borderColor: `${teamColor}30`, borderWidth: '1px', borderStyle: 'solid' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg text-white hover:opacity-90 transition-all"
                    style={{ 
                      background: `linear-gradient(to right, ${teamColor}, #a855f7)`,
                      boxShadow: `0 0 30px ${teamColor}40`
                    }}
                    disabled={loading || !name}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        送信中...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        レポートを送信
                      </div>
                    )}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>管理者の方は <a href="/login" className="hover:underline" style={{ color: teamColor }}>こちらからログイン</a></p>
        </div>
      </div>
    </div>
  );
}
