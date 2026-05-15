import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI_CACHE_TTL_MS,
  AI_MODEL_PRICING_MICROCENTS_PER_TOKEN,
  AI_RATE_LIMITS,
  estimateCostMicrocents,
} from "@/config/limits";

describe("estimateCostMicrocents", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("computes Sonnet 4.6 cost: 30 µ¢/in * 1000 + 150 µ¢/out * 500 = 105000", () => {
    expect(estimateCostMicrocents("claude-sonnet-4-6", 1000, 500)).toBe(105000);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("computes Haiku 4.5 cost: 8 * 2000 + 40 * 300 = 28000", () => {
    expect(estimateCostMicrocents("claude-haiku-4-5", 2000, 300)).toBe(28000);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("computes Opus 4.7 cost: 150 * 1000 + 750 * 250 = 337500", () => {
    expect(estimateCostMicrocents("claude-opus-4-7", 1000, 250)).toBe(337500);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns 0 for unknown models AND warns to the console", () => {
    expect(estimateCostMicrocents("claude-not-real-9000", 1000, 500)).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(
      /no pricing entry for model "claude-not-real-9000"/,
    );
  });

  it("returns 0 when both token counts are 0 (for a known model)", () => {
    expect(estimateCostMicrocents("claude-sonnet-4-6", 0, 0)).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns 0 when both token counts are 0 (for an unknown model, still warns)", () => {
    expect(estimateCostMicrocents("unknown", 0, 0)).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("matches the published price table for every known model", () => {
    // Sanity: each entry round-trips correctly. If we ever rename a model id
    // the lookup falls through to the warn branch which would fail here.
    for (const [model, price] of Object.entries(
      AI_MODEL_PRICING_MICROCENTS_PER_TOKEN,
    )) {
      const cost = estimateCostMicrocents(model, 1, 1);
      expect(cost).toBe(price.input + price.output);
    }
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("scales linearly with token counts", () => {
    const single = estimateCostMicrocents("claude-sonnet-4-6", 100, 50);
    const triple = estimateCostMicrocents("claude-sonnet-4-6", 300, 150);
    expect(triple).toBe(single * 3);
  });
});

describe("AI_CACHE_TTL_MS", () => {
  it("disables caching for REVIEW_TEXT (TTL = 0)", () => {
    expect(AI_CACHE_TTL_MS.REVIEW_TEXT).toBe(0);
  });

  it("enables caching for GENERATE_EXERCISE (TTL > 0)", () => {
    expect(AI_CACHE_TTL_MS.GENERATE_EXERCISE).toBeGreaterThan(0);
    // Documented: 30 days.
    expect(AI_CACHE_TTL_MS.GENERATE_EXERCISE).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("enables caching for EVALUATE_ANSWER (TTL > 0)", () => {
    expect(AI_CACHE_TTL_MS.EVALUATE_ANSWER).toBeGreaterThan(0);
    // Documented: 1 hour.
    expect(AI_CACHE_TTL_MS.EVALUATE_ANSWER).toBe(60 * 60 * 1000);
  });
});

describe("AI_RATE_LIMITS", () => {
  it("defines a positive integer perDay for each known endpoint", () => {
    for (const endpoint of Object.keys(AI_RATE_LIMITS) as Array<
      keyof typeof AI_RATE_LIMITS
    >) {
      const { perDay } = AI_RATE_LIMITS[endpoint];
      expect(Number.isInteger(perDay)).toBe(true);
      expect(perDay).toBeGreaterThan(0);
    }
  });
});
