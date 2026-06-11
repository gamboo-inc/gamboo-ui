import { getAllRules } from "../utils/loader.js";
import { tokenize, matches, isAutoDetectable } from "../utils/matcher.js";
import type { Violation } from "../utils/types.js";

export type { Violation };

/**
 * Check a class string against prohibition rules.
 * Returns an array of violations found.
 *
 * P1a: Tailwind-aware matcher を使うようリファクタ済み。
 * variant / !important / arbitrary variant / arbitrary value を正しく分離してから
 * detector 別にマッチング判定する（旧 cls.includes の誤検出を解消）。
 */
export function checkRule(classes: string): Violation[] {
  const rules = getAllRules().filter(isAutoDetectable);
  const violations: Violation[] = [];

  for (const ctx of tokenize(classes)) {
    for (const rule of rules) {
      if (matches(rule, ctx)) {
        // requiresContext ルール（py-0.5 はボタンのみ NG 等）は lint-core（CI/hook）
        // では誤検出防止のため除外されるが、check_rule は class 単体の事前確認用途
        // なので conditional フラグ付きで返す（無条件 error 扱いにしない）
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          class: ctx.raw,
          reason: rule.requiresContext
            ? `[文脈依存 — 特定の文脈でのみ違反] ${rule.description}`
            : rule.description,
          alternative: rule.alternative,
          ...(rule.requiresContext ? { conditional: true } : {}),
        });
      }
    }
  }

  return violations;
}
