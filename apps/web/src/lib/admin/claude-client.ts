/**
 * Claude provider wiring for the admin generator.
 *
 * v1 exposes only Claude (Decision 6). When ANTHROPIC_API_KEY is set we use
 * the same in-process client the CLI uses; otherwise we fall back to the
 * deterministic offline stub (mirroring the rest of the app's offline-safe
 * behaviour) so the UI is demoable without a key. The stub captures the
 * request's type/level/topic — which the generic ProviderClient signature
 * doesn't carry — via this closure.
 */
import { callClaude, CLAUDE_DEFAULT_MODEL } from "@scripts/claude/client";
import type { ProviderClient } from "@scripts/shared/types";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";

import { stubExercise } from "@/lib/ai-stubs";

export { CLAUDE_DEFAULT_MODEL };

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** The model name recorded on the session for this run. */
export function claudeModelLabel(): string {
  return aiConfigured() ? CLAUDE_DEFAULT_MODEL : "stub";
}

/** Real Claude when configured, else a deterministic stub for offline dev. */
export function selectClaudeClient(
  type: ExerciseType,
  level: CefrLevel,
  topic: string | undefined,
): ProviderClient {
  if (aiConfigured()) return callClaude;
  const t = topic ?? "Beispiel";
  return async () => {
    const ex = stubExercise(type, level, t);
    return {
      text: JSON.stringify({
        title: ex.title,
        content: ex.content,
        solution: ex.solution,
        explanation: ex.explanation,
        tags: ex.tags,
        tip: ex.tip,
      }),
      modelUsed: "stub",
    };
  };
}
