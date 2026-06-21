---
name: bugfix
description: "バグ、リグレッション、失敗しているテスト、runtime error、壊れた UI 挙動、不正な API 挙動を調査・修正するときに使う。"
---

# バグ修正 Skill

## 1. 再現または局所化する

最初に以下を特定する。

- 期待される挙動
- 実際の挙動
- エラーメッセージ、stack trace、log、失敗テスト
- 関連しそうな最近の変更
- 最小の影響範囲

原因を確認せずに場当たり的な修正をしない。

## 2. 根本原因を探す

以下の流れを追って原因を特定する。

- 入力値
- state
- API call
- validation
- rendering
- side effect
- error handling

広範な編集をする前に、可能性の高い根本原因を明示する。

## 3. 狭く修正する

ルール:

- 最小限で安全な修正を行う。
- 可能であれば regression test を追加する。
- 無関係なリファクタをしない。
- エラーを握りつぶして根本原因を隠さない。
- バグの原因が API contract にある場合を除き、既存の public API を維持する。

## 4. 検証する

以下を実行する。

- 失敗していたテストがある場合は、そのテスト。
- 対象バグの regression test。
- 関連する typecheck / lint / build。

## 5. 最終回答

以下を返す。

- Root cause
- Fix summary
- Regression coverage
- Verification
- Remaining risk
