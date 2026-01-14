"use client";

/**
 * 🔊 サウンド・バイブレーションサービス
 * ポケポケ風のフィードバック体験を提供
 */

// サウンドエフェクト定義
export type SoundEffect =
    | "pack_open"       // パック開封
    | "pack_reveal"     // パック中身表示
    | "energy_gain"     // エナジー獲得
    | "level_up"        // レベルアップ
    | "button_tap"      // ボタンタップ
    | "success"         // 成功
    | "rare_drop"       // レアドロップ
    | "legendary_drop"; // レジェンダリードロップ

// バイブレーションパターン定義
const VIBRATION_PATTERNS: Record<string, number | number[]> = {
    tap: 10,
    success: [50, 30, 50],
    pack_open: [50, 30, 80],
    rare_drop: [80, 40, 120],
    legendary_drop: [100, 50, 100, 50, 200],
    level_up: [100, 50, 100, 50, 150, 50, 200],
    error: [200, 100, 200],
};

// Web Audio API ベースの合成サウンド
class SoundService {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 0.5;
    private initialized: boolean = false;

    constructor() {
        // ブラウザ環境でのみ初期化
        if (typeof window !== "undefined") {
            this.loadSettings();
        }
    }

    /**
     * AudioContextを初期化（ユーザー操作後に呼び出し必要）
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.initialized = true;
            console.log("🔊 SoundService initialized");
        } catch (error) {
            console.error("AudioContext initialization failed:", error);
        }
    }

    /**
     * 設定をローカルストレージから読み込み
     */
    private loadSettings(): void {
        try {
            const settings = localStorage.getItem("cc-insight-sound-settings");
            if (settings) {
                const parsed = JSON.parse(settings);
                this.enabled = parsed.enabled ?? true;
                this.volume = parsed.volume ?? 0.5;
            }
        } catch (error) {
            console.error("Failed to load sound settings:", error);
        }
    }

    /**
     * 設定をローカルストレージに保存
     */
    saveSettings(): void {
        try {
            localStorage.setItem("cc-insight-sound-settings", JSON.stringify({
                enabled: this.enabled,
                volume: this.volume,
            }));
        } catch (error) {
            console.error("Failed to save sound settings:", error);
        }
    }

    /**
     * サウンドの有効/無効を設定
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.saveSettings();
    }

    /**
     * ボリュームを設定 (0.0 - 1.0)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    /**
     * 現在の設定を取得
     */
    getSettings(): { enabled: boolean; volume: number } {
        return { enabled: this.enabled, volume: this.volume };
    }

    /**
     * サウンドエフェクトを再生（合成音）
     */
    async play(effect: SoundEffect): Promise<void> {
        if (!this.enabled || !this.audioContext) {
            // 初期化されていない場合は初期化を試みる
            if (!this.audioContext) {
                await this.initialize();
            }
            if (!this.enabled || !this.audioContext) return;
        }

        // AudioContextが停止している場合は再開
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        try {
            switch (effect) {
                case "button_tap":
                    this.playTone(800, 0.05, "sine", 0.3);
                    break;
                case "pack_open":
                    this.playPackOpenSound();
                    break;
                case "pack_reveal":
                    this.playRevealSound();
                    break;
                case "energy_gain":
                    this.playEnergyGainSound();
                    break;
                case "level_up":
                    this.playLevelUpSound();
                    break;
                case "success":
                    this.playSuccessSound();
                    break;
                case "rare_drop":
                    this.playRareDropSound();
                    break;
                case "legendary_drop":
                    this.playLegendaryDropSound();
                    break;
            }
        } catch (error) {
            console.error("Failed to play sound:", error);
        }
    }

    /**
     * 基本トーン再生
     */
    private playTone(
        frequency: number,
        duration: number,
        type: OscillatorType = "sine",
        volumeMultiplier: number = 1
    ): void {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(this.volume * volumeMultiplier, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * パック開封サウンド
     */
    private playPackOpenSound(): void {
        // 上昇するスィープ音
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(this.volume * 0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.4);
    }

    /**
     * リビールサウンド
     */
    private playRevealSound(): void {
        this.playTone(523.25, 0.1, "sine", 0.6); // C5
        setTimeout(() => this.playTone(659.25, 0.1, "sine", 0.6), 100); // E5
        setTimeout(() => this.playTone(783.99, 0.2, "sine", 0.8), 200); // G5
    }

    /**
     * エナジー獲得サウンド
     */
    private playEnergyGainSound(): void {
        // キラキラ音
        this.playTone(880, 0.1, "sine", 0.4);
        setTimeout(() => this.playTone(1108.73, 0.1, "sine", 0.5), 80);
        setTimeout(() => this.playTone(1318.51, 0.15, "sine", 0.6), 160);
    }

    /**
     * レベルアップサウンド
     */
    private playLevelUpSound(): void {
        // ファンファーレ風
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, "sine", 0.6), i * 150);
        });
    }

    /**
     * 成功サウンド
     */
    private playSuccessSound(): void {
        this.playTone(523.25, 0.1, "sine", 0.5);
        setTimeout(() => this.playTone(659.25, 0.15, "sine", 0.6), 100);
    }

    /**
     * レアドロップサウンド
     */
    private playRareDropSound(): void {
        // より豪華なサウンド
        this.playTone(392, 0.15, "sine", 0.5);
        setTimeout(() => this.playTone(523.25, 0.15, "sine", 0.6), 100);
        setTimeout(() => this.playTone(659.25, 0.15, "sine", 0.6), 200);
        setTimeout(() => this.playTone(783.99, 0.25, "sine", 0.7), 300);
    }

    /**
     * レジェンダリードロップサウンド
     */
    private playLegendaryDropSound(): void {
        // 最も豪華なファンファーレ
        const sequence = [
            { freq: 392, delay: 0 },     // G4
            { freq: 493.88, delay: 100 }, // B4
            { freq: 587.33, delay: 200 }, // D5
            { freq: 783.99, delay: 300 }, // G5
            { freq: 987.77, delay: 450 }, // B5
            { freq: 1174.66, delay: 600 }, // D6
        ];

        sequence.forEach(({ freq, delay }) => {
            setTimeout(() => this.playTone(freq, 0.2, "sine", 0.7), delay);
        });
    }
}

// バイブレーションサービス
class VibrationService {
    private enabled: boolean = true;

    constructor() {
        if (typeof window !== "undefined") {
            this.loadSettings();
        }
    }

    private loadSettings(): void {
        try {
            const settings = localStorage.getItem("cc-insight-vibration-settings");
            if (settings) {
                const parsed = JSON.parse(settings);
                this.enabled = parsed.enabled ?? true;
            }
        } catch (error) {
            console.error("Failed to load vibration settings:", error);
        }
    }

    saveSettings(): void {
        try {
            localStorage.setItem("cc-insight-vibration-settings", JSON.stringify({
                enabled: this.enabled,
            }));
        } catch (error) {
            console.error("Failed to save vibration settings:", error);
        }
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.saveSettings();
    }

    getSettings(): { enabled: boolean } {
        return { enabled: this.enabled };
    }

    /**
     * バイブレーションを実行
     */
    vibrate(pattern: keyof typeof VIBRATION_PATTERNS | number | number[]): void {
        if (!this.enabled) return;

        if (typeof navigator !== "undefined" && navigator.vibrate) {
            const vibrationPattern = typeof pattern === "string"
                ? VIBRATION_PATTERNS[pattern]
                : pattern;

            if (vibrationPattern) {
                navigator.vibrate(vibrationPattern);
            }
        }
    }
}

// シングルトンインスタンス
let soundServiceInstance: SoundService | null = null;
let vibrationServiceInstance: VibrationService | null = null;

export function getSoundService(): SoundService {
    if (!soundServiceInstance) {
        soundServiceInstance = new SoundService();
    }
    return soundServiceInstance;
}

export function getVibrationService(): VibrationService {
    if (!vibrationServiceInstance) {
        vibrationServiceInstance = new VibrationService();
    }
    return vibrationServiceInstance;
}

// 便利なヘルパー関数
export async function playSound(effect: SoundEffect): Promise<void> {
    return getSoundService().play(effect);
}

export function vibrate(pattern: keyof typeof VIBRATION_PATTERNS | number | number[]): void {
    getVibrationService().vibrate(pattern);
}

// Reactフック用のヘルパー
export function useFeedback() {
    const playFeedback = async (effect: SoundEffect, vibratePattern?: keyof typeof VIBRATION_PATTERNS | number | number[]) => {
        await playSound(effect);
        if (vibratePattern) {
            vibrate(vibratePattern);
        }
    };

    return { playSound, vibrate, playFeedback };
}
