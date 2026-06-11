/**
 * DB-first prompt override (prompt-curation sprint).
 *
 * An ACTIVE BasePromptVersion supplies the editable "voice" — `system` and
 * `userInstructions` — for a specific (ExerciseType, CefrLevel). This pure
 * module layers that voice onto the hardcoded per-type `PromptParts` WITHOUT
 * touching the locked `jsonShape` / `rules` / `maxTokens`, so a bad DB edit
 * can never break downstream Zod validation (the locked/editable boundary,
 * CLAUDE.md). When no active version exists, callers use the base parts
 * unchanged (the file fallback, Decision 5).
 *
 * No Prisma here — the package stays pure (the parity test mocks
 * @wortschatz/database). Callers (apps/api's generate service, the web
 * CLI-offline generator) fetch the active version from the DB and pass its
 * strings in via `getActiveBasePromptVoice` from @wortschatz/database.
 */
import type { PromptInput, PromptParts } from "./prompt-types.js";

/** The editable strings a BasePromptVersion contributes. */
export interface PromptVoiceOverride {
  /** Replaces `parts.system` verbatim (system never sees PromptInput). */
  systemPrompt: string;
  /**
   * Replaces the `parts.instructions` portion. `{level}` and `{topic}` are
   * interpolated at build time so a stored version reproduces the
   * level/topic-aware header of the hardcoded file.
   */
  userInstructions: string;
}

/**
 * Replace the `{level}` and `{topic}` placeholders in a stored template with
 * the run's input. Only those two exact tokens are substituted; any other
 * braces (e.g. JSON examples) are left untouched.
 */
export function interpolatePromptTemplate(
  template: string,
  input: PromptInput,
): string {
  return template
    .replace(/\{level\}/g, input.level)
    .replace(/\{topic\}/g, input.topic);
}

/**
 * Layer a stored voice onto a base `PromptParts`. `jsonShape`, `rules`, and
 * `maxTokens` come from `base` unchanged (locked); `system` and
 * `instructions` come from the override. The returned `instructions()`
 * interpolates `{level}` / `{topic}` in the stored `userInstructions`.
 *
 * A per-run `CustomPrompt` (SavedPrompt / request override) still layers on
 * top of the result via `buildPrompt`'s own `override()`, so the DB version
 * is the baseline and an ad-hoc per-run override wins where present.
 */
export function applyPromptVoice(
  base: PromptParts,
  override: PromptVoiceOverride,
): PromptParts {
  return {
    system: override.systemPrompt,
    maxTokens: base.maxTokens,
    instructions: (input) =>
      interpolatePromptTemplate(override.userInstructions, input),
    jsonShape: base.jsonShape,
    rules: base.rules,
  };
}
