/**
 * Web-only orchestration contract for the v2 exercise generators.
 *
 * The prompt/content contract types (PromptParts, PromptInput, PromptOutput,
 * PromptRegistry, RecentExample, CustomPrompt) now live in
 * `@wortschatz/exercises` so apps/api can build + validate the exact same
 * prompts the CLI does. They're re-exported here so existing
 * `from "./types"` / `from "../../shared/types"` imports keep resolving.
 *
 * This file keeps the things that are web-side only: the provider-client
 * seam used by the CLI's direct SDK clients, the CLI arg shape, and the
 * GenerationRequest / GenerationContext / GenerationResult orchestration
 * types consumed by run.ts and the admin route.
 */
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import type { ProfessionSlug } from "@wortschatz/config";
import type {
  CustomPrompt,
  PromptInput,
  PromptOutput,
  PromptParts,
  PromptRegistry,
  RecentExample,
} from "@wortschatz/exercises";

export type { CefrLevel, ExerciseType };
export type {
  CustomPrompt,
  PromptInput,
  PromptOutput,
  PromptParts,
  PromptRegistry,
  RecentExample,
};

/** Levels the generators currently target (schemas support up to C2). */
export const SUPPORTED_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type SupportedLevel = (typeof SUPPORTED_LEVELS)[number];

// --- Provider client contract -----------------------------------------
//
// The text-in/text-out seam the CLI's direct SDK clients (scripts/{claude,
// gpt}/client.ts) implement. The runtime/UI path no longer goes through a
// ProviderClient — it calls the Express /ai/generate-exercise endpoint —
// but the CLI's offline fallback still uses these.

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
  /** Sprint 05 — stamp `beruf:<slug>` on every generated exercise. */
  profession?: ProfessionSlug;
  /** Sprint 05 — stamp `unit:<slug>` (track-unit membership). */
  unit?: string;
}

// --- Generation request / context / result ----------------------------

export type GenerationSource = "UI" | "CLI";

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
  /**
   * Sprint 05 — when set, every exercise this run saves gets the
   * `beruf:<slug>` tag appended (career-track content). Tagging happens
   * at save time in run.ts, never in the model output.
   */
  professionSlug?: ProfessionSlug;
  /** Sprint 05 — companion `unit:<slug>` tag (track-unit membership). */
  unitSlug?: string;
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
  /** The ACTIVE BasePromptVersion that produced it, or null (file fallback). */
  basePromptVersionId?: string | null;
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

// --- Per-item generation seam -----------------------------------------
//
// runGeneration delegates each item to an ExerciseGenerator. Two
// implementations live in ./generators: a remote one (POST
// /ai/generate-exercise on apps/api — the default for the UI and a reachable
// CLI) and a direct one (the in-process SDK client, the CLI's offline
// fallback). Both return the validated, normalized exercise; the loop only
// orchestrates and inserts. See ARCHITECTURE.md for why the heavy work lives
// on apps/api.

export interface GenerateOneInput {
  type: ExerciseType;
  level: CefrLevel;
  topic: string;
  recentExamples: RecentExample[];
  customPrompt?: CustomPrompt;
  /** Provider model override (CLI --model). */
  model?: string;
}

export interface GeneratedExercisePayload {
  title: string;
  content: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanation: Record<string, unknown>;
  tags: string[];
  tip?: Record<string, unknown>;
  /** The model that actually produced it. */
  modelUsed: string;
  /**
   * The ACTIVE BasePromptVersion that drove generation, or null when the
   * hardcoded file fallback was used. Threaded onto Exercise.basePromptVersionId.
   */
  basePromptVersionId?: string | null;
}

export type ExerciseGenerator = (
  input: GenerateOneInput,
) => Promise<GeneratedExercisePayload>;

/**
 * Error a generator throws to signal a per-item failure with a specific
 * code. `validation_error` / `parse_error` skip the item and the run
 * continues; a rate limit throws AiRateLimitedError instead, which stops
 * the batch.
 */
export class GenerationError extends Error {
  readonly code: GenerationFailureCode;
  constructor(code: GenerationFailureCode, message: string) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
  }
}
