/**
 * applyPromptVoice / interpolatePromptTemplate — the DB-first override seam.
 *
 * Pinning the locked/editable boundary: a stored voice replaces only
 * system + instructions; jsonShape, rules, and maxTokens are taken from the
 * base parts unchanged, and {level}/{topic} are interpolated in the stored
 * instructions. @wortschatz/database is mocked (the exercises index graph
 * touches the prisma singleton via recent-block).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@wortschatz/database", () => ({ prisma: {} }));

import {
  applyPromptVoice,
  buildPrompt,
  interpolatePromptTemplate,
  type PromptInput,
  type PromptParts,
} from "@wortschatz/exercises";

const BASE: PromptParts = {
  system: "BASE SYSTEM",
  maxTokens: 777,
  instructions: ({ level, topic }) => `BASE instructions ${level} ${topic}`,
  jsonShape: ({ topic }) => `LOCKED jsonShape for ${topic}`,
  rules: ({ level }) => `LOCKED rules for ${level}`,
};

const INPUT: PromptInput = { level: "A1", topic: "Im Restaurant", recentExamples: [] };

describe("interpolatePromptTemplate", () => {
  it("replaces every {level} and {topic} token", () => {
    const out = interpolatePromptTemplate(
      "Level {level}, topic {topic}. Again {level}/{topic}.",
      INPUT,
    );
    expect(out).toBe("Level A1, topic Im Restaurant. Again A1/Im Restaurant.");
  });

  it("leaves other braces (e.g. JSON examples) untouched", () => {
    expect(interpolatePromptTemplate('{"a": 1} for {topic}', INPUT)).toBe(
      '{"a": 1} for Im Restaurant',
    );
  });
});

describe("applyPromptVoice", () => {
  const applied = applyPromptVoice(BASE, {
    systemPrompt: "CUSTOM SYSTEM",
    userInstructions: "CUSTOM for {level} on {topic}",
  });

  it("overrides system verbatim", () => {
    expect(applied.system).toBe("CUSTOM SYSTEM");
  });

  it("interpolates {level}/{topic} in the overridden instructions", () => {
    expect(applied.instructions(INPUT)).toBe("CUSTOM for A1 on Im Restaurant");
  });

  it("keeps jsonShape, rules, and maxTokens locked from the base parts", () => {
    expect(applied.jsonShape(INPUT)).toBe("LOCKED jsonShape for Im Restaurant");
    expect(applied.rules(INPUT)).toBe("LOCKED rules for A1");
    expect(applied.maxTokens).toBe(777);
  });

  it("composes via buildPrompt with the locked blocks intact", () => {
    const out = buildPrompt(applied, INPUT);
    expect(out.system).toBe("CUSTOM SYSTEM");
    expect(out.user).toContain("CUSTOM for A1 on Im Restaurant");
    expect(out.user).toContain("LOCKED jsonShape for Im Restaurant");
    expect(out.user).toContain("LOCKED rules for A1");
    expect(out.maxTokens).toBe(777);
  });

  it("a per-run customPrompt still overrides the applied voice (precedence)", () => {
    const out = buildPrompt(applied, INPUT, { system: "PER-RUN SYSTEM" });
    expect(out.system).toBe("PER-RUN SYSTEM");
    // locked blocks unchanged
    expect(out.user).toContain("LOCKED rules for A1");
  });
});
