# CC Insight アーキテクチャ仕様書

> **ドキュメント生成日**: 2026-01-12  
> **生成方法**: ソースコードからの逆生成（リバースエンジニアリング）  
> **対象バージョン**: 0.1.3 (package.json より)

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

### ビルド / 開発

| カテゴリ | ライブラリ | バージョン |
|---------|-----------|-----------|
| **PostCSS** | @tailwindcss/postcss | ^4 |
| **TypeScript実行** | tsx | 4.21.0 |
| **CSSアニメーション** | tw-animate-css | 1.4.0 |

---

## 2. Directory Map

```
cc-insight/
├── app/                    # Next.js App Router（ページ・API）
│   ├── admin/              # 管理者専用ページ群
│   ├── api/                # API Routes（バックエンド処理）
│   ├── dashboard/          # チーム別ダッシュボード
│   ├── dm/                 # ダイレクトメッセージ
│   ├── guardian/           # ガーディアン詳細（単数）
│   ├── guardians/          # ガーディアン一覧（複数）
│   ├── history/            # 履歴閲覧
│   ├── login/              # ログイン
│   ├── mypage/             # マイページ
│   ├── pending-approval/   # 承認待ち状態
│   ├── ranking/            # ランキング
│   ├── register/           # 新規登録
│   ├── report/             # 日報投稿
│   ├── team/               # チーム別ページ
│   ├── verify-email/       # メール認証
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # トップページ（リダイレクト）
│   └── globals.css         # グローバルスタイル（39KB）
│
├── components/             # UIコンポーネント群
│   ├── ui/                 # 汎用UIプリミティブ（6件）
│   └── *.tsx               # ドメイン固有コンポーネント（17件）
│
├── lib/                    # ビジネスロジック・ユーティリティ（29ファイル）
│   ├── firebase.ts         # Firebase初期化
│   ├── firestore.ts        # Firestore CRUD操作（63KB・巨大）
│   ├── auth-context.tsx    # 認証コンテキスト
│   ├── guardian-*.ts       # ガーディアンシステム関連（4件）
│   ├── energy-*.ts         # エナジー経済システム関連（4件）
│   ├── gamification.ts     # ゲーミフィケーション
│   ├── streak-*.ts         # 連続投稿システム関連（2件）
│   ├── daily-*.ts          # 日次処理関連（2件）
│   ├── ai-service.ts       # AI連携
│   ├── slack-notifier.ts   # Slack通知
│   └── ...                 # その他ユーティリティ
│
├── public/                 # 静的アセット
│   ├── manifest.json       # PWA設定
│   ├── icon-*.png          # PWAアイコン
│   └── ...
│
├── scripts/                # 運用スクリプト（8件）
├── docs/                   # ドキュメント（17件）
├── firestore.rules         # セキュリティルール（10KB）
├── firestore.indexes.json  # Firestoreインデックス定義
├── firebase.json           # Firebase設定
├── next.config.ts          # Next.js設定
└── vercel.json             # Vercelデプロイ設定
```

### フォルダ役割定義

| フォルダ | 役割 | ファイル数 |
|---------|-----|-----------|
| `app/` | ページルーティング・API定義 | 42件 |
| `components/` | 再利用可能UIコンポーネント | 23件 |
| `lib/` | ビジネスロジック・Firebase操作・ゲーミフィケーション | 29件 |
| `public/` | PWA設定・アイコン・静的ファイル | 13件 |
| `scripts/` | データ移行・バックアップ運用スクリプト | 8件 |
| `docs/` | プロジェクトドキュメント | 17件 |

---

## 3. Routing Structure

### 3.1 ユーザー向けページ

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

### 3.2 チーム別ダッシュボード

| URL | チーム |
|-----|-------|
| `/team/buppan` | 物販チーム |
| `/team/fukugyou` | 副業チーム |
| `/team/taishoku` | 退職チーム |
| `/dashboard` | ダッシュボードTOP |
| `/dashboard/smartphone` | スマホチーム |
| `/dashboard/side-job` | サイドジョブ |
| `/dashboard/resignation` | 退職代行 |

### 3.3 管理者専用ページ (`/admin/*`)

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

### 3.4 API Routes (`/api/*`)

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

## 4. 設定ファイル詳細

### 4.1 next.config.ts

```typescript
// 主要設定
{
  images: {
    formats: ['image/webp'],          // WebP優先
    minimumCacheTTL: 31536000,        // 1年キャッシュ
  },
  productionBrowserSourceMaps: false,  // 本番ソースマップ無効
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tabs'],
  },
}
```

### 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] }  // @/エイリアス
  }
}
```

### 4.3 firebase.json

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

> **注意**: Hosting, Functions等の設定は含まれていない。Firestoreルールのみ管理。

---

## 5. 検出された特記事項

### 5.1 巨大ファイル警告

| ファイル | サイズ | 推奨アクション |
|---------|-------|--------------|
| `lib/firestore.ts` | 63KB | 分割を強く推奨 |
| `components/energy-investment-modal.tsx` | 61KB | 分割を検討 |
| `app/globals.css` | 39KB | Tailwindのpurge確認 |

### 5.2 アーキテクチャ上の特徴

1. **ゲーミフィケーション重視**: ガーディアン、エナジー、ストリーク、レベルシステム等の複雑なゲーム要素
2. **PWA対応**: manifest.json, アイコン群が配置済み
3. **マルチチーム構成**: 物販/副業/退職の3チーム
4. **Cron API**: Vercel Cronによる定期処理（バックアップ、サマリー、判定）
5. **外部連携**: Slack通知、Google Sheets連携

---

*このドキュメントはソースコードから自動生成されました。*
