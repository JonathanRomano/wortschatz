/**
 * Claude model-label helpers for the admin generator.
 *
 * SDK-free by design (API-boundary sprint): the admin route delegates the
 * actual generation to apps/api via `makeRemoteGenerator`, so nothing under
 * apps/web/src imports @anthropic-ai/sdk. This module only supplies the model
 * label recorded on the GenerationSession header — the per-exercise model
 * that actually produced each row comes back from apps/api and is what's
 * persisted to Exercise.model.
 */

/** Default Claude model, mirrored from the api/CLI default. */
export const CLAUDE_DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * The model name stamped on a session at creation time. "stub" when no key
 * is configured on the web env (the offline/demo path); otherwise the
 * default model. Cosmetic — the authoritative per-exercise model is recorded
 * from the api's response.
 */
export function claudeModelLabel(): string {
  return aiConfigured() ? CLAUDE_DEFAULT_MODEL : "stub";
}
