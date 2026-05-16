import type { CefrLevel, ExerciseType } from "@wortschatz/database";

import type { GeneratedExercise } from "./exercise.js";

/** Endpoints the Claude wrapper exposes (rate-limited per user). */
export type AiEndpoint = "REVIEW_TEXT" | "EVALUATE_ANSWER" | "GENERATE_EXERCISE";

export interface AIEvaluation {
  /** 0-100 */
  score: number;
  feedback: string;
}

export interface ReviewResult {
  feedback: string;
}

// --- Wire formats for apps/api ----------------------------------------
//
// These mirror what apps/api will accept and return once Task 6 lands.
// Defining them here means both the Express handlers and the Next.js
// client get the same shape from a single source — no drift.

export interface GenerateExerciseRequest {
  type: ExerciseType;
  level?: CefrLevel;
  topic?: string;
}

export type GenerateExerciseResponse = GeneratedExercise;

export interface ReviewTextRequest {
  text: string;
  level?: CefrLevel;
}

export type ReviewTextResponse = ReviewResult;

export interface RateLimitedResponse {
  error: "rate_limited";
  /** Seconds until the window resets, when the server can compute it. */
  retryAfterSec?: number;
}
