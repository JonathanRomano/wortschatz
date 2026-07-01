import type { Exercise, ExerciseType } from "@wortschatz/database";

export type GradeResult = {
  score: number; // 0-100
  feedback: string;
  // True when grading reached a confident verdict (versus an AI-required
  // open-ended exercise that we couldn't actually evaluate locally).
  deterministic: boolean;
  // A human-readable summary of the correct answer(s) for a closed-form
  // exercise, present only when the learner didn't score 100 (so the result
  // panel can reveal what they missed). Absent for perfect and AI-graded types.
  correctAnswer?: string;
};

/**
 * Feature flag — Overnight loop iter 2. German umlaut/eszett-tolerant answer
 * checking: when enabled, keyboard transliterations (ae/oe/ue for ä/ö/ü and ss
 * for ß) are accepted as correct, matching the leniency of Duolingo/Clozemaster.
 * Learners on non-German keyboards no longer hard-fail on "Tuer" for "Tür".
 * Flip to `false` to restore strict exact-match grading (the pre-iter-2 behavior
 * is then byte-identical). Typed as `boolean` so both branches stay type-valid.
 */
export const UMLAUT_TOLERANT_GRADING: boolean = true;

/**
 * Feature flag — Overnight loop iter 4. WORD_ORDER exercises earn partial
 * credit by longest-common-subsequence (how many words are in the correct
 * relative order) instead of all-or-nothing, so a single transposition no
 * longer zeroes the attempt (mirrors FILL_IN_THE_BLANK / MATCHING partial
 * scoring). Flip to `false` to restore strict 100/0 exact-order grading.
 */
export const WORD_ORDER_PARTIAL_CREDIT: boolean = true;

/**
 * Feature flag — Overnight loop iter 7. Reveal the correct answer(s) for a
 * closed-form exercise in the result panel when the learner didn't score 100,
 * so they learn what they missed instead of only seeing a number. Flip to
 * `false` to hide the correct-answer summary (scores/feedback are unchanged).
 */
export const REVEAL_CORRECT_ANSWER: boolean = true;

const norm = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,!?;:"']/g, "")
    .trim()
    .replace(/\s+/g, " ");

/**
 * Collapse German umlaut/eszett transliterations so the canonical spellings and
 * their ASCII forms compare equal: ä↔ae, ö↔oe, ü↔ue, ß↔ss. Applied to the
 * already-normalized (lowercased) string, so only lowercase umlauts remain.
 */
const foldGerman = (s: string) =>
  s
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

type Comparison = { ok: boolean; folded: boolean };

/**
 * Compare two strings after normalization. An exact normalized match wins
 * first ({folded:false}); only when that fails do we (optionally) accept a
 * German-folded match ({folded:true}) so we can nudge the learner about umlauts
 * while still counting the answer correct.
 */
const compare = (a: string, b: string): Comparison => {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return { ok: true, folded: false };
  if (UMLAUT_TOLERANT_GRADING && foldGerman(na) === foldGerman(nb)) {
    return { ok: true, folded: true };
  }
  return { ok: false, folded: false };
};

// Appended to positive feedback when the learner's answer only matched after
// folding umlauts/eszett — encourages typing the real characters next time.
const UMLAUT_HINT =
  " Tip: it's spelled with ä/ö/ü/ß — we accepted your ae/oe/ue/ss spelling this time.";

/**
 * Length of the longest common subsequence of two token lists under a custom
 * equality. Used to give WORD_ORDER partial credit: how many words are in the
 * correct relative order, so a single transposition doesn't zero the attempt.
 * O(n·m) with a 1-D rolling row; word counts here are tiny.
 */
function lcsLength(
  a: string[],
  b: string[],
  isEqual: (x: string, y: string) => boolean,
): number {
  const m = b.length;
  const dp: number[] = new Array(m + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0; // dp[i-1][j-1]
    for (let j = 1; j <= m; j++) {
      const up = dp[j] ?? 0; // dp[i-1][j]
      dp[j] = isEqual(a[i - 1]!, b[j - 1]!)
        ? diag + 1
        : Math.max(up, dp[j - 1] ?? 0);
      diag = up;
    }
  }
  return dp[m] ?? 0;
}

/**
 * Local grading for exercises with a closed-form solution. Open-ended
 * types (FREE_WRITING, READING_COMPREHENSION, LISTENING_COMPREHENSION)
 * fall back to AI grading via src/lib/ai.ts. Wraps {@link gradeCore} to
 * attach the correct-answer summary (see {@link REVEAL_CORRECT_ANSWER}).
 */
export function gradeLocally(
  exercise: Pick<Exercise, "type" | "content" | "solution">,
  rawAnswer: unknown,
): GradeResult {
  const result = gradeCore(exercise, rawAnswer);
  if (REVEAL_CORRECT_ANSWER && result.deterministic && result.score < 100) {
    const answer = solutionText(exercise);
    if (answer) return { ...result, correctAnswer: answer };
  }
  return result;
}

/**
 * A human-readable rendering of the correct answer for a closed-form type,
 * or undefined when there's nothing meaningful to show (TRANSLATION /
 * ERROR_CORRECTION reveal via AI on a miss; open-ended types have no
 * closed-form answer).
 */
function solutionText(
  exercise: Pick<Exercise, "type" | "content" | "solution">,
): string | undefined {
  const type = exercise.type as ExerciseType;
  const solution = (exercise.solution ?? {}) as Record<string, unknown>;
  const content = (exercise.content ?? {}) as Record<string, unknown>;
  switch (type) {
    case "FILL_IN_THE_BLANK": {
      const blanks = (solution.blanks as string[]) ?? [];
      return blanks.length ? blanks.join(", ") : undefined;
    }
    case "MULTIPLE_CHOICE": {
      const options = (content.options as string[]) ?? [];
      const index = solution.correctIndex as number;
      return options[index] ?? undefined;
    }
    case "WORD_ORDER": {
      const order = (solution.correctOrder as string[]) ?? [];
      return order.length ? order.join(" ") : undefined;
    }
    case "VERB_CONJUGATION":
      return (solution.correctForm as string) || undefined;
    case "MATCHING": {
      const pairs = (solution.pairs as Record<string, string>) ?? {};
      const entries = Object.entries(pairs);
      return entries.length
        ? entries.map(([k, v]) => `${k} → ${v}`).join(", ")
        : undefined;
    }
    default:
      return undefined;
  }
}

function gradeCore(
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
      const results = expected.map((e, i) => compare(e, got[i] ?? ""));
      const correct = results.filter((r) => r.ok).length;
      const usedFolding = results.some((r) => r.ok && r.folded);
      const score = Math.round((correct / expected.length) * 100);
      return {
        score,
        feedback:
          (score === 100
            ? "Perfect — every blank was correct."
            : `${correct}/${expected.length} blanks correct.`) +
          (usedFolding ? UMLAUT_HINT : ""),
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
      const match = accepted.map((a) => compare(a, got)).find((r) => r.ok);
      const ok = !!match;
      return {
        score: ok ? 100 : 0,
        feedback: ok
          ? "Translation matches an accepted form." +
            (match.folded ? UMLAUT_HINT : "")
          : "Translation didn't match any accepted form. AI grading would catch close variants.",
        deterministic: ok, // a "no" here is suspicious without AI fallback
      };
    }
    case "WORD_ORDER": {
      const expected = (solution.correctOrder as string[]) ?? [];
      const got = (answer.ordered as string[]) ?? [];
      if (expected.length === 0) return aiPlaceholder();
      // Partial credit by longest common subsequence: how many words are in
      // the correct relative order. A single transposition no longer zeroes
      // the attempt (matching FILL_IN_THE_BLANK / MATCHING partial scoring).
      const inOrder = lcsLength(expected, got, (x, y) => compare(x, y).ok);
      const inOrderExact = lcsLength(expected, got, (x, y) => {
        const c = compare(x, y);
        return c.ok && !c.folded;
      });
      const usedFolding = inOrder > inOrderExact;
      const denom = Math.max(expected.length, got.length);
      const perfect =
        expected.length === got.length && inOrder === expected.length;
      const score = WORD_ORDER_PARTIAL_CREDIT
        ? Math.round((inOrder / denom) * 100)
        : perfect
          ? 100
          : 0;
      return {
        score,
        feedback:
          (perfect
            ? "Correct word order."
            : `${inOrder}/${denom} words in the right order.`) +
          (usedFolding && score > 0 ? UMLAUT_HINT : ""),
        deterministic: true,
      };
    }
    case "MATCHING": {
      const expected = (solution.pairs as Record<string, string>) ?? {};
      const got = (answer.pairs as Record<string, string>) ?? {};
      const keys = Object.keys(expected);
      if (keys.length === 0) return aiPlaceholder();
      const results = keys.map((k) => compare(expected[k] ?? "", got[k] ?? ""));
      const correct = results.filter((r) => r.ok).length;
      const usedFolding = results.some((r) => r.ok && r.folded);
      const score = Math.round((correct / keys.length) * 100);
      return {
        score,
        feedback:
          `${correct}/${keys.length} pairs matched correctly.` +
          (usedFolding ? UMLAUT_HINT : ""),
        deterministic: true,
      };
    }
    case "VERB_CONJUGATION": {
      const correctForm = (solution.correctForm as string) ?? "";
      const got = (answer.conjugated as string) ?? "";
      const r = compare(correctForm, got);
      return {
        score: r.ok ? 100 : 0,
        feedback: r.ok
          ? "Correct conjugation." + (r.folded ? UMLAUT_HINT : "")
          : `Expected "${correctForm}".`,
        deterministic: true,
      };
    }
    case "ERROR_CORRECTION": {
      const expected = (solution.corrected as string) ?? "";
      const got = (answer.corrected as string) ?? "";
      const r = compare(expected, got);
      return {
        score: r.ok ? 100 : 0,
        feedback: r.ok
          ? "Correctly fixed." + (r.folded ? UMLAUT_HINT : "")
          : "Correction not exact — AI grading recommended.",
        deterministic: r.ok,
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
