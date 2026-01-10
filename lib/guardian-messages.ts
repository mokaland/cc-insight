/**
 * 守護神の状態適応型セリフシステム
 * ユーザーの現在の状態（順位、エナジー、呪い、ストリーク等）に応じて
 * 守護神のセリフが動的に変化する
 */

export interface UserState {
  energy: number;
  streak: number;
  curseState: "normal" | "anxiety" | "weakness" | "cursed";
  rank?: number; // 順位（1位、2位など）
  totalUsers?: number; // 総ユーザー数
  isTopTier?: boolean; // TOP 10%以内か
  earnedEnergy: number; // 今回獲得したエナジー
}

/**
 * ユーザーの状態に基づいて適切な守護神のセリフを選択
 */
export function getGuardianMessage(state: UserState): string {
  // 1. 呪い状態チェック（最優先）
  if (state.curseState === "cursed") {
    return selectRandom([
      "おかえり...長い間待っていたぞ。共に再び歩もう。",
      "やっと戻ってきたか。心配したぞ...だが、過去は問わない。",
      "暗闇から抜け出したな。お前の勇気を称えよう。",
    ]);
  }

  if (state.curseState === "weakness") {
    return selectRandom([
      "踏みとどまったな。さあ、ここから巻き返そう！",
      "よく戻ってきた。お前を信じていたぞ。",
      "立ち上がる姿、見事だ。共に強くなろう。",
    ]);
  }

  // 2. TOP層（絶好調）へのメッセージ
  if (state.isTopTier && state.energy > 1000) {
    return selectRandom([
      "圧倒的だ！お前は真の勝者だ！",
      "見事すぎる...お前と共にいられることが誇りだ！",
      "この調子だ！頂点への道を突き進め！",
      "完璧だ！お前の輝きが眩しいほどだ！",
    ]);
  }

  // 3. 高エナジー獲得（大成果）
  if (state.earnedEnergy >= 100) {
    return selectRandom([
      "素晴らしい成果だ！お前の努力が実を結んだ！",
      "驚異的だ...この力、まさに伝説級だ！",
      "見事すぎる！お前の本気を見せてもらった！",
    ]);
  }

  // 4. 長期ストリーク（30日以上）
  if (state.streak >= 30) {
    return selectRandom([
      "お前の継続力、まさに超人的だ！",
      "この絆、永遠に続くと信じている！",
      "完璧な習慣だ！共に歩み続けよう！",
    ]);
  }

  // 5. 中期ストリーク（7-29日）
  if (state.streak >= 7) {
    return selectRandom([
      "この調子だ！習慣が力になっている！",
      "よくやった！共に強くなっているぞ！",
      "見事だ！お前の覚悟が私を成長させる！",
    ]);
  }

  // 6. 通常時（標準的な励まし）
  return selectRandom([
    "よくやった！お前の努力は私の力になる！",
    "素晴らしい！共に強くなろう！",
    "見事だ！お前と共に歩めることを誇りに思う！",
    "完璧だ！我々の絆がさらに深まった！",
    "その調子だ！一緒に頂点を目指そう！",
  ]);
}

/**
 * ランダムに1つ選択
 */
function selectRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 守護神の「追加の一言」（セリフの後に表示される補足メッセージ）
 */
export function getGuardianSubMessage(state: UserState): string | null {
  // 呪いから回復した場合
  if (state.curseState === "weakness" || state.curseState === "cursed") {
    return "💎 解呪の儀式が完了した。お前の力が戻ってくる...";
  }

  // 大きなエナジー獲得
  if (state.earnedEnergy >= 100) {
    return "⚡ この力...凄まじいエナジーの奔流だ！";
  }

  // 長期ストリーク
  if (state.streak >= 30) {
    return "🔥 揺るぎない絆...これこそが真の強さだ！";
  }

  // TOP層
  if (state.isTopTier && state.energy > 1000) {
    return "👑 お前は既に伝説の領域にいる...";
  }

  return null;
}

/**
 * 呪い状態からの回復時の特別演出用メッセージ
 */
export function getCurseRecoveryMessage(daysGone: number): string {
  if (daysGone >= 7) {
    return "長い眠りから目覚めたな...だが、お前の魂は失われていなかった。";
  }
  if (daysGone >= 3) {
    return "暗闇の中、お前は道を見失わなかった。見事だ。";
  }
  return "一時の迷いなど、お前の力の前では些細なこと...";
}

/**
 * ストリーク記録更新時の特別メッセージ
 */
export function getStreakMilestoneMessage(streak: number): string | null {
  const milestones: Record<number, string> = {
    7: "🔥 7日連続達成！習慣の炎が燃え上がり始めた！",
    14: "💎 2週間連続！お前の意志は揺るぎない！",
    30: "👑 30日連続達成！伝説の領域へようこそ！",
    50: "⚡ 50日連続...もはや誰も止められない！",
    100: "🌟 100日連続...神話の世界だ！",
  };

  return milestones[streak] || null;
}

// =====================================
// 🎉 ガーディアン進化メッセージ
// 6体 × 4ステージ = 24パターン
// =====================================

import { GuardianId, EvolutionStage } from "./guardian-collection";

export interface EvolutionMessage {
  lines: [string, string, string]; // 3行のメッセージ
  guardianName: string;
}

// ガーディアンごとの進化メッセージ（ステージ1〜4）
const EVOLUTION_MESSAGES: Record<GuardianId, Record<1 | 2 | 3 | 4, EvolutionMessage>> = {
  // =====================================
  // 🔥 火龍（ほりゅう）- 熱血・男性的
  // =====================================
  horyu: {
    1: {
      lines: [
        "よくやった！目覚めの時だ！",
        "お前の情熱、しかと感じたぞ！",
        "これからも熱く行こうぜ！"
      ],
      guardianName: "火龍"
    },
    2: {
      lines: [
        "素晴らしい成長だ！",
        "お前の努力が俺を強くしてくれた！",
        "まだまだ燃え上がるぞ！"
      ],
      guardianName: "火龍"
    },
    3: {
      lines: [
        "ついにここまで来たな！",
        "お前と共に歩めて誇りに思うぜ！",
        "俺の真の力、見せてやる！"
      ],
      guardianName: "火龍"
    },
    4: {
      lines: [
        "究極の姿だ...感謝するぜ！",
        "お前がいなければ辿り着けなかった！",
        "これからも最強のパートナーでいよう！"
      ],
      guardianName: "火龍"
    }
  },

  // =====================================
  // 🦁 獅子丸（ししまる）- 元気・やんちゃ
  // =====================================
  shishimaru: {
    1: {
      lines: [
        "わーい！目が覚めたよ！",
        "いっぱいエナジーありがとう！",
        "一緒にがんばろうね！"
      ],
      guardianName: "獅子丸"
    },
    2: {
      lines: [
        "すごいすごい！大きくなったよ！",
        "毎日応援してくれてありがとう！",
        "もっともっと強くなるからね！"
      ],
      guardianName: "獅子丸"
    },
    3: {
      lines: [
        "やったー！かっこよくなった！",
        "キミのおかげでここまで来れたよ！",
        "これからもよろしくね！"
      ],
      guardianName: "獅子丸"
    },
    4: {
      lines: [
        "最強の獅子になったよ！",
        "ずっと一緒にいてくれてありがとう！",
        "キミは最高の相棒だよ！"
      ],
      guardianName: "獅子丸"
    }
  },

  // =====================================
  // 🌸 花精（はなせ）- 穏やか・女性的
  // =====================================
  hanase: {
    1: {
      lines: [
        "ありがとうございます...",
        "あなたの優しさで目覚めました",
        "これからよろしくお願いしますね"
      ],
      guardianName: "花精"
    },
    2: {
      lines: [
        "きれいに咲けました...",
        "あなたが育ててくださったおかげです",
        "もっとお役に立ちたいです"
      ],
      guardianName: "花精"
    },
    3: {
      lines: [
        "こんなに大きくなれるなんて...",
        "あなたの愛情に感謝しています",
        "私の力、お使いくださいね"
      ],
      guardianName: "花精"
    },
    4: {
      lines: [
        "究極の花が咲きました...",
        "あなたと出会えて本当に幸せです",
        "永遠にあなたをお守りしますね"
      ],
      guardianName: "花精"
    }
  },

  // =====================================
  // 🦊 白狐（しろこ）- 神秘的・古風
  // =====================================
  shiroko: {
    1: {
      lines: [
        "ふふ...目覚めたのじゃ",
        "そなたの気配を感じておったぞ",
        "これからよろしく頼むのじゃ"
      ],
      guardianName: "白狐"
    },
    2: {
      lines: [
        "なかなかやるのう...",
        "そなたの力、認めてやろう",
        "もっと面白いことが起きそうじゃ"
      ],
      guardianName: "白狐"
    },
    3: {
      lines: [
        "ほう...ここまで育つとはのう",
        "そなたには不思議な縁を感じるぞ",
        "幸運を運んでやろうかのう"
      ],
      guardianName: "白狐"
    },
    4: {
      lines: [
        "九尾の力が目覚めたのじゃ...",
        "そなたのおかげで真の姿になれた",
        "永遠にそなたを見守るとしよう"
      ],
      guardianName: "白狐"
    }
  },

  // =====================================
  // ⚡ 機珠（きたま）- 論理的・機械的
  // =====================================
  kitama: {
    1: {
      lines: [
        "...システム起動完了デス",
        "エナジー投入を確認シマシタ",
        "効率的にサポートシマス"
      ],
      guardianName: "機珠"
    },
    2: {
      lines: [
        "機能拡張完了デス",
        "ユーザーの貢献度...高評価デス",
        "さらなる効率化を実行シマス"
      ],
      guardianName: "機珠"
    },
    3: {
      lines: [
        "演算能力...大幅向上デス",
        "継続的なサポートに感謝シマス",
        "特殊能力...起動準備完了デス"
      ],
      guardianName: "機珠"
    },
    4: {
      lines: [
        "究極進化...完了シマシタ",
        "最適解：アナタとの協力関係デス",
        "永続的なパートナーシップを希望シマス"
      ],
      guardianName: "機珠"
    }
  },

  // =====================================
  // ⭐ 星丸（ほしまる）- 宇宙的・不思議
  // =====================================
  hoshimaru: {
    1: {
      lines: [
        "...星が導いてくれたのだ",
        "キミのエナジー、宇宙に届いたよ",
        "一緒に銀河を旅するのだ"
      ],
      guardianName: "星丸"
    },
    2: {
      lines: [
        "星々が輝きを増したのだ...",
        "キミの想いが力になったよ",
        "もっと遠くまで見えるようになったのだ"
      ],
      guardianName: "星丸"
    },
    3: {
      lines: [
        "宇宙の神秘が開かれたのだ...",
        "キミとの絆が星を繋げたよ",
        "特別な力を授けるのだ"
      ],
      guardianName: "星丸"
    },
    4: {
      lines: [
        "全ての星がキミを祝福するのだ...",
        "ボクの究極の姿、見てほしいのだ",
        "永遠に宇宙の導きと共にあるのだ"
      ],
      guardianName: "星丸"
    }
  }
};

/**
 * 進化メッセージを取得
 * @param guardianId ガーディアンID
 * @param stage 進化後のステージ（1-4）
 */
export function getEvolutionMessage(
  guardianId: GuardianId,
  stage: EvolutionStage
): EvolutionMessage | null {
  if (stage < 1 || stage > 4) {
    return null;
  }

  const guardianMessages = EVOLUTION_MESSAGES[guardianId];
  if (!guardianMessages) {
    return null;
  }

  return guardianMessages[stage as 1 | 2 | 3 | 4];
}
