/**
 * OpenAI provider for POST /ai/generate-exercise. Mirrors the Anthropic
 * path in generate.ts but talks to the OpenAI Chat Completions API in JSON
 * mode. Generation-only — review/evaluate are Claude (claude.ts). The client
 * routes through Helicone (source "express-ai-generate") when HELICONE_API_KEY
 * is set; otherwise it calls OpenAI directly.
 *
 * Returns raw text + token usage; the shared validation/usage-logging lives
 * in generate.ts so both providers behave identically downstream.
 */
import OpenAI from "openai";
import {
  heliconeOpenAIOverrides,
  heliconeRequestHeaders,
} from "@wortschatz/config";

export const GPT_DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

export const GPT_CONFIGURED = (): boolean => Boolean(process.env.OPENAI_API_KEY);

export interface RawGenerationResult {
  text: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
}

let cached: OpenAI | null = null;
function client(): OpenAI {
  if (cached) return cached;
  cached = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...heliconeOpenAIOverrides("express-ai-generate"),
  });
  return cached;
}

export async function callGpt(opts: {
  system: string;
  user: string;
  maxTokens: number;
  model?: string;
  userId?: string;
}): Promise<RawGenerationResult> {
  const model = opts.model ?? GPT_DEFAULT_MODEL;
  const resp = await client().chat.completions.create(
    {
      model,
      // Newer OpenAI models reject `max_tokens`; use the completion budget.
      max_completion_tokens: opts.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    },
    { headers: heliconeRequestHeaders(opts.userId) },
  );

  return {
    text: resp.choices[0]?.message?.content ?? "",
    modelUsed: model,
    inputTokens: resp.usage?.prompt_tokens ?? 0,
    outputTokens: resp.usage?.completion_tokens ?? 0,
  };
}
