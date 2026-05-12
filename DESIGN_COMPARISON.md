# Express vs Hono：設計思想・実装パターン比較

## 1. アーキテクチャ思想の根本的違い

### Express
**哲学**: 「最小限のコア + プラグイン文化」
- マイクロフレームワーク（最小限のAPI）
- ミドルウェア経由で機能追加
- 開発者に選択の自由（フレームワーク部分が薄い）
- Node.js シングルプラットフォーム前提

```
Client → Router → Middleware Chain → Handler → Response
         (線形処理、各ミドルウェアが次へ委譲)
```

### Hono
**哲学**: 「Web標準 + 多ランタイム対応」
- マルチランタイム設計（最初から複数環境想定）
- Web Standards API に準拠（fetch, Response等）
- Cloudflare Workers / Deno / Node.js etc で同一コード実行
- 設計段階から「ランタイム抽象化」

```
Client → Router (最適化) → Middleware Chain → Handler → Web Standard Response
         (RegExpRouter で高速化、標準化されたAPI)
```

---

## 2. ミドルウェアシステムの設計

### Express のアプローチ
**特徴**: 線形パイプラインモデル

```javascript
// Express: 順序が重要（副作用がある）
app.use(authMiddleware);           // req.user を設定
app.use(requireRole('admin'));     // req.user.role 参照
app.post('/tasks', createTask);    // req.user が利用可能
```

**問題点**:
- ミドルウェア順序依存
- 暗黙的な状態変更（req オブジェクトへの副作用）
- テスト時に mock が複雑

**利点**:
- 実装シンプル
- 段階的な機能追加が容易

### Hono のアプローチ
**特徴**: 関数型パイプライン + 明示的な型伝播

```typescript
// Hono: 型で保証（副作用なし）
app.use(authMiddleware);  // Env型に user 情報を追加
  .use(requireRole('admin'))
  .post('/tasks', async (c) => {
    const user = c.get('user');  // 型チェックで保証
    return c.json(...)
  });
```

**特徴**:
- 不変性重視（オブジェクト変更ではなく Env に追加）
- **型安全性**: TypeScript の型流入（context の型が段階的に絞られる）
- 関数型プログラミング寄り
- 副作用の局所化

**利点**:
- テスタビリティ高（mock 不要）
- リファクタリング安全（型が守ってくれる）
- 予期しない副作用がない

---

## 3. ルーティング設計

### Express
**実装**: 文字列マッチング + RegExp

```javascript
// app.get('/tasks/:id', ...)
// 内部: 線形探索 or RegExp マッチング（遅い）
// n個のルートがあると、毎回ループ
```

**設計思想**:
- 柔軟性重視（正規表現フルサポート）
- ルート追加が簡単
- マッチング性能は後付け最適化

### Hono
**実装**: RegExpRouter（トライ木構造）

```typescript
// app.get('/tasks/:id', ...)
// 内部: トライ木で O(1) レベルの高速化
// ルートをツリー化して段階的マッチング
```

**設計思想**:
- 性能第一（最初から最適化設計）
- Web標準パターン を前提
- エッジ実行（Cloudflare Workers）を想定した軽量化

---

## 4. 型安全性への向き合い方

### Express + TypeScript
**特徴**: あとづけの型定義

```typescript
// req/res の型が曖昧
app.post('/tasks', (req: Request, res: Response) => {
  // req.body は any（@types/express も基本 any）
  // res.json() も any返却
  const title = req.body.title;  // 型チェック不可
});
```

**問題**:
- フレームワークの型定義が不完全
- ミドルウェア経由の属性追加は型に反映されない
- req.user は any 扱い

### Hono + TypeScript
**特徴**: 型システムが言語レベル

```typescript
// 型パラメータで段階的に絞られる
type AppEnv = {
  Variables: { user: User }
}
const app = new Hono<AppEnv>();

app
  .use(authMiddleware)  // Variables に user 追加
  .get('/tasks', async (c) => {
    const user = c.get('user');  // 型: User（any ではない）
    return c.json({ user });
  });
```

**利点**:
- ミドルウェア経由の属性追加も型安全
- ジェネリクスで段階的に型を積み上げる
- コンパイル時にエラー検出

---

## 5. エラーハンドリングの思想

### Express
**パターン**: 集約型エラーハンドラー

```javascript
// ハンドラー内で try/catch → next(err)
try {
  await doSomething();
} catch (err) {
  next(err);  // 最後のエラーハンドラーに委譲
}

// app.use((err, req, res, next) => {...})  // 一箇所で処理
```

**特徴**:
- 副作用が分散（複数の try/catch が必要）
- エラー型判定が複雑（instanceof 多用）

### Hono
**パターン**: 関数型エラーハンドリング

```typescript
// Result 型で Success/Error を表現（Rust/Go 風）
async function createTask(c: Context) {
  try {
    const result = await taskService.create(...);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 400);  // その場で処理
  }
}
```

**特徴**:
- エラーが関数スコープ内（テストしやすい）
- レスポンス型が関数シグネチャで明示
- 制御フロー追跡が容易

---

## 6. API Server の設計観点

### Express での current api-server の実装
```
Router
  ↓
Controller (request validation)
  ↓
Service (business logic)
  ↓
Supabase

【特徴】
- 層分離：各層で責任明確
- 副作用：req オブジェクトへの user 設定
- 型安全性：任意の型キャスト多用
- テスト：Service 層は容易、Controller は req/res mock 必要
```

### Hono での同等実装
```typescript
type Env = { Variables: { user: User; role: Role } }

const app = new Hono<Env>();

// ミドルウェア層
app.use(authMiddleware);  // c.set('user', user)
app.use(requireRole('admin', 'editor'));

// ハンドラー層（Controllerを統合）
app.post('/tasks', async (c) => {
  const user = c.get('user');  // 型: User
  const { title } = c.req.valid('json');  // 型安全なbody解析
  const result = await taskService.create(title, user);
  return c.json(result);
});

【特徴】
- 層統合：Router → Handler で完結
- 副作用なし：Env に属性追加（immutable 的）
- 型安全性：T-safe な request validation ライブラリ
- テスト：Context mock だけで十分（req/res不要）
```

---

## 7. 保守性・拡張性の比較

| 観点 | Express | Hono |
|---|---|---|
| **新機能追加** | middleware 追加 | middleware + handler 追加 |
| **リファクタリング安全性** | 低（副作用があるので注意） | 高（型で保証） |
| **テスト記述量** | 多（request/response mock） | 少（Context mock）|
| **パフォーマンス** | 中（ミドルウェアチェーン線形） | 高（ルーター最適化） |
| **学習曲線** | 低（シンプル） | 中（関数型 + 型パラメータ） |
| **マルチランタイム対応** | 不可 | 可能 |

---

## 8. API Server（api-server）への応用

### 現在の Express 実装の強み
✅ **必要十分**: ポートフォリオプロジェクト用途では Express で十分  
✅ **学習リソース**: フレームワーク自体がシンプル（学習コスト低）  
✅ **デバッグ**: request/response が直感的  

### Hono への移行で得られるもの
🚀 **型安全性向上**: RBAC 実装が型で保証される  
🚀 **マルチランタイム**: Cloudflare Workers で同一コード実行  
🚀 **保守性**: ミドルウェア間の依存関係が明示的  

### 学習・改善案
1. **すぐやる**: RBAC 実装の型定義を強化（Express でも可能）
   ```typescript
   // req.user の型を明示
   declare global {
     namespace Express {
       interface Request {
         user: { id: string; email: string; role: 'admin' | 'editor' | 'viewer' }
       }
     }
   }
   ```

2. **次フェーズ**: Project③④⑤ で Hono 試験導入
   - Knowledge DB エッジサーチ
   - Cloudflare Workers で Data Analysis API

3. **長期**: マイクロサービス化
   - Express: 従来型 API
   - Hono: エッジ処理（Cloudflare）
   - Deno: CLI ツール

---

## まとめ

| 設計思想 | Express | Hono |
|---|---|---|
| **基本単位** | ミドルウェア連鎖（副作用） | 関数型パイプライン（不変性） |
| **プラットフォーム** | Node.js 単一 | マルチランタイム（Web標準） |
| **型の扱い** | あとづけ | 言語統合（generic） |
| **パフォーマンス** | フレームワーク最適化待ち | 設計段階から最適化 |
| **適用シーン** | 小〜中規模 API / 学習用 | エッジ処理 / 大規模 API |

**api-server には Express が現在ベスト。ただし、設計思想（型安全性・不変性）は Hono から学べることが多い。**
