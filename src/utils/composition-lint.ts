/**
 * 合成 lint（S2: 合成・関係次元の検出）
 *
 * Q1〜Q6 の class / attr 検出は「部品単体の合法性」しか見ない。だが AI 生成 UI の
 * 崩壊は「部品をどう組んだか」——ネスト深さ・出現回数・色数・要素間の関係——という
 * 合成次元に宿る（監査 D4-01 / section E）。単一 class 文字列マッチでは原理的に
 * 届かないので、ここだけ DOM をパース（node-html-parser）して関係を見る。
 *
 * 設計:
 * - 対象は完全な HTML 文書/フラグメント（.html）。JSX/.tsx の合成は AST が要る別物
 *   （S4/babel）なので、呼び出し側で .html に限定して渡す。
 * - rules.json の detector="composition" + compositionCheck spec に従って判定する。
 *   spec を持つ合成ルールだけが対象（持たないものは従来どおり未検出）。
 * - 第一弾は nested-selector（ネスト modal = MODAL_NO_NESTED 蘇生）のみ。
 *   色数 / CTA 数 / カード深さは閾値較正が要るので段階導入する。
 */

import { parse } from "node-html-parser";
import type { HTMLElement } from "node-html-parser";
import { getAllRules } from "./loader.js";
import type { CompositionCheck, LintViolation, RuleEntry } from "./types.js";

function toViolation(rule: RuleEntry, token: string): LintViolation {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    token,
    category: rule.category,
    reason: rule.description,
    alternative: rule.alternative,
  };
}

/** el に、自分自身を除く selector マッチの祖先がいるか */
function hasMatchingAncestor(el: HTMLElement, selector: string): boolean {
  let p = el.parentNode as HTMLElement | null;
  while (p) {
    // text node 等は matches を持たない
    if (typeof p.matches === "function" && p.matches(selector)) return true;
    p = p.parentNode as HTMLElement | null;
  }
  return false;
}

/** 1 ルール分の合成検査を実行し、違反トークン列を返す */
function runCheck(check: CompositionCheck, root: HTMLElement): string[] {
  if (check.kind === "nested-selector") {
    // selector マッチ要素のうち、同 selector の祖先を持つもの（= ネスト）を違反にする。
    // 兄弟として複数あるだけ（正規のショーケース）は祖先を持たないので拾わない。
    const matched = root.querySelectorAll(check.selector);
    const nested = matched.filter((el) => hasMatchingAncestor(el, check.selector));
    // 同じ違反を何件も出さず、ネストが1つでもあれば selector を token に1件返す
    return nested.length > 0 ? [`${check.selector}（ネスト ${nested.length} 箇所）`] : [];
  }
  return [];
}

/**
 * HTML 文字列を合成ルールで検査する。
 * detector="composition" かつ compositionCheck spec を持つルールだけが対象。
 */
export function lintComposition(html: string): LintViolation[] {
  const rules = getAllRules().filter(
    (r) => r.detector === "composition" && r.compositionCheck != null
  );
  if (rules.length === 0) return [];

  const root = parse(html);

  const violations: LintViolation[] = [];
  for (const rule of rules) {
    for (const token of runCheck(rule.compositionCheck!, root)) {
      violations.push(toViolation(rule, token));
    }
  }
  return violations;
}
