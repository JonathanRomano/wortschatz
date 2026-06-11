/**
 * POST /ai/generate-exercise service — the "full ownership" generation
 * endpoint (sprint Decision 1, Task 2.1). apps/api builds the prompt,
 * calls the provider, parses + validates the output against the canonical
 * per-type schemas, and returns the validated exercise. The web's
 * runGeneration stays the orchestrator (topic rotation, recent-examples
 * fetch, DB insert, GenerationSession) — it just delegates each item here
 * instead of calling the Anthropic SDK in the Next.js process.
 *
 * Why this lives in Express, not Next.js: a batch of N sequential 5–15s
 * Claude calls is exactly the heavy/long-running work the API boundary
 * (MONOREPO.md / ARCHITECTURE.md) reserves for apps/api, off the Vercel
 * serverless timeout.
 *
 * Notes:
 *  - No response cache: generation must stay fresh so the recent-examples
 *    anti-duplication block actually varies output (the v2 CLI never cached
 *    either). cacheHit is always false here.
 *  - Per-user daily rate limit fires on the API side when X-User-Id is
 *    present (admin UI calls); anonymous/CLI calls skip it, same as the
 *    review/evaluate endpoints.
 *  - Provider clients are tagged Helicone-Property-Source "express-ai-generate"
 *    so generation is distinguishable from review/evaluate ("api-service").
 */
import Anthropic from "@anthropic-ai/sdk";

import { getActiveBasePromptVoice, prisma } from "@wortschatz/database";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import {
  estimateCostMicrocents,
  heliconeAnthropicOverrides,
  heliconeRequestHeaders,
  type AiEndpoint,
} from "@wortschatz/config";
import {
  applyPromptVoice,
  buildPrompt,
  claudePrompts,
  extractJson,
  gptPrompts,
  normalizeTags,
  normalizeTitle,
  validateExercise,
  type CustomPrompt,
  type GeneratedExerciseDTO,
  type GenerationProvider,
  type PromptVoiceOverride,
  type RecentExample,
} from "@wortschatz/exercises";

import { AI_CONFIGURED, MODEL } from "../env.js";
import { checkAndIncrement } from "./rateLimit.js";
import { callGpt, GPT_CONFIGURED, type RawGenerationResult } from "./gpt.js";
import { stubGenerate } from "./stubs.js";

const ENDPOINT: AiEndpoint = "GENERATE_EXERCISE";

// --- Anthropic provider (generation) ----------------------------------
//
// A dedicated client from the review/evaluate one in claude.ts so generation
// calls carry the "express-ai-generate" Helicone source.

let cachedClaude: Anthropic | null = null;
function claudeClient(): Anthropic {
  if (cachedClaude) return cachedClaude;
  cachedClaude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...heliconeAnthropicOverrides("express-ai-generate"),
  });
  return cachedClaude;
}

async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens: number;
  model?: string;
  userId?: string;
}): Promise<RawGenerationResult> {
  const model = opts.model ?? MODEL;
  const resp = await claudeClient().messages.create(
    {
      model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    },
    { headers: heliconeRequestHeaders(opts.userId) },
  );
  const text = resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return {
    text,
    modelUsed: model,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
  };
}

async function recordUsage(args: {
  userId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Provenance tag (e.g. "test-generate"); NULL for normal runs. */
  source?: string;
}): Promise<void> {
  await prisma.aiUsage.create({
    data: {
      userId: args.userId ?? null,
      endpoint: ENDPOINT,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      costMicrocents: estimateCostMicrocents(
        args.model,
        args.inputTokens,
        args.outputTokens,
      ),
      cacheHit: false,
      source: args.source ?? null,
    },
  });
}

export interface GenerateInput {
  type: ExerciseType;
  level: CefrLevel;
  topic: string;
  recentExamples: RecentExample[];
  customPrompt?: CustomPrompt;
  provider: GenerationProvider;
  model?: string;
  /** Acting user (from X-User-Id) — drives the per-user rate limit. */
  userId?: string;
  /**
   * Forces a specific editable voice, bypassing the ACTIVE-version lookup —
   * the curation UI's "test-generate" passes a DRAFT's content here.
   */
  promptVoiceOverride?: PromptVoiceOverride;
  /** Provenance tag persisted to AiUsage.source (e.g. "test-generate"). */
  source?: string;
}

/**
 * Discriminated outcome. A model response that doesn't parse or doesn't
 * validate is `ok: false` (→ HTTP 422); a genuine provider/DB error throws
 * (→ HTTP 500); a rate-limit throws AiRateLimitedError (→ HTTP 429).
 */
export type GenerateOutcome =
  | { ok: true; exercise: GeneratedExerciseDTO }
  | { ok: false; errors: string[] };

export async function generateExercise(
  input: GenerateInput,
): Promise<GenerateOutcome> {
  const {
    type,
    level,
    topic,
    recentExamples,
    customPrompt,
    provider,
    model,
    userId,
    promptVoiceOverride,
    source,
  } = input;

  // Offline stub when the chosen provider has no key — mirrors the
  // review/evaluate stub behavior; writes nothing (no prompt resolved, so
  // no basePromptVersionId).
  const providerConfigured = provider === "gpt" ? GPT_CONFIGURED() : AI_CONFIGURED;
  if (!providerConfigured) {
    return { ok: true, exercise: stubGenerate(type, level, topic) };
  }

  // Resolve the editable voice (Decision 5/6/8): an explicit override
  // (test-generate of a DRAFT) wins; otherwise the ACTIVE DB version for
  // (type, level) on the Claude path (v1 is Claude-only); otherwise the
  // hardcoded per-type file unchanged. jsonShape/rules always stay locked.
  const baseParts = (provider === "gpt" ? gptPrompts : claudePrompts)[type];
  let parts = baseParts;
  let basePromptVersionId: string | null = null;
  if (promptVoiceOverride) {
    parts = applyPromptVoice(baseParts, promptVoiceOverride);
  } else if (provider === "claude") {
    const active = await getActiveBasePromptVoice(type, level);
    if (active) {
      parts = applyPromptVoice(baseParts, {
        systemPrompt: active.systemPrompt,
        userInstructions: active.userInstructions,
      });
      basePromptVersionId = active.versionId;
    }
  }

  const { system, user, maxTokens } = buildPrompt(
    parts,
    { level, topic, recentExamples },
    customPrompt,
  );

  // Per-user daily limit (admin UI). Throws AiRateLimitedError → 429.
  if (userId) await checkAndIncrement(userId, ENDPOINT);

  const raw =
    provider === "gpt"
      ? await callGpt({ system, user, maxTokens, model, userId })
      : await callClaude({ system, user, maxTokens, model, userId });

  // Parse + validate. Both misses are recorded as usage (tokens were spent)
  // and surfaced as ok:false → the route maps them to 422.
  let parsed: unknown;
  try {
    parsed = extractJson(raw.text);
  } catch (err) {
    await recordUsage({ userId, model: raw.modelUsed, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens, source });
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : "Response was not valid JSON."],
    };
  }

  const result = validateExercise(type, parsed);
  if (!result.ok) {
    await recordUsage({ userId, model: raw.modelUsed, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens, source });
    return { ok: false, errors: result.errors };
  }

  const obj = parsed as Record<string, unknown>;
  const exercise: GeneratedExerciseDTO = {
    title: normalizeTitle(obj.title, type, topic),
    content: result.content,
    solution: result.solution,
    explanation: result.explanation,
    tags: normalizeTags(obj.tags, topic, level),
    tip: result.tip,
    modelUsed: raw.modelUsed,
    basePromptVersionId,
    inputTokens: raw.inputTokens,
    outputTokens: raw.outputTokens,
  };

  await recordUsage({ userId, model: raw.modelUsed, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens, source });
  return { ok: true, exercise };
}
