# 📋 実装指示書：SNSアカウント設定 & レベルシステム

**作成日**: 2026年1月11日  
**ステータス**: 設計確定・実装待ち

---

## 🎯 背景・目的

### 1. SNSアカウント設定機能
**問題**: 現在、副業/退職チームの日報報告フォームに「アカウントID」入力欄があり、毎回入力が必要で面倒。

**解決策**: 
- 日報報告フォームからアカウントID入力欄を削除
- マイページに「SNS設定」セクションを新設し、一度入力すれば保存される仕組みに
- 全入力完了で30エナジーのボーナスを付与（情報収集のインセンティブ）

### 2. レベルシステム
**問題**: 現在、ランキングでメンバーをクリックしても「ニックネーム・チーム名・ガーディアンのステージ名」しか表示されず、同じステージ同士での差がわからない。

**解決策**:
- 累計獲得エナジーに基づいた「レベル」を導入
- 同じ「成長体」でも「Lv.8の成長体」vs「Lv.22の成長体」のように差別化

---

## 📱 機能1: SNSアカウント設定

### 1.1 Firestore データ構造

```typescript
// users/{userId} ドキュメントに追加
{
  // 既存フィールド...
  
  // 🆕 新規追加
  snsAccounts: {
    instagram?: string,      // @username形式（例: @yamada_taro）
    youtube?: string,        // チャンネル名 or チャンネルID
    tiktok?: string,         // @username形式
    x?: string,              // @username形式
    profileCompleted: boolean,       // 全4項目入力済みフラグ
    completedAt?: Timestamp,         // 完了日時
    completionBonusClaimed: boolean  // ボーナス受取済みフラグ
  }
}
```

### 1.2 チーム別表示順序

| チーム | 表示順序 |
|--------|----------|
| 副業チーム（fukugyou） | ① Instagram → ② YouTube → ③ TikTok → ④ X |
| 退職チーム（taishoku） | ① Instagram → ② YouTube → ③ TikTok → ④ X |
| スマホ物販チーム（buppan） | ① X → ② Instagram → ③ YouTube → ④ TikTok |

**理由**: 各チームで主に使用するSNSを先頭に配置

### 1.3 マイページ「SNS設定」セクション仕様

**配置場所**: マイページ（`app/mypage/page.tsx`）の既存コンテンツの下部

**UI要件**:
```
📱 SNSアカウント設定
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Instagram]  @________________  [📷]
[YouTube]    ________________   [🎬]
[TikTok]     @________________  [🎵]
[X]          @________________  [𝕏]

💡 全て入力すると 30エナジー獲得！（未入力の場合）
   ✅ ボーナス受取済み（受取済みの場合）

[保存] ボタン
```

**動作仕様**:
1. ページ読み込み時、既存のsnsAccountsデータがあればフォームに表示
2. 各フィールドは任意入力（空欄可）
3. 「保存」ボタン押下時:
   - Firestoreに保存
   - 全4項目が入力済み & ボーナス未受取の場合:
     - `profileCompleted: true`, `completedAt: 現在時刻`
     - `completionBonusClaimed: true`
     - ユーザーのエナジーに+30E追加
     - 成功メッセージ:「🎉 プロフィール完成ボーナス +30E！」

### 1.4 日報報告フォームの変更

**対象ファイル**: `app/report/page.tsx`

**変更内容**: 
- 副業/退職チーム向けフォームから「アカウントID」入力欄を完全削除
- 関連する state (`accountId`, `setAccountId`) も削除
- レポート送信時のデータから `accountId` フィールドを削除

**注意**: スマホ物販チームには元々この欄がないため変更不要

### 1.5 管理画面での表示

**対象ファイル**: `app/admin/users/[userId]/page.tsx` または `app/admin/users/page.tsx`

**追加表示**:
```
📱 SNSアカウント
├── Instagram: @yamada_taro
├── YouTube: やまだチャンネル
├── TikTok: @yamada_tt
└── X: @yamada_x
```

---

## 🎯 機能2: レベルシステム

### 2.1 レベル計算式

```typescript
/**
 * 累計獲得エナジーからレベルを計算
 * @param totalEnergyEarned - 累計獲得エナジー（energy.totalEarned）
 * @returns レベル（1〜999）
 */
function calculateLevel(totalEnergyEarned: number): number {
  return Math.min(999, Math.floor(totalEnergyEarned / 20) + 1);
}
```

**例**:
| 累計エナジー | レベル |
|-------------|--------|
| 0E | Lv.1 |
| 19E | Lv.1 |
| 20E | Lv.2 |
| 100E | Lv.6 |
| 500E | Lv.26 |
| 1000E | Lv.51 |
| 19980E | Lv.999 (MAX) |

### 2.2 レベル999到達シミュレーション

**Lv.999に必要な累計エナジー**: `(999 - 1) × 20 = 19,960E`

| プレイヤータイプ | 到達期間 |
|-----------------|----------|
| ハードコア（毎日報告、ストリーク最大） | 約1.2年 |
| 一般的（週5日報告、ストリーク×2.0） | 約4.2年 |

**結論**: Lv.999は「遠い目標」として維持。今後ガーディアン追加でエナジー獲得機会が増える想定。

### 2.3 表示場所

#### A. マイページ (`app/mypage/page.tsx`)

**配置**: 守護神エリアの近く、またはエナジー表示の近く

**表示形式**:
```
Lv.26
ベテラン  ← レベルに応じた称号
```

**称号テーブル**:
| レベル範囲 | 称号 |
|-----------|------|
| 1-4 | ルーキー |
| 5-9 | 見習い |
| 10-24 | 冒険者 |
| 25-49 | チャレンジャー |
| 50-99 | ベテラン |
| 100-199 | エキスパート |
| 200-299 | マスター |
| 300-499 | 英雄 |
| 500-999 | 伝説の勇者 |

#### B. ランキングページ (`app/ranking/page.tsx`)

**変更箇所**: メンバー行のステージ表示部分

**Before**:
```
#1 | 🐉 | やまたろ | 成長体 | 420E
```

**After**:
```
#1 | 🐉 | やまたろ | Lv.22 成長体 | 420E
```

#### C. メンバー詳細モーダル

**追加表示**:
```
Lv.22 チャレンジャー
副業チーム
成長体 火龍
```

### 2.4 レベルアップ演出

**トリガー**: 日報報告成功時に、報告前と報告後でレベルが上がっていた場合

**処理フロー**:
1. 報告成功 → エナジー獲得
2. 獲得前の `totalEarned` でレベル計算 → `beforeLevel`
3. 獲得後の `totalEarned` でレベル計算 → `afterLevel`
4. `afterLevel > beforeLevel` の場合、レベルアップ演出を表示

**演出仕様**:
```
🎊 レベルアップ！

   Lv.25 → Lv.26

「チャレンジャーに昇格！」

      [閉じる]
```

**コンポーネント**: `components/level-up-celebration.tsx`（新規作成）

**Props**:
```typescript
interface LevelUpCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  beforeLevel: number;
  afterLevel: number;
  newTitle?: string;  // 称号が変わった場合のみ
}
```

---

## 📁 変更対象ファイル一覧

| ファイル | 変更内容 | ステータス |
|----------|----------|-----------|
| `lib/guardian-collection.ts` | SNS型定義、レベル計算関数追加 | ✅ 完了 |
| `lib/firestore.ts` | SNSアカウント保存/取得関数、ボーナス処理追加 | ✅ 完了 |
| `app/mypage/page.tsx` | SNS設定セクション追加、レベル表示追加 | ✅ 完了 |
| `app/ranking/page.tsx` | レベル表示追加 | ✅ 完了 |
| `app/report/page.tsx` | アカウントID入力欄削除、レベルアップ判定連携 | ✅ 完了 |
| `components/level-up-celebration.tsx` | 新規作成: レベルアップ演出 | ✅ 完了 |
| `components/member-detail-modal.tsx` | レベル・称号表示追加 | ✅ 完了 |
| `app/admin/users/page.tsx` | SNSアカウント表示追加（任意） | 🔲 未着手 |

---

## ⚠️ 注意事項

1. **後方互換性**: 既存ユーザーは `snsAccounts` フィールドがないため、undefinedチェックを必ず入れること

2. **ボーナス重複防止**: `completionBonusClaimed` フラグで二重付与を防ぐ

3. **レベル計算の一貫性**: 常に `energy.totalEarned`（累計獲得）を使用し、`energy.current`（現在保有）は使わない

4. **パフォーマンス**: レベル計算は軽量なので、クライアントサイドで計算してOK

---

## 🔗 関連ドキュメント

- `lib/guardian-collection.ts` - 既にSNS型定義とレベル計算関数が追加済み
- `GAMIFICATION_BLUEPRINT.md` - ゲーミフィケーション全体設計
- `GUARDIAN_IMPLEMENTATION_GUIDE.md` - 守護神システムガイド
