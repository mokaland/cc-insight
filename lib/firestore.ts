import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  DocumentData
} from "firebase/firestore";
import { db } from "./firebase";

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
  // X系
  postCount?: number;
  postUrls?: string[];
  likeCount?: number;
  replyCount?: number;
}

// チーム情報
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

// レポートをリアルタイムで取得
export function subscribeToReports(
  callback: (reports: Report[]) => void,
  teamId?: string
) {
  let q = query(
    collection(db, "reports"),
    orderBy("createdAt", "desc")
  );

  if (teamId) {
    q = query(
      collection(db, "reports"),
      where("team", "==", teamId),
      orderBy("createdAt", "desc")
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
  const latestFollowers: { [name: string]: { ig: number; yt: number; tiktok: number } } = {};
  
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
      stats.posts += 1; // 報告1件 = 1日分の投稿として扱う
      
      // 詳細KPI集計
      totalProfileAccess += report.igProfileAccess || 0;
      totalExternalTaps += report.igExternalTaps || 0;
      totalInteractions += report.igInteractions || 0;
      totalStories += report.weeklyStories || 0;
      
      // 最新フォロワー数を保持
      if (!latestFollowers[report.name]) {
        latestFollowers[report.name] = { ig: 0, yt: 0, tiktok: 0 };
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
    }
  });

  const members = Object.values(memberStats)
    .map((m: any) => ({
      ...m,
      achievementRate: Math.round((m.posts / (team.dailyPostGoal * 7)) * 100)
    }))
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
  Object.values(latestFollowers).forEach(f => {
    totalIgFollowers += f.ig;
    totalYtFollowers += f.yt;
    totalTiktokFollowers += f.tiktok;
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
      totalPosts += 1;
      
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
      stats.posts += 1;
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
