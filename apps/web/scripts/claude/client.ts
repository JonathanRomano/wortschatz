/**
 * Anthropic client wrapper for the Claude generator. Independent from the
 * GPT client by design — they share nothing but the shared/ helpers.
 *
 * Default model comes from ANTHROPIC_MODEL (falls back to the app
 * default). Claude has no JSON-mode flag; the shared extractJson() copes
 * with the occasional ```json fence.
 */
import Anthropic from "@anthropic-ai/sdk";
import { heliconeAnthropicOverrides } from "@wortschatz/config";

import type { ProviderCallOptions, ProviderCallResult } from "../shared/types";

export const CLAUDE_DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (cached) return cached;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is missing — add it to apps/web/.env to run the Claude generator.",
    );
  }
  // Routes through Helicone only when HELICONE_API_KEY is set; otherwise the
  // spread is `{}` and the client is identical to before.
  cached = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...heliconeAnthropicOverrides("scripts-claude"),
  });
  return cached;
}

export async function callClaude(
  opts: ProviderCallOptions,
): Promise<ProviderCallResult> {
  const model = opts.model ?? CLAUDE_DEFAULT_MODEL;
  const resp = await client().messages.create({
    model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return { text, modelUsed: model };
}
