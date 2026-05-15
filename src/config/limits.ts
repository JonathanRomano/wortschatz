/**
 * Tunables for the Claude integration in `src/lib/ai.ts`.
 *
 * Keep this file free of imports so it can be read from both server-side
 * route handlers and migration/seed scripts without pulling in the Prisma
 * client. Pure constants only.
 */

export const AI_RATE_LIMITS = {
  // User-facing endpoints.
  REVIEW_TEXT: { perDay: 20 },
  EVALUATE_ANSWER: { perDay: 200 }, // generous, used as fallback grader
  // Admin/system endpoints. The limit applies per-admin.
  GENERATE_EXERCISE: { perDay: 50 },
} as const;

export type AiEndpoint = keyof typeof AI_RATE_LIMITS;

// Cache TTLs (in ms). 0 disables caching for an endpoint.
export const AI_CACHE_TTL_MS = {
  GENERATE_EXERCISE: 30 * 24 * 60 * 60 * 1000, // 30 days — exercises are reusable.
  EVALUATE_ANSWER: 60 * 60 * 1000,             // 1 hour — dedupe rapid repeats only.
  REVIEW_TEXT: 0,                              // never cache — personalized to the user.
} as const satisfies Record<AiEndpoint, number>;

// Microcents per token (1 cent = 100 microcents, so 1 USD = 100_000 µ¢).
// Quoted from Anthropic's published per-1M-token prices:
//   Sonnet 4.6: $3.00 in / $15.00 out  -> 30 / 150 µ¢/tok
//   Haiku 4.5:  $0.80 in / $4.00 out   -> 8  / 40  µ¢/tok
//   Opus 4.7:   $15.00 in / $75.00 out -> 150 / 750 µ¢/tok
// Update when Anthropic publishes new prices.
export const AI_MODEL_PRICING_MICROCENTS_PER_TOKEN = {
  "claude-sonnet-4-6": { input: 30, output: 150 },
  "claude-haiku-4-5": { input: 8, output: 40 },
  "claude-opus-4-7": { input: 150, output: 750 },
} as const;

export type AiModelId = keyof typeof AI_MODEL_PRICING_MICROCENTS_PER_TOKEN;

/**
 * Convert a (model, tokens) pair to integer microcents. Returns 0 with a
 * console.warn for unknown models so we never lose a usage row on a typo
 * or a freshly-released model id.
 */
export function estimateCostMicrocents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price =
    AI_MODEL_PRICING_MICROCENTS_PER_TOKEN[
      model as AiModelId
    ];
  if (!price) {
    console.warn(
      `[ai] estimateCostMicrocents: no pricing entry for model "${model}" — recording cost as 0.`,
    );
    return 0;
  }
  return price.input * inputTokens + price.output * outputTokens;
}
