# CC-Insight プロジェクト引き継ぎドキュメント

## 📋 プロジェクト概要

**プロジェクト名**: CC-Insight
**目的**: SNS運用チームの日次レポート管理・ダッシュボード
**フレームワーク**: Next.js 14 + TypeScript + Tailwind CSS
**デプロイ先**: Vercel (https://cc-insight.vercel.app)
**データベース**: Firebase Firestore

---

## 🔥 Firebase設定（重要）

### Firebase設定
```javascript
// Firebase設定は環境変数で管理
// セキュリティのため、このドキュメントには記載しません
// 設定値はVercel環境変数で管理されています
```

### Vercel環境変数（production設定済み）
```
# 以下の環境変数をVercelダッシュボードで設定
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
# 値はFirebase Consoleから取得
```

### 重要な教訓
- **環境変数に改行コードが混入**していた問題を解決
- `lib/firebase.ts`で各環境変数に`.trim()`を適用して改行を除去

---

## 📁 現在のファイル構成

```
cc-insight/
├── app/
│   ├── page.tsx              # トップページ（リダイレクト）
│   ├── login/page.tsx        # 管理者ログイン（Firebase Auth）
│   ├── report/page.tsx       # メンバー用レポート送信フォーム（認証不要）
│   ├── dashboard/
│   │   ├── page.tsx          # ダッシュボードトップ
│   │   ├── side-job/page.tsx # 副業チームダッシュボード（実データ表示）
│   │   ├── resignation/page.tsx # 退職チームダッシュボード（実データ表示）
│   │   └── smartphone/page.tsx  # 物販チームダッシュボード（実データ表示）
│   ├── team/
│   │   ├── fukugyou/page.tsx # 副業チーム詳細（実データ表示）
│   │   ├── taishoku/page.tsx # 退職チーム詳細（実データ表示）
│   │   └── buppan/page.tsx   # 物販チーム詳細（実データ表示）
│   └── ranking/page.tsx      # ランキングページ
├── lib/
│   ├── firebase.ts           # Firebase初期化（trim()適用済み）
│   ├── firestore.ts          # Firestore操作関数
│   ├── auth-context.tsx      # 認証コンテキスト
│   └── dummy-data.ts         # 【使用停止】旧ダミーデータ
├── components/
│   ├── sidebar.tsx           # サイドバーナビゲーション
│   ├── client-layout.tsx     # 認証ガード付きレイアウト
│   ├── glass-card.tsx        # UI コンポーネント
│   └── circular-progress.tsx # 円形プログレス
└── scripts/
    └── cleanup-firestore.js  # Firestoreデータクリーンアップ
```

---

## ✅ 完了した作業

### 1. Firebase環境変数の修正
- Firebaseコンソールから正確な設定値を取得
- Vercel環境変数を改行なしで再設定
- `lib/firebase.ts`に`.trim()`を追加

### 2. レポート送信機能
- `/report`ページからFirestoreへのデータ送信成功
- 3チーム対応（副業/退職/物販）
- Shorts系（Instagram/TikTok/YouTube）とX運用の両形式対応

### 3. ダッシュボードの実データ化
- 6ページすべてをダミーデータから実データ表示に移行
- Firestoreの`reports`コレクションから期間別集計
- メンバー別パフォーマンス表示
- MVP達成者の自動判定

---

## 🎯 会員制サイト化の設計図

### 目標
現在「誰でもアクセス可能」な状態を、**会員（認証済みユーザー）のみアクセス可能**な状態に変更する

### アクセス制御の設計

| ページ | 現状 | 目標 |
|--------|------|------|
| `/report` | 誰でも送信可能 | 誰でも送信可能（維持）|
| `/login` | 誰でもアクセス可能 | 誰でもアクセス可能（維持）|
| `/dashboard/*` | 誰でも閲覧可能 | **認証済みのみ** |
| `/team/*` | 誰でも閲覧可能 | **認証済みのみ** |
| `/ranking` | 誰でも閲覧可能 | **認証済みのみ** |

### Firestoreセキュリティルール（推奨）
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // レポートは誰でも作成可能、読み取りは認証済みのみ
    match /reports/{reportId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    
    // ユーザー管理（将来用）
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🚀 実装ロードマップ

### Phase 1: 認証強化（必須）
1. **管理者アカウントの作成**
   - Firebase Console → Authentication → ユーザーを追加
   - メール: 任意 / パスワード: 8文字以上

2. **認証ガードの強化**
   - `components/client-layout.tsx`を修正
   - 未認証時は`/login`にリダイレクト
   - 認証中はローディング表示

3. **保護ルートの設定**
   - `/dashboard/*`, `/team/*`, `/ranking`を保護

### Phase 2: ユーザー管理（オプション）
1. **招待制の実装**
   - 管理者がメールで招待リンクを送信
   - 招待されたユーザーのみ登録可能

2. **ロール管理**
   - 管理者ロール: 全データ閲覧・削除可能
   - メンバーロール: 自チームのデータのみ閲覧

### Phase 3: セキュリティ強化（推奨）
1. **Firebase App Check有効化**
   - 不正アクセス防止

2. **Authorized Domains設定**
   - Firebase Console → Authentication → Settings
   - `cc-insight.vercel.app`を追加

---

## 📝 lib/auth-context.tsx の現在の実装

```typescript
// 認証コンテキストは既に実装済み
// useAuth() フックで現在の認証状態を取得可能
// - user: 現在のユーザー情報
// - loading: 認証状態確認中
// - signIn/signOut: ログイン/ログアウト関数
```

---

## 🔧 修正が必要なファイル（会員制化実装時）

1. **`components/client-layout.tsx`**
   - 認証チェックを追加
   - 未認証時のリダイレクト処理

2. **`app/dashboard/layout.tsx`**（新規作成）
   - ダッシュボード配下の共通認証ガード

3. **`middleware.ts`**（新規作成推奨）
   - Next.js Middleware でルートレベル保護

---

## 📊 Firestoreコレクション構造

### `reports` コレクション
```typescript
interface Report {
  id: string;
  team: "fukugyou" | "taishoku" | "buppan";
  teamType: "shorts" | "x";
  name: string;
  date: string; // YYYY-MM-DD
  createdAt: Timestamp;
  
  // Shorts系（副業・退職チーム）
  accountId?: string;
  igViews?: number;
  igProfileAccess?: number;
  igExternalTaps?: number;
  igInteractions?: number;
  weeklyStories?: number;
  igFollowers?: number;
  ytFollowers?: number;
  tiktokFollowers?: number;
  todayComment?: string;
  
  // X系（物販チーム）
  postCount?: number;
  postUrls?: string[];
  likeCount?: number;
  replyCount?: number;
}
```

---

## 🎨 デザインシステム

- **テーマ**: ダークモード（Glassmorphism）
- **チームカラー**:
  - 副業チーム: #ec4899 (ピンク)
  - 退職チーム: #06b6d4 (シアン)
  - 物販チーム: #eab308 (イエロー)

---

## 📌 注意事項

1. **lib/dummy-data.ts は使用禁止**
   - すでに全ページで使用停止済み
   - 削除しても問題なし

2. **環境変数の改行問題**
   - Vercelで環境変数を設定する際、末尾に改行が入る場合がある
   - `lib/firebase.ts`の`.trim()`で対処済み

3. **Firestoreセキュリティルール**
   - Firebase Consoleで設定が必要
   - `allow create: if true;`でレポート送信を許可

---

## 📞 関連リソース

- **GitHub**: https://github.com/ccfp0811-lang/cc-insight.git
- **本番サイト**: https://cc-insight.vercel.app
- **Firebase Console**: https://console.firebase.google.com/project/cc-insight

---

*このドキュメントは 2026/01/06 に作成されました*
