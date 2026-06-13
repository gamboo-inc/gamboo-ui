/**
 * coverage-stats.ts — 検証カバレッジの集計（P1-5）
 *
 * 「99 ルールのうち何件が、どの経路で検証されているか」を単一数字でなく
 * 経路別マトリクスで出す。発信時に「宣言だけ」を排し、改善のたびに数字が動く
 * 素材にする。export した computeCoverage はテスト/他スクリプトから再利用する。
 */

import { getAllRules } from "../../src/utils/loader.js";
import { isAutoDetectable } from "../../src/utils/matcher.js";
import type { RuleEntry } from "../../src/utils/types.js";

/**
 * 「manual（AI 参照のみ）」ルールの判定述語。
 * いずれの静的/テスト経路にも乗らないルール = 文脈判断が要り、AI への提示でのみ守らせる。
 * coverage-stats の manualOnly カウントと drift-check の orphan 検証がこの 1 箇所を共有し、
 * 集計値と実リストが乖離しないようにする。
 */
export function isManualOnly(r: RuleEntry): boolean {
  if (isAutoDetectable(r)) return false;
  if (r.detector === "html-attr" && r.htmlAttrCheck != null) return false;
  if (r.detector === "composition" && r.compositionCheck != null) return false;
  if (r.automationStatus === "covered-by-test") return false;
  if (r.automationStatus === "impossible-static") return false;
  return true;
}

export interface Coverage {
  total: number;
  /** class 文字列マッチ（check_rule と同経路） */
  classAuto: number;
  /** html-attr 検査（htmlAttrCheck spec あり） */
  htmlAttr: number;
  /** composition 検査（compositionCheck spec あり。a11y DOM ルール含む） */
  composition: number;
  /** 静的自動検出の合計 = classAuto + htmlAttr + composition */
  staticAuto: number;
  /** 静的検出はしないが interaction test で担保 */
  coveredByTest: number;
  /** 意味依存で静的検出が原理的に不能 */
  impossibleStatic: number;
  /** 上記いずれにも乗らない（manual で AI 参照のみ） */
  manualOnly: number;
}

export function computeCoverage(): Coverage {
  const rules = getAllRules();
  const classAuto = rules.filter(isAutoDetectable).length;
  const htmlAttr = rules.filter((r) => r.detector === "html-attr" && r.htmlAttrCheck != null).length;
  const composition = rules.filter(
    (r) => r.detector === "composition" && r.compositionCheck != null
  ).length;
  const staticAuto = classAuto + htmlAttr + composition;
  const coveredByTest = rules.filter((r) => r.automationStatus === "covered-by-test").length;
  const impossibleStatic = rules.filter((r) => r.automationStatus === "impossible-static").length;
  return {
    total: rules.length,
    classAuto,
    htmlAttr,
    composition,
    staticAuto,
    coveredByTest,
    impossibleStatic,
    manualOnly: rules.filter(isManualOnly).length,
  };
}

const isCli = process.argv[1] && process.argv[1].endsWith("coverage-stats.ts");
if (isCli) {
  const c = computeCoverage();
  const pct = (n: number) => `${((n / c.total) * 100).toFixed(0)}%`;
  console.log(`\n=== melta UI 検証カバレッジ（全 ${c.total} ルール）===\n`);
  console.log(`  静的自動検証      ${c.staticAuto} (${pct(c.staticAuto)})`);
  console.log(`    ├ class マッチ   ${c.classAuto}（MCP check_rule と同経路）`);
  console.log(`    ├ html-attr      ${c.htmlAttr}`);
  console.log(`    └ composition    ${c.composition}（ネスト + a11y DOM）`);
  console.log(`  interaction test  ${c.coveredByTest}（covered-by-test）`);
  console.log(`  静的検出 不能      ${c.impossibleStatic}（impossible-static: active/selected/current の意味依存）`);
  console.log(`  manual（参照のみ） ${c.manualOnly}\n`);
}
