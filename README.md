# Underground Thread Board

コミュニティ内で使う、2ちゃんねる風のリアルタイム掲示板です。依存パッケージなしで、Node.js 標準 `http` と Server-Sent Events だけで動きます。

## Features

- スレ立てとスレ別レス
- 新規スレ、レス、リアクションをリアルタイム配信
- `sage` 書き込み対応
- アングラ寄りの暗色 BBS UI
- インストール依存なしで軽量
- Docker / Docker Compose 対応
- 任意で `COMMUNITY_KEY` による簡易合言葉を設定可能

## Run Locally

```bash
node server.js
```

Open http://localhost:3000

## Run With Docker

```bash
docker compose up --build
```

Open http://localhost:3000

## Community Key

コミュニティ内部だけで使う場合は、`docker-compose.yml` の `COMMUNITY_KEY` を有効化してください。

```yaml
environment:
  PORT: 3000
  THREAD_LIMIT: 80
  COMMENT_LIMIT: 300
  COMMUNITY_KEY: "your-shared-passphrase"
```

初回アクセス時にブラウザが合言葉を聞きます。

## Notes

スレッドとレスはメモリ上に保持されます。小さなコミュニティでサクッと使う用途に向いています。永続化が必要になったら SQLite などを追加するのがおすすめです。
