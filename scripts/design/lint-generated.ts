/**
 * lint-generated — AI 生成物の禁止パターン検査 CLI（③ CI gate の実体）
 *
 * 使い方:
 *   tsx scripts/design/lint-generated.ts <file...>
 *   tsx scripts/design/lint-generated.ts "src/**\/*.tsx"   # glob は呼び出し側 shell で展開
 *
 * design:check（contract の自己整合）と違い、こちらは「実際に生成された
 * .html/.tsx/.jsx/.vue」を共通 lint core(lint-core.ts) に通す。
 * error 違反が 1 件でもあれば exit 1 → CI gate / Git Hook のブロックに使える。
 *
 * 旧 hook-check-rule.sh の問題（exit 0 で警告のみ・includes 誤検出・.html 限定）を
 * すべて解消する。
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { lintSource, type LintViolation } from "../../src/utils/lint-core.js";
import { lintComposition } from "../../src/utils/composition-lint.js";

const TARGET_EXT = /\.(html|tsx|jsx|vue)$/;
// 合成 lint(S2)は DOM パース前提。JSX/.tsx は AST が要る別物(S4)なので .html のみ。
const COMPOSITION_EXT = /\.html$/;

function collectFiles(args: string[]): string[] {
  const files: string[] = [];
  for (const a of args) {
    if (!existsSync(a)) continue;
    if (!statSync(a).isFile()) continue;
    if (!TARGET_EXT.test(a)) continue;
    files.push(a);
  }
  return files;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "usage: tsx scripts/design/lint-generated.ts <file.html|tsx|jsx|vue ...>"
    );
    process.exit(2);
  }

  const files = collectFiles(args);
  // 引数はあるのに対象ファイルが 0 件 = typo path / glob 非展開 / 非対応拡張子。
  // CI gate が「走査対象ゼロ」を PASS と誤認しないよう exit 2 で落とす。
  if (files.length === 0) {
    console.error(
      `対象ファイルが見つかりません（.html/.tsx/.jsx/.vue が必要）: ${args.join(", ")}`
    );
    process.exit(2);
  }
  let errorCount = 0;
  let warnCount = 0;

  for (const file of files) {
    let violations: LintViolation[];
    try {
      const source = readFileSync(file, "utf-8");
      violations = lintSource(source);
      // .html は合成 lint(S2: ネスト modal 等)も追加する
      if (COMPOSITION_EXT.test(file)) {
        violations = violations.concat(lintComposition(source));
      }
    } catch {
      continue;
    }
    if (violations.length === 0) continue;

    console.log(`\n${file}`);
    for (const v of violations) {
      const mark = v.severity === "error" ? "✗" : "⚠";
      console.log(
        `  ${mark} [${v.severity}] ${v.ruleId}: "${v.token}" → ${v.alternative}（${v.reason}）`
      );
      if (v.severity === "error") errorCount++;
      else warnCount++;
    }
  }

  console.log(
    `\n${files.length} ファイル走査 / error ${errorCount} / warn ${warnCount}`
  );
  console.log(errorCount === 0 ? "✅ PASSED" : "❌ FAILED");
  process.exit(errorCount > 0 ? 1 : 0);
}

main();
