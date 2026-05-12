# 有名リポジトリ分析：認証・RBAC・API設計の比較

api-server 実装の参考になる 6つのプロダクションリポジトリを詳しく解析。

---

## 1. Passport.js（passportjs/passport）

### 概要
**用途**: Node.js の実装不問な認証フレームワーク  
**GitHub**: https://github.com/passportjs/passport  
**ダウンロード**: 週 2M+ DL（Node.js 認証事実上標準）

### 設計思想
```
「戦略パターン」によるプラガブル認証
```

**コアコンセプト**:
- **Strategy**: 認証方式を抽象化（LocalStrategy, OAuthStrategy, JWTStrategy等）
- 各 Strategy は独立（入れ替え可能）
- ミドルウェアが Strategy を呼び出し
- ユーザーシリアライズ/デシリアライズ で session 管理

```javascript
// Strategy の設計：認証ロジックを隔離
passport.use(new LocalStrategy(
  function(username, password, done) {
    // 認証ロジック
    User.findOne({ username }, (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!user.verifyPassword(password)) return done(null, false);
      return done(null, user);  // 成功
    });
  }
));

// ミドルウェア層：Strategy を適用
app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ user: req.user });  // Strategy が req.user を設定
});
```

### 認証・認可パターン
**認証**: Strategy 個別実装  
**認可**: **なし**（Passport 本体は認可をサポートしない）

```javascript
// 認可は別途実装が必要
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.sendStatus(401);
    if (!roles.includes(req.user.role)) return res.sendStatus(403);
    next();
  };
}
```

### api-server との比較

| 項目 | Passport.js | api-server |
|---|---|---|
| **認証方式** | Strategy パターン（拡張性高） | JWT のみ |
| **認可** | なし（別途実装） | RBAC実装済み |
| **ユースケース** | 多様な認証方式対応 | 単一 JWT 認可 |
| **学習価値** | Strategy パターンの参考 | ✅ 高（設計思想） |

### 学習ポイント
✅ **Strategy パターン**: 認証方式を交換可能にする設計  
✅ **serialize/deserialize**: Session とオブジェクト変換の分離  
✅ **関心の分離**: 認証ロジック ≠ ミドルウェアロジック  

**api-server への応用**:
- Strategy パターンで JWT / OAuth / SAML を選択可能に
- 複数認証方式のサポート（将来）

---

## 2. auth0/node-jsonwebtoken

### 概要
**用途**: JWT 生成・検証の標準ライブラリ  
**GitHub**: https://github.com/auth0/node-jsonwebtoken  
**ダウンロード**: 週 4M+ DL（Node.js JWT 事実上標準）

### 設計思想
```
「署名付きトークン」の安全な実装
```

**コアコンセプト**:
- JWT（JSON Web Token）の RFC7519 準拠実装
- HS256 / RS256 等複数アルゴリズム対応
- payload の署名 + 検証
- expiration / nbf（有効期間）の管理

```javascript
// API シンプル：sign / verify に集約
const token = jwt.sign(
  { user_id: 123, role: 'admin' },     // payload
  'secret-key',                         // secret
  { expiresIn: '7d' }                   // options
);

// 検証：署名 + 有効期限チェック
jwt.verify(token, 'secret-key', (err, decoded) => {
  if (err) console.error('Invalid token');
  else console.log(decoded);  // { user_id: 123, role: 'admin', iat, exp }
});
```

### 認証・認可パターン
**JWT 署名**: payload に任意のクレーム（claim）を埋め込み可能

```javascript
// payload にロール情報を埋め込む（api-server がやっているのと同じ）
const token = jwt.sign({
  sub: user.id,           // subject（標準claim）
  email: user.email,
  role: user.role,        // カスタムclaim
  permissions: ['read', 'write']  // 追加claim
}, secret);

// 検証後、token の claim から権限判定
const decoded = jwt.verify(token, secret);
if (!['admin', 'editor'].includes(decoded.role)) {
  throw new Error('Forbidden');
}
```

### api-server との比較

| 項目 | jsonwebtoken | api-server |
|---|---|---|
| **トークン生成** | JWT.sign() | jwt.sign()（同じ） |
| **検証** | jwt.verify() | jwt.verify()（同じ） |
| **claim** | 標準 + カスタム可能 | user_id, email, role |
| **アルゴリズム** | HS256 / RS256 等 | HS256（api-server） |
| **有効期限** | exp claim で自動管理 | 7d / 30d（api-server） |

### 学習ポイント
✅ **claim 設計**: JWT に何を入れるか（暗号化不要、署名のみ）  
✅ **secret 管理**: signing secret ≠ verification secret（RS256なら秘密鍵/公開鍵分離）  
✅ **expiration**: exp claim の重要性  

**api-server への応用**:
- RS256 への移行（秘密鍵/公開鍵分離）
- 追加 claim（permissions array）

---

## 3. NestJS（nestjs/nest）

### 概要
**用途**: TypeScript 優先フレームワーク（Express / Fastify ベース）  
**GitHub**: https://github.com/nestjs/nest  
**DL**: 週 600K+（Express 上の"次世代フレームワーク"として注目）

### 設計思想
```
「デコレータ + 依存性注入」による宣言型設計
```

**コアコンセプト**:
- **Controllers**: ルーティング + リクエスト処理
- **Services**: ビジネスロジック（DI で注入）
- **Decorators**: `@Get()` `@Post()` `@UseGuards()` で機能を宣言
- **Guards**: ミドルウェアの代わり（認可ロジック）
- **Interceptors**: AOP スタイルの前後処理

```typescript
// ガード：認可ロジックを独立したクラスに
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;  // デコレータがなければ許可

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return requiredRoles.includes(user.role);
  }
}

// コントローラー：デコレータで権限を宣言
@Controller('tasks')
export class TasksController {
  constructor(private taskService: TasksService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('editor', 'admin')  // ロールを宣言
  async createTask(@Body() body: CreateTaskDto) {
    return this.taskService.create(body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')  // admin のみ
  async deleteTask(@Param('id') taskId: string) {
    return this.taskService.delete(taskId);
  }
}
```

### 認証・認可パターン
**認証**: Guards（ミドルウェアの代わり）  
**認可**: `@Roles()` デコレータ + RolesGuard

**特徴**:
- ガードが `ExecutionContext` 経由でメタデータ取得（リフレクション）
- `@Roles()` デコレータでエンドポイント毎に権限定義
- DI コンテナが依存を自動注入

### api-server との比較

| 項目 | NestJS | api-server |
|---|---|---|
| **構造** | Controller → Service | Router → Controller → Service |
| **権限制御** | Guard + Decorator | Middleware + requireRole() |
| **型安全性** | 完全（フレームワークレベル） | 部分的（自力で型定義） |
| **DI** | フレームワーク組込 | なし（手作り）|
| **学習曲線** | 急（Angular 的） | 緩（Express） |

### 学習ポイント
✅ **Guard パターン**: ミドルウェア vs Guard（関心の分離）  
✅ **デコレータ**: メタデータを使った宣言型設計  
✅ **DI コンテナ**: 依存を自動解決（テスト時も便利）  
✅ **リフレクション**: `@Roles()` の値を実行時に取得  

**api-server への応用**:
```typescript
// NestJS 的な改良案
@Injectable()
export class RoleGuard {
  canActivate(req: Request, allowedRoles: string[]): boolean {
    return allowedRoles.includes(req.user?.role);
  }
}

// または Decorator で：
function Authorize(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// 使用：
app.post('/tasks', Authorize('editor', 'admin'), createTask);
```

---

## 4. KeystoneJS（keystonejs/keystone）

### 概要
**用途**: Headless CMS + グラフィカル管理画面 + 権限管理  
**GitHub**: https://github.com/keystonejs/keystone  
**特徴**: 複雑な RBAC（role-based, attribute-based, field-level）

### 設計思想
```
「宣言型スキーマ」から CRUD API + 権限管理を自動生成
```

**コアコンセプト**:
- **Schema**: 型定義で items（エンティティ）を定義
- **Access Control**: list / item / field レベルの権限
- **Admin UI**: 管理画面を自動生成
- **GraphQL/REST API**: スキーマから自動生成

```javascript
// スキーマ定義で権限も宣言
const Task = list({
  access: {
    operation: {
      query: true,  // 全員読取可
      create: ({ session }) => !!session?.user,  // ログイン者のみ
      update: ({ session, item }) => session?.user?.id === item.created_by,  // 作成者のみ編集
      delete: ({ session }) => session?.user?.role === 'admin'  // admin のみ削除
    },
    filter: {
      query: ({ session }) =>
        session?.user?.role === 'admin'
          ? {}  // admin は全件
          : { created_by: { id: { equals: session.user.id } } }  // 自分のタスクのみ
    }
  },
  fields: {
    title: text({ validation: { isRequired: true } }),
    created_by: relationship({ ref: 'User.tasks' }),
    is_deleted: checkbox({ defaultValue: false })
  }
});
```

### 認証・認可パターン
**レベル1: Operation 権限** (CRUD 操作)
```javascript
operation: { query, create, update, delete }
```

**レベル2: Item 権限** (個別レコード)
```javascript
filter: { ... }  // 条件付きアクセス
```

**レベル3: Field 権限** (カラムレベル)
```javascript
fields: {
  salary: integer({
    access: { read: ({ session }) => session.user.role === 'admin' }
  })
}
```

### api-server との比較

| 項目 | Keystone | api-server |
|---|---|---|
| **スコープ** | CMS 全体 + 権限 | API Server のみ |
| **権限レベル** | Operation / Item / Field | Role のみ |
| **条件付きアクセス** | ✅（filter で複雑な条件可） | ❌（role チェックのみ） |
| **UI** | ✅ Admin UI 自動生成 | ❌ API のみ |
| **複雑性** | 高（learning curve 急） | 低（シンプル） |

### 学習ポイント
✅ **多層権限設計**: Operation / Item / Field の3段階  
✅ **条件付きアクセス**: role だけでなく、属性ベース（ABAC）  
✅ **スキーマ駆動**: 型定義から API・UI・権限を生成  

**api-server への応用**:
```javascript
// Item レベルの権限（例：タスク作成者のみ更新可）
async updateTask(taskId, updates, userId) {
  const task = await this.getTask(taskId);
  
  // Item 権限チェック
  if (task.created_by !== userId && userRole !== 'admin') {
    throw new Error('Forbidden: Not task owner');
  }
  
  return this.tasks.update(taskId, updates);
}
```

---

## 5. OpenCRUD（opencrud/opencrud）

### 概要
**用途**: REST API の設計仕様・ベストプラクティス集  
**GitHub**: https://github.com/opencrud/opencrud  
**特徴**: DB-agnostic な CRUD API 標準化

### 設計思想
```
「一貫した REST パターン」で複雑なクエリを標準化
```

**コアコンセプト**:
- **統一エンドポイント**: 1つのリソースに対して複数操作
- **フィルタリング**: `?where=` で条件指定
- **ページネーション**: `?first=10&after=cursor`
- **ソート**: `?orderBy=created_at:desc`
- **関連データ**: `?include=related`

```
# OpenCRUD 仕様に基づくエンドポイント例

## 複数取得（フィルタ + ページネーション + ソート）
GET /tasks?where={status:pending}&orderBy=due_date:asc&first=10&after=cursor

## 応答
{
  "data": [...],
  "pageInfo": {
    "endCursor": "...",
    "hasNextPage": true
  }
}

## 作成
POST /tasks
{ "title": "...", "assigned_to": "..." }

## 更新
PATCH /tasks/id
{ "status": "completed" }

## 削除
DELETE /tasks/id

## バッチ操作
POST /tasks/batch
{
  "create": [ ... ],
  "update": [ ... ],
  "delete": [ ... ]
}
```

### API 設計パターン
**フィルタリング**:
```
where: { status: 'pending', assigned_to: 'alice@example.com' }
```

**リレーション**:
```
include: { assigned_to: true, status: { include: { color: true } } }
```

**ページネーション** (Cursor-based):
```
first: 10  // 最初の10件
after: 'cursor123'  // この cursor より後ろ
```

### api-server との比較

| 項目 | OpenCRUD | api-server |
|---|---|---|
| **エンドポイント設計** | 統一・標準化 | リソース別（現状） |
| **フィルタリング** | クエリパラメータで柔軟 | 部分的（status_id, assigned_to） |
| **ページネーション** | Cursor-based | Offset-based |
| **バッチ操作** | ✅ | ❌ |
| **複雑なクエリ** | 強力（where 組み合わせ） | 制限的 |

### 学習ポイント
✅ **標準化の力**: 統一パターンで複雑さを隠蔽  
✅ **Cursor-based ページネーション**: offset より安全（削除に強い）  
✅ **Include パターン**: N+1 問題を避ける設計  

**api-server への応用**:
```javascript
// OpenCRUD 的改良案
GET /api/tasks?where={"status":"pending"}&orderBy={"created_at":"desc"}&first=10

// -> 今の api-server
GET /api/tasks?status_id=123&limit=10&offset=0

// ハイブリッド：既存+OpenCRUD
GET /api/tasks
  ?where={"status_id":"123","is_deleted":false}
  &orderBy={"created_at":"desc"}
  &limit=10&offset=0
```

---

## 6. GraphQL（graphql/graphql-core）

### 概要
**用途**: GraphQL 仕様の参照実装  
**GitHub**: https://github.com/graphql/graphql-core  
**特徴**: クエリ言語 + 型システム + 権限管理の統合

### 設計思想
```
「型 + クエリ言語」で REST の限界を超える
```

**コアコンセプト**:
- **スキーマ**: 型定義（field / argument / return type）
- **クエリ**: クライアントが必要なフィールドのみ指定
- **リゾルバー**: 各フィールドの値を取得するロジック
- **ミドルウェア**: directive で権限制御

```graphql
# スキーマ定義
type Task {
  id: ID!
  title: String!
  status: TaskStatus!
  assignedTo: User!
  createdAt: DateTime!
}

type Query {
  tasks(
    where: TaskWhereInput
    orderBy: [TaskOrderByInput]
    first: Int
    after: String
  ): TaskConnection!

  task(id: ID!): Task
}

type Mutation {
  createTask(input: CreateTaskInput!): Task!
  updateTask(id: ID!, input: UpdateTaskInput!): Task!
  deleteTask(id: ID!): Boolean!
}

# directive で権限制御
directive @auth(roles: [String!]!) on FIELD_DEFINITION

type Mutation {
  deleteTask(id: ID!): Boolean! @auth(roles: ["admin"])
}
```

### 認証・認可パターン
**Directive**: GraphQL 独自の権限制御

```typescript
// directive の実装
class AuthDirective {
  async visitFieldDefinition(field, details) {
    const originalResolve = field.resolve;
    
    field.resolve = async (obj, args, context, info) => {
      // 権限チェック
      const allowedRoles = info.directive.roles;
      if (!allowedRoles.includes(context.user?.role)) {
        throw new Error('Forbidden');
      }
      
      // オリジナルリゾルバー実行
      return originalResolve(obj, args, context, info);
    };
  }
}
```

**フィールドレベル権限**:
```typescript
// リゾルバー内で判定
const userResolver = {
  salary: (user, args, context) => {
    if (context.user.role !== 'admin') {
      throw new Error('Cannot access salary');
    }
    return user.salary;
  }
};
```

### api-server との比較

| 項目 | GraphQL | api-server |
|---|---|---|
| **クエリ形式** | クエリ言語（flexible） | HTTP Method + URL |
| **オーバーフェッチ** | 無し（必要フィールドのみ） | あり（全フィールド返却） |
| **権限制御** | Directive + Field | Middleware + Route |
| **複雑なクエリ** | 強力（nested query） | 制限的 |
| **学習曲線** | 急（新言語） | 緩（HTTP） |
| **キャッシング** | 難（クエリが動的） | 易（URL ベース） |

### 学習ポイント
✅ **Directive**: メタプログラミングで権限を宣言  
✅ **フィールド権限**: 個別フィールドに権限制御（Keystone level-3）  
✅ **Resolver Chain**: 各フィールドで権限チェック（細粒度）  

**api-server への応用**:
```typescript
// GraphQL 的な Directive
@Authorize('admin')
async deleteTask(taskId: string) {
  return this.taskService.delete(taskId);
}

// または Resolver チェーン
async getTask(id: string, context: Context) {
  const task = await this.taskService.get(id);
  
  // フィールド毎に権限チェック
  return {
    ...task,
    salary: context.user.role === 'admin' ? task.salary : undefined
  };
}
```

---

## 統合比較表

| リポジトリ | 認証方式 | 認可スコープ | 権限粒度 | 複雑性 | api-server への影響度 |
|---|---|---|---|---|---|
| **Passport.js** | Strategy パターン | なし（別途） | なし | 低 | 🟡 中（Strategy 参考） |
| **jsonwebtoken** | JWT | Claim ベース | claim | 低 | 🟢 高（既に使用） |
| **NestJS** | Guard | エンドポイント | Role | 中 | 🟡 中（Guard 設計） |
| **Keystone** | Session | Operation/Item/Field | 3層 | 高 | 🔴 低（CMS用） |
| **OpenCRUD** | なし（API仕様） | なし | なし | 低 | 🟡 中（API設計） |
| **GraphQL** | Directive | Field | Field | 高 | 🟡 中（細粒度権限） |

---

## api-server 実装への推奨改善

### Phase A（短期：即実装）
1. ✅ RBAC 実装済み（role: admin/editor/viewer）
2. RS256 移行（HS256 → 秘密鍵/公開鍵分離）
3. Claim 拡張（permissions array 追加）

```javascript
// RS256 化（秘密鍵は環境変数から）
const privateKey = process.env.JWT_PRIVATE_KEY;
const publicKey = process.env.JWT_PUBLIC_KEY;

const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### Phase B（中期：次フェーズ）
1. Item レベル権限（Keystone 参考）
2. Field レベル権限（GraphQL 参考）
3. Cursor-based ページネーション（OpenCRUD 参考）

```javascript
// Item 権限の例
async updateTask(taskId, updates, userId, userRole) {
  const task = await this.getTask(taskId);
  
  // Operation 権限
  if (userRole !== 'editor' && userRole !== 'admin') {
    throw new Error('Unauthorized');
  }
  
  // Item 権限（作成者のみ編集可）
  if (task.created_by !== userId && userRole !== 'admin') {
    throw new Error('Forbidden: Not owner');
  }
  
  return this.tasks.update(taskId, updates);
}
```

### Phase C（長期：GraphQL 導入）
Project③④⑤ で GraphQL layer を検討
- Knowledge DB（複雑なクエリ）
- Data Analysis（ネストされたデータ）

---

## 学習ロードマップ

```
Week 1-2: Passport.js Strategy パターン を理解
          → api-server に複数認証方式を追加

Week 2-3: NestJS Guard パターン を学ぶ
          → Express でも Guard 的なミドルウェアに改良

Week 3-4: Keystone Item/Field 権限 を研究
          → api-server に Item 権限層を追加

Week 4-5: OpenCRUD API 設計 を検討
          → Query パラメータ統一化（where / orderBy 等）

Week 5-6: GraphQL directive を調査
          → Project③④⑤ への適用検討
```

---

## まとめ

**各リポジトリから学べること:**

| リポジトリ | 学び | 優先度 |
|---|---|---|
| **Passport.js** | Strategy パターンの再利用性 | 🟢 次フェーズ |
| **jsonwebtoken** | JWT claim 設計（既に応用中） | 🔵 現在進行中 |
| **NestJS** | Guard + Decorator の設計 | 🟢 次フェーズ |
| **Keystone** | 多層権限（Operation/Item/Field） | 🟡 1ヶ月後 |
| **OpenCRUD** | API クエリ標準化 | 🟡 1ヶ月後 |
| **GraphQL** | フィールド権限 + クエリ最適化 | 🔴 3ヶ月後 |

**現在の api-server 評価**: ✅ **Good**
- JWT + RBAC の基本は標準的
- Passport / NestJS / GraphQL の思想を段階的に取り入れられる

**次のステップ**:
1. Phase A: RS256 + Claim 拡張
2. Phase B: Item 権限層
3. Phase C: GraphQL 検討
