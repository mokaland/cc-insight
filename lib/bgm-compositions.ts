"use client";

/**
 * 🎵 BGM楽曲定義
 * CC Insightの世界観（Cosmic Dark × ファンタジーRPG）を音楽で表現
 * 
 * インスピレーション: ファイナルファンタジー、ゼルダの伝説
 */

// BGMトラック識別子
export type BGMTrack =
    | "mypage_sanctuary"          // 星空の安息所
    | "report_ritual"             // 創造の儀式
    | "guardians_temple"          // 古代神殿
    | "guardian_detail_majesty"   // 守護神の威光
    | "ranking_colosseum"         // コズミック・コロシアム
    | "level_journey_voyage"      // 星々の航路
    | "none";                     // BGMなし

// 音符の周波数マッピング（平均律での周波数）
const NOTE_FREQUENCIES: Record<string, number> = {
    // オクターブ2
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    // オクターブ3
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    // オクターブ4
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    // オクターブ5
    C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    // シャープ/フラット
    "C#3": 138.59, "D#3": 155.56, "F#3": 185.00, "G#3": 207.65, "A#3": 233.08,
    "C#4": 277.18, "D#4": 311.13, "F#4": 369.99, "G#4": 415.30, "A#4": 466.16,
    "C#5": 554.37, "D#5": 622.25, "F#5": 739.99, "G#5": 830.61, "A#5": 932.33,
};

// レイヤー定義
export interface LayerDefinition {
    type: "melody" | "harmony" | "bass" | "pad" | "arpeggio" | "sfx";
    waveform: OscillatorType;
    notes: string[];           // 音符名の配列
    durations: number[];       // 各音符の長さ（拍）
    volume: number;            // 0.0 - 1.0
    attackTime: number;        // アタックタイム（秒）
    releaseTime: number;       // リリースタイム（秒）
    detune?: number;           // デチューン（セント）
    filterFreq?: number;       // ローパスフィルター周波数
}

// 楽曲定義
export interface TrackComposition {
    id: BGMTrack;
    name: string;
    nameJa: string;
    bpm: number;
    loopBars: number;          // ループする小節数
    layers: LayerDefinition[];
}

// =====================================
// 🌌 マイページ: 星空の安息所
// =====================================
const MYPAGE_SANCTUARY: TrackComposition = {
    id: "mypage_sanctuary",
    name: "Cosmic Sanctuary",
    nameJa: "星空の安息所",
    bpm: 60,
    loopBars: 8,
    layers: [
        // 深宇宙パッド（持続音）
        {
            type: "pad",
            waveform: "sine",
            notes: ["C3", "G3", "C4", "E4"],
            durations: [8, 8, 8, 8],
            volume: 0.15,
            attackTime: 2.0,
            releaseTime: 3.0,
            filterFreq: 800,
        },
        // 星のアルペジオ
        {
            type: "arpeggio",
            waveform: "sine",
            notes: ["C5", "E5", "G5", "B5", "G5", "E5", "C5", "E5"],
            durations: [1, 1, 1, 1, 1, 1, 1, 1],
            volume: 0.08,
            attackTime: 0.05,
            releaseTime: 0.8,
        },
        // 低音ドローン
        {
            type: "bass",
            waveform: "sine",
            notes: ["C2"],
            durations: [32],
            volume: 0.12,
            attackTime: 4.0,
            releaseTime: 4.0,
            filterFreq: 200,
        },
        // ハーモニー（5度上）
        {
            type: "harmony",
            waveform: "triangle",
            notes: ["G3", "C4", "E4", "G4"],
            durations: [8, 8, 8, 8],
            volume: 0.06,
            attackTime: 1.5,
            releaseTime: 2.0,
            detune: 5,
        },
    ],
};

// =====================================
// ✨ 報告画面: 創造の儀式
// =====================================
const REPORT_RITUAL: TrackComposition = {
    id: "report_ritual",
    name: "Ritual of Creation",
    nameJa: "創造の儀式",
    bpm: 100,
    loopBars: 8,
    layers: [
        // 軽快なメロディ
        {
            type: "melody",
            waveform: "triangle",
            notes: ["G4", "A4", "B4", "D5", "B4", "A4", "G4", "E4", "G4", "A4", "B4", "D5", "E5", "D5", "B4", "G4"],
            durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
            volume: 0.12,
            attackTime: 0.02,
            releaseTime: 0.3,
        },
        // ハーモニーパッド
        {
            type: "pad",
            waveform: "sine",
            notes: ["G3", "B3", "D4"],
            durations: [8, 8, 8],
            volume: 0.10,
            attackTime: 1.0,
            releaseTime: 1.5,
        },
        // リズミカルなベース
        {
            type: "bass",
            waveform: "triangle",
            notes: ["G2", "G2", "D3", "D3", "G2", "G2", "C3", "D3"],
            durations: [1, 1, 1, 1, 1, 1, 1, 1],
            volume: 0.15,
            attackTime: 0.05,
            releaseTime: 0.2,
            filterFreq: 300,
        },
        // マジカルスパークル（高域）
        {
            type: "sfx",
            waveform: "sine",
            notes: ["G5", "B5", "D6", "G6"],
            durations: [2, 2, 2, 2],
            volume: 0.04,
            attackTime: 0.01,
            releaseTime: 0.5,
        },
    ],
};

// =====================================
// 🏛️ 守護神図鑑: 古代神殿
// =====================================
const GUARDIANS_TEMPLE: TrackComposition = {
    id: "guardians_temple",
    name: "Ancient Temple",
    nameJa: "古代神殿",
    bpm: 70,
    loopBars: 8,
    layers: [
        // ハープ風アルペジオ
        {
            type: "arpeggio",
            waveform: "triangle",
            notes: ["D4", "F4", "A4", "D5", "A4", "F4", "D4", "A3"],
            durations: [1, 1, 1, 1, 1, 1, 1, 1],
            volume: 0.10,
            attackTime: 0.02,
            releaseTime: 0.6,
        },
        // 深いストリングスパッド
        {
            type: "pad",
            waveform: "sine",
            notes: ["D3", "A3", "D4", "F4"],
            durations: [8, 8, 8, 8],
            volume: 0.12,
            attackTime: 2.0,
            releaseTime: 2.5,
            detune: 8,
        },
        // 神殿ベル
        {
            type: "sfx",
            waveform: "sine",
            notes: ["D5", "A5"],
            durations: [4, 4],
            volume: 0.05,
            attackTime: 0.01,
            releaseTime: 2.0,
        },
        // 深淵のドローン
        {
            type: "bass",
            waveform: "sine",
            notes: ["D2"],
            durations: [32],
            volume: 0.10,
            attackTime: 4.0,
            releaseTime: 4.0,
            filterFreq: 150,
        },
    ],
};

// =====================================
// 👑 守護神詳細: 守護神の威光
// =====================================
const GUARDIAN_DETAIL_MAJESTY: TrackComposition = {
    id: "guardian_detail_majesty",
    name: "Guardian's Majesty",
    nameJa: "守護神の威光",
    bpm: 55,
    loopBars: 8,
    layers: [
        // オーケストラ風ストリングス
        {
            type: "pad",
            waveform: "sawtooth",
            notes: ["E3", "B3", "E4", "G4"],
            durations: [8, 8, 8, 8],
            volume: 0.08,
            attackTime: 2.5,
            releaseTime: 3.0,
            filterFreq: 600,
            detune: 10,
        },
        // パワフルベース
        {
            type: "bass",
            waveform: "sine",
            notes: ["E2", "B2", "E2", "B2"],
            durations: [8, 8, 8, 8],
            volume: 0.15,
            attackTime: 1.0,
            releaseTime: 2.0,
            filterFreq: 200,
        },
        // コーラス風パッド（複数デチューン）
        {
            type: "harmony",
            waveform: "sine",
            notes: ["E4", "G4", "B4"],
            durations: [8, 8, 8],
            volume: 0.10,
            attackTime: 3.0,
            releaseTime: 3.0,
            detune: -8,
        },
        // 守護神オーラ（低周波の脈動）
        {
            type: "sfx",
            waveform: "sine",
            notes: ["E2"],
            durations: [4, 4, 4, 4, 4, 4, 4, 4],
            volume: 0.06,
            attackTime: 0.5,
            releaseTime: 1.5,
        },
    ],
};

// =====================================
// ⚔️ ランキング: コズミック・コロシアム
// =====================================
const RANKING_COLOSSEUM: TrackComposition = {
    id: "ranking_colosseum",
    name: "Cosmic Colosseum",
    nameJa: "コズミック・コロシアム",
    bpm: 130,
    loopBars: 8,
    layers: [
        // テンションメロディ
        {
            type: "melody",
            waveform: "square",
            notes: ["A4", "C5", "E5", "A4", "C5", "E5", "G5", "E5", "A4", "C5", "E5", "G5", "A5", "G5", "E5", "C5"],
            durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
            volume: 0.08,
            attackTime: 0.01,
            releaseTime: 0.15,
            filterFreq: 2000,
        },
        // パワフルベース
        {
            type: "bass",
            waveform: "sawtooth",
            notes: ["A2", "A2", "E3", "E3", "A2", "A2", "C3", "E3"],
            durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
            volume: 0.12,
            attackTime: 0.02,
            releaseTime: 0.1,
            filterFreq: 400,
        },
        // ストリングス緊張
        {
            type: "pad",
            waveform: "sawtooth",
            notes: ["A3", "C4", "E4"],
            durations: [4, 4, 4],
            volume: 0.08,
            attackTime: 0.5,
            releaseTime: 0.5,
            filterFreq: 800,
            detune: 5,
        },
        // リズムアクセント
        {
            type: "sfx",
            waveform: "triangle",
            notes: ["A5", "E5", "A5", "E5"],
            durations: [1, 1, 1, 1],
            volume: 0.05,
            attackTime: 0.01,
            releaseTime: 0.3,
        },
    ],
};

// =====================================
// 🚀 レベルジャーニー: 星々の航路
// =====================================
const LEVEL_JOURNEY_VOYAGE: TrackComposition = {
    id: "level_journey_voyage",
    name: "Voyage of Stars",
    nameJa: "星々の航路",
    bpm: 80,
    loopBars: 8,
    layers: [
        // ピアノ風メロディ
        {
            type: "melody",
            waveform: "triangle",
            notes: ["C4", "E4", "G4", "C5", "B4", "G4", "E4", "C4", "D4", "F4", "A4", "D5", "C5", "A4", "F4", "D4"],
            durations: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            volume: 0.12,
            attackTime: 0.02,
            releaseTime: 0.5,
        },
        // ストリングスハーモニー
        {
            type: "pad",
            waveform: "sine",
            notes: ["C3", "G3", "C4", "E4"],
            durations: [8, 8, 8, 8],
            volume: 0.12,
            attackTime: 1.5,
            releaseTime: 2.0,
            detune: 5,
        },
        // 希望のベル
        {
            type: "arpeggio",
            waveform: "sine",
            notes: ["C5", "E5", "G5", "C6"],
            durations: [2, 2, 2, 2],
            volume: 0.06,
            attackTime: 0.01,
            releaseTime: 1.0,
        },
        // 宇宙の広がり（深いパッド）
        {
            type: "bass",
            waveform: "sine",
            notes: ["C2", "G2"],
            durations: [16, 16],
            volume: 0.10,
            attackTime: 3.0,
            releaseTime: 3.0,
            filterFreq: 180,
        },
    ],
};

// =====================================
// 📡 エクスポート
// =====================================

export const BGM_COMPOSITIONS: Record<BGMTrack, TrackComposition | null> = {
    mypage_sanctuary: MYPAGE_SANCTUARY,
    report_ritual: REPORT_RITUAL,
    guardians_temple: GUARDIANS_TEMPLE,
    guardian_detail_majesty: GUARDIAN_DETAIL_MAJESTY,
    ranking_colosseum: RANKING_COLOSSEUM,
    level_journey_voyage: LEVEL_JOURNEY_VOYAGE,
    none: null,
};

// 周波数取得ヘルパー
export function getNoteFrequency(note: string): number {
    return NOTE_FREQUENCIES[note] || 440;
}

// ページパスからBGMトラックを取得
export function getTrackForPath(pathname: string): BGMTrack {
    if (pathname === "/mypage" || pathname === "/") {
        return "mypage_sanctuary";
    }
    if (pathname === "/report") {
        return "report_ritual";
    }
    if (pathname === "/guardians") {
        return "guardians_temple";
    }
    if (pathname.startsWith("/guardians/") || pathname.startsWith("/guardian/")) {
        return "guardian_detail_majesty";
    }
    if (pathname === "/ranking") {
        return "ranking_colosseum";
    }
    if (pathname === "/level" || pathname === "/level-journey") {
        return "level_journey_voyage";
    }
    // その他のページはBGMなし
    return "none";
}
