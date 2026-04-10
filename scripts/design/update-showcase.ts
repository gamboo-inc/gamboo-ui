/**
 * update-showcase.ts — contracts / tokens / rules から showcase の数値を自動更新
 *
 * docs/index.html 内のハードコード数値を contracts の実データに合わせる。
 * 使い方: tsx scripts/design/update-showcase.ts
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

// --- データ収集 ---
const contracts = readdirSync(resolve(root, "design/contracts/components"))
  .filter(f => f.endsWith(".contract.json"));
const componentCount = contracts.length;

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

// ルール数
replace(/(\d+)ルールの禁止パターン/g, `${ruleCount}ルールの禁止パターン`, `ルール数 → ${ruleCount}`);
replace(/全(\d+)ルール:/g, `全${ruleCount}ルール:`, `全ルール数 → ${ruleCount}`);

writeFileSync(docsPath, html, "utf-8");
console.log(`\n  ${changes > 0 ? `✅ ${changes} 箇所更新` : "変更なし"}`);
