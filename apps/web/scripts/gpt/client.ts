/**
 * OpenAI client wrapper for the GPT generator. Independent from the
 * Claude client by design.
 *
 * Uses JSON mode (`response_format: { type: "json_object" }`) so the
 * model is forced to emit a single valid JSON object — the prompts must
 * mention "JSON" for the API to accept this mode, which they do.
 *
 * Default model comes from OPENAI_MODEL (falls back to gpt-4o). Newer
 * models reject `max_tokens`, so we send `max_completion_tokens`.
 */
import OpenAI from "openai";
import { heliconeOpenAIOverrides } from "@wortschatz/config";

import type { ProviderCallOptions, ProviderCallResult } from "../shared/types";

export const GPT_DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

let cached: OpenAI | null = null;
function client(): OpenAI {
  if (cached) return cached;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing — add it to apps/web/.env to run the GPT generator.",
    );
  }
  // Routes through Helicone only when HELICONE_API_KEY is set; otherwise the
  // spread is `{}` and the client is identical to before.
  cached = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...heliconeOpenAIOverrides("scripts-gpt"),
  });
  return cached;
}

export async function callGPT(
  opts: ProviderCallOptions,
): Promise<ProviderCallResult> {
  const model = opts.model ?? GPT_DEFAULT_MODEL;
  const resp = await client().chat.completions.create({
    model,
    max_completion_tokens: opts.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });

  const text = resp.choices[0]?.message?.content ?? "";
  return { text, modelUsed: model };
}
