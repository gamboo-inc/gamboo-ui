/**
 * benchmark-pipeline.spec.ts — ベンチ集計パイプラインの回帰テスト（P1-4 Slice 4）
 *
 * CI は live API を叩かない。代わりに (1) stats 純関数、(2) mock provider →
 * scoreHTML の経路を検証し、「3 条件で単調に準拠スコアが上がる」不変条件と
 * 集計ロジックの回帰を防ぐ。実数値は anthropic provider の実測でのみ得る。
 */

import { test, expect } from "@playwright/test";
import { summarize, computeLift } from "../design/benchmarks/stats.js";
import { scoreHTML } from "../design/benchmarks/score.js";
import { createMockProvider } from "../design/benchmarks/providers/mock.js";

test.describe("stats: 集計純関数", () => {
  test("summarize は mean/min/max/stdev/n を返す", () => {
    const s = summarize([80, 82, 85]);
    expect(s.n).toBe(3);
    expect(s.mean).toBeCloseTo(82.33, 1);
    expect(s.min).toBe(80);
    expect(s.max).toBe(85);
    expect(s.stdev).toBeGreaterThan(0);
  });

  test("空配列はゼロ Summary", () => {
    expect(summarize([])).toEqual({ n: 0, mean: 0, min: 0, max: 0, stdev: 0 });
  });

  test("computeLift は絶対差と相対％（base=0 は null）", () => {
    expect(computeLift(50, 80)).toEqual({ abs: 30, pct: 60 });
    expect(computeLift(0, 80)).toEqual({ abs: 80, pct: null });
  });
});

test.describe("mock provider × scoreHTML: 条件で単調に準拠が上がる", () => {
  const DESIGNMD_SYSTEM =
    "あなたは melta UI デザインシステムに準拠した UI を生成するエキスパートです。... Design Constitution ...";
  const COLD_SYSTEM = "あなたは UI を生成するエキスパートです。";

  test("cold < designmd < full（DS を足すほど準拠スコアが上がる）", async () => {
    const provider = createMockProvider();
    const cold = scoreHTML((await provider.generate(COLD_SYSTEM, "x", { useTools: false })).text);
    const designmd = scoreHTML(
      (await provider.generate(DESIGNMD_SYSTEM, "x", { useTools: false })).text
    );
    const full = scoreHTML(
      (await provider.generate(DESIGNMD_SYSTEM, "x", { useTools: true })).text
    );

    expect(cold.totalScore).toBeLessThan(designmd.totalScore);
    expect(designmd.totalScore).toBeLessThanOrEqual(full.totalScore);
    // cold は禁止パターンで error を出す（ベースラインが低いことの保証）
    expect(cold.ruleViolations).toBeGreaterThan(0);
    // full は違反ゼロ
    expect(full.ruleViolations).toBe(0);
  });

  test("full 条件は tools 使用・cold は不使用（tool 切替が効いている）", async () => {
    const provider = createMockProvider();
    const full = await provider.generate(DESIGNMD_SYSTEM, "x", { useTools: true });
    const cold = await provider.generate(COLD_SYSTEM, "x", { useTools: false });
    expect((full.toolCalls ?? []).length).toBeGreaterThan(0);
    expect((cold.toolCalls ?? []).length).toBe(0);
  });
});
