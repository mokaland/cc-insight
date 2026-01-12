"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useRouter, usePathname } from "next/navigation";
import { PageLoader } from "@/components/ui/loading-spinner";
import { validateInvitation, markInvitationAsUsed } from "./invitations";

// ユーザープロファイル型定義
export interface UserProfile {
  uid: string;
  email: string;
  realName: string; // 漢字フルネーム（管理者のみ閲覧）
  furigana?: string; // 読み仮名（ひらがな）- 検索用
  displayName: string; // ニックネーム（公開）
  team: "fukugyou" | "taishoku" | "buppan";
  role: "member" | "admin";
  status: "pending" | "approved" | "suspended";
  emailVerified: boolean;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  lastLoginAt?: Timestamp;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  register: (email: string, password: string, displayName: string, team: UserProfile["team"], realName: string, furigana: string, invitationCode: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ルート定義
const publicRoutes = ["/login", "/register", "/report", "/verify-email"];
const pendingAllowedRoutes = ["/pending-approval", "/verify-email"];
const adminOnlyRoutes = ["/admin", "/dashboard"]; // 管理者専用
const memberRoutes = ["/mypage", "/ranking"]; // メンバー専用

// 管理者専用ルートのチェック（サブパス含む）
function isAdminOnlyRoute(path: string): boolean {
  return adminOnlyRoutes.some(route =>
    path === route || path.startsWith(route + '/')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Firestoreからユーザープロファイルを取得
  const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  // ユーザープロファイルを更新
  const refreshUserProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Firestoreからプロファイル取得
        const profile = await fetchUserProfile(firebaseUser.uid);
        setUserProfile(profile);

        // メール未確認の場合
        if (!firebaseUser.emailVerified) {
          if (!publicRoutes.includes(pathname) && pathname !== "/verify-email") {
            router.push("/verify-email");
          }
        }
        // 承認待ちの場合
        else if (profile?.status === "pending") {
          if (!pendingAllowedRoutes.includes(pathname)) {
            router.push("/pending-approval");
          }
        }
        // 停止中の場合
        else if (profile?.status === "suspended") {
          await signOut(auth);
          router.push("/login?error=suspended");
        }
        // 承認済みでログインページにいる場合
        else if (profile?.status === "approved" && pathname === "/login") {
          router.push("/dashboard");
        }
      } else {
        setUserProfile(null);
        // 未認証で保護ルートにアクセス
        const isProtectedRoute = [...memberRoutes, ...adminOnlyRoutes].some(route =>
          pathname.startsWith(route)
        );
        if (isProtectedRoute) {
          router.push("/login");
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  // 新規登録
  const register = async (
    email: string,
    password: string,
    displayName: string,
    team: UserProfile["team"],
    realName: string,
    furigana: string,
    invitationCode: string
  ) => {
    try {
      // 招待コードの検証
      const isValid = await validateInvitation(invitationCode);
      if (!isValid) {
        throw new Error("無効または使用済みの招待コードです");
      }

      // Firebase Authでユーザー作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // プロフィール名を設定（ニックネーム）
      await updateProfile(newUser, { displayName });

      // Firestoreにユーザードキュメント作成
      // 注意: セキュリティルールで 'role' フィールドを含む作成は禁止されている
      // 新規ユーザーは role なしで作成され、管理者が承認時に role: "member" を付与する
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: email,
        realName: realName, // 漢字フルネーム
        furigana: furigana, // 読み仮名
        displayName: displayName, // ニックネーム
        team: team,
        // role は含めない（セキュリティルール制約: ユーザー自身がroleを設定することを禁止）
        status: "pending",
        emailVerified: false,
        createdAt: serverTimestamp(),
        // 守護神プロファイルを初期化（重要！）
        guardianProfile: {
          energy: {
            current: 0,
            totalEarned: 0,
            totalSpent: 0
          },
          streak: {
            current: 0,
            max: 0,
            lastReportDate: null
          },
          guardians: {},
          activeGuardianId: null,
          gender: null,
          ageGroup: null
        }
      });

      // メール認証送信（日本語設定）
      auth.languageCode = 'ja';
      await sendEmailVerification(newUser);

      // 招待コードを使用済みにする
      await markInvitationAsUsed(invitationCode, newUser.uid);

      router.push("/verify-email");
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  // ログイン
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      // プロファイル取得
      const profile = await fetchUserProfile(loggedInUser.uid);

      // Firestoreにユーザードキュメントが存在しない場合
      if (!profile) {
        await signOut(auth);
        throw new Error("ユーザー情報が見つかりません。管理者にお問い合わせください。");
      }

      // 最終ログイン時刻を更新
      await setDoc(doc(db, "users", loggedInUser.uid), {
        lastLoginAt: serverTimestamp(),
        emailVerified: loggedInUser.emailVerified,
      }, { merge: true });

      if (!loggedInUser.emailVerified) {
        router.push("/verify-email");
      } else if (profile.status === "pending") {
        router.push("/pending-approval");
      } else if (profile.status === "suspended") {
        await signOut(auth);
        throw new Error("アカウントが停止されています。管理者にお問い合わせください。");
      } else if (profile.status === "approved") {
        // 役割に応じてリダイレクト先を分岐
        if (profile.role === "admin") {
          router.push("/dashboard"); // 管理者 → ダッシュボード
        } else {
          router.push("/mypage"); // メンバー → マイページ
        }
      } else {
        await signOut(auth);
        throw new Error("アカウントの状態が不正です。管理者にお問い合わせください。");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  // メール認証再送
  const resendVerificationEmail = async () => {
    if (user && !user.emailVerified) {
      await sendEmailVerification(user);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      register,
      login,
      logout,
      resendVerificationEmail,
      refreshUserProfile
    }}>
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
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isPendingAllowed = pendingAllowedRoutes.includes(pathname);
    const isAdminRoute = isAdminOnlyRoute(pathname); // 修正: 新しい関数を使用
    const isMemberRoute = memberRoutes.some(route => pathname.startsWith(route));

    // 未認証で保護ルート
    if (!user && (isMemberRoute || isAdminRoute)) {
      router.push("/login");
      return;
    }

    if (user && userProfile) {
      // メール未確認
      if (!user.emailVerified && !isPublicRoute && pathname !== "/verify-email") {
        router.push("/verify-email");
        return;
      }

      // 承認待ち
      if (userProfile.status === "pending" && !isPendingAllowed && user.emailVerified) {
        router.push("/pending-approval");
        return;
      }

      // 管理者ルートへの不正アクセス（一般メンバーは/mypageへ強制リダイレクト）
      // サブパス含めて厳密にチェック
      if (isAdminRoute && userProfile.role !== "admin") {
        console.warn(`Unauthorized admin route access blocked: ${pathname}`);
        router.push("/mypage");
        return;
      }
    }
  }, [user, userProfile, loading, pathname, router]);

  if (loading) {
    return <PageLoader text="読み込み中..." />;
  }

  return <>{children}</>;
}

// 管理者専用ガード
export function AdminGuard({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [userProfile, loading, router]);

  if (loading || userProfile?.role !== "admin") {
    return <PageLoader text="権限を確認中..." />;
  }

  return <>{children}</>;
}
