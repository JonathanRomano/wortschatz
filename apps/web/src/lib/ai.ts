/**
 * Claude integration surface for Wortschatz (web side).
 *
 * Public functions (unchanged signatures, plus the optional `userId`
 * added in Sprint 02):
 *   - generateExercise(type, level, topic, userId?)
 *   - evaluateAnswer(exercise, userAnswer, userId?)
 *   - reviewText(text, userLevel, userId?)
 *
 * As of Sprint 03 Task 7, evaluateAnswer and reviewText delegate to
 * apps/api (POST /ai/evaluate-answer, /ai/review-text) via
 * `src/lib/api-client.ts`. The api owns the cache + rate-limit + usage
 * pipeline + stub fallback for those two endpoints. The web is just a
 * thin server-side caller — it still wraps the response in the same
 * Promise shape consumers already use, and the api translates rate
 * limits back into AiRateLimitedError throws.
 *
 * generateExercise stays here for now: its per-type Zod content/solution
 * schemas live in src/lib/exercises/schemas.ts (web-only) and aren't yet
 * extracted into a shared package, so the api can't host it. The admin
 * script apps/web/scripts/generate-exercises.ts continues to call it
 * directly with userId=undefined so per-user rate limits don't apply.
 *
 * When ANTHROPIC_API_KEY is missing the generateExercise path returns a
 * deterministic stub and writes nothing to the DB — keeps `vitest run`
 * and `next build` offline-safe. The evaluate/review stubs live in
 * apps/api/src/services/stubs.ts and run automatically when the api
 * itself has no key.
 */

import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";

import { prisma } from "@wortschatz/database";
import type { LocalizedText } from "@wortschatz/types";
import { contentSchemaFor, solutionSchemaFor } from "@/lib/exercises/schemas";
import {
  AI_CACHE_TTL_MS,
  estimateCostMicrocents,
  heliconeAnthropicOverrides,
  heliconeRequestHeaders,
  type AiEndpoint,
} from "@wortschatz/config";
import * as aiCache from "@/lib/ai-cache";
import { checkAndIncrement } from "@/lib/ai-rate-limit";

import { stubExercise } from "@/lib/ai-stubs";

export { AiRateLimitedError } from "@/lib/ai-rate-limit";
export {
  evaluateAnswerRemote as evaluateAnswer,
  reviewTextRemote as reviewText,
} from "@/lib/api-client";

// --- Config ------------------------------------------------------------

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export const AI_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);

const MAX_TOKENS: Record<AiEndpoint, number> = {
  GENERATE_EXERCISE: 1024,
  EVALUATE_ANSWER: 512,
  REVIEW_TEXT: 2048,
};

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  // The SDK reads ANTHROPIC_API_KEY from process.env by default; we pass
  // it explicitly for clarity. Never log this value. The Helicone spread is
  // `{}` unless HELICONE_API_KEY is set, so this is unchanged by default.
  cachedClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...heliconeAnthropicOverrides("web-ai-lib"),
  });
  return cachedClient;
}

let warnedMissingKey = false;
function warnMissingKeyOnce(fn: string) {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  console.warn(
    `[ai.ts] ${fn}: ANTHROPIC_API_KEY missing — returning deterministic stub. ` +
      `Set the env var to enable real Claude (${MODEL}) calls.`,
  );
}

// --- Public types ------------------------------------------------------

export type GeneratedExercise = {
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  content: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanation: LocalizedText;
  tags: string[];
  // Optional short hint that the learner can reveal at a Münzen cost.
  // When absent, the exercise renders no tip button.
  tip?: LocalizedText;
};

export type AIEvaluation = {
  score: number; // 0-100
  feedback: string;
};

export type ReviewResult = {
  feedback: string;
};

// --- Internal helpers --------------------------------------------------

function hashKey(endpoint: AiEndpoint, model: string, canonicalPrompt: string): string {
  return createHash("sha256")
    .update(`${endpoint}:${model}:${canonicalPrompt}`)
    .digest("hex");
}

/** Stable canonical JSON: keys sorted, no whitespace. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
    .join(",")}}`;
}

async function recordUsage(args: {
  userId: string | undefined;
  endpoint: AiEndpoint;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;
}): Promise<void> {
  await prisma.aiUsage.create({
    data: {
      userId: args.userId ?? null,
      endpoint: args.endpoint,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      costMicrocents: estimateCostMicrocents(
        args.model,
        args.inputTokens,
        args.outputTokens,
      ),
      cacheHit: args.cacheHit,
    },
  });
}

/**
 * Extract a JSON object from a Claude text response. Tolerates leading/
 * trailing prose and ``` fences which Claude sometimes emits despite the
 * "respond with JSON only" instruction. Throws when no balanced object
 * can be located.
 */
function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  // Fast path: the whole string parses.
  try {
    return JSON.parse(candidate);
  } catch {
    // Fall through to brace scan.
  }
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`Claude response is not valid JSON: ${candidate.slice(0, 200)}…`);
  }
  return JSON.parse(candidate.slice(first, last + 1));
}

/**
 * Concatenate text blocks from a `messages.create` response. Ignores any
 * non-text block types (tool_use, image, etc.) since our prompts ask for
 * plain text/JSON only.
 */
function textFromResponse(
  resp: Anthropic.Messages.Message,
): string {
  return resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// --- generateExercise --------------------------------------------------

const GENERATE_SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
Respond with a single JSON object and nothing else. No prose before or after, no markdown fences.
The German content of the exercise must be in correct, idiomatic German for the requested CEFR level.
Localized fields (explanation, tip) must be a JSON object with keys en, pt, tr, uk and a non-empty string for each.
The content and solution objects must match the per-type schema described in the user message exactly.`;

function generatePromptFor(
  type: ExerciseType,
  level: CefrLevel,
  topic: string,
): string {
  return JSON.stringify({
    type,
    level,
    topic,
    targetLanguage: "de",
    requirements: {
      title: "short German title",
      content: `must satisfy the Zod schema for type ${type}; see src/lib/exercises/schemas.ts`,
      solution: `must satisfy the solution Zod schema for type ${type}`,
      explanation: "object { en, pt, tr, uk } explaining the grammar/vocab point",
      tags: "array of 1-5 short lowercase tags",
      tip: "object { en, pt, tr, uk }, ONE short sentence each — a gentle nudge that hints at the structure or vocabulary needed WITHOUT revealing the solution. Examples: 'Watch out for the accusative case after “durch”.', 'The verb has a separable prefix.'. Keep it under ~120 characters per locale.",
    },
  });
}

export async function generateExercise(
  type: ExerciseType,
  level: CefrLevel,
  topic: string,
  userId?: string,
): Promise<GeneratedExercise> {
  if (!AI_CONFIGURED) {
    warnMissingKeyOnce("generateExercise");
    return stubExercise(type, level, topic);
  }

  const endpoint: AiEndpoint = "GENERATE_EXERCISE";
  const userPrompt = generatePromptFor(type, level, topic);
  const key = hashKey(endpoint, MODEL, canonicalize({ system: GENERATE_SYSTEM, user: userPrompt }));

  const cached = await aiCache.get(key);
  if (cached) {
    await recordUsage({
      userId,
      endpoint,
      model: MODEL,
      inputTokens: cached.inputTokens,
      outputTokens: cached.outputTokens,
      cacheHit: true,
    });
    return cached.response as GeneratedExercise;
  }

  if (userId) await checkAndIncrement(userId, endpoint);

  const resp = await getClient().messages.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS[endpoint],
      system: GENERATE_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    },
    // Tags the request with Helicone-User-Id when Helicone + a userId are
    // present; an empty header set otherwise (no behavioral change).
    { headers: heliconeRequestHeaders(userId) },
  );

  const raw = textFromResponse(resp);
  const parsed = extractJson(raw) as Record<string, unknown>;

  // Validate the type-specific content + solution. We don't validate the
  // localized explanation here — the renderer falls back to
  // English via pickLocalized() if a locale is missing.
  const ContentSchema = contentSchemaFor[type];
  const SolutionSchema = solutionSchemaFor[type];
  const contentParsed = ContentSchema.safeParse(parsed.content);
  if (!contentParsed.success) {
    throw new Error(
      `generateExercise: invalid content for ${type}: ${contentParsed.error.message}`,
    );
  }
  const solutionParsed = SolutionSchema.safeParse(parsed.solution);
  if (!solutionParsed.success) {
    throw new Error(
      `generateExercise: invalid solution for ${type}: ${solutionParsed.error.message}`,
    );
  }

  // Tip is best-effort. Accept only when it's an object with at least one
  // non-empty string value — drop malformed/empty tips silently so a flaky
  // Claude run doesn't fail the whole generation.
  const rawTip = parsed.tip;
  let tip: LocalizedText | undefined;
  if (rawTip && typeof rawTip === "object" && !Array.isArray(rawTip)) {
    const entries = Object.entries(rawTip as Record<string, unknown>).filter(
      ([, v]) => typeof v === "string" && v.trim().length > 0,
    );
    if (entries.length > 0) {
      tip = Object.fromEntries(entries) as LocalizedText;
    }
  }

  const out: GeneratedExercise = {
    type,
    level,
    title:
      typeof parsed.title === "string" && parsed.title.length > 0
        ? parsed.title
        : `${type.replace(/_/g, " ").toLowerCase()}: ${topic}`,
    content: contentParsed.data as Record<string, unknown>,
    solution: solutionParsed.data as Record<string, unknown>,
    explanation: (parsed.explanation as LocalizedText | undefined) ?? {},
    tags: Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[])
          .filter((t): t is string => typeof t === "string")
          .slice(0, 5)
      : [topic, level.toLowerCase()],
    ...(tip ? { tip } : {}),
  };

  await recordUsage({
    userId,
    endpoint,
    model: MODEL,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheHit: false,
  });
  await aiCache.set({
    key,
    endpoint,
    model: MODEL,
    response: out,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    ttlMs: AI_CACHE_TTL_MS[endpoint],
  });

  return out;
}

// evaluateAnswer + reviewText now live in apps/api and are re-exported
// from @/lib/api-client at the top of this file. The in-process versions
// (and their EVALUATE_SYSTEM / REVIEW_SYSTEM prompts, cache logic, etc.)
// were deleted in Sprint 03 Task 7 — see apps/api/src/services/claude.ts
// for the canonical implementation.
