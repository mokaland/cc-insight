# DM Read Field Migration

## 概要

既存のDMメッセージに `read` フィールドを追加するマイグレーションスクリプトです。

## 前提条件

1. **Firebase Admin SDK サービスアカウントキー**が必要です
   - [Firebase Console](https://console.firebase.google.com/) にアクセス
   - プロジェクト設定 > サービスアカウント > 新しい秘密鍵の生成
   - ダウンロードしたJSONファイルを `serviceAccountKey.json` としてプロジェクトルートに配置

2. **必要なパッケージ**がインストールされていること
   ```bash
   npm install firebase-admin tsx
   ```

## 実行方法

### 1. サービスアカウントキーを配置

```bash
# Firebase Consoleからダウンロードしたファイルを配置
# プロジェクトルートに置く
cc-insight/
  ├── serviceAccountKey.json  # ← ここ
  ├── scripts/
  │   └── migrate-dm-read-field.ts
  └── ...
```

> [!WARNING]
> **セキュリティ警告**: `serviceAccountKey.json` は絶対に Git にコミットしないでください。
> `.gitignore` に追加されていることを確認してください。

### 2. マイグレーションスクリプトを実行

```bash
npx tsx scripts/migrate-dm-read-field.ts
```

### 3. 実行結果の確認

成功すると以下のように表示されます:

```
🔄 DM メッセージのマイグレーション開始...

📊 150件のメッセージを処理します

⚠️  150件のメッセージに read フィールドがありません
📝 read: false を追加します...

✅ 150件のメッセージを更新しました

📊 最終結果:
  - read フィールドあり: 150件
  - read フィールドなし: 0件

✨ マイグレーション完了！すべてのメッセージに read フィールドが追加されました

🎉 処理が完了しました
```

## 処理内容

スクリプトは以下の処理を行います:

1. `dm_messages` コレクション全体を取得
2. `read` フィールドが存在しないメッセージを抽出
3. 各メッセージに `read: false` を追加（バッチ処理）
4. 最終結果を表示

## トラブルシューティング

### エラー: `serviceAccountKey.json が見つかりません`

→ Firebase Console からサービスアカウントキーをダウンロードし、プロジェクトルートに配置してください。

### エラー: `Permission denied`

→ サービスアカウントに Firestore の編集権限があることを確認してください。

### エラー: `Module not found: tsx`

→ 以下のコマンドで tsx をインストールしてください:
```bash
npm install -D tsx
```

## 安全性

- **冪等性**: 複数回実行しても問題ありません（既に `read` フィールドがあるメッセージはスキップ）
- **バッチ処理**: 一度に最大500件ずつ更新（Firestore制限に準拠）
- **ロールバック**: 万が一問題があった場合、Firestore Consoleから手動で削除可能

## マイグレーション後

マイグレーション完了後は:

1. ✅ 既存メッセージが未読バッジに反映される
2. ✅ DM画面を開くと既読化される
3. ✅ 新規メッセージも正常に動作する

これで DM 通知システムが完全に機能します！
