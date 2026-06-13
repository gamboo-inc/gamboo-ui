/**
 * coverage-stats.ts — 検証カバレッジの集計（P1-5）
 *
 * 「99 ルールのうち何件が、どの経路で検証されているか」を単一数字でなく
 * 経路別マトリクスで出す。発信時に「宣言だけ」を排し、改善のたびに数字が動く
 * 素材にする。export した computeCoverage はテスト/他スクリプトから再利用する。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

// --- README 自動埋め込み（経路別マトリクスを単一数字でなく表で掲示） ---
// 改善のたびに数字が動く発信素材にする。CLI（design:coverage）が書き、drift-check が鮮度を検証する
// （DTCG エクスポート / DESIGN.md front matter と同じ「生成して CI で守る」パターン）。
export const COVERAGE_BEGIN = "<!-- BEGIN:coverage (npm run design:coverage で再生成) -->";
export const COVERAGE_END = "<!-- END:coverage -->";
export const COVERAGE_EN_BEGIN = "<!-- BEGIN:coverage-en (npm run design:coverage で再生成) -->";
export const COVERAGE_EN_END = "<!-- END:coverage-en -->";

/** 日本語 README 用の経路別マトリクス（アンカー込み） */
export function renderCoverageBlock(): string {
  const c = computeCoverage();
  const rows = [
    "| 経路 | 件数 | 内容 |",
    "|------|------|------|",
    `| 静的自動検証 | **${c.staticAuto} / ${c.total}** | class マッチ ${c.classAuto}（MCP \`check_rule\` 同経路）+ html-attr ${c.htmlAttr} + composition ${c.composition}（ネスト + a11y DOM） |`,
    `| interaction test | ${c.coveredByTest} | \`tests/modal.spec.ts\` が focus trap / Escape / focus 復帰を実機検証 |`,
    `| 静的検出 不能 | ${c.impossibleStatic} | \`impossible-static\`（active/selected/current の特定が意味依存） |`,
    `| manual（AI 参照のみ） | ${c.manualOnly} | 文脈判断が要るもの。\`get_rules\` で AI に提示 |`,
  ];
  return `${COVERAGE_BEGIN}\n${rows.join("\n")}\n${COVERAGE_END}`;
}

/** 英語 README 用の経路別マトリクス（アンカー込み）。同じ contracts を参照し全入口で数値整合させる */
export function renderCoverageBlockEn(): string {
  const c = computeCoverage();
  const rows = [
    "| Route | Count | What |",
    "|-------|-------|------|",
    `| Static auto-detection | **${c.staticAuto} / ${c.total}** | class-match ${c.classAuto} (same path as MCP \`check_rule\`) + html-attr ${c.htmlAttr} + composition ${c.composition} (nesting + a11y DOM) |`,
    `| Interaction test | ${c.coveredByTest} | \`tests/modal.spec.ts\` verifies focus trap / Escape / focus return in a real browser |`,
    `| Statically undetectable | ${c.impossibleStatic} | \`impossible-static\` (active/selected/current are semantically dependent) |`,
    `| Manual (AI reference only) | ${c.manualOnly} | Context-dependent; surfaced to the AI via \`get_rules\` |`,
  ];
  return `${COVERAGE_EN_BEGIN}\n${rows.join("\n")}\n${COVERAGE_EN_END}`;
}

/**
 * md ファイルのアンカー間を最新の coverage 表に差し替える。戻り値: "updated" | "unchanged" | "no-anchor"。
 * begin/end と render を差し替えることで README.md（日本語）/ README.en.md（英語）を同一ロジックで埋め込む。
 */
export function embedCoverageBlock(
  filePath: string,
  begin: string,
  end: string,
  render: () => string
): "updated" | "unchanged" | "no-anchor" {
  if (!existsSync(filePath)) return "no-anchor";
  const md = readFileSync(filePath, "utf-8");
  const b = md.indexOf(begin);
  const e = md.indexOf(end);
  if (b < 0 || e < b) return "no-anchor";
  const next = md.slice(0, b) + render() + md.slice(e + end.length);
  if (next === md) return "unchanged";
  writeFileSync(filePath, next, "utf-8");
  return "updated";
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

  // README.md（日本語）/ README.en.md（英語）の経路別マトリクスを再生成
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const root = resolve(__dirname, "../..");
  const targets: Array<[string, string, string, () => string]> = [
    [resolve(root, "README.md"), COVERAGE_BEGIN, COVERAGE_END, renderCoverageBlock],
    [resolve(root, "README.en.md"), COVERAGE_EN_BEGIN, COVERAGE_EN_END, renderCoverageBlockEn],
  ];
  for (const [path, begin, end, render] of targets) {
    const name = path.endsWith("README.en.md") ? "README.en.md" : "README.md";
    const result = embedCoverageBlock(path, begin, end, render);
    console.log(
      result === "updated"
        ? `  ✅ ${name} の検証カバレッジ表を更新しました`
        : result === "unchanged"
          ? `  ✅ ${name} の検証カバレッジ表は最新です`
          : `  ⚠️  ${name} に coverage アンカーが見つかりません`
    );
  }
}
