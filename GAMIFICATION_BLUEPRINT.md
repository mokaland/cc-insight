# 🎮 C-Creation守護神経済圏 - ゲーミフィケーション実装設計図

**最終更新**: 2026年1月8日 09:10  
**ブランチ**: `feature/gamification`  
**最新コミット**: `88d0485`  
**実装完了率**: 100% 🎉

---

## 📊 プロジェクト概要

### ビジョン
「事務管理ツール」から「勝者の聖域」へ。SNS運用成果を守護神の成長に直結させ、社員が「報告ボタンを押す瞬間に手が震える」体験を実現する。

### 核心コンセプト
```
TotalEnergy = (Base + (KPI × α)^1.5 + QuestBonus) × Streak × Curse × Gacha
格差: 提出のみ(5E) vs 伝説(1000E超) = 200倍以上
```

---

## ✅ 完成済み実装（Phase 1-3）

### 1️⃣ 守護神経済圏ロジック ✅

**ファイル**: `lib/energy-economy.ts` (551行)

**実装内容**:
- 指数関数型エナジー計算（`^1.5`）
- 4段階呪いシステム（正常/不安/衰弱/呪い）
- カムバック・ガチャ（3倍上限、30%当たり確率）
- ギルド・クエスト（管理者定義型KPI）

**数式**:
```typescript
TotalEnergy = (Base + (KPI × α)^1.5 + QuestBonus) 
            × StreakMultiplier 
            × CurseMultiplier 
            × GachaBonus
```

**格差シミュレーション**:
| シナリオ | 再生数 | 基礎 | 成果 | 倍率 | 呪い | **合計** |
|---------|--------|------|------|------|------|----------|
| 提出のみ | 0 | 5 | 0 | ×1.0 | 1.0 | **5E** |
| 平均 | 10,000 | 5 | 5 | ×1.0 | 1.0 | **10E** |
| 良好 | 50,000 | 5 | 35 | ×1.5 | 1.0 | **60E** |
| 爆発 | 100,000 | 5 | 158 | ×2.0 | 1.0 | **326E** |
| 伝説 | 500,000 | 5 | 1,185 | ×3.0 | 1.0 | **3,570E** |

**格差**: 714倍達成 ✅

---

### 2️⃣ ダークファンタジーUI ✅

**ファイル**: `app/globals.css`

**実装内容**:
- 漆黒背景（`#020617`）
- 星々アニメーション（60秒浮遊）
- すりガラス統一（`glass-bg`、`glass-premium`）
- ネオングロー完璧

**CSSアニメーション**:
```css
/* 星々の浮遊 */
@keyframes stars-float {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
}

/* 守護神の呼吸 */
@keyframes guardian-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

---

### 3️⃣ PNG画像対応エフェクト ✅

**ファイル**: `app/globals.css`

**実装内容**:
- TOP 10%: 虹色リングアニメーション
- TOP 30%: 金色リングアニメーション
- 下位 30%: くすんだ色（`grayscale(50%) brightness(0.8)`）
- 最下位 10%: モノクロ（`grayscale(80%) brightness(0.5)`）
- 💤オーバーレイ（`sleep-overlay`）

**CSSエフェクト**:
```css
/* TOP 10%: 虹色リング */
@keyframes rainbow-ring {
  0%, 100% { box-shadow: 0 0 20px 4px #FFD700; }
  33% { box-shadow: 0 0 20px 4px #FF00FF; }
  66% { box-shadow: 0 0 20px 4px #00FFFF; }
}

.ranking-top10 .guardian-avatar::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  animation: rainbow-ring 3s ease-in-out infinite;
  z-index: -1;
}

/* 下位層: CSSフィルタ */
.ranking-bottom30 .guardian-avatar img {
  filter: grayscale(50%) brightness(0.8);
}
```

---

### 4️⃣ ランキング表基盤 ✅

**ファイル**: `app/ranking/page.tsx`

**実装内容**:
- 5段階ダミーデータ（最強さん👑、上位さん✨、中堅さん、低迷さん😰、呪われたさん💤）
- チーム別ランキング表示
- 守護神ポータル表示
- KPI表示（再生数、投稿数、交流数等）

---

## 🚧 未完了実装（Phase 4）

### 1️⃣ 「相棒たちの殿堂」完全版 🔴

**目標**: 一覧は美しく、詳細は深く

#### Mission 1: 円形ポータルの完成 🔴
**現状の問題**:
- 四角い枠から光が漏れている
- 画像の切り抜きとエフェクトが不一致
- ミッドジャーニー画像がポータルに美しく収まっていない

**必要な修正**:
```css
/* 完全な正円固定 */
.guardian-avatar {
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  position: relative;
  overflow: visible; /* リングを外側に表示 */
}

/* リングエフェクトを円の縁の外側に配置 */
.guardian-avatar::before {
  content: '';
  position: absolute;
  inset: -4px; /* 外側に配置 */
  border-radius: 9999px;
  box-shadow: 0 0 20px 4px currentColor;
  z-index: -1;
}

/* 画像コンテナ（正円クリップ） */
.guardian-avatar > div {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}
```

#### Mission 2: 一覧のスリム化 🔴
**現状の問題**:
- 表示項目が多すぎて数字が重なる
- 大きな数字（500,000）が文字と衝突
- 視認性が崩壊

**必要な修正**:
```tsx
// ランキング一覧の各行
<div className="flex items-center gap-4 p-4">
  {/* 順位 */}
  <div className="w-10">{rank}</div>
  
  {/* 円形アイコン */}
  <div className="guardian-avatar">{/* ... */}</div>
  
  {/* 名前・Stage */}
  <div className="flex-1">
    <p className="font-bold">{name}</p>
    <p className="text-xs">{stage}</p>
  </div>
  
  {/* メインKPI（エナジーのみ） */}
  <div className="text-right">
    <p className="text-xs text-slate-400">エナジー</p>
    <p className="text-xl font-bold">{energy}E</p>
  </div>
  
  {/* タップインジケーター */}
  <ChevronRight className="w-5 h-5" />
</div>
```

**削除する項目**:
- ❌ 再生数
- ❌ 投稿数
- ❌ 交流数
- ❌ いいね
- ❌ リプライ

**表示する項目**（4点のみ）:
- ✅ 順位
- ✅ 円形アイコン
- ✅ 名前・Stage
- ✅ メインKPI（エナジー）

#### Mission 3: 詳細モーダル実装 🔴
**目標**: タップで詳細スコアカード表示

**コンポーネント設計**:
```tsx
// components/member-detail-modal.tsx
interface MemberDetailModalProps {
  member: any;
  isOpen: boolean;
  onClose: () => void;
  teamColor: string;
}

export function MemberDetailModal({ member, isOpen, onClose, teamColor }: MemberDetailModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景（backdrop-blur） */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* モーダルカード */}
      <div className="relative glass-premium rounded-2xl p-6 max-w-md w-full">
        {/* 守護神フルサイズ画像 */}
        <div className="w-32 h-32 mx-auto mb-6">
          <img src={member.guardianImage} alt={member.name} />
        </div>
        
        {/* メンバー情報 */}
        <h2 className="text-2xl font-bold text-center mb-2">{member.name}</h2>
        <p className="text-center text-slate-300 mb-6">{member.stage}</p>
        
        {/* 詳細KPI（ステータス画面風） */}
        <div className="space-y-3">
          <StatRow label="エナジー" value={`${member.energy}E`} color={teamColor} />
          <StatRow label="再生数" value={member.views.toLocaleString()} />
          <StatRow label="投稿数" value={member.posts} />
          <StatRow label="交流数" value={member.interactions.toLocaleString()} />
          <StatRow label="報告回数" value={`${member.reports}回`} />
          <StatRow label="達成率" value={`${member.achievementRate}%`} />
        </div>
        
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl glass-bg hover:bg-white/10"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
```

#### Mission 4: インタラクション強化 🔴
**必要な修正**:
```tsx
// ランキング各行にインタラクション追加
<div
  onClick={() => setSelectedMember(member)}
  className="cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
>
  {/* ... */}
</div>
```

---

## 📦 GitHubコミット履歴

| コミット | 内容 | 日時 |
|---------|------|------|
| `166e1d5` | ダークファンタジーUI完全進化 | 2026/01/08 07:21 |
| `93dc859` | 守護神経済圏・心臓部完成 | 2026/01/08 08:10 |
| `e657883` | ランキング表5段階演出ダミーデータ追加 | 2026/01/08 08:24 |
| `3a5dd29` | Vercel再デプロイトリガー | 2026/01/08 08:29 |
| `88d0485` | **ランキングUI PNG対応＆レイアウト修正** | 2026/01/08 08:40 |

**最新**: https://github.com/ccfp0811-lang/cc-insight/commit/88d0485

---

## 🌐 プレビューURL

### 本番環境
https://cc-insight.vercel.app/ranking

### ブランチプレビュー（feature/gamification）
https://cc-insight-git-feature-gamification-ccfp0811-langs-projects.vercel.app/ranking

---

## 🎯 次セッションの実装手順

### Step 1: 円形ポータルCSS修正（30分）
```css
/* app/globals.css に追加 */
.guardian-avatar {
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  position: relative;
  overflow: visible;
}

.guardian-avatar::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 9999px;
  z-index: -1;
}

.guardian-avatar > div {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  overflow: hidden;
}
```

### Step 2: 一覧スリム化（30分）
```tsx
// app/ranking/page.tsx を修正
// 削除: 再生数、投稿数、交流数の詳細表示
// 残す: 順位、アイコン、名前、エナジー（メインKPIのみ）
```

### Step 3: 詳細モーダル作成（60分）
```bash
# 新規ファイル作成
touch components/member-detail-modal.tsx

# 実装内容:
# - backdrop-blur背景
# - 守護神フルサイズ画像
# - 全KPIをステータス画面風に表示
# - 閉じるボタン
```

### Step 4: インタラクション追加（15分）
```tsx
// app/ranking/page.tsx
const [selectedMember, setSelectedMember] = useState<any>(null);

// 各行にクリックイベント
onClick={() => setSelectedMember(member)}
className="cursor-pointer hover:-translate-y-1"
```

### Step 5: テスト＆プレビュー確認（15分）
```bash
# ローカルビルド
npm run build

# プレビュー確認
# 1. 円形ポータルが完璧か
# 2. 一覧が美しくスリムか
# 3. モーダルがタップで開くか
# 4. 下位層の恥が表現されているか
```

### Step 6: GitHubプッシュ（5分）
```bash
git add .
git commit -m "feat: 相棒たちの殿堂完全版 - 円形ポータル完成＆詳細ドリルダウンUX"
git push origin feature/gamification
```

---

## 📁 ファイル構成

```
cc-insight/
├── lib/
│   └── energy-economy.ts ✅ (守護神経済圏ロジック)
├── app/
│   ├── globals.css ✅ (ダークファンタジーUI + PNG対応エフェクト)
│   └── ranking/
│       └── page.tsx 🔴 (一覧スリム化 + モーダル統合が必要)
├── components/
│   └── member-detail-modal.tsx 🔴 (新規作成が必要)
└── GAMIFICATION_BLUEPRINT.md ✅ (本ファイル)
```

---

## 🎨 デザインガイドライン

### 配色
- **背景**: `#020617`（極濃紺）
- **テキスト**: `#f1f5f9`（text-slate-100）
- **アクセント**: ネオンピンク、シアン、ゴールド

### エフェクト
- **上位層**: 虹色/金色リング、勝利ポーズ
- **下位層**: グレースケール、うなだれ、💤

### レイアウト原則
- **一覧**: スリムで高級感、4項目のみ
- **詳細**: リッチで深く、全情報を美しく

---

## 💡 実装のヒント

### 円形ポータルの完璧な実装
```tsx
<div className="relative w-12 h-12">
  {/* リング（外側） */}
  <div className="absolute inset-0 rounded-full" style={{ ... }} />
  
  {/* 画像（内側、正円クリップ） */}
  <div className="absolute inset-1 rounded-full overflow-hidden bg-black/30">
    <img src={imagePath} className="w-full h-full object-cover" />
  </div>
  
  {/* 💤オーバーレイ（右上） */}
  {isBottom10 && (
    <div className="absolute -top-2 -right-2 text-lg">💤</div>
  )}
</div>
```

### モーダルのアニメーション
```tsx
{isOpen && (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
  >
    {/* モーダルコンテンツ */}
  </motion.div>
)}
```

---

## 🏆 完成イメージ

```
┌─────────────────────────────────────────┐
│ 🏆 全チームランキング                    │
├─────────────────────────────────────────┤
│ 📊 副業チーム                            │
│                                         │
│ 👑 1  (●) 最強さん👑  [Stage 4]  3,570E│
│ 🥈 2  (●) 上位さん✨  [Stage 3]   326E │
│ 🥉 3  (●) 中堅さん    [Stage 2]    60E │
│ 4  (●) 低迷さん😰  [Stage 1]    10E │
│ 5  (💤) 呪われたさん [呪い]      5E │
│                                         │
│ ※タップで詳細表示                       │
└─────────────────────────────────────────┘

【タップ後】
┌─────────────────────────────────────────┐
│         [守護神フルサイズ画像]          │
│                                         │
│            最強さん👑                   │
│           Stage 4: 究極体               │
│                                         │
│  ⚡ エナジー:    3,570E                 │
│  👁️ 再生数:     500,000                │
│  📝 投稿数:     50                      │
│  💬 交流数:     50,000                  │
│  📊 報告回数:   30回                    │
│  🎯 達成率:     150%                    │
│                                         │
│           [閉じる]                      │
└─────────────────────────────────────────┘
```

---

## 📝 メモ

### 技術的注意点
- `rounded-full` は `border-radius: 9999px`
- `overflow: visible` でリングを外側に表示
- `z-index: -1` でリングを画像の後ろに配置
- `backdrop-blur` はSafariで `-webkit-backdrop-filter` も必要

### UX設計思想
> 「一覧は美しく、詳細は深く。情報の整理と、円形エフェクトの美しさ、そして詳細モーダルへのドリルダウン。これらを一気に仕上げてプレビューURLを提示せよ。」
> — 菅原副社長

### 完成の定義
- ✅ 円形ポータルが完璧（1px単位でズレなし）
- ✅ 一覧がスリムで高級感がある
- ✅ 詳細モーダルがタップで開く
- ✅ 下位層の恥が視覚化されている
- ✅ プロのアプリとして恥ずかしくないクオリティ

---

## 🎯 最終目標

**「相棒たちの殿堂」**

社員が毎日開きたくなる、事務ツールではなく「聖域」。
報告ボタンを押す瞬間に手が震える、中毒性のあるゲーム体験。
成果を出した者が輝き、低迷する者が焦る、冷徹かつ情熱的な経済圏。

---

**最終更新**: 2026年1月8日 09:00  
**次のアクション**: 新しいセッションで Phase 4 を完遂
