/**
 * coverage-stats.spec.ts — 検証カバレッジ集計の構造不変条件（P1-5）
 *
 * 公表する「静的自動検証 N/99」が嘘をつかないよう、集計の内訳と分類の整合を守る。
 * マジックナンバーに固定せず、ルール追加で自然に数字が動く前提で「構造」を検証する。
 */

import { test, expect } from "@playwright/test";
import { computeCoverage } from "../scripts/design/coverage-stats.js";
import { getAllRules } from "../src/utils/loader.js";

test.describe("coverage-stats: 集計の構造整合", () => {
  test("内訳の合計が total に一致する（取りこぼし無し）", () => {
    const c = computeCoverage();
    expect(c.staticAuto).toBe(c.classAuto + c.htmlAttr + c.composition);
    expect(c.staticAuto + c.coveredByTest + c.impossibleStatic + c.manualOnly).toBe(c.total);
  });

  test("auto 状態のルールは実際に検出機構を持つ", () => {
    for (const r of getAllRules()) {
      if (r.automationStatus !== "auto") continue;
      const detectable =
        r.pattern != null ||
        (r.matchPatterns?.length ?? 0) > 0 ||
        (r.prefixPatterns?.length ?? 0) > 0 ||
        r.htmlAttrCheck != null ||
        r.compositionCheck != null;
      expect(detectable, `${r.id} は auto だが検出機構が無い`).toBe(true);
    }
  });

  test("impossible-static は detector が manual/html-attr/composition（class 検出可能でない）", () => {
    for (const r of getAllRules()) {
      if (r.automationStatus !== "impossible-static") continue;
      expect(["manual", "html-attr", "composition"]).toContain(r.detector);
      // impossible-static は静的 spec を持たない（持つなら auto にすべき）
      expect(r.htmlAttrCheck == null && r.compositionCheck == null, `${r.id}`).toBe(true);
    }
  });

  test("静的自動検証は 41 件以上（P1-5 で 38→41 に到達した floor を割らない）", () => {
    // 退行ガード: 蘇生した composition a11y ルールが dead に戻ると割れる
    expect(computeCoverage().staticAuto).toBeGreaterThanOrEqual(41);
  });
});
