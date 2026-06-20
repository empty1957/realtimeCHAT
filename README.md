# 深夜掲示板

コミュニティ内で使う軽量なリアルタイム掲示板です。アングラ感は少し残しつつ、普段使いしやすい暗色UIにしています。

## 機能

- スレ立てとスレ別レス
- Server-Sent Events によるリアルタイム更新
- スレ本文・レスへの画像添付
- `sage` 書き込み
- Wikipedia の「今日の出来事」を使った時間帯ごとの小ネタ表示
- Docker / Docker Compose 対応
- 任意の `COMMUNITY_KEY` による簡易合言葉

## ローカル起動

```bash
node server.js
```

http://localhost:3000 を開いてください。

## Docker 起動

```bash
docker compose up --build
```

http://localhost:3000 を開いてください。

## 設定

```yaml
environment:
  PORT: 3000
  THREAD_LIMIT: 80
  COMMENT_LIMIT: 300
  MAX_IMAGE_BYTES: 1200000
  COMMUNITY_KEY: "your-shared-passphrase"
```

画像はこの軽量版ではメモリ上に data URL として保持します。長期運用する場合は SQLite とアップロード用ディレクトリなどの永続化を追加してください。
