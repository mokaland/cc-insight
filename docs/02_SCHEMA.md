# CC Insight データスキーマ仕様書

> **ドキュメント更新日**: 2026-01-12  
> **生成方法**: ソースコードからの逆生成（リバースエンジニアリング）  
> **対象コレクション数**: 12  
> **最終更新**: Phase 2 Service Layer リファクタリング完了後

---

## 1. Firestore コレクション一覧

| コレクション | 用途 | ドキュメントID形式 |
|-------------|------|-------------------|
| `users` | ユーザー情報 | Firebase Auth UID |
| `reports` | 日報データ | 自動生成 |
| `dm_messages` | ダイレクトメッセージ | 自動生成 |
| `energy_history` | エナジー獲得履歴 | `{userId}_{date}` |
| `dailyLogins` | デイリーログインボーナス | Firebase Auth UID |
| `invitations` | 招待コード | 招待コード文字列 |
| `errorLogs` | エラーログ | 自動生成 |
| `post_feedbacks` | AIポストフィードバック | 自動生成 |
| `guardianProfiles` | ガーディアンプロファイル | Firebase Auth UID |
| `ai_settings` | AI設定 | 設定名（例: `post_feedback_prompt`） |
| `team_goals` | チーム目標 | `{teamId}_{period}` |
| `judgment_history` | 判定履歴 | 自動生成 |

---

## 2. コレクション詳細スキーマ

### 2.1 users コレクション

**定義ファイル**: `lib/types/user.ts` (統合定義)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| `uid` | string | ✅ | Firebase Auth UID |
| `email` | string | ✅ | メールアドレス |
| `realName` | string | ✅ | 漢字フルネーム（管理者のみ閲覧） |
| `displayName` | string | ✅ | ニックネーム（公開） |
| `team` | `"fukugyou" \| "taishoku" \| "buppan"` | ✅ | 所属チーム |
| `role` | `"member" \| "admin"` | ⚠️ | 役割（承認時に付与） |
| `status` | `"pending" \| "approved" \| "suspended"` | ✅ | 承認状態 |
| `emailVerified` | boolean | ✅ | メール認証済みフラグ |
| `createdAt` | Timestamp | ✅ | 作成日時 |
| `approvedAt` | Timestamp | | 承認日時 |
| `approvedBy` | string | | 承認した管理者UID |
| `lastLoginAt` | Timestamp | | 最終ログイン日時 |
| `profileImage` | string | | プロフィール画像URL |
| `gender` | `"male" \| "female" \| "other"` | | 性別 |
| `ageGroup` | `"10s" \| "20s" \| "30s" \| "40s" \| "50plus"` | | 年齢層 |
| `guardianProfile` | UserGuardianProfile | | ガーディアンシステムデータ |
| `snsAccounts` | SnsAccounts | | SNSアカウント設定 |
| `currentStreak` | number | | 現在のストリーク（後方互換） |
| `maxStreak` | number | | 最大ストリーク（後方互換） |
| `lastReportDate` | Timestamp | | 最終日報日（後方互換） |
| `badges` | UserBadge[] | | バッジ一覧 |

**⚠️ 注意**: `role` フィールドは新規登録時には含まれず、管理者承認時に付与される。

---

### 2.2 reports コレクション

**定義ファイル**: `lib/firestore.ts` (52-84行目)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| `id` | string | ✅ | ドキュメントID |
| `team` | string | ✅ | チームID |
| `teamType` | `"shorts" \| "x"` | ✅ | チームタイプ |
| `name` | string | ✅ | ユーザー表示名 |
| `date` | string | ✅ | 報告日（YYYY-MM-DD） |
| `createdAt` | Timestamp | ✅ | 作成日時 |
| `userId` | string | | ユーザーUID |
| `userEmail` | string | | ユーザーメール |
| **Shorts系フィールド** |||
| `accountId` | string | | アカウントID |
| `igViews` | number | | Instagram再生数 |
| `igProfileAccess` | number | | プロフアクセス数 |
| `igExternalTaps` | number | | 外部リンクタップ数 |
| `igInteractions` | number | | インタラクション数 |
| `weeklyStories` | number | | 週間ストーリー数 |
| `igFollowers` | number | | IGフォロワー数 |
| `ytFollowers` | number | | YouTubeフォロワー数 |
| `tiktokFollowers` | number | | TikTokフォロワー数 |
| `igPosts` | number | | IG投稿数 |
| `ytPosts` | number | | YouTube投稿数 |
| `tiktokPosts` | number | | TikTok投稿数 |
| `todayComment` | string | | 今日のコメント |
| **X系フィールド** |||
| `postCount` | number | | 投稿数 |
| `postUrls` | string[] | | 投稿URL一覧 |
| `posts` | {url, content}[] | | 投稿詳細（AIフィードバック用） |
| `likeCount` | number | | いいね数 |
| `replyCount` | number | | リプライ数 |
| `xFollowers` | number | | Xフォロワー数 |

---

### 2.3 dm_messages コレクション

**定義ファイル**: `lib/types/dm.ts` (統合定義)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| `id` | string | ✅ | ドキュメントID |
| `fromUserId` | string | ✅ | 送信者UID |
| `fromUserName` | string | ✅ | 送信者表示名 |
| `toUserId` | string | ✅ | 受信者UID |
| `toUserName` | string | ✅ | 受信者表示名 |
| `message` | string | ✅ | メッセージ内容 |
| `createdAt` | Timestamp | ✅ | 作成日時 |
| `isAdmin` | boolean | ✅ | 管理者からのメッセージか |
| `read` | boolean | ✅ | 既読フラグ |
| `readAt` | Timestamp | | 既読日時 |
| `participants` | string[] | | 参加者UID一覧 |

---

### 2.4 energy_history コレクション

**定義ファイル**: `lib/energy-history.ts` (30-38行目)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| `id` | string | ✅ | `{userId}_{date}` 形式 |
| `userId` | string | ✅ | ユーザーUID |
| `date` | string | ✅ | 日付（YYYY-MM-DD） |
| `breakdown` | EnergyBreakdown | ✅ | 内訳（dailyReport, streakBonus, performanceBonus, weeklyBonus） |
| `totalEarned` | number | ✅ | 合計獲得エナジー |
| `streakDay` | number | ✅ | ストリーク日数 |
| `createdAt` | Timestamp | ✅ | 作成日時 |

---

### 2.5 dailyLogins コレクション

**定義ファイル**: `lib/daily-login-bonus.ts` (9-19行目)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| `userId` | string | ✅ | ユーザーUID |
| `lastLoginDate` | string | ✅ | 最終ログイン日（YYYY-MM-DD） |
| `consecutiveDays` | number | ✅ | 連続ログイン日数 |
| `totalLogins` | number | ✅ | 累計ログイン回数 |
| `lastBonusEnergy` | number | ✅ | 前回のボーナスエナジー |
| `bonusHistory` | BonusRecord[] | ✅ | ボーナス履歴（最新10件） |
| `nextBonusTier` | number | ✅ | 次のティアまでの日数 |
| `createdAt` | **any** | ✅ | 作成日時 |
| `updatedAt` | **any** | ✅ | 更新日時 |

---

### 2.6 invitations コレクション

**定義ファイル**: `lib/invitations.ts` (17-26行目)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| `id` | string | ✅ | 招待コード |
| `code` | string | ✅ | 招待コード（idと同一） |
| `createdBy` | string | ✅ | 作成した管理者UID |
| `createdAt` | Timestamp | ✅ | 作成日時 |
| `isUsed` | boolean | ✅ | 使用済みフラグ |
| `usedBy` | string | | 使用したユーザーUID |
| `usedAt` | Timestamp | | 使用日時 |
| `memo` | string | | メモ |

---

### 2.7 guardianProfiles コレクション

**定義ファイル**: `lib/guardian-collection.ts` (459-467行目)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| `gender` | `"male" \| "female" \| "other"` | | 性別 |
| `ageGroup` | `"10s" \| "20s" \| "30s" \| "40s" \| "50plus"` | | 年齢層 |
| `energy` | UserEnergyData | ✅ | エナジーデータ |
| `streak` | UserStreakData | ✅ | ストリークデータ |
| `guardians` | {[GuardianId]: GuardianInstance} | ✅ | 保有ガーディアン |
| `activeGuardianId` | GuardianId \| null | ✅ | アクティブガーディアンID |
| `registeredAt` | Timestamp | ✅ | 登録日時 |

**サブ型: UserEnergyData**
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `current` | number | 現在のエナジー |
| `totalEarned` | number | 累計獲得エナジー |
| `lastEarnedAt` | Timestamp \| null | 最終獲得日時 |

**サブ型: UserStreakData**
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `current` | number | 現在のストリーク |
| `max` | number | 最大ストリーク |
| `multiplier` | number | 倍率 |
| `lastReportAt` | Timestamp \| null | 最終報告日時 |
| `graceHours` | number | 猶予時間 |

---

## 3. ✅ 解決済み：Phase 1-2 リファクタリング

### 3.1 型定義の統合（Phase 1 で解決）

#### ✅ 解決: DMMessage インターフェースの統合

**場所**: `lib/types/dm.ts`

```typescript
// 統合定義（完全）
export interface DMMessage {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  message: string;
  createdAt: Timestamp;
  isAdmin: boolean;
  read: boolean;           // ✅ 追加済み
  readAt?: Timestamp;      // ✅ 追加済み
  participants: string[];  // ✅ 追加済み
}
```

#### ✅ 解決: User と UserProfile の統合

**場所**: `lib/types/user.ts`

`User` と `UserProfile` を単一の `User` 型に統合。`UserProfile` は非推奨（deprecated）として `User` の型エイリアスに。

---

### 3.2 Service Layer の導入（Phase 2 で解決）

UIコンポーネントからの直接 Firestore 操作を `lib/services/` に集約。

| ファイル | 責務 |
|---------|------|
| `lib/services/dm.ts` | DM送受信、既読処理、リアルタイム監視 |
| `lib/services/report.ts` | レポート操作 |
| `lib/services/user.ts` | ユーザー操作 |

---

## 4. ⚠️ 残存課題：技術的負債

**発見数**: 31箇所

#### 🟠 重大な箇所

| ファイル | 行 | 問題 |
|---------|-----|------|
| `lib/daily-login-bonus.ts` | 17-18 | `createdAt: any`, `updatedAt: any` |
| `lib/firestore.ts` | 237, 450 | `memberStats: { [name: string]: any }` |
| `lib/firestore.ts` | 538 | `updates: any` |
| `lib/report-schema.ts` | 341, 384, 401, 424, 444, 456 | 複数の `reports: any[]` |
| `lib/slack-notifier.ts` | 26-27 | `blocks?: any[]`, `attachments?: any[]` |

**影響**: 型安全性の低下、コンパイル時のエラー検知不可。

---

### 3.3 データ整合性の懸念

#### 🟡 SNS承認状態の複雑性

**場所**: `lib/guardian-collection.ts` (22-45行目)

`SnsAccounts` に以下の冗長なフラグが存在:
- 個別SNSの `status` フィールド（4つ）
- 全体の `profileCompleted` フラグ
- `completionBonusClaimed` フラグ

これらの整合性を維持するロジックが分散している。

---

### 3.4 コレクション名の不整合

| 使用箇所 | コレクション名 | 懸念 |
|---------|--------------|------|
| `daily-login-bonus.ts` | `guardianProfiles` | 実際は `users.guardianProfile` として埋め込まれている可能性 |

**確認必要**: `guardianProfiles` が独立コレクションとして使用されているか、`users` のサブドキュメントか。

---

## 5. 推奨アクション

### 完了済み（Phase 1-2）

- [x] **DMMessage インターフェースを修正**: `read`, `readAt`, `participants` フィールドを追加
- [x] **User と UserProfile を統合**: `lib/types/user.ts` に単一定義
- [x] **Service Layer の導入**: `lib/services/` にDM/Report/User操作を集約

### 優先度：高

1. **any 型の排除**: 特に `daily-login-bonus.ts` の Timestamp 型
2. **lib/firestore.ts の分割**: 63KBの巨大ファイルを機能別に分割

### 優先度：中

3. **Firestore セキュリティルールとの整合性確認**
4. **インデックス定義の文書化**

### 優先度：低

5. **guardianProfiles コレクションの存在確認**
6. **SNS承認状態の簡素化検討**

---

*このドキュメントは2026-01-12にPhase 2リファクタリング完了後に更新されました。*
