# CC Insight データフロー仕様書

> **ドキュメント生成日**: 2026-01-12  
> **生成方法**: ソースコードからの逆生成（リバースエンジニアリング）  
> **対象機能**: DM機能、認証（Auth）

---

## 1. Global State（グローバル状態管理）

### 1.1 使用している状態管理

| 技術 | 用途 | 定義ファイル |
|------|-----|-------------|
| **React Context** | 認証状態管理 | `lib/auth-context.tsx` |

> **注意**: Zustand, Redux, Jotai 等の外部状態管理ライブラリは**使用していません**。

### 1.2 AuthContext の構造

**定義場所**: `lib/auth-context.tsx` (47行目)

```typescript
interface AuthContextType {
  user: User | null;              // Firebase Auth ユーザー
  userProfile: UserProfile | null; // Firestore プロファイル
  loading: boolean;               // 読み込み中フラグ
  register: (...) => Promise<void>;
  login: (...) => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}
```

### 1.3 状態の伝播

```
ClientLayout
  └── AuthProvider           ← Context提供
        └── LayoutContent
              └── AuthGuard   ← 認証チェック
                    └── BottomNavigation
                          ├── unreadDmCount (ローカルState)
                          └── isDrawerOpen (ローカルState)
```

---

## 2. Realtime Listeners（リアルタイム監視）

### 2.1 onSnapshot 使用箇所一覧

| ファイル | 行 | コレクション | 目的 |
|---------|-----|-------------|------|
| `lib/firestore.ts` | 166 | `reports` | 日報リアルタイム取得 |
| `app/dm/page.tsx` | 96 | `dm_messages` | 受信メッセージ監視 |
| `app/dm/page.tsx` | 107 | `dm_messages` | 送信メッセージ監視 |
| `app/admin/dm/page.tsx` | 104 | `dm_messages` | 管理者DM監視 |
| `components/client-layout.tsx` | 329 | `dm_messages` | 未読バッジ監視 |

### 2.2 DM未読バッジのリスナー詳細

**定義場所**: `components/client-layout.tsx` (314-347行目)

```typescript
// クエリ: toUserId == userProfile.uid のメッセージを監視
const q = query(
  collection(db, "dm_messages"),
  where("toUserId", "==", userProfile.uid)
);

const unsubscribe = onSnapshot(q, (snapshot) => {
  // クライアント側フィルタリング（read !== true を未読とする）
  const unreadMessages = snapshot.docs.filter(doc => {
    const data = doc.data();
    return data.read !== true;
  });
  const count = unreadMessages.length;
  setUnreadDmCount(count);
});
```

> **⚠️ 技術的注意**: `where("read", "==", false)` はセキュリティルール違反のため、クライアント側フィルタリングを使用。

---

## 3. Logic Flow Diagrams

### 3.1 DM受信 → 未読バッジ点灯フロー

```mermaid
flowchart TD
    subgraph Firestore
        A[("dm_messages コレクション")]
    end

    subgraph "送信者（管理者 or メンバー）"
        B["addDoc() でメッセージ送信"]
    end

    subgraph "受信者のブラウザ"
        C["onSnapshot リスナー起動"]
        D{"snapshot 受信"}
        E["クライアント側フィルタ
        read !== true"]
        F["unreadMessages.length 計算"]
        G["setUnreadDmCount(count)"]
        H{"count > 0 ?"}
        I["🔴 バッジ表示"]
        J["バッジ非表示"]
    end

    B --> A
    A -->|リアルタイム通知| C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H -->|Yes| I
    H -->|No| J

    style I fill:#ef4444,color:#fff
    style A fill:#4f46e5,color:#fff
```

### 3.2 DM既読 → バッジクリアフロー

```mermaid
flowchart TD
    subgraph "DMページ表示時"
        A["user がDMページに遷移"]
        B["useEffect 発火
        (1秒後)"]
        C["markMessagesAsRead() 実行"]
    end

    subgraph Firestore
        D[("dm_messages")]
        E["query: toUserId == user.uid
        AND read == false"]
        F["取得した各ドキュメント"]
    end

    subgraph "バッチ更新"
        G["writeBatch.update()
        read: true, readAt: now"]
        H["batch.commit()"]
    end

    subgraph "リスナー側（client-layout）"
        I["onSnapshot 再トリガー"]
        J["未読数 = 0"]
        K["バッジ消滅"]
    end

    A --> B
    B --> C
    C --> E
    E --> D
    D --> F
    F --> G
    G --> H
    H -->|Firestore 更新| D
    D -->|変更通知| I
    I --> J
    J --> K

    style K fill:#22c55e,color:#fff
```

### 3.3 ログイン → 画面表示フロー

```mermaid
flowchart TD
    subgraph "ログインページ"
        A["ユーザーがemail/password入力"]
        B["login() 関数実行"]
    end

    subgraph "Firebase Auth"
        C["signInWithEmailAndPassword()"]
        D{"認証成功?"}
        E["エラー表示"]
    end

    subgraph "Firestore"
        F["getDoc(users/{uid})"]
        G{"プロファイル存在?"}
        H["エラー: ユーザー情報なし"]
    end

    subgraph "状態チェック"
        I{"emailVerified?"}
        J["→ /verify-email"]
        K{"status == pending?"}
        L["→ /pending-approval"]
        M{"status == suspended?"}
        N["強制ログアウト
        → /login?error=suspended"]
        O{"status == approved?"}
    end

    subgraph "役割別リダイレクト"
        P{"role == admin?"}
        Q["→ /dashboard"]
        R["→ /mypage"]
    end

    subgraph "画面表示"
        S["lastLoginAt 更新"]
        T["AuthContext 更新
        user, userProfile"]
        U["LayoutContent レンダリング"]
        V["BottomNavigation 表示"]
        W["DM未読リスナー開始"]
    end

    A --> B
    B --> C
    C --> D
    D -->|No| E
    D -->|Yes| F
    F --> G
    G -->|No| H
    G -->|Yes| I
    I -->|No| J
    I -->|Yes| K
    K -->|Yes| L
    K -->|No| M
    M -->|Yes| N
    M -->|No| O
    O -->|Yes| P
    P -->|Yes| Q
    P -->|No| R
    Q --> S
    R --> S
    S --> T
    T --> U
    U --> V
    V --> W

    style Q fill:#8b5cf6,color:#fff
    style R fill:#ec4899,color:#fff
```

### 3.4 認証状態監視フロー（onAuthStateChanged）

```mermaid
flowchart TD
    subgraph "AuthProvider 初期化"
        A["useEffect 実行"]
        B["onAuthStateChanged
        リスナー登録"]
    end

    subgraph "Firebase Auth 状態変更"
        C{"firebaseUser
        存在?"}
    end

    subgraph "認証済みフロー"
        D["setUser(firebaseUser)"]
        E["fetchUserProfile(uid)"]
        F["setUserProfile(profile)"]
        G["状態に応じたルーティング"]
    end

    subgraph "未認証フロー"
        H["setUser(null)"]
        I["setUserProfile(null)"]
        J{"保護ルート?"}
        K["→ /login"]
        L["そのまま表示"]
    end

    subgraph "完了"
        M["setLoading(false)"]
    end

    A --> B
    B --> C
    C -->|Yes| D
    D --> E
    E --> F
    F --> G
    G --> M
    C -->|No| H
    H --> I
    I --> J
    J -->|Yes| K
    J -->|No| L
    K --> M
    L --> M

    style B fill:#f59e0b,color:#000
```

---

## 4. 状態更新のタイミング

### 4.1 AuthContext の更新トリガー

| トリガー | 更新される状態 | 発火タイミング |
|---------|--------------|--------------|
| `onAuthStateChanged` | `user`, `userProfile` | Firebase Auth 状態変更時 |
| `login()` | `userProfile` | ログイン成功後 |
| `logout()` | `user`, `userProfile` を null化 | ログアウト時 |
| `refreshUserProfile()` | `userProfile` | 手動更新時 |

### 4.2 DM未読カウントの更新トリガー

| トリガー | 更新される状態 | 発火タイミング |
|---------|--------------|--------------|
| `onSnapshot` コールバック | `unreadDmCount` | dm_messages 変更時 |
| DMページで既読処理 | 間接的に `unreadDmCount` | batch.commit() 完了後 |

---

## 5. データフロー図（全体像）

```mermaid
flowchart LR
    subgraph Browser["ブラウザ"]
        subgraph Context["AuthContext"]
            user["user"]
            profile["userProfile"]
        end
        subgraph Local["ローカル State"]
            dmCount["unreadDmCount"]
            messages["messages[]"]
        end
        subgraph UI["UI コンポーネント"]
            badge["🔴 未読バッジ"]
            chat["💬 チャット画面"]
        end
    end

    subgraph Firebase["Firebase"]
        auth["Firebase Auth"]
        fs_users[("users")]
        fs_dm[("dm_messages")]
    end

    auth -->|onAuthStateChanged| user
    user -->|getDoc| fs_users
    fs_users -->|プロファイル| profile

    fs_dm -->|onSnapshot| dmCount
    fs_dm -->|onSnapshot| messages

    dmCount -->|count > 0| badge
    messages --> chat

    style badge fill:#ef4444,color:#fff
    style fs_dm fill:#4f46e5,color:#fff
```

---

*このドキュメントはソースコードから自動生成されました。*
