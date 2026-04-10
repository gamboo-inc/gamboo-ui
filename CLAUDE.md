# melta UI - Claude Code 作業指示

> Claude Code でこの repo を扱うときのルール。デザイン仕様は `DESIGN.md` を参照。

---

## 最初に読むファイル

| 目的 | ファイル |
|------|---------|
| デザイン仕様（Quick Ref 含む） | `DESIGN.md` |
| 作業手順 | `CLAUDE.md`（本ファイル） |
| SSOT 宣言 | `design/authority.md` |

---

## 読み込みモード

| モード | 読むファイル | 用途 |
|--------|------------|------|
| クイック | `DESIGN.md` のみ | 単体UIの生成（ボタン、カード等） |
| 標準 | + `foundations/theme.md` + 関連 component md or contract | ページ単位の生成 |
| MCP | MCP ツール（`get_token` / `get_component` / `check_rule`）| AI ツール統合 |
| フル | 全ファイル（下記の読み順に従う） | 新規プロジェクト構築・DS変更 |

**フル読み順**: `DESIGN.md` → `foundations/design_philosophy.md` → `foundations/theme.md` → `foundations/` → `components/` or `design/contracts/components/` → `patterns/` → `design/contracts/rules.json`

---

## 作業ルール

1. **UI タスク開始時**に `@DESIGN.md` を読む
2. **exact value** が必要なら `design/contracts/` を参照する
3. **コンポーネント仕様**は `*.contract.json` を優先（なければ `components/*.md` → `metadata/components.json`）
4. **禁止ルール**の SSOT は `design/contracts/rules.json`（89 ルール）
5. **finish 前**に `npm run design:check` を走らせる
6. **generated file**（`metadata/components.json`）を直接編集しない → `npm run design:build` で再生成
7. **新しい component** を作る場合、まず `design/contracts/components/` に contract を書く

---

## npm scripts

```bash
npm run design:check   # static harness（ルール検証・contract検証・SSOT整合性）
npm run design:build   # contract → metadata/components.json 互換生成
npm run validate       # tokens.json vs ds-config.js / ds-theme.css の整合性
npm run build          # TypeScript → dist/（MCP サーバー）
```

---

## タスクベース読み込みガイド

| タスク | 読み込むファイル（順序） |
|--------|------------------------|
| 単体コンポーネント生成 | `DESIGN.md` のみ |
| ページ生成 | + `foundations/theme.md` → `patterns/layout.md` → 関連 component md |
| ダークモード対応 | + `foundations/theme.md`（CSS変数）→ `foundations/color.md`（Dark列） |
| フォーム画面 | + `patterns/form.md` → textfield / select / checkbox / button |
| データ一覧 | + `table.md` → `pagination.md` → `badge.md` |
| ダッシュボード | + `foundations/theme.md` → `layout.md` → card / table / progress / badge |
| 設定画面 | + `tabs.md` → toggle / select / radio |
| モーダル / 確認 | + `modal.md` → `button.md` |
| Loading / 空状態 | + `skeleton.md` → `interaction-states.md` |
| 通知フィードバック | + `toast.md` → `alert.md` → `interaction-states.md` |
| サイドバー付きページ | + `sidebar.md` → `layout.md` |
| ナビゲーション | + `navigation.md` → `sidebar.md` → tabs / breadcrumb |
| レスポンシブ対応 | + `patterns/responsive.md` → `layout.md` |
| アクセシビリティ確認 | + `foundations/accessibility.md` |
| アイコン選択 | + `foundations/icons.md` |
| ウィザード / ステップ画面 | + `stepper.md` → `button.md` |
| 日付入力フォーム | + `datepicker.md` → `textfield.md` → `form.md` |
| セクション分割 | + `divider.md` → `layout.md` |
| テーマカスタマイズ | `foundations/theme.md` → `foundations/color.md` |
| DS変更 / 新コンポーネント | フル読み込み |

---

## Foundation / コンポーネント一覧

**Foundations (10)**: color, spacing, typography, elevation, radius, motion, z-index, icons, accessibility, emotional-feedback — 各 `foundations/{name}.md`

**Components (28)**: button, card, checkbox, modal, sidebar, textfield, select, dropdown, radio, toggle, toast, list, badge, tag, table, tooltip, tabs, breadcrumb, pagination, avatar, progress, alert, accordion, skeleton, datepicker, divider, stepper, copy-button — 各 `components/{name}.md`

**Contracts**: `design/contracts/components/*.contract.json` — 移行済みコンポーネントの機械可読仕様

**Skills (1)**: design-review — `skills/design-review/SKILL.md`

**Patterns (5)**: layout, form, navigation, interaction-states, responsive — 各 `patterns/{name}.md`

---

## テーマ・ダークモード

> テーマ設定・CSS変数定義: `foundations/theme.md` 参照。

| 設定 | 値 |
|------|-----|
| **ダークモード** | `OFF` |

- `OFF`: ライトモードのみで設計・生成する（デフォルト）
- `ON`: ダークモード対応を含めて設計・生成する（`foundations/theme.md` + `foundations/color.md` Dark列）

---

## デプロイ

| 項目 | 値 |
|------|-----|
| ホスティング | Netlify（手動デプロイ） |
| 本番URL | https://melta.tsubotax.com |
| publish ディレクトリ | `.`（リポジトリルート）— `netlify.toml` で設定済み |

```bash
# 本番デプロイ（--dir 指定不要。netlify.toml の publish = "." が使われる）
netlify deploy --prod
```

> **注意**: `netlify deploy --prod --dir=docs` は NG。`publish = "."` なのでルートからデプロイしないとリダイレクトが 404 になる。
