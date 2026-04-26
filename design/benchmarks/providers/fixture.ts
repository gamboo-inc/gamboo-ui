/**
 * fixture provider — API 不要で score 検証に使う。
 *
 * 既存の生成結果（design/benchmarks/results/<date>/<promptId>-<label>.html）を
 * 読み込んで GenerationResult として返す。CI で score ロジックを検証する用途。
 *
 * P4 受け入れ条件「API なしでも既存 fixture を score できる」を満たす。
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ModelProvider, GenerationResult } from "../../../src/utils/types.js";
import { prompts as benchmarkPrompts } from "../prompts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");

export interface FixtureProviderOptions {
  /** results 配下の日付ディレクトリ（例: "2026-04-11"） */
  runDir: string;
  /** ファイル名 suffix（例: "v1" / "v2"） */
  label: string;
}

export function createFixtureProvider(options: FixtureProviderOptions): ModelProvider {
  const fixtureDir = resolve(root, "design/benchmarks/results", options.runDir);

  return {
    id: `fixture:${options.runDir}:${options.label}`,
    async generate(_system: string, prompt: string): Promise<GenerationResult> {
      const start = Date.now();

      // prompt 文字列から ID を逆引き
      const entry = benchmarkPrompts.find((p) => p.prompt === prompt);
      if (!entry) {
        throw new Error(
          `fixture provider: prompt にマッチする ID が見つかりません。prompts.ts と一致する prompt を渡してください。`
        );
      }

      const path = resolve(fixtureDir, `${entry.id}-${options.label}.html`);
      if (!existsSync(path)) {
        throw new Error(
          `fixture provider: ${path} が見つかりません。先に Anthropic provider 等で生成してください。`
        );
      }

      const text = readFileSync(path, "utf-8");

      return {
        text,
        toolCalls: [],
        usage: { inputTokens: 0, outputTokens: 0 },
        latencyMs: Date.now() - start,
        resourcesAccessed: [],
      };
    },
  };
}
