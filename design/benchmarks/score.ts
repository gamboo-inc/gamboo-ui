/**
 * score.ts — 生成 HTML の自動スコアリング（runner から分離）
 *
 * P4 で provider を切り替えても同じ scoring を使えるよう純粋関数化。
 * runner.ts は GenerationResult.text をここに渡すだけにする。
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

export interface Score {
  ruleViolations: number;
  violationDetails: string[];
  prohibitedPatterns: number;
  patternDetails: string[];
  totalScore: number;
}

interface AutoRule {
  id: string;
  description: string;
  detector: string;
  pattern: string | null;
  matchPatterns?: string[];
}

/**
 * HTML をスコアリング。
 * - rules.json の auto-detectable ルールに対する違反数
 * - 追加の禁止パターン（ハードコード色、強い影、薄い font 等）
 * - DS 準拠の正のシグナル
 * - 総合スコア（100点満点、50ベース ± シグナル）
 */
export function scoreHTML(html: string): Score {
  // rules.json からパターン抽出
  const rules = JSON.parse(
    readFileSync(resolve(root, "design/contracts/rules.json"), "utf-8")
  ) as { rules: AutoRule[] };
  const autoRules = rules.rules.filter(
    (r) =>
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

  // ルール違反チェック（ナイーブ includes; runner 互換維持）
  const violations: string[] = [];
  for (const rule of autoRules) {
    const patterns = rule.matchPatterns || [rule.pattern!];
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
    const m = html.match(check.pattern);
    if (m && m.length > 0) {
      patternViolations.push(`${check.name}: ${m.length} 件`);
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
