import { describe, it, expect } from "vitest";

import {
  gradeLocally,
  REVEAL_CORRECT_ANSWER,
  UMLAUT_TOLERANT_GRADING,
} from "@/lib/exercises/grade";

// Minimal Exercise stub — gradeLocally only reads type/content/solution.
const ex = (
  type: string,
  solution: Record<string, unknown>,
  content: Record<string, unknown> = {},
) => ({ type, content, solution }) as never;

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

describe("gradeLocally — WORD_ORDER (LCS partial credit)", () => {
  const solution = { correctOrder: ["Ich", "möchte", "jetzt", "gehen"] };

  it("scores 100 for the exact order without partial-credit wording", () => {
    const r = gradeLocally(ex("WORD_ORDER", solution), {
      ordered: ["Ich", "möchte", "jetzt", "gehen"],
    });
    expect(r.score).toBe(100);
    expect(r.feedback).toBe("Correct word order.");
  });

  it("accepts an umlaut token in otherwise-correct order (100 + hint)", () => {
    const r = gradeLocally(
      ex("WORD_ORDER", { correctOrder: ["Ich", "möchte", "gehen"] }),
      { ordered: ["Ich", "moechte", "gehen"] },
    );
    expect(r.score).toBe(100);
    expect(r.feedback).toContain(HINT);
  });

  it("gives partial credit for a transposition instead of zero", () => {
    // "Ich möchte" stay in order → 2 of 3 words correct.
    const r = gradeLocally(
      ex("WORD_ORDER", { correctOrder: ["Ich", "möchte", "gehen"] }),
      { ordered: ["gehen", "Ich", "möchte"] },
    );
    expect(r.score).toBe(67);
    expect(r.feedback).toContain("2/3");
  });

  it("penalizes an extra trailing word via the longer denominator", () => {
    const r = gradeLocally(ex("WORD_ORDER", solution), {
      ordered: ["Ich", "möchte", "jetzt", "gehen", "bitte"],
    });
    expect(r.score).toBe(80); // 4 in order / max(4,5)
    expect(r.feedback).toContain("4/5");
  });

  it("scores a fully reversed order low", () => {
    const r = gradeLocally(ex("WORD_ORDER", solution), {
      ordered: ["gehen", "jetzt", "möchte", "Ich"],
    });
    expect(r.score).toBe(25); // best common subsequence length 1 of 4
  });

  it("scores an empty answer at zero", () => {
    const r = gradeLocally(ex("WORD_ORDER", solution), { ordered: [] });
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

describe("gradeLocally — correctAnswer reveal", () => {
  it("ships REVEAL_CORRECT_ANSWER enabled", () => {
    expect(REVEAL_CORRECT_ANSWER).toBe(true);
  });

  it("omits correctAnswer on a perfect score", () => {
    const r = gradeLocally(ex("FILL_IN_THE_BLANK", { blanks: ["Tür"] }), {
      blanks: ["Tür"],
    });
    expect(r.score).toBe(100);
    expect(r.correctAnswer).toBeUndefined();
  });

  it("reveals the blanks on a partial FILL_IN_THE_BLANK", () => {
    const r = gradeLocally(
      ex("FILL_IN_THE_BLANK", { blanks: ["Tür", "Käse"] }),
      { blanks: ["Tür", "falsch"] },
    );
    expect(r.score).toBeLessThan(100);
    expect(r.correctAnswer).toBe("Tür, Käse");
  });

  it("reveals the correct option text on a wrong MULTIPLE_CHOICE", () => {
    const r = gradeLocally(
      ex(
        "MULTIPLE_CHOICE",
        { correctIndex: 2 },
        { options: ["der", "die", "das", "den"] },
      ),
      { selectedIndex: 0 },
    );
    expect(r.score).toBe(0);
    expect(r.correctAnswer).toBe("das");
  });

  it("reveals the joined order on a wrong WORD_ORDER", () => {
    const r = gradeLocally(
      ex("WORD_ORDER", { correctOrder: ["Ich", "gehe", "heim"] }),
      { ordered: ["heim", "Ich", "gehe"] },
    );
    expect(r.correctAnswer).toBe("Ich gehe heim");
  });

  it("reveals the correct form on a wrong VERB_CONJUGATION", () => {
    const r = gradeLocally(ex("VERB_CONJUGATION", { correctForm: "läuft" }), {
      conjugated: "rennt",
    });
    expect(r.correctAnswer).toBe("läuft");
  });

  it("reveals the pairs on a partial MATCHING", () => {
    const r = gradeLocally(
      ex("MATCHING", { pairs: { Hund: "dog", Katze: "cat" } }),
      { pairs: { Hund: "dog", Katze: "falsch" } },
    );
    expect(r.correctAnswer).toBe("Hund → dog, Katze → cat");
  });

  it("has no correctAnswer for open-ended types", () => {
    const r = gradeLocally(ex("FREE_WRITING", {}), { text: "x" });
    expect(r.correctAnswer).toBeUndefined();
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
