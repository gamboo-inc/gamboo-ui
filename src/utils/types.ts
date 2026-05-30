/** Token value with Tailwind class mapping */
export interface TokenValue {
  value: string | number | string[];
  tailwind?: string;
  cssVar?: string;
  px?: number;
  rem?: string;
  size?: string;
  lineHeight?: string;
  [key: string]: unknown;
}

/** tokens.json root structure */
export interface Tokens {
  version: string;
  color: {
    primary: Record<string, TokenValue>;
    body: TokenValue;
    semantic: {
      light: Record<string, TokenValue>;
      dark: Record<string, TokenValue>;
    };
    status: Record<string, Record<string, TokenValue>>;
  };
  typography: {
    fontFamily: Record<string, TokenValue>;
    fontSize: Record<string, TokenValue>;
    fontWeight: Record<string, TokenValue>;
    letterSpacing: Record<string, TokenValue>;
    lineHeight: Record<string, TokenValue>;
  };
  spacing: Record<string, TokenValue>;
  elevation: Record<string, TokenValue>;
  radius: Record<string, TokenValue>;
  motion: {
    duration: Record<string, TokenValue>;
    easing: Record<string, TokenValue>;
  };
  zIndex: Record<string, TokenValue>;
  wireframe?: Record<string, TokenValue>;
}

/** Component variant */
export interface ComponentVariant {
  name: string;
  tailwind: string;
}

/** Component size */
export interface ComponentSize {
  name: string;
  tailwind: string;
}

/** Component accessibility spec */
export interface ComponentAccessibility {
  role: string;
  required: string[];
  focusRing: string;
}

/** Single component metadata */
export interface ComponentMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  docPath: string;
  variants: ComponentVariant[];
  sizes: ComponentSize[];
  accessibility: ComponentAccessibility;
  prohibited: string[];
  htmlSample: string | Record<string, string>;
}

/** components.json root structure */
export interface ComponentsData {
  version: string;
  components: ComponentMeta[];
}

/** Screen state (user-toggled via in-app UI) */
export interface ScreenState {
  id: string;
  label: string;
  query?: string;
}

/** Screen variant (system/data-driven condition) */
export interface ScreenVariant {
  id: string;
  label: string;
  query: string;
}

/** Screen pattern (design alternative for comparison) */
export interface ScreenPattern {
  id: string;
  label: string;
  description?: string;
  query: string;
  group?: string;
}

/** Single screen metadata */
export interface ScreenMeta {
  id: string;
  label: string;
  path: string;
  category?: string;
  states: ScreenState[];
  variants: ScreenVariant[];
  patterns: ScreenPattern[];
  linksTo: string[];
  components: string[];
}

/** screens.json root structure */
export interface ScreensData {
  version: string;
  screens: ScreenMeta[];
}

/**
 * html-attr ルールの機械可読検出仕様（Q5）。
 * cheerio 等の DOM パーサ未導入のため正規表現ベースで presence/absence/値を判定する。
 * 文脈依存（role=dialog を要する modal の特定など）は表現できず、対象外。
 */
export type HtmlAttrCheck =
  /** attr の値が valueRegex にマッチしたら違反（例: tabindex の正値） */
  | { kind: "attr-value-forbidden"; attr: string; valueRegex: string }
  /** tag が requiredAttr を持たなければ違反（例: <th> の scope 欠落） */
  | { kind: "tag-missing-attr"; tag: string; requiredAttr: string }
  /** tag[attr=attrValue] が存在したら違反（例: <input type="date"> の native datepicker） */
  | { kind: "element-present"; tag: string; attr: string; attrValue: string };

/** rules.json の rule entry（SSOT raw 型） */
export interface RuleEntry {
  id: string;
  category: string;
  severity: "error" | "warn";
  description: string;
  detector: "tailwind-class" | "tailwind-class-prefix" | "tailwind-class-segment" | "html-attr" | "manual";
  pattern: string | null;
  matchPatterns?: string[];
  alternative: string;
  /** P1b contract lint での適用方針。required（rules.json schema でも required 化済み） */
  contractLint: "enforce" | "warn" | "skip";
  /** true の場合、ルールは特定の文脈でのみ NG。contract lint からは skip するが、AI には参照させたい */
  requiresContext?: boolean;
  /** detector="html-attr" のうち機械判定できるものに付与（Q5）。属性検査の spec */
  htmlAttrCheck?: HtmlAttrCheck;
}

/** lint-core / attr-lint が返す 1 件の違反 */
export interface LintViolation {
  ruleId: string;
  severity: "error" | "warn";
  /** 違反した実際の class token / 属性スニペット（raw） */
  token: string;
  category: string;
  reason: string;
  alternative: string;
}

/** rules.json ファイル全体 */
export interface RulesFile {
  version: string;
  rules: RuleEntry[];
}

/** get_rules / getAllRules で使う絞り込み条件 */
export interface RuleFilter {
  category?: string;
  severity?: "error" | "warn";
  detector?: "tailwind-class" | "tailwind-class-prefix" | "tailwind-class-segment" | "html-attr" | "manual";
}

/**
 * Tailwind class token の正規化結果。
 * matcher.tokenize() の出力 / matcher.matches() の入力。
 *
 * 例: "hover:!bg-blue-500" → { raw: "hover:!bg-blue-500", base: "bg-blue-500",
 *                              variants: ["hover"], important: true }
 */
export interface MatchContext {
  raw: string;
  base: string;
  variants: string[];
  important: boolean;
}

/** check_rule が使う展開済みルール型（matchPatterns 展開後） */
export interface ProhibitionRule {
  ruleId: string;
  severity: "error" | "warn";
  pattern: string;
  reason: string;
  alternative: string;
}

/** check_rule の violation 出力 */
export interface Violation {
  ruleId: string;
  severity: "error" | "warn";
  class: string;
  reason: string;
  alternative: string;
}

/** P4 benchmark 用 — provider abstraction signature（B8 前倒し） */
export interface GenerationResult {
  text: string;
  toolCalls?: Array<{
    name: string;
    arguments: unknown;
    result: unknown;
  }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
  latencyMs: number;
  resourcesAccessed?: string[];
}

export interface ModelProvider {
  id: string;
  generate(system: string, prompt: string): Promise<GenerationResult>;
}
