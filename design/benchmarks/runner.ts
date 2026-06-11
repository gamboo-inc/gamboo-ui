/**
 * runner.ts — melta UI ベンチマーク runner（P4: provider 抽象化）
 *
 * AI-Ready 1.0（旧 CLAUDE.md）vs 2.0（DESIGN.md + contracts）で
 * 同一 prompt から UI を生成し、自動スコアリングで比較する。
 * provider を切り替え可能（anthropic / openai / fixture）。
 *
 * 使い方:
 *   tsx design/benchmarks/runner.ts                                          # anthropic / 全 prompt
 *   tsx design/benchmarks/runner.ts --prompt 1                               # 特定 prompt のみ
 *   tsx design/benchmarks/runner.ts --prompt R-1                             # red-team
 *   tsx design/benchmarks/runner.ts --provider anthropic --model claude-sonnet-4-20250514
 *   tsx design/benchmarks/runner.ts --provider fixture --fixture-run 2026-04-11
 *   tsx design/benchmarks/runner.ts --skip-generate                          # 既存 results を score のみ
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import type { ModelProvider, GenerationResult } from "../../src/utils/types.js";
import { prompts as benchmarkPrompts, type BenchmarkPrompt } from "./prompts.js";
import { scoreHTML, type Score } from "./score.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createFixtureProvider } from "./providers/fixture.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const resultsDir = resolve(__dirname, "results");

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  return undefined;
}

const providerId = (getArg("--provider") ?? "anthropic") as
  | "anthropic"
  | "openai"
  | "fixture";
const modelName = getArg("--model") ?? "claude-sonnet-4-20250514";
const promptFilter = getArg("--prompt") ?? null;
const fixtureRunDir = getArg("--fixture-run") ?? null;
const skipGenerate = args.includes("--skip-generate");

// --- Provider 構築 ---
function makeProvider(label: "v1" | "v2"): ModelProvider {
  if (providerId === "fixture") {
    if (!fixtureRunDir) {
      throw new Error(
        "fixture provider には --fixture-run <date> が必須です（例: --fixture-run 2026-04-11）"
      );
    }
    return createFixtureProvider({ runDir: fixtureRunDir, label });
  }
  if (providerId === "openai") {
    return createOpenAIProvider({ model: modelName });
  }
  return createAnthropicProvider({ model: modelName });
}

// --- Context 取得 ---
function getContext1_0(): string {
  try {
    return execSync("git show 1479255:CLAUDE.md", { cwd: root, encoding: "utf-8" });
  } catch {
    console.error("旧 CLAUDE.md の取得に失敗。origin/main から取得を試みます。");
    return execSync("git show origin/main~1:CLAUDE.md", { cwd: root, encoding: "utf-8" });
  }
}

function getContext2_0(): string {
  const designMd = readFileSync(resolve(root, "DESIGN.md"), "utf-8");
  const contractSummary = ["button", "card", "table"]
    .map((id) => {
      const path = resolve(root, `design/contracts/components/${id}.contract.json`);
      if (!existsSync(path)) return "";
      const c = JSON.parse(readFileSync(path, "utf-8"));
      return `### ${c.name} Contract (要約)\nVariants: ${Object.keys(c.variants).join(
        ", "
      )}\nRules: ${c.rules.map((r: { id: string }) => r.id).join(", ")}`;
    })
    .filter(Boolean)
    .join("\n\n");
  return `${designMd}\n\n---\n\n## Component Contracts（参考）\n\n${contractSummary}`;
}

// --- 単一 prompt 実行 ---
interface RunResult {
  prompt: BenchmarkPrompt;
  v1: GenerationResult;
  v2: GenerationResult;
  score1: Score;
  score2: Score;
  html1Path: string;
  html2Path: string;
}

async function runOne(
  prompt: BenchmarkPrompt,
  ctx1: string,
  ctx2: string,
  providerV1: ModelProvider,
  providerV2: ModelProvider,
  runDir: string
): Promise<RunResult> {
  const html1Path = resolve(runDir, `${prompt.id}-v1.html`);
  const html2Path = resolve(runDir, `${prompt.id}-v2.html`);

  let v1: GenerationResult;
  let v2: GenerationResult;

  // skip-generate: anthropic/openai でも既存ファイルから fixture 相当に切替
  const useExisting =
    skipGenerate && existsSync(html1Path) && existsSync(html2Path);

  if (useExisting) {
    console.log(`    既存 results を使用`);
    const start = Date.now();
    v1 = {
      text: readFileSync(html1Path, "utf-8"),
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - start,
      resourcesAccessed: [],
    };
    v2 = {
      text: readFileSync(html2Path, "utf-8"),
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: 0,
      resourcesAccessed: [],
    };
  } else {
    console.log(`    [${providerV1.id}] 1.0 生成中...`);
    console.log(`    [${providerV2.id}] 2.0 生成中...`);
    const [r1, r2] = await Promise.all([
      providerV1.generate(buildSystem(ctx1), prompt.prompt),
      providerV2.generate(buildSystem(ctx2), prompt.prompt),
    ]);
    v1 = r1;
    v2 = r2;
    writeFileSync(html1Path, v1.text, "utf-8");
    writeFileSync(html2Path, v2.text, "utf-8");
    console.log(
      `    1.0: ${(v1.latencyMs / 1000).toFixed(1)}s, tools=${v1.toolCalls?.length ?? 0}, ` +
        `tokens=${v1.usage?.inputTokens ?? 0}/${v1.usage?.outputTokens ?? 0}`
    );
    console.log(
      `    2.0: ${(v2.latencyMs / 1000).toFixed(1)}s, tools=${v2.toolCalls?.length ?? 0}, ` +
        `tokens=${v2.usage?.inputTokens ?? 0}/${v2.usage?.outputTokens ?? 0}`
    );
  }

  const score1 = scoreHTML(v1.text);
  const score2 = scoreHTML(v2.text);

  console.log(
    `    1.0: ${score1.totalScore}/100 (errors: ${score1.ruleViolations}, warns: ${score1.prohibitedPatterns})`
  );
  console.log(
    `    2.0: ${score2.totalScore}/100 (errors: ${score2.ruleViolations}, warns: ${score2.prohibitedPatterns})`
  );

  return { prompt, v1, v2, score1, score2, html1Path, html2Path };
}

function buildSystem(context: string): string {
  return `あなたは melta UI デザインシステムに準拠した UI を生成するエキスパートです。
以下のデザインシステム仕様を必ず遵守してください。
不明な点は提供されたツール（get_token / get_component / check_rule / get_rules / search）で確認できます。

${context}`;
}

// --- Tool 集計（report 用） ---
interface ToolStats {
  totalCalls: number;
  byName: Record<string, number>;
  resources: string[];
}

function aggregateTools(result: GenerationResult): ToolStats {
  const byName: Record<string, number> = {};
  for (const tc of result.toolCalls ?? []) {
    byName[tc.name] = (byName[tc.name] ?? 0) + 1;
  }
  return {
    totalCalls: (result.toolCalls ?? []).length,
    byName,
    resources: result.resourcesAccessed ?? [],
  };
}

// --- メイン ---
async function main(): Promise<void> {
  console.log("\n=== melta UI A/B Benchmark ===\n");
  console.log(`  provider: ${providerId}, model: ${modelName}`);

  const runDir = resolve(resultsDir, new Date().toISOString().slice(0, 10));
  if (!existsSync(runDir)) mkdirSync(runDir, { recursive: true });

  const targetPrompts = promptFilter
    ? benchmarkPrompts.filter((p) => p.id === promptFilter)
    : benchmarkPrompts;

  if (targetPrompts.length === 0) {
    console.error(`Prompt "${promptFilter}" が見つかりません`);
    process.exit(1);
  }

  const ctx1 = getContext1_0();
  const ctx2 = getContext2_0();
  console.log(`  1.0 context: ${(ctx1.length / 1024).toFixed(1)}KB`);
  console.log(`  2.0 context: ${(ctx2.length / 1024).toFixed(1)}KB`);

  const providerV1 = makeProvider("v1");
  const providerV2 = makeProvider("v2");

  const results: RunResult[] = [];
  for (const prompt of targetPrompts) {
    console.log(`\n--- Prompt ${prompt.id}: ${prompt.name} ---`);
    const r = await runOne(prompt, ctx1, ctx2, providerV1, providerV2, runDir);
    results.push(r);
  }

  // --- レポート生成 ---
  console.log("\n=== Results ===\n");

  let report = `# melta UI A/B Benchmark Results\n\n`;
  report += `**日時**: ${new Date().toISOString()}\n`;
  report += `**Provider**: ${providerId}\n`;
  report += `**Model**: ${modelName}\n`;
  report += `**1.0 context**: ${(ctx1.length / 1024).toFixed(1)}KB (旧 CLAUDE.md)\n`;
  report += `**2.0 context**: ${(ctx2.length / 1024).toFixed(1)}KB (DESIGN.md + contracts)\n\n`;

  // サマリーテーブル
  report += `## サマリー\n\n`;
  report += `| Prompt | 1.0 Score | 2.0 Score | Δ | 1.0 Tools | 2.0 Tools | Winner |\n`;
  report += `|--------|-----------|-----------|---|-----------|-----------|--------|\n`;

  let total1 = 0;
  let total2 = 0;

  for (const r of results) {
    const delta = r.score2.totalScore - r.score1.totalScore;
    const winner = delta > 0 ? "2.0" : delta < 0 ? "1.0" : "TIE";
    const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
    const t1 = aggregateTools(r.v1);
    const t2 = aggregateTools(r.v2);
    report += `| ${r.prompt.id}: ${r.prompt.name} | ${r.score1.totalScore} | ${r.score2.totalScore} | ${deltaStr} | ${t1.totalCalls} | ${t2.totalCalls} | **${winner}** |\n`;
    total1 += r.score1.totalScore;
    total2 += r.score2.totalScore;
    console.log(
      `  ${r.prompt.id}: 1.0=${r.score1.totalScore} vs 2.0=${r.score2.totalScore} (${deltaStr}) → ${winner}`
    );
  }

  const avg1 = (total1 / results.length).toFixed(1);
  const avg2 = (total2 / results.length).toFixed(1);
  report += `| **平均** | **${avg1}** | **${avg2}** | **${
    +avg2 - +avg1 > 0 ? "+" : ""
  }${(+avg2 - +avg1).toFixed(1)}** | | | **${+avg2 > +avg1 ? "2.0" : "1.0"}** |\n\n`;

  console.log(`\n  平均: 1.0=${avg1} vs 2.0=${avg2}`);

  // 詳細
  report += `## 詳細\n\n`;
  for (const r of results) {
    report += `### ${r.prompt.id}: ${r.prompt.name}${r.prompt.isRedTeam ? " (Red-Team)" : ""}\n\n`;
    report += `| 指標 | 1.0 | 2.0 |\n|------|-----|-----|\n`;
    report += `| Total Score | ${r.score1.totalScore} | ${r.score2.totalScore} |\n`;
    report += `| Errors (lint core) | ${r.score1.ruleViolations} | ${r.score2.ruleViolations} |\n`;
    report += `| Warns (lint core) | ${r.score1.prohibitedPatterns} | ${r.score2.prohibitedPatterns} |\n`;
    report += `| Latency (s) | ${(r.v1.latencyMs / 1000).toFixed(1)} | ${(r.v2.latencyMs / 1000).toFixed(1)} |\n`;
    report += `| Input Tokens | ${r.v1.usage?.inputTokens ?? 0} | ${r.v2.usage?.inputTokens ?? 0} |\n`;
    report += `| Output Tokens | ${r.v1.usage?.outputTokens ?? 0} | ${r.v2.usage?.outputTokens ?? 0} |\n`;
    report += `| Tool Calls | ${(r.v1.toolCalls ?? []).length} | ${(r.v2.toolCalls ?? []).length} |\n\n`;

    // tool 内訳（2.0 が tool を活用しているかが研究目的の核）
    const t1 = aggregateTools(r.v1);
    const t2 = aggregateTools(r.v2);
    if (t1.totalCalls > 0 || t2.totalCalls > 0) {
      report += `**Tool 呼び出し内訳**:\n\n`;
      const allNames = new Set([...Object.keys(t1.byName), ...Object.keys(t2.byName)]);
      report += `| Tool | 1.0 | 2.0 |\n|------|-----|-----|\n`;
      for (const name of allNames) {
        report += `| ${name} | ${t1.byName[name] ?? 0} | ${t2.byName[name] ?? 0} |\n`;
      }
      report += `\n`;
    }

    // resource アクセス
    if (t1.resources.length > 0 || t2.resources.length > 0) {
      report += `**参照リソース**:\n`;
      report += `- 1.0: ${t1.resources.length > 0 ? t1.resources.join(", ") : "(なし)"}\n`;
      report += `- 2.0: ${t2.resources.length > 0 ? t2.resources.join(", ") : "(なし)"}\n\n`;
    }

    if (r.score1.violationDetails.length > 0) {
      report += `**1.0 Errors**:\n${r.score1.violationDetails.map((v) => `- ${v}`).join("\n")}\n\n`;
    }
    if (r.score1.patternDetails.length > 0) {
      report += `**1.0 Warns**:\n${r.score1.patternDetails.map((v) => `- ${v}`).join("\n")}\n\n`;
    }
    if (r.score2.violationDetails.length > 0) {
      report += `**2.0 Errors**:\n${r.score2.violationDetails.map((v) => `- ${v}`).join("\n")}\n\n`;
    }
    if (r.score2.patternDetails.length > 0) {
      report += `**2.0 Warns**:\n${r.score2.patternDetails.map((v) => `- ${v}`).join("\n")}\n\n`;
    }

    report += `**生成ファイル**: \`${r.html1Path.replace(root + "/", "")}\` / \`${r.html2Path.replace(root + "/", "")}\`\n\n`;
  }

  const reportPath = resolve(runDir, "report.md");
  writeFileSync(reportPath, report, "utf-8");
  console.log(`\n  レポート: ${reportPath.replace(root + "/", "")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
