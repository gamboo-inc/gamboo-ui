/**
 * lint-core.ts の統合テスト（Q2: arbitrary 値検知）
 *
 * rules.json（実 SSOT）→ loader → matcher → lint-core の経路を通しで検証する。
 * hook-check-rule.sh / lint-generated.ts はこの lintSource を共有するので、
 * ここが Q2（arbitrary 値による色・影・font の検知すり抜け塞ぎ）の回帰ガードになる。
 *
 * 最重要の非回帰: DESIGN.md が正規記法として推奨する font-size の arbitrary 値
 * （text-[1rem] / text-[0.875rem] / text-[10px]）を誤検知しないこと。
 * これが守れないと contract/docs の 70+ 箇所が一斉に false positive になる。
 */

import { test, expect } from "@playwright/test";
import { lintSource } from "../src/utils/lint-core.js";

function ruleIds(source: string): string[] {
  return lintSource(source).map((v) => v.ruleId);
}

test.describe("lint-core Q2: arbitrary 値で色・影・font 禁止を回避できない", () => {
  test("text-[#000000] は COLOR_NO_ARBITRARY_TEXT_HEX で検知", () => {
    expect(ruleIds('<div class="text-[#000000]"></div>')).toContain(
      "COLOR_NO_ARBITRARY_TEXT_HEX"
    );
  });

  test("bg-[#3b82f6] は COLOR_NO_ARBITRARY_BG_HEX で検知", () => {
    expect(ruleIds('<div class="bg-[#3b82f6]"></div>')).toContain(
      "COLOR_NO_ARBITRARY_BG_HEX"
    );
  });

  test("border-[#e5e7eb] は COLOR_NO_ARBITRARY_BORDER_HEX で検知", () => {
    expect(ruleIds('<div class="border-[#e5e7eb]"></div>')).toContain(
      "COLOR_NO_ARBITRARY_BORDER_HEX"
    );
  });

  test("shadow-[0_0_40px_#0ff] は SPACE_NO_ARBITRARY_SHADOW で検知", () => {
    expect(ruleIds('<div class="shadow-[0_0_40px_#0ff]"></div>')).toContain(
      "SPACE_NO_ARBITRARY_SHADOW"
    );
  });

  test("font-[300] は TYPO_NO_ARBITRARY_FONT で検知", () => {
    expect(ruleIds('<div class="font-[300]"></div>')).toContain(
      "TYPO_NO_ARBITRARY_FONT"
    );
  });

  test("variant 付き（hover:/md:）でも剥がして検知", () => {
    expect(ruleIds('<div class="hover:text-[#ff0000] md:bg-[#fff]"></div>')).toEqual(
      expect.arrayContaining([
        "COLOR_NO_ARBITRARY_TEXT_HEX",
        "COLOR_NO_ARBITRARY_BG_HEX",
      ])
    );
  });

  test("className（JSX）でも検知", () => {
    expect(ruleIds('<div className="text-[#000]"></div>')).toContain(
      "COLOR_NO_ARBITRARY_TEXT_HEX"
    );
  });

  test("検知された arbitrary 値は warn 止まり（error にしない）", () => {
    const v = lintSource('<div class="text-[#000000] shadow-[1px_1px]"></div>');
    expect(v.length).toBeGreaterThan(0);
    expect(v.every((x) => x.severity === "warn")).toBe(true);
  });
});

test.describe("lint-core Q2: 正規の arbitrary 値を誤検知しない（最重要の非回帰）", () => {
  // DESIGN.md Quick Ref が text-[1rem] 等を font-size の正規記法として推奨している。
  // #始まりの色だけを対象にすることで、これらを誤爆しない。
  test("font-size の arbitrary 値（text-[1rem] / text-[0.875rem] / text-[10px]）は素通り", () => {
    expect(lintSource('<div class="text-[1rem] text-[0.875rem] text-[10px]"></div>')).toEqual(
      []
    );
  });

  test("レイアウト系 arbitrary 値（w-[1200px] / h-[40px]）は Q2 の対象外", () => {
    // 固定幅は Q4(responsive) の領域で、Q2 では拾わない
    const ids = ruleIds('<div class="w-[1200px] h-[40px]"></div>');
    expect(ids).not.toContain("COLOR_NO_ARBITRARY_TEXT_HEX");
    expect(ids).not.toContain("COLOR_NO_ARBITRARY_BG_HEX");
  });

  test("トークン経由の正規クラスは全て素通り", () => {
    expect(
      lintSource(
        '<div class="bg-white text-slate-900 border-slate-200 shadow-sm font-medium rounded-lg"></div>'
      )
    ).toEqual([]);
  });

  test("border-[1px]（太さ指定）は #始まりでないので素通り", () => {
    expect(ruleIds('<div class="border-[1px]"></div>')).not.toContain(
      "COLOR_NO_ARBITRARY_BORDER_HEX"
    );
  });
});
