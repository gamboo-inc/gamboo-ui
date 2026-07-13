# Google DESIGN.md spec との互換性

> gamboo UI の `DESIGN.md` は、Google Labs の [design.md spec](https://github.com/google-labs-code/design.md)（version: alpha）互換の YAML front matter を含む。
> front matter は `design/contracts/tokens.json` から `scripts/design/export-designmd.ts` で生成される（直接編集しない）。
> 検証: `npx @google/design.md lint DESIGN.md` → errors: 0（CI の drift-check が再生成一致を監視）。

## 経緯 — 独立に同名・同思想へ収斂した

| 日付 | 出来事 |
|------|--------|
| 2026-04-10 | gamboo UI が `DESIGN.md`（憲法 + Quick Reference）を導入（commit `d95069e`） |
| 2026-04-21 | Google Labs が design.md spec を OSS 公開 |

「AI エージェントにデザインシステムを読ませる入口を 1 枚の DESIGN.md に集約する」という発想に、両者が独立に到達した。gamboo は Google spec を上書きするのではなく、front matter 互換で相互運用しつつ、**spec が守備範囲外とする検証層**を持つ点で差別化する。

## 守備範囲の対比

| 領域 | Google design.md spec | gamboo UI |
|------|----------------------|----------|
| トークンの機械可読化 | ✅ YAML front matter | ✅ 同 front matter（生成）+ `design/contracts/tokens.json`（SSOT） |
| DESIGN.md ファイル自体の検証 | ✅ `design.md lint`（WCAG コントラスト・参照切れ） | ✅ `design:drift`（front matter ↔ tokens.json の再生成一致） |
| **生成されたコードの検証** | —（spec の守備範囲外） | ✅ `design:lint-generated` / MCP `check_html`（99 ルール、CI gate） |
| **書いた瞬間の enforcement** | — | ✅ PostToolUse hook（error = block フィードバック） |
| **warn の増加防止** | — | ✅ baseline ラチェット（CI） |
| コンポーネント仕様 | △ components トークン（プロパティ 8 種） | ✅ 33 contract（variants / states / a11y / rules） |
| 対話的アクセス | — | ✅ MCP サーバー 6 ツール |

一言で: **Google spec は「DESIGN.md を正しく書く」まで、gamboo は「DESIGN.md の通りに書かれたかを検証し続ける」まで**。

## トークン対応表

| Google spec | gamboo SSOT（design/contracts/tokens.json） | 備考 |
|-------------|---------------------------------------------|------|
| `colors.primary` / `colors.primary-{50..950}` | `color.primary.{step}.value` | primary = 500 |
| `colors.body` | `color.body.value` | 本文色 #3d4b5f |
| `colors.neutral` | `color.semantic.light.bg-page.value` | ページ背景 |
| `colors.{success,warning,danger}` | `color.status.{name}.base.value` | |
| `typography.h1/h2/h3` | `typography.fontSize.{3xl,2xl,xl}` + `letterSpacing.heading` | lh はトークンの unitless 値 |
| `typography.body*/caption` | `typography.fontSize.{lg,base,sm,xs}` + `letterSpacing.body` | body = 18px / lh 2.0 |
| `rounded.{sm,md,lg,full}` | `radius.{level}.value` | |
| `spacing.{1..16}` | `spacing.{level}.value` | 4px グリッド |
| `components.button-primary*` | `design/contracts/components/button.contract.json` | front matter 側は token reference のデモ。完全仕様は contract |

## gamboo 拡張（front matter に含まれないもの）

elevation / motion / z-index / wireframe トークン、99 禁止ルール、コンポーネント contract（states / a11y / antiPatterns）は Google spec のスキーマ外のため front matter には出力しない。これらは `design/contracts/` と MCP（`get_token` / `get_rules` / `get_component`）から取得する。
