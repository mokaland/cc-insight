"use client";

/**
 * 🎵 BGMサービス（MP3ファイル再生版）
 * 
 * 機能:
 * - ページ別BGMの再生（MP3ファイル）
 * - クロスフェードによる滑らかな切り替え
 * - iOS Safari対応
 * - 音量調整・ON/OFF設定
 * 
 * 修正履歴:
 * - 2026-01-14: BGM被り問題を修正（孤児オーディオ防止、フェード中断対応）
 */

import { BGMTrack, getTrackInfo } from "./bgm-compositions";

// 設定のローカルストレージキー
const STORAGE_KEY = "cc-insight-bgm-settings";

class BGMService {
    private currentAudio: HTMLAudioElement | null = null;
    private currentTrack: BGMTrack | null = null;
    private enabled: boolean = true;
    private volume: number = 0.3;
    private initialized: boolean = false;

    // フェード関連（中断可能に）
    private fadeAnimationId: number | null = null;
    private pendingTrack: BGMTrack | null = null;

    constructor() {
        if (typeof window !== "undefined") {
            this.loadSettings();
        }
    }

    /**
     * サービスを初期化
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log("🎵 BGMService initialized");
    }

    /**
     * 設定をローカルストレージから読み込み
     */
    private loadSettings(): void {
        try {
            const settings = localStorage.getItem(STORAGE_KEY);
            if (settings) {
                const parsed = JSON.parse(settings);
                this.enabled = parsed.enabled ?? true;
                this.volume = parsed.volume ?? 0.3;
            }
        } catch (error) {
            console.error("Failed to load BGM settings:", error);
        }
    }

    /**
     * 設定をローカルストレージに保存
     */
    private saveSettings(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                enabled: this.enabled,
                volume: this.volume,
            }));
        } catch (error) {
            console.error("Failed to save BGM settings:", error);
        }
    }

    /**
     * BGMの有効/無効を設定
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.saveSettings();

        if (!enabled) {
            this.stopImmediately();
        }
    }

    /**
     * 音量を設定 (0.0 - 1.0)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();

        if (this.currentAudio) {
            this.currentAudio.volume = this.volume;
        }
    }

    /**
     * 現在の設定を取得
     */
    getSettings(): { enabled: boolean; volume: number } {
        return { enabled: this.enabled, volume: this.volume };
    }

    /**
     * 現在再生中のトラックを取得
     */
    getCurrentTrack(): BGMTrack | null {
        return this.currentTrack;
    }

    /**
     * 全てのオーディオを即座に停止（孤児防止）
     */
    private stopImmediately(): void {
        // フェードアニメーションをキャンセル
        if (this.fadeAnimationId !== null) {
            cancelAnimationFrame(this.fadeAnimationId);
            this.fadeAnimationId = null;
        }

        // 現在のオーディオを停止
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio.src = ""; // リソース解放
            } catch (e) {
                // 無視
            }
            this.currentAudio = null;
        }

        this.currentTrack = null;
        this.pendingTrack = null;
    }

    /**
     * BGMを再生（改善版：被り防止）
     */
    async play(trackId: BGMTrack, crossFadeDuration: number = 1500): Promise<void> {
        // 無効の場合は停止
        if (!this.enabled) {
            this.stopImmediately();
            return;
        }

        // noneの場合はフェードアウトして停止
        if (trackId === "none") {
            if (this.currentAudio) {
                await this.fadeOutAndStop(crossFadeDuration);
            }
            return;
        }

        // 同じトラックが再生中なら何もしない
        if (this.currentTrack === trackId && this.currentAudio && !this.currentAudio.paused) {
            console.log(`🎵 Already playing: ${trackId}`);
            return;
        }

        // 同じトラックへの切り替えが既にペンディング中なら何もしない
        if (this.pendingTrack === trackId) {
            console.log(`🎵 Already pending: ${trackId}`);
            return;
        }

        const trackInfo = getTrackInfo(trackId);
        if (!trackInfo) {
            console.warn(`🎵 Unknown track: ${trackId}`);
            return;
        }

        console.log(`🎵 Switching BGM to: ${trackInfo.nameJa}`);

        // ペンディング設定
        this.pendingTrack = trackId;

        try {
            // 新しいオーディオを準備
            const newAudio = new Audio(trackInfo.file);
            newAudio.loop = true;
            newAudio.volume = 0; // フェードイン用

            // 再生開始を試みる（エラー時はキャッチ）
            try {
                await newAudio.play();
            } catch (playError) {
                console.warn("🎵 Autoplay blocked, waiting for interaction");
                this.pendingTrack = null;
                return;
            }

            // 古いオーディオがあれば停止（フェードせず即停止して確実に）
            if (this.currentAudio) {
                // フェードアニメーションをキャンセル
                if (this.fadeAnimationId !== null) {
                    cancelAnimationFrame(this.fadeAnimationId);
                    this.fadeAnimationId = null;
                }

                // 古いオーディオを停止
                const oldAudio = this.currentAudio;
                this.currentAudio = null;

                // クロスフェード：古いのをフェードアウト、新しいのをフェードイン
                await Promise.all([
                    this.fadeOutAudio(oldAudio, crossFadeDuration),
                    this.fadeInAudio(newAudio, crossFadeDuration),
                ]);
            } else {
                // 新しいオーディオをフェードイン
                await this.fadeInAudio(newAudio, crossFadeDuration);
            }

            // 状態を更新
            this.currentAudio = newAudio;
            this.currentTrack = trackId;
            this.pendingTrack = null;

        } catch (error) {
            console.error("🎵 Failed to play BGM:", error);
            this.pendingTrack = null;
        }
    }

    /**
     * フェードイン（中断可能）
     */
    private fadeInAudio(audio: HTMLAudioElement, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const targetVolume = this.volume;

            const fade = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                try {
                    audio.volume = targetVolume * progress;
                } catch (e) {
                    // オーディオが既に破棄されている場合
                    resolve();
                    return;
                }

                if (progress < 1) {
                    this.fadeAnimationId = requestAnimationFrame(fade);
                } else {
                    this.fadeAnimationId = null;
                    resolve();
                }
            };

            this.fadeAnimationId = requestAnimationFrame(fade);
        });
    }

    /**
     * フェードアウト（別のオーディオを対象に）
     */
    private fadeOutAudio(audio: HTMLAudioElement, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const startVolume = audio.volume;

            const fade = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                try {
                    audio.volume = startVolume * (1 - progress);
                } catch (e) {
                    // オーディオが既に破棄されている場合
                    resolve();
                    return;
                }

                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    try {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.src = ""; // リソース解放
                    } catch (e) {
                        // 無視
                    }
                    resolve();
                }
            };

            requestAnimationFrame(fade);
        });
    }

    /**
     * フェードアウトして停止
     */
    private async fadeOutAndStop(duration: number): Promise<void> {
        if (!this.currentAudio) return;

        const audio = this.currentAudio;
        this.currentAudio = null;
        this.currentTrack = null;

        await this.fadeOutAudio(audio, duration);
    }

    /**
     * BGMを停止
     */
    async stop(fadeDuration: number = 1000): Promise<void> {
        await this.fadeOutAndStop(fadeDuration);
    }

    /**
     * クリーンアップ
     */
    dispose(): void {
        this.stopImmediately();
        this.initialized = false;
    }
}

// シングルトンインスタンス
let bgmServiceInstance: BGMService | null = null;

export function getBGMService(): BGMService {
    if (!bgmServiceInstance) {
        bgmServiceInstance = new BGMService();
    }
    return bgmServiceInstance;
}

// 便利なヘルパー関数
export async function playBGM(trackId: BGMTrack): Promise<void> {
    return getBGMService().play(trackId);
}

export async function stopBGM(): Promise<void> {
    return getBGMService().stop();
}

export function setBGMVolume(volume: number): void {
    getBGMService().setVolume(volume);
}

export function setBGMEnabled(enabled: boolean): void {
    getBGMService().setEnabled(enabled);
}

export function getBGMSettings(): { enabled: boolean; volume: number } {
    return getBGMService().getSettings();
}

export function getCurrentBGMTrack(): BGMTrack | null {
    return getBGMService().getCurrentTrack();
}
