/**
 * Validation gate shared by both apps. Reuses the canonical Zod schemas
 * from ./schemas (never duplicate them), then layers type-specific
 * structural checks the schema can't express, and finally requires an
 * English explanation (other locales are optional — the renderer falls back
 * to `en` via pickLocalized()).
 */
import type { ExerciseType } from "@wortschatz/database";

import { contentSchemaFor, solutionSchemaFor } from "./schemas.js";

export type ValidationResult =
  | {
      ok: true;
      content: Record<string, unknown>;
      solution: Record<string, unknown>;
      explanation: Record<string, unknown>;
      tip?: Record<string, unknown>;
    }
  | { ok: false; errors: string[] };

/**
 * Per-type checks beyond Zod. Each receives the already-Zod-validated
 * content + solution and pushes human-readable error strings. Types with
 * no extra invariants simply have no entry here.
 */
const customChecks: Partial<
  Record<
    ExerciseType,
    (content: Record<string, unknown>, solution: Record<string, unknown>) => string[]
  >
> = {
  FILL_IN_THE_BLANK: (content, solution) => {
    const errors: string[] = [];
    const sentence = String(content.sentence ?? "");
    const blanksCount = Number(content.blanksCount ?? 0);
    const markerCount = (sentence.match(/___/g) ?? []).length;
    if (markerCount !== blanksCount) {
      errors.push(
        `blanksCount=${blanksCount} but the sentence has ${markerCount} '___' marker(s).`,
      );
    }
    const blanks = Array.isArray(solution.blanks) ? solution.blanks : [];
    if (blanks.length !== blanksCount) {
      errors.push(
        `solution.blanks has ${blanks.length} entries but blanksCount=${blanksCount}.`,
      );
    }
    return errors;
  },
  WORD_ORDER: (content, solution) => {
    const errors: string[] = [];
    const scrambled = (Array.isArray(content.scrambled) ? content.scrambled : []) as string[];
    const ordered = (Array.isArray(solution.correctOrder) ? solution.correctOrder : []) as string[];
    if (scrambled.length !== ordered.length) {
      errors.push(
        `scrambled has ${scrambled.length} tokens but correctOrder has ${ordered.length}.`,
      );
    } else {
      const a = [...scrambled].sort();
      const b = [...ordered].sort();
      if (a.some((tok, i) => tok !== b[i])) {
        errors.push(`scrambled tokens and correctOrder are not a permutation of each other.`);
      }
    }
    return errors;
  },
  MATCHING: (content, solution) => {
    const errors: string[] = [];
    const german = (Array.isArray(content.german) ? content.german : []) as string[];
    const translations = (Array.isArray(content.translations) ? content.translations : []) as string[];
    if (german.length !== translations.length) {
      errors.push(`german has ${german.length} items but translations has ${translations.length}.`);
    }
    const pairs = (solution.pairs ?? {}) as Record<string, string>;
    for (const word of german) {
      if (!(word in pairs)) errors.push(`solution.pairs is missing the German word "${word}".`);
    }
    return errors;
  },
  MULTIPLE_CHOICE: (_content, solution) => {
    const idx = Number(solution.correctIndex);
    return idx >= 0 && idx <= 3 ? [] : [`correctIndex=${idx} is out of range 0–3.`];
  },
};

export function validateExercise(type: ExerciseType, parsed: unknown): ValidationResult {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["Response is not a JSON object."] };
  }
  const obj = parsed as Record<string, unknown>;
  const errors: string[] = [];

  const contentParsed = contentSchemaFor[type].safeParse(obj.content);
  if (!contentParsed.success) {
    errors.push(`content: ${contentParsed.error.message}`);
  }
  const solutionParsed = solutionSchemaFor[type].safeParse(obj.solution);
  if (!solutionParsed.success) {
    errors.push(`solution: ${solutionParsed.error.message}`);
  }

  // Explanation must at least carry English.
  const explanation = obj.explanation;
  const hasEn =
    !!explanation &&
    typeof explanation === "object" &&
    !Array.isArray(explanation) &&
    typeof (explanation as Record<string, unknown>).en === "string" &&
    (explanation as Record<string, unknown>).en !== "";
  if (!hasEn) {
    errors.push(`explanation must be an object with a non-empty "en" string.`);
  }

  if (errors.length > 0) return { ok: false, errors };

  // Both Zod parses succeeded — run the structural cross-checks.
  const content = contentParsed.data as Record<string, unknown>;
  const solution = solutionParsed.data as Record<string, unknown>;
  const extra = customChecks[type]?.(content, solution) ?? [];
  if (extra.length > 0) return { ok: false, errors: extra };

  return {
    ok: true,
    content,
    solution,
    explanation: explanation as Record<string, unknown>,
    tip: normalizeTip(obj.tip),
  };
}

/** Accept a tip only when it's an object with ≥1 non-empty string value. */
function normalizeTip(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const entries = Object.entries(raw as Record<string, unknown>).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Pull a usable title from the raw payload, falling back to a default. */
export function normalizeTitle(raw: unknown, type: ExerciseType, topic: string): string {
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  return `${type.replace(/_/g, " ").toLowerCase()}: ${topic}`;
}

/** Pull 1–5 lowercase string tags, falling back to [topic, level]. */
export function normalizeTags(raw: unknown, topic: string, level: string): string[] {
  if (Array.isArray(raw)) {
    const tags = raw
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim())
      .slice(0, 5);
    if (tags.length > 0) return tags;
  }
  return [topic, level.toLowerCase()];
}
