# melta-contracts

melta UI の **デザイン契約（contracts）** を JSON で配布する single source of truth パッケージ。
ビルド不要・フレームワーク非依存。web 実装（[melta-ui](https://github.com/tsubotax/melta-ui)）と React Native 実装（melta-app）の両方がこの同じ contract を別実装で満たす。

## 中身

| ファイル | 内容 |
|---|---|
| `tokens.json` | デザイントークン（color / spacing / radius / typography / shadow / motion） |
| `rules.json` | 禁止ルール registry（`foundations/prohibited.md` の machine-readable 版） |
| `components/*.contract.json` | 各コンポーネントの契約（anatomy / variants / sizes / states / a11y / tokenRefs） |

## 使い方

ビルドツール（Node / Metro）に依存しない最も確実な読み方は `require.resolve` + `readFileSync`：

```js
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const tokens = JSON.parse(readFileSync(require.resolve("melta-contracts/tokens"), "utf8"));
const rules = JSON.parse(readFileSync(require.resolve("melta-contracts/rules"), "utf8"));
const buttonContract = JSON.parse(
  readFileSync(require.resolve("melta-contracts/components/button"), "utf8"),
);
```

> ⚠️ `import tokens from "melta-contracts/tokens" with { type: "json" }`（JSON import attributes）は
> Node では使えるが **React Native / Metro での挙動は実機検証が必要**。確実性を優先するなら上記の `require.resolve` 方式を使う。

melta-app では `scripts/generate-native-theme.ts` がこの方式で `tokens.json` を読み、RN theme に正規化する（shadow → iOS shadow + Android elevation、rem → px 数値、lineHeight 比率 → px 等）。

## 注記

- 各 `components/*.contract.json` の `$schema` は `../schemas/` を指す**検証用メタフィールド**。schema 検証は melta-ui 側の責務であり、このパッケージには schemas を同梱しない。consumer は contract の値（required props / variants / states）を読むだけで ajv 検証は行わない。
- 互換は semver で縛る。tokens / rules / 各 contract は内部に独自の `version` を持つため、破壊的変更時はパッケージ version と合わせて確認すること。
