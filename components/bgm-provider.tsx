"use client";

/**
 * 🎵 BGM Provider
 * ページ遷移に応じて自動的にBGMを切り替えるReactコンテキスト
 * 
 * 修正履歴:
 * - 2026-01-14: BGM被り問題対応（状態管理をサービスに集約）
 */

import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import {
    getBGMService,
    playBGM,
    stopBGM,
    setBGMEnabled,
    setBGMVolume,
    getBGMSettings,
    getCurrentBGMTrack
} from "@/lib/bgm-service";
import { getTrackForPath, BGMTrack } from "@/lib/bgm-compositions";

interface BGMContextType {
    isPlaying: boolean;
    currentTrack: BGMTrack | null;
    enabled: boolean;
    volume: number;
    initialized: boolean;
    setEnabled: (enabled: boolean) => void;
    setVolume: (volume: number) => void;
    initialize: () => Promise<void>;
}

const BGMContext = createContext<BGMContextType | null>(null);

export function useBGM(): BGMContextType {
    const context = useContext(BGMContext);
    if (!context) {
        throw new Error("useBGM must be used within a BGMProvider");
    }
    return context;
}

interface BGMProviderProps {
    children: React.ReactNode;
}

export function BGMProvider({ children }: BGMProviderProps) {
    const pathname = usePathname();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState<BGMTrack | null>(null);
    const [enabled, setEnabledState] = useState(true);
    const [volume, setVolumeState] = useState(0.3);
    const [initialized, setInitialized] = useState(false);

    // 初期化試行フラグ（StrictMode対策）
    const initAttemptedRef = useRef(false);
    // 最後に処理したpathnameを追跡（重複呼び出し防止）
    const lastProcessedPathRef = useRef<string | null>(null);

    // 初期化時に設定を読み込み
    useEffect(() => {
        const settings = getBGMSettings();
        setEnabledState(settings.enabled);
        setVolumeState(settings.volume);
    }, []);

    // ユーザー操作でBGMを初期化
    const initialize = useCallback(async () => {
        if (initialized || initAttemptedRef.current) return;
        initAttemptedRef.current = true;

        try {
            const service = getBGMService();
            await service.initialize();
            setInitialized(true);
            console.log("🎵 BGM Provider initialized");

            // 初期化後、現在のページのBGMを再生
            const track = getTrackForPath(pathname);
            if (track !== "none" && enabled) {
                await playBGM(track);
                lastProcessedPathRef.current = pathname;
                setCurrentTrack(track);
                setIsPlaying(true);
            }
        } catch (error) {
            console.error("🎵 BGM initialization failed:", error);
            initAttemptedRef.current = false; // 再試行可能に
        }
    }, [pathname, enabled, initialized]);

    // ページ遷移時にBGMを切り替え
    useEffect(() => {
        if (!initialized || !enabled) return;

        // 同じパスは処理しない（StrictMode対策）
        if (lastProcessedPathRef.current === pathname) return;

        const track = getTrackForPath(pathname);
        const serviceTrack = getCurrentBGMTrack();

        console.log(`🎵 Page transition: ${pathname} -> track: ${track}, current: ${serviceTrack}`);

        // サービスの現在のトラックと比較（Provider側のstateではなく）
        if (track !== serviceTrack) {
            lastProcessedPathRef.current = pathname;

            if (track === "none") {
                stopBGM().then(() => {
                    setIsPlaying(false);
                    setCurrentTrack(null);
                });
            } else {
                playBGM(track).then(() => {
                    setCurrentTrack(track);
                    setIsPlaying(true);
                });
            }
        }
    }, [pathname, initialized, enabled]);

    // 有効/無効の切り替え
    const setEnabled = useCallback((newEnabled: boolean) => {
        setEnabledState(newEnabled);
        setBGMEnabled(newEnabled);

        if (!newEnabled) {
            setIsPlaying(false);
            setCurrentTrack(null);
            lastProcessedPathRef.current = null;
        } else if (initialized) {
            const track = getTrackForPath(pathname);
            if (track !== "none") {
                playBGM(track).then(() => {
                    lastProcessedPathRef.current = pathname;
                    setCurrentTrack(track);
                    setIsPlaying(true);
                });
            }
        }
    }, [initialized, pathname]);

    // 音量調整
    const setVolume = useCallback((newVolume: number) => {
        setVolumeState(newVolume);
        setBGMVolume(newVolume);
    }, []);

    // ユーザー操作を検知して初期化
    useEffect(() => {
        if (initialized) return;

        const handleUserInteraction = () => {
            initialize();
        };

        // クリック、タッチ、キー入力で初期化
        document.addEventListener("click", handleUserInteraction, { once: true });
        document.addEventListener("touchstart", handleUserInteraction, { once: true });
        document.addEventListener("keydown", handleUserInteraction, { once: true });

        return () => {
            document.removeEventListener("click", handleUserInteraction);
            document.removeEventListener("touchstart", handleUserInteraction);
            document.removeEventListener("keydown", handleUserInteraction);
        };
    }, [initialize, initialized]);

    const value: BGMContextType = {
        isPlaying,
        currentTrack,
        enabled,
        volume,
        initialized,
        setEnabled,
        setVolume,
        initialize,
    };

    return (
        <BGMContext.Provider value={value}>
            {children}
        </BGMContext.Provider>
    );
}
