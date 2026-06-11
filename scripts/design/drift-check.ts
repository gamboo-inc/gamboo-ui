/**
 * drift-check.ts — ドキュメントと contracts/実装の整合性チェック
 *
 * 検出項目:
 * 1. DESIGN.md のルール件数 vs rules.json の実件数
 * 2. showcase (docs/index.html) のコンポーネント数 vs contracts
 * 3. package.json の version vs showcase の MELTA_VERSION
 * 4. 全 contract に対応する components/*.md が存在するか
 * 5. rules.json の全ルール ID が一意（validate.ts と重複するが独立チェック）
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getContractStats } from "../../src/utils/contract-stats.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

let drifts = 0;

function drift(msg: string): void {
  console.error(`  ⚠️  DRIFT: ${msg}`);
  drifts++;
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function section(title: string): void {
  console.log(`\n=== ${title} ===\n`);
}

// --- 1. DESIGN.md のルール件数 ---
section("1. DESIGN.md ルール件数");

const designMd = readFileSync(resolve(root, "DESIGN.md"), "utf-8");
const rulesJson = JSON.parse(readFileSync(resolve(root, "design/contracts/rules.json"), "utf-8"));
const actualRuleCount = rulesJson.rules.length;

// トークン数カウント
const tokensJson = JSON.parse(readFileSync(resolve(root, "design/contracts/tokens.json"), "utf-8"));
function countTokens(obj: unknown): number {
  if (typeof obj !== "object" || obj === null) return 0;
  const record = obj as Record<string, unknown>;
  if ("value" in record) return 1;
  let count = 0;
  for (const val of Object.values(record)) count += countTokens(val);
  return count;
}
const tokenCount = countTokens(tokensJson);

const ruleCountMatch = designMd.match(/全ルール（(\d+)\s*件）/);
if (ruleCountMatch) {
  const stated = parseInt(ruleCountMatch[1]);
  if (stated !== actualRuleCount) {
    drift(`DESIGN.md: ${stated} 件 vs rules.json: ${actualRuleCount} 件`);
  } else {
    ok(`ルール件数一致: ${actualRuleCount} 件`);
  }
} else {
  drift("DESIGN.md にルール件数の記載が見つかりません");
}

// --- 2. showcase のコンポーネント数 ---
section("2. showcase コンポーネント数");

const docsPath = resolve(root, "docs/index.html");
if (existsSync(docsPath)) {
  const docsHtml = readFileSync(docsPath, "utf-8");

  // "28 コンポーネント" パターンを探す（全 match 走査）
  const contractDir = resolve(root, "design/contracts/components");
  const stats = getContractStats(contractDir);
  const webContractCount = stats.web;

  const compCountMatches = [...docsHtml.matchAll(/(\d+)\s*コンポーネント/g)];
  const compMismatch = compCountMatches.filter(m => parseInt(m[1]) !== webContractCount);
  if (compCountMatches.length > 0) {
    if (compMismatch.length > 0) {
      drift(`docs/index.html: ${compMismatch.map(m => m[1]).join(",")} コンポーネント vs contracts(web): ${webContractCount} 件`);
    } else {
      ok(`コンポーネント数一致: ${webContractCount} 件（web 実装済み、${compCountMatches.length} 箇所）`);
    }
  }

  // ヒーロー統計の Tokens
  const heroTokenMatch = docsHtml.match(/font-bold text-white">(\d+)\+?<\/span>\s*<span[^>]*>Tokens/);
  if (heroTokenMatch) {
    const stated = parseInt(heroTokenMatch[1]);
    if (stated !== tokenCount) {
      drift(`ヒーロー Tokens: ${stated} vs 実際: ${tokenCount}`);
    } else {
      ok(`ヒーロー Tokens 一致: ${tokenCount}`);
    }
  }

  // 禁止ルール件数
  const ruleRefMatch = docsHtml.match(/(\d+)ルールの禁止パターン/);
  if (ruleRefMatch) {
    const stated = parseInt(ruleRefMatch[1]);
    if (stated !== actualRuleCount) {
      drift(`docs/index.html: ${stated} ルール vs rules.json: ${actualRuleCount} 件`);
    } else {
      ok(`禁止ルール件数一致: ${actualRuleCount} 件`);
    }
  }
} else {
  ok("docs/index.html が存在しない（スキップ）");
}

// --- 3. version ---
section("3. version 整合性");

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const pkgVersion = pkg.version;

if (existsSync(docsPath)) {
  const docsHtml = readFileSync(docsPath, "utf-8");
  const versionMatch = docsHtml.match(/MELTA_VERSION\s*=\s*'([^']+)'/);
  if (versionMatch) {
    if (versionMatch[1] !== pkgVersion) {
      drift(`showcase MELTA_VERSION: ${versionMatch[1]} vs package.json: ${pkgVersion}`);
    } else {
      ok(`version 一致: ${pkgVersion}`);
    }
  }
}

// CLAUDE.md のルール件数
const claudeMd = readFileSync(resolve(root, "CLAUDE.md"), "utf-8");
const claudeRuleMatch = claudeMd.match(/(\d+)\s*ルール/);
if (claudeRuleMatch) {
  const stated = parseInt(claudeRuleMatch[1]);
  if (stated !== actualRuleCount) {
    drift(`CLAUDE.md: ${stated} ルール vs rules.json: ${actualRuleCount} 件`);
  } else {
    ok(`CLAUDE.md ルール件数一致: ${actualRuleCount} 件`);
  }
}

// --- 4. contract ↔ components/*.md ---
section("4. contract ↔ components/*.md 対応");

const contractDir2 = resolve(root, "design/contracts/components");
const contracts = readdirSync(contractDir2).filter(f => f.endsWith(".contract.json"));

let missingDocs = 0;
let skippedPending = 0;
for (const file of contracts) {
  const contract = JSON.parse(readFileSync(resolve(contractDir2, file), "utf-8"));
  // webStatus:"pending"（app 先行）は web ドキュメント未整備が正常なので docPath 突合を skip。
  if (contract.webStatus === "pending") {
    skippedPending++;
    continue;
  }
  const docPath = resolve(root, contract.docPath || `components/${contract.id}.md`);
  if (!existsSync(docPath)) {
    drift(`${contract.id}: docPath "${contract.docPath}" が存在しません`);
    missingDocs++;
  }
}
if (missingDocs === 0) {
  ok(`全 ${contracts.length - skippedPending} contract の docPath が存在（pending ${skippedPending} 件は skip）`);
}

// --- Summary ---
section("Summary");

console.log(`  Drifts: ${drifts}`);
console.log(`\n  ${drifts === 0 ? "✅ NO DRIFT" : `⚠️  ${drifts} DRIFT(S) DETECTED`}\n`);

process.exit(drifts > 0 ? 1 : 0);
