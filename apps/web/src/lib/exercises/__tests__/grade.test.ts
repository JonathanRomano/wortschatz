import { describe, it, expect } from "vitest";

import { gradeLocally, UMLAUT_TOLERANT_GRADING } from "@/lib/exercises/grade";

// Minimal Exercise stub — gradeLocally only reads type/content/solution.
const ex = (type: string, solution: Record<string, unknown>) =>
  ({ type, content: {}, solution }) as never;

const HINT = "ae/oe/ue/ss";

describe("UMLAUT_TOLERANT_GRADING flag", () => {
  it("ships enabled", () => {
    expect(UMLAUT_TOLERANT_GRADING).toBe(true);
  });
});

describe("gradeLocally — FILL_IN_THE_BLANK", () => {
  const solution = { blanks: ["Tür", "Käse", "Straße"] };

  it("scores 100 for an exact match without the umlaut hint", () => {
    const r = gradeLocally(ex("FILL_IN_THE_BLANK", solution), {
      blanks: ["Tür", "Käse", "Straße"],
    });
    expect(r.score).toBe(100);
    expect(r.deterministic).toBe(true);
    expect(r.feedback).not.toContain(HINT);
  });

  it("accepts ae/oe/ue/ss transliterations as fully correct and hints", () => {
    const r = gradeLocally(ex("FILL_IN_THE_BLANK", solution), {
      blanks: ["Tuer", "Kaese", "Strasse"],
    });
    expect(r.score).toBe(100);
    expect(r.feedback).toContain(HINT);
  });

  it("gives partial credit and no hint when the only miss is unrelated", () => {
    const r = gradeLocally(ex("FILL_IN_THE_BLANK", solution), {
      blanks: ["Tür", "Käse", "falsch"],
    });
    expect(r.score).toBe(67);
    expect(r.feedback).toContain("2/3");
    expect(r.feedback).not.toContain(HINT);
  });
});

describe("gradeLocally — VERB_CONJUGATION", () => {
  it("accepts laeuft for läuft with a hint", () => {
    const r = gradeLocally(ex("VERB_CONJUGATION", { correctForm: "läuft" }), {
      conjugated: "laeuft",
    });
    expect(r.score).toBe(100);
    expect(r.deterministic).toBe(true);
    expect(r.feedback).toContain(HINT);
  });

  it("still fails a genuinely wrong form", () => {
    const r = gradeLocally(ex("VERB_CONJUGATION", { correctForm: "läuft" }), {
      conjugated: "rennt",
    });
    expect(r.score).toBe(0);
    expect(r.feedback).toContain('Expected "läuft"');
  });
});

describe("gradeLocally — TRANSLATION", () => {
  const solution = { acceptedTranslations: ["Tschüss", "auf Wiedersehen"] };

  it("accepts a transliterated form and stays deterministic (no AI needed)", () => {
    const r = gradeLocally(ex("TRANSLATION", solution), {
      translation: "Tschuess",
    });
    expect(r.score).toBe(100);
    expect(r.deterministic).toBe(true);
    expect(r.feedback).toContain(HINT);
  });

  it("routes a real miss to AI (deterministic false)", () => {
    const r = gradeLocally(ex("TRANSLATION", solution), {
      translation: "hello",
    });
    expect(r.score).toBe(0);
    expect(r.deterministic).toBe(false);
  });
});

describe("gradeLocally — WORD_ORDER", () => {
  it("accepts an umlaut token in otherwise-correct order", () => {
    const r = gradeLocally(
      ex("WORD_ORDER", { correctOrder: ["Ich", "möchte", "gehen"] }),
      { ordered: ["Ich", "moechte", "gehen"] },
    );
    expect(r.score).toBe(100);
    expect(r.feedback).toContain(HINT);
  });

  it("fails a wrong order", () => {
    const r = gradeLocally(
      ex("WORD_ORDER", { correctOrder: ["Ich", "möchte", "gehen"] }),
      { ordered: ["gehen", "Ich", "möchte"] },
    );
    expect(r.score).toBe(0);
  });
});

describe("gradeLocally — MATCHING", () => {
  it("accepts transliterated values and reports partial credit", () => {
    const r = gradeLocally(
      ex("MATCHING", { pairs: { a: "grün", b: "Käfer", c: "weiß" } }),
      { pairs: { a: "gruen", b: "Kaefer", c: "falsch" } },
    );
    expect(r.score).toBe(67);
    expect(r.feedback).toContain(HINT);
  });
});

describe("gradeLocally — ERROR_CORRECTION", () => {
  it("accepts a transliterated correction deterministically", () => {
    const r = gradeLocally(ex("ERROR_CORRECTION", { corrected: "Ich hätte gern" }), {
      corrected: "Ich haette gern",
    });
    expect(r.score).toBe(100);
    expect(r.deterministic).toBe(true);
  });

  it("defers a non-matching correction to AI", () => {
    const r = gradeLocally(ex("ERROR_CORRECTION", { corrected: "Ich hätte gern" }), {
      corrected: "something else",
    });
    expect(r.score).toBe(0);
    expect(r.deterministic).toBe(false);
  });
});

describe("gradeLocally — MULTIPLE_CHOICE is index-based (folding irrelevant)", () => {
  it("scores by selected index", () => {
    const solution = { correctIndex: 2 };
    expect(gradeLocally(ex("MULTIPLE_CHOICE", solution), { selectedIndex: 2 }).score).toBe(100);
    expect(gradeLocally(ex("MULTIPLE_CHOICE", solution), { selectedIndex: 1 }).score).toBe(0);
  });
});

describe("gradeLocally — open-ended types defer to AI", () => {
  it.each(["READING_COMPREHENSION", "LISTENING_COMPREHENSION", "FREE_WRITING"])(
    "%s returns a non-deterministic placeholder",
    (type) => {
      const r = gradeLocally(ex(type, {}), { text: "whatever" });
      expect(r.deterministic).toBe(false);
      expect(r.score).toBe(0);
    },
  );
});
