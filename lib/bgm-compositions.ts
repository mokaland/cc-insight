"use client";

/**
 * 🎵 BGM楽曲定義（MP3ファイル版）
 * CC Insightの世界観を音楽で表現
 */

// BGMトラック識別子
export type BGMTrack =
    | "mypage"           // マイページ - 星空の安息所
    | "report"           // 報告画面 - 創造の儀式
    | "guardians"        // 守護神図鑑 - 古代神殿
    | "guardian_detail"  // 守護神詳細 - 守護神の威光
    | "ranking"          // ランキング - コズミック・コロシアム
    | "level_journey"    // レベルジャーニー - 星々の航路
    | "none";            // BGMなし

// トラック情報
export interface TrackInfo {
    id: BGMTrack;
    name: string;
    nameJa: string;
    file: string;  // public/bgm/ からの相対パス
}

// 楽曲定義
export const BGM_TRACKS: Record<Exclude<BGMTrack, "none">, TrackInfo> = {
    mypage: {
        id: "mypage",
        name: "Cosmic Sanctuary",
        nameJa: "星空の安息所",
        file: "/bgm/mypage.mp3",
    },
    report: {
        id: "report",
        name: "Ritual of Creation",
        nameJa: "創造の儀式",
        file: "/bgm/report.mp3",
    },
    guardians: {
        id: "guardians",
        name: "Ancient Temple",
        nameJa: "古代神殿",
        file: "/bgm/guardians.mp3",
    },
    guardian_detail: {
        id: "guardian_detail",
        name: "Guardian's Majesty",
        nameJa: "守護神の威光",
        file: "/bgm/guardian-detail.mp3",
    },
    ranking: {
        id: "ranking",
        name: "Cosmic Colosseum",
        nameJa: "コズミック・コロシアム",
        file: "/bgm/ranking.mp3",
    },
    level_journey: {
        id: "level_journey",
        name: "Voyage of Stars",
        nameJa: "星々の航路",
        file: "/bgm/level-journey.mp3",
    },
};

// ページパスからBGMトラックを取得
export function getTrackForPath(pathname: string): BGMTrack {
    if (pathname === "/mypage" || pathname === "/") {
        return "mypage";
    }
    if (pathname === "/report") {
        return "report";
    }
    if (pathname === "/guardians") {
        return "guardians";
    }
    if (pathname.startsWith("/guardians/") || pathname.startsWith("/guardian/")) {
        return "guardian_detail";
    }
    if (pathname === "/ranking") {
        return "ranking";
    }
    if (pathname === "/level" || pathname === "/level-journey") {
        return "level_journey";
    }
    // その他のページはBGMなし
    return "none";
}

// トラック情報を取得（noneの場合はnull）
export function getTrackInfo(trackId: BGMTrack): TrackInfo | null {
    if (trackId === "none") return null;
    return BGM_TRACKS[trackId] || null;
}
