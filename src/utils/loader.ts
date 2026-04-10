import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Tokens, ComponentsData, ScreensData, ProhibitionRule } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

let tokensCache: Tokens | null = null;
let componentsCache: ComponentsData | null = null;
let screensCache: ScreensData | null = null;

export function loadTokens(): Tokens {
  if (!tokensCache) {
    tokensCache = JSON.parse(
      readFileSync(resolve(root, "tokens/tokens.json"), "utf-8")
    );
  }
  return tokensCache!;
}

export function loadComponents(): ComponentsData {
  if (!componentsCache) {
    componentsCache = JSON.parse(
      readFileSync(resolve(root, "metadata/components.json"), "utf-8")
    );
  }
  return componentsCache!;
}

export function loadScreens(): ScreensData {
  if (!screensCache) {
    screensCache = JSON.parse(
      readFileSync(resolve(root, "metadata/screens.json"), "utf-8")
    );
  }
  return screensCache!;
}

/** design/contracts/rules.json の型 */
interface RuleEntry {
  id: string;
  category: string;
  severity: string;
  description: string;
  detector: string;
  pattern: string | null;
  matchPatterns?: string[];
  alternative: string;
}

interface RulesFile {
  version: string;
  rules: RuleEntry[];
}

let rulesCache: ProhibitionRule[] | null = null;

/**
 * Prohibition rules loaded from design/contracts/rules.json (SSOT).
 * 自動検出可能なルール（tailwind-class / tailwind-class-prefix）のみ返す。
 * matchPatterns がある場合は展開する。
 */
export function getProhibitionRules(): ProhibitionRule[] {
  if (rulesCache) return rulesCache;

  const rulesPath = resolve(root, "design/contracts/rules.json");
  let rulesFile: RulesFile;
  try {
    rulesFile = JSON.parse(readFileSync(rulesPath, "utf-8"));
  } catch (e) {
    throw new Error(
      `[melta-ui] design/contracts/rules.json の読み込みに失敗しました: ${(e as Error).message}`
    );
  }

  const result: ProhibitionRule[] = [];
  for (const rule of rulesFile.rules) {
    // 自動検出可能なルールのみ
    if (!rule.pattern || !["tailwind-class", "tailwind-class-prefix"].includes(rule.detector)) {
      continue;
    }

    if (rule.matchPatterns && rule.matchPatterns.length > 0) {
      for (const mp of rule.matchPatterns) {
        result.push({ pattern: mp, reason: rule.description, alternative: rule.alternative });
      }
    } else {
      result.push({ pattern: rule.pattern, reason: rule.description, alternative: rule.alternative });
    }
  }

  rulesCache = result;
  return rulesCache;
}
