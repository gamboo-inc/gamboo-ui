/**
 * runner.ts — melta UI ベンチマーク runner（P1-4 Slice 2: 3 条件 × N トライアル）
 *
 * 「DS を読ませると DS 準拠スコアが何点上がるか」を Atlassian「context engine
 * +52%」式の限界寄与で測る。3 条件で同一 prompt から UI を生成し、共通 lint core
 * （score.ts）で採点して mean±range と条件間 lift を出す。
 *
 *   cold     : DS コンテキスト無し（素の LLM のベースライン。tools 無し）
 *   designmd : DESIGN.md のみ（静的コンテキスト。tools 無し）
 *   full     : DESIGN.md + contracts 要約 + MCP tools（自己検証込み）
 *
 * 使い方:
 *   tsx design/benchmarks/runner.ts                          # anthropic / 全 prompt / trials=3
 *   tsx design/benchmarks/runner.ts --trials 5
 *   tsx design/benchmarks/runner.ts --prompt 1 --trials 3
 *   tsx design/benchmarks/runner.ts --conditions cold,full   # 条件を絞る
 *   tsx design/benchmarks/runner.ts --provider mock           # API 不要のパイプライン検証
 *   tsx design/benchmarks/runner.ts --no-history              # history.json に追記しない
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ModelProvider, GenerationResult } from "../../src/utils/types.js";
import { prompts as benchmarkPrompts, type BenchmarkPrompt } from "./prompts.js";
import { scoreHTML, type Score } from "./score.js";
import { summarize, computeLift, formatSummary, formatLift, type Summary } from "./stats.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createMockProvider } from "./providers/mock.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const resultsDir = resolve(__dirname, "results");
const historyPath = resolve(__dirname, "history.json");

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
  | "mock";
const modelName = getArg("--model") ?? "claude-sonnet-4-20250514";
const promptFilter = getArg("--prompt") ?? null;
const trials = Math.max(1, parseInt(getArg("--trials") ?? "3", 10));
const conditionFilter = (getArg("--conditions") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const temperature = getArg("--temperature") ? parseFloat(getArg("--temperature")!) : undefined;
const writeHistory = !args.includes("--no-history");

// --- 条件定義 ---
interface Condition {
  id: "cold" | "designmd" | "full";
  label: string;
  context: string;
  useTools: boolean;
}

function getDesignMd(): string {
  return readFileSync(resolve(root, "DESIGN.md"), "utf-8");
}

function getContractSummary(): string {
  const summary = ["button", "card", "table"]
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
  return summary;
}

function buildConditions(): Condition[] {
  const designMd = getDesignMd();
  const all: Condition[] = [
    { id: "cold", label: "No DS context", context: "", useTools: false },
    { id: "designmd", label: "DESIGN.md only", context: designMd, useTools: false },
    {
      id: "full",
      label: "DESIGN.md + contracts + MCP",
      context: `${designMd}\n\n---\n\n## Component Contracts（参考）\n\n${getContractSummary()}`,
      useTools: true,
    },
  ];
  if (conditionFilter.length === 0) return all;
  return all.filter((c) => conditionFilter.includes(c.id));
}

/** 条件に応じた system プロンプト。cold は melta を一切示さない真のベースライン */
function buildSystem(condition: Condition): string {
  if (condition.id === "cold") {
    return "あなたは UI を生成するエキスパートです。指示に従い、単一の HTML ファイル（Tailwind CDN 使用）として完結する UI を生成してください。";
  }
  const toolNote = condition.useTools
    ? "不明な点は提供されたツール（get_token / get_component / check_rule / check_html / get_rules / search）で確認し、生成後は check_html で自己検証してから提示してください。\n\n"
    : "";
  return `あなたは melta UI デザインシステムに準拠した UI を生成するエキスパートです。
以下のデザインシステム仕様を必ず遵守してください。
${toolNote}${condition.context}`;
}

// --- Provider 構築 ---
function makeProvider(): ModelProvider {
  if (providerId === "mock") return createMockProvider();
  if (providerId === "openai") return createOpenAIProvider({ model: modelName });
  return createAnthropicProvider({ model: modelName });
}

// --- 集計用の型 ---
interface Trial {
  score: Score;
  toolCalls: number;
  resources: string[];
  htmlPath: string;
}
interface Cell {
  promptId: string;
  conditionId: Condition["id"];
  trials: Trial[];
  summary: Summary;
}

// --- 単一セル（prompt × condition）を N トライアル実行 ---
async function runCell(
  prompt: BenchmarkPrompt,
  condition: Condition,
  provider: ModelProvider,
  runDir: string
): Promise<Cell> {
  const scores: number[] = [];
  const trialResults: Trial[] = [];

  for (let t = 0; t < trials; t++) {
    const suffix = trials > 1 ? `-t${t}` : "";
    const htmlPath = resolve(runDir, `${prompt.id}-${condition.id}${suffix}.html`);
    let result: GenerationResult;
    try {
      result = await provider.generate(buildSystem(condition), prompt.prompt, {
        useTools: condition.useTools,
        temperature,
      });
    } catch (err) {
      console.error(`    ✗ ${prompt.id}/${condition.id} t${t} 失敗: ${(err as Error).message}`);
      continue;
    }
    writeFileSync(htmlPath, result.text, "utf-8");
    const score = scoreHTML(result.text);
    scores.push(score.totalScore);
    trialResults.push({
      score,
      toolCalls: (result.toolCalls ?? []).length,
      resources: result.resourcesAccessed ?? [],
      htmlPath,
    });
  }

  return {
    promptId: prompt.id,
    conditionId: condition.id,
    trials: trialResults,
    summary: summarize(scores),
  };
}

// --- レポート生成 ---
function buildReport(
  cells: Cell[],
  conditions: Condition[],
  targetPrompts: BenchmarkPrompt[],
  isoDate: string
): { report: string; byCondition: Record<string, Summary> } {
  // 条件ごとに全 prompt・全 trial のスコアを集約
  const byCondition: Record<string, Summary> = {};
  for (const cond of conditions) {
    const all = cells
      .filter((c) => c.conditionId === cond.id)
      .flatMap((c) => c.trials.map((t) => t.score.totalScore));
    byCondition[cond.id] = summarize(all);
  }

  let report = `# melta UI Benchmark — 条件別 DS 準拠スコア\n\n`;
  report += `**日時**: ${isoDate}\n`;
  report += `**Provider**: ${providerId}${providerId === "anthropic" ? ` (${modelName})` : ""}\n`;
  report += `**Trials/cell**: ${trials}\n`;
  report += `**Prompts**: ${targetPrompts.map((p) => p.id).join(", ")}\n`;
  report += `**採点**: 共通 lint core（error -10 / warn -3、50 ベース + 準拠シグナル）\n\n`;

  // --- 条件別サマリ + cold 基準の lift ---
  const baseMean = byCondition[conditions[0].id]?.mean ?? 0;
  report += `## 条件別スコア（全 prompt × ${trials} trials の集約）\n\n`;
  report += `| 条件 | スコア (mean, range, σ, n) | ${conditions[0].id} 比 |\n`;
  report += `|------|---------------------------|------|\n`;
  for (const cond of conditions) {
    const s = byCondition[cond.id];
    const lift = computeLift(baseMean, s.mean);
    const liftStr = cond.id === conditions[0].id ? "—（基準）" : formatLift(lift);
    report += `| **${cond.id}** (${cond.label}) | ${formatSummary(s)} | ${liftStr} |\n`;
  }
  report += `\n`;

  // --- 隣接条件間の限界寄与 ---
  if (conditions.length >= 2) {
    report += `### 限界寄与（各層を足したときの上昇）\n\n`;
    for (let i = 1; i < conditions.length; i++) {
      const from = conditions[i - 1];
      const to = conditions[i];
      const lift = computeLift(byCondition[from.id].mean, byCondition[to.id].mean);
      report += `- **${from.id} → ${to.id}**: ${formatLift(lift)}\n`;
    }
    report += `\n`;
  }

  // --- prompt 別内訳 ---
  report += `## Prompt 別内訳\n\n`;
  report += `| Prompt | ${conditions.map((c) => c.id).join(" | ")} |\n`;
  report += `|--------|${conditions.map(() => "----").join("|")}|\n`;
  for (const p of targetPrompts) {
    const row = conditions.map((cond) => {
      const cell = cells.find((c) => c.promptId === p.id && c.conditionId === cond.id);
      return cell ? formatSummary(cell.summary) : "—";
    });
    report += `| ${p.id}: ${p.name}${p.isRedTeam ? " 🔴" : ""} | ${row.join(" | ")} |\n`;
  }
  report += `\n`;

  // --- full 条件の tool 活用（研究目的の核） ---
  const fullCells = cells.filter((c) => c.conditionId === "full");
  if (fullCells.length > 0) {
    const totalToolCalls = fullCells.flatMap((c) => c.trials).reduce((a, t) => a + t.toolCalls, 0);
    const trialCount = fullCells.flatMap((c) => c.trials).length;
    report += `## full 条件の MCP tool 活用\n\n`;
    report += `- 平均 tool 呼び出し/生成: ${trialCount > 0 ? (totalToolCalls / trialCount).toFixed(1) : "0"}\n`;
    const resources = new Set(fullCells.flatMap((c) => c.trials).flatMap((t) => t.resources));
    report += `- 参照リソース: ${resources.size > 0 ? [...resources].join(", ") : "(なし)"}\n\n`;
  }

  return { report, byCondition };
}

// --- history.json 追記 ---
interface HistoryRecord {
  date: string;
  provider: string;
  model: string | null;
  trials: number;
  prompts: string[];
  byCondition: Record<string, { mean: number; min: number; max: number; n: number }>;
  liftVsCold: Record<string, number>;
}

function appendHistory(record: HistoryRecord): void {
  let history: HistoryRecord[] = [];
  if (existsSync(historyPath)) {
    try {
      history = JSON.parse(readFileSync(historyPath, "utf-8"));
    } catch {
      history = [];
    }
  }
  history.push(record);
  writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n", "utf-8");
}

// --- メイン ---
async function main(): Promise<void> {
  console.log("\n=== melta UI Benchmark（条件別 DS 準拠スコア）===\n");
  console.log(`  provider: ${providerId}, trials/cell: ${trials}`);

  const isoDate = new Date().toISOString();
  const runDir = resolve(resultsDir, isoDate.slice(0, 10));
  if (!existsSync(runDir)) mkdirSync(runDir, { recursive: true });

  const targetPrompts = promptFilter
    ? benchmarkPrompts.filter((p) => p.id === promptFilter)
    : benchmarkPrompts;
  if (targetPrompts.length === 0) {
    console.error(`Prompt "${promptFilter}" が見つかりません`);
    process.exit(1);
  }

  const conditions = buildConditions();
  if (conditions.length === 0) {
    console.error(`条件 "${conditionFilter.join(",")}" が見つかりません`);
    process.exit(1);
  }
  for (const c of conditions) {
    console.log(`  条件 ${c.id}: ${(c.context.length / 1024).toFixed(1)}KB, tools=${c.useTools}`);
  }

  const provider = makeProvider();
  const cells: Cell[] = [];

  for (const prompt of targetPrompts) {
    console.log(`\n--- Prompt ${prompt.id}: ${prompt.name} ---`);
    for (const cond of conditions) {
      process.stdout.write(`  [${cond.id}] ${trials} trials... `);
      const cell = await runCell(prompt, cond, provider, runDir);
      console.log(formatSummary(cell.summary));
      cells.push(cell);
    }
  }

  const { report, byCondition } = buildReport(cells, conditions, targetPrompts, isoDate);
  const reportPath = resolve(runDir, "report.md");
  writeFileSync(reportPath, report, "utf-8");

  // コンソール要約
  console.log("\n=== 条件別スコア ===\n");
  const baseMean = byCondition[conditions[0].id]?.mean ?? 0;
  for (const cond of conditions) {
    const s = byCondition[cond.id];
    const lift = cond.id === conditions[0].id ? "（基準）" : formatLift(computeLift(baseMean, s.mean));
    console.log(`  ${cond.id.padEnd(9)} ${formatSummary(s)}  ${lift}`);
  }

  if (writeHistory && providerId !== "mock") {
    const liftVsCold: Record<string, number> = {};
    for (const cond of conditions) {
      liftVsCold[cond.id] = +(byCondition[cond.id].mean - baseMean).toFixed(1);
    }
    appendHistory({
      date: isoDate,
      provider: providerId,
      model: providerId === "anthropic" ? modelName : null,
      trials,
      prompts: targetPrompts.map((p) => p.id),
      byCondition: Object.fromEntries(
        conditions.map((c) => [
          c.id,
          {
            mean: +byCondition[c.id].mean.toFixed(1),
            min: byCondition[c.id].min,
            max: byCondition[c.id].max,
            n: byCondition[c.id].n,
          },
        ])
      ),
      liftVsCold,
    });
    console.log(`\n  history: ${historyPath.replace(root + "/", "")} に追記`);
  }

  console.log(`  レポート: ${reportPath.replace(root + "/", "")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
