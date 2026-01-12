# CC Insight アーキテクチャ仕様書

> **ドキュメント更新日**: 2026-01-12  
> **生成方法**: ソースコードからの逆生成（リバースエンジニアリング）  
> **対象バージョン**: 0.1.3 (package.json より)  
> **最終更新**: Phase 2 Service Layer リファクタリング完了後

---

## 1. Tech Stack

### Core Framework

| カテゴリ | ライブラリ | バージョン | 備考 |
|---------|-----------|-----------|------|
| **Framework** | Next.js | 16.1.1 | App Router使用 |
| **Runtime** | React | 19.2.3 | React 19系 |
| **Language** | TypeScript | ^5 | strict: true |

### Backend / BaaS

| カテゴリ | ライブラリ | バージョン | 備考 |
|---------|-----------|-----------|------|
| **Firebase Client** | firebase | 12.7.0 | Firestore, Auth使用 |
| **Firebase Admin** | firebase-admin | 13.6.0 | API Routes等で使用 |
| **Google APIs** | googleapis | 170.0.0 | Google Sheets連携（バックアップ用） |

### UI / Styling

| カテゴリ | ライブラリ | バージョン | 備考 |
|---------|-----------|-----------|------|
| **CSS** | Tailwind CSS | ^4 | v4系（最新） |
| **アニメーション** | framer-motion | 12.24.10 | UIアニメーション |
| **アイコン** | lucide-react | 0.562.0 | |
| **UIプリミティブ** | @radix-ui | 各種 | Label, Slot, Tabs |

---

## 2. アーキテクチャ概要

### 2.1 レイヤー構成

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  (app/, components/)                                         │
│  - ページコンポーネント                                       │
│  - 表示ロジック・状態管理（useState, useEffect）              │
│  - ユーザー操作のハンドリング                                 │
└────────────────────────────┬────────────────────────────────┘
                             │ imports
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer (NEW)                      │
│  (lib/services/)                                             │
│  - データアクセスロジック（Firestore CRUD）                   │
│  - リアルタイムリスナー管理                                   │
│  - ビジネスロジックの抽象化                                   │
└────────────────────────────┬────────────────────────────────┘
                             │ imports
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Type Layer                              │
│  (lib/types/)                                                │
│  - 統合型定義（User, DMMessage, Report等）                   │
│  - インターフェース・型エイリアス                             │
└────────────────────────────┬────────────────────────────────┘
                             │ imports
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Layer                            │
│  (lib/firebase.ts, lib/firestore.ts)                         │
│  - Firebase SDKの初期化                                       │
│  - 低レベルCRUD操作                                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 UI層とデータ層の分離ルール

> **重要**: UIコンポーネントは直接 `firebase/firestore` をインポートしてはならない

| レイヤー | 許可されるインポート | 禁止されるインポート |
|---------|---------------------|---------------------|
| UI (app/, components/) | `@/lib/services/*`, `@/lib/types/*` | `firebase/firestore` (直接) |
| Service (lib/services/) | `firebase/firestore`, `@/lib/types/*`, `@/lib/firebase` | - |
| Type (lib/types/) | `firebase/firestore` (Timestamp型のみ) | - |

---

## 3. Directory Map

```
cc-insight/
├── app/                    # UI Layer - ページ・API
│   ├── admin/              # 管理者専用ページ群
│   ├── api/                # API Routes（バックエンド処理）
│   ├── dashboard/          # チーム別ダッシュボード
│   ├── dm/                 # ダイレクトメッセージ
│   ├── guardian/           # ガーディアン詳細
│   ├── guardians/          # ガーディアン一覧
│   ├── history/            # 履歴閲覧
│   ├── login/              # ログイン
│   ├── mypage/             # マイページ
│   ├── pending-approval/   # 承認待ち状態
│   ├── ranking/            # ランキング
│   ├── register/           # 新規登録
│   ├── report/             # 日報投稿
│   ├── team/               # チーム別ページ
│   ├── verify-email/       # メール認証
│   └── globals.css         # グローバルスタイル
│
├── components/             # UI Layer - 再利用可能コンポーネント
│   ├── ui/                 # 汎用UIプリミティブ（Button, Input等）
│   ├── client-layout.tsx   # メインレイアウト・認証Guard
│   └── *.tsx               # ドメイン固有コンポーネント
│
├── lib/
│   ├── services/           # ★ Service Layer (NEW)
│   │   ├── dm.ts           # DM操作（送信・受信・既読・監視）
│   │   ├── report.ts       # レポート操作
│   │   ├── user.ts         # ユーザー操作
│   │   └── index.ts        # 統合エクスポート
│   │
│   ├── types/              # ★ Type Layer (NEW)
│   │   ├── user.ts         # User型定義
│   │   ├── dm.ts           # DMMessage型定義
│   │   ├── report.ts       # Report型定義
│   │   ├── guardian.ts     # Guardian型定義
│   │   ├── energy.ts       # Energy型定義
│   │   └── index.ts        # 統合エクスポート
│   │
│   ├── firebase.ts         # Firebase初期化
│   ├── firestore.ts        # 低レベルCRUD操作
│   ├── auth-context.tsx    # 認証コンテキスト
│   ├── guardian-*.ts       # ガーディアンシステム関連
│   ├── energy-*.ts         # エナジー経済システム関連
│   └── ...                 # その他ユーティリティ
│
├── public/                 # 静的アセット
├── scripts/                # 運用スクリプト
├── docs/                   # ドキュメント
├── firestore.rules         # セキュリティルール
├── firestore.indexes.json  # Firestoreインデックス定義
└── vercel.json             # Vercelデプロイ設定
```

---

## 4. Service Layer 詳細

### 4.1 lib/services/dm.ts

**責務**: DMメッセージに関する全てのデータ操作

| 関数 | 説明 |
|------|------|
| `sendDMMessage(params)` | メッセージ送信 |
| `sendDMToAdmins(userId, name, message)` | メンバー → 運営へDM送信（全管理者に配信） |
| `sendAdminDMToUser(...)` | 管理者 → メンバーへDM送信 |
| `subscribeToDMMessages(userId, callback)` | ユーザーのDMをリアルタイム監視 |
| `subscribeToAdminDMWithUser(adminUid, targetUserId, callback)` | 管理者が特定ユーザーとのDMを監視 |
| `subscribeToUnreadCount(userId, callback)` | 未読数をリアルタイム監視（バッジ用） |
| `markMessagesAsRead(userId)` | 未読メッセージを既読にする |
| `getAdminUIDs()` | 全管理者のUID取得 |

### 4.2 lib/services/report.ts

**責務**: 日報レポートに関するデータ操作

| 関数 | 説明 |
|------|------|
| `createReport(params)` | 新規レポート作成 |
| `subscribeToReports(callback, teamId?)` | レポートリアルタイム監視（re-export） |
| `getReportsByPeriod(period, teamId?)` | 期間指定でレポート取得（re-export） |
| `calculateTeamStats(reports, teamId)` | チーム統計計算（re-export） |
| その他 | lib/firestore.ts から re-export |

### 4.3 lib/services/user.ts

**責務**: ユーザー情報に関するデータ操作

| 関数 | 説明 |
|------|------|
| `getAllUsers()` | 全ユーザー取得（re-export） |
| `updateUserStatus(userId, status, adminUid)` | ステータス更新（re-export） |
| `updateUserRole(userId, role)` | 役割更新（re-export） |
| `getUserGuardianProfile(userId)` | ガーディアンプロファイル取得（re-export） |
| その他 | lib/firestore.ts から re-export |

---

## 5. Type Layer 詳細

### 5.1 lib/types/index.ts

**使用方法**:
```typescript
import { User, DMMessage, Report } from "@/lib/types";
```

| ファイル | 定義されている型 |
|---------|-----------------|
| `user.ts` | `User`, `UserProfile`, `Gender`, `AgeGroup`, `TeamId`, `UserRole`, `UserStatus`, `UserBadge` |
| `dm.ts` | `DMMessage`, `CreateDMMessagePayload` |
| `report.ts` | `Report`, `TeamType`, `TeamInfo`, `TEAMS` |
| `guardian.ts` | `GuardianId`, `GuardianInstance`, `UserGuardianProfile` 等（re-export） |
| `energy.ts` | `EnergyHistoryRecord`, `EnergyBreakdown`, `EnergyHistorySummary` |

---

## 6. Routing Structure

### 6.1 ユーザー向けページ

| URL | ページ | 認証 | 説明 |
|-----|-------|-----|------|
| `/` | トップ | 不要 | リダイレクト用 |
| `/login` | ログイン | 不要 | メール/パスワード認証 |
| `/register` | 新規登録 | 不要 | ユーザー登録 |
| `/verify-email` | メール認証 | 不要 | メール確認 |
| `/pending-approval` | 承認待ち | 必要 | 管理者承認待ち状態 |
| `/mypage` | マイページ | 必要 | ユーザー情報・設定 |
| `/report` | 日報投稿 | 必要 | 日報作成・管理 |
| `/dm` | DM | 必要 | 運営との1対1チャット |
| `/ranking` | ランキング | 必要 | メンバーランキング |
| `/history` | 履歴 | 必要 | 投稿履歴閲覧 |
| `/guardian` | ガーディアン | 必要 | ガーディアン詳細 |
| `/guardians` | ガーディアン一覧 | 必要 | 所持ガーディアン |

### 6.2 管理者専用ページ (`/admin/*`)

| URL | 機能 |
|-----|------|
| `/admin/login` | 管理者ログイン |
| `/admin/users` | ユーザー管理 |
| `/admin/dm` | DM管理 |
| `/admin/messages` | メッセージ管理 |
| `/admin/invitations` | 招待管理 |
| `/admin/prompts` | AIプロンプト管理 |
| `/admin/sns-approvals` | SNS投稿承認 |
| `/admin/audit` | 監査ログ |
| `/admin/logs` | ログ閲覧 |
| `/admin/monitor` | モニタリング |
| `/admin/url-opener` | URL一括オープン |

### 6.3 API Routes (`/api/*`)

| エンドポイント | メソッド | 機能 |
|--------------|---------|------|
| `/api/ai-feedback` | POST | AI日報フィードバック生成 |
| `/api/test-slack` | POST | Slack通知テスト |
| `/api/cron/backup-to-sheets` | GET | Google Sheetsバックアップ |
| `/api/cron/check-escalation` | GET | エスカレーション確認 |
| `/api/cron/daily-summary` | GET | 日次サマリー生成 |
| `/api/cron/decade-judgment` | GET | 10日判定処理 |
| `/api/cron/month-end-judgment` | GET | 月末判定処理 |

---

## 7. 設定ファイル詳細

### 7.1 next.config.ts

```typescript
{
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
  },
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tabs'],
  },
}
```

### 7.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

---

## 8. アーキテクチャ上の特徴

1. **レイヤー分離**: UI → Service → Type → Firebase の明確な階層構造
2. **ゲーミフィケーション重視**: ガーディアン、エナジー、ストリーク、レベルシステム
3. **PWA対応**: manifest.json, アイコン群が配置済み
4. **マルチチーム構成**: 物販/副業/退職の3チーム
5. **Cron API**: Vercel Cronによる定期処理
6. **外部連携**: Slack通知、Google Sheets連携

---

*このドキュメントは2026-01-12にPhase 2リファクタリング完了後に更新されました。*
