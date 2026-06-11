/**
 * update-showcase.ts — contracts / tokens / rules から showcase の数値を自動更新
 *
 * docs/index.html 内のハードコード数値を contracts の実データに合わせる。
 * 使い方: tsx scripts/design/update-showcase.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getContractStats } from "../../src/utils/contract-stats.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

// --- データ収集 ---
// showcase の「コンポーネント数」は web 実装済みのみ（pending は app 先行で掲載対象外）
const stats = getContractStats(resolve(root, "design/contracts/components"));
const componentCount = stats.web;

const rules = JSON.parse(readFileSync(resolve(root, "design/contracts/rules.json"), "utf-8"));
const ruleCount = rules.rules.length;

const tokens = JSON.parse(readFileSync(resolve(root, "design/contracts/tokens.json"), "utf-8"));
// トークン数をカウント（末端の value を持つノードを数える）
function countTokens(obj: unknown, depth = 0): number {
  if (typeof obj !== "object" || obj === null) return 0;
  const record = obj as Record<string, unknown>;
  if ("value" in record) return 1;
  let count = 0;
  for (const val of Object.values(record)) {
    count += countTokens(val, depth + 1);
  }
  return count;
}
const tokenCount = countTokens(tokens);

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const version = pkg.version;

console.log(`  Components: ${componentCount}`);
console.log(`  Rules: ${ruleCount}`);
console.log(`  Tokens: ${tokenCount}`);
console.log(`  Version: ${version}`);

// --- showcase 更新 ---
const docsPath = resolve(root, "docs/index.html");
let html = readFileSync(docsPath, "utf-8");
let changes = 0;

function replace(pattern: RegExp, replacement: string, label: string): void {
  const before = html;
  html = html.replace(pattern, replacement);
  if (html !== before) {
    changes++;
    console.log(`  ✓ ${label}`);
  }
}

// version
replace(/MELTA_VERSION\s*=\s*'[^']+'/g, `MELTA_VERSION = '${version}'`, `MELTA_VERSION → ${version}`);

// meta description のコンポーネント数
replace(/(\d+)\s*コンポーネント/g, `${componentCount} コンポーネント`, `コンポーネント数 → ${componentCount}`);

// meta description のトークン数
replace(/(\d+)\s*デザイントークン/g, `${tokenCount} デザイントークン`, `トークン数 → ${tokenCount}`);
replace(/(\d+)\s*トークン\s*\+/g, `${tokenCount} トークン +`, `トークン数（OG） → ${tokenCount}`);

// ルール数（"99ルールの禁止パターン" / "全99ルール:" / "+ 99 ルール" などすべての N ルール表記）
replace(/(\d+)(\s*)ルール/g, `${ruleCount}$2ルール`, `ルール数 → ${ruleCount}`);

// contract 数（"33 contract" は全 contract 数 = app 先行 pending 含む）
replace(/(\d+)(\s+)contract/g, `${stats.all}$2contract`, `contract 数 → ${stats.all}`);

// ヒーロー統計（font-bold text-white の数値）
// Tokens: "120+" → 実数
replace(
  /(<span class="text-2xl md:text-3xl font-bold text-white">)\d+\+?(<\/span>\s*<span class="text-sm ml-1 text-slate-400">Tokens<\/span>)/g,
  `$1${tokenCount}$2`,
  `ヒーロー Tokens → ${tokenCount}`
);

// Components: ヒーロー統計
replace(
  /(<span class="text-2xl md:text-3xl font-bold text-white">)\d+(<\/span>\s*<span class="text-sm ml-1 text-slate-400">Components<\/span>)/g,
  `$1${componentCount}$2`,
  `ヒーロー Components → ${componentCount}`
);

writeFileSync(docsPath, html, "utf-8");
console.log(`\n  ${changes > 0 ? `✅ ${changes} 箇所更新` : "変更なし"}`);
