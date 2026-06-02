/**
 * Shared CLI + prompt contract for the v2 exercise generators.
 *
 * Both providers (claude/, gpt/) depend on these shapes. As of the admin
 * generator sprint, each provider's per-type prompt file exports a
 * `promptParts: PromptParts` object — four independently-named pieces
 * (system / instructions / jsonShape / rules) so the admin UI can override
 * the editable "voice" (system + instructions) while the runner keeps the
 * JSON shape and rules locked. `buildPrompt` / `buildFinalUserPrompt` in
 * shared/prompt-builder.ts compose the pieces; the shared runner (run.ts)
 * drives the per-run flow against whichever provider client + registry it's
 * given and returns a structured GenerationResult.
 *
 * We intentionally do NOT reuse `GeneratedExercise` from
 * `@wortschatz/types` here — that type still carries the dropped
 * `instructions` field and lacks `tip`. These local types are the
 * source of truth for the generator scripts.
 */
import type { CefrLevel, ExerciseType } from "@wortschatz/database";

export type { CefrLevel, ExerciseType };

/** Levels the generators currently target (schemas support up to C2). */
export const SUPPORTED_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type SupportedLevel = (typeof SUPPORTED_LEVELS)[number];

/**
 * One previously-generated exercise, reduced to a single representative
 * line for the anti-duplication block in the user prompt.
 */
export interface RecentExample {
  title: string;
  /** Type-specific excerpt, e.g. the FITB sentence or the MC question. */
  excerpt: string;
}

export interface PromptInput {
  level: CefrLevel;
  topic: string;
  /** Last N exercises of the same type+level. Empty when --no-recent. */
  recentExamples: RecentExample[];
}

/** The composed prompt handed to a provider client. */
export interface PromptOutput {
  system: string;
  user: string;
  /** Type-specific token budget for the generation call. */
  maxTokens: number;
}

/**
 * A per-type prompt, split into independently-named pieces.
 *
 * - `system` and `instructions` are the EDITABLE "voice": the admin UI may
 *   override them (Decision 2). `instructions` is everything that precedes
 *   the recent-examples block — the intro line plus the level/topic/target
 *   header.
 * - `jsonShape` and `rules` are LOCKED: the runner always injects the
 *   canonical versions so a custom prompt can't break validation.
 *
 * `buildFinalUserPrompt` assembles the user message as:
 *   instructions · recentBlock · jsonShape · rules
 * reproducing the legacy monolithic prompt byte-for-byte (see the parity
 * test in shared/__tests__).
 */
export interface PromptParts {
  /** Default system prompt for the type (editable voice). */
  system: string;
  /** Type-specific token budget for the generation call. */
  maxTokens: number;
  /** Editable instructions portion — intro + level/topic/target header. */
  instructions: (input: PromptInput) => string;
  /** LOCKED canonical JSON shape block (header line + literal template). */
  jsonShape: (input: PromptInput) => string;
  /** LOCKED rules / constraints portion. */
  rules: (input: PromptInput) => string;
}

/** A provider's 10 prompt definitions, keyed by ExerciseType. */
export type PromptRegistry = Record<ExerciseType, PromptParts>;

// --- Provider client contract -----------------------------------------

export interface ProviderCallOptions {
  system: string;
  user: string;
  maxTokens: number;
  /** Overrides the provider's default model when set. */
  model?: string;
}

export interface ProviderCallResult {
  /** Raw text payload (expected to contain a single JSON object). */
  text: string;
  /** The model actually used — persisted to Exercise.model. */
  modelUsed: string;
}

export type ProviderClient = (
  opts: ProviderCallOptions,
) => Promise<ProviderCallResult>;

// --- CLI ---------------------------------------------------------------

export interface CliArgs {
  type: ExerciseType;
  level: CefrLevel;
  count: number;
  /** When omitted, the runner cycles through TOPICS_BY_LEVEL[level]. */
  topic?: string;
  /** Generate + validate but don't insert; print to stdout. */
  dryRun: boolean;
  /** Skip the recent-examples anti-duplication step. */
  noRecent: boolean;
  /** Always print the recent-examples block that was sent to the model. */
  verbose: boolean;
  /** Delay between provider calls to dodge rate limits. */
  delayMs: number;
  /** Override the provider's default model. */
  model?: string;
}

// --- Generation request / context / result ----------------------------

export type GenerationSource = "UI" | "CLI";

/** Admin-supplied overrides for the editable portions of a prompt. */
export interface CustomPrompt {
  /** Replaces the default system prompt when a non-empty string. */
  system?: string;
  /** Replaces the default instructions portion when a non-empty string. */
  userInstructions?: string;
}

/**
 * What a caller asks the runner to generate. The CLI maps its parsed
 * `CliArgs` onto this; the admin API builds it from the request body.
 */
export interface GenerationRequest {
  type: ExerciseType;
  level: CefrLevel;
  topic?: string;
  count: number;
  dryRun?: boolean;
  noRecent?: boolean;
  customPrompt?: CustomPrompt;
  /** For UI calls only — links the run to a saved prompt template. */
  savedPromptId?: string;
}

/**
 * Session wiring passed by the API → runGeneration. When omitted (the CLI
 * case) the runner opens its own session with `source: "CLI"` authored by
 * the seed admin. When provided, all generated exercises are linked to the
 * given session and the runner finalizes it on completion.
 */
export interface GenerationContext {
  sessionId: string;
  authorId: string;
  source: GenerationSource;
}

export interface GeneratedExerciseSummary {
  /** Row id when inserted; null on a dry run. */
  id: string | null;
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  topic: string;
  modelUsed: string;
  content: unknown;
  solution: unknown;
  explanation: unknown;
  tags: string[];
  tip?: unknown;
}

export type GenerationFailureCode =
  | "validation_error"
  | "model_error"
  | "rate_limited"
  | "parse_error"
  | "unknown";

export interface GenerationFailure {
  index: number;
  topic: string;
  reason: string;
  code: GenerationFailureCode;
}

export interface GenerationResult {
  /** The session every real run is linked to; "" on a dry run. */
  sessionId: string;
  generated: GeneratedExerciseSummary[];
  failed: GenerationFailure[];
  totalDurationMs: number;
  cacheHits: number;
}
