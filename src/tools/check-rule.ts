import { getProhibitionRules } from "../utils/loader.js";
import type { Violation } from "../utils/types.js";

export type { Violation };

/**
 * Check a class string against prohibition rules.
 * Returns an array of violations found.
 */
export function checkRule(classes: string): Violation[] {
  const rules = getProhibitionRules();
  const violations: Violation[] = [];
  const classList = classes.split(/\s+/);

  for (const cls of classList) {
    for (const rule of rules) {
      if (cls.includes(rule.pattern)) {
        violations.push({
          ruleId: rule.ruleId,
          severity: rule.severity,
          class: cls,
          reason: rule.reason,
          alternative: rule.alternative,
        });
      }
    }
  }

  return violations;
}
