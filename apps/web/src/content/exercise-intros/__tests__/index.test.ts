import { describe, it, expect } from "vitest";
import { ExerciseType } from "@prisma/client";

import { EXERCISE_INTROS } from "../index";
import type { ExerciseIntro } from "../types";

// Keep this list in sync with `enum ExerciseType` in prisma/schema.prisma.
// Iterating the enum lets us catch additions without having to remember to
// touch the test as well.
const ALL_TYPES = Object.values(ExerciseType) as ExerciseType[];

const LOCALES = ["en", "pt", "tr", "uk"] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

describe("EXERCISE_INTROS — coverage", () => {
  it("includes every ExerciseType enum value", () => {
    const keys = Object.keys(EXERCISE_INTROS).sort();
    const expected = [...ALL_TYPES].sort();
    expect(keys).toEqual(expected);
  });

  it("has exactly 10 entries (one per ExerciseType)", () => {
    expect(Object.keys(EXERCISE_INTROS)).toHaveLength(10);
    expect(ALL_TYPES).toHaveLength(10);
  });

  it("does not include any unexpected keys", () => {
    const allowed = new Set<string>(ALL_TYPES);
    for (const key of Object.keys(EXERCISE_INTROS)) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});

describe("EXERCISE_INTROS — entry shape", () => {
  for (const type of ALL_TYPES) {
    describe(type, () => {
      const entry: ExerciseIntro | undefined = EXERCISE_INTROS[type];

      it("is defined", () => {
        expect(entry).toBeDefined();
      });

      it("`type` field matches its mapping key (no shuffle)", () => {
        expect(entry?.type).toBe(type);
      });

      it("has non-empty whatItAsks for every locale", () => {
        for (const loc of LOCALES) {
          expect(isNonEmptyString(entry?.whatItAsks?.[loc])).toBe(true);
        }
      });

      it("has non-empty howToInteract for every locale", () => {
        for (const loc of LOCALES) {
          expect(isNonEmptyString(entry?.howToInteract?.[loc])).toBe(true);
        }
      });

      it("has non-empty example.prompt for every locale", () => {
        for (const loc of LOCALES) {
          expect(isNonEmptyString(entry?.example?.prompt?.[loc])).toBe(true);
        }
      });

      it("has non-empty example.solvedExplanation for every locale", () => {
        for (const loc of LOCALES) {
          expect(
            isNonEmptyString(entry?.example?.solvedExplanation?.[loc]),
          ).toBe(true);
        }
      });
    });
  }
});

describe("EXERCISE_INTROS — exhaustive enum iteration", () => {
  it("every enum member resolves to an ExerciseIntro with matching `type`", () => {
    for (const type of ALL_TYPES) {
      const entry = EXERCISE_INTROS[type];
      expect(entry, `missing entry for ${type}`).toBeDefined();
      expect(entry.type, `mismatched type for ${type}`).toBe(type);
    }
  });
});
