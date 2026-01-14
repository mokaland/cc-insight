# CC-Insight プロジェクト状態ドキュメント

**最終更新**: 2026-01-15 06:20 JST
**現在のブランチ**: `staging` (メジャーアップデート作業中)

> ⚠️ **重要**: 現在は`staging`ブランチで大幅な改修を行っています。`main`へのマージ前にこのドキュメントを確認してください。

---

## 🎯 現在の作業状況

### ブランチ戦略
- **staging**: 新機能開発・バグ修正(現在アクティブ)
- **main**: 本番環境

---

## 📅 作業履歴

### 2026-01-15 (本日)

#### 修正したバグ

| # | 問題 | 原因 | 解決策 | 対象ファイル |
|---|------|------|--------|-------------|
| 1 | SNS承認ボーナス300Eが「本日のエナジー」に反映されない | Firestore rulesでadminがenergy_historyを作成できなかった | create rulesにisAdmin()条件を追加 | `firestore.rules` |
| 2 | ミッション報酬獲得後に保有エナジー・累計獲得が即時反映されない | onRewardClaimedがtodayEnergyのみ更新していた | プロフィールも再取得するよう修正 | `app/mypage/page.tsx` |
| 3 | 保有エナジー・累計獲得・連続報告ボタンをタップしてもSEが鳴らない | playSound未実装 | playSound("button_tap")を追加 | `app/mypage/page.tsx` |
| 4 | ランキングページで進化・エナジー変更が反映されない | guardianProfilesが5分キャッシュされていた | キャッシュ時間を30秒に短縮 | `app/ranking/page.tsx` |
| 5 | 投稿フィードバックが届かない | クライアントsetTimeoutでページ遷移時に実行されない | Firestore `scheduled_feedbacks` + Cron処理に移行 | `app/report/page.tsx`, `app/api/cron/process-feedbacks/route.ts` |

#### 新規作成ファイル

| ファイル | 用途 |
|----------|------|
| `app/api/cron/process-feedbacks/route.ts` | 投稿フィードバックのスケジュール処理Cron |
| `.agent/PROJECT_CONTEXT.md` | AI用プロジェクトコンテキスト（本ファイル） |

#### 更新ファイル

| ファイル | 変更内容 |
|----------|----------|
| `firestore.rules` | energy_history adminwrite許可、scheduled_feedbacksルール追加 |
| `vercel.json` | process-feedbacks Cronスケジュール追加（毎分）、month-end-judgment追加 |
| `.agent/workflows/絶対遵守ルール.md` | 第0章追加（新チャット開始時のコンテキスト確認） |

#### 追加作業（06:00以降）

| カテゴリ | 内容 |
|----------|------|
| **month-end-judgment修正** | vercel.jsonにスケジュール追加（28-31日）、コード内で実際の月末かチェック |
| **スラッシュコマンド追加** | 9つのワークフロー作成（ヘルプ, 新機能, バグ修正, 調整, 確認, 反映, 本番リリース, 記録, 状況） |
| **グローバルルール更新** | `~/.gemini/絶対遵守ルール.md` に「ワークフローセットアップ」セクション追加 |
| **継続性確保** | 新プロジェクトで「スラッシュコマンドを追加して」と言えばワークフローが追加される仕組み |

#### 新規作成ワークフロー

| ファイル | 用途 |
|----------|------|
| `.agent/workflows/ヘルプ.md` | コマンド一覧を表示 |
| `.agent/workflows/新機能.md` | 新しい機能を追加するフロー |
| `.agent/workflows/バグ修正.md` | バグを修正するフロー |
| `.agent/workflows/調整.md` | 見た目や細かい変更 |
| `.agent/workflows/確認.md` | ビルドチェック |
| `.agent/workflows/反映.md` | stagingにデプロイ |
| `.agent/workflows/本番リリース.md` | mainにマージ |
| `.agent/workflows/記録.md` | 今日の作業を記録 |
| `.agent/workflows/状況.md` | プロジェクトの現状確認 |

---

## 🔧 Cron Jobs 一覧

| パス | スケジュール | 用途 |
|------|-------------|------|
| `/api/cron/backup-to-sheets` | 毎日3:00 UTC | データをGoogle Sheetsにバックアップ |
| `/api/cron/decade-judgment` | 毎月11,21日 0:00 UTC | 10日・20日のADAPT判定実行 |
| `/api/cron/check-escalation` | 毎日1:00 UTC | 離脱リスクメンバー検出・Slack通知 |
| `/api/cron/daily-summary` | 毎日23:00 UTC | デイリーサマリーをSlackに送信 |
| `/api/cron/month-end-judgment` | 毎月28-31日 0:00 UTC | 月末判定（コード内で実際の月末かチェック） |
| `/api/cron/process-feedbacks` | **毎分** | 投稿フィードバックのスケジュール処理 ⭐NEW |

---

## 📊 主要機能と設計意図

### 1. 投稿フィードバックシステム ⭐ 2026-01-15更新
- **目的**: スマホ物販チーム(buppan)のX投稿に対してAIフィードバックをDMで送信
- **設計意図**: 5-10分のランダム遅延で「人間が返信している」感を演出
- **実装方式**:
  - ❌ ~~クライアントsetTimeout~~（信頼性問題で廃止）
  - ✅ Firestore `scheduled_feedbacks` + Cron処理
- **フロー**:
  1. 日報送信時 → `scheduled_feedbacks`にドキュメント作成（scheduledAt = now + 5-10分）
  2. Cron（毎分） → scheduledAtを過ぎたドキュメントを処理
  3. AI呼び出し → フィードバック生成 → DM送信

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
| buppan | スマホ物販チーム | x | X(Twitter)投稿・**フィードバック対象** |

---

## ⚠️ 既知の問題・注意点

### Firestore Security Rules
- `energy_history`の作成は管理者も許可（SNSボーナス付与のため）
- `scheduled_feedbacks`の更新はサーバーサイドのみ（クライアントはcreateのみ）

### キャッシュ設定
- ランキングページの`guardianProfiles`: **30秒キャッシュ**（旧: 5分）
- リアルタイム性が必要な場面ではキャッシュ時間に注意

---

## 🔒 環境変数（必須）

| 変数名 | 用途 |
|--------|------|
| `CRON_SECRET` | CronジョブのBearer認証 |
| `SLACK_WEBHOOK_CEO` | CEOへのSlack通知 |
| `GEMINI_API_KEY` | AIフィードバック生成 |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase設定 |

---

## 📝 新しいチャットを開始するときの確認事項

1. **現在のブランチを確認**: `git branch --show-current`
2. **このドキュメントを読む**: `.agent/PROJECT_CONTEXT.md`
3. **Cron Jobsの重複確認**: 新機能実装前に上記一覧を確認
4. **docs/フォルダの関連ドキュメントを確認**

---

## 🔄 セッション終了時のチェックリスト

菅原さんが「今日の作業を記録して」と指示したら：
- [ ] このファイルの「作業履歴」セクションを更新
- [ ] 新しいCron Jobがあれば一覧に追加
- [ ] 設計意図の変更があれば「主要機能」セクションを更新
