/**
 * Deterministic fallback responses used when ANTHROPIC_API_KEY is unset.
 * Returning these from the route handlers (instead of erroring) keeps
 * the dev experience smooth — the UI shows a clearly-stubbed answer and
 * no DB writes happen (cache + usage + rate-limit stay empty).
 *
 * Only stubs for the endpoints fully implemented by apps/api today;
 * generateExercise's stub stays in apps/web until the schemas are
 * extracted in a follow-up sprint.
 */
import type { AIEvaluation, ReviewResult } from "@wortschatz/types";
import type { CefrLevel } from "@wortschatz/database";

export function stubEvaluation(): AIEvaluation {
  return {
    score: 50,
    feedback:
      "AI evaluation is disabled (no ANTHROPIC_API_KEY). " +
      "The deterministic grader handled what it could; open-ended feedback is unavailable.",
  };
}

export function stubReview(
  text: string,
  userLevel: CefrLevel,
  model: string,
): ReviewResult {
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    feedback:
      `# Stub review\n\nReview for level **${userLevel}** is currently disabled.\n\n` +
      `Configure \`ANTHROPIC_API_KEY\` to enable real Claude (${model}) feedback. ` +
      `Your text (${words} words) was received and stored.`,
  };
}
