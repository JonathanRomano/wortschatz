/**
 * Prompt composition seam shared by both providers and the admin UI.
 *
 * Each per-type prompt file exports a `promptParts: PromptParts` with four
 * independently-named pieces. This module reassembles them into the final
 * provider message. The assembly order and separators reproduce the legacy
 * monolithic prompt byte-for-byte — the parity test in
 * shared/__tests__/prompt-parity.test.ts pins this against a captured
 * baseline so the CLI keeps behaving identically.
 *
 * The locked / editable boundary (Decision 2): admins may override the
 * `system` voice and the `instructions` portion via `customPrompt`. The
 * `jsonShape` (the canonical output contract) and `rules` are ALWAYS taken
 * from the per-type definition and can never be overridden, so a custom
 * prompt can't break downstream Zod validation.
 */
import { renderRecentBlock } from "./recent-block.js";
import type {
  CustomPrompt,
  PromptInput,
  PromptOutput,
  PromptParts,
} from "./prompt-types.js";

/** Treat whitespace-only overrides as "use the default". */
function override(custom: string | undefined): string | undefined {
  return custom && custom.trim().length > 0 ? custom : undefined;
}

/**
 * Compose the final user message: instructions · recentBlock · jsonShape ·
 * rules. `customInstructions` (when a non-empty string) replaces only the
 * editable instructions portion; the recent-examples block, JSON shape, and
 * rules are always injected from the canonical definition.
 */
export function buildFinalUserPrompt(
  parts: PromptParts,
  input: PromptInput,
  customInstructions?: string,
): string {
  const recentBlock = renderRecentBlock(input.recentExamples);
  const instructions = override(customInstructions) ?? parts.instructions(input);
  return (
    instructions +
    "\n" +
    (recentBlock ? `\n${recentBlock}\n` : "") +
    "\n" +
    parts.jsonShape(input) +
    "\n\n" +
    parts.rules(input)
  );
}

/**
 * Combine the four pieces into a ready-to-send {system, user, maxTokens}.
 * A custom system / instructions override is applied where allowed; the
 * JSON shape and rules stay locked.
 */
export function buildPrompt(
  parts: PromptParts,
  input: PromptInput,
  custom?: CustomPrompt,
): PromptOutput {
  return {
    system: override(custom?.system) ?? parts.system,
    user: buildFinalUserPrompt(parts, input, custom?.userInstructions),
    maxTokens: parts.maxTokens,
  };
}

/**
 * Rough token estimate for the preview endpoint. Deliberately cheap — ~4
 * characters per token is close enough for a "before you spend tokens"
 * sanity check and needs no tokenizer dependency.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
