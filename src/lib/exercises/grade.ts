import type { Exercise, ExerciseType } from "@prisma/client";

export type GradeResult = {
  score: number; // 0-100
  feedback: string;
  // True when grading reached a confident verdict (versus an AI-required
  // open-ended exercise that we couldn't actually evaluate locally).
  deterministic: boolean;
};

const norm = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,!?;:"']/g, "")
    .trim()
    .replace(/\s+/g, " ");

const eq = (a: string, b: string) => norm(a) === norm(b);

/**
 * Local grading for exercises with a closed-form solution. Open-ended
 * types (FREE_WRITING, READING_COMPREHENSION, LISTENING_COMPREHENSION)
 * fall back to AI grading via src/lib/ai.ts.
 */
export function gradeLocally(
  exercise: Pick<Exercise, "type" | "content" | "solution">,
  rawAnswer: unknown,
): GradeResult {
  const type = exercise.type as ExerciseType;
  const solution = exercise.solution as Record<string, unknown>;
  const answer = (rawAnswer ?? {}) as Record<string, unknown>;

  switch (type) {
    case "FILL_IN_THE_BLANK": {
      const expected = (solution.blanks as string[]) ?? [];
      const got = (answer.blanks as string[]) ?? [];
      if (expected.length === 0) return aiPlaceholder();
      const correct = expected.filter((e, i) => eq(e, got[i] ?? "")).length;
      const score = Math.round((correct / expected.length) * 100);
      return {
        score,
        feedback:
          score === 100
            ? "Perfect — every blank was correct."
            : `${correct}/${expected.length} blanks correct.`,
        deterministic: true,
      };
    }
    case "MULTIPLE_CHOICE": {
      const correctIndex = solution.correctIndex as number;
      const selected = answer.selectedIndex as number | undefined;
      const ok = selected === correctIndex;
      return {
        score: ok ? 100 : 0,
        feedback: ok ? "Correct." : "Not quite — review the explanation.",
        deterministic: true,
      };
    }
    case "TRANSLATION": {
      const accepted = (solution.acceptedTranslations as string[]) ?? [];
      const got = (answer.translation as string) ?? "";
      const ok = accepted.some((a) => eq(a, got));
      return {
        score: ok ? 100 : 0,
        feedback: ok
          ? "Translation matches an accepted form."
          : "Translation didn't match any accepted form. AI grading would catch close variants.",
        deterministic: ok, // a "no" here is suspicious without AI fallback
      };
    }
    case "WORD_ORDER": {
      const expected = (solution.correctOrder as string[]) ?? [];
      const got = (answer.ordered as string[]) ?? [];
      const ok =
        expected.length === got.length &&
        expected.every((e, i) => eq(e, got[i] ?? ""));
      return {
        score: ok ? 100 : 0,
        feedback: ok ? "Correct word order." : "Word order is incorrect.",
        deterministic: true,
      };
    }
    case "MATCHING": {
      const expected = (solution.pairs as Record<string, string>) ?? {};
      const got = (answer.pairs as Record<string, string>) ?? {};
      const keys = Object.keys(expected);
      if (keys.length === 0) return aiPlaceholder();
      const correct = keys.filter((k) => eq(expected[k] ?? "", got[k] ?? "")).length;
      const score = Math.round((correct / keys.length) * 100);
      return {
        score,
        feedback: `${correct}/${keys.length} pairs matched correctly.`,
        deterministic: true,
      };
    }
    case "VERB_CONJUGATION": {
      const correctForm = (solution.correctForm as string) ?? "";
      const got = (answer.conjugated as string) ?? "";
      const ok = eq(correctForm, got);
      return {
        score: ok ? 100 : 0,
        feedback: ok
          ? "Correct conjugation."
          : `Expected "${correctForm}".`,
        deterministic: true,
      };
    }
    case "ERROR_CORRECTION": {
      const expected = (solution.corrected as string) ?? "";
      const got = (answer.corrected as string) ?? "";
      const ok = eq(expected, got);
      return {
        score: ok ? 100 : 0,
        feedback: ok ? "Correctly fixed." : "Correction not exact — AI grading recommended.",
        deterministic: ok,
      };
    }
    case "READING_COMPREHENSION":
    case "LISTENING_COMPREHENSION":
    case "FREE_WRITING":
      return aiPlaceholder();
  }
}

function aiPlaceholder(): GradeResult {
  return {
    score: 0,
    feedback:
      "This exercise needs AI grading. Configure ANTHROPIC_API_KEY to enable detailed evaluation.",
    deterministic: false,
  };
}
