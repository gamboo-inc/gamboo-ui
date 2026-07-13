import { expect, test } from "@playwright/test";
import {
  hasLoopPlaybookDrift,
  parseGitStatusPaths,
  protectedPathMatches,
  touchesSSOT,
} from "../scripts/design/loops/drift-heal.js";

test.describe("drift-heal safety rails", () => {
  test("touchesSSOT catches protected governance and SSOT paths", () => {
    const protectedPaths = [
      "design/contracts/rules.json",
      "design/contracts/tokens.json",
      "design/contracts/components/button.contract.json",
      "design/schemas/component.schema.json",
      "design/authority.md",
      "DESIGN.md",
      "AGENTS.md",
      ".design-baseline.json",
      "docs/gamboo-loop-playbook.md",
    ];

    expect(touchesSSOT(protectedPaths)).toEqual(protectedPaths);
  });

  test("touchesSSOT allows generated and runtime outputs", () => {
    expect(
      touchesSSOT([
        "docs/index.html",
        "llms.txt",
        "llms-full.txt",
        "metadata/components.json",
        ".gamboo-loop/runs.jsonl",
      ])
    ).toEqual([]);
  });

  test("protectedPathMatches returns the matching guard reason", () => {
    expect(protectedPathMatches("design/contracts/tokens.json")?.reason).toContain("SSOT");
    expect(protectedPathMatches("metadata/components.json")).toBeNull();
  });

  test("parseGitStatusPaths includes tracked, renamed, and untracked files", () => {
    const output = [
      " M docs/index.html",
      "R  metadata/old.json -> metadata/components.json",
      "?? llms.txt",
    ].join("\n");

    expect(parseGitStatusPaths(output)).toEqual([
      "docs/index.html",
      "llms.txt",
      "metadata/components.json",
      "metadata/old.json",
    ]);
  });

  test("hasLoopPlaybookDrift only escalates section 10 drift", () => {
    const section9 = [
      "=== 9. README 検証カバレッジ表の鮮度 ===",
      "  ⚠️  DRIFT: README.md mismatch",
      "=== 10. Loop playbook self-drift ===",
      "  ✓ Loop playbook OK",
    ].join("\n");
    const section10 = [
      "=== 10. Loop playbook self-drift ===",
      "  ⚠️  DRIFT: Loop playbook missing script",
      "=== Summary ===",
    ].join("\n");

    expect(hasLoopPlaybookDrift(section9)).toBe(false);
    expect(hasLoopPlaybookDrift(section10)).toBe(true);
  });
});
