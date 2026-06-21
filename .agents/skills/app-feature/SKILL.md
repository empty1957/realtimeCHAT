---
name: app-feature
description: "新しいアプリ機能、UI フロー、API エンドポイント、プロダクト挙動の変更を実装するときに使う。小さな文言修正や機械的リファクタには使わない。"
---

# アプリ機能実装 Skill

新機能を実装するときは、以下の流れに従う。

## 1. 要件を理解する

以下を特定する。

- ユーザーの目的
- 対象となる画面、route、component、API、data model
- 受け入れ条件
- 今回やらないこと
- リポジトリ内の類似実装パターン

要件が曖昧な場合は、最小限で合理的な前提を置き、その前提を明示する。

## 2. 編集前に調査する

コードを書く前に、以下を確認する。

- 既存の route / page / component 構成
- 共通 UI コンポーネント
- state management のパターン
- API / data fetching の規約
- validation と error handling のパターン
- 既存テスト

## 3. 計画する

簡潔な計画を作る。

- 変更予定ファイル
- データの流れ
- UI 状態: loading / empty / error / success
- テスト方針
- migration やリスクの有無

## 4. 実装する

ルール:

- 既存のプロジェクトパターンを優先する。
- 変更範囲を狭く保つ。
- 必要がない限り新しい依存関係を追加しない。
- UI のアクセシビリティを維持する。
- ドメインロジックはテストしやすく保つ。
- 挙動やセットアップが変わる場合はドキュメントも更新する。

## 5. 検証する

関連するチェックを実行する。優先順位は以下。

- typecheck
- lint
- unit / component test
- build
- 必要に応じた手動確認

## 6. 最終回答

以下を返す。

- Summary
- Changed files
- Verification
- Risks / follow-ups
