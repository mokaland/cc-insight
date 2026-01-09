# 🔥 エラー完全解決チェックリスト

## 📋 現状の問題

**症状**: https://cc-insight.vercel.app/ranking にアクセスすると「Application error: a client-side exception has occurred」エラーが発生

**根本原因（特定済み）**:
1. ✅ React Error #310 (useEffect/useMemo依存配列違反) → **修正済み・コミット済み**
2. ✅ Firestore セキュリティルール不足 → **修正済み・コミット済み（未公開）**
3. ⚠️ **Vercel環境変数未設定（mokalandアカウント）** ← **最重要**
4. ⚠️ Firestoreインデックス不足（一部のみ作成済み）

---

## ✅ 作業チェックリスト

### 【最優先】ステップ 1: Vercel環境変数の設定（mokalandアカウント）

**必須**: この作業を完了しないと、本番環境でFirebaseに接続できません。

1. Vercelダッシュボードにアクセス:
   ```
   https://vercel.com/mokaland/cc-insight/settings/environment-variables
   ```

2. 以下の6つの環境変数を**すべて**追加:

   | 変数名 | 値 |
   |--------|-----|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyBqSzA1wFGTRd2yFQyBdGyct9tl_zNceOQ` |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `cc-insight.firebaseapp.com` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `cc-insight` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `cc-insight.firebasestorage.app` |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `359311670016` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:359311670016:web:998b8236071c672f46d1e5` |

3. **重要**: 各変数について以下のチェックボックスをすべて✅にする:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. すべて追加したら「Save」をクリック

5. Vercel再デプロイをトリガー:
   - 方法A: Vercelダッシュボード → Deployments → 最新のデプロイ → 「…」メニュー → 「Redeploy」
   - 方法B: 空コミット実行（ターミナル）:
     ```bash
     cd /Users/sugawaratomokazu/cc-insight
     git commit --allow-empty -m "Trigger redeploy with Firebase env vars"
     git push origin main
     ```

6. デプロイ完了を待つ（2-3分）:
   ```
   https://vercel.com/mokaland/cc-insight
   ```

**完了確認**: □ 環境変数6つすべて追加 □ 再デプロイ完了

---

### ステップ 2: Firestoreセキュリティルールの公開

**重要**: コードは修正済みですが、Firebase Consoleで公開する必要があります。

1. Firebase Consoleにアクセス:
   ```
   https://console.firebase.google.com/project/cc-insight/firestore/rules
   ```

2. 現在のルール内容をすべて削除

3. `/Users/sugawaratomokazu/cc-insight/firestore.rules` の内容をすべてコピー&ペースト
   - 特に重要な追加セクション:
     - `dm_messages` collection (line 133-149)
     - `energy_history` collection (line 151-162)
     - `errorLogs` collection (line 164-177)

4. 「公開」ボタンをクリック

5. 公開完了を確認（「公開されています」と表示される）

**完了確認**: □ ルール公開完了

---

### ステップ 3: Firestoreインデックスの作成

**現状**: `energy_history`コレクションのインデックスは作成済み

**残りのインデックス**:

#### 3-1. reports コレクション（userId + date）

以下のURLにアクセスして「インデックスを作成」をクリック:
```
https://console.firebase.google.com/v1/r/project/cc-insight/firestore/indexes?create_composite=Ckpwcm9qZWN0cy9jYy1pbnNpZ2h0L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9yZXBvcnRzL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGggKBGRhdGUQAhoMCghfX25hbWVfXxAC
```

**完了確認**: □ reportsインデックス作成開始（ステータス: Building → Enabled）

#### 3-2. dm_messages コレクション（participants + createdAt）

以下のURLにアクセスして「インデックスを作成」をクリック:
```
https://console.firebase.google.com/v1/r/project/cc-insight/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9jYy1pbnNpZ2h0L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9kbV9tZXNzYWdlcy9pbmRleGVzL18QARoQCgxwYXJ0aWNpcGFudHMYARoNCgljcmVhdGVkQXQQARoMCghfX25hbWVfXxAB
```

**完了確認**: □ dm_messagesインデックス作成開始（ステータス: Building → Enabled）

#### インデックス作成状況の確認:

Firebase Console → Firestore Database → Indexes タブで確認:
```
https://console.firebase.google.com/project/cc-insight/firestore/indexes
```

**すべてのインデックスが「Enabled」になるまで待つ（5-10分程度）**

**完了確認**:
- □ energy_history: Enabled（作成済み）
- □ reports: Enabled
- □ dm_messages: Enabled

---

### ステップ 4: 動作確認

すべての設定完了後、以下の手順で確認:

1. **ブラウザキャッシュをクリア（重要）**:
   - Chrome: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
   - または、シークレットウィンドウで開く

2. **本番環境にアクセス**:
   ```
   https://cc-insight.vercel.app/ranking
   ```

3. **ブラウザのコンソールを開く**（F12 または 右クリック → 検証）

4. **エラーがないか確認**:
   - ✅ 期待する結果: エラーなし、ランキングページが正常に表示される
   - ❌ エラーがある場合: コンソールのエラー内容を確認

5. **他の管理画面ページも確認**:
   - https://cc-insight.vercel.app/admin/monitor
   - https://cc-insight.vercel.app/admin/users
   - https://cc-insight.vercel.app/admin/dm
   - https://cc-insight.vercel.app/admin/messages

**完了確認**:
- □ ランキングページ: エラーなし
- □ 管理画面: エラーなし
- □ コンソール: エラーなし

---

## 🔍 トラブルシューティング

### Q1: Vercel環境変数を追加したのにエラーが消えない

**確認ポイント**:
1. 環境変数を追加後、必ず再デプロイを実行しましたか？
2. 再デプロイが完了（Status: Ready）になりましたか？
3. ブラウザのハードリフレッシュ（Ctrl+Shift+R）を実行しましたか？

### Q2: Firestoreインデックスが「Building」から「Enabled」に変わらない

**解決策**:
- インデックス作成には5-10分かかります
- 10分以上経過しても変わらない場合は、URLを再度クリックしてインデックスを再作成

### Q3: 「Missing or insufficient permissions」エラーが出る

**確認ポイント**:
1. Firestoreセキュリティルールを公開しましたか？（ステップ2）
2. Firebase Consoleで「公開されています」と表示されていますか？

### Q4: React Error #310が依然として出る

**確認ポイント**:
1. Vercel再デプロイが完了しましたか？
2. ブラウザキャッシュをクリアしましたか？
3. 最新のコミットがデプロイされていますか？（Vercel → Deployments → 最新のコミットハッシュを確認）

---

## 📝 完了確認サマリー

すべての作業が完了したら、以下にチェック:

- [ ] ステップ1: Vercel環境変数6つすべて追加 + 再デプロイ完了
- [ ] ステップ2: Firestoreセキュリティルール公開完了
- [ ] ステップ3: Firestoreインデックス3つすべて「Enabled」
- [ ] ステップ4: 本番環境でエラーなし確認

**すべてチェックが入ったら、問題は完全に解決しています！ 🎉**

---

## 📌 技術的な背景（参考情報）

### 修正されたコードファイル（コミット済み）:

1. `/app/admin/monitor/page.tsx` - useCallback適用
2. `/app/admin/audit/page.tsx` - useCallback適用
3. `/app/admin/logs/page.tsx` - useCallback適用
4. `/app/admin/users/page.tsx` - useCallback適用
5. `/app/admin/users/[userId]/page.tsx` - useCallback適用
6. `/app/admin/dm/page.tsx` - useCallback適用
7. `/app/admin/messages/page.tsx` - useCallback適用
8. `/app/ranking/page.tsx` - useMemo適用（最重要）
9. `/firestore.rules` - dm_messages, energy_history, errorLogs のルール追加

### Vercelデプロイアカウントの変更履歴:

- 旧: ccfp0811-1267 アカウント
- 新: mokaland アカウント ← **現在はこちら**

Firebase プロジェクト（ccfp0811@gmail.com）は変更なし。
