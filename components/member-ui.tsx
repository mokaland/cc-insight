"use client";

import React from "react";

interface MemberLayoutProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * メンバー画面用レイアウトラッパー
 * ニューモーフィズムテーマを適用
 */
export function MemberLayout({ children, className = "" }: MemberLayoutProps) {
    return (
        <div className={`member-theme min-h-screen ${className}`}>
            {children}
        </div>
    );
}

/**
 * ニューモーフィズムカード
 */
interface NeuCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function NeuCard({ children, className = "", onClick }: NeuCardProps) {
    return (
        <div
            className={`neu-card ${className}`}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}

/**
 * ニューモーフィズムボタン
 */
interface NeuButtonProps {
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "primary" | "success" | "gold";
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
}

export function NeuButton({
    children,
    className = "",
    variant = "default",
    onClick,
    disabled = false,
    type = "button"
}: NeuButtonProps) {
    const variantClass = {
        default: "neu-button",
        primary: "neu-button neu-button-primary",
        success: "neu-button neu-button-success",
        gold: "neu-button neu-button-gold",
    }[variant];

    return (
        <button
            type={type}
            className={`${variantClass} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

/**
 * ニューモーフィズム入力フィールド
 */
interface NeuInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
}

export function NeuInput({ className = "", ...props }: NeuInputProps) {
    return (
        <input
            className={`neu-input ${className}`}
            {...props}
        />
    );
}

/**
 * ニューモーフィズムプログレスバー
 */
interface NeuProgressProps {
    value: number; // 0-100
    variant?: "default" | "gold";
    className?: string;
}

export function NeuProgress({ value, variant = "default", className = "" }: NeuProgressProps) {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <div className={`neu-progress ${variant === "gold" ? "neu-progress-gold" : ""} ${className}`}>
            <div
                className="neu-progress-bar"
                style={{ width: `${clampedValue}%` }}
            />
        </div>
    );
}

/**
 * ニューモーフィズムバッジ
 */
interface NeuBadgeProps {
    children: React.ReactNode;
    variant?: "default" | "primary" | "success" | "gold";
    className?: string;
}

export function NeuBadge({ children, variant = "default", className = "" }: NeuBadgeProps) {
    const variantClass = {
        default: "neu-badge",
        primary: "neu-badge neu-badge-primary",
        success: "neu-badge neu-badge-success",
        gold: "neu-badge neu-badge-gold",
    }[variant];

    return (
        <span className={`${variantClass} ${className}`}>
            {children}
        </span>
    );
}

/**
 * ニューモーフィズムリスト項目
 */
interface NeuListItemProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function NeuListItem({ children, className = "", onClick }: NeuListItemProps) {
    return (
        <div
            className={`neu-list-item ${className}`}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}

/**
 * 大きな数字表示（エナジー等）
 */
interface DisplayNumberProps {
    value: number | string;
    suffix?: string;
    className?: string;
}

export function DisplayNumber({ value, suffix = "", className = "" }: DisplayNumberProps) {
    return (
        <span className={`member-display-number ${className}`}>
            {value}{suffix}
        </span>
    );
}
