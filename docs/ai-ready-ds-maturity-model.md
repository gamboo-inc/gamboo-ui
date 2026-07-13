# AI-Ready Design System Maturity Model

A five-level model for diagnosing how mature a project's design-system setup is for AI agents.
It evaluates how far your project is prepared to make an AI "write the right UI."

> This does **not** evaluate the quality of the design system itself (number of tokens, component coverage, etc.). It is purely an "AI-readiness" diagnostic.

## How to use

With any AI agent, open your project and have the agent reference this file.

**Example prompts**:
- Claude Code: `Read @ai-ready-ds-maturity-model.md and diagnose the DS setup of this project`
- Cursor: add this file to context and say "Run the AI-Ready DS Maturity diagnostic"
- Generic: `Follow the diagnostic protocol in this file and evaluate the maturity of this project's DS setup`

---

## Level definitions

| Lv | Name | What the AI can do |
|----|------|--------------------|
| 0 | **None** (no definition) | Knows neither brand colors nor rules. Every task requires full instructions. |
| 1 | **Inline** (mixed) | Can read DS instructions, but they are mixed in with workflow steps, so accuracy is unstable. |
| 2 | **Separated** | Can generate basic on-spec UI just by reading `DESIGN.md`. |
| 3 | **Structured** | References exact values from JSON and writes UI to spec with no ambiguity. |
| 4 | **Verified** | Spec violations are detected automatically. A mechanism keeps the score from dropping six months later. |

---

## Diagnostic protocol

> Depending on the agent's capabilities, file-existence checks may be done via tool calls, a search feature, or by asking the user — any of these is acceptable.

### Phase 1: Scan

Check for the existence of the following files.

| Category | Scan patterns |
|----------|---------------|
| AI config | `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules`, `.cline/`, `AGENTS.md` |
| AI config (generic) | `*rules*`, `*instructions*`, `.ai*` |
| DS documentation | `DESIGN.md`, `design.md`, `DESIGN_SYSTEM.md`, `docs/design-system.*` |
| Structured data | `**/tokens.{json,yaml}`, `**/rules.{json,yaml}`, `**/*.contract.json`, `**/design-tokens.*`, `**/style-dictionary/**`, `**/tokens.dtcg.json` |
| SSOT declaration | `**/authority.md`, or a "source of truth" / "SSOT" statement inside DS docs |
| Verification | `package.json` scripts, `Makefile`, `**/validate.*`, `**/check-design.*` |
| CI | `.github/workflows/*.yml`, `.gitlab-ci.yml` |
| Hook | `.claude/settings*.json` (hooks), `.husky/*`, `.pre-commit-config.yaml` |
| Benchmark (optional) | `**/benchmarks/**`, `**/benchmark.*`, `**/eval/**` |
| Distribution (optional) | `package.json` (published npm package), `server.json` / MCP Registry entry, `llms.txt` |

### Phase 2: Analyze

Read the contents of the files you found and determine:

1. Whether the AI config files contain DS keywords (color, font, spacing, component, token, prohibited, ban).
2. How many of the three `DESIGN.md` elements are present: **principles** / **Quick Reference** / **prohibited patterns**.
3. Which kinds of structured data exist: tokens / rules / component contracts.
4. Whether an SSOT (which file is authoritative) is declared.
5. Whether there is a mechanism that generates docs or metadata from the structured data.
6. How many of the four verification facets exist: static checks / drift detection / CI / hooks.

### Phase 3: Judge

Evaluate top-down and return the highest level whose conditions are met. **Each higher level requires all conditions of the levels below it.**

```
Lv.4: Lv.3 conditions + 2 or more of { static checks / drift detection / CI / hooks }
Lv.3: Lv.2 conditions + at least 1 kind of structured data (JSON/YAML) + an SSOT declaration
Lv.2: DESIGN.md exists as a standalone file + 2 or more of the 3 elements
Lv.1: AI config files contain DS-related content (but DESIGN.md is not separated out)
Lv.0: No DS-related content
```

### Phase 4: Report

Produce the result using the template below.

---

## Output template

```markdown
# AI-Ready DS Maturity — Diagnostic Result

## Verdict: Lv.{N} — {level name}

### Files detected
| Category | File | Status |
|----------|------|--------|
| AI config | {path or "none"} | found / not found |
| DS documentation | {path or "none"} | found / not found |
| Structured data | {path or "none"} | found / not found |
| Verification | {path or "none"} | found / not found |

### Current strengths
- {What this project already does well — phrase it positively}

### Next actions (Lv.{N} → Lv.{N+1})
1. {Highest priority}
2. {Next}
3. {After that}
```

---

## Next actions in detail

### Lv.0 → Lv.1: Write DS instructions into the AI config file

- **What to create**: append DS rules to `CLAUDE.md` (or `.cursorrules`, etc.).
- **What to write**: the colors, fonts, and base spacing values you use, plus 3–5 prohibited patterns.
- **Rule of thumb**: 20–50 lines of additions is enough.

### Lv.1 → Lv.2: Separate out DESIGN.md

- **What to create**: a new `DESIGN.md` at the project root.
- **What to write**: 2 or more of the following 3 elements
  - Design principles (3–7 items)
  - Quick Reference (copy-pasteable code snippets)
  - Prohibited patterns (5–10 items)
- **Separate from the AI config file**: keep `CLAUDE.md` (etc.) for *workflow* only, and have it point to DESIGN.md (`Read DESIGN.md`).
- **Use the DESIGN.md template in the appendix** as a starting point.

### Lv.2 → Lv.3: Structure the spec

- **What to create**: define tokens, rules, or component contracts as JSON/YAML.
- **Minimal example**: 5 prohibition rules in `design/rules.json` —
  ```json
  [
    { "id": "NO_TEXT_BLACK", "pattern": "text-black", "alternative": "text-slate-900" }
  ]
  ```
- **Declare an SSOT**: state clearly which file is canonical (in the README or an `authority.md`).
- **Reference**: in gamboo-ui, `design/contracts/rules.json` (99 rules) and `design/contracts/tokens.json` (99 tokens). Tokens are also exported to W3C DTCG 2025.10 format at `design/contracts/tokens.dtcg.json` for interop and npm distribution.

### Lv.3 → Lv.4: Automate verification

This is the step that turns "documented policy" into "enforced fact." Introduce **2 or more** of the following:

- **Static checks**: scripts for JSON-schema validation, rule-ID uniqueness, token-vs-implementation consistency, etc.
- **Drift detection**: cross-check the numbers written in docs against the actual values in the structured data.
- **CI integration**: run the verification automatically on every PR (GitHub Actions, etc.).
- **Hooks**: detect rule violations automatically on file save (Claude Code PostToolUse, pre-commit, etc.).

**Reference — how gamboo-ui implements this (a real, recently shipped harness; treat it as the gold standard for "Verified"):**

- `npm run design:check` — JSON-schema validation of `rules.json` and all 33 contracts, rule-ID uniqueness, contract Tailwind-class lint (enforce / warn), `htmlSample` self-consistency, and a freshness check that `tokens.dtcg.json` matches `tokens.json`.
- `npm run design:drift` — doc↔contract drift detection, including:
  - **orphan-0 verification** — every "manual" rule (context-dependent, not statically detectable) must be reachable from at least one component contract or a `foundations` / `patterns` markdown reference, so no rule silently becomes dead.
  - README **coverage-matrix freshness**.
  - `foundations` file-count consistency.
  - rule / contract / token counts across `DESIGN.md`, `README.md`, `AGENTS.md`, and `llms.txt`.
- `npm run validate` — `tokens.json` ↔ generated CSS variables / Tailwind config consistency.
- `npm test` — Playwright + axe-core, 170 tests, including an examples a11y gate (all 16 example pages must have axe critical/serious = 0) and modal focus-trap / Esc / focus-return interaction tests.
- **PostToolUse hook (Claude Code)**, shipped in `.claude/settings.json`: on Write/Edit of HTML it runs the same lint. `error` → block feedback (the agent auto-fixes and re-writes); `warn` → advice injected via `additionalContext`.
- **CI** (`.github/workflows/design-check.yml`) runs all of the above on every push / PR.

**Verification coverage as a route-based KPI** (not a single number), auto-embedded in the README and CI-guarded for freshness:

| Route | Count | Notes |
|-------|-------|-------|
| Static auto | **41 / 99** | class-match 31 (the same code path as the MCP `check_rule` tool) + html-attr 5 + composition 5 (nesting + a11y DOM checks) |
| Interaction test | 1 | covered by a Playwright behavior test |
| Impossible-static | 3 | `active` / `selected` / `current` are semantically dependent — undetectable from static markup alone |
| Manual | 54 | presented to the AI via the `get_rules` tool |

Because coverage is published per route (not as one headline percentage), the README never claims more than it enforces, and CI fails if the matrix goes stale.

A note on the closed loop: the `ban-pattern` skill closes a MAPE-K **Learn** loop. Banning a pattern writes a machine-readable rule into `rules.json`, so the new rule is instantly enforced by CI, the MCP server, and the hook — the same path as every other rule. "Point it out once" becomes "enforced forever."

### Lv.4+: Add observability (advanced / optional)

Once you reach Lv.4, adding a way to **observe whether the DS is actually being used by the AI** pays off for research-grade validation and continuous improvement. It is not required for Lv.4, but it is valuable when, six months later, you want to judge "is the rule working or not?" from data rather than intuition.

- Examples of what to observe: which DS items the AI referenced, which tools it called, and the score of the generated output.
- **Reference**: gamboo-ui measures AI-Ready quality **without a metered API** — generation runs via Claude Code subscription subagents, and scoring is offline. It compares 4 conditions (no-DS / DESIGN.md-only / +static-contracts / full = MCP + `check_html` self-verification) on the same prompts, and records tool calls and referenced resources in the report. The result moves from a cold score of **6.3** to a full score of **80.3** (+74 points), which illustrates the kind of signal observability surfaces. The provider layer is abstracted (Anthropic / fixture / OpenAI placeholder), so the harness can swap backends without changing the scoring logic.

---

## Reference: gamboo-ui (Lv.4 + observability)

| Element | File |
|---------|------|
| AI config (agent-neutral SSOT) | `AGENTS.md` |
| AI config (Claude-specific) | `CLAUDE.md` — workflow only |
| DS documentation | `DESIGN.md` — principles + Quick Ref + Prohibited Top 10 |
| Tokens JSON | `design/contracts/tokens.json` (99 tokens) |
| Tokens JSON (W3C DTCG) | `design/contracts/tokens.dtcg.json` — W3C DTCG 2025.10 export (interop / npm) |
| Rules JSON | `design/contracts/rules.json` (99 rules) |
| Rule schema | `design/schemas/rule.schema.json` |
| Component contracts | `design/contracts/components/*.contract.json` (33 = 28 web-implemented + 5 app-pending / React Native) |
| SSOT declaration | `design/authority.md` |
| Static checks (rules / schema) | `npm run design:check` |
| Static checks (tokens ↔ CSS) | `npm run validate` |
| Drift detection (incl. orphan-0) | `npm run design:drift` |
| Automated tests | `npm test` — Playwright + axe-core, 170 tests (examples a11y gate + modal interaction) |
| CI integration | `.github/workflows/design-check.yml` — all of the above on every push / PR |
| MCP server | `src/server.ts` — 6 tools (`get_token` / `get_component` / `check_rule` / `check_html` / `get_rules` / `search`). `check_html` lets an agent self-verify generated HTML against the same lint as CI. |
| Hook | PostToolUse — same lint on HTML Write/Edit; `error` → block, `warn` → `additionalContext` |
| npm distribution | `gamboo-ds-mcp` (MCP server, run via `npx -y gamboo-ds-mcp`) and `gamboo-contracts` (tokens/rules/contracts JSON, framework-agnostic) |
| MCP Registry | `io.github.gamboo-inc/gamboo-ui` |
| Benchmark (observability) | 4 conditions (no-DS / DESIGN.md-only / +static-contracts / full), offline scoring via subscription subagents, provider-abstracted (Anthropic / fixture / OpenAI placeholder); cold 6.3 → full 80.3 (+74) |

https://github.com/gamboo-inc/gamboo-ui

---

## Appendix: DESIGN.md template

For the Lv.1 → Lv.2 transition. Copy it and edit to fit your project.
This is a generic format that works regardless of CSS framework (Tailwind, vanilla CSS, CSS Modules, etc.).

```markdown
# DESIGN.md

## Principles
1. Content first — prioritize conveying information over decoration.
2. Accessibility by default — WCAG 2.1 AA compliant.
3. Consistency — the same meaning gets the same appearance.

## Quick Reference

<!-- Rewrite to match your own project's styles -->

Card: {card style definition}
Button (primary): {primary button style definition}
Button (secondary): {secondary button style definition}
Input: {text input style definition}

## Prohibited patterns

| NG | Alternative | Reason |
|----|-------------|--------|
| {prohibited style 1} | {alternative} | {why it's bad} |
| {prohibited style 2} | {alternative} | {why it's bad} |
| {prohibited style 3} | {alternative} | {why it's bad} |
```

---

> English edition of `docs/ds-health-check.md` (the Japanese original remains as the source).

https://github.com/gamboo-inc/gamboo-ui · https://github.com/gamboo-inc/gamboo-ui

version: 2.0.0
last-updated: 2026-06-13
