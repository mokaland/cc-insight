# 進化演出サウンド設計書

このドキュメントは、守護神進化演出に必要なサウンドファイルのリストと、各サウンドの仕様を記載しています。

## 必要なサウンドファイル一覧

### 1. 進化演出共通サウンド

| ファイル名 | 用途 | 推奨時間 | 説明 |
|-----------|------|---------|------|
| `evolution_start.mp3` | Phase 1: カード化開始 | 1-2秒 | 魔法陣が出現する神秘的な音。キラキラ + 低音のうねり |
| `charging.mp3` | Phase 2: 光の収束 | 3-4秒 | 徐々に高まっていく光の収束音。カードが回転しながらエネルギーを集める |
| `flash.mp3` | Phase 3: ホワイトアウト | 0.5-1秒 | 短く強烈なフラッシュ音。インパクト大 |
| `reveal.mp3` | Phase 4: カード裏返し | 1-2秒 | 壮大な登場音。衝撃波と共に新しい姿が現れる |
| `fanfare_stage1.mp3` | Stage 1 フィナーレ | 3-5秒 | シンプルで明るいファンファーレ。目覚めの祝福 |
| `fanfare_stage2.mp3` | Stage 2 フィナーレ | 4-6秒 | より力強いファンファーレ。成長の喜び |
| `fanfare_stage3.mp3` | Stage 3 フィナーレ | 5-7秒 | 特性解放を祝う壮大なファンファーレ。神秘的な要素も |
| `fanfare_stage4.mp3` | Stage 4 フィナーレ | 7-10秒 | 最も豪華なファンファーレ。究極の到達を称える |

### 2. ガーディアン属性別サウンド（オプション）

各属性の雰囲気に合わせたBGMまたはSE。

| ファイル名 | 対象ガーディアン | イメージ |
|-----------|----------------|---------|
| `attr_power.mp3` | 火龍, 獅子丸 | 炎が燃え盛る音、力強い太鼓 |
| `attr_beauty.mp3` | 花精, 白狐 | 花びらが舞う音、神秘的な和風BGM |
| `attr_cyber.mp3` | 機珠, 星丸 | デジタル音、宇宙的なアンビエント |

### 3. インタラクションサウンド

| ファイル名 | 用途 | 推奨時間 | 説明 |
|-----------|------|---------|------|
| `firework.mp3` | タップで花火 | 1-2秒 | 花火が打ち上がる小気味よい音 |
| `ability_unlock.mp3` | 特性発動通知（Stage 3） | 2-3秒 | 能力が解放される神秘的な効果音 |

---

## 推奨音源サイト

### 無料素材サイト

1. **効果音ラボ** (https://soundeffect-lab.info/)
   - 日本語サイト、商用利用OK
   - おすすめ: ファンファーレ、魔法系SE

2. **魔王魂** (https://maou.audio/)
   - 日本語サイト、商用利用OK
   - おすすめ: BGM、ゲーム系SE

3. **DOVA-SYNDROME** (https://dova-s.jp/)
   - 日本語サイト、商用利用OK
   - おすすめ: BGM全般

4. **Freesound** (https://freesound.org/)
   - 英語サイト、ライセンス確認必要
   - おすすめ: 特殊効果音

5. **Zapsplat** (https://www.zapsplat.com/)
   - 英語サイト、登録必要
   - おすすめ: 高品質SE

### 有料素材サイト（より高品質）

1. **Artlist** (https://artlist.io/)
2. **Epidemic Sound** (https://www.epidemicsound.com/)
3. **AudioJungle** (https://audiojungle.net/)

---

## 音声ファイルの配置場所

```
public/
  sounds/
    evolution/
      evolution_start.mp3
      charging.mp3
      flash.mp3
      reveal.mp3
      fanfare_stage1.mp3
      fanfare_stage2.mp3
      fanfare_stage3.mp3
      fanfare_stage4.mp3
    attributes/
      attr_power.mp3
      attr_beauty.mp3
      attr_cyber.mp3
    interaction/
      firework.mp3
      ability_unlock.mp3
```

---

## 実装メモ

音声ファイルを追加したら、以下のように `use-sound` または `Howler.js` で実装可能：

```typescript
// 例: Howler.jsを使用
import { Howl } from 'howler';

const evolutionStart = new Howl({
  src: ['/sounds/evolution/evolution_start.mp3'],
  volume: 0.7
});

// 進化開始時に再生
evolutionStart.play();
```

---

## 注意事項

- ファイルサイズは1ファイルあたり500KB以下を推奨（モバイル対応）
- MP3形式を基本とし、ブラウザ互換性を確保
- ユーザーの音声設定（ミュート機能）を実装すること
- PWAでのキャッシュ対応も検討
