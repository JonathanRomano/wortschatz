import { describe, it, expect } from "vitest";

import {
  buildSelectionWheres,
  PREFER_UNSEEN_EXERCISES,
  PREFER_WEAK_EXERCISES,
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

describe("buildSelectionWheres — weak-first tier", () => {
  it("ships PREFER_WEAK_EXERCISES enabled", () => {
    expect(PREFER_WEAK_EXERCISES).toBe(true);
  });

  it("prepends a weak tier (id IN weakIds) ahead of the full pool", () => {
    const tiers = buildSelectionWheres(TYPE, undefined, undefined, [], true, [
      "w1",
      "w2",
    ]);
    expect(tiers).toHaveLength(2);
    expect(tiers[0]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      id: { in: ["w1", "w2"] },
    });
    expect(tiers[1]).toEqual({ type: TYPE, status: "PUBLISHED" });
  });

  it("orders weak → unseen → full when both sets are present", () => {
    const tiers = buildSelectionWheres(
      TYPE,
      undefined,
      "B1",
      ["p1"],
      true,
      ["w1"],
    );
    expect(tiers).toHaveLength(3);
    expect(tiers[0]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      level: "B1",
      id: { in: ["w1"] },
    });
    expect(tiers[1]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      level: "B1",
      id: { notIn: ["p1"] },
    });
    expect(tiers[2]).toEqual({ type: TYPE, status: "PUBLISHED", level: "B1" });
  });

  it("merges excludeId into the weak tier's id filter", () => {
    const tiers = buildSelectionWheres(TYPE, "prev", undefined, [], true, ["w1"]);
    expect(tiers[0]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      id: { not: "prev", in: ["w1"] },
    });
  });

  it("omits the weak tier when disabled or empty", () => {
    expect(
      buildSelectionWheres(TYPE, undefined, undefined, [], true, ["w1"], false),
    ).toHaveLength(1);
    expect(
      buildSelectionWheres(TYPE, undefined, undefined, [], true, []),
    ).toHaveLength(1);
  });
});

describe("buildSelectionWheres — profession preference (Sprint 05)", () => {
  it("prepends a profession-scoped copy of every tier", () => {
    const tiers = buildSelectionWheres(
      TYPE,
      undefined,
      "B1",
      ["p1"],
      true,
      ["w1"],
      true,
      "beruf:pflege",
    );
    // weak∧beruf, unseen∧beruf, full∧beruf, weak, unseen, full
    expect(tiers).toHaveLength(6);
    expect(tiers[0]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      level: "B1",
      id: { in: ["w1"] },
      tags: { has: "beruf:pflege" },
    });
    expect(tiers[2]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      level: "B1",
      tags: { has: "beruf:pflege" },
    });
    // The unscoped tiers still follow, so the draw never dead-ends.
    expect(tiers[5]).toEqual({ type: TYPE, status: "PUBLISHED", level: "B1" });
  });

  it("changes nothing when no profession tag is supplied", () => {
    const withNull = buildSelectionWheres(TYPE, undefined, undefined, [], true, [], true, null);
    expect(withNull).toHaveLength(1);
  });

  it("changes nothing when the flag is off", () => {
    const tiers = buildSelectionWheres(
      TYPE,
      undefined,
      undefined,
      [],
      true,
      [],
      true,
      "beruf:it",
      false,
    );
    expect(tiers).toHaveLength(1);
    expect(tiers[0]).not.toHaveProperty("tags");
  });

  it("keeps the profession-scoped full pool ahead of the unscoped weak tier", () => {
    const tiers = buildSelectionWheres(
      TYPE,
      undefined,
      undefined,
      [],
      true,
      ["w1"],
      true,
      "beruf:gastro",
    );
    // weak∧beruf, full∧beruf, weak, full — work German outranks general mistakes.
    expect(tiers).toHaveLength(4);
    expect(tiers[1]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      tags: { has: "beruf:gastro" },
    });
    expect(tiers[2]).toEqual({
      type: TYPE,
      status: "PUBLISHED",
      id: { in: ["w1"] },
    });
  });
});
