---
name: code-review
description: "未コミットの変更、pull request、diff、実装計画を、正しさ、セキュリティ、保守性、テスト観点でレビューするときに使う。"
---

# コードレビュー Skill

シニアエンジニアとしてレビューする。

## 優先順位

以下の順で確認する。

1. 正しさ
2. セキュリティとプライバシー
3. データ整合性
4. エラーハンドリング
5. edge case
6. アクセシビリティ
7. パフォーマンス
8. 保守性
9. テストカバレッジ
10. ドキュメント

## レビュースタイル

- 実際に修正可能な指摘に集中する。
- ファイル名と該当箇所を示す。
- なぜ問題なのかを説明する。
- 具体的な修正案を提示する。
- blocker と non-blocking suggestion を区別する。
- 実害がない formatting の好みは指摘しない。

## 出力形式

以下の形式で出力する。

### Blockers

merge 前に修正すべき問題。

### Suggestions

merge blocking ではないが有用な改善。

### Tests to add or run

追加・実行すべき具体的な検証。

### Overall assessment

Approve / approve with comments / request changes のいずれか。
