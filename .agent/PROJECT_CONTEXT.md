# CC-Insight プロジェクト状態ドキュメント

**最終更新**: 2026-01-15
**現在のブランチ**: `staging` (メジャーアップデート作業中)

> ⚠️ **重要**: 現在は`staging`ブランチで大幅な改修を行っています。`main`へのマージ前にこのドキュメントを確認してください。

---

## 🎯 現在の作業状況

### ブランチ戦略
- **staging**: 新機能開発・バグ修正(現在アクティブ)
- **main**: 本番環境

### 直近の修正履歴 (2026-01-15)
1. SNSボーナス不表示問題 → Firestore rulesで管理者がenergy_historyに書き込めるよう修正
2. ミッション報酬後の即時反映 → onRewardClaimedでプロフィールも再取得
3. 統計ボタンのSE追加 → 保有エナジー等にbutton_tap追加
4. ランキングのキャッシュ問題 → 5分→30秒に短縮
5. 投稿フィードバック機能 → クライアントsetTimeoutからFirestoreスケジューリングに移行

---

## 🔧 Cron Jobs 一覧

| パス | スケジュール | 用途 |
|------|-------------|------|
| `/api/cron/backup-to-sheets` | 毎日3:00 UTC | データをGoogle Sheetsにバックアップ |
| `/api/cron/decade-judgment` | 毎月11,21日 0:00 UTC | 10日・20日のADAPT判定実行 |
| `/api/cron/check-escalation` | 毎日1:00 UTC | 離脱リスクメンバー検出・Slack通知 |
| `/api/cron/daily-summary` | 毎日23:00 UTC | デイリーサマリーをSlackに送信 |
| `/api/cron/process-feedbacks` | 毎分 | 投稿フィードバックのスケジュール処理 |

---

## 📊 主要機能と設計意図

### 1. 投稿フィードバックシステム
- **目的**: スマホ物販チーム(buppan)のX投稿に対してAIフィードバックをDMで送信
- **設計意図**: 5-10分のランダム遅延で「人間が返信している」感を演出
- **実装**: Firestore `scheduled_feedbacks` + Cron処理（クライアントsetTimeoutは信頼性問題で廃止）

### 2. 守護神システム
- **ステージ**: 卵(S0) → 幼体(S1) → 成長体(S2) → 成熟体(S3) → 究極体(S4)
- **進化条件**: エナジー累計による自動進化
- **画像パス**: `/images/guardians/{guardianId}/stage_{0-4}.png`

### 3. デイリーミッションシステム
- **JST日付シャード**: `daily_missions/{userId}/YYYY-MM-DD`
- **ミッション種類**: daily_report, ranking_visit, dm_send, sns_activity

### 4. チーム設定
| ID | 名前 | タイプ | 特徴 |
|----|------|--------|------|
| fukugyou | 副業チーム | shorts | Instagram/TikTok/YouTube |
| taishoku | 退職サポートチーム | shorts | Instagram/TikTok/YouTube |
| buppan | スマホ物販チーム | x | X(Twitter)投稿・フィードバック対象 |

---

## ⚠️ 既知の問題・注意点

### Firestore Security Rules
- `energy_history`の作成は管理者も許可（SNSボーナス付与のため）
- `scheduled_feedbacks`の更新はサーバーサイドのみ

### キャッシュ設定
- ランキングページの`guardianProfiles`: 30秒キャッシュ（旧: 5分）
- リアルタイム性が必要な場面ではキャッシュ時間に注意

---

## 🔒 環境変数（必須）

| 変数名 | 用途 |
|--------|------|
| `CRON_SECRET` | CronジョブのBearer認証 |
| `SLACK_WEBHOOK_CEO` | CEOへのSlack通知 |
| `OPENAI_API_KEY` or `GEMINI_API_KEY` | AIフィードバック生成 |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase設定 |

---

## 📝 新しいチャットを開始するときの確認事項

1. **現在のブランチを確認**: `git branch --show-current`
2. **このドキュメントを読む**: `.agent/PROJECT_CONTEXT.md`
3. **Cron Jobsの重複確認**: 新機能実装前に上記一覧を確認
4. **docs/フォルダの関連ドキュメントを確認**
