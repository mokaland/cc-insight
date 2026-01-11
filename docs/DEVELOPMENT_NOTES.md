# CC Insight 開発メモ

> **このファイルの目的**: 新しいチャットセッションでも、このファイルを読めばプロジェクトの状況を把握できるようにする

---

## 1. プロジェクト概要

**CC Insight** は、チームメンバーの日報管理・成長可視化アプリケーション。

### コンセプト
- メンバーが日報を報告するとエナジーを獲得
- エナジーを使って「守護神」を進化させるゲーミフィケーション要素
- 管理者はダッシュボードでチーム全体の活動を監視

### 技術スタック
- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **認証・DB**: Firebase (Authentication + Firestore)
- **スタイリング**: Tailwind CSS v4
- **ホスティング**: Vercel

---

## 2. チーム構成

| チームID | チーム名 | 対象SNS |
|---------|---------|---------|
| `fukugyou` | 副業チーム | Instagram, YouTube, TikTok |
| `taishoku` | 退職サポートチーム | Instagram, YouTube, TikTok |
| `buppan` | スマホ物販チーム | X (Twitter) |

---

## 3. 主要機能一覧

### メンバー向け
- [x] ログイン・新規登録（招待コード制）
- [x] 守護神選択・進化システム
- [x] 日報報告（チームごとにフォーム内容が異なる）
- [x] エナジー獲得・投資
- [x] ストリーク（連続報告）ボーナス
- [x] ログインボーナス
- [x] SNSアカウント登録（一括送信対応）
- [x] ランキング表示
- [x] DM（運営とのチャット）

### 管理者向け
- [x] Active Monitor（離脱防止監視）
- [x] 監査ダッシュボード
- [x] DMチャット
- [x] チーム別ダッシュボード（副業/退職/スマホ物販）
- [x] ユーザー管理（承認・検索）
- [x] 招待コード管理
- [x] SNS承認（個別承認対応）
- [x] 投稿URL一括オープン機能

---

## 4. 重要な実装ルール

### 4.1 Firestore更新時のルール

**SNSアカウント等のネストオブジェクトを更新する場合**:

```typescript
// NG: setDoc with merge: true - 他のフィールドが消える可能性
await setDoc(doc(db, "users", userId), {
  snsAccounts: {
    [snsKey]: { status: 'approved', ... }
  }
}, { merge: true });

// OK: updateDoc with dot notation - フィールド単位で更新
await updateDoc(doc(db, "users", userId), {
  [`snsAccounts.${snsKey}.status`]: 'approved',
  [`snsAccounts.${snsKey}.reviewedAt`]: serverTimestamp(),
});
```

**理由**: `setDoc` with `merge: true` はネストオブジェクト全体を上書きするため、他のSNSデータが消えるバグが発生した。

### 4.2 React Hooks のルール

**useStateは早期リターンより前に宣言**:

```typescript
// NG: 早期リターン後にuseStateがあるとエラー
if (!user) return <Loading />;
const [state, setState] = useState(); // Error #310

// OK: すべてのuseStateを先に宣言
const [state, setState] = useState();
if (!user) return <Loading />;
```

### 4.3 UIの設計方針

- **一括操作を優先**: ユーザーがボタンを何度も押さなくて済むように
  - 例: SNS URL入力は個別送信ボタン → 一括送信ボタンに変更
- **ポップアップブロッカー対策**: 複数URLを開く場合は専用ページ方式
  - sessionStorageにデータを保存 → 専用ページで自動オープン

---

## 5. 過去のバグと修正履歴

### 2025-01-11

| 問題 | 原因 | 修正 |
|------|------|------|
| X承認時「承認待ち状態ではありません」エラー | setDoc with merge: trueが他のSNSデータを上書き | updateDoc + dot notation に変更 |
| SNS URL送信後に他のURLが消える | 個別送信ボタンで一つ送信→useEffectでフォームリセット | 一括送信ボタンに統一 |
| URL一括オープンがブロッカーで動作しない | ループ内のwindow.openがブロックされる | 専用URLオープナーページ方式に変更 |

---

## 6. ファイル構成

### 主要ディレクトリ

```
app/
├── admin/                    # 管理者ページ
│   ├── audit/               # 監査ダッシュボード
│   ├── dm/                  # 管理者DMチャット
│   ├── invitations/         # 招待コード管理
│   ├── monitor/             # Active Monitor
│   ├── sns-approvals/       # SNS承認ページ
│   ├── url-opener/          # URL一括オープンページ（専用）
│   └── users/               # ユーザー管理
├── dashboard/               # チーム別ダッシュボード
│   ├── side-job/           # 副業チーム
│   ├── resignation/        # 退職サポートチーム
│   └── smartphone/         # スマホ物販チーム
├── mypage/                  # メンバーマイページ
├── report/                  # 日報報告
├── ranking/                 # ランキング
└── dm/                      # メンバーDM

lib/
├── firestore.ts             # Firestore操作（最重要ファイル）
├── guardian-collection.ts   # 守護神・SNS定義
├── auth-context.tsx         # 認証コンテキスト
├── energy-system.ts         # エナジーシステム
└── ...

components/
├── sidebar.tsx              # サイドバーナビ
├── client-layout.tsx        # クライアントレイアウト
├── glass-card.tsx           # UIコンポーネント
└── ...
```

### 重要ファイル解説

| ファイル | 役割 | 注意点 |
|---------|------|--------|
| `lib/firestore.ts` | Firestore CRUD操作 | SNS承認はupdateDoc + dot notation必須 |
| `lib/guardian-collection.ts` | 守護神・SNS定義 | SNS_LABELS, SNS_ORDER_BY_TEAMなど |
| `app/mypage/page.tsx` | メンバーマイページ | SNS一括送信機能あり |
| `app/admin/sns-approvals/page.tsx` | SNS承認ページ | 個別SNS承認対応 |
| `app/admin/url-opener/page.tsx` | URL一括オープン | sessionStorage連携 |
| `app/dashboard/smartphone/page.tsx` | スマホ物販ダッシュ | URL一括オープン機能あり |

---

## 7. データ構造

### ユーザードキュメント (users/{userId})

```typescript
{
  uid: string;
  email: string;
  displayName: string;
  team: 'fukugyou' | 'taishoku' | 'buppan';
  role: 'member' | 'admin';
  status: 'pending' | 'active' | 'suspended';
  snsAccounts: {
    instagram?: { url: string; status: 'pending' | 'approved' | 'rejected'; ... };
    youtube?: { ... };
    tiktok?: { ... };
    x?: { ... };
    completionBonusClaimed?: boolean;
  };
  ...
}
```

### 守護神プロファイル (guardian_profiles/{userId})

```typescript
{
  userId: string;
  activeGuardianId: 'shiroko' | 'kuroe' | ...;
  guardians: {
    [guardianId]: {
      unlocked: boolean;
      stage: 0 | 1 | 2 | 3 | 4;
      totalInvested: number;
    }
  };
  energy: {
    current: number;
    totalEarned: number;
  };
  streak: {
    current: number;
    max: number;
    lastReportDate: string;
  };
  ...
}
```

---

## 8. 開発時の注意事項

1. **ビルド確認**: 変更後は `npm run build` でエラーがないか確認
2. **キャッシュクリア**: デプロイ後に動作しない場合はブラウザキャッシュをクリア
3. **Firestore Rules**: 新しいコレクション/フィールド追加時はルールも更新
4. **スマホ対応**: モバイルでの動作確認を忘れずに

---

## 9. 今後の予定・未実装機能

- [ ] スマホメンバーログイン問題の調査
- [ ] 守護神解放時の演出強化
- [ ] 通知機能（リマインダー等）

---

## 10. 変更履歴

| 日付 | 変更内容 | コミット |
|------|---------|---------|
| 2025-01-11 | URL一括オープン機能（専用ページ方式） | 36728a4 |
| 2025-01-11 | SNS一括送信機能 | 083bbd2 |
| 2025-01-11 | X承認エラー修正（updateDoc + dot notation） | 083bbd2 |
| 2025-01-11 | React Error #310 修正 | a5ec421 |

---

## 使い方

新しいチャットを開始したら、まず以下を依頼してください:

```
/docs/DEVELOPMENT_NOTES.md を読んでプロジェクトの状況を把握してください
```

これで私（Claude）は過去の経緯や注意点を理解した状態で作業を開始できます。
