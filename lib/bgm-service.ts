"use client";

/**
 * 🎵 BGMサービス（完全修正版）
 * 
 * 修正履歴:
 * - 2026-01-14 v3: 
 *   - 排他制御（mutex）追加で被り防止
 *   - PWA対応（visibilitychange/pagehide）
 *   - グローバルシングルトン化
 *   - フェード改善
 */

import { BGMTrack, getTrackInfo } from "./bgm-compositions";

// 設定のローカルストレージキー
const STORAGE_KEY = "cc-insight-bgm-settings";

// グローバルシングルトン（Hot Reload対策）
const GLOBAL_KEY = "__CC_INSIGHT_BGM_SERVICE__";

class BGMService {
    private currentAudio: HTMLAudioElement | null = null;
    private currentTrack: BGMTrack | null = null;
    private enabled: boolean = true;
    private volume: number = 0.3;
    private initialized: boolean = false;

    // 排他制御
    private isTransitioning: boolean = false;
    private transitionQueue: BGMTrack | null = null;

    // PWA対応フラグ
    private wasPlayingBeforeHidden: boolean = false;

    constructor() {
        if (typeof window !== "undefined") {
            this.loadSettings();
            this.setupPWAHandlers();
        }
    }

    /**
     * PWA対応：バックグラウンド移行時の処理
     */
    private setupPWAHandlers(): void {
        // ページが非表示になった時（PWAでアプリを閉じた時など）
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                // バックグラウンドに移行
                this.wasPlayingBeforeHidden = this.currentAudio !== null && !this.currentAudio.paused;
                if (this.currentAudio && !this.currentAudio.paused) {
                    this.currentAudio.pause();
                    console.log("🎵 BGM paused (app hidden)");
                }
            } else if (document.visibilityState === "visible") {
                // フォアグラウンドに復帰
                if (this.wasPlayingBeforeHidden && this.currentAudio && this.enabled) {
                    this.currentAudio.play().catch(() => {
                        console.log("🎵 Failed to resume BGM");
                    });
                    console.log("🎵 BGM resumed (app visible)");
                }
            }
        });

        // ページが完全に閉じられる前（PWA対応）
        window.addEventListener("pagehide", () => {
            this.stopImmediately();
            console.log("🎵 BGM stopped (pagehide)");
        });

        // ブラウザ/タブが閉じられる前
        window.addEventListener("beforeunload", () => {
            this.stopImmediately();
        });
    }

    /**
     * サービスを初期化
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log("🎵 BGMService initialized (v3)");
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
     * 再生中かどうか
     */
    isPlaying(): boolean {
        return this.currentAudio !== null && !this.currentAudio.paused;
    }

    /**
     * 全てのオーディオを即座に停止
     */
    private stopImmediately(): void {
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio.src = "";
                this.currentAudio.load(); // リソース解放を強制
            } catch (e) {
                // 無視
            }
            this.currentAudio = null;
        }
        this.currentTrack = null;
        this.isTransitioning = false;
        this.transitionQueue = null;
    }

    /**
     * BGMを再生（排他制御付き）
     */
    async play(trackId: BGMTrack): Promise<void> {
        // 無効の場合は停止
        if (!this.enabled) {
            this.stopImmediately();
            return;
        }

        // noneの場合はフェードアウトして停止
        if (trackId === "none") {
            await this.fadeOutAndStop();
            return;
        }

        // 同じトラックが再生中なら何もしない
        if (this.currentTrack === trackId) {
            console.log(`🎵 Already playing: ${trackId}`);
            return;
        }

        // トランジション中なら待機キューに入れる
        if (this.isTransitioning) {
            console.log(`🎵 Queuing track: ${trackId}`);
            this.transitionQueue = trackId;
            return;
        }

        const trackInfo = getTrackInfo(trackId);
        if (!trackInfo) {
            console.warn(`🎵 Unknown track: ${trackId}`);
            return;
        }

        console.log(`🎵 Playing: ${trackInfo.nameJa}`);

        // 排他制御開始
        this.isTransitioning = true;

        try {
            // 新しいオーディオを準備
            const newAudio = new Audio(trackInfo.file);
            newAudio.loop = true;
            newAudio.volume = 0;
            newAudio.preload = "auto";

            // ロード完了を待機
            await new Promise<void>((resolve, reject) => {
                newAudio.addEventListener("canplaythrough", () => resolve(), { once: true });
                newAudio.addEventListener("error", (e) => reject(e), { once: true });
                newAudio.load();
            });

            // 再生開始
            try {
                await newAudio.play();
            } catch (playError) {
                console.warn("🎵 Autoplay blocked");
                this.isTransitioning = false;
                return;
            }

            // 古いオーディオがあればクロスフェード
            const oldAudio = this.currentAudio;
            this.currentAudio = newAudio;
            this.currentTrack = trackId;

            if (oldAudio) {
                // クロスフェード（500msで高速に）
                await this.crossFade(oldAudio, newAudio, 500);
            } else {
                // フェードイン
                await this.fadeIn(newAudio, 500);
            }

        } catch (error) {
            console.error("🎵 Failed to play BGM:", error);
        } finally {
            // 排他制御終了
            this.isTransitioning = false;

            // キューに次のトラックがあれば再生
            if (this.transitionQueue !== null) {
                const nextTrack = this.transitionQueue;
                this.transitionQueue = null;
                await this.play(nextTrack);
            }
        }
    }

    /**
     * クロスフェード
     */
    private async crossFade(oldAudio: HTMLAudioElement, newAudio: HTMLAudioElement, duration: number): Promise<void> {
        const startTime = performance.now();
        const oldStartVolume = oldAudio.volume;
        const targetVolume = this.volume;

        return new Promise((resolve) => {
            const tick = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                try {
                    // 古いオーディオをフェードアウト
                    oldAudio.volume = oldStartVolume * (1 - progress);
                    // 新しいオーディオをフェードイン
                    newAudio.volume = targetVolume * progress;
                } catch (e) {
                    resolve();
                    return;
                }

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    // 古いオーディオを完全に停止
                    try {
                        oldAudio.pause();
                        oldAudio.currentTime = 0;
                        oldAudio.src = "";
                        oldAudio.load();
                    } catch (e) {
                        // 無視
                    }
                    resolve();
                }
            };

            requestAnimationFrame(tick);
        });
    }

    /**
     * フェードイン
     */
    private async fadeIn(audio: HTMLAudioElement, duration: number): Promise<void> {
        const startTime = performance.now();
        const targetVolume = this.volume;

        return new Promise((resolve) => {
            const tick = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                try {
                    audio.volume = targetVolume * progress;
                } catch (e) {
                    resolve();
                    return;
                }

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(tick);
        });
    }

    /**
     * フェードアウトして停止
     */
    private async fadeOutAndStop(): Promise<void> {
        if (!this.currentAudio) return;

        const audio = this.currentAudio;
        this.currentAudio = null;
        this.currentTrack = null;

        const startTime = performance.now();
        const startVolume = audio.volume;
        const duration = 500;

        return new Promise((resolve) => {
            const tick = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                try {
                    audio.volume = startVolume * (1 - progress);
                } catch (e) {
                    resolve();
                    return;
                }

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    try {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.src = "";
                        audio.load();
                    } catch (e) {
                        // 無視
                    }
                    resolve();
                }
            };

            requestAnimationFrame(tick);
        });
    }

    /**
     * BGMを停止
     */
    async stop(): Promise<void> {
        await this.fadeOutAndStop();
    }

    /**
     * クリーンアップ
     */
    dispose(): void {
        this.stopImmediately();
        this.initialized = false;
    }
}

// グローバルシングルトン取得（Hot Reload対策）
export function getBGMService(): BGMService {
    if (typeof window === "undefined") {
        // SSR時はダミーを返す（実際には使われない）
        return new BGMService();
    }

    const globalObj = window as any;
    if (!globalObj[GLOBAL_KEY]) {
        globalObj[GLOBAL_KEY] = new BGMService();
    }
    return globalObj[GLOBAL_KEY];
}

// ヘルパー関数
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

export function isBGMPlaying(): boolean {
    return getBGMService().isPlaying();
}
