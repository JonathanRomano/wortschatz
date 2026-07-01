import { describe, it, expect } from "vitest";

import {
  buildSelectionWheres,
  PREFER_UNSEEN_EXERCISES,
} from "@/lib/exercises/selection";

const TYPE = "FILL_IN_THE_BLANK" as const;

describe("PREFER_UNSEEN_EXERCISES flag", () => {
  it("ships enabled", () => {
    expect(PREFER_UNSEEN_EXERCISES).toBe(true);
  });
});

describe("buildSelectionWheres", () => {
  it("returns only the full pool when the learner has passed nothing", () => {
    const tiers = buildSelectionWheres(TYPE, undefined, undefined, []);
    expect(tiers).toHaveLength(1);
    expect(tiers[0]).toEqual({ type: TYPE, status: "PUBLISHED" });
  });

  it("prepends an unseen-preferred tier that excludes passed ids", () => {
    const tiers = buildSelectionWheres(TYPE, undefined, undefined, ["a", "b"]);
    expect(tiers).toHaveLength(2);
    expect(tiers[0]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      id: { notIn: ["a", "b"] },
    });
    // Tier 2 is always the full pool (no dead-end once all are passed).
    expect(tiers[1]).toEqual({ type: TYPE, status: "PUBLISHED" });
  });

  it("merges excludeId and passed exclusions into one id filter", () => {
    const tiers = buildSelectionWheres(TYPE, "prev", undefined, ["a"]);
    expect(tiers[0]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      id: { not: "prev", notIn: ["a"] },
    });
    expect(tiers[1]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      id: { not: "prev" },
    });
  });

  it("carries the level filter into every tier", () => {
    const tiers = buildSelectionWheres(TYPE, undefined, "B1", ["a"]);
    expect(tiers[0]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      level: "B1",
      id: { notIn: ["a"] },
    });
    expect(tiers[1]).toEqual({ type: TYPE, status: "PUBLISHED", level: "B1" });
  });

  it("omits the unseen tier when preferUnseen is off", () => {
    const tiers = buildSelectionWheres(TYPE, "prev", "A2", ["a", "b"], false);
    expect(tiers).toHaveLength(1);
    expect(tiers[0]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      level: "A2",
      id: { not: "prev" },
    });
  });

  it("omits the unseen tier when the passed set is empty even if enabled", () => {
    const tiers = buildSelectionWheres(TYPE, undefined, undefined, [], true);
    expect(tiers).toHaveLength(1);
  });
});
