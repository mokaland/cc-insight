"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getAllUsers, User as FirestoreUser, teams } from "@/lib/firestore";

interface GlobalSearchProps {
    className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<FirestoreUser[]>([]);
    const [allUsers, setAllUsers] = useState<FirestoreUser[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 初回のみ全ユーザーをキャッシュ
    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoading(true);
                const users = await getAllUsers();
                setAllUsers(users.filter(u => u.status === "approved"));
            } catch (error) {
                console.error("ユーザー取得エラー:", error);
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    // クエリが変更されたら検索
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = allUsers.filter(user =>
            user.displayName.toLowerCase().includes(lowerQuery) ||
            user.realName?.toLowerCase().includes(lowerQuery) ||
            (user as any).furigana?.toLowerCase().includes(lowerQuery) ||
            user.email.toLowerCase().includes(lowerQuery)
        ).slice(0, 5); // 最大5件

        setResults(filtered);
    }, [query, allUsers]);

    // 外クリックで閉じる
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (userId: string) => {
        setQuery("");
        setIsOpen(false);
        router.push(`/admin/users/${userId}`);
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="メンバーを検索..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="pl-9 pr-8 bg-white/5 border-white/10 text-sm h-9"
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery("");
                            setResults([]);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* 検索結果ドロップダウン */}
            {isOpen && query && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
                    {results.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                            {loading ? "読み込み中..." : "該当なし"}
                        </div>
                    ) : (
                        <div className="py-1">
                            {results.map((user) => {
                                const team = teams.find(t => t.id === user.team);
                                return (
                                    <button
                                        key={user.uid}
                                        onClick={() => handleSelect(user.uid)}
                                        className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                            style={{
                                                backgroundColor: team?.color || "#6b7280",
                                                boxShadow: `0 0 10px ${team?.color || "#6b7280"}40`,
                                            }}
                                        >
                                            {user.displayName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{user.displayName}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.realName || user.email}
                                            </p>
                                        </div>
                                        <span
                                            className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                                            style={{
                                                backgroundColor: `${team?.color || "#6b7280"}20`,
                                                color: team?.color || "#6b7280",
                                            }}
                                        >
                                            {team?.name?.replace("チーム", "") || "-"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
