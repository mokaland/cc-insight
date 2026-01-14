"use client";

/**
 * 🎵 BGM Provider（シンプル版）
 * ページ遷移に応じてBGMを切り替える
 * 
 * 修正履歴:
 * - 2026-01-14 v3: シンプル化、サービスに処理を委譲
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
    getCurrentBGMTrack,
    isBGMPlaying
} from "@/lib/bgm-service";
import { getTrackForPath, BGMTrack } from "@/lib/bgm-compositions";

interface BGMContextType {
    enabled: boolean;
    volume: number;
    initialized: boolean;
    setEnabled: (enabled: boolean) => void;
    setVolume: (volume: number) => void;
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
    const [enabled, setEnabledState] = useState(true);
    const [volume, setVolumeState] = useState(0.3);
    const [initialized, setInitialized] = useState(false);

    // 初期化フラグ
    const initRef = useRef(false);
    // 最後のpathname（重複防止）
    const lastPathRef = useRef<string>("");

    // 設定読み込み
    useEffect(() => {
        if (typeof window === "undefined") return;
        const settings = getBGMSettings();
        setEnabledState(settings.enabled);
        setVolumeState(settings.volume);
    }, []);

    // 初期化
    const initializeBGM = useCallback(async () => {
        if (initRef.current || initialized) return;
        initRef.current = true;

        try {
            const service = getBGMService();
            await service.initialize();
            setInitialized(true);
            console.log("🎵 BGM Provider initialized");

            // 初期ページのBGMを再生
            const track = getTrackForPath(pathname);
            if (track !== "none" && enabled) {
                lastPathRef.current = pathname;
                await playBGM(track);
            }
        } catch (error) {
            console.error("🎵 Init failed:", error);
            initRef.current = false;
        }
    }, [pathname, enabled, initialized]);

    // ページ遷移時のBGM切り替え
    useEffect(() => {
        if (!initialized || !enabled) return;
        if (lastPathRef.current === pathname) return;

        const track = getTrackForPath(pathname);
        console.log(`🎵 Path changed: ${pathname} -> ${track}`);

        lastPathRef.current = pathname;

        if (track === "none") {
            stopBGM();
        } else {
            playBGM(track);
        }
    }, [pathname, initialized, enabled]);

    // 有効/無効切り替え
    const setEnabled = useCallback((newEnabled: boolean) => {
        setEnabledState(newEnabled);
        setBGMEnabled(newEnabled);

        if (newEnabled && initialized) {
            const track = getTrackForPath(pathname);
            if (track !== "none") {
                lastPathRef.current = pathname;
                playBGM(track);
            }
        }
    }, [initialized, pathname]);

    // 音量調整
    const setVolume = useCallback((newVolume: number) => {
        setVolumeState(newVolume);
        setBGMVolume(newVolume);
    }, []);

    // ユーザー操作検知
    useEffect(() => {
        if (initialized) return;

        const handler = () => {
            initializeBGM();
            // 一度だけ実行
            document.removeEventListener("click", handler);
            document.removeEventListener("touchstart", handler);
            document.removeEventListener("keydown", handler);
        };

        document.addEventListener("click", handler);
        document.addEventListener("touchstart", handler);
        document.addEventListener("keydown", handler);

        return () => {
            document.removeEventListener("click", handler);
            document.removeEventListener("touchstart", handler);
            document.removeEventListener("keydown", handler);
        };
    }, [initializeBGM, initialized]);

    const value: BGMContextType = {
        enabled,
        volume,
        initialized,
        setEnabled,
        setVolume,
    };

    return (
        <BGMContext.Provider value={value}>
            {children}
        </BGMContext.Provider>
    );
}
