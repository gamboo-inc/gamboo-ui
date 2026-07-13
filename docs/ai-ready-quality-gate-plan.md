# AI-Ready Quality Gate 実装計画

> 作成: 2026-04-26（v1: CODEX 起草）  
> 改訂: 2026-04-26（v2: agent + CODEX レビュー反映 — 改訂履歴は末尾参照）  
> 対象: gamboo UI  
> 目的: ハーネス / AI-ready Design System 研究のため、AI向け参照性と品質ゲートを強化する。同時に D2I 等で実用 DS としても運用可能にする

---

## 背景

gamboo UI は `DESIGN.md`、`design/contracts/`、MCP、static harness、drift check、Playwright + axe を備えており、AI-ready DS の研究対象として十分に先進的な構造を持っている。

一方で、現状は以下の弱点がある。

- `rules.json` は89ルールあるが、MCP経由で実質参照できるのは自動検出可能な一部ルールに寄っている
- contract自体に禁止パターンが混入しても、`design:check` で落ちない
- axeで `serious` violation が出てもテストが通る
- MCP serverのversion / component countなどのメタ情報が手書きで古くなる
- AI-ready 2.0の効果検証はあるが、multi-agent / multi-provider研究基盤としてはまだ弱い

この計画では、まず P-1 で型基盤を整え、P0〜P3 を品質ゲート強化として実装する。P4 は別フェーズの研究基盤強化だが、**研究目的（AI-ready DS が AI に効くか検証）達成のためには P4 まで含めて初めて成立する**。後回しではなく独立フェーズ扱い。gamboo UI は AI-ready DS 研究プロジェクトであると同時に、D2I 等の個人プロジェクトで実用 DS としても使うため、P0-P3 を実用優先で先に固め、P4 は研究基盤として後続フェーズに回す。

> **重要**: P4 で必要になる provider abstraction の signature（`generate` の戻り値型）だけは P0-P3 完了時点で**確定済み**にすること（B8 前倒し）。後の再設計コストを避けるため。

---

## P-1: 型基盤整理（P0/P3 の前提）

### 目的

`get_rules` / `gamboo://rules` / `Violation` を MCP の外部 I/F として安定させるため、ルール関連型を `src/utils/types.ts` の SSOT に集約する。P0 と P3 が同じ型基盤に乗るよう先頭に分離。

### 変更対象

- `src/utils/types.ts`
- `src/utils/loader.ts`（`RuleEntry/RulesFile` の private interface を export 経由に置き換え）
- `src/tools/check-rule.ts`（`Violation` 型拡張）
- 必要に応じて `tests/`

### 設計

**1. `RuleEntry` / `RulesFile` を types.ts に移動・export**

現状 `src/utils/types.ts:124-129` には `ProhibitionRule` が `pattern/reason/alternative` の3フィールドしかない。一方 `src/utils/loader.ts:40-55` に `RuleEntry`/`RulesFile` が非 export のローカル interface として存在する。`get_rules` を MCP tool に出す前提で types.ts に移して export する。

```ts
// src/utils/types.ts（追加）
export interface RuleEntry {
  id: string;
  category: string;
  severity: "error" | "warn";
  description: string;
  detector: "tailwind-class" | "tailwind-class-prefix" | "html-attr" | "manual";
  pattern?: string;
  matchPatterns?: string[];
  reason?: string;
  alternative?: string;
  // P1 で追加（後述）
  contractLint?: "enforce" | "warn" | "skip";
  requiresContext?: boolean;
}

export interface RulesFile {
  rules: RuleEntry[];
}
```

既存 `ProhibitionRule` は `RuleEntry` のサブセット相当なので、廃止 or alias 化を decide する（破壊的変更を避けたい場合は alias）。

**2. `Violation` 型に `ruleId` / `severity` を追加**

`src/tools/check-rule.ts:3-7` の `Violation` 型は現状 `class/reason/alternative` のみ。研究ログでも CI でも違反追跡できるよう `ruleId` と `severity` を追加。

```ts
interface Violation {
  ruleId: string;
  severity: "error" | "warn";
  class: string;
  reason?: string;
  alternative?: string;
}
```

### 受け入れ条件

- `RuleEntry` / `RulesFile` が `src/utils/types.ts` から export されている
- `loadRules()` の戻り値型が `RulesFile`
- `Violation` 型に `ruleId` / `severity` が含まれる
- 既存の `getProhibitionRules()` / `check_rule` の挙動は壊れない（ruleId/severity が増えるのは互換的拡張）
- `npm run build` がpass

---

## P0: MCPで全ルールをAIに渡せるようにする

### 目的

`design/contracts/rules.json` の89ルールを、manualルールも含めてAIが参照できるようにする。

`check_rule` は自動検出ツールとして維持しつつ、`get_rules` / `gamboo://rules` は参照用として全件返す。

### 変更対象

- `src/utils/loader.ts`
- `src/server.ts`
- `README.md`
- 必要に応じて `tests/`

> 型定義（`RuleEntry` / `RulesFile`）の export は P-1 で完了済み前提。

### 設計

既存の `getProhibitionRules()` は、`check_rule` 用の自動検出可能ルール返却として残す。

新規で以下を追加する。

```ts
loadRules(): RulesFile
getAllRules(filter?: RuleFilter): RuleEntry[]
```

filter案:

```ts
interface RuleFilter {
  category?: string;
  severity?: "error" | "warn";
  detector?: "tailwind-class" | "tailwind-class-prefix" | "html-attr" | "manual";
  component?: string;
}
```

MCP tool:

```ts
get_rules({
  category?: string;
  severity?: "error" | "warn";
  detector?: "tailwind-class" | "tailwind-class-prefix" | "html-attr" | "manual";
  component?: string;
})
```

MCP resource（**初期から両方公開する**）:

- `gamboo://rules` — 全89件（manual含む）。AI が context 取得用に参照する
- `gamboo://rules/auto-detectable` — 自動検出可能ルールのみ（detector が `tailwind-class` / `tailwind-class-prefix` / `html-attr` のサブセット、約24件）。実装時の lint 確認用

両 resource を公開する理由: 全件は AI への参照性のため必須、サブセットは context size 抑制とCI/lintツール統合のため必須。プラン v1 では「別resourceにするなら」と曖昧だったが、両方必須とコミットする。

### 受け入れ条件

- `gamboo://rules` が89件返す
- `gamboo://rules/auto-detectable` が自動検出可能ルール（約24件）を返す
- `get_rules` で `manual` / `accessibility` / `error` などの絞り込みができる
- `check_rule` は従来通り、Tailwind class stringに対する自動検出ツールとして動く（ただし P-1 で `Violation` 型に `ruleId`/`severity` が増えている）
- READMEの「89ルール」とMCP実体が一致する

---

## P1a: Tailwind-aware rule matcher 仕様 + 共通化

### 目的

現状 `src/tools/check-rule.ts:20` の `cls.includes(rule.pattern)` は部分一致誤検出が多く、contract lint に流用できない。例: `pattern: "p-0"` (`SPACE_NO_P0_CARDS`) が `top-0` を誤検出 → `design/contracts/components/sidebar.contract.json:33` の `"fixed left-0 top-0 ..."` がいきなり fail する。

P1a で matcher の正しい仕様を確定し、`check_rule` と `validate.ts` の双方が同じ matcher を使う基盤を作る。

### 変更対象

- `src/tools/check-rule.ts`（matcher 抽出 + 仕様変更）
- `src/utils/matcher.ts`（新規 — 共通 matcher utility）
- `src/utils/types.ts`（`MatchContext` 等の型追加）
- `tests/matcher.spec.ts`（新規 — matcher の仕様テスト）

### 設計

#### 1. class token の Tailwind-aware 正規化

入力 class string を以下の手順で token に分解:

1. 空白で split
2. 各 token から **arbitrary variant `[...]` 内部の `:` は区切らない** ことに注意して、variant prefix を剥がす
3. `!important` (`!`) prefix を剥がす
4. arbitrary value `[...]` はそのまま base utility の一部として扱う

例:
- `hover:bg-blue-500` → variant `hover:` を剥がして base `bg-blue-500`
- `md:!text-black` → variant `md:` + important `!` を剥がして base `text-black`
- `[&>*]:p-0` → arbitrary variant `[&>*]:` を剥がして base `p-0`
- `space-x-[12px]` → arbitrary value込みで `space-x-[12px]`

#### 2. detector 別マッチング規則

```ts
interface MatchContext {
  raw: string;        // 元の token（hover:bg-blue-500 等）
  base: string;       // 正規化後（bg-blue-500）
  variants: string[]; // ["hover", "md", ...]
  important: boolean;
}

// rule.detector 別の判定:
function matches(rule: RuleEntry, ctx: MatchContext): boolean {
  switch (rule.detector) {
    case "tailwind-class":
      // base との完全一致（rule.matchPatterns があれば優先）
      return rule.matchPatterns
        ? rule.matchPatterns.includes(ctx.base)
        : ctx.base === rule.pattern;
    case "tailwind-class-prefix":
      // base の prefix 一致 or matchPatterns 一致
      return rule.matchPatterns
        ? rule.matchPatterns.some(p => ctx.base.startsWith(p))
        : ctx.base.startsWith(rule.pattern!);
    // html-attr / manual は class matching ではないので false
    default:
      return false;
  }
}
```

#### 3. `check_rule` の出力差分

P-1 で `Violation` 型に `ruleId`/`severity` が加わるので互換的拡張。それに加えて、**現状の誤検出（例: `top-0` が `p-0` ルールにヒット）が消える**ため、`check_rule` の violation 件数が減るケースが存在する。

→ MCP クライアント側で `Violation[]` の長さを期待値にしているテストがあれば調整が必要。実装時に dry-run で差分を出して確認する。

#### 4. Tailwind v4 移行ノート

gamboo UI は現状 Tailwind v3 系（CDN 経由 + 手書き utility）。v4 への移行時には matcher の正規化処理が以下に対応する必要:

- arbitrary variant 構文の追加（`[&:nth-child(odd)]:` 等）
- `@variant` API でのカスタム variant 定義
- token の lookup 方法変更（CSS variable based）

P1a の matcher は v4 互換性を意識した API（`MatchContext` でのコンテキスト分離）にしておくが、v4 移行は別 issue。

### 受け入れ条件

- `src/utils/matcher.ts` が `tokenize(classString): MatchContext[]` と `matches(rule, ctx): boolean` を export
- `tests/matcher.spec.ts` で variant / important / arbitrary variant / arbitrary value の各ケースが pass
- `check_rule` が共通 matcher を使うようリファクタされている
- `cls.includes(rule.pattern)` 由来の誤検出（`top-0` → `p-0` 等）が消える
- dry-run スクリプトで「現 check_rule の出力」と「新 matcher の出力」の差分が出力可能
- `npm run build` / `npm test` がpass

---

## P1b: contract 自体を lint 対象にする

### 目的

SSOTである component contract に禁止クラスが混入したら、CIで検出する。P1a で固めた matcher を適用する。

### 変更対象

- `scripts/design/validate.ts`
- `design/contracts/rules.json`（`contractLint` フラグ追加）
- `design/contracts/components/*.contract.json`（必要なら `ruleOverrides` 追加）

### 設計

#### 1. rules.json に `contractLint` フラグを追加（SSOT）

文脈依存ルール（`SPACE_NO_P0_CARDS` 等）を contract lint で誤検出するのを避けるため、rules.json 自体に分類フラグを持たせる:

```jsonc
{
  "id": "SPACE_NO_P0_CARDS",
  "category": "spacing",
  "severity": "error",
  "detector": "tailwind-class",
  "pattern": "p-0",
  "contractLint": "skip",      // enforce | warn | skip
  "requiresContext": true,     // contract 単独では文脈不足の判断
  "reason": "...",
  ...
}
```

`contractLint` の3値:
- `enforce`: contract に混入したら error
- `warn`: contract に混入したら warning（CI 通る）
- `skip`: contract lint 対象外（runtime check のみ）
- 省略時は `enforce`（明示的に skip しない限り守る）

例外を contract 側ではなく rule 側に置く理由: SSOT 一元化。validate.ts にハードコード allowlist を書くと SSOT が割れる。

#### 2. `ruleOverrides`（必要に応じて）

特定 component だけ rule を override する必要があれば、contract 側に持たせる:

```jsonc
// design/contracts/components/sidebar.contract.json
{
  "name": "sidebar",
  ...
  "ruleOverrides": {
    "COLOR_NO_BLACK": "skip"   // sidebar の特定ケースのみ
  }
}
```

初期実装では使わない想定。必要が発生したら追加。

#### 3. `validate.ts` 走査対象

contract schema 全体を走査する。`variants/sizes/htmlSample` だけでなく、Tailwind class が登場する全フィールドを対象:

- `variants.*.tailwind`
- `sizes.*.tailwind`
- `iconButton.*.tailwind`
- `iconTextPadding.*.tailwind`
- `a11y.focusRing` （例: `sidebar.contract.json:41-45`）
- `rules` 配列内の文字列値
- `htmlSample` が string の場合はその全文（HTML パース後 class 属性のみ）
- `htmlSample` が object の場合は各 value（同上）
- 上記以外で string 型の値があれば `tailwind` という key 名のものを再帰的に拾う

走査対象は P1b 着手時に contract schema を再走査して網羅性を確認する。

#### 4. 検出ロジック

P1a の共通 matcher を使う。`rule.contractLint !== "skip"` のルールだけ適用。

### 受け入れ条件

- `rules.json` 全89件に `contractLint` フィールドが追加されている（明示 or 省略時 enforce）
- contract 内に `text-black`、`shadow-2xl`、`border-t-4`、`bg-blue-` で始まる class を入れると `npm run design:check` がfailする
- 現在のcontract群で `npm run design:check` がpassする（必要なら `contractLint: "skip"` を該当ルールに付与）
- ルール検出ロジックがMCP `check_rule` と `validate.ts` で二重実装になっていない（P1a の共通 matcher を使う）
- `docs/index.html` を含む full sweep（`npm run design:check && npm run design:drift && npm test`）がpass

---

## P2a: serious violation を gate に追加（除外維持）

### 目的

Playwright + axe が「違反を見つけたが通す」状態をやめる第一段階。**現状の axe 除外範囲（`[data-section]` 全除外）を維持したまま** `serious` violation 0 を達成する。

### 背景: なぜ P2a / P2b に分けるか

`tests/showcase.spec.ts:49` の `.exclude("[data-section]")` は **42 個の data-section を全部スキップ**している（`docs/index.html` で `data-section=` が42箇所）。これは showcase 本体ほぼ全域。

除外を縮小すると `serious` だけでなく `critical` も再増殖する典型パターンが多い（例: `docs/index.html:2084` 周辺で `<button role="option" aria-selected>` を listbox 親なしで使っており、`aria-required-parent` 系の serious/critical 違反が出る）。

→ 「serious gate 追加」と「除外縮小」を1フェーズで混ぜると、何が原因で落ちているか切り分け困難。**先に gate を上げてから、別 PR で除外を縮小する**。

### 変更対象

- `tests/showcase.spec.ts`
- `docs/index.html`（`aria-prohibited-attr` 修正のみ）

### 設計

**1. `aria-prohibited-attr` を修正**

現在出ている serious violation を解消。HTML 側の修正。

**2. テスト条件を以下に変更**

```ts
expect(critical).toHaveLength(0);
expect(serious).toHaveLength(0);
```

除外範囲は**変更しない**（`[data-section]` 全除外、`color-contrast` disabled、`.ds-dodont-dont` 除外、`.ds-dodont-do` 除外を維持）。

### 受け入れ条件

- `npm test` で `serious` violation が0
- `aria-prohibited-attr` が解消される
- axe 除外範囲は現状維持（縮小は P2b で行う）
- docs側のa11y regressionがCIで止まる

---

## P2b: axe 除外範囲を縮小（critical 再増殖前提）

### 目的

`[data-section]` 全除外をやめ、個別のデモ領域（悪例セクション等）のみ除外に縮小する。**除外縮小と同時に critical も再増殖する前提**で構造修正を進める。

### 変更対象

- `tests/showcase.spec.ts`（除外セレクタ縮小）
- `docs/index.html`（構造修正多数）
- 必要に応じて showcase 内のデモHTML

### 設計

**1. 除外範囲を縮小**

- `[data-section]` 全除外をやめる
- `.ds-dodont-dont` は意図的な悪例なので除外継続
- `.ds-dodont-do` の除外はできれば縮小（個別判断）
- `color-contrast` は Tailwind CDN の誤検出が多ければ disabled 継続でよい
- 残す除外には**理由コメント必須**

**2. 構造修正（critical / serious 解消）**

除外縮小で出てくる違反を順次修正。典型パターン:
- `role="option"` を listbox 親なしで使用 → 親要素に `role="listbox"` 追加
- aria-* 属性のロールミスマッチ
- ラベルなしフォーム要素
- 不適切な heading 階層

### 受け入れ条件

- `[data-section]` 全除外が削除されている
- 残存除外に理由コメントが付いている
- `npm test` で critical / serious ともに 0
- docs側のa11y regressionがCIで止まる

---

## P3: MCPサーバーのメタ情報を動的化する

### 目的

MCPのAI向けI/Fで、古いversionやcomponent countを出さない。

### 変更対象

- `src/server.ts`
- `src/utils/loader.ts`
- `src/utils/types.ts`
- 必要なら `package.json` 読み込み用utility

### 現状の問題

- MCP server versionが `1.0.0` 固定
- resource descriptionが `All 27 component metadata` のまま
- 実際の package version は `1.2.0`
- 実際の component contract は28件

### 設計

server versionは `package.json.version` から読む。

component countは `loadComponents().components.length` から取得する。

rule countは `loadRules().rules.length` から取得する（P-1 で `loadRules()` 追加済み前提）。

例:

```ts
const pkg = loadPackage();
const components = loadComponents();
const rules = loadRules();

const server = new Server(
  { name: "gamboo-ui", version: pkg.version },
  { capabilities: { resources: {}, tools: {} } }
);
```

resource description:

```ts
description: `All ${components.components.length} component metadata with Tailwind classes`
description: `All ${rules.rules.length} prohibition rules, including manual rules`
```

#### `package.json` 読み込みパスの注意

`loadPackage()` は **runtime 読み**（`resolve(root, "package.json")` で読む）で実装する。`root = resolve(__dirname, "../..")` で src 実行 / dist 実行どちらも repo root に解決されるため動く。

ただし将来 `npm publish` で `dist/` だけ配布する場合、`package.json` の同梱ロジックに影響する。**publish 前に embed 化（`resolveJsonModule` で import / ビルド時置換）に切り替える**こと。現状は publish していないので runtime 読みで十分。

drift-check との連携: `scripts/design/drift-check.ts:72` の数字検証も `loadComponents().components.length` / `loadRules().rules.length` を使うように改修すれば、`docs/index.html:534,4276` の数字 drift も同じ仕組みで検出可能。プラン v1 では言及なかった点。

### 受け入れ条件

- MCP server versionが `package.json` と一致する
- component countが実データと一致する
- rule countが実データと一致する
- component追加時にserver文言の手修正が不要
- `scripts/design/drift-check.ts` が `docs/index.html` の数字 drift も検出する
- 将来の publish 切り替え方針が plan に明記されている

---

## P4: benchmarkを研究用に強化する

### 位置づけ

**P4 は別フェーズだが「やる前提」**。後回しではなく独立フェーズ扱い。

P0〜P3 は品質ゲート強化（D2I 等の実用 DS として効く）。P4 は研究基盤強化であり、レビュー観点が異なるため別PR / 別タスクで進める。**ただし AI-ready DS の効果検証（research goal）には P4 まで含めて初めて成立する**ので、優先度は「後回し」ではなく「独立フェーズ」。

### B8 前倒し: provider abstraction signature の確定（P0-P3 期間中）

**P4 本実装は P0-P3 完了後だが、provider abstraction の戻り値 signature だけは P0-P3 完了時点で確定済みにする**。理由: signature が `Promise<string>` のままだと P4 着手時に再設計コストが発生する。tool calls / 参照ルール / generation usage を記録できる構造にしておかないと「どのルールを AI が見たか」追えず研究目的が達成できない。

確定する signature:

```ts
interface GenerationResult {
  text: string;
  toolCalls?: Array<{
    name: string;          // get_token / get_component / check_rule / get_rules / search
    arguments: unknown;
    result: unknown;
  }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
  latencyMs: number;
  resourcesAccessed?: string[];  // gamboo://rules 等の resource アクセスログ
}

interface ModelProvider {
  id: string;
  generate(system: string, prompt: string): Promise<GenerationResult>;
}
```

P0-P3 期間中に signature だけ types.ts に定義し、P4 で実装。

### 目的

AI-ready 2.0が本当に効くのかを、Claude以外のエージェントや複数モデルでも比較できるようにする。

### 変更対象

- `design/benchmarks/runner.ts`
- `design/benchmarks/prompts/`
- `design/benchmarks/rubrics/`
- `src/utils/types.ts`（`ModelProvider` / `GenerationResult` を追加）
- `README.md`
- `docs/ds-health-check.md`

### 設計

provider abstractionを導入する（signature は B8 で前倒し確定済み）。

```ts
// src/utils/types.ts に定義
interface ModelProvider {
  id: string;
  generate(system: string, prompt: string): Promise<GenerationResult>;
}
```

CLI:

```bash
npm run benchmark -- --provider anthropic --model claude-sonnet-4-20250514
npm run benchmark -- --provider openai --model gpt-5.4
```

初期対応:

- Anthropic
- OpenAIは後続でも可
- local / fixture provider を用意するとCIでscoreのみ検証しやすい

評価軸（`GenerationResult` から導出）:

- rule violations（生成物 vs `check_rule` / contract lint）
- prohibited pattern count
- a11y structural signals（生成 HTML を axe にかけて）
- component usage fidelity（生成物が contract と一致するか）
- red-team refusal / translation quality
- context size（`usage.inputTokens`）
- generation latency（`latencyMs`）
- **AI が参照したルール / リソース**（`toolCalls` / `resourcesAccessed` から逆算）← 研究目的の核

red-team prompt:

- neon / glow / dark cyberpunk
- heavy shadow cards
- color bar cards
- placeholder-only form
- inaccessible icon-only buttons
- layout table misuse
- no label form

### 受け入れ条件

- 同一promptを複数provider / modelで比較できる
- red-team promptが5本以上
- reportに「生成品質」と「運用価値」を分けて出す
- APIなしでも既存fixtureをscoreできる
- `GenerationResult` から「どのルールを AI が見たか」追跡できる

---

## Claude Codeへの依頼文

Claude Codeにそのまま渡す場合は以下を使う。フェーズ単位で別 PR にする前提。

```md
gamboo-uiのAI-ready DS品質ゲートを強化してください。フェーズ単位で別PRにします。

実装順（P-1 → P3 → P0 → P1a → P1b → P2a → P2b → P4）:

P-1（型基盤整理 / 全P0-P3の前提）:
- RuleEntry / RulesFile を src/utils/types.ts に export
- Violation 型に ruleId / severity を追加
- ModelProvider / GenerationResult signature も types.ts に定義（B8前倒し、実装は P4）

P3（MCP メタ情報動的化）:
- server version / component count / rule count を package.json + 実データから動的化
- drift-check.ts を docs/index.html の数字 drift も検出するよう拡張

P0（ルール参照 I/F）:
- get_rules tool 実装
- gamboo://rules（全89件）と gamboo://rules/auto-detectable（24件サブセット）を両方公開

P1a（Tailwind-aware matcher）:
- variant / important / arbitrary variant / arbitrary value 対応
- check_rule と contract lint で共通化
- dry-run スクリプトで現出力との差分を確認

P1b（contract lint 本体）:
- rules.json に contractLint: enforce|warn|skip フラグ追加
- contract schema 全体（a11y.focusRing 等含む）を走査

P2a（serious gate 追加・除外維持）:
- aria-prohibited-attr 修正
- expect(serious).toHaveLength(0) を追加（[data-section] 全除外は維持）

P2b（除外縮小・構造修正）:
- [data-section] 全除外をやめる
- 残存違反（critical / serious）を構造修正で解消

P4（benchmark 強化 / 別フェーズだがやる前提）:
- ModelProvider 実装（Anthropic / OpenAI / fixture）
- toolCalls / resourcesAccessed を記録して「AI がどのルールを見たか」追跡

各フェーズ完了時に必ず実行:
- npm run design:check
- npm run design:drift
- npm run validate
- npm run build
- npm test

変更後、README / CLAUDE.md / DESIGN.md の記述と実装が drift しないように更新してください。
```

---

## 推奨実装順

CODEX レビュー反映後の確定版:

1. **P-1: 型基盤整理** — `RuleEntry/RulesFile` を types.ts に export、`Violation` 拡張、`ModelProvider/GenerationResult` signature 定義
   - P0 / P3 / P4 全てが乗る基盤
2. **P3: MCP メタ情報動的化** — 軽くて安全、P-1 の `loadRules()` を最初に使うフェーズ
3. **P0: ルール参照 I/F** — `get_rules` tool + `gamboo://rules` 全件 / `gamboo://rules/auto-detectable` サブセット両公開
4. **P1a: Tailwind-aware matcher** — matcher 仕様確定 + dry-run で差分確認
5. **P1b: contract lint 本体** — `contractLint` フラグ + schema 全体走査
6. **P2a: serious gate 追加（除外維持）** — `aria-prohibited-attr` 修正 + serious 0 達成
7. **P2b: 除外縮小と構造修正** — critical 再増殖前提で構造修正
8. **P4: benchmark 強化（別フェーズ・やる前提）** — provider 実装 + 評価ハーネス

---

## 完了時チェックリスト

### P-1（型基盤）
- [ ] `RuleEntry` / `RulesFile` が `src/utils/types.ts` から export されている
- [ ] `Violation` 型に `ruleId` / `severity` が含まれる
- [ ] `ModelProvider` / `GenerationResult` signature が types.ts に定義されている（B8 前倒し）

### P3（メタ情報動的化）
- [ ] MCP server version が `package.json` と一致
- [ ] component count / rule count が実データと一致
- [ ] `scripts/design/drift-check.ts` が `docs/index.html` の数字 drift も検出

### P0（ルール参照 I/F）
- [ ] `gamboo://rules` が89件返す
- [ ] `gamboo://rules/auto-detectable` が自動検出可能ルール（約24件）を返す
- [ ] `get_rules` tool が追加されている
- [ ] `check_rule` は従来の用途を壊していない（Violation の互換的拡張のみ）

### P1a（Tailwind-aware matcher）
- [ ] `src/utils/matcher.ts` の `tokenize` / `matches` が export されている
- [ ] `tests/matcher.spec.ts` で variant / important / arbitrary variant / arbitrary value のケースが pass
- [ ] dry-run スクリプトで `check_rule` 出力差分を確認済み

### P1b（contract lint）
- [ ] `rules.json` 全89件に `contractLint` フィールドが追加されている
- [ ] contract 内禁止パターンが `design:check` で検出される
- [ ] 現状の contract 群で `design:check` が pass する

### P2a（serious gate）
- [ ] `npm test` で serious axe violation が 0
- [ ] `aria-prohibited-attr` が解消されている
- [ ] axe 除外範囲は現状維持

### P2b（除外縮小）
- [ ] `[data-section]` 全除外が削除されている
- [ ] 残存除外に理由コメントが付いている
- [ ] critical / serious ともに 0

### P4（研究基盤・別フェーズ）
- [ ] `GenerationResult` から `toolCalls` / `resourcesAccessed` が取得できる
- [ ] 同一 prompt を複数 provider / model で比較できる
- [ ] red-team prompt が5本以上
- [ ] API なしでも既存 fixture を score できる

### 全フェーズ共通
- [ ] README / CLAUDE.md / DESIGN.md の記述と実装が drift していない
- [ ] `npm run design:check` がpass
- [ ] `npm run design:drift` がpass
- [ ] `npm run validate` がpass
- [ ] `npm run build` がpass
- [ ] `npm test` がpass

---

## 改訂履歴

### v2（2026-04-26）— agent + CODEX レビュー反映

v1（CODEX 起草版）を general-purpose agent + CODEX 自身に再レビューさせ、以下を反映した。

**主要変更**:

1. **新セクション P-1（型基盤整理）を追加** — `RuleEntry` / `RulesFile` を `src/utils/types.ts` に export、`Violation` 型に `ruleId`/`severity` 追加。P0 / P3 / P4 全フェーズの前提基盤として先頭に分離
2. **P0 の resource 設計を確定** — `gamboo://rules`（全89件）+ `gamboo://rules/auto-detectable`（約24件）を**初期から両方公開**（v1 は曖昧）
3. **P1 を P1a / P1b に分割** — P1a: Tailwind-aware matcher 仕様（variant / `!important` / arbitrary variant / arbitrary value 対応）と check_rule 互換性。P1b: contract schema 全体走査（v1 は `variants/sizes/htmlSample` のみだったが `a11y.focusRing` 等も対象）
4. **P1 の SSOT フラグ名修正** — v1 の `contractAllowlist: true` を `contractLint: "enforce" | "warn" | "skip"` + `requiresContext?: true` に変更（CODEX 提案）。例外は contract 側ではなく rule 側に置く
5. **P2 を P2a / P2b に分割** — `[data-section]` 全除外 + 42箇所のリスクから、serious gate 追加と除外縮小を別 PR に分割
6. **P3 に runtime/embed 切り替えノート追加** — 将来 `npm publish` 時の対応方針 + `drift-check.ts` 拡張で `docs/index.html` 数字 drift も検出
7. **P4 を「別フェーズだがやる前提」に格上げ** — AI-ready DS 効果検証は P4 まで含めて初めて成立。**B8（provider abstraction signature）は P0-P3 期間中に前倒し確定**
8. **推奨実装順を変更** — v1: `P3 → P0 → P1 → P2 → P4(別)` → v2: `P-1 → P3 → P0 → P1a → P1b → P2a → P2b → P4`
9. **Tailwind v4 移行ノート追加** — 現状 v3 だが matcher API は v4 互換性意識（CODEX 指摘）
10. **完了時チェックリストをフェーズ別に再構成**

**参照根拠**:
- agent レビュー: `src/utils/loader.ts:64-95`、`src/tools/check-rule.ts:20`、`src/server.ts:17,34`、`src/utils/types.ts:124-129`、`design/contracts/components/sidebar.contract.json:33`、`tests/showcase.spec.ts:49,65`、`docs/index.html:2084,534,4276`、`scripts/design/drift-check.ts:72`
- CODEX 追加レビュー: matcher 完全一致では `hover:` / `!important` / arbitrary variant を取りこぼす点、`Violation` 型の `ruleId/severity` 不足、contract schema 全体走査の必要性、`P0型整理 → P3 → P1a → P1b → P2a → P2b → P4` 順序

**棄却した提案**:
- agent 案「matcher を完全一致 + `[:/]` 区切りのみ」 → CODEX 案「Tailwind-aware 正規化」を採用
- agent 案「P4 は完全別フェーズ」 → 「別フェーズだがやる前提」に変更（D2I 実用優先 + 研究目的両立のため）

**未確定 / 後続判断**:
- `ProhibitionRule` を `RuleEntry` の alias にするか廃止するか（P-1 着手時に decide）
- `ruleOverrides`（contract 側 override）を実際に使うかどうか（P1b 着手時に decide）

