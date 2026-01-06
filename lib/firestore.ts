import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
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

// チーム別統計を計算
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
      members: []
    };
  }

  // メンバーごとに集計
  const memberStats: { [name: string]: any } = {};
  
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
    } else {
      stats.posts += report.postCount || 0;
      stats.likes += report.likeCount || 0;
      stats.replies += report.replyCount || 0;
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

  return {
    totalViews,
    totalImpressions,
    totalPosts,
    totalTargetPosts,
    achievementRate: totalTargetPosts > 0 ? Math.round((totalPosts / totalTargetPosts) * 100) : 0,
    memberCount: members.length,
    perfectMembers,
    members
  };
}

// 全体統計を計算
export function calculateOverallStats(reports: Report[]) {
  let totalViews = 0;
  let totalImpressions = 0;
  let totalPosts = 0;

  const memberSet = new Set<string>();

  reports.forEach(report => {
    memberSet.add(report.name);
    
    if (report.teamType === "shorts") {
      totalViews += report.igViews || 0;
      totalImpressions += report.igProfileAccess || 0;
      totalPosts += 1;
    } else {
      totalPosts += report.postCount || 0;
    }
  });

  return {
    totalViews,
    totalImpressions,
    totalPosts,
    activeMembers: memberSet.size
  };
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
