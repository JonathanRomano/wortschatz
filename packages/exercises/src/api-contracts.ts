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
import type { PromptVoiceOverride } from "./prompt-override.js";

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
  /**
   * Forces a specific editable voice (system + userInstructions), bypassing
   * the ACTIVE-version lookup. Used by the curation UI's "test-generate" to
   * preview a DRAFT version's content before publishing it (Task 3.4).
   */
  promptVoiceOverride?: PromptVoiceOverride;
  /**
   * Provenance tag persisted to AiUsage.source. "test-generate" marks a
   * draft-prompt preview so its tokens are distinguishable from real runs.
   */
  source?: string;
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
  /**
   * The ACTIVE BasePromptVersion that drove this generation, or null when
   * the hardcoded file fallback was used (no active DB version) or the run
   * was a draft preview / stub. Threaded onto Exercise.basePromptVersionId
   * by the web inserter (Decision 7).
   */
  basePromptVersionId?: string | null;
  /** Real provider token usage (omitted by the stub). Surfaced by the
   *  curation "test-generate" UI as the token cost of the preview. */
  inputTokens?: number;
  outputTokens?: number;
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
