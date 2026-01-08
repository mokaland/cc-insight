# Firestore インデックス設定ガイド

## 🔥 必須インデックス

アプリケーションで以下のFirestoreインデックスが必要です。エラーが発生した場合は、以下のURLにアクセスして自動的にインデックスを作成してください。

### 1. energy_history コレクション（エナジー履歴）

**必要なインデックス:**
- `userId` (Ascending)
- `date` (Descending)

**エラーメッセージ:**
```
FirebaseError: The query requires an index.
```

**作成方法:**

#### オプション1: エラーリンクから自動作成（推奨）
エラーログに表示されるURLをクリックして、Firebase Consoleで自動的にインデックスを作成できます。

例:
```
https://console.firebase.google.com/v1/r/project/cc-insight/firestore/indexes?create_composite=...
```

#### オプション2: 手動作成
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト `cc-insight` を選択
3. Firestore Database → Indexes タブを開く
4. 「インデックスを作成」をクリック
5. 以下を設定:
   - **コレクションID**: `energy_history`
   - **フィールド1**: `userId` (Ascending)
   - **フィールド2**: `date` (Descending)
6. 「作成」をクリック

### 2. reports コレクション（報告）

すでに作成されている可能性が高いですが、念のため確認してください。

**必要なインデックス:**
- `userId` (Ascending)
- `date` (Descending)

### 3. errorLogs コレクション（エラーログ）

**必要なインデックス:**
- `level` (Ascending)
- `timestamp` (Descending)
- `userId` (Ascending) + `timestamp` (Descending)

## 📊 インデックス作成後の確認

インデックスの作成には数分かかる場合があります。

**確認方法:**
1. Firebase Console → Firestore Database → Indexes
2. ステータスが「Building」から「Enabled」になるまで待つ
3. アプリケーションをリロードして、エラーが消えることを確認

## 🚨 よくある問題

### エラーが消えない
- インデックスの作成が完了していない可能性があります（Building状態）
- ブラウザのキャッシュをクリアしてみてください
- 数分待ってから再度アクセスしてください

### 複数のインデックスエラーが表示される
- 各エラーメッセージのURLを順番にクリックして、すべてのインデックスを作成してください

## 📝 今後の対応

新しいクエリを追加する際は、Firebase Consoleでインデックスが必要かどうか確認してください。開発環境では自動的にエラーメッセージが表示されます。
