# 🛡️ 守護神システム実装ガイド

**Phase B完成 - プロフィール入力・守護神選択UI統合**

---

## 📦 完成したコンポーネント

### 1. バックエンド（Phase A）

#### `lib/guardian-evolution.ts` (約700行)
- 御三家スタイル定義: 【剛】Power / 【雅】Beauty / 【智】Cyber
- 16段階の進化システム
- 確変（5%で進化ブースト）
- パーソナライズメッセージエンジン

#### `lib/firestore.ts` 拡張
- User型に守護神フィールド追加
- 10個のヘルパー関数
  - `updateUserProfile`
  - `addGuardian` / `getActiveGuardian`
  - `updateGuardian` / `setActiveGuardian`
  - `hasGuardian` / `isProfileCompleted`

### 2. フロントエンド（Phase B）

#### `components/guardian-card.tsx`
- `GuardianCard`: 呼吸アニメーション付き守護神カード
- `GuardianSelectCard`: 選択UI用カード
- `GuardianWidget`: ダッシュボード用ウィジェット

#### `components/guardian-onboarding.tsx`
- `ProfileInputModal`: プロフィール入力モーダル
- `GuardianSelectModal`: 守護神選択モーダル（御三家）
- `GuardianOnboarding`: 統合フローコンポーネント

---

## 🚀 ダッシュボードへの統合方法

### ステップ1: 必要なインポート

```tsx
// app/dashboard/page.tsx または app/mypage/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  getActiveGuardian, 
  hasGuardian, 
  isProfileCompleted 
} from "@/lib/firestore";
import { 
  getGuardianStage, 
  GUARDIAN_STAGES 
} from "@/lib/guardian-evolution";
import { GuardianOnboarding } from "@/components/guardian-onboarding";
import { GuardianWidget } from "@/components/guardian-card";
```

### ステップ2: オンボーディングチェック

```tsx
export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const [needsProfile, setNeedsProfile] = useState(false);
  const [needsGuardian, setNeedsGuardian] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [activeGuardian, setActiveGuardian] = useState(null);

  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      try {
        // プロフィール確認
        const profileComplete = await isProfileCompleted(user.uid);
        setNeedsProfile(!profileComplete);

        // 守護神確認
        const hasGuard = await hasGuardian(user.uid);
        setNeedsGuardian(!hasGuard);

        // アクティブな守護神取得
        if (hasGuard) {
          const guardian = await getActiveGuardian(user.uid);
          setActiveGuardian(guardian);
        }
      } catch (error) {
        console.error("オンボーディングチェックエラー:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [user]);

  const handleOnboardingComplete = async () => {
    // 完了後、守護神を再取得
    if (user) {
      const guardian = await getActiveGuardian(user.uid);
      setActiveGuardian(guardian);
      setNeedsProfile(false);
      setNeedsGuardian(false);
    }
  };

  if (isChecking) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* オンボーディング */}
      {(needsProfile || needsGuardian) && (
        <GuardianOnboarding
          userId={user.uid}
          needsProfile={needsProfile}
          needsGuardian={needsGuardian}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* メインコンテンツ */}
      <div className="container mx-auto p-6">
        {/* 守護神ウィジェット */}
        {activeGuardian && (
          <GuardianWidget
            style={activeGuardian.style}
            stage={GUARDIAN_STAGES[activeGuardian.currentStage]}
            daysToNext={getGuardianStage(activeGuardian.effectiveStreak).daysToNext}
            progressPercent={getGuardianStage(activeGuardian.effectiveStreak).progressPercent}
          />
        )}

        {/* 既存のダッシュボードコンテンツ */}
        {/* ... */}
      </div>
    </div>
  );
}
```

### ステップ3: 報告ページへの統合（進化判定）

```tsx
// app/report/page.tsx
import { 
  getActiveGuardian, 
  updateGuardian 
} from "@/lib/firestore";
import { 
  updateGuardianOnReport,
  getPersonalizedMessage,
  GUARDIAN_STAGES
} from "@/lib/guardian-evolution";

// 報告送信時
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // 1. アクティブな守護神を取得
    const guardian = await getActiveGuardian(user.uid);
    
    if (guardian) {
      // 2. 守護神を更新（進化判定含む）
      const updateResult = updateGuardianOnReport(guardian);
      
      // 3. Firestoreに保存
      await updateGuardian(user.uid, guardian.id, updateResult.newGuardianData);
      
      // 4. 進化した場合、祝福メッセージ
      if (updateResult.evolved) {
        const message = getPersonalizedMessage('evolution', {
          userName: userProfile.displayName,
          gender: userProfile.gender,
          ageGroup: userProfile.ageGroup,
          style: guardian.style,
          stage: updateResult.newGuardianData.currentStage
        });
        
        // 進化演出を表示
        alert(message); // 実際は専用のモーダルコンポーネントを使用
      }
      
      // 5. 確変が発動した場合
      if (updateResult.boostResult.triggered) {
        alert(updateResult.boostResult.message);
      }
    }
    
    // 通常の報告処理
    // ...
    
  } catch (error) {
    console.error("報告送信エラー:", error);
  }
};
```

---

## 🎨 画像素材の配置方法

### ディレクトリ構造

```
public/
└── images/
    └── guardians/
        ├── power/           # 【剛】Power Style
        │   ├── stage00.png  # 守護の卵
        │   ├── stage01.png  # 目覚め
        │   ├── stage02.png  # 芽生え
        │   ├── ...
        │   └── stage15.png  # 究極
        ├── beauty/          # 【雅】Beauty Style
        │   ├── stage00.png
        │   ├── ...
        │   └── stage15.png
        └── cyber/           # 【智】Cyber Style
            ├── stage00.png
            ├── ...
            └── stage15.png
```

### 画像仕様

- **解像度**: 512x512px以上推奨
- **フォーマット**: PNG（透過背景推奨）
- **ファイル名**: `stage00.png` ~ `stage15.png`（2桁ゼロパディング）

### コード修正箇所

画像が準備できたら、`components/guardian-card.tsx` の以下のコメント部分を有効化：

```tsx
// 現在はコメントアウト（60-67行目付近）
{/* <img 
  src={imagePath} 
  alt={`${styleInfo.name} - ${stage.name}`}
  className="w-full h-full object-cover"
  onError={(e) => {
    e.currentTarget.style.display = 'none';
  }}
/> */}
```

↓ コメントを外す

```tsx
<img 
  src={imagePath} 
  alt={`${styleInfo.name} - ${stage.name}`}
  className="w-full h-full object-cover"
  onError={(e) => {
    // 画像が見つからない場合はプレースホルダーを表示
    e.currentTarget.style.display = 'none';
  }}
/>
```

---

## 🎭 アニメーション演出の詳細

### 1. 呼吸アニメーション

守護神カードは常に上下に浮遊し、拡大縮小します：

```tsx
animate={{
  y: [0, -10, 0],      // 上下10px
  scale: [1, 1.02, 1]  // 2%拡大縮小
}}
transition={{
  duration: 3,          // 3秒で1サイクル
  repeat: Infinity,
  ease: "easeInOut"
}}
```

### 2. オーラエフェクト

進化段階3以上（覚醒）でオーラが出現：

```tsx
<motion.div
  className="absolute inset-0 rounded-full blur-2xl"
  style={{ background: stage.auraColor }}
  animate={{
    scale: [1, 1.1, 1],
    opacity: [0.4, 0.7, 0.4]
  }}
  transition={{
    duration: 2,
    repeat: Infinity
  }}
/>
```

### 3. 輝きエフェクト

定期的に光が横切ります：

```tsx
<motion.div
  className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-white/0"
  animate={{ x: ['-100%', '200%'] }}
  transition={{
    duration: 3,
    repeat: Infinity,
    repeatDelay: 2
  }}
/>
```

---

## 📊 データフロー

```
┌─────────────────┐
│  ユーザー登録   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ プロフィール入力 │ ← ProfileInputModal
│ (性別・年齢)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  守護神選択      │ ← GuardianSelectModal
│ (御三家から1つ)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Firestore保存    │
│ users/{uid}      │
│  ├ gender        │
│  ├ ageGroup      │
│  └ guardians[]   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ダッシュボード   │ ← GuardianWidget
│ 守護神表示       │
└─────────────────┘
```

---

## 🧪 テスト手順

### 1. オンボーディングテスト

1. 新規ユーザーでログイン
2. ✅ プロフィール入力モーダルが表示される
3. 性別・年齢層を選択
4. ✅ 守護神選択モーダルが表示される
5. 御三家から1つ選択
6. ✅ ダッシュボードに守護神ウィジェットが表示される

### 2. アニメーションテスト

1. ダッシュボードで守護神カードを確認
2. ✅ 上下に浮遊している
3. ✅ ゆっくり拡大縮小している
4. ✅ 光のエフェクトが横切る
5. 進化段階3以上の場合
6. ✅ オーラが表示され、脈動している

### 3. レスポンシブテスト

- **PC**: 守護神選択モーダルで3列表示
- **タブレット**: 守護神選択モーダルで3列表示（縮小）
- **スマホ**: 守護神選択モーダルで1列表示

---

## 🎯 次のステップ

1. **画像素材の配置**: Midjourneyで生成した画像を配置
2. **進化演出の強化**: 専用の進化アニメーションモーダル作成
3. **報告ページ統合**: 上記コード例を参考に実装
4. **パーソナライズメッセージの活用**: メッセージエンジンを各所で使用

---

## 🐛 トラブルシューティング

### Q1: モーダルが表示されない

**原因**: `framer-motion`がインストールされていない

```bash
npm install framer-motion
```

### Q2: 型エラーが出る

**原因**: User型の拡張が反映されていない

- ブラウザをリロード
- TypeScriptサーバーを再起動

### Q3: 画像が表示されない

**確認事項**:
- 画像パスが正しいか（`/images/guardians/{style}/stage{n}.png`）
- ファイル名が2桁ゼロパディングか（`stage00.png`）
- プレースホルダーは正常に表示されているか

---

## 📝 カスタマイズ例

### 進化段階の名前変更

```typescript
// lib/guardian-evolution.ts の GUARDIAN_STAGES を編集
{ 
  stage: 1, 
  name: "カスタム名前",  // ← ここを変更
  days: 1, 
  // ...
}
```

### スタイルの追加（4つ目のスタイル）

```typescript
// lib/guardian-evolution.ts
export type GuardianStyle = "power" | "beauty" | "cyber" | "nature"; // ← 追加

export const GUARDIAN_STYLES: Record<GuardianStyle, GuardianStyleInfo> = {
  // ... 既存の3つ
  nature: {  // ← 新規追加
    id: "nature",
    name: "Nature Style",
    japaneseName: "【癒】",
    description: "自然の癒しと調和の守護神",
    color: "#22c55e",
    gradientFrom: "#10b981",
    gradientTo: "#84cc16",
    imageFolder: "nature"
  }
};
```

---

**🛡️ 強固なバックエンドと美しいUIで、メンバーに「自分だけの相棒」を実感させる準備が整いました！**
