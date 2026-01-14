"use client";

/**
 * 🔊 SEサービス（効果音再生）
 * 
 * 機能:
 * - ボタンクリック音（軽い/アクション/特別の3段階音量）
 * - レベルアップ・進化・ログイン成功などの特別SE
 * - PWA対応
 */

// SE種類定義
export type SEType =
    | "click_light"      // 遷移ボタン用（軽い音）
    | "click_action"     // アクションボタン用
    | "level_up"         // レベルアップ・進化用
    | "login_success";   // ログイン成功時

// SE設定
interface SEConfig {
    file: string;
    volumeMultiplier: number; // BGM基準の音量倍率
}

const SE_CONFIG: Record<SEType, SEConfig> = {
    click_light: {
        file: "/se/click_light.mp3",
        volumeMultiplier: 0.5, // BGMの50%
    },
    click_action: {
        file: "/se/click_action.mp3",
        volumeMultiplier: 1.0, // BGMと同じ
    },
    level_up: {
        file: "/se/level_up.mp3",
        volumeMultiplier: 1.0,
    },
    login_success: {
        file: "/se/login_success.mp3",
        volumeMultiplier: 1.0,
    },
};

// グローバルシングルトン
const GLOBAL_KEY = "__CC_INSIGHT_SE_SERVICE__";
const STORAGE_KEY = "cc-insight-se-settings";

class SEService {
    private enabled: boolean = true;
    private baseVolume: number = 0.3; // BGMと同じベース音量
    private audioCache: Map<string, HTMLAudioElement> = new Map();
    private initialized: boolean = false;

    constructor() {
        if (typeof window !== "undefined") {
            this.loadSettings();
        }
    }

    /**
     * 初期化
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // SEファイルを事前ロード
        for (const [type, config] of Object.entries(SE_CONFIG)) {
            try {
                const audio = new Audio(config.file);
                audio.preload = "auto";
                audio.load();
                this.audioCache.set(type, audio);
            } catch (e) {
                console.warn(`🔊 Failed to preload SE: ${type}`);
            }
        }

        this.initialized = true;
        console.log("🔊 SEService initialized");
    }

    /**
     * 設定読み込み
     */
    private loadSettings(): void {
        try {
            const settings = localStorage.getItem(STORAGE_KEY);
            if (settings) {
                const parsed = JSON.parse(settings);
                this.enabled = parsed.enabled ?? true;
                this.baseVolume = parsed.volume ?? 0.3;
            }
        } catch (e) {
            // 無視
        }
    }

    /**
     * 設定保存
     */
    private saveSettings(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                enabled: this.enabled,
                volume: this.baseVolume,
            }));
        } catch (e) {
            // 無視
        }
    }

    /**
     * 有効/無効設定
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.saveSettings();
    }

    /**
     * 音量設定
     */
    setVolume(volume: number): void {
        this.baseVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    /**
     * 設定取得
     */
    getSettings(): { enabled: boolean; volume: number } {
        return { enabled: this.enabled, volume: this.baseVolume };
    }

    /**
     * SE再生
     */
    async play(type: SEType): Promise<void> {
        if (!this.enabled) return;

        const config = SE_CONFIG[type];
        if (!config) {
            console.warn(`🔊 Unknown SE type: ${type}`);
            return;
        }

        try {
            // 毎回新しいAudioを作成（同時再生対応）
            const audio = new Audio(config.file);
            audio.volume = this.baseVolume * config.volumeMultiplier;

            await audio.play();

            // 再生完了後にクリーンアップ
            audio.addEventListener("ended", () => {
                audio.src = "";
            }, { once: true });

        } catch (e) {
            // 自動再生ブロックなどは無視
            console.log(`🔊 SE play failed: ${type}`);
        }
    }

    /**
     * ボタンクリック音（軽い）
     */
    playClickLight(): void {
        this.play("click_light");
    }

    /**
     * ボタンクリック音（アクション）
     */
    playClickAction(): void {
        this.play("click_action");
    }

    /**
     * レベルアップ・進化音
     */
    playLevelUp(): void {
        this.play("level_up");
    }

    /**
     * ログイン成功音
     */
    playLoginSuccess(): void {
        this.play("login_success");
    }
}

// グローバルシングルトン取得
export function getSEService(): SEService {
    if (typeof window === "undefined") {
        return new SEService();
    }

    const globalObj = window as any;
    if (!globalObj[GLOBAL_KEY]) {
        globalObj[GLOBAL_KEY] = new SEService();
    }
    return globalObj[GLOBAL_KEY];
}

// ヘルパー関数
export function playSE(type: SEType): void {
    getSEService().play(type);
}

export function playClickLight(): void {
    getSEService().playClickLight();
}

export function playClickAction(): void {
    getSEService().playClickAction();
}

export function playLevelUp(): void {
    getSEService().playLevelUp();
}

export function playLoginSuccess(): void {
    getSEService().playLoginSuccess();
}

export function setSEEnabled(enabled: boolean): void {
    getSEService().setEnabled(enabled);
}

export function setSEVolume(volume: number): void {
    getSEService().setVolume(volume);
}

export function getSESettings(): { enabled: boolean; volume: number } {
    return getSEService().getSettings();
}
