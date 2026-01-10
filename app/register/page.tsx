"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Mail, Lock, User, Users, Ticket, Star, Sparkles } from "lucide-react";
import { ButtonLoader } from "@/components/ui/loading-spinner";
import Image from "next/image";

type TeamType = "fukugyou" | "taishoku" | "buppan";

const teams = [
  { id: "fukugyou" as TeamType, name: "副業チーム", color: "#ec4899", description: "Instagram/TikTok運用" },
  { id: "taishoku" as TeamType, name: "退職サポートチーム", color: "#06b6d4", description: "退職支援コンテンツ" },
  { id: "buppan" as TeamType, name: "スマホ物販チーム", color: "#eab308", description: "X運用・物販" },
];

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [realName, setRealName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<TeamType | null>(null);
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // バリデーション
    if (!realName.trim()) {
      setError("漢字フルネームを入力してください");
      return;
    }
    if (!displayName.trim()) {
      setError("ニックネームを入力してください");
      return;
    }
    if (!selectedTeam) {
      setError("所属チームを選択してください");
      return;
    }
    // 🔐 パスワード検証強化: 8文字以上、英数字必須
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("パスワードは英字と数字の両方を含む必要があります");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, displayName, selectedTeam, realName, invitationCode);
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("このメールアドレスは既に登録されています");
      } else if (err.code === "auth/invalid-email") {
        setError("無効なメールアドレスです");
      } else if (err.code === "auth/weak-password") {
        setError("パスワードが弱すぎます。より強力なパスワードを設定してください");
      } else {
        setError("登録に失敗しました。もう一度お試しください");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4 py-8 overflow-y-auto relative">
      {/* 守護神テーマ背景エフェクト */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-3/4 left-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* 星キラキラエフェクト */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <Star
            key={i}
            className="absolute text-sky-300/40 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              width: `${Math.random() * 14 + 6}px`,
              height: `${Math.random() * 14 + 6}px`,
            }}
            fill="currentColor"
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <Sparkles
            key={`sparkle-${i}`}
            className="absolute text-indigo-300/30 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              width: `${Math.random() * 12 + 8}px`,
              height: `${Math.random() * 12 + 8}px`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* ロゴ/タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-[0_0_40px_rgba(99,102,241,0.6)] ring-2 ring-sky-400/50">
            <Image
              src="/icon-192x192.png"
              alt="キャリクラ守護神"
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent mb-2">新規登録</h1>
          <p className="text-sky-300">キャリクラ メンバー登録</p>
        </div>

        {/* 登録フォーム */}
        <div className="backdrop-blur-xl bg-slate-900/60 border-2 border-indigo-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(99,102,241,0.3)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 漢字フルネーム */}
            <div className="space-y-2">
              <Label htmlFor="realName" className="text-sky-200">
                漢字フルネーム（正式名）
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
                <Input
                  id="realName"
                  type="text"
                  placeholder="山田 太郎"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="pl-10 bg-white/5 border-2 border-indigo-500/30 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                  required
                />
              </div>
              <p className="text-xs text-slate-500">※管理者のみ閲覧可能</p>
            </div>

            {/* ニックネーム */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sky-200">
                ニックネーム（表示名）
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="やまたろ"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 bg-white/5 border-2 border-indigo-500/30 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                  required
                />
              </div>
              <p className="text-xs text-slate-500">※ランキング等で公開されます</p>
            </div>

            {/* メールアドレス */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sky-200">
                メールアドレス
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-2 border-indigo-500/30 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                  required
                />
              </div>
            </div>

            {/* パスワード */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sky-200">
                パスワード
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="8文字以上（英数字必須）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-2 border-indigo-500/30 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                  required
                />
              </div>
            </div>

            {/* パスワード確認 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sky-200">
                パスワード（確認）
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="パスワードを再入力"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-2 border-indigo-500/30 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                  required
                />
              </div>
            </div>

            {/* チーム選択 */}
            <div className="space-y-2">
              <Label className="text-sky-200 flex items-center gap-2">
                <Users className="w-5 h-5" />
                所属チーム
              </Label>
              <div className="grid gap-3">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeam(team.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedTeam === team.id
                      ? "border-opacity-100 bg-opacity-20 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                      : "border-indigo-500/20 bg-white/5 hover:bg-white/10"
                      }`}
                    style={{
                      borderColor: selectedTeam === team.id ? team.color : undefined,
                      backgroundColor: selectedTeam === team.id ? `${team.color}20` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <div>
                        <div className="font-medium text-white">{team.name}</div>
                        <div className="text-sm text-slate-400">{team.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/*  Invitation Code - New Field */}
            <div className="space-y-2">
              <Label htmlFor="invitationCode" className="text-sky-200">
                招待コード
              </Label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <Input
                  id="invitationCode"
                  type="text"
                  placeholder="8桁のコードを入力"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  className="pl-10 bg-white/5 border-2 border-indigo-500/30 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20 font-mono tracking-widest"
                  required
                />
              </div>
              <p className="text-xs text-slate-500">※管理画面から発行されたコードが必要です</p>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border-2 border-red-500/30 text-red-300 text-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                {error}
              </div>
            )}

            {/* 登録ボタン */}
            <Button
              type="submit"
              disabled={isLoading}
              className="!flex w-full h-12 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-bold text-lg hover:opacity-90 shadow-[0_0_30px_rgba(236,72,153,0.5)] relative overflow-hidden group"
            >
              {/* ホバー時のアニメーション */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-rose-500 via-pink-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <ButtonLoader />
                    登録中...
                  </>
                ) : (
                  <>
                    <Star className="w-5 h-5" fill="currentColor" />
                    新規登録
                  </>
                )}
              </span>
            </Button>
          </form>

          {/* ログインリンク */}
          <div className="mt-6 text-center">
            <p className="text-slate-400">
              既にアカウントをお持ちですか？{" "}
              <Link
                href="/login"
                className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                ログイン
              </Link>
            </p>
          </div>
        </div>

        {/* 注意事項 */}
        <p className="text-center text-slate-500 text-sm mt-6">
          登録後、メール認証と管理者承認が必要です
        </p>
      </div>
    </div>
  );
}
