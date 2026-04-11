# Changelog

## [1.2.0] - 2026-04-11

### AI-Ready 2.0 アーキテクチャ

CLAUDE.md 一枚に全部入りだった v1 から、3 層分離（憲法 / 仕様 / 検証）の v2 に移行。

#### Added

- **DESIGN.md** — AI が最初に読むデザイン憲法 + Quick Reference（8.6KB）
- **design/contracts/** — 機械可読な SSOT
  - `tokens.json` — 99 デザイントークン（旧 tokens/ から移動）
  - `rules.json` — 89 禁止ルール registry（ID + severity + detector）
  - `components/*.contract.json` — 28 コンポーネント contract（全件 enriched）
- **design/schemas/** — rule + component-contract の JSON Schema
- **design/authority.md** — Source of Truth 宣言
- **scripts/design/**
  - `validate.ts` — Schema 検証 + ルール整合 + tokenRef 確認（`npm run design:check`）
  - `drift-check.ts` — ドキュメント ↔ contracts の drift 検出（`npm run design:drift`）
  - `build-legacy.ts` — contract → metadata/components.json 互換生成（`npm run design:build`）
  - `update-showcase.ts` — showcase の数値を contracts から自動更新
  - `hook-check-rule.sh` — PostToolUse hook で HTML 禁止パターン自動検出
- **tests/showcase.spec.ts** — Playwright + axe-core（9 テスト）
- **design/benchmarks/** — Agent benchmark（5 standard + 3 red-team prompt + rubric）
- **.github/workflows/design-check.yml** — CI で design:check + drift + test を自動実行

#### Changed

- **CLAUDE.md** — 18KB → 5.5KB（-70%）。デザイン仕様を DESIGN.md に委譲、作業手順書に変身
- **src/utils/loader.ts** — ハードコード 19 件 → `rules.json` 読み込み（32 パターン自動検出、fail-fast）
- **metadata/components.json** — 手書き → contracts から 100% 生成
- **foundations/prohibited.md** — SSOT を `rules.json` に移譲。人間向け解説文書に格下げ
- **docs/index.html** — AI-Ready 2.0 セクション追加、数値を contracts から自動反映、読み込みモード更新
- **README.md** — 2.0 アーキテクチャに全面書き直し

#### Fixed

- MCP check_rule のパターン乖離（prohibited.md 76 件 vs loader.ts 19 件 → rules.json 89 件に統一）
- showcase のハードコード数値 drift（version, コンポーネント数, トークン数, ルール数）
- checkbox/radio contract の不要な aria-checked 指定
- select contract の role を native control に合わせて修正

---

## [1.1.1] - 2026-03-25

- docs/index.html レスポンシブ対応
- 作業用画像削除（3.8MB 削減）
- デプロイ手順を CLAUDE.md に追記
- OGP バリエーション追加

## [1.1.0] - 2026-03-20

- 初回公開
- 28 コンポーネント + 10 ファウンデーション + 5 パターン
- MCP サーバー（get_token / get_component / check_rule / search）
- Showcase サイト
- 12 サンプルページ
