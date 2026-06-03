/**
 * Anti-duplication rendering — the pure half of the old
 * apps/web/scripts/shared/recent-examples.ts. `excerptFor` reduces a stored
 * exercise to one representative line and `renderRecentBlock` formats the
 * "generate something different from these" block injected into the user
 * prompt. The DB query (`fetchRecentExamples`) stays web-side in
 * apps/web/scripts/shared/recent-examples.ts; these helpers are pure so both
 * the CLI and the Express endpoint compose the identical prompt.
 */
import type { ExerciseType } from "@wortschatz/database";

import type { RecentExample } from "./prompt-types.js";

/** Pull the most representative snippet out of a stored exercise. */
export function excerptFor(
  type: ExerciseType,
  content: Record<string, unknown>,
  solution: Record<string, unknown>,
  title: string,
): string {
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  const arr = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;

  switch (type) {
    case "FILL_IN_THE_BLANK":
      return str(content.sentence) ?? title;
    case "MULTIPLE_CHOICE":
      return str(content.question) ?? title;
    case "TRANSLATION":
      return str(content.sourceText) ?? title;
    case "WORD_ORDER":
      return arr(solution.correctOrder)?.join(" ") ?? arr(content.scrambled)?.join(" ") ?? title;
    case "MATCHING":
      return arr(content.german)?.join(", ") ?? title;
    case "LISTENING_COMPREHENSION":
      return str(content.question) ?? str(content.transcript) ?? title;
    case "READING_COMPREHENSION":
      return str(content.question) ?? str(content.passage)?.slice(0, 120) ?? title;
    case "VERB_CONJUGATION": {
      const inf = str(content.infinitive);
      const pron = str(content.pronoun);
      const tense = str(content.tense);
      return inf ? `${inf} — ${pron ?? "?"}, ${tense ?? "?"}` : title;
    }
    case "ERROR_CORRECTION":
      return str(content.sentence) ?? title;
    case "FREE_WRITING":
      return str(content.prompt) ?? title;
    default:
      return title;
  }
}

/** Render the anti-duplication block injected into the user prompt. */
export function renderRecentBlock(examples: RecentExample[]): string {
  if (examples.length === 0) return "";
  const lines = examples.map((e, i) => `${i + 1}. "${e.excerpt}"`).join("\n");
  return `The following exercises already exist. Generate something MEANINGFULLY DIFFERENT — different sentence structure, different vocabulary focus, different grammatical pattern. Do not paraphrase or restate any of them:\n\n${lines}`;
}
