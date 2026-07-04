import { describe, it, expect } from "vitest";

import {
  PASS_SCORE,
  buildDailyPlan,
  computeTrackProgress,
  resolveTrack,
  type UnitExercise,
} from "@/lib/track/engine";
import { TRACKS } from "@/content/tracks";
import type { TrackDefinition, TrackUnit } from "@/content/tracks";

function unit(slug: string, targetCount = 2): TrackUnit {
  return {
    slug,
    title: { en: slug, pt: slug, tr: slug, uk: slug },
    level: "B1",
    topic: `Topic für ${slug}`,
    targetCount,
  };
}

function track(units: TrackUnit[]): TrackDefinition {
  return { profession: "pflege", units };
}

function pool(prefix: string, n: number): UnitExercise[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    type: "FILL_IN_THE_BLANK",
    title: `${prefix} ${i + 1}`,
  }));
}

const ids = (items: Array<{ exercise: UnitExercise }>) =>
  items.map((p) => p.exercise.id);

describe("PASS_SCORE", () => {
  it("matches the house passing rule", () => {
    expect(PASS_SCORE).toBe(60);
  });
});

describe("resolveTrack", () => {
  it("returns null for null/undefined/unknown professions", () => {
    expect(resolveTrack(null)).toBeNull();
    expect(resolveTrack(undefined)).toBeNull();
    expect(resolveTrack("astronaut")).toBeNull();
  });

  it("returns the matching track for every launch profession", () => {
    for (const slug of ["pflege", "it", "gastro", "handwerk"] as const) {
      expect(resolveTrack(slug)).toBe(TRACKS[slug]);
    }
  });
});

describe("computeTrackProgress", () => {
  it("marks a track with no content at all as 0% with no current unit", () => {
    const p = computeTrackProgress(track([unit("a"), unit("b")]), {}, new Set());
    expect(p.percent).toBe(0);
    expect(p.currentIndex).toBe(-1);
    expect(p.units.map((u) => u.state)).toEqual(["empty", "empty"]);
  });

  it("caps a unit's target at its published pool size", () => {
    const p = computeTrackProgress(
      track([unit("a", 6)]),
      { a: pool("a", 2) },
      new Set(["a-1", "a-2"]),
    );
    expect(p.units[0]!.target).toBe(2);
    expect(p.units[0]!.completed).toBe(true);
    expect(p.percent).toBe(100);
  });

  it("sequences: done → current → locked", () => {
    const p = computeTrackProgress(
      track([unit("a", 1), unit("b", 1), unit("c", 1)]),
      { a: pool("a", 2), b: pool("b", 2), c: pool("c", 2) },
      new Set(["a-1"]),
    );
    expect(p.units.map((u) => u.state)).toEqual(["done", "current", "locked"]);
    expect(p.currentIndex).toBe(1);
  });

  it("skips empty units when picking the current one", () => {
    const p = computeTrackProgress(
      track([unit("a", 1), unit("b", 1), unit("c", 1)]),
      { a: pool("a", 1), c: pool("c", 1) }, // b has no content yet
      new Set(["a-1"]),
    );
    expect(p.units.map((u) => u.state)).toEqual(["done", "empty", "current"]);
    expect(p.currentIndex).toBe(2);
  });

  it("returns currentIndex -1 when every content unit is complete", () => {
    const p = computeTrackProgress(
      track([unit("a", 1), unit("b", 1)]),
      { a: pool("a", 1), b: pool("b", 1) },
      new Set(["a-1", "b-1"]),
    );
    expect(p.currentIndex).toBe(-1);
    expect(p.percent).toBe(100);
  });

  it("caps totalPassed at each unit's target (extra passes don't inflate %)", () => {
    const p = computeTrackProgress(
      track([unit("a", 1), unit("b", 2)]),
      { a: pool("a", 3), b: pool("b", 2) },
      new Set(["a-1", "a-2", "a-3"]), // 3 passes against a target of 1
    );
    expect(p.totalTarget).toBe(3);
    expect(p.totalPassed).toBe(1);
    expect(p.percent).toBe(33);
  });
});

describe("buildDailyPlan", () => {
  const base = track([unit("a", 2), unit("b", 2)]);
  const byUnit = { a: pool("a", 3), b: pool("b", 3) };

  function plan(opts: {
    passed?: string[];
    attempted?: string[];
    passedToday?: string[];
    goal?: number;
    exercisesByUnit?: Record<string, UnitExercise[]>;
  }) {
    const passedIds = new Set(opts.passed ?? []);
    const exercisesByUnit = opts.exercisesByUnit ?? byUnit;
    const progress = computeTrackProgress(base, exercisesByUnit, passedIds);
    return buildDailyPlan(progress, {
      dailyGoal: opts.goal ?? 3,
      passedIds,
      attemptedIds: new Set([...(opts.attempted ?? []), ...(opts.passed ?? [])]),
      passedTodayIds: new Set(opts.passedToday ?? []),
      exercisesByUnit,
    });
  }

  it("fills the goal from the current unit, weak items first", () => {
    const items = plan({ attempted: ["a-2"] });
    expect(ids(items)).toEqual(["a-2", "a-1", "a-3"]);
    expect(items.every((p) => !p.done)).toBe(true);
  });

  it("spills into the next unit when the current one runs dry", () => {
    const items = plan({ passed: ["a-1", "a-3"], goal: 3 });
    // Unit a is complete (2/2 target) → plan starts at unit b.
    expect(ids(items)).toEqual(["b-1", "b-2", "b-3"]);
  });

  it("prepends today's passes as checked-off lines", () => {
    const items = plan({ passed: ["a-1"], passedToday: ["a-1"], goal: 3 });
    expect(ids(items)).toEqual(["a-1", "a-2", "a-3"]);
    expect(items.map((p) => p.done)).toEqual([true, false, false]);
  });

  it("never exceeds the daily goal", () => {
    expect(plan({ goal: 2 })).toHaveLength(2);
    expect(
      plan({ passed: ["a-1"], passedToday: ["a-1"], goal: 1 }),
    ).toHaveLength(1);
  });

  it("returns only the checked-off lines when the whole track is done", () => {
    const all = ["a-1", "a-2", "a-3", "b-1", "b-2", "b-3"];
    const items = plan({ passed: all, passedToday: ["b-3"], goal: 5 });
    expect(ids(items)).toEqual(["b-3"]);
    expect(items[0]!.done).toBe(true);
  });

  it("treats a non-positive goal as 1", () => {
    expect(plan({ goal: 0 })).toHaveLength(1);
  });

  it("labels each item with its unit slug", () => {
    const items = plan({ passed: ["a-1", "a-3"], goal: 2 });
    expect(items.map((p) => p.unitSlug)).toEqual(["b", "b"]);
  });
});
