"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 旧ページ - 新しい動的ルートへリダイレクト
 */
export default function FukugyouTeamPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 新しい統括ダッシュボードへリダイレクト
    router.replace("/team/fukugyou?tab=funnel");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">リダイレクト中...</p>
      </div>
    </div>
  );
}
