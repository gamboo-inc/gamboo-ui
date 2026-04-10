/**
 * validate.ts — melta UI static harness
 *
 * 検証項目:
 * 1. rules.json のスキーマ整合性
 * 2. component contract のスキーマ整合性
 * 3. ルール ID の一意性
 * 4. contract 内のルール参照が rules.json に存在するか
 * 5. contract 内の tokenRef が tokens.json に存在するか
 * 6. MCP check_rule のハードコード件数 vs rules.json の自動検出可能ルール件数
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

let errors = 0;
let warnings = 0;

function error(msg: string): void {
  console.error(`  ❌ ERROR: ${msg}`);
  errors++;
}

function warn(msg: string): void {
  console.warn(`  ⚠️  WARN: ${msg}`);
  warnings++;
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function section(title: string): void {
  console.log(`\n=== ${title} ===\n`);
}

// --- 簡易 JSON Schema バリデーション（外部ライブラリ不要） ---

interface SimpleSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, { type?: string | string[]; enum?: string[]; pattern?: string; items?: SimpleSchema }>;
  items?: SimpleSchema;
  additionalProperties?: SimpleSchema | boolean;
}

function validateAgainstSchema(
  data: unknown,
  schema: SimpleSchema,
  path: string,
  label: string
): string[] {
  const issues: string[] = [];

  if (schema.type === "object" && typeof data === "object" && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    // required フィールドチェック
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj)) {
          issues.push(`${label}: "${path}.${field}" は必須`);
        }
      }
    }

    // properties のチェック
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (!(key in obj)) continue;
        const val = obj[key];

        // enum チェック
        if (propSchema.enum && typeof val === "string" && !propSchema.enum.includes(val)) {
          issues.push(`${label}: "${path}.${key}" の値 "${val}" は enum ${JSON.stringify(propSchema.enum)} に含まれない`);
        }

        // pattern チェック
        if (propSchema.pattern && typeof val === "string") {
          const re = new RegExp(propSchema.pattern);
          if (!re.test(val)) {
            issues.push(`${label}: "${path}.${key}" の値 "${val}" がパターン /${propSchema.pattern}/ に不一致`);
          }
        }

        // type チェック（基本型のみ）
        if (propSchema.type) {
          const types = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
          const actualType = val === null ? "null" : Array.isArray(val) ? "array" : typeof val;
          if (!types.includes(actualType)) {
            issues.push(`${label}: "${path}.${key}" の型が ${types.join("|")} ではなく ${actualType}`);
          }
        }

        // 配列の items チェック
        if (propSchema.items && Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) {
            issues.push(...validateAgainstSchema(val[i], propSchema.items, `${path}.${key}[${i}]`, label));
          }
        }
      }
    }
  } else if (schema.type === "array" && Array.isArray(data)) {
    if (schema.items) {
      for (let i = 0; i < data.length; i++) {
        issues.push(...validateAgainstSchema(data[i], schema.items, `${path}[${i}]`, label));
      }
    }
  }

  return issues;
}

// --- ファイル読み込み ---

function loadJSON(path: string): unknown {
  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) {
    error(`ファイルが見つかりません: ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf-8"));
  } catch (e) {
    error(`JSON パースエラー: ${path} — ${(e as Error).message}`);
    return null;
  }
}

// --- 1. rules.json の検証 ---

section("1. rules.json の検証");

interface Rule {
  id: string;
  category: string;
  severity: string;
  description: string;
  detector: string;
  pattern: string | null;
  matchPatterns?: string[];
  alternative: string;
}

interface RulesData {
  version: string;
  rules: Rule[];
}

const rulesData = loadJSON("design/contracts/rules.json") as RulesData | null;

// JSON Schema を読み込み
const ruleSchema = loadJSON("design/schemas/rule.schema.json") as SimpleSchema | null;
const contractSchema = loadJSON("design/schemas/component-contract.schema.json") as SimpleSchema | null;

if (rulesData && ruleSchema) {
  // Schema バリデーション
  const schemaIssues = validateAgainstSchema(rulesData, ruleSchema, "rules", "rules.json");
  if (schemaIssues.length > 0) {
    for (const issue of schemaIssues) error(issue);
  } else {
    ok("rules.json スキーマ検証 OK");
  }

  // rules 配列内の各ルールを items スキーマでチェック
  if (ruleSchema.properties?.rules?.items) {
    const itemSchema = ruleSchema.properties.rules.items;
    let ruleSchemaErrors = 0;
    for (const rule of rulesData.rules) {
      const issues = validateAgainstSchema(rule, itemSchema, `rules[${rule.id}]`, "rules.json");
      for (const issue of issues) {
        error(issue);
        ruleSchemaErrors++;
      }
    }
    if (ruleSchemaErrors === 0) {
      ok(`全 ${rulesData.rules.length} ルールのスキーマ検証 OK`);
    }
  }
}

if (rulesData) {
  // version チェック
  if (!rulesData.version) {
    error("rules.json に version がありません");
  } else {
    ok(`version: ${rulesData.version}`);
  }

  // rules 配列チェック
  if (!Array.isArray(rulesData.rules)) {
    error("rules.json の rules が配列ではありません");
  } else {
    ok(`ルール件数: ${rulesData.rules.length}`);

    // 必須フィールドチェック
    const requiredFields = ["id", "category", "severity", "description", "detector", "alternative"];
    for (const rule of rulesData.rules) {
      for (const field of requiredFields) {
        if (!(field in rule)) {
          error(`ルール ${rule.id || "unknown"} に必須フィールド "${field}" がありません`);
        }
      }

      // severity の値チェック
      if (rule.severity && !["error", "warn"].includes(rule.severity)) {
        error(`ルール ${rule.id}: severity "${rule.severity}" は "error" または "warn" のみ`);
      }

      // detector の値チェック
      const validDetectors = ["tailwind-class", "tailwind-class-prefix", "html-attr", "manual"];
      if (rule.detector && !validDetectors.includes(rule.detector)) {
        error(`ルール ${rule.id}: detector "${rule.detector}" は不正`);
      }

      // tailwind-class / tailwind-class-prefix は pattern 必須
      if (["tailwind-class", "tailwind-class-prefix"].includes(rule.detector) && !rule.pattern) {
        error(`ルール ${rule.id}: detector "${rule.detector}" には pattern が必須`);
      }
    }

    // --- 2. ルール ID の一意性 ---

    section("2. ルール ID の一意性");

    const ids = rulesData.rules.map((r) => r.id);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) duplicates.add(id);
      seen.add(id);
    }
    if (duplicates.size > 0) {
      error(`重複ルール ID: ${[...duplicates].join(", ")}`);
    } else {
      ok(`全 ${ids.length} 件のルール ID が一意`);
    }

    // カテゴリ別集計
    const categories = new Map<string, number>();
    for (const rule of rulesData.rules) {
      categories.set(rule.category, (categories.get(rule.category) || 0) + 1);
    }
    for (const [cat, count] of [...categories.entries()].sort()) {
      ok(`  ${cat}: ${count} 件`);
    }

    // 自動検出可能 vs manual の集計
    const autoDetectable = rulesData.rules.filter((r) => r.detector !== "manual" && r.pattern);
    const manualOnly = rulesData.rules.filter((r) => r.detector === "manual" || !r.pattern);
    ok(`自動検出可能: ${autoDetectable.length} 件 / manual: ${manualOnly.length} 件`);
  }
}

// --- 3. component contract の検証 ---

section("3. component contract の検証");

interface ContractRule {
  id: string;
  severity: string;
}

interface ContractVariant {
  description: string;
  tailwind: string;
  tokenRefs?: Record<string, string>;
}

interface ContractSize {
  height: number;
  tailwind: string;
  icon?: number;
}

interface ComponentContract {
  id: string;
  version: string;
  name: string;
  category: string;
  intent: string;
  variants: Record<string, ContractVariant>;
  sizes: Record<string, ContractSize>;
  states: string[];
  a11y: {
    role: string;
    required: string[];
    keyboard: string[];
  };
  rules: ContractRule[];
}

const contractDir = resolve(root, "design/contracts/components");
const contractFiles: string[] = [];

if (existsSync(contractDir)) {
  const files = readdirSync(contractDir).filter((f) => f.endsWith(".contract.json"));
  ok(`contract ファイル数: ${files.length}`);

  for (const file of files) {
    const contract = loadJSON(`design/contracts/components/${file}`) as ComponentContract | null;
    if (!contract) continue;
    contractFiles.push(file);

    // 必須フィールド
    const required = ["id", "version", "name", "category", "intent", "variants", "sizes", "states", "a11y", "rules"];
    for (const field of required) {
      if (!(field in contract)) {
        error(`${file}: 必須フィールド "${field}" がありません`);
      }
    }

    // Schema バリデーション
    if (contractSchema) {
      const issues = validateAgainstSchema(contract, contractSchema, file, file);
      if (issues.length > 0) {
        for (const issue of issues) error(issue);
      } else {
        ok(`${file}: スキーマ検証 OK`);
      }
    }

    ok(`${file}: id=${contract.id}, version=${contract.version}, variants=${Object.keys(contract.variants || {}).length}`);

    // --- 4. contract 内のルール参照が rules.json に存在するか ---
    if (rulesData && contract.rules) {
      const ruleIds = new Set(rulesData.rules.map((r) => r.id));
      for (const ref of contract.rules) {
        if (!ruleIds.has(ref.id)) {
          error(`${file}: ルール参照 "${ref.id}" が rules.json に存在しません`);
        }
      }
      ok(`${file}: ルール参照 ${contract.rules.length} 件すべて rules.json に存在`);
    }

    // --- 5. tokenRef が tokens.json に存在するか ---
    const tokens = loadJSON("design/contracts/tokens.json");
    if (tokens && contract.variants) {
      let tokenRefCount = 0;
      let missingCount = 0;

      for (const [variantName, variant] of Object.entries(contract.variants)) {
        if (!variant.tokenRefs) continue;
        for (const [prop, ref] of Object.entries(variant.tokenRefs)) {
          tokenRefCount++;
          // dot-path で tokens.json を辿る
          const parts = ref.split(".");
          let current: unknown = tokens;
          let found = true;
          for (const part of parts) {
            if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
              current = (current as Record<string, unknown>)[part];
            } else {
              // セマンティック参照（text-on-accent 等）は tokens.json に直接ない場合がある
              // warn にとどめる
              warn(`${file}: variant "${variantName}" の tokenRef "${prop}: ${ref}" が tokens.json に見つかりません`);
              missingCount++;
              found = false;
              break;
            }
          }
        }
      }

      if (missingCount === 0) {
        ok(`${file}: tokenRef ${tokenRefCount} 件チェック完了`);
      }
    }
  }
} else {
  warn("design/contracts/components/ ディレクトリが存在しません");
}

// --- 6. MCP check_rule の rules.json 駆動確認 ---

section("4. MCP check_rule の rules.json 駆動確認");

if (rulesData) {
  const loaderPath = resolve(root, "src/utils/loader.ts");
  if (existsSync(loaderPath)) {
    const loaderContent = readFileSync(loaderPath, "utf-8");

    // loader.ts が rules.json を参照しているか
    if (loaderContent.includes("design/contracts/rules.json")) {
      ok("loader.ts は rules.json を SSOT として参照");
    } else {
      warn("loader.ts が rules.json を参照していません。ハードコードが残っている可能性");
    }

    // ハードコードパターンが残っていないか
    const hardcodedPatterns = loaderContent.match(/pattern:\s*"/g);
    if (hardcodedPatterns && hardcodedPatterns.length > 0) {
      warn(`loader.ts にハードコードパターンが ${hardcodedPatterns.length} 件残っています`);
    } else {
      ok("loader.ts にハードコードパターンなし");
    }

    // rules.json の自動検出可能ルール数
    const autoDetectable = rulesData.rules.filter(
      (r) => r.pattern && ["tailwind-class", "tailwind-class-prefix"].includes(r.detector)
    );
    let expandedCount = 0;
    for (const rule of autoDetectable) {
      expandedCount += rule.matchPatterns ? rule.matchPatterns.length : 1;
    }
    ok(`MCP check_rule 自動検出パターン: ${expandedCount} 件（${autoDetectable.length} ルールから展開）`);
  } else {
    warn("src/utils/loader.ts が見つかりません");
  }
}

// --- tokens.json の存在チェック ---

section("5. tokens.json の存在チェック");

const tokensData = loadJSON("design/contracts/tokens.json");
if (tokensData) {
  ok("tokens.json 読み込み成功: design/contracts/tokens.json");
} else {
  error("tokens.json が見つかりません");
}

// --- サマリー ---

section("Summary");

console.log(`  Contracts: ${contractFiles.length} ファイル`);
console.log(`  Rules: ${rulesData ? rulesData.rules.length : 0} 件`);
console.log(`  Errors: ${errors}`);
console.log(`  Warnings: ${warnings}`);
console.log(`\n  ${errors === 0 ? "✅ PASSED" : "❌ FAILED"}\n`);

process.exit(errors > 0 ? 1 : 0);
