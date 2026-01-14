"use client";

/**
 * 🎵 BGMサービス
 * Web Audio APIを使用した合成音楽の再生エンジン
 * 
 * 機能:
 * - ページ別BGMの再生
 * - クロスフェードによる滑らかな切り替え
 * - iOS Safari対応
 * - 音量調整・ON/OFF設定
 */

import { BGM_COMPOSITIONS, BGMTrack, getNoteFrequency, LayerDefinition, TrackComposition } from "./bgm-compositions";

// 設定のローカルストレージキー
const STORAGE_KEY = "cc-insight-bgm-settings";

// アクティブなオシレーターとゲインの管理
interface ActiveLayer {
    oscillators: OscillatorNode[];
    gains: GainNode[];
    masterGain: GainNode;
}

class BGMService {
    private audioContext: AudioContext | null = null;
    private currentTrack: BGMTrack | null = null;
    private activeLayers: ActiveLayer[] = [];
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;
    private volume: number = 0.5;
    private initialized: boolean = false;
    private isPlaying: boolean = false;
    private loopTimeoutId: number | null = null;
    private isIOS: boolean = false;

    constructor() {
        if (typeof window !== "undefined") {
            this.loadSettings();
            this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        }
    }

    /**
     * AudioContextを初期化（ユーザー操作後に呼び出し必要）
     */
    async initialize(): Promise<void> {
        if (this.initialized && this.audioContext) {
            if (this.audioContext.state === "suspended") {
                try {
                    await this.audioContext.resume();
                    console.log("🎵 BGM AudioContext resumed");
                } catch (e) {
                    console.warn("🎵 BGM AudioContext resume failed:", e);
                }
            }
            return;
        }

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) {
                console.warn("🎵 Web Audio API not supported");
                return;
            }

            this.audioContext = new AudioContextClass();

            // マスターゲイン作成
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            this.masterGain.connect(this.audioContext.destination);

            // iOS Safari対策: 無音を再生
            if (this.isIOS) {
                this.playUnlockSound();
            }

            // suspended状態の場合はresumeを試みる
            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            this.initialized = true;
            console.log(`🎵 BGMService initialized (iOS: ${this.isIOS}, state: ${this.audioContext.state})`);
        } catch (error) {
            console.error("🎵 BGMService initialization failed:", error);
        }
    }

    /**
     * iOS Safari対策: 無音を再生してオーディオエンジンをアンロック
     */
    private playUnlockSound(): void {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.001);

            console.log("🔓 iOS BGM audio unlock attempted");
        } catch (e) {
            console.warn("🎵 iOS BGM audio unlock failed:", e);
        }
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
                this.volume = parsed.volume ?? 0.5;
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

        // リアルタイムで音量を反映
        if (this.masterGain && this.audioContext) {
            this.masterGain.gain.setTargetAtTime(
                this.volume,
                this.audioContext.currentTime,
                0.1
            );
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
            if (this.isPlaying) {
                await this.stop(crossFadeDuration);
            }
            return;
        }

        // 同じトラックが再生中なら何もしない
        if (this.currentTrack === trackId && this.isPlaying) {
            return;
        }

        // 初期化されていない場合は初期化
        if (!this.audioContext || !this.initialized) {
            await this.initialize();
        }

        if (!this.audioContext || !this.masterGain) {
            console.warn("🎵 Cannot play BGM: AudioContext not available");
            return;
        }

        // AudioContextが停止している場合は再開
        if (this.audioContext.state === "suspended") {
            try {
                await this.audioContext.resume();
            } catch (e) {
                console.warn("🎵 Failed to resume AudioContext:", e);
                return;
            }
        }

        const composition = BGM_COMPOSITIONS[trackId];
        if (!composition) {
            console.warn(`🎵 Unknown track: ${trackId}`);
            return;
        }

        console.log(`🎵 Playing BGM: ${composition.nameJa}`);

        // 既存のBGMをフェードアウト
        if (this.isPlaying) {
            await this.fadeOutCurrentLayers(crossFadeDuration / 2);
        }

        // 新しいトラックを開始
        this.currentTrack = trackId;
        this.isPlaying = true;
        this.startComposition(composition);
    }

    /**
     * 楽曲を開始
     */
    private startComposition(composition: TrackComposition): void {
        if (!this.audioContext || !this.masterGain) return;

        const beatDuration = 60 / composition.bpm; // 1拍の長さ（秒）
        const barDuration = beatDuration * 4; // 1小節の長さ（秒）
        const loopDuration = barDuration * composition.loopBars * 1000; // ループ長（ミリ秒）

        // 各レイヤーを開始
        this.playAllLayers(composition, beatDuration);

        // ループ設定
        this.loopTimeoutId = window.setTimeout(() => {
            if (this.isPlaying && this.currentTrack === composition.id) {
                this.stopCurrentLayers();
                this.startComposition(composition);
            }
        }, loopDuration);
    }

    /**
     * 全レイヤーを再生
     */
    private playAllLayers(composition: TrackComposition, beatDuration: number): void {
        if (!this.audioContext || !this.masterGain) return;

        this.activeLayers = [];

        for (const layer of composition.layers) {
            const activeLayer = this.playLayer(layer, beatDuration);
            if (activeLayer) {
                this.activeLayers.push(activeLayer);
            }
        }
    }

    /**
     * 単一レイヤーを再生
     */
    private playLayer(layer: LayerDefinition, beatDuration: number): ActiveLayer | null {
        if (!this.audioContext || !this.masterGain) return null;

        const oscillators: OscillatorNode[] = [];
        const gains: GainNode[] = [];

        // レイヤーマスターゲイン
        const layerMasterGain = this.audioContext.createGain();
        layerMasterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        layerMasterGain.connect(this.masterGain);

        // フェードイン
        layerMasterGain.gain.linearRampToValueAtTime(
            layer.volume,
            this.audioContext.currentTime + 0.5
        );

        let currentTime = this.audioContext.currentTime;

        // pad/bassタイプは持続音として処理
        if (layer.type === "pad" || layer.type === "bass") {
            for (const note of layer.notes) {
                const freq = getNoteFrequency(note);
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.type = layer.waveform;
                osc.frequency.setValueAtTime(freq, currentTime);

                if (layer.detune) {
                    osc.detune.setValueAtTime(layer.detune, currentTime);
                }

                // フィルター（オプション）
                if (layer.filterFreq) {
                    const filter = this.audioContext.createBiquadFilter();
                    filter.type = "lowpass";
                    filter.frequency.setValueAtTime(layer.filterFreq, currentTime);
                    osc.connect(filter);
                    filter.connect(gain);
                } else {
                    osc.connect(gain);
                }

                gain.gain.setValueAtTime(0, currentTime);
                gain.gain.linearRampToValueAtTime(1, currentTime + layer.attackTime);
                gain.connect(layerMasterGain);

                osc.start(currentTime);
                oscillators.push(osc);
                gains.push(gain);
            }
        } else {
            // メロディ/アルペジオタイプはシーケンス再生
            for (let i = 0; i < layer.notes.length; i++) {
                const note = layer.notes[i];
                const duration = (layer.durations[i] || 1) * beatDuration;
                const freq = getNoteFrequency(note);

                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.type = layer.waveform;
                osc.frequency.setValueAtTime(freq, currentTime);

                if (layer.detune) {
                    osc.detune.setValueAtTime(layer.detune, currentTime);
                }

                // フィルター（オプション）
                if (layer.filterFreq) {
                    const filter = this.audioContext.createBiquadFilter();
                    filter.type = "lowpass";
                    filter.frequency.setValueAtTime(layer.filterFreq, currentTime);
                    osc.connect(filter);
                    filter.connect(gain);
                } else {
                    osc.connect(gain);
                }

                // エンベロープ
                gain.gain.setValueAtTime(0, currentTime);
                gain.gain.linearRampToValueAtTime(1, currentTime + layer.attackTime);
                gain.gain.setValueAtTime(1, currentTime + duration - layer.releaseTime);
                gain.gain.linearRampToValueAtTime(0, currentTime + duration);

                gain.connect(layerMasterGain);

                osc.start(currentTime);
                osc.stop(currentTime + duration + 0.1);

                oscillators.push(osc);
                gains.push(gain);

                currentTime += duration;
            }
        }

        return {
            oscillators,
            gains,
            masterGain: layerMasterGain,
        };
    }

    /**
     * 現在のレイヤーをフェードアウト
     */
    private async fadeOutCurrentLayers(duration: number): Promise<void> {
        if (!this.audioContext) return;

        const fadeOutPromises = this.activeLayers.map((layer) => {
            return new Promise<void>((resolve) => {
                layer.masterGain.gain.linearRampToValueAtTime(
                    0,
                    this.audioContext!.currentTime + duration / 1000
                );
                setTimeout(() => {
                    layer.oscillators.forEach((osc) => {
                        try {
                            osc.stop();
                        } catch (e) {
                            // 既に停止している場合は無視
                        }
                    });
                    resolve();
                }, duration);
            });
        });

        await Promise.all(fadeOutPromises);
        this.activeLayers = [];
    }

    /**
     * 現在のレイヤーを停止（即座に）
     */
    private stopCurrentLayers(): void {
        for (const layer of this.activeLayers) {
            for (const osc of layer.oscillators) {
                try {
                    osc.stop();
                } catch (e) {
                    // 既に停止している場合は無視
                }
            }
        }
        this.activeLayers = [];
    }

    /**
     * BGMを停止
     */
    async stop(fadeDuration: number = 1000): Promise<void> {
        if (this.loopTimeoutId) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }

        if (this.activeLayers.length > 0) {
            await this.fadeOutCurrentLayers(fadeDuration);
        }

        this.isPlaying = false;
        this.currentTrack = null;
    }

    /**
     * クリーンアップ
     */
    dispose(): void {
        this.stop(0);
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
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
