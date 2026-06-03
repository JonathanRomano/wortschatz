/**
 * Prompt + content contract types shared by both apps.
 *
 * Each provider's per-type prompt file exports a `promptParts: PromptParts`
 * — four independently-named pieces (system / instructions / jsonShape /
 * rules) so the admin UI can override the editable "voice" (system +
 * instructions) while the runner and Express keep the JSON shape and rules
 * locked. `buildPrompt` / `buildFinalUserPrompt` (prompt-builder.ts) compose
 * the pieces. Moved here (out of apps/web/scripts/shared/types.ts) so the
 * Express /ai/generate-exercise endpoint builds the exact same prompts the
 * CLI does — the web-only orchestration types stay in scripts/shared/types.ts
 * and re-export these.
 */
import type { CefrLevel, ExerciseType } from "@wortschatz/database";

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
 * test in apps/web/scripts/shared/__tests__).
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

/** Admin-supplied overrides for the editable portions of a prompt. */
export interface CustomPrompt {
  /** Replaces the default system prompt when a non-empty string. */
  system?: string;
  /** Replaces the default instructions portion when a non-empty string. */
  userInstructions?: string;
}
