/**
 * Unit tests for the prompt-builder composition seam. Parity with the legacy
 * monolithic prompts is covered separately by prompt-parity.test.ts; here we
 * pin the locked/editable boundary (Decision 2) and the helpers.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@wortschatz/database", () => ({ prisma: {} }));

import { buildFinalUserPrompt, buildPrompt, estimateTokens } from "../prompt-builder";
import { claudePrompts } from "../../claude/prompts";

const parts = claudePrompts.FILL_IN_THE_BLANK;
const input = { level: "A2" as const, topic: "Reisen", recentExamples: [] };

const JSON_HEADER = "Output a single JSON object with this exact shape:";

describe("buildFinalUserPrompt", () => {
  it("uses the default instructions when no override is given", () => {
    const user = buildFinalUserPrompt(parts, input);
    expect(user).toContain("Write ONE FILL_IN_THE_BLANK exercise.");
    expect(user).toContain(JSON_HEADER);
    expect(user).toContain("Rules:");
  });

  it("replaces only the instructions when a custom override is given", () => {
    const user = buildFinalUserPrompt(parts, input, "MY INSTRUCTIONS");
    expect(user.startsWith("MY INSTRUCTIONS")).toBe(true);
    expect(user).not.toContain("Write ONE FILL_IN_THE_BLANK exercise.");
    // The locked JSON shape + rules survive any instruction override.
    expect(user).toContain(JSON_HEADER);
    expect(user).toContain("Rules:");
  });

  it("treats a whitespace-only override as 'use default'", () => {
    expect(buildFinalUserPrompt(parts, input, "   ")).toBe(buildFinalUserPrompt(parts, input));
  });

  it("interpolates the topic into the locked JSON shape", () => {
    expect(buildFinalUserPrompt(parts, input)).toContain("Reisen");
  });
});

describe("buildPrompt", () => {
  it("applies a custom system but keeps maxTokens and the locked user pieces", () => {
    const out = buildPrompt(parts, input, { system: "CUSTOM" });
    expect(out.system).toBe("CUSTOM");
    expect(out.maxTokens).toBe(parts.maxTokens);
    expect(out.user).toContain(JSON_HEADER);
  });

  it("falls back to the default system for an empty override", () => {
    const out = buildPrompt(parts, input, { system: "  " });
    expect(out.system).toBe(parts.system);
  });
});

describe("estimateTokens", () => {
  it("approximates ~4 characters per token", () => {
    expect(estimateTokens("12345678")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });
});
