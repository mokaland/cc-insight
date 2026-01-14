"use client";

/**
 * 🎵 BGM設定コンポーネント
 * BGMのON/OFF・音量を調整するUI
 */

import React from "react";
import { Volume2, VolumeX, Music } from "lucide-react";
import { useBGM } from "./bgm-provider";

interface BGMSettingsProps {
    className?: string;
    showLabel?: boolean;
}

export function BGMSettings({ className = "", showLabel = true }: BGMSettingsProps) {
    const { enabled, volume, setEnabled, setVolume, initialized } = useBGM();

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {showLabel && (
                <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <Music className="w-4 h-4" />
                    <span>BGM設定</span>
                </div>
            )}

            {/* ON/OFF トグル */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">BGM</span>
                <button
                    onClick={() => setEnabled(!enabled)}
                    className={`
                        relative w-12 h-6 rounded-full transition-colors duration-200
                        ${enabled ? "bg-purple-500" : "bg-slate-600"}
                    `}
                    aria-label={enabled ? "BGMをオフにする" : "BGMをオンにする"}
                >
                    <span
                        className={`
                            absolute top-1 left-1 w-4 h-4 rounded-full bg-white
                            transition-transform duration-200
                            ${enabled ? "translate-x-6" : "translate-x-0"}
                        `}
                    />
                </button>
            </div>

            {/* 音量スライダー */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setVolume(volume > 0 ? 0 : 0.5)}
                    className="text-white/70 hover:text-white transition-colors"
                    aria-label={volume > 0 ? "ミュート" : "ミュート解除"}
                >
                    {volume > 0 ? (
                        <Volume2 className="w-5 h-5" />
                    ) : (
                        <VolumeX className="w-5 h-5" />
                    )}
                </button>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    disabled={!enabled}
                    className={`
                        flex-1 h-2 rounded-full appearance-none cursor-pointer
                        bg-slate-600
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-purple-400
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:w-4
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-purple-400
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:border-0
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                    `}
                    style={{
                        background: enabled
                            ? `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume * 100}%, #475569 ${volume * 100}%, #475569 100%)`
                            : "#475569",
                    }}
                />
                <span className="text-xs text-white/50 w-8 text-right">
                    {Math.round(volume * 100)}%
                </span>
            </div>

            {/* 初期化状態の表示（デバッグ用、必要に応じて非表示に） */}
            {!initialized && (
                <p className="text-xs text-white/40 mt-1">
                    ※ 画面をタップするとBGMが開始されます
                </p>
            )}
        </div>
    );
}

/**
 * コンパクト版（アイコンのみ）
 */
export function BGMToggle({ className = "" }: { className?: string }) {
    const { enabled, setEnabled, initialized, initialize } = useBGM();

    const handleClick = async () => {
        if (!initialized) {
            await initialize();
        }
        setEnabled(!enabled);
    };

    return (
        <button
            onClick={handleClick}
            className={`
                p-2 rounded-full transition-all duration-200
                ${enabled
                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700/80"
                }
                ${className}
            `}
            aria-label={enabled ? "BGMをオフにする" : "BGMをオンにする"}
        >
            {enabled ? (
                <Volume2 className="w-5 h-5" />
            ) : (
                <VolumeX className="w-5 h-5" />
            )}
        </button>
    );
}
