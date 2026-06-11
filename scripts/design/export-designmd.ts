/**
 * export-designmd.ts — Google DESIGN.md spec 互換の YAML front matter を
 * design/contracts/tokens.json から生成し、DESIGN.md 先頭に注入する。
 *
 * Google Labs design.md spec（https://github.com/google-labs-code/design.md、
 * version: alpha）の Token Schema（colors / typography / rounded / spacing /
 * components）に準拠。melta の SSOT は引き続き design/contracts/ であり、
 * front matter は tokens.json から生成される interop ビュー（直接編集しない）。
 *
 * 検証: `npx @google/design.md lint DESIGN.md`（公式 linter）が通ること。
 * drift-check が「再生成と DESIGN.md 内の front matter の一致」を監視する。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

interface TokenLeaf {
  value: string;
  [key: string]: unknown;
}

export function buildFrontMatter(): string {
  const tokens = JSON.parse(
    readFileSync(resolve(root, "design/contracts/tokens.json"), "utf-8")
  );

  const primary = tokens.color.primary as Record<string, TokenLeaf>;
  const body = tokens.color.body as TokenLeaf;
  const status = tokens.color.status as Record<string, Record<string, TokenLeaf>>;
  const semanticLight = tokens.color.semantic.light as Record<string, TokenLeaf>;
  const fontSize = tokens.typography.fontSize as Record<
    string,
    { size: string; lineHeight: string }
  >;
  const letterSpacing = tokens.typography.letterSpacing as Record<string, TokenLeaf>;
  const fontFamilySans = (tokens.typography.fontFamily.sans.value as string[])[0];
  const radius = tokens.radius as Record<string, TokenLeaf>;
  const spacing = tokens.spacing as Record<string, TokenLeaf>;

  const lines: string[] = [];
  lines.push("---");
  lines.push("# Generated from design/contracts/tokens.json by scripts/design/export-designmd.ts — do not edit by hand.");
  lines.push("# Format: Google DESIGN.md spec (github.com/google-labs-code/design.md). SSOT remains design/contracts/.");
  lines.push("version: alpha");
  lines.push("name: melta UI");
  lines.push(
    "description: 声を張らずに伝わる UI — Quiet Precision / Breathable / Flat & Layered / Subtle Warmth"
  );

  // --- colors ---
  lines.push("colors:");
  lines.push(`  primary: "${primary["500"].value}"`);
  for (const [step, leaf] of Object.entries(primary)) {
    lines.push(`  primary-${step}: "${leaf.value}"`);
  }
  lines.push(`  body: "${body.value}"`);
  lines.push(`  neutral: "${semanticLight["bg-page"].value}"`);
  for (const [name, ramp] of Object.entries(status)) {
    if (ramp.base) lines.push(`  ${name}: "${ramp.base.value}"`);
  }

  // --- typography ---
  // 見出し系（lh 1.4 / ls 0.01em）と本文系（ls 0.02em）のマッピングは
  // scripts/ds-theme.css の body/heading ルールに対応する
  const lsHeading = letterSpacing.heading.value as unknown as string;
  const lsBody = letterSpacing.body.value as unknown as string;
  const TYPO_MAP: Array<{ name: string; step: string; ls: string }> = [
    { name: "h1", step: "3xl", ls: lsHeading },
    { name: "h2", step: "2xl", ls: lsHeading },
    { name: "h3", step: "xl", ls: lsHeading },
    { name: "body-lg", step: "lg", ls: lsBody },
    { name: "body", step: "base", ls: lsBody },
    { name: "body-sm", step: "sm", ls: lsBody },
    { name: "caption", step: "xs", ls: lsBody },
  ];
  lines.push("typography:");
  for (const t of TYPO_MAP) {
    const fs = fontSize[t.step];
    lines.push(`  ${t.name}:`);
    lines.push(`    fontFamily: ${fontFamilySans}`);
    lines.push(`    fontSize: ${fs.size}`);
    lines.push(`    lineHeight: ${fs.lineHeight}`);
    lines.push(`    letterSpacing: ${t.ls}`);
  }

  // --- rounded ---
  lines.push("rounded:");
  for (const [level, leaf] of Object.entries(radius)) {
    lines.push(`  ${level}: ${leaf.value}`);
  }

  // --- spacing ---
  lines.push("spacing:");
  for (const [level, leaf] of Object.entries(spacing)) {
    lines.push(`  "${level}": ${leaf.value}`);
  }

  // --- components（token reference のデモを兼ねた最小セット。値は全て tokens 由来） ---
  lines.push("components:");
  lines.push("  button-primary:");
  lines.push('    backgroundColor: "{colors.primary}"');
  lines.push('    textColor: "#ffffff"');
  lines.push('    rounded: "{rounded.md}"');
  lines.push("    height: 40px");
  lines.push("  button-primary-hover:");
  lines.push('    backgroundColor: "{colors.primary-700}"');
  lines.push("---");
  return lines.join("\n") + "\n";
}

/** DESIGN.md の先頭 front matter を差し替え（無ければ prepend）た本文を返す */
export function injectFrontMatter(designMd: string, frontMatter: string): string {
  const existing = designMd.match(/^---\n[\s\S]*?\n---\n+/);
  const bodyText = existing ? designMd.slice(existing[0].length) : designMd;
  return frontMatter + "\n" + bodyText;
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const designPath = resolve(root, "DESIGN.md");
  const before = readFileSync(designPath, "utf-8");
  const after = injectFrontMatter(before, buildFrontMatter());
  if (after !== before) {
    writeFileSync(designPath, after, "utf-8");
    console.log("  ✅ DESIGN.md に Google spec 互換 front matter を注入しました");
  } else {
    console.log("  ✅ DESIGN.md front matter は最新です（変更なし）");
  }
}
