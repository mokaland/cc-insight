# 🔥 Firebase セットアップガイド

CC Insightを本番環境で動作させるためのFirebase設定手順です。

---

## 📋 必要な作業（約10分）

### Step 1: Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `cc-insight`）
4. Google Analyticsは無効でOK
5. 「プロジェクトを作成」をクリック

---

### Step 2: Webアプリの登録

1. プロジェクトの概要ページで「</>」（Webアプリを追加）をクリック
2. アプリのニックネームを入力（例: `cc-insight-web`）
3. 「Firebase Hostingも設定する」はチェック不要
4. 「アプリを登録」をクリック
5. **表示された設定情報をコピー**（後で使います）

```javascript
// この部分の値をメモしてください
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123..."
};
```

---

### Step 3: Authentication（認証）の設定

1. 左メニューから「Authentication」をクリック
2. 「始める」をクリック
3. 「メール/パスワード」を選択して有効化
4. 「ユーザー」タブで「ユーザーを追加」をクリック
5. **管理者アカウントを作成**
   - メール: `admin@example.com`（任意）
   - パスワード: `your_secure_password`（8文字以上）

---

### Step 4: Firestore（データベース）の設定

1. 左メニューから「Firestore Database」をクリック
2. 「データベースを作成」をクリック
3. 「本番モード」または「テストモード」を選択
   - テスト中は「テストモード」が便利
4. ロケーションは「asia-northeast1（東京）」を選択
5. 「有効にする」をクリック

#### セキュリティルールの設定（本番用）

「ルール」タブで以下を設定：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // レポートは誰でも書き込み可能、読み取りは認証済みユーザーのみ
    match /reports/{reportId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    
    // その他のコレクションは認証済みユーザーのみ
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

### Step 5: 環境変数の設定

1. プロジェクトのルートに `.env.local` ファイルを作成
2. Step 2でコピーした値を貼り付け

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123...
NEXT_PUBLIC_FIREBASE_APP_ID=1:123...
```

---

### Step 6: 動作確認

1. 開発サーバーを再起動
```bash
npm run dev
```

2. ブラウザで確認
- `/login` → 管理者ログイン画面
- `/report` → メンバー報告フォーム
- `/dashboard` → ダッシュボード（要ログイン）

---

## 🚀 Vercelへのデプロイ

### 方法1: Vercel CLIを使う

```bash
npm install -g vercel
vercel
```

### 方法2: GitHubと連携

1. GitHubにリポジトリをプッシュ
2. [Vercel](https://vercel.com) でインポート
3. 環境変数を設定（Settings > Environment Variables）

**重要**: Vercelの環境変数に `.env.local` の内容を全て追加してください。

---

## 📱 メンバーに共有するURL

デプロイ完了後：

- **メンバー用（報告フォーム）**: `https://your-app.vercel.app/report`
- **管理者用（ダッシュボード）**: `https://your-app.vercel.app/login`

---

## ❓ トラブルシューティング

### 「Firebase: Error (auth/invalid-api-key)」
→ 環境変数が正しく設定されているか確認

### 「Permission denied」
→ Firestoreのセキュリティルールを確認

### ログインできない
→ Firebase AuthenticationでユーザーがアクティブになっているかStep 3の設定を確認

---

## 📞 サポート

設定でお困りの場合は、お気軽にお問い合わせください！
