/**
 * modal.spec.ts — モーダルの a11y インタラクション検証（P1-5）
 *
 * MODAL_ROLE_DIALOG_REQUIRED 等の「どれがモーダルか」を要する a11y は静的検出
 * 不能（automationStatus: impossible-static）。代わりに showcase の実モーダルで
 * focus 移動 / Escape クローズ / focus 復帰 / focus trap を実機検証し、
 * 「covered-by-test」として担保する。
 */

import { test, expect } from "@playwright/test";

test.describe("modal a11y インタラクション（showcase 実装）", () => {
  test("role=dialog と aria-modal を持つ", async ({ page }) => {
    await page.goto("/docs/index.html");
    const dialog = page.locator("#modal-confirm [role='dialog']");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-labelledby", /.+/);
  });

  test("開くと dialog が表示され、focus がモーダル内に移る", async ({ page }) => {
    await page.goto("/docs/index.html");
    await page.getByRole("button", { name: "確認ダイアログ" }).click();
    await expect(page.locator("#modal-confirm")).not.toHaveClass(/hidden/);
    // focus がモーダル内の focusable に移っている
    const focusInModal = await page.evaluate(() => {
      const modal = document.getElementById("modal-confirm");
      return modal != null && modal.contains(document.activeElement);
    });
    expect(focusInModal).toBe(true);
  });

  test("Escape で閉じ、focus がトリガーに復帰する", async ({ page }) => {
    await page.goto("/docs/index.html");
    const trigger = page.getByRole("button", { name: "確認ダイアログ" });
    await trigger.click();
    await expect(page.locator("#modal-confirm")).not.toHaveClass(/hidden/);

    await page.keyboard.press("Escape");
    await expect(page.locator("#modal-confirm")).toHaveClass(/hidden/);

    // focus がトリガーボタンに戻っている（_modalPrevFocus）
    const focusBackOnTrigger = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.getAttribute("onclick")?.includes("openModal('modal-confirm')") ?? false;
    });
    expect(focusBackOnTrigger).toBe(true);
  });

  test("閉じるボタン（aria-label 付き）でも閉じる", async ({ page }) => {
    await page.goto("/docs/index.html");
    await page.getByRole("button", { name: "フォームモーダル" }).click();
    await expect(page.locator("#modal-form")).not.toHaveClass(/hidden/);
    // モーダル内の aria-label="閉じる" ボタン
    await page.locator("#modal-form").getByRole("button", { name: "閉じる" }).click();
    await expect(page.locator("#modal-form")).toHaveClass(/hidden/);
  });

  test("Tab が開いたモーダル内で focus trap される", async ({ page }) => {
    await page.goto("/docs/index.html");
    await page.getByRole("button", { name: "確認ダイアログ" }).click();
    await expect(page.locator("#modal-confirm")).not.toHaveClass(/hidden/);
    // 何度 Tab を押しても focus はモーダル内に留まる
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
    }
    const stillInModal = await page.evaluate(() => {
      const modal = document.getElementById("modal-confirm");
      return modal != null && modal.contains(document.activeElement);
    });
    expect(stillInModal).toBe(true);
  });
});
