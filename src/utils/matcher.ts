/**
 * Tailwind-aware rule matcher（P1a）
 *
 * rules.json の自動検出ルール（tailwind-class / tailwind-class-prefix）を
 * Tailwind class string に対して適用するための共通 utility。
 * check_rule と P1b の contract lint の双方が使う。
 *
 * 旧実装（src/tools/check-rule.ts の cls.includes）の問題:
 * - "top-0" が pattern "p-0" (SPACE_NO_P0_CARDS) に誤検出される
 * - "hover:bg-blue-500" の variant prefix が剥がれず、prefix matcher の挙動が不安定
 *
 * 新実装の方針:
 * - class token を Tailwind-aware に正規化（variant / important / arbitrary 対応）
 * - detector 別にマッチング規則を分離
 *   - tailwind-class: base との完全一致
 *   - tailwind-class-prefix: base の prefix 一致
 */

import type { MatchContext, RuleEntry } from "./types.js";

/**
 * Tailwind class string を MatchContext[] に正規化する。
 *
 * 対応する変換:
 * - 通常 variant: "hover:bg-blue-500" → variants=["hover"], base="bg-blue-500"
 * - 複数 variant: "md:hover:bg-blue-500" → variants=["md","hover"], base="bg-blue-500"
 * - !important: "!text-black" → important=true, base="text-black"
 * - variant + !important: "md:!text-black" → variants=["md"], important=true, base="text-black"
 * - arbitrary variant: "[&>*]:p-0" → variants=["[&>*]"], base="p-0"
 * - arbitrary value: "space-x-[12px]" → base="space-x-[12px]" (variant にしない)
 */
export function tokenize(classString: string): MatchContext[] {
  return classString
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map(parseToken);
}

function parseToken(raw: string): MatchContext {
  const variants: string[] = [];
  let rest = raw;

  while (true) {
    if (rest.startsWith("[")) {
      const closeIdx = findMatchingBracket(rest, 0);
      if (closeIdx !== -1 && rest[closeIdx + 1] === ":") {
        variants.push(rest.substring(0, closeIdx + 1));
        rest = rest.substring(closeIdx + 2);
        continue;
      }
      // 対応する `]:` がない（孤立した `[` で始まる token）→ そのまま base 扱い
      break;
    }

    const colonIdx = findVariantColon(rest);
    if (colonIdx > 0) {
      variants.push(rest.substring(0, colonIdx));
      rest = rest.substring(colonIdx + 1);
      continue;
    }
    break;
  }

  const important = rest.startsWith("!");
  const base = important ? rest.substring(1) : rest;
  return { raw, base, variants, important };
}

/** ネスト対応の角括弧ペア検索。ペアが見つからなければ -1 */
function findMatchingBracket(s: string, start: number): number {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "[") depth++;
    else if (s[i] === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * variant 用の `:` 位置を探す。
 * - `[...]` 内部の `:` はスキップ
 * - `!` が出てきたら variant 部分は終わり（base に来た）
 */
function findVariantColon(s: string): number {
  let i = 0;
  while (i < s.length) {
    if (s[i] === "[") {
      const close = findMatchingBracket(s, i);
      if (close === -1) return -1;
      i = close + 1;
      continue;
    }
    if (s[i] === ":") return i;
    if (s[i] === "!") return -1;
    i++;
  }
  return -1;
}

/**
 * rule が ctx に対してマッチするか判定する。
 *
 * - tailwind-class: base が pattern または matchPatterns のいずれかと完全一致
 * - tailwind-class-prefix: base が pattern または matchPatterns で始まる
 * - html-attr / manual: class matching では検出不可（false）
 */
export function matches(rule: RuleEntry, ctx: MatchContext): boolean {
  if (rule.detector === "tailwind-class") {
    if (rule.matchPatterns && rule.matchPatterns.length > 0) {
      return rule.matchPatterns.includes(ctx.base);
    }
    if (rule.pattern) {
      return ctx.base === rule.pattern;
    }
    return false;
  }

  if (rule.detector === "tailwind-class-prefix") {
    if (rule.matchPatterns && rule.matchPatterns.length > 0) {
      return rule.matchPatterns.some(
        (p) => ctx.base === p || ctx.base.startsWith(p)
      );
    }
    if (rule.pattern) {
      return ctx.base.startsWith(rule.pattern);
    }
    return false;
  }

  return false;
}
