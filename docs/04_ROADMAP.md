# CC Insight リファクタリング計画書

> **ドキュメント生成日**: 2026-01-12  
> **参照ドキュメント**: 01_ARCHITECTURE.md, 02_SCHEMA.md, 03_DATA_FLOW.md  
> **目的**: 技術的負債の解消とコードの健全化

---

## 1. 🔴 Critical Issues（直ちに修正すべき問題）

### 1.1 型安全性の問題

| 優先度 | 問題 | 場所 | リスク |
|:------:|------|------|--------|
| 🔴 | **DMMessage インターフェースにフィールド欠落** | `app/dm/page.tsx:26-35` | 実際のデータと型定義が不一致。`read`, `readAt`, `participants` が欠落 |
| 🔴 | **User と UserProfile の二重定義** | `lib/firestore.ts`, `lib/auth-context.tsx` | 同じコレクションに対する異なる型定義で混乱を招く |
| 🟠 | **31箇所の any 型使用** | 主に `lib/` 配下 | コンパイル時エラー検知不可、ランタイムエラーの温床 |
| 🟠 | **DailyLoginData の createdAt/updatedAt が any** | `lib/daily-login-bonus.ts:17-18` | Timestamp 型であるべき |

### 1.2 巨大ファイル問題

| ファイル | サイズ | 問題点 |
|---------|-------|--------|
| `lib/firestore.ts` | **63KB** (2096行) | 責務が多すぎる。CRUD、統計計算、ガーディアン、ストリークが混在 |
| `components/energy-investment-modal.tsx` | **61KB** | 1ファイルに過剰なロジック |
| `app/globals.css` | **39KB** | Tailwind purge 設定の確認が必要 |

### 1.3 アーキテクチャ上の問題

| 問題 | 詳細 | 影響 |
|------|------|------|
| **Firestore クエリの権限問題** | `where("read", "==", false)` がセキュリティルールで拒否される | クライアント側フィルタリングで回避中（非効率） |
| **インデックス欠落リスク** | 複合クエリに必要なインデックスが不足する可能性 | ランタイムエラー |
| **guardianProfile の二重管理** | `users.guardianProfile` と `guardianProfiles` コレクションが混在 | データ整合性リスク |

---

## 2. 📘 Recommended Rules（開発ルール）

### 2.1 命名規則

```
📁 ファイル命名
├── コンポーネント: kebab-case.tsx (例: energy-history-modal.tsx)
├── ユーティリティ: kebab-case.ts (例: daily-login-bonus.ts)
├── 型定義ファイル: types/{domain}.ts (新設推奨)
└── API Route: route.ts (Next.js規約)

📦 変数・関数命名
├── 関数: camelCase (例: getUserProfile, calculateStreak)
├── 型/Interface: PascalCase (例: UserProfile, DMMessage)
├── 定数: UPPER_SNAKE_CASE (例: MAX_LEVEL, ENERGY_PER_LEVEL)
└── Boolean: is/has/can プレフィックス (例: isAdmin, hasGuardian)

🗄️ Firestore コレクション
├── コレクション: snake_case (例: dm_messages, energy_history)
└── フィールド: camelCase (例: fromUserId, createdAt)
```

### 2.2 フォルダ構成ルール

```
推奨構成（将来像）:
├── app/                    # ページ・API（現状維持）
├── components/
│   ├── ui/                 # 汎用UIプリミティブ（現状維持）
│   ├── features/           # 機能別コンポーネント（新設）
│   │   ├── dm/
│   │   ├── guardian/
│   │   └── report/
│   └── layouts/            # レイアウト系（新設）
├── lib/
│   ├── db/                 # Firestore CRUD（新設・分割）
│   │   ├── users.ts
│   │   ├── reports.ts
│   │   ├── dm-messages.ts
│   │   └── guardians.ts
│   ├── services/           # ビジネスロジック（新設）
│   │   ├── energy.ts
│   │   ├── streak.ts
│   │   └── gamification.ts
│   ├── hooks/              # カスタムフック（新設）
│   └── types/              # 型定義（新設）
│       ├── user.ts
│       ├── report.ts
│       ├── dm.ts
│       └── guardian.ts
└── constants/              # 定数（新設）
```

### 2.3 コーディングルール

| ルール | 説明 |
|--------|------|
| **any 禁止** | `any` の代わりに `unknown` を使用し、型ガードで絞り込む |
| **型定義は types/ に集約** | コンポーネント内でのインターフェース定義を最小限に |
| **1ファイル 300行以内** | 超えたら分割を検討 |
| **単一責務** | 1ファイルに1つの責務のみ |
| **コレクション名は定数化** | `"dm_messages"` → `COLLECTIONS.DM_MESSAGES` |
| **Firestore 操作はラップ** | 直接 `addDoc` せず、専用関数経由 |

---

## 3. 📋 Step-by-Step Plan（段階的リファクタリング計画）

### Phase 0: 準備（所要時間: 1日）

> **目的**: リファクタリングの土台を整える

- [ ] **テスト環境構築**
  - [ ] 主要機能の手動テストチェックリスト作成
  - [ ] 本番データのバックアップ確認
  
- [ ] **ブランチ戦略**
  - [ ] `refactor/phase-1` ブランチを作成
  - [ ] 各フェーズ完了後にマージ

---

### Phase 1: 型定義の統合（所要時間: 2日）

> **目的**: 型の不整合を解消し、コンパイル時の安全性を確保

#### Step 1.1: types/ ディレクトリ作成

```bash
mkdir -p lib/types
```

#### Step 1.2: 型定義ファイルの作成

```
lib/types/
├── user.ts          # User, UserProfile を統合
├── report.ts        # Report 型
├── dm.ts            # DMMessage 型（read, readAt, participants 追加）
├── guardian.ts      # Guardian 関連型（既存を移動）
├── energy.ts        # Energy 関連型
└── index.ts         # 再エクスポート
```

#### Step 1.3: 既存ファイルの修正

| ファイル | 作業 |
|---------|------|
| `app/dm/page.tsx` | DMMessage を `lib/types/dm` からインポート |
| `lib/firestore.ts` | User, Report を `lib/types` からインポート |
| `lib/auth-context.tsx` | UserProfile を削除、User をインポート |

#### 検証ポイント
- [ ] `npm run build` が成功すること
- [ ] DM送受信が正常動作すること
- [ ] ログイン・ログアウトが正常動作すること

---

### Phase 2: firestore.ts の分割（所要時間: 3日）

> **目的**: 63KB の巨大ファイルを責務別に分割

#### Step 2.1: 分割計画

| 新ファイル | 移動する関数 | 行数（概算） |
|-----------|-------------|-------------|
| `lib/db/users.ts` | getAllUsers, updateUserStatus, updateUserRole, getUserBadges | ~200行 |
| `lib/db/reports.ts` | subscribeToReports, getReportsByPeriod, deleteAllReports | ~300行 |
| `lib/db/guardians.ts` | getUserGuardianProfile, updateUserGuardianProfile, getBulkUserGuardianProfiles | ~400行 |
| `lib/services/stats.ts` | calculateTeamStats, calculateOverallStats, calculateRankings | ~300行 |
| `lib/services/streak.ts` | calculateStreak, updateUserStreak | ~200行 |
| `lib/firestore.ts` | 残り（共通ユーティリティ等） | ~500行 |

#### Step 2.2: 実装順序

1. **新ファイル作成**（空ファイル + 型インポート）
2. **関数を1つずつ移動**（動作確認しながら）
3. **元ファイルから関数を削除**
4. **インポートパスを更新**

#### 検証ポイント
- [ ] 各分割後に `npm run build` 成功
- [ ] 日報投稿が動作すること
- [ ] ガーディアン育成が動作すること

---

### Phase 3: any 型の排除（所要時間: 2日）

> **目的**: 31箇所の any を適切な型に置換

#### 優先順位

| 優先度 | ファイル | any 箇所 | 対応 |
|:------:|---------|----------|------|
| 1 | `lib/daily-login-bonus.ts` | `createdAt: any` | `Timestamp \| FieldValue` に変更 |
| 2 | `lib/firestore.ts` | `memberStats: { [name: string]: any }` | 専用 Interface 定義 |
| 3 | `lib/report-schema.ts` | `reports: any[]` | `Report[]` に変更 |
| 4 | `lib/slack-notifier.ts` | `blocks?: any[]` | Slack SDK 型を使用 |

---

### Phase 4: セキュリティ強化（所要時間: 1日）

> **目的**: Firestore セキュリティルールを最適化

#### 作業内容

1. **firestore.rules のレビュー**
   - [ ] dm_messages の read クエリが許可されるよう修正
   - [ ] 不要な admin 権限を制限

2. **インデックス定義の整備**
   - [ ] firestore.indexes.json に全インデックスを記載
   - [ ] `firebase deploy --only firestore:indexes` で同期

---

### Phase 5: コンポーネント分割（所要時間: 3日）

> **目的**: 大きすぎるコンポーネントを分割

#### 対象ファイル

| ファイル | 分割案 |
|---------|--------|
| `energy-investment-modal.tsx` (61KB) | `EnergyDisplay`, `GuardianSelector`, `InvestmentForm` に分割 |
| `client-layout.tsx` (19KB) | `BottomNavigation` を独立ファイル化 |

---

## 4. 📊 進捗トラッキング

```
Phase 0: 準備           [░░░░░░░░░░] 0%
Phase 1: 型定義統合      [░░░░░░░░░░] 0%
Phase 2: firestore分割   [░░░░░░░░░░] 0%
Phase 3: any排除        [░░░░░░░░░░] 0%
Phase 4: セキュリティ    [░░░░░░░░░░] 0%
Phase 5: コンポーネント  [░░░░░░░░░░] 0%
```

---

## 5. リスク管理

### 5.1 リファクタリング中の注意事項

| リスク | 対策 |
|--------|------|
| 本番環境への影響 | 各フェーズ完了後にステージング環境でテスト |
| 依存関係の破壊 | インポートパス変更時は IDE の全検索で確認 |
| 型エラーの連鎖 | 段階的に修正、一度に全て変えない |
| ロールバック | 各フェーズを独立コミットとし、revert 可能に |

### 5.2 やらないこと

- ❌ 新機能の追加（リファクタリング中は禁止）
- ❌ パフォーマンス最適化（別フェーズで実施）
- ❌ UI/UX の変更

---

## 6. 完了条件

- [ ] `npm run build` がエラー 0 で完了
- [ ] `npm run lint` がエラー 0 で完了
- [ ] 主要機能の手動テストが全て PASS
- [ ] any 型が 0 箇所
- [ ] firestore.ts が 500行以下
- [ ] 新規ファイルが全て 300行以下

---

*このドキュメントはソースコード分析に基づいて生成されました。*
