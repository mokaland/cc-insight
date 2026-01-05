"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, AuthGuard } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

// 公開ページ（サイドバー非表示）
const publicPages = ["/login", "/report"];

function LogoutButton() {
  const { logout, user } = useAuth();

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={logout}
      className="fixed top-4 right-4 z-50 text-muted-foreground hover:text-foreground"
    >
      <LogOut className="w-4 h-4 mr-2" />
      ログアウト
    </Button>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = publicPages.some((page) => pathname.startsWith(page));

  // 公開ページ（ログイン、レポート）はサイドバーなし
  if (isPublicPage) {
    return <>{children}</>;
  }

  // 保護されたページはサイドバー付き + 認証ガード
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <LogoutButton />
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
