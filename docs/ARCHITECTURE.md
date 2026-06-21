# アーキテクチャ

## 技術スタック

- Framework:
- Language:
- Package manager:
- Styling:
- State management:
- Database:
- ORM / Query builder:
- Auth:
- Hosting:
- Test runner:
- E2E:
- CI:

## ディレクトリ構成

```text
/
├── app または src/
├── components/
├── lib/
├── hooks/
├── tests/
├── docs/
└── public/
```

## 主要な設計方針

- 
- 
- 

## レイヤー構成

### UI layer

責務:

- 画面表示
- ユーザー操作の受付
- loading / empty / error / success 状態の表示

避けること:

- 複雑なビジネスロジック
- 認可判断の重複実装
- API レスポンス構造への過度な依存

### Application layer

責務:

- ユースケースの実行
- 入力値の整形
- API / DB / 外部サービスの呼び出し調整

### Domain layer

責務:

- ビジネスルール
- ドメイン型
- validation
- 状態遷移

### Infrastructure layer

責務:

- DB access
- 外部 API
- 認証基盤
- storage
- email / notification

## データフロー

標準的なデータの流れを記載する。

例:

1. ユーザーが UI で操作する。
2. component が action / API / service を呼び出す。
3. 入力値を validation する。
4. 認証・認可を確認する。
5. DB または外部 API を更新する。
6. 結果を UI に返す。
7. UI が success / error state を表示する。

## 認証・認可モデル

### 認証

- 使用サービス:
- session 管理:
- token 管理:
- ログイン方法:

### 認可

- role:
- permission:
- resource ownership:
- 管理者権限:

## API 設計

### 基本方針

- 入力値は API boundary で検証する。
- 認証と認可を分離して確認する。
- エラーは利用者に理解できる形で返す。
- 内部実装や secret はレスポンスに含めない。

### エラーハンドリング

代表的なエラー:

- 400: validation error
- 401: unauthenticated
- 403: unauthorized
- 404: not found
- 409: conflict
- 500: internal error

## DB 設計

### 主要テーブル / コレクション

- users
- 

### migration 方針

- 
- 

### index 方針

- 
- 

## 状態管理

### Server state

- 

### Client state

- 

### Form state

- 

## UI 設計

### コンポーネント方針

- 既存 component を優先する。
- 再利用可能な UI と画面固有 UI を分ける。
- props は明確にし、暗黙の依存を減らす。

### アクセシビリティ

- semantic HTML を優先する。
- keyboard navigation を壊さない。
- form には label を付ける。
- 画像には適切な alt を付ける。
- focus state を維持する。

## テスト戦略

### Unit test

対象:

- pure function
- validation
- formatter
- domain logic

### Component test

対象:

- UI の分岐
- user interaction
- loading / empty / error / success state

### Integration test

対象:

- API
- DB access
- auth / authorization
- external service boundary

### E2E test

対象:

- 主要なユーザーフロー
- signup / login
- critical path

## 実行コマンド

実際の `package.json` に合わせて更新する。

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 環境変数

`.env.example` に必要な値を記載する。

```bash
DATABASE_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
```

## セキュリティ上の注意

- secret を client bundle に含めない。
- client から渡された user id や role を信用しない。
- 破壊的操作では ownership と permission を確認する。
- 個人情報をログに出さない。
- 外部 API のエラー内容をそのままユーザーに出さない。

## 既知の技術的負債

- 
- 
- 

## 今後の検討事項

- 
- 
- 
