"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, AlertCircle, Sparkles, UserPlus, Star } from "lucide-react";
import Link from "next/link";
import { ButtonLoader } from "@/components/ui/loading-spinner";
import Image from "next/image";

export default function MemberLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else if (err.code === "auth/user-not-found") {
        setError("ユーザーが見つかりません");
      } else if (err.code === "auth/wrong-password") {
        setError("パスワードが正しくありません");
      } else if (err.message.includes("停止")) {
        // 🔐 アカウント停止メッセージは一般化
        console.error("アカウント停止エラー:", err.message);
        setError("このアカウントは現在利用できません。管理者にお問い合わせください。");
      } else {
        setError("ログインに失敗しました。もう一度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4 relative overflow-hidden">
      {/* 守護神テーマ背景エフェクト */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* 星キラキラエフェクト */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <Star
            key={i}
            className="absolute text-sky-300/40 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              width: `${Math.random() * 16 + 8}px`,
              height: `${Math.random() * 16 + 8}px`,
            }}
            fill="currentColor"
          />
        ))}
        {[...Array(10)].map((_, i) => (
          <Sparkles
            key={`sparkle-${i}`}
            className="absolute text-indigo-300/30 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              width: `${Math.random() * 14 + 10}px`,
              height: `${Math.random() * 14 + 10}px`,
            }}
          />
        ))}
      </div>

      <Card className="w-full max-w-md relative bg-slate-900/60 backdrop-blur-xl border-2 border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.3)]">
        <CardHeader className="text-center space-y-4">
          {/* 守護神アイコン */}
          <div className="mx-auto mb-2 relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.6)] animate-pulse ring-2 ring-sky-400/50">
              <Image
                src="/icon-192x192.png"
                alt="キャリクラ守護神"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
            {/* グローエフェクト */}
            <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 blur-xl opacity-40 animate-ping" />
          </div>

          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent mb-2">
              キャリクラ
            </CardTitle>
            <CardDescription className="text-lg text-sky-300 font-semibold">
              守護神があなたを待っています
            </CardDescription>
            <p className="text-sm text-slate-400 mt-2">
              あなたの成長の記録がここに
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border-2 border-red-500/50 flex items-center gap-2 text-red-300 text-sm shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sky-200">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sky-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-2 border-indigo-500/30 focus:border-sky-500 text-white placeholder:text-slate-500 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sky-200">パスワード</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-2 border-indigo-500/30 focus:border-indigo-500 text-white placeholder:text-slate-500 h-12"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-indigo-500 via-sky-500 to-violet-500 text-white font-bold text-lg hover:opacity-90 shadow-[0_0_30px_rgba(99,102,241,0.5)] relative overflow-hidden group"
              disabled={loading}
            >
              {/* ホバー時のアニメーション */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-500 via-sky-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <ButtonLoader />
                    守護神を呼び出し中...
                  </>
                ) : (
                  <>
                    <Star className="w-5 h-5" fill="currentColor" />
                    ログイン
                  </>
                )}
              </span>
            </Button>
          </form>

          {/* 新規登録リンク */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-indigo-500/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-900/60 text-slate-400">または</span>
            </div>
          </div>

          <Link href="/register" className="block w-full">
            <Button
              type="button"
              className="!flex w-full h-12 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-bold text-lg hover:opacity-90 shadow-[0_0_30px_rgba(236,72,153,0.5)] relative overflow-hidden group"
            >
              {/* ホバー時のアニメーション */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-rose-500 via-pink-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <span className="relative z-10 flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                新規登録
              </span>
            </Button>
          </Link>

          {/* フッター */}
          <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-400 space-y-2">
            <p>レベルアップ・バッジ獲得で成長を実感</p>
            <p className="text-indigo-400/70">
              ログイン後、あなた専用のマイページへ
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
