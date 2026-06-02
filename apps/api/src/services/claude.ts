/**
 * Claude wrapper for apps/api. Same caching + rate-limit + usage-logging
 * pipeline as the original apps/web/src/lib/ai.ts, just operating without
 * Next.js context. Web calls reach here via apps/web/src/lib/api-client.ts
 * (added in Task 7).
 *
 * generateExercise is deliberately not implemented — its Zod schemas for
 * the per-type content/solution still live in apps/web, and extracting
 * them into a shared package is out of scope for this sprint. The route
 * returns 501 until then.
 */
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "@wortschatz/database";
import type { AIEvaluation, ReviewResult } from "@wortschatz/types";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import {
  AI_CACHE_TTL_MS,
  estimateCostMicrocents,
  heliconeAnthropicOverrides,
  heliconeRequestHeaders,
  type AiEndpoint,
} from "@wortschatz/config";

import { AI_CONFIGURED, MODEL } from "../env.js";
import * as aiCache from "./cache.js";
import { checkAndIncrement } from "./rateLimit.js";
import { stubEvaluation, stubReview } from "./stubs.js";

const MAX_TOKENS: Record<AiEndpoint, number> = {
  GENERATE_EXERCISE: 1024,
  EVALUATE_ANSWER: 512,
  REVIEW_TEXT: 2048,
};

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  // Helicone spread is `{}` unless HELICONE_API_KEY is set — identical to
  // before by default.
  cachedClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...heliconeAnthropicOverrides("api-service"),
  });
  return cachedClient;
}

let warnedMissingKey = false;
function warnMissingKeyOnce(fn: string): void {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  console.warn(
    `[api/claude] ${fn}: ANTHROPIC_API_KEY missing — returning deterministic stub. ` +
      `Set the env var to enable real Claude (${MODEL}) calls.`,
  );
}

// --- Internal helpers -------------------------------------------------

function hashKey(
  endpoint: AiEndpoint,
  model: string,
  canonicalPrompt: string,
): string {
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

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    // brace-scan fallback
  }
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(
      `Claude response is not valid JSON: ${candidate.slice(0, 200)}…`,
    );
  }
  return JSON.parse(candidate.slice(first, last + 1));
}

function textFromResponse(resp: Anthropic.Messages.Message): string {
  return resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// --- reviewText -------------------------------------------------------

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
  const key = hashKey(
    endpoint,
    MODEL,
    canonicalize({ system: REVIEW_SYSTEM, user: userPrompt }),
  );

  // REVIEW_TEXT TTL is 0 (personalized), so skip the lookup roundtrip.
  if (userId) await checkAndIncrement(userId, endpoint);

  const resp = await getClient().messages.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS[endpoint],
      system: REVIEW_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    },
    { headers: heliconeRequestHeaders(userId) },
  );
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
  // No-op for TTL=0 but called for symmetry.
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

// --- evaluateAnswer ---------------------------------------------------

const EVALUATE_SYSTEM = `You are a strict but encouraging German teacher grading a single exercise attempt.
Respond with one JSON object and nothing else, of the shape:
  { "score": <integer 0-100>, "feedback": "<one short paragraph>" }
Score 100 for a fully correct answer, 60-99 for a minor mistake, below 60 for a wrong answer.
The feedback must be in English, no more than three sentences, and reference the specific error if any.`;

export async function evaluateAnswer(
  exercise: { type: ExerciseType; content: unknown; solution: unknown },
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
  const key = hashKey(
    endpoint,
    MODEL,
    canonicalize({ system: EVALUATE_SYSTEM, user: userPrompt }),
  );

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

  const resp = await getClient().messages.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS[endpoint],
      system: EVALUATE_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    },
    { headers: heliconeRequestHeaders(userId) },
  );

  const raw = textFromResponse(resp);
  const parsed = extractJson(raw) as Record<string, unknown>;

  const scoreNum =
    typeof parsed.score === "number" ? parsed.score : Number(parsed.score);
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
