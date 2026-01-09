# プロジェクト: 招待コード自動発行連携

## 概要
n8nの会員オンボーディング自動化フローと連携し、キャリクラの招待コードを自動発行する。
契約書署名完了後、メンバーに自動で招待コード付きの登録リンクを送信することで、管理者の手動作業を削減する。

## 背景
- 現状: 管理者が手動で招待コードを発行 → メンバーに伝える必要がある
- 目標: 契約完了後、自動で招待コード発行 & LINE送信

## 全体フロー

```
[チームごとの公式LINE]
    ↓
フォーム入力完了
    ↓
Google Sheets登録 → Slack通知「契約書送付してください」
    ↓
【手動】運営が契約書送付 → Slackで「送付完了」ボタン押下
    ↓
公式LINEで「契約書届いたので署名してね」メッセージ送信
    ↓
メンバーが契約書に署名
    ↓
【手動】運営がSlackで「締結完了」ボタン押下
    ↓
★ キャリクラ招待コード発行API呼び出し ← 新規追加
    ↓
Utage登録
    ↓
公式LINEで完了通知（キャリクラ登録リンク + Utageリンク）
```

## メンバーが利用するサービス

| サービス | 用途 |
|---------|------|
| Utage | 台本・プロフ文章・動画コンテンツ（会員サイト） |
| キャリクラ | 日報報告・ランキング・守護神育成 |

## チームIDの対応

| 公式LINE | キャリクラ team ID |
|----------|-------------------|
| 副業チームLINE | `fukugyou` |
| 退職サポートチームLINE | `taishoku` |
| スマホ物販チームLINE | `buppan` |

---

## キャリクラ側で実装するもの

### 1. 招待コード発行API

**エンドポイント:** `POST /api/invitations/create`

**リクエスト:**
```
Headers:
  Content-Type: application/json
  X-API-Key: {INVITATION_API_KEY}

Body:
{
  "team": "fukugyou",     // fukugyou / taishoku / buppan
  "memo": "山田太郎"       // 管理用メモ（任意）
}
```

**レスポンス（成功時）:**
```json
{
  "success": true,
  "code": "ABC12345",
  "registerUrl": "https://cc-insight-app.vercel.app/register?code=ABC12345&team=fukugyou"
}
```

**レスポンス（エラー時）:**
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### 2. APIキー認証

- 環境変数 `INVITATION_API_KEY` を設定
- リクエストヘッダー `X-API-Key` と照合
- 不一致の場合は 401 Unauthorized

### 3. 登録ページURL対応

現在の登録ページ (`/register`) を修正:
- `?code=XXX` → 招待コード欄に自動入力
- `?team=YYY` → チーム選択を自動セット（変更不可にする）

---

## エンジニアさん側で追加してもらうこと

n8nフローの「締結完了ボタン押下後」に以下を追加:

1. **HTTPリクエストノード追加**
   - キャリクラAPIを呼び出して招待コード取得

2. **LINE通知メッセージにリンク追加**
   - レスポンスの `registerUrl` を完了通知に含める

---

## 実装ステータス

- [ ] キャリクラ: 招待コード発行API作成
- [ ] キャリクラ: APIキー認証実装
- [ ] キャリクラ: 登録ページURLパラメータ対応
- [ ] キャリクラ: Vercel環境変数設定
- [ ] エンジニア: n8nフローにHTTPリクエスト追加
- [ ] エンジニア: LINE通知メッセージ修正
- [ ] テスト: API単体テスト
- [ ] テスト: n8n連携テスト

---

## 環境変数（Vercelに設定が必要）

```
INVITATION_API_KEY=（ランダムな文字列を生成して設定）
```

---

## 作成日
2026年1月10日

## 関連ファイル
- `/app/admin/invitations/page.tsx` - 既存の招待コード管理画面
- `/lib/invitations.ts` - 既存の招待コード関連ロジック
- `/app/register/page.tsx` - 登録ページ（URL対応修正が必要）
