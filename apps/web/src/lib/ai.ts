/**
 * Claude integration surface for Wortschatz (web side) — now a thin
 * re-export layer.
 *
 * Every LLM call the web makes goes through apps/api: `evaluateAnswer` and
 * `reviewText` delegate to it via src/lib/api-client.ts, and as of the
 * API-boundary sprint exercise generation does too (the admin route and the
 * CLI call POST /ai/generate-exercise). There is no longer an in-process
 * Anthropic SDK client here — that's the whole point of the boundary: no file
 * under apps/web/src may import @anthropic-ai/sdk. See ARCHITECTURE.md.
 *
 * Consumers keep their existing import paths:
 *   - evaluateAnswer / reviewText (server actions in exercises/, review/)
 *   - AiRateLimitedError (caught at those call sites)
 *   - AI_CONFIGURED (whether the web env has a Claude key; gates the optional
 *     AI grading fallback in submitExerciseAttempt)
 */

export { AiRateLimitedError } from "@/lib/ai-rate-limit";
export {
  evaluateAnswerRemote as evaluateAnswer,
  reviewTextRemote as reviewText,
} from "@/lib/api-client";

/**
 * True iff the web process has an ANTHROPIC_API_KEY. `submitExerciseAttempt`
 * checks this before attempting AI grading; the actual call still runs on
 * apps/api. (apps/api has its own key and its own stub fallback.)
 */
export const AI_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);
