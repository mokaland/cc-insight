"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 保護されたルート（管理者のみアクセス可能）
const protectedRoutes = ["/dashboard", "/ranking"];
// 公開ルート（誰でもアクセス可能）
const publicRoutes = ["/login", "/report"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      // 認証状態に基づくリダイレクト
      const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

      if (!user && isProtectedRoute) {
        // 未認証で保護されたルートにアクセス → ログインへ
        router.push("/login");
      } else if (user && pathname === "/login") {
        // 認証済みでログインページにアクセス → ダッシュボードへ
        router.push("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// 認証ガードコンポーネント
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
    
    if (!loading && !user && isProtectedRoute) {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  
  if (!user && isProtectedRoute) {
    return null;
  }

  return <>{children}</>;
}
