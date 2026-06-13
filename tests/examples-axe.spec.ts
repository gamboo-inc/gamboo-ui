/**
 * examples-axe.spec.ts — examples/ 全ページの a11y ゲート（P1-5）
 *
 * examples は AI が模倣する手本テンプレート。ここに a11y 違反があると DS 全体の
 * 信頼性を損なう（red-team 監査 V1-V4）。critical / serious を 0 に gate し、
 * 手本の劣化を CI で止める。color-contrast は Tailwind CDN の動的 inline style と
 * axe の静的解析が噛み合わず誤検出が多いため除外（showcase.spec と同方針）。
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const pages = readdirSync(resolve("examples"))
  .filter((f) => f.endsWith(".html"))
  .sort();

test.describe("examples a11y ゲート（critical / serious = 0）", () => {
  for (const file of pages) {
    test(`${file}`, async ({ page }) => {
      await page.goto(`/examples/${file}`);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();
      const critical = results.violations.filter((v) => v.impact === "critical");
      const serious = results.violations.filter((v) => v.impact === "serious");
      const fmt = (vs: typeof results.violations) =>
        vs.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`).join("\n  ");
      if (critical.length || serious.length) {
        console.log(`${file} 違反:\n  ${fmt([...critical, ...serious])}`);
      }
      expect(critical, `${file} critical`).toHaveLength(0);
      expect(serious, `${file} serious`).toHaveLength(0);
    });
  }
});
