/**
 * 統合ユーザー型定義
 * 
 * 重要: lib/firestore.ts の User と lib/auth-context.tsx の UserProfile を統合
 * Firestore コレクション: users
 */

import { Timestamp } from "firebase/firestore";
import { UserGuardianProfile, SnsAccounts } from "./guardian";

// 性別
export type Gender = 'male' | 'female' | 'other';

// 年齢層
export type AgeGroup = '10s' | '20s' | '30s' | '40s' | '50plus';

// チーム
export type TeamId = 'fukugyou' | 'taishoku' | 'buppan';

// ユーザー役割
// - member: 一般メンバー
// - teamLead: チーム統括（自チームのKPI編集可能）
// - admin: 管理者（全権限）
export type UserRole = 'member' | 'teamLead' | 'admin';

// ユーザーステータス
export type UserStatus = 'pending' | 'approved' | 'suspended';

/**
 * バッジ定義
 */
export interface UserBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Timestamp;
    category: 'streak' | 'views' | 'growth' | 'special';
}

/**
 * 統合ユーザー型
 * 
 * 注意: この型は Firestore の users コレクションと完全に対応
 */
export interface User {
    // 基本情報
    uid: string;
    email: string;
    realName: string;           // 漢字フルネーム（管理者のみ閲覧）
    furigana?: string;          // 読み仮名（ひらがな）- 検索用
    displayName: string;        // ニックネーム（公開）
    team: TeamId;
    role?: UserRole;            // 承認時に付与されるため optional
    status: UserStatus;
    emailVerified: boolean;

    // タイムスタンプ
    createdAt: Timestamp;
    approvedAt?: Timestamp;
    approvedBy?: string;
    lastLoginAt?: Timestamp;

    // プロフィール
    profileImage?: string;
    gender?: Gender;
    ageGroup?: AgeGroup;

    // ガーディアンシステム
    guardianProfile?: UserGuardianProfile;
    profileCompleted?: boolean;

    // SNSアカウント
    snsAccounts?: SnsAccounts;

    // バッジ
    badges?: UserBadge[];

    // ストリーク（後方互換性）
    currentStreak?: number;
    maxStreak?: number;
    lastReportDate?: Timestamp;
}

/**
 * @deprecated Use `User` instead
 * 後方互換性のためのエイリアス
 */
export type UserProfile = User;
