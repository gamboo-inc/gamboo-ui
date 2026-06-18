/**
 * drift-heal.ts — W2 deterministic drift repair pipeline.
 *
 * This pipeline may regenerate derived files, but it must never decide SSOT
 * changes. If regeneration touches protected paths, the run escalates and stops.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");

type AuditStatus = "passed" | "escalated" | "failed";

type EscalationPayload = {
  workflow: "drift-repair";
  stuck_reason: string;
  severity: "warn" | "error" | "blocking";
  proposed_diff: string;
  evidence: string[];
  human_question: string;
};

type AuditRecord = {
  run_id: string;
  workflow: "drift-repair";
  level: "pipeline";
  status: AuditStatus;
  trigger: string;
  commands: string[];
  changed_paths: string[];
  escalation: EscalationPayload | null;
};

type CommandResult = {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  output: string;
};

type ProtectedPathRule =
  | { type: "file"; path: string; reason: string }
  | { type: "prefix"; path: string; reason: string };

// Keep this list aligned with docs/melta-loop-playbook.md Hard Gates and
// SSOT Write-Protection. Phase 2 should add a self-drift check for this const.
export const SSOT_PROTECTED_PATHS: readonly ProtectedPathRule[] = [
  { type: "prefix", path: "design/contracts/", reason: "contract and token SSOT" },
  { type: "prefix", path: "design/schemas/", reason: "schema SSOT" },
  { type: "file", path: "design/authority.md", reason: "authority SSOT" },
  { type: "file", path: "DESIGN.md", reason: "Phase 1 protects the whole file; front matter/body diff classification is future work" },
  { type: "file", path: "AGENTS.md", reason: "agent workflow entrypoint" },
  { type: "file", path: ".design-baseline.json", reason: "baseline changes require human approval" },
  { type: "file", path: "docs/melta-loop-playbook.md", reason: "loop governance is not repairable by regeneration" },
];

export function normalizeGitPath(path: string): string {
  return path.replace(/^"|"$/g, "").replace(/\\/g, "/");
}

export function parseGitStatusPaths(statusOutput: string): string[] {
  const paths: string[] = [];
  for (const line of statusOutput.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const raw = line.slice(3);
    for (const part of raw.split(" -> ")) {
      if (part.trim() !== "") paths.push(normalizeGitPath(part.trim()));
    }
  }
  return [...new Set(paths)].sort();
}

export function protectedPathMatches(path: string): ProtectedPathRule | null {
  const normalized = normalizeGitPath(path);
  for (const rule of SSOT_PROTECTED_PATHS) {
    if (rule.type === "file" && normalized === rule.path) return rule;
    if (rule.type === "prefix" && normalized.startsWith(rule.path)) return rule;
  }
  return null;
}

export function touchesSSOT(paths: readonly string[]): string[] {
  return paths.filter((path) => protectedPathMatches(path) !== null);
}

export function hasLoopPlaybookDrift(output: string): boolean {
  const sectionStart = output.indexOf("=== 10. Loop playbook self-drift ===");
  if (sectionStart < 0) return false;
  const nextSection = output.indexOf("\n===", sectionStart + 1);
  const section = nextSection >= 0 ? output.slice(sectionStart, nextSection) : output.slice(sectionStart);
  return /\bDRIFT:/.test(section);
}

function runCommand(command: string, args: string[]): CommandResult {
  const label = [command, ...args].join(" ");
  console.log(`\n$ ${label}`);

  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf-8",
    shell: false,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  return {
    command: label,
    exitCode: result.status,
    stdout,
    stderr,
    output: `${stdout}${stderr}`,
  };
}

function getChangedPaths(): string[] {
  const result = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf-8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`git status failed: ${result.stderr || result.stdout || "unknown error"}`);
  }
  return parseGitStatusPaths(result.stdout ?? "");
}

function writeAuditRecord(record: AuditRecord): void {
  const logDir = resolve(root, ".melta-loop");
  mkdirSync(logDir, { recursive: true });
  appendFileSync(resolve(logDir, "runs.jsonl"), `${JSON.stringify(record)}\n`);
}

function runId(): string {
  return `${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}-drift-heal`;
}

function npmRun(script: string): CommandResult {
  return runCommand("npm", ["run", script]);
}

function escalation(
  stuckReason: string,
  evidence: string[],
  humanQuestion: string,
  proposedDiff = "Inspect the current worktree diff; drift-heal does not auto-commit or auto-revert."
): EscalationPayload {
  return {
    workflow: "drift-repair",
    stuck_reason: stuckReason,
    severity: "error",
    proposed_diff: proposedDiff,
    evidence,
    human_question: humanQuestion,
  };
}

function finish(
  status: AuditStatus,
  commands: string[],
  changedPaths: string[],
  payload: EscalationPayload | null
): void {
  writeAuditRecord({
    run_id: runId(),
    workflow: "drift-repair",
    level: "pipeline",
    status,
    trigger: process.env.MELTA_LOOP_TRIGGER || "manual",
    commands,
    changed_paths: changedPaths,
    escalation: payload,
  });

  if (payload) {
    console.error("\nEscalation payload:");
    console.error(JSON.stringify(payload, null, 2));
  }
}

export function main(): number {
  const commands: string[] = [];

  try {
    const initialChanges = getChangedPaths();
    if (initialChanges.length > 0) {
      const payload = escalation(
        "worktree is dirty before drift-heal",
        [`Initial changed paths: ${initialChanges.join(", ")}`],
        "Should these changes be committed/stashed or should drift-heal run in a fresh worktree?"
      );
      finish("escalated", commands, initialChanges, payload);
      return 1;
    }

    const firstDrift = npmRun("design:drift");
    commands.push(firstDrift.command);
    if (firstDrift.exitCode === 0) {
      finish("passed", commands, [], null);
      console.log("drift-heal: no drift detected; no-op.");
      return 0;
    }

    if (hasLoopPlaybookDrift(firstDrift.output)) {
      const payload = escalation(
        "loop playbook drift is not repairable by regeneration",
        ["Initial design:drift reported section 10 Loop playbook self-drift."],
        "Is this a governance document update, a package script mismatch, or a drift-check bug?"
      );
      finish("escalated", commands, getChangedPaths(), payload);
      return 1;
    }

    const build = npmRun("design:build");
    commands.push(build.command);
    if (build.exitCode !== 0) {
      const payload = escalation(
        "derived-view regeneration failed",
        [`npm run design:build exit code: ${build.exitCode}`],
        "Is this a generator failure or an environment/build issue?"
      );
      finish("failed", commands, getChangedPaths(), payload);
      return 1;
    }

    const secondDrift = npmRun("design:drift");
    commands.push(secondDrift.command);
    const changedPaths = getChangedPaths();

    if (hasLoopPlaybookDrift(secondDrift.output)) {
      const payload = escalation(
        "loop playbook drift remains after regeneration",
        ["Post-build design:drift reported section 10 Loop playbook self-drift."],
        "Should the playbook or drift-check implementation be updated by a human-reviewed change?"
      );
      finish("escalated", commands, changedPaths, payload);
      return 1;
    }

    if (secondDrift.exitCode !== 0) {
      const payload = escalation(
        "drift remains after derived-view regeneration",
        [`Changed paths: ${changedPaths.join(", ") || "(none)"}`],
        "Is this a generator bug or a specification/documentation change that needs human approval?"
      );
      finish("escalated", commands, changedPaths, payload);
      return 1;
    }

    const protectedPaths = touchesSSOT(changedPaths);
    if (protectedPaths.length > 0) {
      const payload = escalation(
        "regeneration touched protected SSOT paths",
        [
          `Changed paths: ${changedPaths.join(", ")}`,
          `Protected paths: ${protectedPaths.join(", ")}`,
        ],
        "Should this be treated as a specification change, a generator bug, or an approved generated front matter update?"
      );
      finish("escalated", commands, changedPaths, payload);
      return 1;
    }

    finish("passed", commands, changedPaths, null);
    console.log(
      `drift-heal: drift repaired with generated-only diff: ${changedPaths.join(", ") || "(no file changes)"}`
    );
    console.log("drift-heal: stopping for human commit decision.");
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const changedPaths = getChangedPaths();
    const payload = escalation(
      "unexpected drift-heal failure",
      [message],
      "Should the script be fixed before rerunning W2 drift repair?"
    );
    finish("failed", commands, changedPaths, payload);
    return 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
