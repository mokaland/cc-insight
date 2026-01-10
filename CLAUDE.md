# CC Insight - Claude Code プロジェクトルール

このファイルはClaude Codeが毎回のセッション開始時に自動的に読み込むプロジェクト固有のルールです。

---

## 重要: PWAモード対応必須

**このアプリの一般メンバーはPWA（Progressive Web App）モードで利用します。**

すべてのUI実装において、以下のPWA対応を必ず行うこと：

### 1. セーフエリア対応

iPhoneのノッチ領域、ホームインジケーター領域を考慮する：

```css
/* 上部セーフエリア */
padding-top: env(safe-area-inset-top, 0px);

/* 下部セーフエリア */
padding-bottom: env(safe-area-inset-bottom, 0px);

/* 左右セーフエリア（横向き対応） */
padding-left: env(safe-area-inset-left, 0px);
padding-right: env(safe-area-inset-right, 0px);
```

### 2. ボトムナビゲーション考慮

モバイルではボトムナビゲーション（約5rem）が常に表示されている。
モーダルやフローティングボタンは、この高さを考慮して配置すること：

```css
/* ボトムナビを避ける */
padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 5rem);
```

### 3. モーダル実装パターン

モーダルを実装する際は、必ず以下のパターンを使用すること：

```tsx
{showModal && (
  <div className="fixed inset-0 z-[9999] flex flex-col">
    {/* 背景オーバーレイ - セーフエリア外まで完全にカバー */}
    <div
      className="absolute inset-0 bg-black/90 backdrop-blur-md"
      style={{
        top: 'calc(-1 * env(safe-area-inset-top, 0px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        left: 'calc(-1 * env(safe-area-inset-left, 0px))',
        right: 'calc(-1 * env(safe-area-inset-right, 0px))',
      }}
    />

    {/* モーダルコンテナ - セーフエリア内に配置 */}
    <div
      className="relative flex-1 flex items-start md:items-center justify-center overflow-hidden"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 5rem)',
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)',
      }}
    >
      {/* モーダル本体 */}
      <div
        className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-full overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* コンテンツ */}
      </div>
    </div>
  </div>
)}
```

### 4. スクロールロック

モーダル表示時は背景スクロールを防止する：

```tsx
const scrollYRef = useRef(0);

useEffect(() => {
  if (showModal) {
    scrollYRef.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollYRef.current);
    };
  }
}, [showModal]);
```

### 5. タッチ操作対応

- `touchAction: "manipulation"` でダブルタップズームを防止
- `onTouchMove={(e) => e.stopPropagation()}` でモーダル内スクロールを独立させる
- `-webkit-overflow-scrolling: touch` でiOSの慣性スクロールを有効化

### 6. 動的ビューポート高さ

`100vh`ではなく`100dvh`を使用（iOS Safariのアドレスバー考慮）：

```css
max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 5rem);
```

---

## CSS変数（globals.css で定義済み）

```css
--safe-area-bottom: max(env(safe-area-inset-bottom, 0px), 16px);
--bottom-nav-height: calc(3.5rem + 0.25rem + var(--safe-area-bottom));
```

---

## 管理者 vs メンバー

- **管理者**: デスクトップ・モバイル両方を使用
- **メンバー**: 主にPWAモード（iPhone）で使用

メンバー向け機能は特にPWA対応を厳密に行うこと。

---

## チェックリスト

新しいモーダルや全画面UIを実装する際は、以下を確認：

- [ ] 背景オーバーレイがノッチ領域まで覆っているか
- [ ] ボトムナビの高さを考慮しているか
- [ ] スクロールロックを実装しているか
- [ ] タッチ操作が正しく動作するか
- [ ] ボタンがタップ可能な位置にあるか
