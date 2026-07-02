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

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

interface TokenLeaf {
  value: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// components 抽出（recipes/web/*.recipe.json の tailwind 文字列 → spec property）
//
// 方針:
// - 色は primary ramp / status / neutral / body / white を token 参照に、
//   それ以外の支援色（slate / emerald / amber / red の中間段）は Tailwind 実値の
//   literal hex として出す（front matter に無い色を偽って参照しない = 正直さ優先）
// - spec の component property は backgroundColor / textColor / rounded /
//   height / padding のみ写像（border は spec に無いので出さない）
// - 未知の色クラスは throw（黙って落とさない）。色以外のクラスは対象外として無視
// ---------------------------------------------------------------------------

/** Tailwind 支援色 → 実値（Tailwind v3 公式パレット）。token が無い色はここで literal 化 */
const TAILWIND_LITERALS: Record<string, string> = {
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-900": "#0f172a",
  "emerald-50": "#ecfdf5",
  "emerald-700": "#047857",
  "emerald-800": "#065f46",
  "amber-50": "#fffbeb",
  "amber-700": "#b45309",
  "amber-800": "#92400e",
  "red-50": "#fef2f2",
  "red-500": "#ef4444",
  "red-800": "#991b1b",
};

/** 色クラス名（bg-/text-/hover:bg- を剥いだ残り）→ DESIGN.md の値。未知色は throw */
function resolveColorClass(name: string): string | null {
  if (name === "transparent") return null; // 背景なしは property を出さない
  if (name === "white") return "#ffffff";
  if (name === "body") return "{colors.body}";
  if (name === "gray-50") return "{colors.neutral}"; // 実値一致（#f9fafb）
  if (name === "red-600") return "{colors.danger}"; // 実値一致（#dc2626 = danger.base）
  if (name === "red-700") return "#b91c1c"; // danger.text-light 相当（hover 段）
  const primary = name.match(/^primary-(\d+)$/);
  if (primary) return `{colors.primary-${primary[1]}}`;
  if (TAILWIND_LITERALS[name]) return TAILWIND_LITERALS[name];
  throw new Error(
    `export-designmd: 未知の色クラス "${name}"。TAILWIND_LITERALS か resolveColorClass に写像を追加すること`,
  );
}

/** text-* が色クラスか（text-xs / text-[1rem] / text-left 等のサイズ・整列は対象外） */
const TEXT_COLOR_RE =
  /^text-(white|black|body|transparent|(?:primary|slate|gray|emerald|amber|red)-\d+)$/;

interface ComponentEntry {
  name: string;
  props: Array<[string, string]>;
}

/** 1 variant の tailwind 文字列から spec property を抽出する */
function extractProps(
  tailwind: string,
  roundedMap: Record<string, string>,
): { base: Array<[string, string]>; hoverBg?: string } {
  const props: Array<[string, string]> = [];
  let hoverBg: string | undefined;
  const push = (key: string, value: string) => {
    if (!props.some(([k]) => k === key)) props.push([key, value]);
  };
  for (const cls of tailwind.split(/\s+/)) {
    const hover = cls.match(/^hover:bg-(.+)$/);
    if (hover) {
      const v = resolveColorClass(hover[1]);
      if (v && !hoverBg) hoverBg = v;
      continue;
    }
    if (cls.includes(":")) continue; // focus: / active: 等の他 pseudo は対象外
    const bg = cls.match(/^bg-(.+)$/);
    if (bg && !/gradient|opacity/.test(bg[1])) {
      const v = resolveColorClass(bg[1]);
      if (v) push("backgroundColor", v);
      continue;
    }
    const textColor = cls.match(TEXT_COLOR_RE);
    if (textColor) {
      const v = resolveColorClass(textColor[1]);
      if (v) push("textColor", v);
      continue;
    }
    if (roundedMap[cls]) {
      push("rounded", roundedMap[cls]);
      continue;
    }
    const height = cls.match(/^h-(\d+)$/);
    if (height) {
      push("height", `${Number(height[1]) * 4}px`);
      continue;
    }
    const padding = cls.match(/^p-(\d+)$/);
    if (padding) {
      push("padding", `${Number(padding[1]) * 4}px`);
      continue;
    }
  }
  return { base: props, hoverBg };
}

/** recipes/web 全体から components エントリを生成する（決定的順序） */
function buildComponents(radius: Record<string, TokenLeaf>): ComponentEntry[] {
  // radius トークンの tailwind フィールドから逆引き（rounded-lg → {rounded.md}）。
  // トークン外の段（rounded-md/2xl）は Tailwind 実値の literal（recipe 側の実態を偽らない）
  const roundedMap: Record<string, string> = { "rounded-md": "6px", "rounded-2xl": "16px" };
  for (const [level, leaf] of Object.entries(radius)) {
    roundedMap[leaf.tailwind as string] = `{rounded.${level}}`;
  }

  const recipesDir = resolve(root, "design/contracts/recipes/web");
  const entries: ComponentEntry[] = [];
  for (const file of readdirSync(recipesDir).sort()) {
    if (!file.endsWith(".recipe.json")) continue;
    const recipe = JSON.parse(readFileSync(join(recipesDir, file), "utf-8")) as {
      id: string;
      variants?: Record<string, { tailwind?: string }>;
    };
    for (const [variant, def] of Object.entries(recipe.variants ?? {})) {
      if (!def.tailwind) continue;
      const { base, hoverBg } = extractProps(def.tailwind, roundedMap);
      if (base.length === 0) continue; // 写像可能な property が無い variant（純 layout 等）は出さない
      const name = `${recipe.id}-${variant}`;
      entries.push({ name, props: base });
      if (hoverBg) entries.push({ name: `${name}-hover`, props: [["backgroundColor", hoverBg]] });
    }
  }
  return entries;
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

  // --- components（recipes/web の全 variant から抽出。melta 契約 → spec property の写像） ---
  const components = buildComponents(radius);
  lines.push("components:");
  for (const entry of components) {
    lines.push(`  ${entry.name}:`);
    for (const [key, value] of entry.props) {
      const quoted = value.startsWith("{") || value.startsWith("#") ? `"${value}"` : value;
      lines.push(`    ${key}: ${quoted}`);
    }
  }
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
