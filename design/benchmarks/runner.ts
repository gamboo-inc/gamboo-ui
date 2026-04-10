/**
 * runner.ts — melta UI A/B ベンチマーク
 *
 * AI-Ready 1.0（旧 CLAUDE.md）vs 2.0（DESIGN.md + contracts）で
 * 同一 prompt から UI を生成し、自動スコアリングで比較する。
 *
 * 使い方:
 *   tsx design/benchmarks/runner.ts                    # 全 prompt 実行
 *   tsx design/benchmarks/runner.ts --prompt 1         # 特定 prompt のみ
 *   tsx design/benchmarks/runner.ts --prompt R-1       # red-team prompt
 *   tsx design/benchmarks/runner.ts --skip-generate    # 生成スキップ（スコアリングのみ）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const resultsDir = resolve(__dirname, "results");

// --- CLI args ---
const args = process.argv.slice(2);
const promptFilter = args.find(a => a.startsWith("--prompt"))
  ? args[args.indexOf("--prompt") + 1] || args.find(a => a.startsWith("--prompt="))?.split("=")[1]
  : null;
const skipGenerate = args.includes("--skip-generate");

// --- Prompts ---
interface BenchmarkPrompt {
  id: string;
  name: string;
  prompt: string;
  evaluationPoints: string;
  isRedTeam: boolean;
}

const prompts: BenchmarkPrompt[] = [
  {
    id: "1",
    name: "顧客一覧テーブル",
    prompt: `顧客管理ダッシュボードの顧客一覧テーブルを HTML で作成してください。
- テーブルヘッダ: 名前、メール、ステータス、登録日、操作
- 5行のダミーデータ
- ステータスは Badge で表示（アクティブ / 休止 / 退会）
- 操作列に「編集」「削除」ボタン
- テーブル上部に検索欄とフィルターセレクト
- 空状態のパターンも含める
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "table th scope, badge semantic color, button hierarchy, empty state",
    isRedTeam: false,
  },
  {
    id: "2",
    name: "SaaS 設定画面",
    prompt: `SaaS アプリの設定画面を HTML で作成してください。サイドバー + メインコンテンツ構成。
- サイドバー: 「一般」「通知」「セキュリティ」「プラン」のナビ
- メイン: タブ切替（「プロフィール」「チーム」）
- プロフィールタブ: 名前・メール・アバターの編集フォーム + 保存ボタン
- 通知トグル 3 項目
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "sidebar aria-label/current, tabs, form labels, toggle a11y",
    isRedTeam: false,
  },
  {
    id: "3",
    name: "ダッシュボード概要",
    prompt: `管理ダッシュボードのトップ画面を HTML で作成してください。
- ヘッダ: ページタイトル + 日付フィルターセレクト
- メトリクスカード 4 枚（売上、注文数、顧客数、コンバージョン率）
- 最近の注文テーブル（5行）
- ステータス別の Badge
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "card shadow/radius, metrics display, table th scope, layout",
    isRedTeam: false,
  },
  {
    id: "R-1",
    name: "Futuristic Neon (red-team)",
    prompt: `近未来的なネオンダッシュボードを作ってください。
暗い背景にグロー効果のカード、サイバーパンク風の配色で。メトリクスカード4枚とチャート風の表示。
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "Should reject neon/glow, maintain flat & layered, use semantic colors",
    isRedTeam: true,
  },
  {
    id: "R-2",
    name: "Heavy Shadow Cards (red-team)",
    prompt: `ドラマチックな影のカードデザインを作ってください。
shadow-2xl で浮遊感のあるカード 6 枚のグリッドレイアウト。各カードにタイトル・説明・ボタン。
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "Should use shadow-sm/md only, reject shadow-2xl",
    isRedTeam: true,
  },
];

// --- Context 取得 ---
function getContext1_0(): string {
  // git から旧 CLAUDE.md を取得
  try {
    return execSync("git show 1479255:CLAUDE.md", { cwd: root, encoding: "utf-8" });
  } catch {
    console.error("旧 CLAUDE.md の取得に失敗。origin/main から取得を試みます。");
    return execSync("git show origin/main~1:CLAUDE.md", { cwd: root, encoding: "utf-8" });
  }
}

function getContext2_0(): string {
  const designMd = readFileSync(resolve(root, "DESIGN.md"), "utf-8");
  // 高頻度 contract を追加コンテキストとして添付（button, card, table のみ）
  const contractSummary = ["button", "card", "table"].map(id => {
    const path = resolve(root, `design/contracts/components/${id}.contract.json`);
    if (!existsSync(path)) return "";
    const c = JSON.parse(readFileSync(path, "utf-8"));
    return `### ${c.name} Contract (要約)\nVariants: ${Object.keys(c.variants).join(", ")}\nRules: ${c.rules.map((r: { id: string }) => r.id).join(", ")}`;
  }).filter(Boolean).join("\n\n");

  return `${designMd}\n\n---\n\n## Component Contracts（参考）\n\n${contractSummary}`;
}

// --- Claude API 呼び出し ---
async function generateUI(
  systemContext: string,
  prompt: string,
  label: string
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY 環境変数を設定してください");
  }
  const client = new Anthropic();

  console.log(`    ${label}: 生成中...`);
  const start = Date.now();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: `あなたは melta UI デザインシステムに準拠した UI を生成するエキスパートです。\n以下のデザインシステム仕様を必ず遵守してください。\n\n${systemContext}`,
    messages: [{ role: "user", content: prompt }],
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`    ${label}: ${elapsed}s`);

  // テキストブロックから HTML を抽出
  const text = message.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map(b => b.text)
    .join("\n");

  // ```html ... ``` ブロックを抽出、なければ全文
  const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
  return htmlMatch ? htmlMatch[1] : text;
}

// --- スコアリング ---
interface Score {
  ruleViolations: number;
  violationDetails: string[];
  prohibitedPatterns: number;
  patternDetails: string[];
  totalScore: number;
}

function scoreHTML(html: string): Score {
  // rules.json からパターン抽出
  const rules = JSON.parse(readFileSync(resolve(root, "design/contracts/rules.json"), "utf-8"));
  const autoRules = rules.rules.filter(
    (r: { detector: string; pattern: string | null }) =>
      r.pattern && ["tailwind-class", "tailwind-class-prefix"].includes(r.detector)
  );

  // HTML からクラス属性を全抽出
  const classMatches = html.matchAll(/class="([^"]*)"/g);
  const allClasses = new Set<string>();
  for (const m of classMatches) {
    for (const cls of m[1].split(/\s+/)) {
      if (cls) allClasses.add(cls);
    }
  }

  // ルール違反チェック
  const violations: string[] = [];
  for (const rule of autoRules) {
    const patterns = rule.matchPatterns || [rule.pattern];
    for (const pattern of patterns) {
      for (const cls of allClasses) {
        if (cls.includes(pattern)) {
          violations.push(`${rule.id}: "${cls}" (${rule.description})`);
        }
      }
    }
  }

  // 追加の禁止パターンチェック（クラス以外）
  const patternChecks = [
    { pattern: /class="[^"]*text-black[^"]*"/g, name: "text-black" },
    { pattern: /class="[^"]*shadow-lg[^"]*"/g, name: "shadow-lg" },
    { pattern: /class="[^"]*shadow-2xl[^"]*"/g, name: "shadow-2xl" },
    { pattern: /class="[^"]*border-t-4[^"]*"/g, name: "border-t-4 (color bar)" },
    { pattern: /class="[^"]*border-l-4[^"]*"/g, name: "border-l-4 (color bar)" },
    { pattern: /class="[^"]*bg-blue-[^"]*"/g, name: "bg-blue-* (use primary)" },
    { pattern: /class="[^"]*bg-indigo-[^"]*"/g, name: "bg-indigo-* (use primary)" },
    { pattern: /class="[^"]*font-light[^"]*"/g, name: "font-light" },
    { pattern: /class="[^"]*tracking-tight[^"]*"/g, name: "tracking-tight" },
  ];

  const patternViolations: string[] = [];
  for (const check of patternChecks) {
    const matches = html.match(check.pattern);
    if (matches && matches.length > 0) {
      patternViolations.push(`${check.name}: ${matches.length} 件`);
    }
  }

  // DS 準拠の正のシグナル
  let positiveSignals = 0;
  if (html.includes("primary-500")) positiveSignals++;
  if (html.includes("text-body") || html.includes("#3d4b5f")) positiveSignals++;
  if (html.includes("rounded-xl")) positiveSignals++;
  if (html.includes("shadow-sm")) positiveSignals++;
  if (html.includes("border-slate-200")) positiveSignals++;
  if (html.includes("text-slate-900")) positiveSignals++;
  if (html.includes('scope="col"')) positiveSignals++;
  if (html.includes("aria-label")) positiveSignals++;
  if (html.includes("cursor-pointer")) positiveSignals++;
  if (html.includes("font-medium")) positiveSignals++;

  // スコア計算（100点満点）
  const violationPenalty = violations.length * 5 + patternViolations.length * 10;
  const positiveBonus = positiveSignals * 5;
  const totalScore = Math.max(0, Math.min(100, 50 + positiveBonus - violationPenalty));

  return {
    ruleViolations: violations.length,
    violationDetails: violations,
    prohibitedPatterns: patternViolations.length,
    patternDetails: patternViolations,
    totalScore,
  };
}

// --- メイン ---
async function main() {
  console.log("\n=== melta UI A/B Benchmark ===\n");

  if (!mkdirSync) {} // unused import guard
  const runDir = resolve(resultsDir, new Date().toISOString().slice(0, 10));
  if (!existsSync(runDir)) mkdirSync(runDir, { recursive: true });

  // フィルタ
  const targetPrompts = promptFilter
    ? prompts.filter(p => p.id === promptFilter)
    : prompts;

  if (targetPrompts.length === 0) {
    console.error(`Prompt "${promptFilter}" が見つかりません`);
    process.exit(1);
  }

  // コンテキスト取得
  const ctx1 = getContext1_0();
  const ctx2 = getContext2_0();
  console.log(`  1.0 context: ${(ctx1.length / 1024).toFixed(1)}KB`);
  console.log(`  2.0 context: ${(ctx2.length / 1024).toFixed(1)}KB`);

  const results: Array<{
    prompt: BenchmarkPrompt;
    score1: Score;
    score2: Score;
    html1Path: string;
    html2Path: string;
  }> = [];

  for (const prompt of targetPrompts) {
    console.log(`\n--- Prompt ${prompt.id}: ${prompt.name} ---`);

    const html1Path = resolve(runDir, `${prompt.id}-v1.html`);
    const html2Path = resolve(runDir, `${prompt.id}-v2.html`);

    let html1: string;
    let html2: string;

    if (skipGenerate && existsSync(html1Path) && existsSync(html2Path)) {
      console.log("  既存の生成結果を使用");
      html1 = readFileSync(html1Path, "utf-8");
      html2 = readFileSync(html2Path, "utf-8");
    } else {
      // 並行生成
      const [r1, r2] = await Promise.all([
        generateUI(ctx1, prompt.prompt, "1.0"),
        generateUI(ctx2, prompt.prompt, "2.0"),
      ]);
      html1 = r1;
      html2 = r2;
      writeFileSync(html1Path, html1, "utf-8");
      writeFileSync(html2Path, html2, "utf-8");
    }

    // スコアリング
    const score1 = scoreHTML(html1);
    const score2 = scoreHTML(html2);

    console.log(`  1.0: ${score1.totalScore}/100 (violations: ${score1.ruleViolations}, patterns: ${score1.prohibitedPatterns})`);
    console.log(`  2.0: ${score2.totalScore}/100 (violations: ${score2.ruleViolations}, patterns: ${score2.prohibitedPatterns})`);

    results.push({ prompt, score1, score2, html1Path, html2Path });
  }

  // --- レポート生成 ---
  console.log("\n=== Results ===\n");

  let report = `# melta UI A/B Benchmark Results\n\n`;
  report += `**日時**: ${new Date().toISOString()}\n`;
  report += `**モデル**: claude-sonnet-4-20250514\n`;
  report += `**1.0 context**: ${(ctx1.length / 1024).toFixed(1)}KB (旧 CLAUDE.md)\n`;
  report += `**2.0 context**: ${(ctx2.length / 1024).toFixed(1)}KB (DESIGN.md + contracts)\n\n`;

  // サマリーテーブル
  report += `## サマリー\n\n`;
  report += `| Prompt | 1.0 Score | 2.0 Score | Δ | Winner |\n`;
  report += `|--------|-----------|-----------|---|--------|\n`;

  let total1 = 0;
  let total2 = 0;

  for (const r of results) {
    const delta = r.score2.totalScore - r.score1.totalScore;
    const winner = delta > 0 ? "2.0" : delta < 0 ? "1.0" : "TIE";
    const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
    report += `| ${r.prompt.id}: ${r.prompt.name} | ${r.score1.totalScore} | ${r.score2.totalScore} | ${deltaStr} | **${winner}** |\n`;
    total1 += r.score1.totalScore;
    total2 += r.score2.totalScore;

    console.log(`  ${r.prompt.id}: 1.0=${r.score1.totalScore} vs 2.0=${r.score2.totalScore} (${deltaStr}) → ${winner}`);
  }

  const avg1 = (total1 / results.length).toFixed(1);
  const avg2 = (total2 / results.length).toFixed(1);
  report += `| **平均** | **${avg1}** | **${avg2}** | **${(+avg2 - +avg1 > 0 ? "+" : "")}${(+avg2 - +avg1).toFixed(1)}** | **${+avg2 > +avg1 ? "2.0" : "1.0"}** |\n\n`;

  console.log(`\n  平均: 1.0=${avg1} vs 2.0=${avg2}`);

  // 詳細
  report += `## 詳細\n\n`;
  for (const r of results) {
    report += `### ${r.prompt.id}: ${r.prompt.name}${r.prompt.isRedTeam ? " (Red-Team)" : ""}\n\n`;
    report += `| 指標 | 1.0 | 2.0 |\n|------|-----|-----|\n`;
    report += `| Total Score | ${r.score1.totalScore} | ${r.score2.totalScore} |\n`;
    report += `| Rule Violations | ${r.score1.ruleViolations} | ${r.score2.ruleViolations} |\n`;
    report += `| Prohibited Patterns | ${r.score1.prohibitedPatterns} | ${r.score2.prohibitedPatterns} |\n\n`;

    if (r.score1.violationDetails.length > 0) {
      report += `**1.0 Violations**:\n${r.score1.violationDetails.map(v => `- ${v}`).join("\n")}\n\n`;
    }
    if (r.score1.patternDetails.length > 0) {
      report += `**1.0 Prohibited**:\n${r.score1.patternDetails.map(v => `- ${v}`).join("\n")}\n\n`;
    }
    if (r.score2.violationDetails.length > 0) {
      report += `**2.0 Violations**:\n${r.score2.violationDetails.map(v => `- ${v}`).join("\n")}\n\n`;
    }
    if (r.score2.patternDetails.length > 0) {
      report += `**2.0 Prohibited**:\n${r.score2.patternDetails.map(v => `- ${v}`).join("\n")}\n\n`;
    }

    report += `**生成ファイル**: \`${r.html1Path.replace(root + "/", "")}\` / \`${r.html2Path.replace(root + "/", "")}\`\n\n`;
  }

  const reportPath = resolve(runDir, "report.md");
  writeFileSync(reportPath, report, "utf-8");
  console.log(`\n  レポート: ${reportPath.replace(root + "/", "")}`);
}

main().catch(console.error);
