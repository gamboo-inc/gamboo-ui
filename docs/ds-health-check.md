# DS Health Check

AI エージェント向け Design System 設定の成熟度を 5 段階で診断するチェックリスト。
あなたのプロジェクトが「AI に正しい UI を書かせる」ためにどこまで準備できているかを評価する。

> DS 自体の品質（トークン数やコンポーネント網羅性）は評価しない。あくまで「AI-readiness」の診断。

## 使い方

任意の AI エージェントで、自分のプロジェクトを開いた状態でこのファイルを参照させる。

**プロンプト例**:
- Claude Code: `@ds-health-check.md を参照して、このプロジェクトの DS 設定を診断して`
- Cursor: このファイルをコンテキストに追加し「DS Health Check を実施して」
- 汎用: `このファイルの診断プロトコルに従って、プロジェクトの DS 設定の成熟度を評価してください`

---

## レベル定義

| Lv | 名前 | AI にできること |
|----|------|----------------|
| 0 | **None**（定義なし） | ブランドカラーもルールも知らない。毎回すべて指示が必要 |
| 1 | **Inline**（混在） | DS 指示を読めるが、作業手順と混在しており精度が不安定 |
| 2 | **Separated**（分離） | DESIGN.md を読むだけで DS に沿った基本 UI を生成できる |
| 3 | **Structured**（構造化） | JSON から正確な値を参照し、曖昧さなく仕様通りの UI を書ける |
| 4 | **Verified**（検証済） | 仕様違反を自動検出。半年後もスコアが落ちない仕組みがある |

---

## 診断プロトコル

> AI エージェントの能力に応じて、ファイル存在確認はツール呼び出し・検索機能・ユーザーへの確認のいずれで行ってもよい。

### Phase 1: 走査（Scan）

以下のファイルの存在を確認する。

| カテゴリ | 走査パターン |
|---------|-------------|
| AI 設定 | `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules`, `.cline/` |
| AI 設定（汎用） | `*rules*`, `*instructions*`, `.ai*` |
| DS ドキュメント | `DESIGN.md`, `design.md`, `DESIGN_SYSTEM.md`, `docs/design-system.*` |
| 構造化データ | `**/tokens.{json,yaml}`, `**/rules.{json,yaml}`, `**/*.contract.json`, `**/design-tokens.*`, `**/style-dictionary/**` |
| SSOT 宣言 | `**/authority.md`, DS ドキュメント内の "source of truth" / "SSOT" 記述 |
| 検証 | `package.json` scripts, `Makefile`, `**/validate.*`, `**/check-design.*` |
| CI | `.github/workflows/*.yml`, `.gitlab-ci.yml` |
| Hook | `.claude/settings*.json` (hooks), `.husky/*`, `.pre-commit-config.yaml` |
| ベンチマーク（任意） | `**/benchmarks/**`, `**/benchmark.*`, `**/eval/**` |

### Phase 2: 内容分析（Analyze）

見つかったファイルの内容を読み、以下を判定する:

1. AI 設定ファイル内に DS キーワード（color, font, spacing, component, token, 禁止, prohibited）があるか
2. DESIGN.md の 3 要素: **原則** / **Quick Reference** / **禁止パターン** のうちいくつ含むか
3. 構造化データの種類: トークン / ルール / コンポーネント仕様 のどれがあるか
4. SSOT（どのファイルが正か）が宣言されているか
5. 構造化データからドキュメントやメタデータを生成する仕組みがあるか
6. 検証カバレッジ: 静的検証 / ドリフト検出 / CI / Hook の 4 つのうちいくつあるか

### Phase 3: レベル判定（Judge）

上から順に判定し、条件を満たす最高レベルを返す。**上位レベルには下位の条件がすべて必要。**

```
Lv.4: Lv.3 の条件 + 検証（静的検証/ドリフト検出/CI/Hook）のうち 2 つ以上
Lv.3: Lv.2 の条件 + 構造化データ(JSON/YAML)が 1 種以上 + SSOT 宣言あり
Lv.2: DESIGN.md が独立ファイルで存在 + 3 要素のうち 2 つ以上
Lv.1: AI 設定ファイルに DS 関連記述がある（が DESIGN.md 未分離）
Lv.0: DS 関連記述なし
```

### Phase 4: 出力（Report）

以下のテンプレートに沿って結果を出力する。

---

## 出力テンプレート

```markdown
# DS Health Check 診断結果

## 判定: Lv.{N} — {レベル名}

### 検出されたファイル
| カテゴリ | ファイル | 状態 |
|---------|---------|------|
| AI 設定 | {path or "なし"} | found / not found |
| DS ドキュメント | {path or "なし"} | found / not found |
| 構造化データ | {path or "なし"} | found / not found |
| 検証 | {path or "なし"} | found / not found |

### 現在の強み
- {このプロジェクトがすでにできていること — ポジティブに}

### ネクストアクション（Lv.{N} → Lv.{N+1}）
1. {最優先}
2. {次}
3. {その次}
```

---

## ネクストアクション詳細

### Lv.0 → Lv.1: AI 設定ファイルに DS 指示を書く

- **何を作る**: CLAUDE.md (または .cursorrules 等) に DS のルールを追記
- **書く内容**: 使用カラー、フォント、スペーシングの基本値、禁止パターン 3〜5 個
- **目安**: 20〜50 行の追記で十分

### Lv.1 → Lv.2: DESIGN.md を分離する

- **何を作る**: プロジェクトルートに `DESIGN.md` を新規作成
- **書く内容**: 以下 3 要素のうち 2 つ以上
  - 設計原則（3〜7 項目）
  - Quick Reference（コピペ可能なコードスニペット）
  - 禁止パターン（5〜10 個）
- **AI 設定ファイルから分離**: CLAUDE.md 等は「作業手順」だけにし、`DESIGN.md を読め` と参照させる
- **付録の DESIGN.md テンプレート** を出発点にできる

### Lv.2 → Lv.3: 仕様を構造化する

- **何を作る**: JSON/YAML でトークン・ルール・コンポーネント仕様のいずれかを定義
- **最小例**: `design/rules.json` に禁止ルールを 5 件 —
  ```json
  [
    { "id": "NO_TEXT_BLACK", "pattern": "text-black", "alternative": "text-slate-900" }
  ]
  ```
- **SSOT を宣言**: どのファイルが正規版か明記する（README や authority.md で）
- **参考**: melta-ui では `design/contracts/rules.json`（89 ルール）, `design/contracts/tokens.json`（99 トークン）

### Lv.3 → Lv.4: 検証を自動化する

- **以下のうち 2 つ以上** を導入:
  - 静的検証: JSON スキーマバリデーション、ルール ID 重複チェック、トークンと実装の整合性チェック等のスクリプト
  - ドリフト検出: ドキュメント上の数値と構造化データの実数値を突き合わせ
  - CI 統合: GitHub Actions 等で PR のたびに検証を自動実行
  - Hook: ファイル保存時にルール違反を自動検出（Claude Code PostToolUse, pre-commit 等）
- **参考**: melta-ui では `npm run design:check`（ルール・スキーマ検証）, `npm run design:drift`（ドリフト検出）, `npm run validate`（tokens.json と CSS 変数の整合）, `npm test`（Playwright + axe-core）の 4 種を GitHub Actions の 1 ワークフロー（`.github/workflows/design-check.yml`）に集約

### Lv.4+: 観察可能性を追加する（発展形・任意）

Lv.4 まで来たら、**「DS が AI に本当に使われているか」を観察する**仕組みを足すと、研究的な検証や継続的な改善に効く。Lv.4 の必須要件ではないが、半年後に「ルールが効いているのか効いていないのか」を主観ではなくデータで判断したい場合に有効。

- 観察対象の例: AI が DS のどの項目を参照したか、どのツールを呼んだか、生成物のスコア
- **参考**: melta-ui では `npm run benchmark` で AI-Ready 1.0（旧 CLAUDE.md）と 2.0（DESIGN.md + contracts）を同一プロンプトで比較し、tool 呼び出しと参照リソースをレポートに記録している。red-team プロンプト 5 本で「DS を意図的に逸脱させようとする指示」への耐性も測れる

---

## リファレンス: melta-ui（Lv.4 + 観察可能性）

| 要素 | ファイル |
|------|---------|
| AI 設定 | `CLAUDE.md` — 作業手順のみ |
| DS ドキュメント | `DESIGN.md` — 原則 + Quick Ref + 禁止 Top10 |
| トークン JSON | `design/contracts/tokens.json` (99 トークン) |
| ルール JSON | `design/contracts/rules.json` (89 ルール) |
| コンポーネント仕様 | `design/contracts/components/*.contract.json` (28 個) |
| SSOT 宣言 | `design/authority.md` |
| 静的検証（ルール・スキーマ） | `npm run design:check` |
| 静的検証（トークン↔CSS） | `npm run validate` |
| ドリフト検出 | `npm run design:drift` |
| 自動テスト | `npm test`（Playwright + axe-core） |
| CI 統合 | `.github/workflows/design-check.yml`（上記 4 種 + `npm run build` を 1 ワークフローで） |
| MCP サーバー | `src/server.ts` — 5 tool（`get_token` / `get_component` / `check_rule` / `get_rules` / `search`） |
| Hook | PostToolUse で禁止パターン自動検出 |
| Benchmark（観察可能性） | `npm run benchmark` — provider 抽象化（Anthropic / fixture / OpenAI placeholder）、1.0/2.0 比較、tool 呼び出しと参照リソースを記録、red-team プロンプト 5 本 |

https://github.com/tsubotax/melta-ui

---

## 付録: DESIGN.md テンプレート

Lv.1 → Lv.2 への移行用。コピーして自分のプロジェクトに合わせて編集する。
CSS フレームワーク（Tailwind, vanilla CSS, CSS Modules 等）を問わず使える汎用形式。

```markdown
# DESIGN.md

## 原則
1. コンテンツファースト — 装飾よりも情報の伝達を優先する
2. アクセシビリティはデフォルト — WCAG 2.1 AA 準拠
3. 一貫性 — 同じ意味には同じ見た目を使う

## Quick Reference

<!-- 自分のプロジェクトのスタイルに合わせて書き換える -->

カード: {カードのスタイル定義}
ボタン(primary): {プライマリボタンのスタイル定義}
ボタン(secondary): {セカンダリボタンのスタイル定義}
入力欄: {テキスト入力のスタイル定義}

## 禁止パターン

| NG | 代替 | 理由 |
|----|------|------|
| {禁止スタイル1} | {代替} | {なぜダメか} |
| {禁止スタイル2} | {代替} | {なぜダメか} |
| {禁止スタイル3} | {代替} | {なぜダメか} |
```

---

version: 1.1.0
last-updated: 2026-04-27
