import { describe, it, expect } from "vitest";

import {
  toUtcDayKey,
  buildMuenzenSeries,
  buildHeatmap,
  buildRadar,
  countToday,
  goalMetDays,
  heatmapThresholds,
  longestStreak,
  weekOverWeek,
} from "@/lib/dashboard/aggregations";
import type { ExerciseType } from "@wortschatz/database";

const heat = (counts: number[]) =>
  counts.map((count, i) => ({
    // Dates are irrelevant to these helpers (they only read `count` and rely
    // on array order = calendar order), so a synthetic index key is fine.
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    count,
  }));

describe("longestStreak", () => {
  it("is 0 for empty or all-zero data", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(heat([0, 0, 0]))).toBe(0);
  });

  it("finds the longest consecutive run of active days", () => {
    expect(longestStreak(heat([1, 1, 0, 1, 1, 1, 0, 1]))).toBe(3);
    expect(longestStreak(heat([2, 3, 1]))).toBe(3);
  });

  it("does not count a run broken by a zero day", () => {
    expect(longestStreak(heat([1, 0, 1, 0, 1]))).toBe(1);
  });
});

describe("goalMetDays", () => {
  it("counts days at or above the daily goal", () => {
    expect(goalMetDays(heat([5, 4, 6, 0, 5]), 5)).toBe(3); // 5,6,5
  });

  it("returns 0 for a non-positive goal", () => {
    expect(goalMetDays(heat([9, 9]), 0)).toBe(0);
    expect(goalMetDays(heat([9, 9]), -1)).toBe(0);
  });

  it("returns 0 when no day reaches the goal", () => {
    expect(goalMetDays(heat([1, 2, 3]), 5)).toBe(0);
  });
});

describe("weekOverWeek", () => {
  it("sums the last 7 days vs the previous 7", () => {
    // 14 days: prev-7 all 1 (=7), last-7 all 2 (=14).
    const days = heat([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]);
    expect(weekOverWeek(days)).toEqual({ thisWeek: 14, lastWeek: 7 });
  });

  it("handles fewer than 14 days without throwing", () => {
    expect(weekOverWeek(heat([3, 4, 5]))).toEqual({
      thisWeek: 12,
      lastWeek: 0,
    });
    expect(weekOverWeek([])).toEqual({ thisWeek: 0, lastWeek: 0 });
  });
});

describe("heatmapThresholds", () => {
  it("uses the absolute scale [1,2,3] for light activity (max ≤ 4)", () => {
    expect(heatmapThresholds([])).toEqual([1, 2, 3]);
    expect(heatmapThresholds([0, 0, 0])).toEqual([1, 2, 3]);
    expect(heatmapThresholds([0, 1, 2, 4])).toEqual([1, 2, 3]);
  });

  it("scales cut points to ~25/50/75% of the busiest day for heavy activity", () => {
    expect(heatmapThresholds([1, 20, 3])).toEqual([5, 10, 15]);
    expect(heatmapThresholds([8])).toEqual([2, 4, 6]);
  });

  it("keeps the thresholds strictly increasing for every max", () => {
    for (let max = 5; max <= 200; max++) {
      const [a, b, c] = heatmapThresholds([max]);
      expect(a).toBeGreaterThanOrEqual(1);
      expect(b).toBeGreaterThan(a);
      expect(c).toBeGreaterThan(b);
    }
  });
});

// All 10 exercise types as in prisma/schema.prisma. The radar always
// returns one row per type, so we need a complete label map.
const LABELS: Record<ExerciseType, string> = {
  FILL_IN_THE_BLANK: "Fill",
  MULTIPLE_CHOICE: "Choice",
  TRANSLATION: "Translate",
  WORD_ORDER: "Order",
  MATCHING: "Match",
  LISTENING_COMPREHENSION: "Listen",
  READING_COMPREHENSION: "Read",
  VERB_CONJUGATION: "Conjugate",
  ERROR_CORRECTION: "Correct",
  FREE_WRITING: "Write",
};

describe("toUtcDayKey", () => {
  it("formats start-of-day UTC as YYYY-MM-DD", () => {
    expect(toUtcDayKey(new Date("2026-05-15T00:00:00Z"))).toBe("2026-05-15");
  });

  it("formats end-of-day UTC as the same day", () => {
    expect(toUtcDayKey(new Date("2026-05-15T23:59:59Z"))).toBe("2026-05-15");
  });

  it("buckets the instant after UTC midnight into the next day", () => {
    expect(toUtcDayKey(new Date("2026-05-16T00:00:00Z"))).toBe("2026-05-16");
  });

  it("zero-pads single-digit months and days", () => {
    expect(toUtcDayKey(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });
});

describe("buildMuenzenSeries", () => {
  it("returns a flat series at the starting balance when there are no transactions", () => {
    const series = buildMuenzenSeries(
      [],
      100,
      new Date("2026-05-13T00:00:00Z"),
      new Date("2026-05-15T00:00:00Z"),
    );
    expect(series).toHaveLength(3);
    expect(series.map((p) => p.balance)).toEqual([100, 100, 100]);
    expect(series.map((p) => p.date)).toEqual([
      "2026-05-13",
      "2026-05-14",
      "2026-05-15",
    ]);
  });

  it("collapses multiple same-day transactions into one daily delta and carries forward", () => {
    const start = new Date("2026-05-13T00:00:00Z");
    const end = new Date("2026-05-15T00:00:00Z");
    const series = buildMuenzenSeries(
      [
        { amount: 10, createdAt: new Date("2026-05-13T08:00:00Z") },
        { amount: 20, createdAt: new Date("2026-05-13T12:00:00Z") },
        { amount: -5, createdAt: new Date("2026-05-13T20:00:00Z") },
      ],
      0,
      start,
      end,
    );
    expect(series).toEqual([
      { date: "2026-05-13", balance: 25 },
      { date: "2026-05-14", balance: 25 },
      { date: "2026-05-15", balance: 25 },
    ]);
  });

  it("ignores transactions outside the window (defensive)", () => {
    const series = buildMuenzenSeries(
      [
        { amount: 100, createdAt: new Date("2026-05-10T12:00:00Z") }, // before window
        { amount: 50, createdAt: new Date("2026-05-14T12:00:00Z") }, // inside
        { amount: 999, createdAt: new Date("2026-05-20T12:00:00Z") }, // after window
      ],
      0,
      new Date("2026-05-13T00:00:00Z"),
      new Date("2026-05-15T00:00:00Z"),
    );
    expect(series).toEqual([
      { date: "2026-05-13", balance: 0 },
      { date: "2026-05-14", balance: 50 },
      { date: "2026-05-15", balance: 50 },
    ]);
  });

  it("clamps a negative running balance to zero", () => {
    const series = buildMuenzenSeries(
      [{ amount: -20, createdAt: new Date("2026-05-13T12:00:00Z") }],
      5,
      new Date("2026-05-13T00:00:00Z"),
      new Date("2026-05-13T00:00:00Z"),
    );
    expect(series).toEqual([{ date: "2026-05-13", balance: 0 }]);
  });

  it("returns an empty array when windowEnd is before windowStart", () => {
    const series = buildMuenzenSeries(
      [],
      100,
      new Date("2026-05-15T00:00:00Z"),
      new Date("2026-05-13T00:00:00Z"),
    );
    expect(series).toEqual([]);
  });

  it("buckets a transaction exactly at T00:00:00Z into that day", () => {
    const series = buildMuenzenSeries(
      [{ amount: 7, createdAt: new Date("2026-05-14T00:00:00Z") }],
      0,
      new Date("2026-05-13T00:00:00Z"),
      new Date("2026-05-15T00:00:00Z"),
    );
    expect(series).toEqual([
      { date: "2026-05-13", balance: 0 },
      { date: "2026-05-14", balance: 7 },
      { date: "2026-05-15", balance: 7 },
    ]);
  });

  it("returns a single point when window start equals end", () => {
    const series = buildMuenzenSeries(
      [],
      42,
      new Date("2026-05-15T00:00:00Z"),
      new Date("2026-05-15T23:59:59Z"),
    );
    expect(series).toEqual([{ date: "2026-05-15", balance: 42 }]);
  });
});

describe("buildHeatmap", () => {
  it("returns exactly windowDays entries with count 0 when no attempts", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    const days = buildHeatmap([], 90, now);
    expect(days).toHaveLength(90);
    expect(days.every((d) => d.count === 0)).toBe(true);
  });

  it("aggregates multiple attempts on the same day into a single bucket", () => {
    const now = new Date("2026-05-15T23:00:00Z");
    const days = buildHeatmap(
      [
        { completedAt: new Date("2026-05-15T01:00:00Z") },
        { completedAt: new Date("2026-05-15T22:00:00Z") },
      ],
      7,
      now,
    );
    const today = days.find((d) => d.date === "2026-05-15");
    expect(today?.count).toBe(2);
    // All other entries are zero.
    const others = days.filter((d) => d.date !== "2026-05-15");
    expect(others.every((d) => d.count === 0)).toBe(true);
  });

  it("produces exactly 3 non-zero entries when attempts span 3 distinct days", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    const days = buildHeatmap(
      [
        { completedAt: new Date("2026-05-13T10:00:00Z") },
        { completedAt: new Date("2026-05-14T10:00:00Z") },
        { completedAt: new Date("2026-05-15T10:00:00Z") },
      ],
      7,
      now,
    );
    const nonZero = days.filter((d) => d.count > 0);
    expect(nonZero).toHaveLength(3);
    expect(nonZero.map((d) => d.date).sort()).toEqual([
      "2026-05-13",
      "2026-05-14",
      "2026-05-15",
    ]);
  });

  it("places today as the final entry", () => {
    const now = new Date("2026-05-15T08:00:00Z");
    const days = buildHeatmap([], 30, now);
    expect(days[days.length - 1]!.date).toBe(toUtcDayKey(now));
    expect(days[days.length - 1]!.date).toBe("2026-05-15");
  });

  it("ignores attempts outside the window", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    const days = buildHeatmap(
      [
        { completedAt: new Date("2025-01-01T10:00:00Z") }, // way before
        { completedAt: new Date("2030-01-01T10:00:00Z") }, // future
        { completedAt: new Date("2026-05-14T10:00:00Z") }, // inside
      ],
      7,
      now,
    );
    const nonZero = days.filter((d) => d.count > 0);
    expect(nonZero).toHaveLength(1);
    expect(nonZero[0]!.date).toBe("2026-05-14");
  });

  it("returns an empty array for non-positive windowDays", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    expect(buildHeatmap([], 0, now)).toEqual([]);
    expect(buildHeatmap([], -1, now)).toEqual([]);
  });
});

describe("buildRadar", () => {
  it("returns all 10 types with zeros when there are no attempts", () => {
    const out = buildRadar([], LABELS, 10);
    expect(out).toHaveLength(10);
    expect(out.every((r) => r.attempts === 0 && r.avgScore === 0)).toBe(true);
    // Labels are populated.
    expect(out.find((r) => r.type === "FILL_IN_THE_BLANK")?.typeLabel).toBe(
      "Fill",
    );
  });

  it("averages all attempts of a single type when below the lastN cap", () => {
    const attempts = [
      {
        type: "FILL_IN_THE_BLANK" as ExerciseType,
        score: 100,
        completedAt: new Date("2026-05-15T10:00:00Z"),
      },
      {
        type: "FILL_IN_THE_BLANK" as ExerciseType,
        score: 80,
        completedAt: new Date("2026-05-14T10:00:00Z"),
      },
      {
        type: "FILL_IN_THE_BLANK" as ExerciseType,
        score: 60,
        completedAt: new Date("2026-05-13T10:00:00Z"),
      },
    ];
    const out = buildRadar(attempts, LABELS, 10);
    const fill = out.find((r) => r.type === "FILL_IN_THE_BLANK")!;
    expect(fill.attempts).toBe(3);
    expect(fill.avgScore).toBe((100 + 80 + 60) / 3);
    // Other types untouched.
    const others = out.filter((r) => r.type !== "FILL_IN_THE_BLANK");
    expect(others.every((r) => r.attempts === 0 && r.avgScore === 0)).toBe(
      true,
    );
  });

  it("uses only the most recent lastN attempts per type", () => {
    // 5 attempts, lastN = 3. Most recent 3 are scores 100, 90, 80 (by date).
    const attempts = [
      // Older (should be dropped):
      {
        type: "MULTIPLE_CHOICE" as ExerciseType,
        score: 0,
        completedAt: new Date("2026-01-01T10:00:00Z"),
      },
      {
        type: "MULTIPLE_CHOICE" as ExerciseType,
        score: 10,
        completedAt: new Date("2026-02-01T10:00:00Z"),
      },
      // Newest 3 (should be kept):
      {
        type: "MULTIPLE_CHOICE" as ExerciseType,
        score: 80,
        completedAt: new Date("2026-05-13T10:00:00Z"),
      },
      {
        type: "MULTIPLE_CHOICE" as ExerciseType,
        score: 100,
        completedAt: new Date("2026-05-15T10:00:00Z"),
      },
      {
        type: "MULTIPLE_CHOICE" as ExerciseType,
        score: 90,
        completedAt: new Date("2026-05-14T10:00:00Z"),
      },
    ];
    const out = buildRadar(attempts, LABELS, 3);
    const mc = out.find((r) => r.type === "MULTIPLE_CHOICE")!;
    expect(mc.attempts).toBe(3);
    expect(mc.avgScore).toBe((100 + 90 + 80) / 3);
  });

  it("computes each type independently when multiple types overlap", () => {
    const attempts = [
      {
        type: "TRANSLATION" as ExerciseType,
        score: 100,
        completedAt: new Date("2026-05-15T10:00:00Z"),
      },
      {
        type: "TRANSLATION" as ExerciseType,
        score: 50,
        completedAt: new Date("2026-05-14T10:00:00Z"),
      },
      {
        type: "WORD_ORDER" as ExerciseType,
        score: 80,
        completedAt: new Date("2026-05-15T10:00:00Z"),
      },
      {
        type: "WORD_ORDER" as ExerciseType,
        score: 60,
        completedAt: new Date("2026-05-14T10:00:00Z"),
      },
    ];
    const out = buildRadar(attempts, LABELS, 10);
    const tr = out.find((r) => r.type === "TRANSLATION")!;
    const wo = out.find((r) => r.type === "WORD_ORDER")!;
    expect(tr.attempts).toBe(2);
    expect(tr.avgScore).toBe(75);
    expect(wo.attempts).toBe(2);
    expect(wo.avgScore).toBe(70);
  });

  it("pulls typeLabel from the provided labels map", () => {
    const out = buildRadar([], LABELS, 10);
    for (const row of out) {
      expect(row.typeLabel).toBe(LABELS[row.type]);
    }
  });

  it("returns zeros for every type when lastN is non-positive", () => {
    const attempts = [
      {
        type: "FILL_IN_THE_BLANK" as ExerciseType,
        score: 100,
        completedAt: new Date("2026-05-15T10:00:00Z"),
      },
    ];
    const out = buildRadar(attempts, LABELS, 0);
    expect(out).toHaveLength(10);
    expect(out.every((r) => r.attempts === 0 && r.avgScore === 0)).toBe(true);
  });
});

describe("countToday", () => {
  it("returns 0 for an empty attempts list", () => {
    expect(countToday([], new Date("2026-05-15T12:00:00Z"))).toBe(0);
  });

  it("counts multiple attempts on the same UTC day", () => {
    const now = new Date("2026-05-15T15:00:00Z");
    const n = countToday(
      [
        { completedAt: new Date("2026-05-15T01:00:00Z") },
        { completedAt: new Date("2026-05-15T10:00:00Z") },
        { completedAt: new Date("2026-05-15T23:59:00Z") },
      ],
      now,
    );
    expect(n).toBe(3);
  });

  it("ignores attempts from other days", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    const n = countToday(
      [
        { completedAt: new Date("2026-05-15T10:00:00Z") }, // today
        { completedAt: new Date("2026-05-14T10:00:00Z") }, // yesterday
        { completedAt: new Date("2026-05-14T22:00:00Z") }, // yesterday
        { completedAt: new Date("2026-05-14T00:00:00Z") }, // yesterday
        { completedAt: new Date("2026-05-13T18:00:00Z") }, // 2 days ago
        { completedAt: new Date("2026-05-13T08:00:00Z") }, // 2 days ago
      ],
      now,
    );
    expect(n).toBe(1);
  });

  it("counts an attempt at exactly T00:00:00Z of today", () => {
    const now = new Date("2026-05-15T20:00:00Z");
    const n = countToday(
      [{ completedAt: new Date("2026-05-15T00:00:00Z") }],
      now,
    );
    expect(n).toBe(1);
  });
});
