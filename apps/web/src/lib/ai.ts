/**
 * Claude integration surface for Wortschatz.
 *
 * Public functions (unchanged signatures, plus a new optional `userId`):
 *   - generateExercise(type, level, topic, userId?)
 *   - evaluateAnswer(exercise, userAnswer, userId?)
 *   - reviewText(text, userLevel, userId?)
 *
 * Each wrapper:
 *   1. Computes a cache key = SHA-256(endpoint:model:canonicalPrompt).
 *   2. Returns the cached response on hit (still logs an AiUsage row with
 *      `cacheHit = true` so the dashboard reflects load).
 *   3. On miss, rate-limits the calling user (when one is provided),
 *      calls Claude via @anthropic-ai/sdk, validates with Zod where
 *      applicable, then persists usage + cache.
 *
 * When ANTHROPIC_API_KEY is missing we log a single named-only warning
 * and return the deterministic stubs from `stubs.ts` — no DB writes at
 * all in that path, so the cache + usage tables stay empty until the
 * key is set. This keeps `vitest run` and `next build` offline-safe.
 */

import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { CefrLevel, Exercise, ExerciseType } from "@wortschatz/database";

import { prisma } from "@wortschatz/database";
import type { LocalizedText } from "@wortschatz/types";
import { contentSchemaFor, solutionSchemaFor } from "@/lib/exercises/schemas";
import {
  AI_CACHE_TTL_MS,
  estimateCostMicrocents,
  type AiEndpoint,
} from "@wortschatz/config";
import * as aiCache from "@/lib/ai-cache";
import {
  AiRateLimitedError,
  checkAndIncrement,
} from "@/lib/ai-rate-limit";

import { stubExercise, stubEvaluation, stubReview } from "@/lib/ai-stubs";

export { AiRateLimitedError } from "@/lib/ai-rate-limit";

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
  // it explicitly for clarity. Never log this value.
  cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
  instructions: LocalizedText;
  content: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanation: LocalizedText;
  tags: string[];
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
Localized fields (instructions, explanation) must be a JSON object with keys en, pt, tr, uk and a non-empty string for each.
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
      instructions: "object { en, pt, tr, uk }",
      content: `must satisfy the Zod schema for type ${type}; see src/lib/exercises/schemas.ts`,
      solution: `must satisfy the solution Zod schema for type ${type}`,
      explanation: "object { en, pt, tr, uk } explaining the grammar/vocab point",
      tags: "array of 1-5 short lowercase tags",
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

  const resp = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS[endpoint],
    system: GENERATE_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = textFromResponse(resp);
  const parsed = extractJson(raw) as Record<string, unknown>;

  // Validate the type-specific content + solution. We don't validate the
  // localized instructions/explanation here — the renderer falls back to
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

  const out: GeneratedExercise = {
    type,
    level,
    title:
      typeof parsed.title === "string" && parsed.title.length > 0
        ? parsed.title
        : `${type.replace(/_/g, " ").toLowerCase()}: ${topic}`,
    instructions: (parsed.instructions as LocalizedText | undefined) ?? {},
    content: contentParsed.data as Record<string, unknown>,
    solution: solutionParsed.data as Record<string, unknown>,
    explanation: (parsed.explanation as LocalizedText | undefined) ?? {},
    tags: Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[])
          .filter((t): t is string => typeof t === "string")
          .slice(0, 5)
      : [topic, level.toLowerCase()],
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

// --- evaluateAnswer ----------------------------------------------------

const EVALUATE_SYSTEM = `You are a strict but encouraging German teacher grading a single exercise attempt.
Respond with one JSON object and nothing else, of the shape:
  { "score": <integer 0-100>, "feedback": "<one short paragraph>" }
Score 100 for a fully correct answer, 60-99 for a minor mistake, below 60 for a wrong answer.
The feedback must be in English, no more than three sentences, and reference the specific error if any.`;

export async function evaluateAnswer(
  exercise: Pick<Exercise, "type" | "content" | "solution" | "explanation">,
  userAnswer: unknown,
  userId?: string,
): Promise<AIEvaluation> {
  if (!AI_CONFIGURED) {
    warnMissingKeyOnce("evaluateAnswer");
    return stubEvaluation();
  }

  const endpoint: AiEndpoint = "EVALUATE_ANSWER";
  const userPrompt = JSON.stringify({
    exercise: {
      type: exercise.type,
      content: exercise.content,
      solution: exercise.solution,
    },
    userAnswer,
  });
  const key = hashKey(endpoint, MODEL, canonicalize({ system: EVALUATE_SYSTEM, user: userPrompt }));

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
    return cached.response as AIEvaluation;
  }

  if (userId) await checkAndIncrement(userId, endpoint);

  const resp = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS[endpoint],
    system: EVALUATE_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = textFromResponse(resp);
  const parsed = extractJson(raw) as Record<string, unknown>;

  const scoreNum = typeof parsed.score === "number" ? parsed.score : Number(parsed.score);
  const feedback = typeof parsed.feedback === "string" ? parsed.feedback : "";
  if (!Number.isFinite(scoreNum) || feedback.length === 0) {
    throw new Error(
      `evaluateAnswer: malformed Claude response: ${raw.slice(0, 200)}…`,
    );
  }
  const out: AIEvaluation = {
    score: Math.max(0, Math.min(100, Math.round(scoreNum))),
    feedback,
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

// --- reviewText --------------------------------------------------------

const REVIEW_SYSTEM = `You are a German tutor giving detailed Markdown feedback on a user-submitted text.
The user's CEFR level is provided. Structure the feedback as Markdown with these sections, in order:
  ## Grammar
  ## Vocabulary
  ## Style
  ## Corrected version
Be encouraging but specific. Quote the user's wording when pointing out issues. Keep total length under ~400 words.`;

export async function reviewText(
  text: string,
  userLevel: CefrLevel,
  userId?: string,
): Promise<ReviewResult> {
  if (!AI_CONFIGURED) {
    warnMissingKeyOnce("reviewText");
    return stubReview(text, userLevel, MODEL);
  }

  const endpoint: AiEndpoint = "REVIEW_TEXT";
  const userPrompt = JSON.stringify({ level: userLevel, text });
  // Per-user-personalized; we still compute a key for tracing, but
  // AI_CACHE_TTL_MS.REVIEW_TEXT is 0 so the write is skipped.
  const key = hashKey(endpoint, MODEL, canonicalize({ system: REVIEW_SYSTEM, user: userPrompt }));

  // Skip cache lookup since TTL is 0 — saves a roundtrip.
  if (userId) await checkAndIncrement(userId, endpoint);

  const resp = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS[endpoint],
    system: REVIEW_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const feedback = textFromResponse(resp).trim();
  if (feedback.length === 0) {
    throw new Error("reviewText: Claude returned an empty response.");
  }
  const out: ReviewResult = { feedback };

  await recordUsage({
    userId,
    endpoint,
    model: MODEL,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheHit: false,
  });
  // Cache write is a no-op when TTL is 0 but we call it for symmetry —
  // ai-cache.set short-circuits the DB write.
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
