/**
 * web ↔ api contract for POST /ai/generate-exercise.
 *
 * Defined in the shared package so apps/api (the endpoint) and apps/web
 * (the api-client caller in src/lib/api-client.ts) speak the exact same
 * shapes — no duplicated/drifting interfaces across the boundary.
 *
 * The request is what the web's runGeneration sends per item: the resolved
 * topic, the fetched recent examples (anti-duplication), the optional
 * editable prompt overrides, and which provider to use. The response on
 * success is the validated, normalized exercise (no DB id — the web inserts
 * it and owns the GenerationSession). Validation/parse misses come back as a
 * 422 with `code: "validation_failed"`; rate limits as 429.
 */
import type { CefrLevel, ExerciseType } from "@wortschatz/database";

import type { CustomPrompt, RecentExample } from "./prompt-types.js";

export type GenerationProvider = "claude" | "gpt";

export interface GenerateExerciseRequest {
  type: ExerciseType;
  level: CefrLevel;
  topic: string;
  recentExamples: RecentExample[];
  customPrompt?: CustomPrompt;
  provider?: GenerationProvider;
  /** Overrides the provider's default model when set. */
  model?: string;
}

/** Success body — the validated exercise, ready for the web to insert. */
export interface GeneratedExerciseDTO {
  title: string;
  content: unknown;
  solution: unknown;
  explanation: unknown;
  tags: string[];
  tip?: unknown;
  /** The model that actually produced it — persisted to Exercise.model. */
  modelUsed: string;
}

export type GenerateExerciseErrorCode =
  | "invalid_request"
  | "validation_failed"
  | "rate_limited"
  | "model_error"
  | "internal_error";

export interface GenerateExerciseErrorResponse {
  error: string;
  code: GenerateExerciseErrorCode;
  /** Per-field validation messages when code is "validation_failed". */
  errors?: string[];
}
