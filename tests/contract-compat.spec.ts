import { expect, test } from "@playwright/test";
import {
  type Bundle,
  type RuleSurface,
  bumpViolation,
  diffBundles,
  flattenTokens,
  semverGreater,
  tokenNodeAt,
  isTokenLeaf,
} from "../scripts/design/contract-compat.js";

/** RuleSurface のテスト用ファクトリ（意味フィールドは undefined 既定、部分上書き可） */
function rule(overrides: Partial<RuleSurface> & { id: string }): RuleSurface {
  return {
    severity: "error",
    detector: "tailwind-class",
    pattern: "text-black",
    prefixPatterns: undefined,
    matchPatterns: undefined,
    htmlAttrCheck: undefined,
    compositionCheck: undefined,
    contractLint: undefined,
    ...overrides,
  };
}

/** テスト用の最小 Bundle を組み立てる。raw は tokens/rules のみ既定生成、契約分は明示追加 */
function bundle(overrides: Partial<Bundle> = {}): Bundle {
  const tokens = overrides.tokens ?? { color: { primary: { "500": "#7C3AED" } } };
  const rules = overrides.rules ?? new Map([["COLOR_NO_TEXT_BLACK", rule({ id: "COLOR_NO_TEXT_BLACK" })]]);
  const contracts =
    overrides.contracts ??
    new Map([
      [
        "button",
        { id: "button", variants: ["contained", "outlined"], sizes: ["small"], states: ["default", "hover"] },
      ],
    ]);
  const raw =
    overrides.raw ??
    new Map([
      ["tokens.json", JSON.stringify(tokens)],
      ["rules.json", JSON.stringify([...rules.values()])],
      ["components/button.contract.json", JSON.stringify([...contracts.values()][0])],
    ]);
  const componentFileIds =
    overrides.componentFileIds ??
    new Map([...contracts.keys()].map((id) => [`components/${id}.contract.json`, id]));
  return { version: overrides.version ?? "0.1.0", tokens, rules, contracts, raw, componentFileIds };
}

test.describe("contract-compat: breaking 分類", () => {
  test("token path 削除と型変更は breaking、値変更と追加は compatible", () => {
    const latest = bundle({
      tokens: { color: { primary: { "500": "#7C3AED", "700": "#5B21B6" } }, spacing: { "2": 8 } },
    });
    const head = bundle({
      tokens: { color: { primary: { "500": "#6D28D9" } }, spacing: { "2": "8px" }, radius: { md: 8 } },
    });
    const diff = diffBundles(latest, head);
    expect(diff.breaking).toContainEqual(expect.stringContaining("token 削除: color.primary.700"));
    expect(diff.breaking).toContainEqual(expect.stringContaining("token 型変更: spacing.2"));
    expect(diff.compatible).toContainEqual(expect.stringContaining("token 値変更: color.primary.500"));
    expect(diff.compatible).toContainEqual(expect.stringContaining("token 追加: radius.md"));
  });

  test("contract 削除 / variant・state 削除は breaking、追加は compatible", () => {
    const latest = bundle({
      contracts: new Map([
        ["button", { id: "button", variants: ["contained", "outlined"], sizes: [], states: ["default"] }],
        ["modal", { id: "modal", variants: [], sizes: [], states: ["open"] }],
      ]),
    });
    const head = bundle({
      contracts: new Map([
        ["button", { id: "button", variants: ["contained", "brand-outline"], sizes: [], states: ["default"] }],
      ]),
    });
    const diff = diffBundles(latest, head);
    expect(diff.breaking).toContainEqual(expect.stringContaining("contract 削除: modal"));
    expect(diff.breaking).toContainEqual(expect.stringContaining("variants 削除: outlined"));
    expect(diff.compatible).toContainEqual(expect.stringContaining("variants 追加: brand-outline"));
  });

  test("rule の detector / severity / pattern 変更と id 削除は breaking（rename 推定なし）", () => {
    const latest = bundle();
    const head = bundle({
      rules: new Map([["COLOR_NO_TEXT_BLACK", rule({ id: "COLOR_NO_TEXT_BLACK", severity: "warn" })]]),
    });
    const diff = diffBundles(latest, head);
    expect(diff.breaking).toContainEqual(expect.stringContaining("severity 変更"));

    const renamed = bundle({
      rules: new Map([["COLOR_NO_PURE_BLACK_TEXT", rule({ id: "COLOR_NO_PURE_BLACK_TEXT" })]]),
    });
    const renameDiff = diffBundles(latest, renamed);
    expect(renameDiff.breaking).toContainEqual(expect.stringContaining("rule 削除: COLOR_NO_TEXT_BLACK"));
    expect(renameDiff.compatible).toContainEqual(expect.stringContaining("rule 追加: COLOR_NO_PURE_BLACK_TEXT"));
  });

  test("rule の検出意味フィールド（matchPatterns / compositionCheck / contractLint）変更も breaking", () => {
    const latest = bundle({
      rules: new Map([
        ["RULE_X", rule({ id: "RULE_X", matchPatterns: ["shadow-lg", "shadow-xl"], contractLint: "enforce" })],
      ]),
    });
    const head = bundle({
      rules: new Map([
        ["RULE_X", rule({ id: "RULE_X", matchPatterns: ["shadow-lg"], contractLint: "enforce" })],
      ]),
    });
    expect(diffBundles(latest, head).breaking).toContainEqual(expect.stringContaining("matchPatterns 変更"));

    const head2 = bundle({
      rules: new Map([
        ["RULE_X", rule({ id: "RULE_X", matchPatterns: ["shadow-lg", "shadow-xl"], contractLint: undefined })],
      ]),
    });
    expect(diffBundles(latest, head2).breaking).toContainEqual(expect.stringContaining("contractLint 変更"));

    const head3 = bundle({
      rules: new Map([
        [
          "RULE_X",
          rule({
            id: "RULE_X",
            matchPatterns: ["shadow-lg", "shadow-xl"],
            contractLint: "enforce",
            compositionCheck: { kind: "dom-attr-required" },
          }),
        ],
      ]),
    });
    expect(diffBundles(latest, head3).breaking).toContainEqual(expect.stringContaining("compositionCheck 変更"));
  });

  test("contract file の rename（id 存続 / path 変更）は公開 import path 破壊として breaking", () => {
    const latest = bundle();
    const head = bundle({
      raw: new Map([
        ["tokens.json", latest.raw.get("tokens.json")!],
        ["rules.json", latest.raw.get("rules.json")!],
        ["components/btn.contract.json", latest.raw.get("components/button.contract.json")!],
      ]),
      componentFileIds: new Map([["components/btn.contract.json", "button"]]),
    });
    const diff = diffBundles(latest, head);
    expect(diff.breaking).toContainEqual(
      expect.stringContaining("公開ファイル削除: components/button.contract.json")
    );
    expect(diff.breaking).toContainEqual(expect.stringContaining("rename"));
  });

  test("golden 比較: 表面に映らないフィールド変更でもファイル変更として検出する", () => {
    const latest = bundle();
    const head = bundle({
      raw: new Map([
        ["tokens.json", latest.raw.get("tokens.json")!],
        ["rules.json", latest.raw.get("rules.json")!],
        // stateSpecs 追加相当 = 表面（variants/sizes/states）は不変だが中身は変わっている
        ["components/button.contract.json", JSON.stringify({ id: "button", stateSpecs: { disabled: {} } })],
      ]),
    });
    const diff = diffBundles(latest, head);
    expect(diff.breaking).toHaveLength(0);
    expect(diff.compatible).toContainEqual(
      expect.stringContaining("ファイル内容変更: components/button.contract.json")
    );
  });

  test("差分ゼロなら breaking も compatible も空", () => {
    const diff = diffBundles(bundle(), bundle());
    expect(diff.breaking).toHaveLength(0);
    expect(diff.compatible).toHaveLength(0);
  });
});

test.describe("contract-compat: semver 強制", () => {
  test("0.x 台の breaking は minor bump で満たされる（npm caret 慣習）", () => {
    const diff = { breaking: ["rule X: severity 変更"], compatible: [] };
    expect(bumpViolation(diff, "0.1.0", "0.1.1")).toContain("minor bump");
    expect(bumpViolation(diff, "0.1.0", "0.2.0")).toBeNull();
    expect(bumpViolation(diff, "0.1.0", "1.0.0")).toBeNull();
  });

  test("1.x 以降の breaking は major bump 必須", () => {
    const diff = { breaking: ["contract 削除: modal"], compatible: [] };
    expect(bumpViolation(diff, "1.2.0", "1.3.0")).toContain("major bump");
    expect(bumpViolation(diff, "1.2.0", "2.0.0")).toBeNull();
  });

  test("互換変更のみなら version > latest を要求、差分ゼロなら据置可", () => {
    const compatOnly = { breaking: [], compatible: ["token 追加: radius.md"] };
    expect(bumpViolation(compatOnly, "0.1.0", "0.1.0")).toContain("version bump がありません");
    expect(bumpViolation(compatOnly, "0.1.0", "0.1.1")).toBeNull();
    const noChange = { breaking: [], compatible: [] };
    expect(bumpViolation(noChange, "0.1.0", "0.1.0")).toBeNull();
  });
});

test.describe("contract-compat: ユーティリティ", () => {
  test("flattenTokens は配列を 1 leaf として型タグ付きで保持する", () => {
    const flat = flattenTokens({ motion: { easing: [0.4, 0, 0.2, 1] }, version: "1.0.0" });
    expect(flat.get("motion.easing")).toBe(`array:${JSON.stringify([0.4, 0, 0.2, 1])}`);
    expect(flat.get("version")).toBe('string:"1.0.0"');
  });

  test("semverGreater はプレーンな数値比較", () => {
    expect(semverGreater("0.2.0", "0.1.9")).toBe(true);
    expect(semverGreater("0.1.0", "0.1.0")).toBe(false);
    expect(semverGreater("1.0.0", "0.9.9")).toBe(true);
  });

  test("isTokenLeaf: leaf（value / size 保有）だけ true、group ノードは false", () => {
    const tokens = {
      color: { primary: { "500": { value: "#2b70ef", tailwind: "primary-500" } } },
      typography: { fontSize: { base: { size: "1.125rem", px: 18 } } },
    };
    expect(isTokenLeaf(tokenNodeAt(tokens, "color.primary.500"))).toBe(true);
    expect(isTokenLeaf(tokenNodeAt(tokens, "typography.fontSize.base"))).toBe(true);
    expect(isTokenLeaf(tokenNodeAt(tokens, "color.primary"))).toBe(false); // group 参照は不正
    expect(isTokenLeaf(tokenNodeAt(tokens, "typography.fontSize"))).toBe(false);
    expect(isTokenLeaf(tokenNodeAt(tokens, "color.missing.path"))).toBe(false);
  });
});
