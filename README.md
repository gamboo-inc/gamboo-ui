# melta UI

[![Design System Check](https://github.com/tsubotax/melta-ui/actions/workflows/design-check.yml/badge.svg?branch=main)](https://github.com/tsubotax/melta-ui/actions/workflows/design-check.yml)

**人間にも、AIにも、読めるデザインシステム。**

> 🤖 **Built for AI coding agents** — Claude Code / Cursor / **Codex** が `DESIGN.md` と JSON contracts を読んで DS 準拠の UI を生成し、CI で違反を検知する。

---

デザインシステムは、人間のためだけのものだった。
スタイルガイドを読み、コンポーネントの意図を汲み取り、文脈に合わせて判断する——それはデザイナーとエンジニアの仕事だった。

しかし今、UIを書くのは人間だけではない。

AIがコードを生成し、コンポーネントを選び、レイアウトを組む時代に、
デザインシステムは **「人間が読める」だけでは足りない。**

melta UI は、この問いに対する一つの答えである。

**人間の可読性を犠牲にせず、AIの可読性を加える。** 両立こそが、melta UI の設計思想である。

---

## Architecture — AI-Ready 2.0

3 層構造で「AI が迷わない、間違えにくい、間違えても検知される」を実現する。

```
Layer 1: 憲法（AI が最初に読む入口）
  DESIGN.md          ← Brand Identity + 7原則 + Quick Reference
  CLAUDE.md          ← Claude Code 作業手順書

Layer 2: 仕様（Machine-Readable SSOT）
  design/contracts/
    ├── tokens.json   ← 99 デザイントークン
    ├── rules.json    ← 99 禁止ルール（ID + severity + detector）
    └── components/   ← 33 contract（web 28 + app 先行 5。variant + size + a11y + rules）

Layer 3: 検証（破っても通さない）
  scripts/design/     ← validate / drift-check / lint-generated / build-legacy / update-showcase
  tests/              ← Playwright + axe-core
  .github/workflows/  ← CI で自動実行
```

| レイヤー | 形式 | 読み手 | 役割 |
|---------|------|--------|------|
| **DESIGN.md** | Markdown | AI（全エージェント） | デザイン憲法 + Quick Reference。これだけで基本 UI を生成可能 |
| **CLAUDE.md** | Markdown | AI (Claude Code) | 作業手順・読み込みガイド・npm scripts |
| **contracts/** | JSON | AI + harness | 33 contract（web 28）+ 99 ルール + 99 トークンの厳密仕様 |
| **harness** | TypeScript | CI | Schema 検証・drift 検出・Playwright + axe |
| **components/*.md** | Markdown | 人間 | 設計意図・使い方・判断基準を自然言語で記述 |
| **docs/index.html** | HTML | 人間 | 全コンポーネントのインタラクティブショーケース |
| **MCP サーバー** | TypeScript | AI エージェント | トークン検索・コンポーネント取得・ルール検証をツールとして公開 |

---

## AI にとっての読みやすさ

### 1. 段階的読み込み — コンテキストを浪費しない

| モード | 読むファイル | 用途 |
|--------|------------|------|
| クイック | `DESIGN.md` のみ | 単体UIの生成 |
| 標準 | + `theme.md` + contracts / component md | ページ単位の生成 |
| MCP | `get_token` / `get_component` / `check_rule` / `get_rules` | AI ツール統合 |
| フル | 全ファイル | 新規プロジェクト構築 |

### 2. 機械可読な仕様 — 解釈ではなく参照

```jsonc
// design/contracts/components/button.contract.json
{
  "id": "button",
  "variants": {
    "contained": {
      "tokenRefs": { "bg": "color.primary.500", "radius": "radius.md" },
      "tailwind": "inline-flex items-center justify-center gap-2 h-10 px-4 ..."
    }
  },
  "rules": [
    { "id": "SPACE_NO_PY_05_BTN", "severity": "error" },
    { "id": "BTN_ICON_ONLY_ARIA_REQUIRED", "severity": "error" }
  ]
}
```

### 3. 99 ルールの禁止パターン — AI が間違えても検知される

```jsonc
// design/contracts/rules.json
{
  "id": "AI_NO_CARD_COLOR_BAR_TOP",
  "severity": "error",
  "detector": "tailwind-class",
  "pattern": "border-t-4",
  "alternative": "border border-slate-200 のみでカードを構成"
}
```

### 4. MCP サーバー — 対話的なアクセス

AI エージェントは MCP ツールを通じて、必要な情報だけをオンデマンドで取得する。

```
Human: 「ユーザー一覧テーブルを作って」

AI (内部):
  1. get_component("table")   → 仕様・HTMLサンプル取得
  2. get_component("pagination") → ページ送り仕様取得
  3. → DS準拠の HTML を生成
  4. check_html(生成したHTML) → CI と同一ロジックで自己検証
  5. 違反があれば修正して再検証 → 提示
```

### 5. Enforcement — 書いた直後に検知して直させる

「読める」だけでは AI-Ready ではない。違反コードが書かれた瞬間に検知し、修正ループに乗せる 3 層を同梱する。

| 層 | 対象 | 仕組み |
|---|---|---|
| **PostToolUse hook** | Claude Code | `.claude/settings.json` に同梱（クローンするだけで有効化候補に）。Write/Edit 直後に lint が走り、error は block フィードバックで Claude が自動修正、warn は additionalContext で助言注入 |
| **CI** | 全エージェント | `.github/workflows/design-check.yml` が PR / push の変更ファイルを禁止パターン検査 |
| **CLI** | Codex / Cursor 等 | `npm run design:lint-generated -- <file>` 。各エージェントのフック機構に組み込み可能 |

> hook は `npm install` 後に有効（未インストール時はその旨をコンテキストに通知）。Claude Code 以外のエージェントには CI + CLI が代替層。

---

## Quick Start

### Claude Code

1. このリポジトリをプロジェクトルートに配置する
2. Claude Code が `DESIGN.md` + `CLAUDE.md` を自動で読み込む
3. UI を指示するだけで DS 準拠のコードが生成される

```
「ユーザー一覧のテーブルを作って」
→ table contract + badge contract を参照し、DS準拠のHTMLを生成
```

### MCP サーバー（Claude Code / Cursor）

```bash
npm install && npm run build
claude mcp add melta-ui node ./dist/index.js
```

| ツール | 説明 | 入力例 |
|--------|------|--------|
| `get_token` | トークン検索 | `{ "path": "color.primary.600" }` |
| `get_component` | コンポーネント仕様取得 | `{ "id": "button" }` |
| `check_rule` | クラス文字列の禁止パターンチェック（31パターン自動検出。文脈依存は conditional 付き） | `{ "classes": "text-black shadow-2xl" }` |
| `check_html` | 生成 HTML/JSX 全体を CI / hook と同一ロジックで lint。生成→自己検証→修正のループ用 | `{ "source": "<div class=...>" }` |
| `get_rules` | 99 ルール参照（manual 含む全件、filter 対応） | `{ "category": "accessibility" }` |
| `search` | 全文検索（最大 20 件 + truncated 通知） | `{ "query": "card" }` |

| Resource | 内容 |
|----------|------|
| `melta://tokens` | トークン全体 |
| `melta://components` | 28 コンポーネント仕様 |
| `melta://components/{id}` | 個別コンポーネント |
| `melta://rules` | 99 禁止ルール全件（manual含む） |
| `melta://rules/auto-detectable` | 自動検出可能サブセット（check_rule 用） |

### Cursor

`.cursor/rules/` に 3 つのルールファイルを同梱:
- `melta-ui.mdc` — DS 全体ルール
- `color-system.mdc` — カラートークン一覧
- `components.mdc` — 28 コンポーネントの Tailwind クラス一覧

### 手動

1. Tailwind CSS 4 をプロジェクトに導入
2. `foundations/theme.md` の CSS 変数をプロジェクトに追加
3. `DESIGN.md` の Quick Reference を参照してクラスを適用

---

## npm Scripts

```bash
npm run design:check          # Schema + ルール + tokenRef 検証
npm run design:drift           # ドキュメント ↔ contracts の drift 検出
npm run design:build           # contract → metadata/components.json 生成 + tsc
npm run design:update-showcase # showcase の数値を contracts から自動更新
npm test                       # Playwright + axe-core
npm run benchmark              # 1.0 vs 2.0 A/B ベンチマーク（multi-provider, 要 API キー）
npm run build                  # TypeScript → dist/（MCP サーバー）
npm run validate               # tokens.json vs CSS の整合性
```

---

## Design Principles

1. **Content First** — UI は黒子。コンテンツが主役
2. **WCAG 2.1 AA** — コントラスト 4.5:1 以上。アクセシビリティはデフォルト
3. **Semantic Color** — `bg-primary-500` を使う。`bg-blue-*` は使わない
4. **3-Color Rule** — 1 画面に使う色は 3 色まで
5. **4px Grid** — スペーシングは 4 の倍数を基本
6. **Minimal Elevation** — `shadow-sm` 〜 `shadow-md`。`shadow-lg` 以上はオーバーレイ限定
7. **No AI-ish Decoration** — カラーバー禁止。全周ボーダーで構成

> 詳細は `foundations/design_philosophy.md` を参照。

---

## Components

28 コンポーネント + 10 ファウンデーション + 5 パターン。

| カテゴリ | コンポーネント |
|---------|--------------|
| **入力** | Button, TextField, Select, Checkbox, Radio, Toggle, Date Picker |
| **ナビゲーション** | Sidebar, Tabs, Breadcrumb, Pagination, Stepper, Accordion |
| **データ表示** | Card, Table, List, Badge, Tag, Avatar, Progress, Divider |
| **フィードバック** | Modal, Toast, Alert, Tooltip, Skeleton, Copy Button, Dropdown |

---

## Directory

```
melta-ui/
├── DESIGN.md                        # AI 向けデザイン憲法 + Quick Reference
├── CLAUDE.md                        # Claude Code 作業手順書
├── design/
│   ├── authority.md                 # SSOT 宣言
│   ├── contracts/
│   │   ├── tokens.json              # 99 デザイントークン
│   │   ├── rules.json               # 99 禁止ルール registry
│   │   └── components/              # 33 contract（web 28 + app 先行 5）
│   ├── schemas/                     # JSON Schema（rule + component-contract）
│   └── benchmarks/                  # Agent benchmark（prompt + rubric）
├── foundations/                      # 設計基盤（13 ファイル）
├── components/                      # コンポーネント仕様（28 ファイル）
├── patterns/                        # パターン（5 ファイル）
├── metadata/components.json         # MCP 用集約データ（contracts から生成）
├── src/                             # MCP サーバー（TypeScript）
├── scripts/design/                  # validate / drift-check / build-legacy / update-showcase
├── tests/                           # Playwright + axe-core
├── docs/                            # ショーケース + OG 画像
├── examples/                        # 16 サンプルページ
├── assets/icons/                    # Charcoal 207 + Lucide 15
├── .github/workflows/               # CI（design:check + drift + test）
├── .mcp.json                        # Claude Code MCP 登録
└── .cursor/rules/                   # Cursor 用ルール
```

---

## Benchmark — AI が DS をどれだけ参照するかを実測

`design/benchmarks/` は「AI-Ready 1.0（旧 CLAUDE.md）」と「AI-Ready 2.0（DESIGN.md + contracts）」を同一 prompt で比較するハーネス。**provider 抽象化済み**で、Anthropic / fixture / OpenAI（後続） を切り替えられる。

```bash
# Anthropic で全 prompt を実行（ANTHROPIC_API_KEY が必要）
npm run benchmark

# 特定 prompt のみ
npm run benchmark -- --prompt 1
npm run benchmark -- --prompt R-1   # red-team

# モデル切替
npm run benchmark -- --provider anthropic --model claude-sonnet-4-20250514

# API なしで既存 results を score だけする（fixture）
npm run benchmark -- --provider fixture --fixture-run 2026-04-11

# 既存 HTML を上書きせず score だけ走らせる
npm run benchmark -- --skip-generate
```

**Anthropic provider は MCP の5 tool（`get_token` / `get_component` / `check_rule` / `get_rules` / `search`）を Claude API の tool use として渡す**。AI が実際に何回どの tool を呼んだか、どの resource を参照したかを `report.md` に記録する。これが「AI-Ready DS が本当に効いているか」の研究目的の核（`docs/ai-ready-quality-gate-plan.md` line 574）。

red-team prompt は5本（neon / heavy shadow / color bar / placeholder-only form / icon-only buttons）。

> 詳細仕様: `docs/ai-ready-quality-gate-plan.md` の P4 セクション。

---

## License

MIT License — [LICENSE](./LICENSE)

同梱アイコンのライセンスは [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md) を参照。

### Acknowledgments

- [Charcoal Icons](https://github.com/pixiv/charcoal)（pixiv Inc.）— Apache License 2.0
- [Lucide Icons](https://github.com/lucide-icons/lucide) — ISC License
- [Tailwind CSS](https://tailwindcss.com/)
