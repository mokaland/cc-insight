import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  DocumentData
} from "firebase/firestore";
import { db } from "./firebase";
import {
  GuardianId,
  GuardianInstance,
  UserGuardianProfile,
  UserEnergyData,
  UserStreakData,
  createNewUserProfile,
  createGuardianInstance,
  GUARDIANS,
  canUnlockGuardian,
  getEnergyToNextStage,
  SnsAccounts,
  SnsAccountApproval,
  SnsApprovalStatus,
  PROFILE_COMPLETION_BONUS,
  SNS_LABELS
} from "./guardian-collection";

// 型エイリアス（後方互換性のため）
type Gender = 'male' | 'female' | 'other';
type AgeGroup = '10s' | '20s' | '30s' | '40s' | '50plus';
type GuardianData = GuardianInstance; // 旧名称との互換性
interface CompletedSeason {
  guardianId: GuardianId;
  seasonNumber: number;
  finalStage: number;
  finalStageName: string;
  completedAt: Timestamp;
  totalDays: number;
  totalBoosts: number;
}

// レポートデータの型定義
export interface Report {
  id: string;
  team: string;
  teamType: "shorts" | "x";
  name: string;
  date: string;
  createdAt: Timestamp;
  // ユーザー紐付け
  userId?: string;
  userEmail?: string;
  // Shorts系
  accountId?: string;
  igViews?: number;
  igProfileAccess?: number;
  igExternalTaps?: number;
  igInteractions?: number;
  weeklyStories?: number;
  igFollowers?: number;
  ytFollowers?: number;
  tiktokFollowers?: number;
  todayComment?: string;
  // SNS別投稿数（Shorts系）
  igPosts?: number;
  ytPosts?: number;
  tiktokPosts?: number;
  // X系
  postCount?: number;
  postUrls?: string[];
  posts?: { url: string; content: string }[];  // 🆕 AIフィードバック用
  likeCount?: number;
  replyCount?: number;
  xFollowers?: number;  // 現在のXフォロワー数
}


// チーム情報
// fukugyou: Shortsチーム（IG再生数、プロフアクセスなど）
// taishoku: Shortsチーム（IG再生数、プロフアクセスなど）
// buppan: Xチーム（投稿、いいね、リプライ）
export const teams = [
  { id: "fukugyou", name: "副業チーム", color: "#ec4899", type: "shorts", dailyPostGoal: 3 },
  { id: "taishoku", name: "退職サポートチーム", color: "#06b6d4", type: "shorts", dailyPostGoal: 2 },
  { id: "buppan", name: "スマホ物販チーム", color: "#eab308", type: "x", dailyPostGoal: 5 },
];

// 期間の計算
export function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "1q":
      start = new Date(now.getFullYear(), 0, 1); // 1月1日
      end.setMonth(2, 31); // 3月末
      break;
    case "2q":
      start = new Date(now.getFullYear(), 3, 1); // 4月1日
      end.setMonth(5, 30); // 6月末
      break;
    case "3q":
      start = new Date(now.getFullYear(), 6, 1); // 7月1日
      end.setMonth(8, 30); // 9月末
      break;
    case "4q":
      start = new Date(now.getFullYear(), 9, 1); // 10月1日
      end.setMonth(11, 31); // 12月末
      break;
    default:
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

// レポートをリアルタイムで取得（過去35日分のみ - コスト最適化）
export function subscribeToReports(
  callback: (reports: Report[]) => void,
  teamId?: string
) {
  // 過去35日分のみ取得（週間・月間ランキングに必要な30日 + 余裕5日）
  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
  const cutoffDate = thirtyFiveDaysAgo.toISOString().split("T")[0];

  let q = query(
    collection(db, "reports"),
    where("date", ">=", cutoffDate),
    orderBy("date", "desc")
  );

  if (teamId) {
    q = query(
      collection(db, "reports"),
      where("team", "==", teamId),
      where("date", ">=", cutoffDate),
      orderBy("date", "desc")
    );
  }

  return onSnapshot(q, (snapshot) => {
    const reports: Report[] = [];
    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() } as Report);
    });
    callback(reports);
  }, (error) => {
    console.error("Firestore subscription error:", error);
    callback([]);
  });
}

// 期間指定でレポートを取得
export async function getReportsByPeriod(
  period: string,
  teamId?: string
): Promise<Report[]> {
  const { start, end } = getDateRange(period);
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  let q = query(
    collection(db, "reports"),
    where("date", ">=", startStr),
    where("date", "<=", endStr),
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);
  const reports: Report[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!teamId || data.team === teamId) {
      reports.push({ id: doc.id, ...data } as Report);
    }
  });

  return reports;
}

// チーム別統計を計算（全体サマリーと同じKPI）
export function calculateTeamStats(reports: Report[], teamId: string) {
  const teamReports = reports.filter(r => r.team === teamId);
  const team = teams.find(t => t.id === teamId);

  if (!team || teamReports.length === 0) {
    return {
      totalViews: 0,
      totalImpressions: 0,
      totalPosts: 0,
      totalTargetPosts: 0,
      achievementRate: 0,
      memberCount: 0,
      perfectMembers: 0,
      members: [],
      // 詳細KPI（全体サマリーと同じ）
      totalProfileAccess: 0,
      totalExternalTaps: 0,
      totalInteractions: 0,
      totalStories: 0,
      totalLikes: 0,
      totalReplies: 0,
      totalIgFollowers: 0,
      totalYtFollowers: 0,
      totalTiktokFollowers: 0,
      totalXFollowers: 0,  // ✅ X（Twitter）フォロワー合計
    };
  }

  // メンバーごとに集計
  const memberStats: { [name: string]: any } = {};

  // 詳細KPI集計用
  let totalProfileAccess = 0;
  let totalExternalTaps = 0;
  let totalInteractions = 0;
  let totalStories = 0;
  let totalLikes = 0;
  let totalReplies = 0;

  // 最新フォロワー数（メンバーごと）
  const latestFollowers: { [name: string]: { ig: number; yt: number; tiktok: number; x: number } } = {};

  teamReports.forEach(report => {
    if (!memberStats[report.name]) {
      memberStats[report.name] = {
        name: report.name,
        views: 0,
        impressions: 0,
        posts: 0,
        likes: 0,
        replies: 0,
        interactions: 0,
        reports: 0
      };
    }

    const stats = memberStats[report.name];
    stats.reports++;

    if (team.type === "shorts") {
      stats.views += report.igViews || 0;
      stats.impressions += report.igProfileAccess || 0;
      stats.interactions += report.igInteractions || 0;
      // ✅ SNS別投稿数を正確に集計（報告1件=1投稿ではない）
      stats.posts += (report.igPosts || 0) + (report.ytPosts || 0) + (report.tiktokPosts || 0);

      // 詳細KPI集計
      totalProfileAccess += report.igProfileAccess || 0;
      totalExternalTaps += report.igExternalTaps || 0;
      totalInteractions += report.igInteractions || 0;
      totalStories += report.weeklyStories || 0;

      // 最新フォロワー数を保持
      if (!latestFollowers[report.name]) {
        latestFollowers[report.name] = { ig: 0, yt: 0, tiktok: 0, x: 0 };
      }
      latestFollowers[report.name].ig = report.igFollowers || 0;
      latestFollowers[report.name].yt = report.ytFollowers || 0;
      latestFollowers[report.name].tiktok = report.tiktokFollowers || 0;
    } else {
      stats.posts += report.postCount || 0;
      stats.likes += report.likeCount || 0;
      stats.replies += report.replyCount || 0;

      // X（Twitter）統計
      totalLikes += report.likeCount || 0;
      totalReplies += report.replyCount || 0;

      // X（Twitter）フォロワー数を保持
      if (!latestFollowers[report.name]) {
        latestFollowers[report.name] = { ig: 0, yt: 0, tiktok: 0, x: 0 };
      }
      latestFollowers[report.name].x = report.xFollowers || 0;
    }
  });

  const members = Object.values(memberStats)
    .map((m: any) => {
      const followerData = latestFollowers[m.name] || { ig: 0, yt: 0, tiktok: 0, x: 0 };
      return {
        ...m,
        // モーダル表示用のエイリアス追加
        profileAccess: m.impressions,  // impressions = プロフアクセス
        // フォロワー関連データ
        igFollowers: followerData.ig,
        ytFollowers: followerData.yt,
        tiktokFollowers: followerData.tiktok,
        xFollowers: followerData.x,
        totalFollowers: followerData.ig + followerData.yt + followerData.tiktok + followerData.x,
        achievementRate: Math.round((m.posts / (team.dailyPostGoal * 7)) * 100)
      };
    })
    .sort((a: any, b: any) => b.views - a.views);

  const totalViews = members.reduce((sum: number, m: any) => sum + m.views, 0);
  const totalImpressions = members.reduce((sum: number, m: any) => sum + m.impressions, 0);
  const totalPosts = members.reduce((sum: number, m: any) => sum + m.posts, 0);
  const totalTargetPosts = members.length * team.dailyPostGoal * 7;
  const perfectMembers = members.filter((m: any) => m.achievementRate >= 100).length;

  // 全メンバーの最新フォロワー数を合計
  let totalIgFollowers = 0;
  let totalYtFollowers = 0;
  let totalTiktokFollowers = 0;
  let totalXFollowers = 0;
  Object.values(latestFollowers).forEach(f => {
    totalIgFollowers += f.ig;
    totalYtFollowers += f.yt;
    totalTiktokFollowers += f.tiktok;
    totalXFollowers += f.x;
  });

  return {
    totalViews,
    totalImpressions,
    totalPosts,
    totalTargetPosts,
    achievementRate: totalTargetPosts > 0 ? Math.round((totalPosts / totalTargetPosts) * 100) : 0,
    memberCount: members.length,
    perfectMembers,
    members,
    // 詳細KPI（全体サマリーと完全一致）
    totalProfileAccess,
    totalExternalTaps,
    totalInteractions,
    totalStories,
    totalLikes,
    totalReplies,
    totalIgFollowers,
    totalYtFollowers,
    totalTiktokFollowers,
    totalXFollowers,  // ✅ X（Twitter）フォロワー合計
  };
}

// 全体統計を計算
export function calculateOverallStats(reports: Report[]) {
  let totalViews = 0;
  let totalImpressions = 0;
  let totalPosts = 0;
  let totalProfileAccess = 0;
  let totalExternalTaps = 0;
  let totalInteractions = 0;
  let totalStories = 0;
  let totalLikes = 0;
  let totalReplies = 0;

  const memberSet = new Set<string>();
  const latestFollowers: { [key: string]: { ig: number; yt: number; tiktok: number } } = {};

  reports.forEach(report => {
    memberSet.add(report.name);

    if (report.teamType === "shorts") {
      totalViews += report.igViews || 0;
      totalImpressions += report.igProfileAccess || 0;
      totalProfileAccess += report.igProfileAccess || 0;
      totalExternalTaps += report.igExternalTaps || 0;
      totalInteractions += report.igInteractions || 0;
      totalStories += report.weeklyStories || 0;
      // ✅ SNS別投稿数を正確に集計
      totalPosts += (report.igPosts || 0) + (report.ytPosts || 0) + (report.tiktokPosts || 0);

      // 最新のフォロワー数を保持
      const key = `${report.team}-${report.name}`;
      if (!latestFollowers[key]) {
        latestFollowers[key] = { ig: 0, yt: 0, tiktok: 0 };
      }
      latestFollowers[key].ig = report.igFollowers || 0;
      latestFollowers[key].yt = report.ytFollowers || 0;
      latestFollowers[key].tiktok = report.tiktokFollowers || 0;
    } else {
      totalPosts += report.postCount || 0;
      totalLikes += report.likeCount || 0;
      totalReplies += report.replyCount || 0;
    }
  });

  // 全メンバーの最新フォロワー数を合計
  let totalIgFollowers = 0;
  let totalYtFollowers = 0;
  let totalTiktokFollowers = 0;
  Object.values(latestFollowers).forEach(f => {
    totalIgFollowers += f.ig;
    totalYtFollowers += f.yt;
    totalTiktokFollowers += f.tiktok;
  });

  return {
    totalViews,
    totalImpressions,
    totalPosts,
    totalProfileAccess,
    totalExternalTaps,
    totalInteractions,
    totalStories,
    totalLikes,
    totalReplies,
    totalIgFollowers,
    totalYtFollowers,
    totalTiktokFollowers,
    activeMembers: memberSet.size
  };
}

// 全レポートを削除（データクリーンアップ用）
export async function deleteAllReports(): Promise<number> {
  const q = query(collection(db, "reports"));
  const snapshot = await getDocs(q);
  let count = 0;

  const deletePromises = snapshot.docs.map(async (docSnapshot) => {
    await deleteDoc(doc(db, "reports", docSnapshot.id));
    count++;
  });

  await Promise.all(deletePromises);
  return count;
}

// ランキングを計算
export function calculateRankings(reports: Report[], type: "views" | "posts" | "activity") {
  const memberStats: { [key: string]: any } = {};

  reports.forEach(report => {
    const key = `${report.team}-${report.name}`;

    if (!memberStats[key]) {
      memberStats[key] = {
        name: report.name,
        team: report.team,
        teamName: teams.find(t => t.id === report.team)?.name || "",
        teamColor: teams.find(t => t.id === report.team)?.color || "#ec4899",
        views: 0,
        posts: 0,
        activity: 0
      };
    }

    const stats = memberStats[key];

    if (report.teamType === "shorts") {
      stats.views += report.igViews || 0;
      // ✅ SNS別投稿数を正確に集計
      stats.posts += (report.igPosts || 0) + (report.ytPosts || 0) + (report.tiktokPosts || 0);
      stats.activity += (report.igInteractions || 0);
    } else {
      stats.posts += report.postCount || 0;
      stats.activity += (report.likeCount || 0) + (report.replyCount || 0);
    }
  });

  const rankings = Object.values(memberStats)
    .sort((a: any, b: any) => b[type] - a[type])
    .slice(0, 10);

  return rankings;
}

// ユーザー管理機能
export interface User {
  uid: string;
  email: string;
  realName: string; // 漢字フルネーム（管理者のみ閲覧）
  displayName: string; // ニックネーム（公開）
  team: string;
  role: "member" | "admin";
  status: "pending" | "approved" | "suspended";
  emailVerified: boolean;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  lastLoginAt?: Timestamp;

  // 🛡️ 守護神システム（新設）
  gender?: Gender;                    // 性別
  ageGroup?: AgeGroup;                // 年齢層
  guardians?: GuardianData[];         // 保有している守護神（複数育成対応）
  activeGuardianId?: string;          // 現在アクティブな守護神のID
  completedSeasons?: CompletedSeason[]; // 殿堂入りした守護神の記録
  profileCompleted?: boolean;         // プロフィール入力完了フラグ

  // 🔥 ストリークシステム（後方互換性のため残す）
  currentStreak?: number;
  maxStreak?: number;
  lastReportDate?: Timestamp;

  // 📱 SNSアカウント設定
  snsAccounts?: SnsAccounts;
}

// 全ユーザーを取得
export async function getAllUsers(): Promise<User[]> {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const users: User[] = [];

  snapshot.forEach((doc) => {
    users.push({ uid: doc.id, ...doc.data() } as User);
  });

  return users;
}

// ユーザーのステータスを更新
export async function updateUserStatus(
  userId: string,
  status: "pending" | "approved" | "suspended",
  adminUid: string
): Promise<void> {
  const updates: any = {
    status,
  };

  if (status === "approved") {
    updates.approvedAt = serverTimestamp();
    updates.approvedBy = adminUid;
    // 承認時に role が未設定の場合は "member" を付与
    // （新規登録時は role を含めずに作成されるため）
    updates.role = "member";
  }

  await setDoc(doc(db, "users", userId), updates, { merge: true });
}

// ユーザーの役割を更新
export async function updateUserRole(userId: string, role: "member" | "admin"): Promise<void> {
  await setDoc(doc(db, "users", userId), { role }, { merge: true });
}

// バッジ管理機能
import { UserBadge } from "./gamification";

// ユーザーのバッジを取得
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return (data.badges || []) as UserBadge[];
    }
    return [];
  } catch (error) {
    console.error("Error fetching user badges:", error);
    return [];
  }
}

// ユーザーのバッジを更新（新規バッジを追加）
export async function updateUserBadges(userId: string, badges: UserBadge[]): Promise<void> {
  await setDoc(doc(db, "users", userId), { badges }, { merge: true });
}

// ユーザーの統計情報を取得（バッジ判定用）
export async function getUserStats(userId: string): Promise<{
  totalViews: number;
  totalReports: number;
  currentStreak: number;
  weeklyViews: number;
  previousWeekViews: number;
}> {
  try {
    // ユーザーの全レポートを取得
    // ⚠️ 複合インデックス必須: userId (ASC) + createdAt (DESC)
    // インデックス作成URL: コンソールエラーに表示されるリンクをクリック
    const q = query(
      collection(db, "reports"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const reports: Report[] = [];
    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() } as Report);
    });

    // 統計計算
    let totalViews = 0;
    let weeklyViews = 0;
    let previousWeekViews = 0;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const prevWeekStart = new Date(now);
    prevWeekStart.setDate(now.getDate() - 14);

    reports.forEach(report => {
      const views = report.igViews || 0;
      totalViews += views;

      const reportDate = report.createdAt?.toDate?.() || new Date(report.date);

      if (reportDate >= weekStart) {
        weeklyViews += views;
      } else if (reportDate >= prevWeekStart && reportDate < weekStart) {
        previousWeekViews += views;
      }
    });

    // ストリーク計算
    const { currentStreak } = calculateStreak(reports);

    return {
      totalViews,
      totalReports: reports.length,
      currentStreak,
      weeklyViews,
      previousWeekViews,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return {
      totalViews: 0,
      totalReports: 0,
      currentStreak: 0,
      weeklyViews: 0,
      previousWeekViews: 0,
    };
  }
}

// ストリーク計算のインポート
function calculateStreak(reports: Report[]): { currentStreak: number; longestStreak: number } {
  if (reports.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedReports = [...reports].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let expectedDate = new Date(today);

  for (const report of sortedReports) {
    const reportDate = new Date(report.date);
    reportDate.setHours(0, 0, 0, 0);

    if (reportDate.getTime() === expectedDate.getTime()) {
      tempStreak++;
      if (currentStreak === 0 || tempStreak === currentStreak + 1) {
        currentStreak = tempStreak;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (reportDate < expectedDate) {
      if (currentStreak === 0) {
        currentStreak = 0;
      }
      tempStreak = 1;
      expectedDate = new Date(reportDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

// =====================================
// 🛡️ 守護神システム v2.0 - CRUD関数
// =====================================

/**
 * ユーザーの守護神プロファイルを取得（v2.0）
 * 既存ユーザーの unlockedStages マイグレーションも自動実行
 */
export async function getUserGuardianProfile(userId: string): Promise<UserGuardianProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();

    // v2.0プロファイルが存在すれば返す
    if (userData.guardianProfile) {
      const profile = userData.guardianProfile as UserGuardianProfile;

      // マイグレーション: unlockedStages がない守護神に追加
      let needsMigration = false;
      for (const guardianId of Object.keys(profile.guardians) as GuardianId[]) {
        const guardian = profile.guardians[guardianId];
        if (guardian && guardian.unlocked && !guardian.unlockedStages) {
          // 現在のstageまでを全て解放済みとして設定
          guardian.unlockedStages = Array.from(
            { length: guardian.stage + 1 },
            (_, i) => i as 0 | 1 | 2 | 3 | 4
          );
          needsMigration = true;
        }
      }

      // マイグレーションが必要な場合は保存
      if (needsMigration) {
        await setDoc(doc(db, "users", userId), {
          guardianProfile: profile
        }, { merge: true });
        console.log(`✅ ユーザー ${userId} の unlockedStages をマイグレーションしました`);
      }

      return profile;
    }

    // 存在しない場合は新規作成
    const newProfile = createNewUserProfile();
    return newProfile;
  } catch (error) {
    console.error("Error fetching guardian profile:", error);
    return null;
  }
}

/**
 * 🔧 N+1問題解決: 複数ユーザーの守護神プロファイルを一括取得
 * Firestoreの`in`クエリ制限(10件)に対応し、バッチ処理で取得
 *
 * @param userIds ユーザーIDの配列
 * @returns { userId: UserGuardianProfile } の形式のオブジェクト
 */
export async function getBulkUserGuardianProfiles(
  userIds: string[]
): Promise<{ [userId: string]: UserGuardianProfile }> {
  const profiles: { [userId: string]: UserGuardianProfile } = {};

  if (userIds.length === 0) return profiles;

  try {
    // Firestoreの`in`クエリは最大10件までなので、10件ずつバッチ処理
    const batchSize = 10;
    const batches: string[][] = [];

    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }

    // 各バッチを並列処理
    await Promise.all(
      batches.map(async (batch) => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("__name__", "in", batch));
        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.guardianProfile) {
            profiles[doc.id] = userData.guardianProfile as UserGuardianProfile;
          } else {
            // プロファイルがない場合は新規作成
            profiles[doc.id] = createNewUserProfile();
          }
        });
      })
    );

    return profiles;
  } catch (error) {
    console.error("Error fetching bulk guardian profiles:", error);
    return profiles;
  }
}

/**
 * ユーザーの守護神プロファイルを更新（v2.0）
 */
export async function updateUserGuardianProfile(
  userId: string,
  profile: Partial<UserGuardianProfile>
): Promise<void> {
  await setDoc(doc(db, "users", userId), {
    guardianProfile: profile
  }, { merge: true });
}

/**
 * ユーザープロフィール（性別・年齢）を設定（v2.0）
 */
export async function setUserDemographics(
  userId: string,
  gender: Gender,
  ageGroup: AgeGroup
): Promise<void> {
  const currentProfile = await getUserGuardianProfile(userId);
  const updatedProfile: UserGuardianProfile = currentProfile || createNewUserProfile();

  updatedProfile.gender = gender;
  updatedProfile.ageGroup = ageGroup;

  await setDoc(doc(db, "users", userId), {
    guardianProfile: updatedProfile,
    gender,  // 後方互換性のため
    ageGroup,  // 後方互換性のため
    profileCompleted: true
  }, { merge: true });
}

/**
 * 守護神を解放（v2.0）
 */
export async function unlockGuardian(
  userId: string,
  guardianId: GuardianId,
  energyCost: number = 0
): Promise<{ success: boolean; message: string }> {
  try {
    const profile = await getUserGuardianProfile(userId);
    if (!profile) {
      return { success: false, message: "ユーザープロファイルが見つかりません" };
    }

    // 解放可能かチェック
    const canUnlock = canUnlockGuardian(guardianId, profile);
    if (!canUnlock.canUnlock) {
      return { success: false, message: canUnlock.reason || "解放できません" };
    }

    // エナジー消費
    if (energyCost > 0 && profile.energy.current < energyCost) {
      return { success: false, message: `エナジーが足りません（${energyCost}必要）` };
    }

    // 守護神インスタンス作成
    const instance = createGuardianInstance(guardianId);

    // プロファイル更新
    profile.guardians[guardianId] = instance;
    profile.energy.current -= energyCost;

    // 最初の守護神の場合、アクティブに設定
    if (!profile.activeGuardianId) {
      profile.activeGuardianId = guardianId;
    }

    await updateUserGuardianProfile(userId, profile);

    return {
      success: true,
      message: `${GUARDIANS[guardianId].name}を解放しました！`
    };
  } catch (error) {
    console.error("Error unlocking guardian:", error);
    return { success: false, message: "エラーが発生しました" };
  }
}

/**
 * 守護神にエナジーを投資（v2.0）
 */
export async function investGuardianEnergy(
  userId: string,
  guardianId: GuardianId,
  amount: number
): Promise<{ success: boolean; evolved: boolean; previousStage: number; newStage: number; message: string }> {
  try {
    const profile = await getUserGuardianProfile(userId);
    if (!profile) {
      return { success: false, evolved: false, previousStage: 0, newStage: 0, message: "プロファイルが見つかりません" };
    }

    const guardian = profile.guardians[guardianId];
    if (!guardian || !guardian.unlocked) {
      return { success: false, evolved: false, previousStage: 0, newStage: 0, message: "この守護神は解放されていません" };
    }

    // エナジーチェック
    if (profile.energy.current < amount) {
      return { success: false, evolved: false, previousStage: guardian.stage, newStage: guardian.stage, message: "エナジーが足りません" };
    }

    // 投資実行
    const { investEnergy } = await import("./energy-system");
    const result = investEnergy(guardian, amount, profile.energy.current);

    if (!result.success) {
      return {
        success: false,
        evolved: false,
        previousStage: guardian.stage,
        newStage: guardian.stage,
        message: result.message
      };
    }

    // プロファイル更新
    profile.guardians[guardianId] = result.newGuardian;
    profile.energy.current = result.remainingEnergy;

    await updateUserGuardianProfile(userId, profile);

    return {
      success: true,
      evolved: result.evolved,
      previousStage: result.previousStage,
      newStage: result.newStage,
      message: result.message
    };
  } catch (error) {
    console.error("Error investing energy:", error);
    return { success: false, evolved: false, previousStage: 0, newStage: 0, message: "エラーが発生しました" };
  }
}

/**
 * 報告完了時のエナジー獲得処理（v2.0）
 */
export async function processReportWithEnergy(
  userId: string
): Promise<{ energyEarned: number; messages: string[] }> {
  try {
    console.log("📊 processReportWithEnergy: 開始", { userId });

    const profile = await getUserGuardianProfile(userId);
    if (!profile) {
      console.log("⚠️ プロファイルが見つかりません");
      return { energyEarned: 0, messages: [] };
    }
    console.log("✅ プロファイル取得成功");

    const { processReportCompletion } = await import("./energy-system");
    const { recordEnergyHistory } = await import("./energy-history");
    const result = processReportCompletion(profile);
    console.log("✅ エナジー計算完了", { totalEnergy: result.energyEarned.totalEnergy });

    // プロファイル更新
    profile.energy = result.newEnergyData;
    profile.streak = result.newStreakData;

    try {
      await updateUserGuardianProfile(userId, profile);
      console.log("✅ プロファイル更新成功");
    } catch (profileError) {
      console.error("❌ プロファイル更新エラー:", profileError);
      throw profileError;
    }

    // エナジー履歴を記録（成長の記録用）
    const today = new Date().toISOString().split('T')[0];
    try {
      await recordEnergyHistory(
        userId,
        today,
        result.historyData.breakdown,
        result.historyData.streakDay
      );
      console.log("✅ エナジー履歴記録成功");
    } catch (historyError) {
      console.error("❌ エナジー履歴記録エラー:", historyError);
      // 履歴記録に失敗してもエナジー自体は獲得済みなので続行
    }

    return {
      energyEarned: result.energyEarned.totalEnergy,
      messages: result.messages
    };
  } catch (error) {
    console.error("❌ Error processing report:", error);
    return { energyEarned: 0, messages: [] };
  }
}

/**
 * アクティブな守護神を切り替え（v2.0）
 */
export async function switchActiveGuardian(
  userId: string,
  guardianId: GuardianId
): Promise<{ success: boolean; message: string }> {
  try {
    const profile = await getUserGuardianProfile(userId);
    if (!profile) {
      return { success: false, message: "プロファイルが見つかりません" };
    }

    const guardian = profile.guardians[guardianId];
    if (!guardian || !guardian.unlocked) {
      return { success: false, message: "この守護神は解放されていません" };
    }

    profile.activeGuardianId = guardianId;
    await updateUserGuardianProfile(userId, profile);

    return {
      success: true,
      message: `${GUARDIANS[guardianId].name}をアクティブにしました`
    };
  } catch (error) {
    console.error("Error switching guardian:", error);
    return { success: false, message: "エラーが発生しました" };
  }
}

/**
 * 守護神のメモを更新（v2.0）
 */
export async function updateGuardianMemo(
  userId: string,
  guardianId: GuardianId,
  memo: string
): Promise<{ success: boolean; message: string }> {
  try {
    const profile = await getUserGuardianProfile(userId);
    if (!profile) {
      return { success: false, message: "プロファイルが見つかりません" };
    }

    const guardian = profile.guardians[guardianId];
    if (!guardian || !guardian.unlocked) {
      return { success: false, message: "この守護神は解放されていません" };
    }

    // メモを更新
    guardian.memo = memo;
    await updateUserGuardianProfile(userId, profile);

    return {
      success: true,
      message: "メモを保存しました"
    };
  } catch (error) {
    console.error("Error updating guardian memo:", error);
    return { success: false, message: "エラーが発生しました" };
  }
}

/**
 * プロファイル初期化済みかチェック（v2.0）
 */
export async function isGuardianProfileInitialized(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    return userData.guardianProfile !== undefined &&
      userData.guardianProfile.gender !== undefined;
  } catch (error) {
    console.error("Error checking profile:", error);
    return false;
  }
}

/**
 * 守護神を保有しているかチェック（v2.0）
 */
export async function hasAnyGuardian(userId: string): Promise<boolean> {
  try {
    const profile = await getUserGuardianProfile(userId);
    if (!profile) return false;

    return Object.values(profile.guardians).some(g => g?.unlocked);
  } catch (error) {
    console.error("Error checking guardians:", error);
    return false;
  }
}

// =====================================
// 👁️ ピアプレッシャーシステム（Phase 2）
// =====================================

/**
 * ユーザーの過去7日間のレポート履歴を取得
 */
export async function getUserRecentReports(userId: string, days: number = 7): Promise<Report[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const q = query(
      collection(db, "reports"),
      where("userId", "==", userId),
      where("date", ">=", startDateStr),
      orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    const reports: Report[] = [];
    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() } as Report);
    });

    return reports;
  } catch (error) {
    console.error("Error fetching recent reports:", error);
    return [];
  }
}

// =====================================
// 🔧 C-1: followerGrowth差分計算修正
// =====================================

/**
 * 前回レポートからフォロワー数（ストック値）を取得
 * 
 * followerGrowthを「累計」ではなく「前回比の増分」として計算するため、
 * 前回報告時のストック値を取得する関数。
 * 
 * ⚠️ 重要: この関数は「真実の数値」実現の中核
 * - 10,000フォロワーの人が毎日10,000人増扱いされるバグを修正
 * - 公平性を完全に担保
 * 
 * @param userId ユーザーID
 * @returns 前回のストック値（初回報告時は全て0）
 */
export async function getPreviousFollowerCounts(
  userId: string
): Promise<{
  igFollowers: number;
  ytFollowers: number;
  tiktokFollowers: number;
  xFollowers: number;
} | null> {
  try {
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // 初回報告: 全て0から始まる
      return {
        igFollowers: 0,
        ytFollowers: 0,
        tiktokFollowers: 0,
        xFollowers: 0
      };
    }

    const lastReport = snapshot.docs[0].data() as Report;

    // 前回のストック値を取得
    // ⚠️ 現在のスキーマでは*Followersに直接ストック値が入っている可能性があるため、
    //    将来的に*FollowersStock フィールドに移行する
    return {
      igFollowers: lastReport.igFollowers || 0,
      ytFollowers: lastReport.ytFollowers || 0,
      tiktokFollowers: lastReport.tiktokFollowers || 0,
      xFollowers: lastReport.xFollowers || 0
    };
  } catch (error) {
    console.error('前回フォロワー数取得エラー:', error);
    return null;
  }
}

/**
 * 異常値検知（ピアプレッシャー用）
 */
export interface AnomalyFlags {
  highEnergyLowOutput: boolean;      // エナジー高いが成果低い
  frequentModification: boolean;     // 修正頻度が異常
  inconsistentGrowth: boolean;       // 成長が不自然
  suspiciousPattern: boolean;        // 怪しいパターン
}

export function detectAnomalies(
  reports: Report[],
  energy: number,
  guardianStage: number
): AnomalyFlags {
  const flags: AnomalyFlags = {
    highEnergyLowOutput: false,
    frequentModification: false,
    inconsistentGrowth: false,
    suspiciousPattern: false,
  };

  if (reports.length === 0) return flags;

  // 1. エナジーと成果の比率チェック
  const avgViews = reports.reduce((sum, r) => sum + (r.igViews || 0), 0) / reports.length;
  const avgPosts = reports.reduce((sum, r) => sum + ((r.igPosts || 0) + (r.ytPosts || 0) + (r.tiktokPosts || 0) + (r.postCount || 0)), 0) / reports.length;

  // Stage 3以上で高エナジーなのに成果が低い
  if (guardianStage >= 3 && energy > 300 && avgViews < 1000 && avgPosts < 2) {
    flags.highEnergyLowOutput = true;
  }

  // 2. 修正頻度チェック
  const modifyCount = reports.reduce((sum, r) => sum + ((r as any).modifyCount || 0), 0);
  if (modifyCount > reports.length * 2) {
    flags.frequentModification = true;
  }

  // 3. 成長パターンチェック（急激な変化）
  if (reports.length >= 3) {
    const recent = reports.slice(0, 3);
    const older = reports.slice(3, 6);

    if (older.length > 0) {
      const recentAvg = recent.reduce((sum, r) => sum + (r.igViews || r.postCount || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, r) => sum + (r.igViews || r.postCount || 0), 0) / older.length;

      // 3倍以上の急激な増加
      if (recentAvg > olderAvg * 3 && olderAvg > 0) {
        flags.inconsistentGrowth = true;
      }
    }
  }

  // 4. 怪しいパターン（すべての数値が同じ等）
  const allSame = reports.every(r =>
    (r.igViews || 0) === (reports[0].igViews || 0)
  );
  if (allSame && reports.length >= 3) {
    flags.suspiciousPattern = true;
  }

  return flags;
}

// =====================================
// 🔒 デイリーロックシステム（Phase 1）
// =====================================

/**
 * 今日のレポートを取得（1日1回制限チェック用）
 */
export async function getTodayReport(userId: string, date: string): Promise<Report | null> {
  try {
    const q = query(
      collection(db, "reports"),
      where("userId", "==", userId),
      where("date", "==", date)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Report;
  } catch (error) {
    console.error("Error fetching today's report:", error);
    return null;
  }
}

/**
 * ユーザーの最新のレポートを取得
 */
export async function getLastReport(userId: string): Promise<Report | null> {
  try {
    const q = query(
      collection(db, "reports"),
      where("userId", "==", userId),
      orderBy("date", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Report;
  } catch (error) {
    console.error("Error fetching last report:", error);
    return null;
  }
}

/**
 * レポートを更新（修正モード用）
 */
export async function updateReport(
  reportId: string,
  updates: Partial<Report>
): Promise<{ success: boolean; message: string }> {
  try {
    const reportRef = doc(db, "reports", reportId);
    const reportDoc = await getDoc(reportRef);

    if (!reportDoc.exists()) {
      return { success: false, message: "レポートが見つかりません" };
    }

    const currentData = reportDoc.data();
    const modifyCount = (currentData.modifyCount || 0) + 1;

    await setDoc(reportRef, {
      ...updates,
      modifyCount,
      modifiedAt: serverTimestamp(),
    }, { merge: true });

    return {
      success: true,
      message: modifyCount >= 3
        ? "⚠️ 守護神が不信感を抱いています"
        : "レポートを修正しました"
    };
  } catch (error) {
    console.error("Error updating report:", error);
    return { success: false, message: "更新に失敗しました" };
  }
}

// =====================================
// 🔄 後方互換性関数（旧バージョン用）
// =====================================

/**
 * @deprecated v2.0ではgetUserGuardianProfileを使用してください
 */
export async function hasGuardian(userId: string): Promise<boolean> {
  return hasAnyGuardian(userId);
}

/**
 * @deprecated v2.0ではisGuardianProfileInitializedを使用してください
 */
export async function isProfileCompleted(userId: string): Promise<boolean> {
  return isGuardianProfileInitialized(userId);
}

// =====================================
// ⚠️ ペナルティシステム（Phase 6）
// =====================================

export interface PenaltyStatus {
  isPenalized: boolean;
  isCursed: boolean;              // 守護神が呪われている（赤化）
  penaltyReason?: string;
  penalizedAt?: Timestamp;
  penalizedBy?: string;           // 管理者UID
  energyConfiscated?: number;     // 没収されたエナジー
  wasReset: boolean;              // Stage 0にリセットされた
}

/**
 * ユーザーにペナルティを適用
 */
export async function applyPenalty(
  userId: string,
  adminUid: string,
  reason: string,
  options: {
    confiscateEnergy?: number;    // 没収するエナジー量
    resetGuardian?: boolean;      // Stage 0にリセットするか
    curseGuardian?: boolean;      // 守護神を呪うか
  } = {}
): Promise<{ success: boolean; message: string }> {
  try {
    const profile = await getUserGuardianProfile(userId);
    if (!profile) {
      return { success: false, message: "ユーザープロファイルが見つかりません" };
    }

    const penalty: PenaltyStatus = {
      isPenalized: true,
      isCursed: options.curseGuardian || false,
      penaltyReason: reason,
      penalizedAt: Timestamp.now(),
      penalizedBy: adminUid,
      energyConfiscated: options.confiscateEnergy || 0,
      wasReset: options.resetGuardian || false,
    };

    // エナジー没収
    if (options.confiscateEnergy && options.confiscateEnergy > 0) {
      profile.energy.current = Math.max(0, profile.energy.current - options.confiscateEnergy);
    }

    // 守護神リセット
    if (options.resetGuardian && profile.activeGuardianId) {
      const activeGuardian = profile.guardians[profile.activeGuardianId as keyof typeof profile.guardians];
      if (activeGuardian) {
        activeGuardian.stage = 0;
        activeGuardian.investedEnergy = 0;
      }
    }

    // 守護神を呪う
    if (options.curseGuardian && profile.activeGuardianId) {
      const activeGuardian = profile.guardians[profile.activeGuardianId as keyof typeof profile.guardians];
      if (activeGuardian) {
        (activeGuardian as any).isCursed = true;
      }
    }

    // プロファイル更新
    await setDoc(doc(db, "users", userId), {
      guardianProfile: profile,
      penaltyStatus: penalty,
      status: "suspended",  // ユーザーを停止状態に
    }, { merge: true });

    return {
      success: true,
      message: `ペナルティを適用しました: ${reason}`,
    };
  } catch (error) {
    console.error("Error applying penalty:", error);
    return { success: false, message: "ペナルティ適用に失敗しました" };
  }
}

/**
 * ペナルティを解除
 */
export async function removePenalty(
  userId: string,
  adminUid: string
): Promise<{ success: boolean; message: string }> {
  try {
    const profile = await getUserGuardianProfile(userId);
    if (!profile) {
      return { success: false, message: "ユーザープロファイルが見つかりません" };
    }

    // 呪いを解除
    if (profile.activeGuardianId) {
      const activeGuardian = profile.guardians[profile.activeGuardianId as keyof typeof profile.guardians];
      if (activeGuardian) {
        (activeGuardian as any).isCursed = false;
      }
    }

    await setDoc(doc(db, "users", userId), {
      guardianProfile: profile,
      penaltyStatus: {
        isPenalized: false,
        isCursed: false,
        wasReset: false,
      },
      status: "approved",  // ユーザーを復帰
    }, { merge: true });

    return {
      success: true,
      message: "ペナルティを解除しました",
    };
  } catch (error) {
    console.error("Error removing penalty:", error);
    return { success: false, message: "ペナルティ解除に失敗しました" };
  }
}

/**
 * ペナルティステータスを取得
 */
export async function getPenaltyStatus(userId: string): Promise<PenaltyStatus | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    return (userData.penaltyStatus as PenaltyStatus) || {
      isPenalized: false,
      isCursed: false,
      wasReset: false,
    };
  } catch (error) {
    console.error("Error fetching penalty status:", error);
    return null;
  }
}

/**
 * 虚偽報告フラグを設定
 */
export async function markAsFalseReport(
  userId: string,
  adminUid: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    await setDoc(doc(db, "users", userId), {
      falseReportFlag: {
        flagged: true,
        reason,
        flaggedAt: Timestamp.now(),
        flaggedBy: adminUid,
      },
    }, { merge: true });

    return {
      success: true,
      message: "虚偽報告フラグを設定しました",
    };
  } catch (error) {
    console.error("Error marking false report:", error);
    return { success: false, message: "フラグ設定に失敗しました" };
  }
}

/**
 * 虚偽報告フラグを解除
 */
export async function clearFalseReportFlag(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await setDoc(doc(db, "users", userId), {
      falseReportFlag: {
        flagged: false,
      },
    }, { merge: true });

    return {
      success: true,
      message: "虚偽報告フラグを解除しました",
    };
  } catch (error) {
    console.error("Error clearing false report flag:", error);
    return { success: false, message: "フラグ解除に失敗しました" };
  }
}

// ========================================
// 🆕 エラーログ管理
// ========================================

export interface ErrorLog {
  id: string;
  timestamp: Timestamp;
  level: "error" | "warning" | "info";
  source: string; // ページ名やコンポーネント名
  message: string;
  stack?: string;
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

/**
 * エラーログを記録
 */
export async function logError(
  level: "error" | "warning" | "info",
  source: string,
  message: string,
  options?: {
    stack?: string;
    userId?: string;
    userEmail?: string;
    additionalData?: Record<string, any>;
  }
): Promise<void> {
  try {
    const errorLogRef = doc(collection(db, "errorLogs"));

    const logData: Omit<ErrorLog, "id"> = {
      timestamp: Timestamp.now(),
      level,
      source,
      message,
      stack: options?.stack,
      userId: options?.userId,
      userEmail: options?.userEmail,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      additionalData: options?.additionalData,
    };

    await setDoc(errorLogRef, logData);
  } catch (error) {
    console.error("Failed to log error to Firestore:", error);
  }
}

/**
 * エラーログを取得（最新N件）
 */
export async function getErrorLogs(limitCount: number = 100): Promise<ErrorLog[]> {
  try {
    const q = query(
      collection(db, "errorLogs"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ErrorLog));
  } catch (error) {
    console.error("Error fetching error logs:", error);
    return [];
  }
}

/**
 * 特定レベルのエラーログを取得
 */
export async function getErrorLogsByLevel(
  level: "error" | "warning" | "info",
  limitCount: number = 100
): Promise<ErrorLog[]> {
  try {
    const q = query(
      collection(db, "errorLogs"),
      where("level", "==", level),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ErrorLog));
  } catch (error) {
    console.error("Error fetching error logs by level:", error);
    return [];
  }
}

/**
 * 特定ユーザーのエラーログを取得
 */
export async function getErrorLogsByUser(
  userId: string,
  limitCount: number = 50
): Promise<ErrorLog[]> {
  try {
    const q = query(
      collection(db, "errorLogs"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ErrorLog));
  } catch (error) {
    console.error("Error fetching error logs by user:", error);
    return [];
  }
}

/**
 * エラーログを削除（古いログのクリーンアップ用）
 */
export async function deleteOldErrorLogs(daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const q = query(
      collection(db, "errorLogs"),
      where("timestamp", "<", cutoffTimestamp)
    );

    const snapshot = await getDocs(q);
    let deletedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      deletedCount++;
    }

    return deletedCount;
  } catch (error) {
    console.error("Error deleting old error logs:", error);
    return 0;
  }
}

// =====================================
// 📱 SNSアカウント設定
// =====================================

/**
 * ユーザーのSNSアカウント情報を取得
 */
export async function getUserSnsAccounts(userId: string): Promise<SnsAccounts | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data()?.snsAccounts || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching SNS accounts:", error);
    return null;
  }
}

/**
 * 個別SNSアカウントのURLを保存（承認待ち状態に設定）
 * 各SNSごとに個別の承認状態を持つ
 */
export async function saveSnsAccount(
  userId: string,
  snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x',
  url: string
): Promise<{ success: boolean; message: string }> {
  try {
    const trimmedUrl = url.trim();

    // URL形式チェック
    if (trimmedUrl && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://')) {
      return {
        success: false,
        message: `${SNS_LABELS[snsKey].label}のURLは https:// で始まる形式で入力してください`
      };
    }

    // 現在のユーザーデータを取得
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { success: false, message: "ユーザーが見つかりません" };
    }

    const currentData = userDoc.data();
    const currentSnsAccounts: SnsAccounts = currentData?.snsAccounts || {};
    const currentSnsData = currentSnsAccounts[snsKey] as SnsAccountApproval | undefined;

    // 既に承認済みの場合は変更不可
    if (currentSnsData?.status === 'approved') {
      return { success: false, message: `${SNS_LABELS[snsKey].label}は承認済みのため変更できません` };
    }

    // 新しいSNSアカウント情報
    const newSnsData: SnsAccountApproval = {
      url: trimmedUrl || undefined,
      status: trimmedUrl ? 'pending' : 'none',
      submittedAt: trimmedUrl ? serverTimestamp() as unknown as Timestamp : undefined,
    };

    // Firestoreに保存（ドット表記でネストフィールドを個別に更新）
    // merge: trueだけではネストオブジェクトは完全に置き換えられるため、
    // 明示的にネストされたキーを指定する
    await updateDoc(doc(db, "users", userId), {
      [`snsAccounts.${snsKey}`]: newSnsData
    });

    return {
      success: true,
      message: trimmedUrl
        ? `${SNS_LABELS[snsKey].label}のURLを送信しました。運営の承認をお待ちください。`
        : `${SNS_LABELS[snsKey].label}のURLを削除しました`
    };
  } catch (error) {
    console.error("Error saving SNS account:", error);
    return { success: false, message: "保存に失敗しました" };
  }
}

/**
 * 複数のSNSアカウント情報を一括保存（後方互換性のため残す）
 */
export async function saveSnsAccounts(
  userId: string,
  snsData: { instagram?: string; youtube?: string; tiktok?: string; x?: string }
): Promise<{ success: boolean; submitted: boolean; message: string }> {
  try {
    const snsKeys = ['instagram', 'youtube', 'tiktok', 'x'] as const;

    // URL形式のバリデーション
    for (const key of snsKeys) {
      const url = snsData[key]?.trim();
      if (url && !url.startsWith('https://') && !url.startsWith('http://')) {
        return {
          success: false,
          submitted: false,
          message: `${SNS_LABELS[key].label}のURLは https:// で始まる形式で入力してください`
        };
      }
    }

    // 現在のユーザーデータを取得
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { success: false, submitted: false, message: "ユーザーが見つかりません" };
    }

    const currentData = userDoc.data();
    const currentSnsAccounts: SnsAccounts = currentData?.snsAccounts || {};

    // 各SNSのデータを作成
    const updatedSnsAccounts: Partial<SnsAccounts> = {};
    let hasNewSubmission = false;

    for (const key of snsKeys) {
      const url = snsData[key]?.trim();
      const current = currentSnsAccounts[key] as SnsAccountApproval | undefined;

      // 承認済みの場合はスキップ
      if (current?.status === 'approved') {
        continue;
      }

      // URLが変更された場合、または新規入力の場合
      if (url && url !== current?.url) {
        updatedSnsAccounts[key] = {
          url,
          status: 'pending',
          submittedAt: serverTimestamp() as unknown as Timestamp,
        };
        hasNewSubmission = true;
      } else if (!url && current?.url) {
        // URLが削除された場合
        updatedSnsAccounts[key] = {
          url: undefined,
          status: 'none',
        };
      }
    }

    // 更新がある場合のみ保存
    if (Object.keys(updatedSnsAccounts).length > 0) {
      await setDoc(doc(db, "users", userId), {
        snsAccounts: updatedSnsAccounts
      }, { merge: true });
    }

    return {
      success: true,
      submitted: hasNewSubmission,
      message: hasNewSubmission
        ? "SNSプロフィールURLを送信しました。運営の承認をお待ちください。"
        : "変更はありませんでした"
    };
  } catch (error) {
    console.error("Error saving SNS accounts:", error);
    return { success: false, submitted: false, message: "保存に失敗しました" };
  }
}

/**
 * プロフィール完成ボーナスをエナジーに加算
 * 注: guardianProfileは users/{userId}/guardianProfile フィールドに保存されている
 */
async function addProfileCompletionBonus(userId: string): Promise<void> {
  try {
    // getUserGuardianProfileを使用してエナジーデータを取得
    const profile = await getUserGuardianProfile(userId);

    if (profile) {
      const currentEnergy = profile.energy?.current || 0;
      const totalEarned = profile.energy?.totalEarned || 0;

      // users/{userId}/guardianProfile.energy にエナジーを加算
      await setDoc(doc(db, "users", userId), {
        guardianProfile: {
          energy: {
            current: currentEnergy + PROFILE_COMPLETION_BONUS,
            totalEarned: totalEarned + PROFILE_COMPLETION_BONUS,
            lastEarnedAt: serverTimestamp()
          }
        }
      }, { merge: true });

      // エナジー履歴に記録（energy_history コレクションを使用 - 既存のFirestoreルールに準拠）
      const today = new Date().toISOString().split('T')[0];
      const bonusHistoryDocId = `${userId}_profile_bonus_${today}`;
      await setDoc(doc(db, "energy_history", bonusHistoryDocId), {
        userId,
        type: 'profile_completion',
        amount: PROFILE_COMPLETION_BONUS,
        description: 'プロフィール完成ボーナス',
        date: today,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error adding profile completion bonus:", error);
    throw error;
  }
}

// =====================================
// 📱 SNS承認管理機能（個別承認対応）
// =====================================

export interface PendingSnsItem {
  snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x';
  url: string;
  submittedAt: Timestamp | null;
}

export interface PendingUserSns {
  userId: string;
  userName: string;
  userEmail: string;
  team: string;
  pendingItems: PendingSnsItem[];
  snsAccounts: SnsAccounts;
}

/**
 * 承認待ちのSNSアカウント一覧を取得（個別承認対応）
 * 少なくとも1つ以上のSNSがpending状態のユーザーを取得
 */
export async function getPendingSnsApprovals(): Promise<PendingUserSns[]> {
  try {
    const usersRef = collection(db, "users");
    // 全ユーザーを取得してフィルタリング（Firestoreの制約回避）
    const snapshot = await getDocs(usersRef);

    const results: PendingUserSns[] = [];
    const snsKeys = ['instagram', 'youtube', 'tiktok', 'x'] as const;

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const snsAccounts = data.snsAccounts as SnsAccounts | undefined;
      if (!snsAccounts) return;

      const pendingItems: PendingSnsItem[] = [];

      for (const key of snsKeys) {
        const snsData = snsAccounts[key] as SnsAccountApproval | undefined;
        if (snsData?.status === 'pending' && snsData.url) {
          pendingItems.push({
            snsKey: key,
            url: snsData.url,
            submittedAt: snsData.submittedAt || null
          });
        }
      }

      if (pendingItems.length > 0) {
        results.push({
          userId: docSnap.id,
          userName: data.name || data.displayName || "名前未設定",
          userEmail: data.email || "",
          team: data.team || "未設定",
          pendingItems,
          snsAccounts
        });
      }
    });

    // 最新の申請順にソート
    results.sort((a, b) => {
      const aTime = a.pendingItems[0]?.submittedAt?.toMillis() || 0;
      const bTime = b.pendingItems[0]?.submittedAt?.toMillis() || 0;
      return bTime - aTime;
    });

    return results;
  } catch (error) {
    console.error("Error getting pending SNS approvals:", error);
    return [];
  }
}

/**
 * 個別SNSアカウントを承認
 * 全SNSが承認済みになったらボーナスを付与
 */
export async function approveSnsAccount(
  userId: string,
  snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x',
  adminUid: string
): Promise<{ success: boolean; message: string; allApproved: boolean }> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { success: false, message: "ユーザーが見つかりません", allApproved: false };
    }

    const userData = userDoc.data();
    const snsAccounts: SnsAccounts = userData?.snsAccounts || {};
    const targetSns = snsAccounts[snsKey] as SnsAccountApproval | undefined;

    if (!targetSns || targetSns.status !== 'pending') {
      return { success: false, message: `${SNS_LABELS[snsKey].label}は承認待ち状態ではありません`, allApproved: false };
    }

    // 承認状態に更新（ドット表記でネストフィールドを個別に更新）
    await updateDoc(doc(db, "users", userId), {
      [`snsAccounts.${snsKey}.status`]: 'approved',
      [`snsAccounts.${snsKey}.reviewedAt`]: serverTimestamp(),
      [`snsAccounts.${snsKey}.reviewedBy`]: adminUid
    });

    // 全SNSが承認済みかチェック
    const snsKeys = ['instagram', 'youtube', 'tiktok', 'x'] as const;
    let approvedCount = 0;

    for (const key of snsKeys) {
      const snsData = snsAccounts[key] as SnsAccountApproval | undefined;
      if (key === snsKey) {
        // 今回承認したものはapprovedとしてカウント
        approvedCount++;
      } else if (snsData?.status === 'approved') {
        approvedCount++;
      }
    }

    // 全4つが承認済みならボーナス付与
    if (approvedCount === 4 && !snsAccounts.completionBonusClaimed) {
      await updateDoc(doc(db, "users", userId), {
        'snsAccounts.profileCompleted': true,
        'snsAccounts.completionBonusClaimed': true,
        'snsAccounts.completedAt': serverTimestamp()
      });

      await addProfileCompletionBonus(userId);

      return {
        success: true,
        message: `${SNS_LABELS[snsKey].label}を承認しました。全SNS承認完了！ボーナス${PROFILE_COMPLETION_BONUS}Eを付与しました。`,
        allApproved: true
      };
    }

    return {
      success: true,
      message: `${SNS_LABELS[snsKey].label}を承認しました。`,
      allApproved: false
    };
  } catch (error) {
    console.error("Error approving SNS account:", error);
    return { success: false, message: "承認に失敗しました", allApproved: false };
  }
}

/**
 * 個別SNSアカウントを却下
 */
export async function rejectSnsAccount(
  userId: string,
  snsKey: 'instagram' | 'youtube' | 'tiktok' | 'x',
  adminUid: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { success: false, message: "ユーザーが見つかりません" };
    }

    const userData = userDoc.data();
    const snsAccounts: SnsAccounts = userData?.snsAccounts || {};
    const targetSns = snsAccounts[snsKey] as SnsAccountApproval | undefined;

    if (!targetSns || targetSns.status !== 'pending') {
      return { success: false, message: `${SNS_LABELS[snsKey].label}は承認待ち状態ではありません` };
    }

    // 却下状態に更新（ドット表記でネストフィールドを個別に更新）
    await updateDoc(doc(db, "users", userId), {
      [`snsAccounts.${snsKey}.status`]: 'rejected',
      [`snsAccounts.${snsKey}.reviewedAt`]: serverTimestamp(),
      [`snsAccounts.${snsKey}.reviewedBy`]: adminUid,
      [`snsAccounts.${snsKey}.rejectionReason`]: reason
    });

    return { success: true, message: `${SNS_LABELS[snsKey].label}を却下しました。` };
  } catch (error) {
    console.error("Error rejecting SNS account:", error);
    return { success: false, message: "却下に失敗しました" };
  }
}
