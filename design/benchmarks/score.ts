/**
 * score.ts — 生成 HTML の自動スコアリング（runner から分離）
 *
 * P4 で provider を切り替えても同じ scoring を使えるよう純粋関数化。
 * runner.ts は GenerationResult.text をここに渡すだけにする。
 *
 * P1-4 Slice 1: 採点コアを共通 lint core（lintSource + lintComposition）に差し替え。
 * CI / MCP check_html / PostToolUse hook と同一判定になり、旧ナイーブ includes の
 * 誤検出（top-0 → p-0 等）と、Q3/Q5/S2 で増えた検知（prefixPatterns / html-attr /
 * composition）の未反映を同時に解消する。
 */

import { lintSource, type LintViolation } from "../../src/utils/lint-core.js";
import { lintComposition } from "../../src/utils/composition-lint.js";

export interface Score {
  /** error 違反数（lint core 判定） */
  ruleViolations: number;
  violationDetails: string[];
  /** warn 違反数（lint core 判定） */
  prohibitedPatterns: number;
  patternDetails: string[];
  totalScore: number;
}

function formatViolation(v: LintViolation): string {
  return `[${v.severity}] ${v.ruleId}: "${v.token}" → ${v.alternative}`;
}

/**
 * HTML をスコアリング。
 * - 共通 lint core による違反検出（error -10 / warn -3 の severity 重み）
 * - DS 準拠の正のシグナル（+5/個）
 * - 総合スコア（100点満点、50ベース ± シグナル）
 */
export function scoreHTML(html: string): Score {
  const violations = lintSource(html).concat(lintComposition(html));
  const errors = violations.filter((v) => v.severity === "error");
  const warns = violations.filter((v) => v.severity === "warn");

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

  const violationPenalty = errors.length * 10 + warns.length * 3;
  const positiveBonus = positiveSignals * 5;
  const totalScore = Math.max(0, Math.min(100, 50 + positiveBonus - violationPenalty));

  return {
    ruleViolations: errors.length,
    violationDetails: errors.map(formatViolation),
    prohibitedPatterns: warns.length,
    patternDetails: warns.map(formatViolation),
    totalScore,
  };
}
