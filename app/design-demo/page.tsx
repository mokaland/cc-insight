"use client";

import {
    MemberLayout,
    NeuCard,
    NeuButton,
    NeuInput,
    NeuProgress,
    NeuBadge,
    NeuListItem,
    DisplayNumber
} from "@/components/member-ui";
import { Sparkles, Zap, Trophy, ChevronRight } from "lucide-react";

/**
 * デザインリフレッシュ デモページ
 * ニューモーフィズムUIコンポーネントのプレビュー
 */
export default function DesignDemoPage() {
    return (
        <MemberLayout className="p-6 space-y-8">
            {/* ヘッダー */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-[var(--member-text-primary)]">
                    デザインリフレッシュ デモ
                </h1>
                <p className="text-[var(--member-text-secondary)] mt-2">
                    ポケポケ風 ニューモーフィズムUI
                </p>
            </div>

            {/* カードセクション */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--member-text-primary)]">
                    カード
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <NeuCard>
                        <h3 className="font-bold text-lg text-[var(--member-text-primary)]">
                            ニューモーフィズムカード
                        </h3>
                        <p className="text-[var(--member-text-secondary)] mt-2 text-sm">
                            柔らかい影で立体感を表現したカードです。
                        </p>
                    </NeuCard>

                    <NeuCard className="text-center">
                        <div className="mb-2">
                            <DisplayNumber value={1234} suffix="E" />
                        </div>
                        <p className="text-[var(--member-text-secondary)] text-sm">
                            獲得エナジー
                        </p>
                    </NeuCard>
                </div>
            </section>

            {/* ボタンセクション */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--member-text-primary)]">
                    ボタン
                </h2>
                <div className="flex flex-wrap gap-4">
                    <NeuButton>デフォルト</NeuButton>
                    <NeuButton variant="primary">
                        <Zap className="w-4 h-4 mr-2" />
                        プライマリ
                    </NeuButton>
                    <NeuButton variant="success">
                        成功
                    </NeuButton>
                    <NeuButton variant="gold">
                        <Sparkles className="w-4 h-4 mr-2" />
                        ゴールド
                    </NeuButton>
                </div>
            </section>

            {/* 入力フィールドセクション */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--member-text-primary)]">
                    入力フィールド
                </h2>
                <div className="space-y-4 max-w-md">
                    <NeuInput placeholder="プレースホルダーテキスト" />
                    <NeuInput type="email" placeholder="メールアドレス" />
                </div>
            </section>

            {/* プログレスバーセクション */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--member-text-primary)]">
                    プログレスバー
                </h2>
                <div className="space-y-4 max-w-md">
                    <div>
                        <p className="text-sm text-[var(--member-text-secondary)] mb-2">
                            通常 (65%)
                        </p>
                        <NeuProgress value={65} />
                    </div>
                    <div>
                        <p className="text-sm text-[var(--member-text-secondary)] mb-2">
                            ゴールド (80%)
                        </p>
                        <NeuProgress value={80} variant="gold" />
                    </div>
                </div>
            </section>

            {/* バッジセクション */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--member-text-primary)]">
                    バッジ
                </h2>
                <div className="flex flex-wrap gap-3">
                    <NeuBadge>デフォルト</NeuBadge>
                    <NeuBadge variant="primary">Lv.25</NeuBadge>
                    <NeuBadge variant="success">完了</NeuBadge>
                    <NeuBadge variant="gold">
                        <Trophy className="w-3 h-3 mr-1" />
                        MVP
                    </NeuBadge>
                </div>
            </section>

            {/* リストセクション */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--member-text-primary)]">
                    リスト項目
                </h2>
                <div className="max-w-md space-y-0">
                    <NeuListItem onClick={() => console.log("clicked")}>
                        <div className="flex-1">
                            <p className="font-semibold text-[var(--member-text-primary)]">
                                マイページ
                            </p>
                            <p className="text-sm text-[var(--member-text-secondary)]">
                                プロフィールと守護神
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[var(--member-text-muted)]" />
                    </NeuListItem>

                    <NeuListItem>
                        <div className="flex-1">
                            <p className="font-semibold text-[var(--member-text-primary)]">
                                日報報告
                            </p>
                            <p className="text-sm text-[var(--member-text-secondary)]">
                                今日の活動を報告
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[var(--member-text-muted)]" />
                    </NeuListItem>
                </div>
            </section>

            {/* 守護神カードプレビュー */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--member-text-primary)]">
                    守護神カード（プレビュー）
                </h2>
                <NeuCard className="max-w-md">
                    <div className="flex items-center gap-4">
                        {/* 守護神アバター */}
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, #fecaca, #fca5a5)",
                                boxShadow: "inset 4px 4px 8px rgba(0,0,0,0.1)"
                            }}
                        >
                            <span className="text-4xl">🐉</span>
                        </div>

                        {/* 情報 */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">🔥</span>
                                <h3 className="font-bold text-xl text-[var(--member-attr-power)]">
                                    火龍
                                </h3>
                            </div>
                            <p className="text-sm text-[var(--member-text-secondary)]">
                                成熟体 • 剛属性
                            </p>
                            <div className="flex gap-2 mt-2">
                                <NeuBadge variant="primary">1,234E</NeuBadge>
                                <NeuBadge variant="gold">オーラ 75%</NeuBadge>
                            </div>
                        </div>
                    </div>

                    {/* 進化プログレス */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-[var(--member-text-secondary)]">次の進化まで</span>
                            <span className="font-bold text-[var(--member-accent-gold)]">残り 766E</span>
                        </div>
                        <NeuProgress value={62} variant="gold" />
                    </div>
                </NeuCard>
            </section>
        </MemberLayout>
    );
}
