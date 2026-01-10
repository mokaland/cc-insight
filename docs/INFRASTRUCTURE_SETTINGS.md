# インフラ設定管理ドキュメント

このファイルは、アプリケーションの外部サービス設定を一元管理します。
**実装を変更した際は、必ずこのファイルを確認・更新してください。**

---

## 重要：実装時の運用ルール

### Claudeが自動で変更できるもの
- コードファイル（`.ts`, `.tsx`, `.json` など）
- `firestore.rules`（ローカルファイル）

### ユーザーに依頼が必要なもの（Claudeは変更不可）
- **Firebase Console** の設定
- **Google Cloud Console** の設定
- **Vercel** の環境変数
- **GitHub** の設定

### 運用フロー
1. **実装変更時**: Claudeはこのドキュメントを確認
2. **外部設定が必要な場合**: コード変更と**同時に**以下の形式で指示する

```
【要対応：〇〇】
場所：具体的な設定場所
操作：具体的な操作内容
```

3. **実装完了時**: ユーザーが設定完了を確認してから次に進む

---

## 1. Firebase Authentication

### 設定場所
Firebase Console → Authentication → Settings

### 現在の設定（2026-01-10更新）

#### Sign-in method
- **Email/Password**: 有効
- **メールリンク（パスワードなしでログイン）**: 無効

#### User actions
- **作成・登録を許可する**: 有効
- **削除を許可する**: 有効
- **メール列挙保護**: **無効**（有効にするとメール認証に問題が発生）

#### Authorized domains
以下のドメインが登録されている必要があります：
- `localhost`
- `cc-insight.firebaseapp.com`
- `cc-insight-app.vercel.app` ← **重要：これがないとメール認証が失敗する**
- `cc-insight.vercel.app`

### 変更が必要になるケース
- 新しいドメインでアプリを公開する場合 → Authorized domains に追加
- メール認証機能を変更する場合

---

## 2. Google Cloud Console - APIキー

### 設定場所
https://console.cloud.google.com/apis/credentials?project=cc-insight

### 現在の設定（2026-01-10更新）

#### アプリケーションの制限
- **種類**: ウェブサイト
- **許可されたリファラー**:
  - `cc-insight-app.vercel.app/*`
  - `cc-insight.vercel.app/*`
  - `cc-insight.firebaseapp.com/*` ← **重要：これがないとメール認証リンクが403エラーになる**
  - `localhost:3000/*`

#### APIの制限
- **種類**: キーを制限
- **許可されたAPI**:
  - Identity Toolkit API
  - Token Service API
  - Cloud Firestore API
  - Firebase App Check API
  - その他Firebase関連API

### 変更が必要になるケース
- 新しいドメインでアプリを公開する場合 → リファラーに追加
- 新しいFirebase機能を使う場合 → APIを追加

---

## 3. Firestore Security Rules

### 設定場所
- ローカル: `/firestore.rules`
- Firebase Console → Firestore Database → ルール

### 現在の主要ルール（2026-01-10更新）

#### users コレクション
```javascript
// 作成: 自分のドキュメントのみ、role フィールドは含めない
allow create: if isOwner(userId) && !('role' in request.resource.data);

// 更新: 管理者は誰でも更新可能、一般ユーザーは自分のみ（roleは変更不可）
allow update: if isAdmin() || (isOwner(userId) && ...);
```

#### 重要なポイント
- 新規登録時は `role` フィールドを含めてはいけない（セキュリティルールで禁止）
- 管理者が承認時に `role: "member"` を付与する
- 管理者は他のユーザーのドキュメントを更新できる必要がある

### 変更が必要になるケース
- 新しいコレクションを追加する場合 → ルールを追加
- ユーザー権限の仕組みを変更する場合 → users ルールを更新
- **ローカルで変更したら、Firebase Console にも反映が必要**

---

## 4. Vercel

### 設定場所
https://vercel.com/[your-team]/cc-insight-app/settings

### 環境変数（2026-01-10現在）
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBqSzA1wFGTRd2yFQyBdGyct9tl_zNceOQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cc-insight.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cc-insight
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cc-insight.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=359311670016
NEXT_PUBLIC_FIREBASE_APP_ID=1:359311670016:web:998b8236071c672f46d1e5
```

### 変更が必要になるケース
- 新しい環境変数を追加する場合

---

## 5. 実装変更時のチェックリスト

### 新規登録・認証フローを変更した場合
- [ ] Firebase Authentication の設定を確認
- [ ] Authorized domains に必要なドメインがあるか
- [ ] Google Cloud Console のAPIキー制限を確認
- [ ] Firestore rules の users コレクションを確認

### 新しいコレクションを追加した場合
- [ ] firestore.rules にルールを追加
- [ ] Firebase Console にルールをデプロイ

### 新しいドメインでデプロイする場合
- [ ] Firebase Authentication → Authorized domains に追加
- [ ] Google Cloud Console → APIキーのリファラーに追加

### 新しい環境変数を追加した場合
- [ ] Vercel の環境変数に追加
- [ ] .env.local（ローカル用）にも追加

---

## 6. PWA・レイアウト設定

### 現在のPWA設定（layout.tsx）

```tsx
// viewport設定
export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",  // ← コンテンツが画面全体に広がる
};

// appleWebApp設定
appleWebApp: {
  capable: true,
  statusBarStyle: "black-translucent",  // ← ステータスバーが透過
  title: "キャリクラ",
}
```

### 重要：safe-area対応が必須

上記の設定により、PWA（ホーム画面追加）ではコンテンツがステータスバーの下まで描画されます。
そのため、**すべてのページで `env(safe-area-inset-top)` を考慮する必要があります**。

### レイアウト構造

| ページ種別 | 使用レイアウト | safe-area対応 |
|-----------|---------------|--------------|
| 認証後（マイページ、レポート等） | `ClientLayout` | 対応済み |
| 認証前（login, register） | 各ページで独自実装 | **要注意** |
| フルスクリーンモーダル（召喚演出等） | コンポーネント内で実装 | **要注意** |

### 実装パターン

#### 1. ClientLayoutを使うページ（認証後）
→ 自動でsafe-areaが適用される。追加対応不要。

#### 2. 認証前ページ（login, register等）
必ず以下のようにsafe-areaを含める：

```tsx
// 登録ページの例
<div
  className="min-h-screen ..."
  style={{
    paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)'
  }}
>
```

#### 3. フルスクリーンモーダル/オーバーレイ
`fixed inset-0` で全画面表示する場合も考慮が必要：

```tsx
<div
  className="fixed inset-0 ..."
  style={{
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)'
  }}
>
```

### 新しいページを追加するときのチェックリスト

- [ ] そのページは `ClientLayout` を通るか確認
- [ ] 通らない場合、`env(safe-area-inset-top)` を `paddingTop` に追加
- [ ] 下部にボタンがある場合、`env(safe-area-inset-bottom)` も考慮
- [ ] **PWAモード（ホーム画面追加）でテスト**

### 過去の失敗事例（2026-01-10）

**問題**: 新規登録画面の上部がPWAで見切れる

**原因**:
1. `viewportFit: "cover"` + `statusBarStyle: "black-translucent"` でステータスバー下までコンテンツが描画
2. 登録ページは `ClientLayout` を通らないため、safe-area対応が漏れていた
3. 固定の `pt-20` ではPWAのステータスバー領域をカバーできなかった

**解決**: `paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))'` を追加

**教訓**:
- PWA設定を変更したら、**全ページ**への影響を確認
- 認証前/後で異なるレイアウトを使う場合、両方に同じ対応が必要
- テストはPWAモード（ホーム画面追加）で行う

---

## 7. トラブルシューティング

### メール認証リンクが「期限切れ」になる
1. Firebase Authentication → Authorized domains を確認
2. Google Cloud Console → APIキーのリファラーに `cc-insight.firebaseapp.com/*` があるか確認

### ユーザー承認が失敗する
1. Firestore rules で管理者が他ユーザーを更新できるか確認
2. `isAdmin()` の条件が正しいか確認

### 新規登録時に権限エラー
1. Firestore rules で `role` フィールドを含む作成が禁止されているか確認
2. auth-context.tsx の登録処理で `role` を含めていないか確認

---

## 更新履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2026-01-10 | PWA・レイアウト設定セクション追加。safe-area対応の実装ガイドと失敗事例を記載 | Claude |
| 2026-01-10 | 初版作成。メール認証問題（APIキーリファラー追加）、承認問題（Firestoreルール修正）を解決 | Claude |

