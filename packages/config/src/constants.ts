/**
 * App-wide constants. Pure values only — no imports of @prisma/client
 * or anything that pulls in a runtime, so this file can be loaded from
 * Next.js edge runtimes, Express, vitest, and one-shot scripts alike.
 *
 * The web app still owns in-tree copies of several of these values
 * (src/lib/muenzen.ts, src/config/limits.ts, src/config/moderation.ts,
 * src/lib/dashboard/constants.ts, src/i18n/config.ts). Task 5 switches
 * those callers to import from here; until then keep the values
 * mirrored or they'll drift.
 */

// --- Locales -----------------------------------------------------------

export const SUPPORTED_LOCALES = ["en", "pt", "tr", "uk"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// --- Münzen (currency) -------------------------------------------------
//
// Mirrors MUENZEN_RULES in apps/web/src/lib/muenzen.ts. The web app's
// `computeReward()` returns the three components separately so each
// gets its own MuenzenTransaction row (EXERCISE_COMPLETE,
// PERFECT_SCORE_BONUS, DAILY_STREAK). Keep these values aligned.

export const MUENZEN_REWARDS = {
  /** Awarded once per (user, exercise) on the first pass (score >= 60). */
  EXERCISE_COMPLETE: 10,
  /** Additional credit when score === 100, written as its own transaction. */
  PERFECT_SCORE_BONUS: 5,
  /** First exercise of a calendar day. */
  DAILY_STREAK: 20,
} as const;

export const MUENZEN_COSTS = {
  AI_REVIEW: 30,
} as const;

// --- Daily goal --------------------------------------------------------

export const DAILY_GOAL_DEFAULT = 5;

// --- AI rate limits ----------------------------------------------------
//
// Rolling 24h window per (user, endpoint). Cache hits do not count.

export const AI_RATE_LIMITS = {
  REVIEW_TEXT: { perDay: 20 },
  EVALUATE_ANSWER: { perDay: 200 },
  GENERATE_EXERCISE: { perDay: 50 },
} as const;

export type AiEndpoint = keyof typeof AI_RATE_LIMITS;

// --- AI cache TTLs (milliseconds) --------------------------------------
//
// 0 = never cache. REVIEW_TEXT is personalized to the user so it would
// be wrong to share across users.

export const AI_CACHE_TTL_MS = {
  GENERATE_EXERCISE: 30 * 24 * 60 * 60 * 1000, // 30 days
  EVALUATE_ANSWER: 60 * 60 * 1000, // 1 hour
  REVIEW_TEXT: 0,
} as const satisfies Record<AiEndpoint, number>;

// --- Anthropic per-token pricing (microcents) --------------------------
//
// 1 cent = 100 µ¢, so 1 USD = 100_000 µ¢. Persisted on AiUsage as an
// integer to avoid float drift. Update when Anthropic publishes new
// per-1M-token prices.
//   Sonnet 4.6: $3.00 in / $15.00 out  -> 30 / 150 µ¢/tok
//   Haiku 4.5:  $0.80 in / $4.00 out   -> 8  / 40  µ¢/tok
//   Opus 4.7:   $15.00 in / $75.00 out -> 150 / 750 µ¢/tok

export const AI_MODEL_PRICING_MICROCENTS_PER_TOKEN = {
  "claude-sonnet-4-6": { input: 30, output: 150 },
  "claude-haiku-4-5": { input: 8, output: 40 },
  "claude-opus-4-7": { input: 150, output: 750 },
} as const;

export type AiModelId = keyof typeof AI_MODEL_PRICING_MICROCENTS_PER_TOKEN;

// --- Comment moderation ------------------------------------------------

export const COMMENT_MAX_LENGTH = 500;

export const COMMENT_RATE_LIMIT = {
  PER_MINUTE: 5,
  WINDOW_MS: 60 * 1000,
} as const;

export const COMMENT_WORD_BLOCKLIST: ReadonlyArray<string> = [];

// --- Avatar uploads ----------------------------------------------------

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const AVATAR_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const AVATAR_OUTPUT_SIZE = 512;
