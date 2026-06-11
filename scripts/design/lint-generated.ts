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

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
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

function lintFile(file: string): LintViolation[] | null {
  try {
    const source = readFileSync(file, "utf-8");
    let violations = lintSource(source);
    if (COMPOSITION_EXT.test(file)) {
      violations = violations.concat(lintComposition(source));
    }
    return violations;
  } catch {
    return null;
  }
}

/**
 * --hook <file>: Claude Code PostToolUse hook 用の JSON を stdout に出して常に exit 0。
 *
 * - error あり → {"decision":"block","reason":...} — Claude に自動フィードバックされ
 *   修正ループが回る（PostToolUse は書き込み後なので「実行前ブロック」ではない）
 * - warn のみ → hookSpecificOutput.additionalContext で助言注入
 * - 違反なし / 対象外 / 読込失敗 → 出力なし
 *
 * 旧 hook の「plain stdout + exit 0」は transcript 表示のみで model に届かないため、
 * この JSON 出力が enforcement の実体。
 */
function hookMain(file: string): void {
  if (!TARGET_EXT.test(file) || !existsSync(file)) return;
  const violations = lintFile(file);
  if (!violations || violations.length === 0) return;

  const MAX_LISTED = 10;
  const lines = violations
    .slice(0, MAX_LISTED)
    .map(
      (v) =>
        `${v.severity === "error" ? "✗" : "⚠"} [${v.severity}] ${v.ruleId}: "${v.token}" → ${v.alternative}（${v.reason}）`
    );
  if (violations.length > MAX_LISTED) {
    lines.push(`…他 ${violations.length - MAX_LISTED} 件（npm run design:lint-generated -- ${file} で全件表示）`);
  }
  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warnCount = violations.length - errorCount;

  if (errorCount > 0) {
    console.log(
      JSON.stringify({
        decision: "block",
        reason: `melta UI 禁止パターン検出（error ${errorCount} / warn ${warnCount}）。書き込まれたファイルを修正してください:\n${lines.join("\n")}\nルール仕様: design/contracts/rules.json`,
      })
    );
  } else {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `melta UI 注意（warn ${warnCount}）。可能なら修正を推奨:\n${lines.join("\n")}`,
        },
      })
    );
  }
}

function main(): void {
  const args = process.argv.slice(2);
  if (args[0] === "--hook") {
    if (args[1]) hookMain(args[1]);
    process.exit(0);
  }
  // --baseline = 比較モード（baseline 不在は exit 2。「不在 = PASS」を防ぐ）
  // --baseline-write = 初期化・更新モード（現状の warn 件数を書き出す。CI では使わない）
  let baselinePath: string | null = null;
  let baselineWrite = false;
  let fileArgs = args;
  if (args[0] === "--baseline" || args[0] === "--baseline-write") {
    baselineWrite = args[0] === "--baseline-write";
    baselinePath = args[1] ?? null;
    fileArgs = args.slice(2);
    if (!baselinePath) {
      console.error("usage: tsx scripts/design/lint-generated.ts --baseline <baseline.json> <file...>");
      process.exit(2);
    }
  }

  if (fileArgs.length === 0) {
    console.error(
      "usage: tsx scripts/design/lint-generated.ts [--hook|--baseline <json>|--baseline-write <json>] <file.html|tsx|jsx|vue ...>"
    );
    process.exit(2);
  }

  const files = collectFiles(fileArgs);
  // 引数はあるのに対象ファイルが 0 件 = typo path / glob 非展開 / 非対応拡張子。
  // CI gate が「走査対象ゼロ」を PASS と誤認しないよう exit 2 で落とす。
  if (files.length === 0) {
    console.error(
      `対象ファイルが見つかりません（.html/.tsx/.jsx/.vue が必要）: ${fileArgs.join(", ")}`
    );
    process.exit(2);
  }
  let errorCount = 0;
  let warnCount = 0;
  const skipped: string[] = [];
  const fileViolations = new Map<string, LintViolation[]>();

  for (const file of files) {
    const violations = lintFile(file);
    // 読み込み失敗を silent skip すると「走査したつもりで素通り」になるため記録して exit 2
    if (violations === null) {
      skipped.push(file);
      continue;
    }
    fileViolations.set(file, violations);
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

  if (skipped.length > 0) {
    console.error(`❌ 読み込み失敗で未走査のファイルがあります: ${skipped.join(", ")}`);
    process.exit(2);
  }

  // --- baseline ラチェット（error は従来通り即 FAIL。warn は per-file × ruleId で増加禁止） ---
  type Baseline = Record<string, Record<string, number>>;
  const currentWarns: Baseline = {};
  for (const [file, violations] of fileViolations) {
    const counts: Record<string, number> = {};
    for (const v of violations) {
      if (v.severity !== "warn") continue;
      counts[v.ruleId] = (counts[v.ruleId] ?? 0) + 1;
    }
    if (Object.keys(counts).length > 0) {
      currentWarns[file] = Object.fromEntries(Object.entries(counts).sort());
    }
  }

  if (baselinePath && baselineWrite) {
    const sorted = Object.fromEntries(Object.entries(currentWarns).sort());
    writeFileSync(baselinePath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
    console.log(`📝 baseline を書き出しました: ${baselinePath}（${Object.keys(sorted).length} ファイル）`);
  } else if (baselinePath) {
    if (!existsSync(baselinePath)) {
      console.error(
        `❌ baseline が見つかりません: ${baselinePath}（初期化は --baseline-write で明示的に行う）`
      );
      process.exit(2);
    }
    const baseline: Baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
    const increases: string[] = [];
    let decreased = false;
    for (const [file, counts] of Object.entries(currentWarns)) {
      for (const [ruleId, count] of Object.entries(counts)) {
        const allowed = baseline[file]?.[ruleId] ?? 0;
        if (count > allowed) increases.push(`${file} ${ruleId}: ${allowed} → ${count}`);
      }
    }
    for (const [file, counts] of Object.entries(baseline)) {
      if (!fileViolations.has(file)) continue; // 今回の走査対象外は比較しない
      for (const [ruleId, allowed] of Object.entries(counts)) {
        if ((currentWarns[file]?.[ruleId] ?? 0) < allowed) decreased = true;
      }
    }
    if (increases.length > 0) {
      console.error(`\n❌ warn が baseline を超過（ラチェット違反）:\n  ${increases.join("\n  ")}`);
      console.error("  正当な増加なら --baseline-write で更新してコミットに含めること");
      process.exit(1);
    }
    if (decreased) {
      console.log("💡 warn が baseline より減少。--baseline-write での更新を推奨");
    }
    console.log("✅ baseline ラチェット OK（warn 増加なし）");
  }

  console.log(errorCount === 0 ? "✅ PASSED" : "❌ FAILED");
  process.exit(errorCount > 0 ? 1 : 0);
}

main();
