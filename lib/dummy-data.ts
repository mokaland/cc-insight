// 15人分のメンバーデータ（各チーム5人）

export type TeamType = "fukugyou" | "taishoku" | "buppan";

export interface WeeklyData {
  week: number;
  views: number;
  impressions: number;
  posts: number;
  targetPosts: number;
  likes: number;
  comments: number;
}

export interface MemberData {
  id: string;
  name: string;
  team: TeamType;
  avatar: string;
  weeklyData: WeeklyData[];
  dailyPostGoal: number; // 1日あたりの投稿目標
}

export interface TeamInfo {
  id: TeamType;
  name: string;
  color: string;
  gradient: string;
  dailyPostGoal: number;
}

export const teams: TeamInfo[] = [
  {
    id: "fukugyou",
    name: "副業チーム",
    color: "#ec4899",
    gradient: "from-pink-500 to-rose-500",
    dailyPostGoal: 3, // 1日3投稿目標
  },
  {
    id: "taishoku",
    name: "退職チーム",
    color: "#06b6d4",
    gradient: "from-cyan-500 to-blue-500",
    dailyPostGoal: 2, // 1日2投稿目標
  },
  {
    id: "buppan",
    name: "物販チーム",
    color: "#eab308",
    gradient: "from-yellow-500 to-orange-500",
    dailyPostGoal: 5, // 1日5投稿目標
  },
];

// 各チーム5人、合計15人のダミーデータ
export const members: MemberData[] = [
  // 副業チーム（5人）
  {
    id: "f1",
    name: "田中太郎",
    team: "fukugyou",
    avatar: "🧑‍💼",
    dailyPostGoal: 3,
    weeklyData: [
      { week: 1, views: 23456, impressions: 56789, posts: 21, targetPosts: 21, likes: 1234, comments: 89 },
      { week: 2, views: 28901, impressions: 62345, posts: 20, targetPosts: 21, likes: 1456, comments: 102 },
      { week: 3, views: 19876, impressions: 48901, posts: 19, targetPosts: 21, likes: 1123, comments: 76 },
      { week: 4, views: 17001, impressions: 66234, posts: 21, targetPosts: 21, likes: 1567, comments: 115 },
    ],
  },
  {
    id: "f2",
    name: "佐藤花子",
    team: "fukugyou",
    avatar: "👩‍💻",
    dailyPostGoal: 3,
    weeklyData: [
      { week: 1, views: 19234, impressions: 45678, posts: 18, targetPosts: 21, likes: 987, comments: 67 },
      { week: 2, views: 21567, impressions: 51234, posts: 21, targetPosts: 21, likes: 1234, comments: 89 },
      { week: 3, views: 24890, impressions: 58901, posts: 20, targetPosts: 21, likes: 1345, comments: 98 },
      { week: 4, views: 10852, impressions: 49876, posts: 17, targetPosts: 21, likes: 1098, comments: 72 },
    ],
  },
  {
    id: "f3",
    name: "山田一郎",
    team: "fukugyou",
    avatar: "👨‍🔧",
    dailyPostGoal: 3,
    weeklyData: [
      { week: 1, views: 15678, impressions: 38901, posts: 15, targetPosts: 21, likes: 789, comments: 45 },
      { week: 2, views: 18234, impressions: 42567, posts: 19, targetPosts: 21, likes: 923, comments: 58 },
      { week: 3, views: 16789, impressions: 40123, posts: 17, targetPosts: 21, likes: 856, comments: 52 },
      { week: 4, views: 14731, impressions: 44890, posts: 16, targetPosts: 21, likes: 912, comments: 61 },
    ],
  },
  {
    id: "f4",
    name: "鈴木美咲",
    team: "fukugyou",
    avatar: "👩‍🎨",
    dailyPostGoal: 3,
    weeklyData: [
      { week: 1, views: 12345, impressions: 32109, posts: 14, targetPosts: 21, likes: 654, comments: 38 },
      { week: 2, views: 14567, impressions: 36789, posts: 16, targetPosts: 21, likes: 745, comments: 44 },
      { week: 3, views: 13890, impressions: 34567, posts: 15, targetPosts: 21, likes: 701, comments: 41 },
      { week: 4, views: 8519, impressions: 38901, posts: 18, targetPosts: 21, likes: 823, comments: 49 },
    ],
  },
  {
    id: "f5",
    name: "高橋健一",
    team: "fukugyou",
    avatar: "🧔",
    dailyPostGoal: 3,
    weeklyData: [
      { week: 1, views: 9876, impressions: 25678, posts: 12, targetPosts: 21, likes: 512, comments: 29 },
      { week: 2, views: 11234, impressions: 28901, posts: 14, targetPosts: 21, likes: 589, comments: 35 },
      { week: 3, views: 10567, impressions: 27234, posts: 13, targetPosts: 21, likes: 545, comments: 32 },
      { week: 4, views: 8533, impressions: 30123, posts: 15, targetPosts: 21, likes: 623, comments: 37 },
    ],
  },

  // 退職チーム（5人）
  {
    id: "t1",
    name: "伊藤雄介",
    team: "taishoku",
    avatar: "🧑‍⚕️",
    dailyPostGoal: 2,
    weeklyData: [
      { week: 1, views: 18234, impressions: 52345, posts: 14, targetPosts: 14, likes: 1023, comments: 71 },
      { week: 2, views: 21456, impressions: 58901, posts: 14, targetPosts: 14, likes: 1189, comments: 84 },
      { week: 3, views: 16789, impressions: 47234, posts: 13, targetPosts: 14, likes: 934, comments: 62 },
      { week: 4, views: 15977, impressions: 53867, posts: 14, targetPosts: 14, likes: 1067, comments: 78 },
    ],
  },
  {
    id: "t2",
    name: "渡辺さくら",
    team: "taishoku",
    avatar: "👩‍🏫",
    dailyPostGoal: 2,
    weeklyData: [
      { week: 1, views: 16789, impressions: 47890, posts: 13, targetPosts: 14, likes: 912, comments: 63 },
      { week: 2, views: 18901, impressions: 52345, posts: 14, targetPosts: 14, likes: 1034, comments: 72 },
      { week: 3, views: 15234, impressions: 43678, posts: 12, targetPosts: 14, likes: 823, comments: 56 },
      { week: 4, views: 17310, impressions: 49012, posts: 13, targetPosts: 14, likes: 945, comments: 67 },
    ],
  },
  {
    id: "t3",
    name: "中村優子",
    team: "taishoku",
    avatar: "👩‍💼",
    dailyPostGoal: 2,
    weeklyData: [
      { week: 1, views: 14567, impressions: 41234, posts: 11, targetPosts: 14, likes: 789, comments: 51 },
      { week: 2, views: 16234, impressions: 45678, posts: 13, targetPosts: 14, likes: 878, comments: 59 },
      { week: 3, views: 13890, impressions: 39012, posts: 10, targetPosts: 14, likes: 723, comments: 46 },
      { week: 4, views: 15783, impressions: 43456, posts: 12, targetPosts: 14, likes: 834, comments: 55 },
    ],
  },
  {
    id: "t4",
    name: "小林大輔",
    team: "taishoku",
    avatar: "🧑‍🔬",
    dailyPostGoal: 2,
    weeklyData: [
      { week: 1, views: 12345, impressions: 35678, posts: 10, targetPosts: 14, likes: 656, comments: 42 },
      { week: 2, views: 13890, impressions: 38901, posts: 11, targetPosts: 14, likes: 734, comments: 48 },
      { week: 3, views: 11567, impressions: 33234, posts: 9, targetPosts: 14, likes: 601, comments: 38 },
      { week: 4, views: 12958, impressions: 36789, posts: 10, targetPosts: 14, likes: 678, comments: 44 },
    ],
  },
  {
    id: "t5",
    name: "加藤恵",
    team: "taishoku",
    avatar: "👩‍🎤",
    dailyPostGoal: 2,
    weeklyData: [
      { week: 1, views: 10234, impressions: 29876, posts: 8, targetPosts: 14, likes: 534, comments: 34 },
      { week: 2, views: 11567, impressions: 32109, posts: 9, targetPosts: 14, likes: 598, comments: 38 },
      { week: 3, views: 9890, impressions: 27654, posts: 7, targetPosts: 14, likes: 489, comments: 31 },
      { week: 4, views: 10987, impressions: 30456, posts: 9, targetPosts: 14, likes: 567, comments: 36 },
    ],
  },

  // 物販チーム（5人）
  {
    id: "b1",
    name: "木村翔太",
    team: "buppan",
    avatar: "🧑‍🚀",
    dailyPostGoal: 5,
    weeklyData: [
      { week: 1, views: 21456, impressions: 61234, posts: 35, targetPosts: 35, likes: 1189, comments: 82 },
      { week: 2, views: 24890, impressions: 68901, posts: 34, targetPosts: 35, likes: 1345, comments: 94 },
      { week: 3, views: 19234, impressions: 55678, posts: 32, targetPosts: 35, likes: 1056, comments: 71 },
      { week: 4, views: 19852, impressions: 59012, posts: 35, targetPosts: 35, likes: 1234, comments: 86 },
    ],
  },
  {
    id: "b2",
    name: "斎藤麻衣",
    team: "buppan",
    avatar: "👩‍🚒",
    dailyPostGoal: 5,
    weeklyData: [
      { week: 1, views: 19876, impressions: 56789, posts: 33, targetPosts: 35, likes: 1078, comments: 74 },
      { week: 2, views: 22345, impressions: 62109, posts: 35, targetPosts: 35, likes: 1223, comments: 85 },
      { week: 3, views: 17890, impressions: 51234, posts: 30, targetPosts: 35, likes: 967, comments: 65 },
      { week: 4, views: 18790, impressions: 54567, posts: 32, targetPosts: 35, likes: 1045, comments: 72 },
    ],
  },
  {
    id: "b3",
    name: "松本健太郎",
    team: "buppan",
    avatar: "👨‍🍳",
    dailyPostGoal: 5,
    weeklyData: [
      { week: 1, views: 17234, impressions: 49012, posts: 28, targetPosts: 35, likes: 934, comments: 62 },
      { week: 2, views: 19567, impressions: 54321, posts: 31, targetPosts: 35, likes: 1056, comments: 71 },
      { week: 3, views: 15890, impressions: 45678, posts: 26, targetPosts: 35, likes: 856, comments: 56 },
      { week: 4, views: 16543, impressions: 47890, posts: 29, targetPosts: 35, likes: 912, comments: 61 },
    ],
  },
  {
    id: "b4",
    name: "井上美優",
    team: "buppan",
    avatar: "👩‍🔧",
    dailyPostGoal: 5,
    weeklyData: [
      { week: 1, views: 14567, impressions: 41234, posts: 25, targetPosts: 35, likes: 789, comments: 51 },
      { week: 2, views: 16890, impressions: 47012, posts: 28, targetPosts: 35, likes: 912, comments: 60 },
      { week: 3, views: 13234, impressions: 38567, posts: 23, targetPosts: 35, likes: 712, comments: 46 },
      { week: 4, views: 14226, impressions: 40890, posts: 26, targetPosts: 35, likes: 823, comments: 53 },
    ],
  },
  {
    id: "b5",
    name: "森田大地",
    team: "buppan",
    avatar: "🧑‍🎓",
    dailyPostGoal: 5,
    weeklyData: [
      { week: 1, views: 11890, impressions: 34567, posts: 22, targetPosts: 35, likes: 645, comments: 41 },
      { week: 2, views: 13567, impressions: 38901, posts: 24, targetPosts: 35, likes: 734, comments: 47 },
      { week: 3, views: 10234, impressions: 30123, posts: 19, targetPosts: 35, likes: 567, comments: 35 },
      { week: 4, views: 11441, impressions: 33456, posts: 21, targetPosts: 35, likes: 623, comments: 40 },
    ],
  },
];

// 期間タイプ
export type PeriodType = "week" | "month" | "q1" | "q2" | "q3" | "q4";

// 期間オプション
export const periodOptions = [
  { id: "week", label: "今週" },
  { id: "month", label: "今月" },
  { id: "q1", label: "1Q" },
  { id: "q2", label: "2Q" },
  { id: "q3", label: "3Q" },
  { id: "q4", label: "4Q" },
];

// ヘルパー関数: チームごとのメンバーを取得
export function getMembersByTeam(team: TeamType): MemberData[] {
  return members.filter((m) => m.team === team);
}

// ヘルパー関数: メンバーの合計統計を計算（期間に基づく）
export function getMemberStats(member: MemberData, period: PeriodType) {
  let relevantData: WeeklyData[];

  switch (period) {
    case "week":
      relevantData = [member.weeklyData[member.weeklyData.length - 1]]; // 最新週
      break;
    case "month":
      relevantData = member.weeklyData; // 全4週
      break;
    case "q1":
    case "q2":
    case "q3":
    case "q4":
      // Q期間は月次データを3倍にシミュレート
      relevantData = member.weeklyData.map((w) => ({
        ...w,
        views: w.views * 3,
        impressions: w.impressions * 3,
        posts: w.posts * 3,
        targetPosts: w.targetPosts * 3,
        likes: w.likes * 3,
        comments: w.comments * 3,
      }));
      break;
    default:
      relevantData = member.weeklyData;
  }

  const totalViews = relevantData.reduce((sum, w) => sum + w.views, 0);
  const totalImpressions = relevantData.reduce((sum, w) => sum + w.impressions, 0);
  const totalPosts = relevantData.reduce((sum, w) => sum + w.posts, 0);
  const totalTargetPosts = relevantData.reduce((sum, w) => sum + w.targetPosts, 0);
  const totalLikes = relevantData.reduce((sum, w) => sum + w.likes, 0);
  const totalComments = relevantData.reduce((sum, w) => sum + w.comments, 0);
  const achievementRate = Math.round((totalPosts / totalTargetPosts) * 100);

  return {
    views: totalViews,
    impressions: totalImpressions,
    posts: totalPosts,
    targetPosts: totalTargetPosts,
    likes: totalLikes,
    comments: totalComments,
    achievementRate,
    isPerfect: achievementRate >= 100,
  };
}

// ヘルパー関数: チームの合計統計を計算
export function getTeamStats(team: TeamType, period: PeriodType) {
  const teamMembers = getMembersByTeam(team);
  const memberStats = teamMembers.map((m) => getMemberStats(m, period));

  return {
    totalViews: memberStats.reduce((sum, s) => sum + s.views, 0),
    totalImpressions: memberStats.reduce((sum, s) => sum + s.impressions, 0),
    totalPosts: memberStats.reduce((sum, s) => sum + s.posts, 0),
    totalTargetPosts: memberStats.reduce((sum, s) => sum + s.targetPosts, 0),
    achievementRate: Math.round(
      memberStats.reduce((sum, s) => sum + s.achievementRate, 0) / memberStats.length
    ),
    memberCount: teamMembers.length,
    perfectMembers: memberStats.filter((s) => s.isPerfect).length,
  };
}

// ヘルパー関数: 全体統計を計算
export function getOverallStats(period: PeriodType) {
  const allStats = teams.map((t) => getTeamStats(t.id, period));

  return {
    totalViews: allStats.reduce((sum, s) => sum + s.totalViews, 0),
    totalImpressions: allStats.reduce((sum, s) => sum + s.totalImpressions, 0),
    totalPosts: allStats.reduce((sum, s) => sum + s.totalPosts, 0),
    totalMembers: members.length,
    avgAchievementRate: Math.round(
      allStats.reduce((sum, s) => sum + s.achievementRate, 0) / allStats.length
    ),
  };
}

// ヘルパー関数: ランキングを生成（再生数順）
export function getRankingByViews(team: TeamType | "all", period: PeriodType) {
  const targetMembers = team === "all" ? members : getMembersByTeam(team);
  const memberStats = targetMembers.map((m) => ({
    ...m,
    stats: getMemberStats(m, period),
  }));

  return memberStats.sort((a, b) => b.stats.views - a.stats.views);
}

// ヘルパー関数: MVP ランキング（達成率順）
export function getMVPRanking(team: TeamType | "all", period: PeriodType) {
  const targetMembers = team === "all" ? members : getMembersByTeam(team);
  const memberStats = targetMembers.map((m) => ({
    ...m,
    stats: getMemberStats(m, period),
  }));

  // 達成率 100%以上を優先、その後は達成率順
  return memberStats.sort((a, b) => {
    if (a.stats.isPerfect && !b.stats.isPerfect) return -1;
    if (!a.stats.isPerfect && b.stats.isPerfect) return 1;
    return b.stats.achievementRate - a.stats.achievementRate;
  });
}
