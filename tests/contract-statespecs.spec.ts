/**
 * contract-statespecs.spec.ts — P2-1 stateSpecs / anatomy parts の伝播ラウンドトリップ
 *
 * 検証する不変条件:
 * 1. contract → build-legacy → metadata/components.json → get_component に新フィールドが届く
 * 2. stateSpecs を持つ全 contract で keys(stateSpecs) ⊆ states（validate.ts の同期と二重化）
 * 3. states[] は pilot で不変（melta-app の codegen が読む = byte-identical 維持の核）
 *
 * 既存 spec は get_component / components.json 経路を未カバー（lint/matcher/coverage 中心）なので
 * ここが「contract を編集したら MCP に届くか」の唯一のゲート。
 */

import { test, expect } from "@playwright/test";
import { getComponent } from "../src/tools/get-component.js";
import { loadComponents } from "../src/utils/loader.js";
import type { AnatomyPart } from "../src/utils/types.js";

test.describe("P2-1 伝播: stateSpecs / anatomy parts", () => {
  test("button: stateSpecs(disabled/loading) が get_component に届く", () => {
    const button = getComponent("button");
    expect(button, "button が components.json に存在").not.toBeNull();
    expect(button!.stateSpecs, "button.stateSpecs が伝播").toBeDefined();

    // disabled: variant 不変な差分クラス
    expect(button!.stateSpecs!.disabled.tailwind).toContain("cursor-not-allowed");
    // loading: aria-busy が ariaChanges に乗る
    expect(button!.stateSpecs!.loading.ariaChanges).toContain("aria-busy");

    // anatomy は string[] 据置（コンテンツスロット — object 化しない）
    expect(Array.isArray(button!.anatomy)).toBe(true);

    // states[] は不変（melta-app codegen の入力 = 変えるとクロスリポ破壊）
    expect(button!.states).toEqual(["default", "hover", "focus", "disabled", "loading"]);
  });

  test("modal: anatomy が object 形式（part→{description,...}）で届く", () => {
    const modal = getComponent("modal");
    expect(modal).not.toBeNull();
    expect(Array.isArray(modal!.anatomy)).toBe(false);

    const anatomy = modal!.anatomy as Record<string, AnatomyPart>;
    expect(anatomy.overlay, "overlay part が定義").toBeDefined();
    expect(anatomy.overlay.description).toBeTruthy();
    expect(anatomy.container.roles).toContain("aria-modal");

    // open は structural 状態で variant が基底（open.tailwind は差分なし=""）。aria/挙動が spec の価値
    expect(modal!.stateSpecs!.open.tailwind).toBe("");
    expect(modal!.stateSpecs!.open.ariaChanges).toContain("aria-modal");
    // open の表示クラスは variant tailwind が正本（z-50 はそちらにある）
    expect(modal!.variants.find((v) => v.name === "confirmation")!.tailwind).toContain("z-50");
    expect(modal!.states).toEqual(["default", "open", "closing"]);
  });

  test("table: ソート可能性は anatomy.th の aria-sort で表現（state には足さない）", () => {
    const table = getComponent("table");
    expect(table).not.toBeNull();

    const anatomy = table!.anatomy as Record<string, AnatomyPart>;
    // sortable は variant + anatomy.th の aria-sort 記述で生成可能（state ではない）
    expect(anatomy.th.description).toContain("aria-sort");
    expect(anatomy.th.roles).toContain("scope");

    // stateSpecs は構造変化のある empty を中心に（hover は anatomy.row が正本）
    expect(table!.stateSpecs!.empty).toBeDefined();

    // states[] 不変 = melta-app 影響ゼロ（かつ table は MVP allowlist 外）
    expect(table!.states).toEqual(["default", "hover", "empty"]);
    expect(table!.states).not.toContain("sortable");
  });

  test("同期不変条件: stateSpecs を持つ全 contract で keys(stateSpecs) ⊆ states", () => {
    let checked = 0;
    for (const comp of loadComponents().components) {
      if (!comp.stateSpecs) continue;
      const states = comp.states ?? [];
      for (const key of Object.keys(comp.stateSpecs)) {
        expect(states, `${comp.id}.stateSpecs.${key} は states[] に含まれるべき`).toContain(key);
      }
      checked++;
    }
    // pilot 3 件は最低カバーされている（退行で 0 になったら気付けるよう floor を置く）
    expect(checked, "stateSpecs を持つ contract が存在する").toBeGreaterThanOrEqual(3);
  });

  test("差分規約: どの stateSpec.tailwind も variant.tailwind を verbatim 再掲しない（差分は空文字）", () => {
    // structural 状態（modal.open 等）が variant の完全コピーになる drift を全 contract で禁じる。
    // variant が基底状態を表すなら差分は "" にする（modal が参照実装）。
    for (const comp of loadComponents().components) {
      if (!comp.stateSpecs) continue;
      const variantTw = new Set(comp.variants.map((v) => v.tailwind).filter(Boolean));
      for (const [state, spec] of Object.entries(comp.stateSpecs)) {
        if (!spec.tailwind) continue;
        expect(
          variantTw.has(spec.tailwind),
          `${comp.id}.stateSpecs.${state}.tailwind が variant と完全一致（差分は "" にすべき）`
        ).toBe(false);
      }
    }
  });

  test("stateSpec の差分クラスは variant.tailwind と重複しない（差分のみの規約）", () => {
    // base/variant のクラスを stateSpec.tailwind に再掲すると drift 面が増える。
    // pilot の disabled/loading/open 等は variant 非依存の差分のみであることを抜き取りで担保。
    const button = getComponent("button")!;
    const containedClasses = new Set(
      button.variants.find((v) => v.name === "contained")!.tailwind.split(/\s+/)
    );
    for (const cls of button.stateSpecs!.disabled.tailwind.split(/\s+/)) {
      if (!cls) continue;
      expect(containedClasses.has(cls), `disabled の "${cls}" は variant と重複（差分のみにすべき）`).toBe(false);
    }
  });
});
