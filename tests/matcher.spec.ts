/**
 * matcher.ts の単体テスト（P1a）
 *
 * 旧 cls.includes 誤検出が消えること、Tailwind の variant / important /
 * arbitrary variant / arbitrary value が正しく分離されることを検証する。
 */

import { test, expect } from "@playwright/test";
import { tokenize, matches } from "../src/utils/matcher.js";
import type { RuleEntry } from "../src/utils/types.js";

// ---------- tokenize ----------

test.describe("tokenize: 基本", () => {
  test("空文字列は空配列を返す", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });

  test("空白で複数 token に分割", () => {
    const result = tokenize("p-4 m-2 text-base");
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.base)).toEqual(["p-4", "m-2", "text-base"]);
  });

  test("variant なしの基本 class", () => {
    const [ctx] = tokenize("bg-blue-500");
    expect(ctx).toEqual({
      raw: "bg-blue-500",
      base: "bg-blue-500",
      variants: [],
      important: false,
    });
  });
});

test.describe("tokenize: variant", () => {
  test("単一 variant を剥がす", () => {
    const [ctx] = tokenize("hover:bg-blue-500");
    expect(ctx.base).toBe("bg-blue-500");
    expect(ctx.variants).toEqual(["hover"]);
    expect(ctx.important).toBe(false);
  });

  test("複数 variant を剥がす", () => {
    const [ctx] = tokenize("md:hover:bg-blue-500");
    expect(ctx.base).toBe("bg-blue-500");
    expect(ctx.variants).toEqual(["md", "hover"]);
  });
});

test.describe("tokenize: !important", () => {
  test("!important を剥がす", () => {
    const [ctx] = tokenize("!text-black");
    expect(ctx.base).toBe("text-black");
    expect(ctx.important).toBe(true);
  });

  test("variant + !important", () => {
    const [ctx] = tokenize("md:!text-black");
    expect(ctx.base).toBe("text-black");
    expect(ctx.variants).toEqual(["md"]);
    expect(ctx.important).toBe(true);
  });
});

test.describe("tokenize: arbitrary", () => {
  test("arbitrary variant を剥がす", () => {
    const [ctx] = tokenize("[&>*]:p-0");
    expect(ctx.base).toBe("p-0");
    expect(ctx.variants).toEqual(["[&>*]"]);
  });

  test("arbitrary value は base の一部（variant にしない）", () => {
    const [ctx] = tokenize("space-x-[12px]");
    expect(ctx.base).toBe("space-x-[12px]");
    expect(ctx.variants).toEqual([]);
  });

  test("arbitrary variant + 通常 variant の組み合わせ", () => {
    const [ctx] = tokenize("md:[&:nth-child(odd)]:bg-gray-50");
    expect(ctx.base).toBe("bg-gray-50");
    expect(ctx.variants).toEqual(["md", "[&:nth-child(odd)]"]);
  });

  test("arbitrary variant 内部の `:` で誤って split しない", () => {
    const [ctx] = tokenize("[&:hover]:text-blue-500");
    expect(ctx.base).toBe("text-blue-500");
    expect(ctx.variants).toEqual(["[&:hover]"]);
  });
});

// ---------- matches ----------

const ruleTextBlack: RuleEntry = {
  id: "COLOR_NO_TEXT_BLACK",
  category: "color",
  severity: "error",
  description: "純黒は禁止",
  detector: "tailwind-class",
  pattern: "text-black",
  alternative: "text-slate-900",
};

const rulePZero: RuleEntry = {
  id: "SPACE_NO_P0_CARDS",
  category: "spacing",
  severity: "error",
  description: "padding 0 のカード禁止",
  detector: "tailwind-class",
  pattern: "p-0",
  alternative: "p-4 以上",
};

const ruleBgBluePrefix: RuleEntry = {
  id: "COLOR_NO_BG_BLUE",
  category: "color",
  severity: "error",
  description: "primary 以外の青系 bg 禁止",
  detector: "tailwind-class-prefix",
  pattern: "bg-blue-",
  alternative: "bg-primary-*",
};

const ruleWithMatchPatterns: RuleEntry = {
  id: "COLOR_NO_DARK_BG_GRAY",
  category: "color",
  severity: "error",
  description: "暗いグレー背景禁止",
  detector: "tailwind-class-prefix",
  pattern: "bg-gray-[3-9]00",
  matchPatterns: [
    "bg-gray-300",
    "bg-gray-400",
    "bg-gray-500",
    "bg-gray-600",
    "bg-gray-700",
    "bg-gray-800",
    "bg-gray-900",
  ],
  alternative: "bg-gray-50 〜 bg-gray-200",
};

const ruleManual: RuleEntry = {
  id: "FORM_LABEL_REQUIRED",
  category: "form",
  severity: "error",
  description: "フォームに label 必須",
  detector: "manual",
  pattern: null,
  alternative: "label を付ける",
};

test.describe("matches: tailwind-class（完全一致）", () => {
  test("base が pattern と一致 → true", () => {
    const [ctx] = tokenize("text-black");
    expect(matches(ruleTextBlack, ctx)).toBe(true);
  });

  test("variant 付きでも base 一致なら true", () => {
    const [ctx] = tokenize("hover:text-black");
    expect(matches(ruleTextBlack, ctx)).toBe(true);
  });

  test("!important + variant でも base 一致なら true", () => {
    const [ctx] = tokenize("md:!text-black");
    expect(matches(ruleTextBlack, ctx)).toBe(true);
  });

  test("base が異なる → false", () => {
    const [ctx] = tokenize("text-slate-900");
    expect(matches(ruleTextBlack, ctx)).toBe(false);
  });
});

test.describe("matches: tailwind-class-prefix", () => {
  test("base が pattern で始まる → true", () => {
    const [ctx] = tokenize("bg-blue-500");
    expect(matches(ruleBgBluePrefix, ctx)).toBe(true);
  });

  test("variant 付きでも base prefix 一致なら true", () => {
    const [ctx] = tokenize("hover:bg-blue-500");
    expect(matches(ruleBgBluePrefix, ctx)).toBe(true);
  });

  test("opacity modifier 付きでも prefix 一致なら true", () => {
    const [ctx] = tokenize("bg-blue-500/20");
    expect(matches(ruleBgBluePrefix, ctx)).toBe(true);
  });

  test("matchPatterns があればそれを優先", () => {
    const [ctx500] = tokenize("bg-gray-500");
    expect(matches(ruleWithMatchPatterns, ctx500)).toBe(true);

    const [ctx100] = tokenize("bg-gray-100");
    expect(matches(ruleWithMatchPatterns, ctx100)).toBe(false);
  });
});

test.describe("matches: 旧 cls.includes 誤検出の解消", () => {
  test("'top-0' は 'p-0' ルールに誤検出されない", () => {
    // 旧 src/tools/check-rule.ts:20 の cls.includes("p-0") では
    // "top-0".includes("p-0") === true で誤検出していた
    const [ctx] = tokenize("top-0");
    expect(matches(rulePZero, ctx)).toBe(false);
  });

  test("'p-0' は 'p-0' ルールに正しく検出される", () => {
    const [ctx] = tokenize("p-0");
    expect(matches(rulePZero, ctx)).toBe(true);
  });

  test("'hover:p-0' も検出される（variant 剥がして判定）", () => {
    const [ctx] = tokenize("hover:p-0");
    expect(matches(rulePZero, ctx)).toBe(true);
  });

  test("'gap-0.5' は 'gap-0' ルールに誤検出されない（仮ルールで確認）", () => {
    const ruleGap0: RuleEntry = {
      id: "TEST_GAP_0",
      category: "spacing",
      severity: "error",
      description: "test",
      detector: "tailwind-class",
      pattern: "gap-0",
      alternative: "gap-2",
    };
    const [ctx] = tokenize("gap-0.5");
    expect(matches(ruleGap0, ctx)).toBe(false);
  });
});

test.describe("matches: 非class detector", () => {
  test("manual ルールは class matching では false", () => {
    const [ctx] = tokenize("text-black");
    expect(matches(ruleManual, ctx)).toBe(false);
  });
});

// ---------- prefix 境界回帰テスト（CODEX レビュー対応） ----------

test.describe("matches: prefix 境界（matchPatterns 偽陽性回帰）", () => {
  test("'bg-gray-300x' は 'bg-gray-300' に誤検出されない", () => {
    // matchPatterns の startsWith を `${p}/` 限定にした修正の回帰テスト。
    // 旧実装 (startsWith(p)) では `bg-gray-300x` も拾ってしまっていた。
    const [ctx] = tokenize("bg-gray-300x");
    expect(matches(ruleWithMatchPatterns, ctx)).toBe(false);
  });

  test("'bg-gray-300' 完全一致は検出される", () => {
    const [ctx] = tokenize("bg-gray-300");
    expect(matches(ruleWithMatchPatterns, ctx)).toBe(true);
  });

  test("'bg-gray-300/20' opacity modifier 付きは検出される", () => {
    const [ctx] = tokenize("bg-gray-300/20");
    expect(matches(ruleWithMatchPatterns, ctx)).toBe(true);
  });

  test("pattern 直接指定（matchPatterns なし）は startsWith のまま", () => {
    // "bg-blue-" のような末尾区切り意図の prefix は無限拡張可能で意図通り
    const [ctx500] = tokenize("bg-blue-500");
    const [ctx500x] = tokenize("bg-blue-500x");
    expect(matches(ruleBgBluePrefix, ctx500)).toBe(true);
    expect(matches(ruleBgBluePrefix, ctx500x)).toBe(true); // pattern 設計上意図的
  });
});

// ---------- tokenize エッジケース（CODEX レビュー対応） ----------

test.describe("tokenize: arbitrary value のエッジケース", () => {
  test("色の arbitrary value: bg-[#ff0000]", () => {
    const [ctx] = tokenize("bg-[#ff0000]");
    expect(ctx.base).toBe("bg-[#ff0000]");
    expect(ctx.variants).toEqual([]);
  });

  test("variant + 色の arbitrary value: hover:bg-[#ff0000]", () => {
    const [ctx] = tokenize("hover:bg-[#ff0000]");
    expect(ctx.base).toBe("bg-[#ff0000]");
    expect(ctx.variants).toEqual(["hover"]);
  });
});

test.describe("tokenize: arbitrary variant の複雑系", () => {
  test("ネストした角括弧: [&[data-x]]:p-0", () => {
    const [ctx] = tokenize("[&[data-x]]:p-0");
    expect(ctx.base).toBe("p-0");
    expect(ctx.variants).toEqual(["[&[data-x]]"]);
  });

  test("連続 arbitrary variant: [&:hover]:[&:focus]:bg-red-500", () => {
    const [ctx] = tokenize("[&:hover]:[&:focus]:bg-red-500");
    expect(ctx.base).toBe("bg-red-500");
    expect(ctx.variants).toEqual(["[&:hover]", "[&:focus]"]);
  });
});

test.describe("tokenize: 不正入力の安全性", () => {
  test("`:` だけの token は variant 判定されず base に残る（parser が無限ループしない確認）", () => {
    // findVariantColon は colonIdx > 0 を要求するため、先頭が `:` の token は
    // variant 剥がしされない。挙動として base = ":" になる。
    // ここでは「parser が安全に終わる」ことが本旨。
    const [ctx] = tokenize(":");
    expect(ctx.base).toBe(":");
    expect(ctx.variants).toEqual([]);
  });

  test("`!` だけの token は important のみ true", () => {
    const [ctx] = tokenize("!");
    expect(ctx.base).toBe("");
    expect(ctx.important).toBe(true);
  });

  test("孤立した `[` で始まり対応 `]` がない token は base 扱い", () => {
    // 形不正だが parse は安全に終わるべき
    const [ctx] = tokenize("[abc");
    expect(ctx.base).toBe("[abc");
    expect(ctx.variants).toEqual([]);
  });

  test("末尾が `:` の token は無限ループしない", () => {
    const [ctx] = tokenize("hover:");
    // 'hover' を variant として剥がした後、rest は空文字列
    expect(ctx.base).toBe("");
    expect(ctx.variants).toEqual(["hover"]);
  });
});
