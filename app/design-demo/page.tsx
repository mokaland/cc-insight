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
import { Sparkles, Zap, Trophy, ChevronRight, Crown, Flame, Star, AlertTriangle, Check } from "lucide-react";
import Image from "next/image";

/**
 * Stage 0: マイページ完成形デモ
 * ポケポケ風ライトモード・ニューモーフィズム
 */
export default function MypageDemoPage() {
    // サンプルデータ
    const userData = {
        name: "カズランド",
        level: 25,
        levelTitle: "熟練の冒険者",
        currentEnergy: 150,
        totalEarned: 1234,
        streak: 7,
        streakMax: 14,
        todayReported: true,
        todayEnergy: 45,
    };

    const guardianData = {
        name: "機珠",
        stage: 2,
        stageName: "成長体",
        attribute: "智属性",
        investedEnergy: 350,
        auraLevel: 62,
        nextEvolutionRequired: 500,
    };

    return (
        <MemberLayout className="p-4 pb-24">
            <div className="max-w-md mx-auto space-y-4">

                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--member-text-primary)]">
                            マイページ
                        </h1>
                        <p className="text-sm text-[var(--member-text-secondary)]">
                            {userData.name}
                        </p>
                    </div>
                </div>

                {/* 今日の報告ステータス */}
                {userData.todayReported ? (
                    <NeuCard className="!bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-emerald-700">今日の報告完了！</p>
                                <p className="text-sm text-emerald-600">
                                    獲得: <span className="font-bold">+{userData.todayEnergy}E</span>
                                </p>
                            </div>
                        </div>
                    </NeuCard>
                ) : (
                    <NeuCard className="!bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-red-700">今日の報告がまだです</p>
                                <p className="text-sm text-red-600">ストリークを維持しましょう</p>
                            </div>
                            <NeuButton variant="primary" className="!py-2 !px-4 !text-sm">
                                報告する
                            </NeuButton>
                        </div>
                    </NeuCard>
                )}

                {/* レベル & 称号 */}
                <NeuCard className="!bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
                                <span className="text-xl font-bold text-white">{userData.level}</span>
                            </div>
                            <div>
                                <p className="font-bold text-amber-700">Lv.{userData.level}</p>
                                <p className="text-sm text-purple-600 font-medium">{userData.levelTitle}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-[var(--member-text-secondary)]">次まで</p>
                            <p className="font-bold text-amber-600">76E</p>
                            <NeuProgress value={72} variant="gold" className="w-20 mt-1" />
                        </div>
                    </div>
                </NeuCard>

                {/* 守護神カード */}
                <NeuCard>
                    <div className="flex items-start gap-4">
                        {/* 守護神アバター */}
                        <div className="relative">
                            <div
                                className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden"
                                style={{
                                    background: "linear-gradient(135deg, #cffafe, #a5f3fc)",
                                    border: "3px solid #06b6d4"
                                }}
                            >
                                <span className="text-4xl">🤖</span>
                            </div>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                                <NeuBadge variant="primary" className="!text-[10px] !px-2 !py-0.5">
                                    S{guardianData.stage}
                                </NeuBadge>
                            </div>
                        </div>

                        {/* 守護神情報 */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-5 h-5 text-cyan-500" />
                                <h2 className="text-lg font-bold text-cyan-600">
                                    {guardianData.name}
                                </h2>
                            </div>
                            <p className="text-xs text-[var(--member-text-secondary)] mb-2">
                                {guardianData.stageName} • {guardianData.attribute}
                            </p>

                            {/* ステータス */}
                            <div className="flex gap-2">
                                <div className="flex-1 neu-inset rounded-lg p-2 text-center">
                                    <p className="text-[10px] text-[var(--member-text-secondary)]">投資済み</p>
                                    <p className="text-sm font-bold text-[var(--member-accent-primary)]">
                                        {guardianData.investedEnergy}E
                                    </p>
                                </div>
                                <div className="flex-1 neu-inset rounded-lg p-2 text-center">
                                    <p className="text-[10px] text-[var(--member-text-secondary)]">オーラ</p>
                                    <p className="text-sm font-bold text-pink-500">
                                        {guardianData.auraLevel}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* オーラゲージ */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-[var(--member-text-secondary)]">オーラレベル</span>
                            <span className="font-bold text-cyan-600">{guardianData.auraLevel}%</span>
                        </div>
                        <NeuProgress value={guardianData.auraLevel} />
                    </div>

                    {/* 次の進化まで */}
                    <div className="mt-4 p-3 rounded-xl bg-cyan-50 border border-cyan-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-cyan-500" />
                            <span className="font-semibold text-cyan-700">次の進化まで</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-[var(--member-text-secondary)]">目標</p>
                                <p className="font-bold text-[var(--member-text-primary)]">成熟体</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-[var(--member-text-secondary)]">必要エナジー</p>
                                <p className="text-xl font-bold text-amber-500">150E</p>
                            </div>
                        </div>
                        <NeuProgress value={70} variant="gold" className="mt-2" />
                        <p className="text-xs text-cyan-600 text-center mt-2">
                            🔥 もう少しで進化！あと 150E 稼ごう！
                        </p>
                    </div>
                </NeuCard>

                {/* 獲得バッジ */}
                <NeuCard>
                    <div className="flex items-center gap-2 mb-3">
                        <Crown className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-[var(--member-text-primary)]">獲得バッジ</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <NeuBadge variant="primary">
                            <Star className="w-3 h-3 mr-1" />
                            Lv.25達成
                        </NeuBadge>
                        <NeuBadge variant="gold">
                            <Flame className="w-3 h-3 mr-1" />
                            7日連続
                        </NeuBadge>
                        <NeuBadge variant="success">
                            🛡️ 守護神収集家
                        </NeuBadge>
                    </div>
                </NeuCard>

                {/* エナジーサマリー */}
                <div className="grid grid-cols-2 gap-3">
                    <NeuCard className="text-center" onClick={() => { }}>
                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-xs text-[var(--member-text-secondary)]">保有エナジー</p>
                        <DisplayNumber value={userData.currentEnergy} suffix="E" className="!text-2xl" />
                    </NeuCard>

                    <NeuCard className="text-center" onClick={() => { }}>
                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-amber-100 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-xs text-[var(--member-text-secondary)]">累計獲得</p>
                        <DisplayNumber value={userData.totalEarned} suffix="E" className="!text-2xl" />
                    </NeuCard>
                </div>

                {/* クイックメニュー */}
                <div className="grid grid-cols-2 gap-3">
                    <NeuCard className="text-center" onClick={() => { }}>
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-indigo-100 flex items-center justify-center">
                            📊
                        </div>
                        <p className="text-sm font-medium text-[var(--member-text-primary)]">日報</p>
                        <p className="text-xs text-[var(--member-text-secondary)]">入力する</p>
                    </NeuCard>

                    <NeuCard className="text-center" onClick={() => { }}>
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-pink-100 flex items-center justify-center">
                            🛡️
                        </div>
                        <p className="text-sm font-medium text-[var(--member-text-primary)]">守護神図鑑</p>
                        <p className="text-xs text-[var(--member-text-secondary)]">見る</p>
                    </NeuCard>
                </div>

                {/* デモ用説明 */}
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                    <p className="text-sm text-indigo-700">
                        ☝️ これがマイページの完成イメージです
                    </p>
                    <p className="text-xs text-indigo-500 mt-1">
                        ライトモード × ニューモーフィズム × ポケポケ風
                    </p>
                </div>
            </div>
        </MemberLayout>
    );
}
