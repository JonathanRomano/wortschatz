import { describe, it, expect } from "vitest";

import {
  ACHIEVEMENT_COUNT,
  countEarned,
  deriveAchievements,
  type AchievementStats,
} from "@/content/achievements";

const ZERO: AchievementStats = {
  totalPassed: 0,
  perfectCount: 0,
  longestStreak: 0,
  goalMetDays: 0,
  typesTried: 0,
};

const earnedIds = (stats: AchievementStats) =>
  deriveAchievements(stats)
    .filter((a) => a.earned)
    .map((a) => a.id);

describe("deriveAchievements", () => {
  it("returns every achievement, all locked at zero stats", () => {
    const all = deriveAchievements(ZERO);
    expect(all).toHaveLength(ACHIEVEMENT_COUNT);
    expect(all.every((a) => !a.earned)).toBe(true);
    expect(countEarned(ZERO)).toBe(0);
  });

  it("unlocks first-win on the first pass", () => {
    expect(earnedIds({ ...ZERO, totalPassed: 1 })).toEqual(["first-win"]);
  });

  it("unlocks each badge at its threshold", () => {
    expect(earnedIds({ ...ZERO, goalMetDays: 10 })).toContain("dedicated");
    expect(earnedIds({ ...ZERO, longestStreak: 7 })).toContain("week-streak");
    expect(earnedIds({ ...ZERO, perfectCount: 10 })).toContain("flawless");
    expect(earnedIds({ ...ZERO, typesTried: 10 })).toContain("explorer");
    expect(earnedIds({ ...ZERO, totalPassed: 100 })).toContain("centurion");
  });

  it("does not unlock a badge one below its threshold", () => {
    expect(earnedIds({ ...ZERO, longestStreak: 6 })).not.toContain(
      "week-streak",
    );
    expect(earnedIds({ ...ZERO, totalPassed: 99 })).not.toContain("centurion");
  });

  it("counts all as earned when every stat is maxed", () => {
    const maxed: AchievementStats = {
      totalPassed: 100,
      perfectCount: 10,
      longestStreak: 7,
      goalMetDays: 10,
      typesTried: 10,
    };
    expect(countEarned(maxed)).toBe(ACHIEVEMENT_COUNT);
  });
});
