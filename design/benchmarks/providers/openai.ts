/**
 * OpenAI provider — P4 では signature placeholder のみ。
 *
 * P4 設計書 line 562 で「OpenAI は後続でも可」と明示されているため、
 * P5 で実装予定。それまでは throw new Error で fail-fast。
 *
 * 実装時に必要なこと:
 *   - OpenAI SDK 追加（openai package）
 *   - tool calling フォーマット差吸収（Anthropic と OpenAI で構造が違う）
 *   - resourcesAccessed 派生は anthropic.ts と共通化
 */

import type { ModelProvider, GenerationResult } from "../../../src/utils/types.js";

export interface OpenAIProviderOptions {
  model: string;
}

export function createOpenAIProvider(options: OpenAIProviderOptions): ModelProvider {
  return {
    id: `openai:${options.model}`,
    async generate(_system: string, _prompt: string): Promise<GenerationResult> {
      throw new Error(
        "OpenAI provider is not yet implemented (planned for P5). " +
          "Use --provider anthropic or --provider fixture for now."
      );
    },
  };
}
