"use client";

/**
 * 🔊 グローバルSEプロバイダー
 * 全てのボタンクリックに効果音を自動適用
 */

import React, { useEffect, useRef } from "react";
import { getSEService, playClickLight, playClickAction } from "@/lib/se-service";

interface SEProviderProps {
    children: React.ReactNode;
}

// アクションボタンを判別するセレクター
const ACTION_BUTTON_SELECTORS = [
    '[data-se="action"]',           // data属性で明示的に指定
    'button[type="submit"]',        // フォーム送信ボタン
    '.btn-primary',                 // プライマリボタン
    '.action-button',               // アクションボタンクラス
];

// 無視するセレクター
const IGNORE_SELECTORS = [
    '[data-se="none"]',             // SE無効化
    '.bgm-toggle',                  // BGMトグル
    '.volume-slider',               // 音量スライダー
];

export function SEProvider({ children }: SEProviderProps) {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (initializedRef.current) return;
        initializedRef.current = true;

        // SEサービスを初期化
        const service = getSEService();
        service.initialize();

        // グローバルクリックハンドラー
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // クリックされた要素またはその親がボタン/リンクかチェック
            const clickable = target.closest('button, a, [role="button"], .clickable');
            if (!clickable) return;

            // 無視リストに含まれるかチェック
            for (const selector of IGNORE_SELECTORS) {
                if (clickable.matches(selector)) return;
            }

            // アクションボタンかどうかチェック
            let isAction = false;
            for (const selector of ACTION_BUTTON_SELECTORS) {
                if (clickable.matches(selector)) {
                    isAction = true;
                    break;
                }
            }

            // SE再生
            if (isAction) {
                playClickAction();
            } else {
                playClickLight();
            }
        };

        // イベントリスナー登録（capture phaseで早めに実行）
        document.addEventListener("click", handleClick, { capture: true });

        return () => {
            document.removeEventListener("click", handleClick, { capture: true });
        };
    }, []);

    return <>{children}</>;
}
