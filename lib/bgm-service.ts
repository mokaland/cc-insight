"use client";

/**
 * 🎵 BGMサービス（MP3ファイル再生版）
 * 
 * 機能:
 * - ページ別BGMの再生（MP3ファイル）
 * - クロスフェードによる滑らかな切り替え
 * - iOS Safari対応
 * - 音量調整・ON/OFF設定
 */

import { BGMTrack, getTrackInfo } from "./bgm-compositions";

// 設定のローカルストレージキー
const STORAGE_KEY = "cc-insight-bgm-settings";

class BGMService {
    private currentAudio: HTMLAudioElement | null = null;
    private nextAudio: HTMLAudioElement | null = null;
    private currentTrack: BGMTrack | null = null;
    private enabled: boolean = true;
    private volume: number = 0.3; // デフォルト音量を控えめに
    private initialized: boolean = false;
    private isFading: boolean = false;

    constructor() {
        if (typeof window !== "undefined") {
            this.loadSettings();
        }
    }

    /**
     * サービスを初期化（ユーザー操作後に呼び出し）
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
            this.stop();
        }
    }

    /**
     * 音量を設定 (0.0 - 1.0)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();

        // 現在再生中のオーディオに反映
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
     * BGMを再生（クロスフェード対応）
     */
    async play(trackId: BGMTrack, crossFadeDuration: number = 1500): Promise<void> {
        // 無効またはnoneの場合は停止
        if (!this.enabled || trackId === "none") {
            if (this.currentAudio) {
                await this.fadeOut(this.currentAudio, crossFadeDuration);
                this.currentTrack = null;
            }
            return;
        }

        // 同じトラックが再生中なら何もしない
        if (this.currentTrack === trackId && this.currentAudio && !this.currentAudio.paused) {
            return;
        }

        // フェード中は待機
        if (this.isFading) {
            return;
        }

        const trackInfo = getTrackInfo(trackId);
        if (!trackInfo) {
            console.warn(`🎵 Unknown track: ${trackId}`);
            return;
        }

        console.log(`🎵 Playing BGM: ${trackInfo.nameJa}`);

        try {
            // 新しいオーディオを準備
            this.nextAudio = new Audio(trackInfo.file);
            this.nextAudio.loop = true;
            this.nextAudio.volume = 0; // フェードイン用に0から開始

            // 再生開始を待機
            await this.nextAudio.play();

            // クロスフェード
            this.isFading = true;

            if (this.currentAudio) {
                // 古いオーディオをフェードアウト、新しいオーディオをフェードイン
                await Promise.all([
                    this.fadeOut(this.currentAudio, crossFadeDuration),
                    this.fadeIn(this.nextAudio, crossFadeDuration),
                ]);
            } else {
                // 新しいオーディオをフェードイン
                await this.fadeIn(this.nextAudio, crossFadeDuration);
            }

            this.currentAudio = this.nextAudio;
            this.nextAudio = null;
            this.currentTrack = trackId;
            this.isFading = false;

        } catch (error) {
            console.error("🎵 Failed to play BGM:", error);
            this.isFading = false;

            // 自動再生がブロックされた場合のメッセージ
            if (error instanceof Error && error.name === "NotAllowedError") {
                console.log("🎵 Autoplay blocked. Waiting for user interaction.");
            }
        }
    }

    /**
     * フェードイン
     */
    private fadeIn(audio: HTMLAudioElement, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const targetVolume = this.volume;

            const fade = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                audio.volume = targetVolume * progress;

                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(fade);
        });
    }

    /**
     * フェードアウト
     */
    private fadeOut(audio: HTMLAudioElement, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const startVolume = audio.volume;

            const fade = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                audio.volume = startVolume * (1 - progress);

                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    audio.pause();
                    audio.currentTime = 0;
                    resolve();
                }
            };

            requestAnimationFrame(fade);
        });
    }

    /**
     * BGMを停止
     */
    async stop(fadeDuration: number = 1000): Promise<void> {
        if (this.currentAudio) {
            await this.fadeOut(this.currentAudio, fadeDuration);
            this.currentAudio = null;
            this.currentTrack = null;
        }
    }

    /**
     * クリーンアップ
     */
    dispose(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        if (this.nextAudio) {
            this.nextAudio.pause();
            this.nextAudio = null;
        }
        this.currentTrack = null;
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
