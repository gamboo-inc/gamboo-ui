import { getAllRules } from "../utils/loader.js";
import { tokenize, matches } from "../utils/matcher.js";
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
  const rules = getAllRules().filter(
    (r) =>
      r.detector === "tailwind-class" || r.detector === "tailwind-class-prefix"
  );
  const violations: Violation[] = [];

  for (const ctx of tokenize(classes)) {
    for (const rule of rules) {
      if (matches(rule, ctx)) {
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          class: ctx.raw,
          reason: rule.description,
          alternative: rule.alternative,
        });
      }
    }
  }

  return violations;
}
