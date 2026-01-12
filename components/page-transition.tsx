"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionProps {
    children: ReactNode;
}

// ページ遷移アニメーション設定
const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.98,
    },
    in: {
        opacity: 1,
        y: 0,
        scale: 1,
    },
    out: {
        opacity: 0,
        y: -10,
        scale: 1.02,
    },
};

const pageTransition = {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.25,
};

export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname();

    return (
        <motion.div
            key={pathname}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full"
        >
            {children}
        </motion.div>
    );
}

// シンプルなフェードイン（軽量版）
export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay }}
        >
            {children}
        </motion.div>
    );
}

// スタガードアニメーション（リスト用）
export function StaggerContainer({ children }: { children: ReactNode }) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: 0.05,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children }: { children: ReactNode }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 24,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

// プレスフィードバック（ボタン用）
export function PressableButton({
    children,
    onClick,
    className = "",
    disabled = false,
}: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}) {
    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={onClick}
            className={className}
            disabled={disabled}
        >
            {children}
        </motion.button>
    );
}
