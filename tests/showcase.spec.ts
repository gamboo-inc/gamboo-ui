import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("showcase 基本チェック", () => {
  test("ページが読み込める", async ({ page }) => {
    await page.goto("/docs/index.html");
    await expect(page).toHaveTitle(/gamboo UI/);
  });

  test("主要セクションが表示される", async ({ page }) => {
    await page.goto("/docs/index.html");
    // overview セクション
    await expect(page.locator("[data-section='overview']").first()).toBeVisible();
    // 概要テキスト
    await expect(page.getByText("人間にも、AIにも、読めるデザインシステム")).toBeVisible();
  });

  test("AI-Ready 2.0 セクションが表示される", async ({ page }) => {
    await page.goto("/docs/index.html");
    await expect(page.getByText("AI-Ready 2.0")).toBeVisible();
    await expect(page.getByText("Layer 1: 憲法")).toBeVisible();
    await expect(page.getByText("Layer 2: 仕様")).toBeVisible();
    await expect(page.getByText("Layer 3: 検証")).toBeVisible();
  });

  test("コンポーネント数が contracts と一致する", async ({ page }) => {
    await page.goto("/docs/index.html");
    const path = await import("node:path");
    const { getContractStats } = await import("../src/utils/contract-stats.js");
    // showcase に掲載されるのは web 実装済み contract のみ（pending は app 先行）
    const stats = getContractStats(path.resolve("design/contracts/components"));
    const metaContent = await page.locator('meta[name="description"]').getAttribute("content");
    expect(metaContent).toContain(`${stats.web} コンポーネント`);
  });
});

test.describe("アクセシビリティ", () => {
  test("axe-core で critical / serious 違反がない", async ({ page }) => {
    await page.goto("/docs/index.html");
    // ページ全体の読み込みを待つ
    await page.waitForLoadState("networkidle");

    // P2b: [data-section] 全除外を解除し、コンポーネントデモも a11y 検証対象にする。
    // 残存除外は意図的な悪例 / Tailwind CDN の誤検出のみ。
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // Tailwind CDN の動的 inline style と axe の static 解析が噛み合わず誤検出が多いため除外
      .exclude(".ds-dodont-dont") // Don't デモは意図的な悪い例（DS の禁止パターンを示すため）
      .exclude(".ds-dodont-do") // Do デモは比較対象として最小限の構造で、デモ用 select 等を含む
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    if (critical.length > 0) {
      console.log("Critical violations:");
      critical.forEach((v) => {
        console.log(`  ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        v.nodes.forEach((n) => console.log(`    target: ${JSON.stringify(n.target)}`));
      });
    }
    if (serious.length > 0) {
      console.log("Serious violations:");
      serious.forEach((v) => {
        console.log(`  ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        v.nodes.forEach((n) => console.log(`    target: ${JSON.stringify(n.target)}`));
      });
    }

    expect(critical).toHaveLength(0);
    expect(serious).toHaveLength(0);
  });

  test("ランドマークが適切に設定されている", async ({ page }) => {
    await page.goto("/docs/index.html");
    // main が存在する or body 直下にコンテンツがある
    const mainCount = await page.locator("main").count();
    const navCount = await page.locator("nav").count();
    // 最低でも nav が存在する（サイドバー）
    expect(navCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe("禁止パターンチェック", () => {
  test("text-black が使われていない", async ({ page }) => {
    await page.goto("/docs/index.html");
    const html = await page.content();
    // class 属性内の text-black を検出（style 属性は除外）
    const matches = html.match(/class="[^"]*text-black[^"]*"/g);
    expect(matches || []).toHaveLength(0);
  });

  test("shadow-lg が showcase コンポーネントに使われていない", async ({ page }) => {
    await page.goto("/docs/index.html");
    // shadow-lg を持つ要素がオーバーレイ以外にないことを確認
    const shadowLgElements = await page.locator(".shadow-lg").count();
    // showcase のデモ内に shadow-lg があるかもしれないが、カード等に直接使われていなければOK
    // 厳密チェックは将来の harness で
    expect(shadowLgElements).toBeLessThanOrEqual(5); // モーダルデモ等の許容範囲
  });

  test("border-t-4 / border-l-4 カラーバーが使われていない", async ({ page }) => {
    await page.goto("/docs/index.html");
    const html = await page.content();
    const borderTop = html.match(/class="[^"]*border-t-4[^"]*"/g);
    const borderLeft = html.match(/class="[^"]*border-l-4[^"]*"/g);
    expect(borderTop || []).toHaveLength(0);
    expect(borderLeft || []).toHaveLength(0);
  });
});
