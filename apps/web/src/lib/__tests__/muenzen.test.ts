import { describe, it, expect } from "vitest";

import {
  applyEarnedGuard,
  computeReward,
  isSameCalendarDay,
  MUENZEN_RULES,
  STREAK_MILESTONES,
  streakMilestoneBonus,
} from "@/lib/muenzen";

describe("MUENZEN_RULES", () => {
  it("exposes the documented constants", () => {
    expect(MUENZEN_RULES.exerciseComplete).toBe(10);
    expect(MUENZEN_RULES.perfectBonus).toBe(5);
    expect(MUENZEN_RULES.dailyStreak).toBe(20);
    expect(MUENZEN_RULES.aiReviewCost).toBe(30);
  });
});

describe("computeReward", () => {
  it("returns zero reward when score is 0 (and not first of day)", () => {
    expect(computeReward(0, false)).toEqual({
      base: 0,
      perfect: 0,
      streakBonus: 0,
      milestoneBonus: 0,
    });
  });

  it("returns zero reward when score is below the pass threshold, even on first of day", () => {
    // 59 didn't pass; no base AND no streak bonus.
    expect(computeReward(59, true)).toEqual({
      base: 0,
      perfect: 0,
      streakBonus: 0,
      milestoneBonus: 0,
    });
  });

  it("awards base when score is exactly 60 (pass threshold, not first of day)", () => {
    expect(computeReward(60, false)).toEqual({
      base: 10,
      perfect: 0,
      streakBonus: 0,
      milestoneBonus: 0,
    });
  });

  it("awards base + streak bonus on first pass of the day at the pass threshold", () => {
    expect(computeReward(60, true)).toEqual({
      base: 10,
      perfect: 0,
      streakBonus: 20,
      milestoneBonus: 0,
    });
  });

  it("awards base + perfect bonus on a perfect score (not first of day)", () => {
    expect(computeReward(100, false)).toEqual({
      base: 10,
      perfect: 5,
      streakBonus: 0,
      milestoneBonus: 0,
    });
  });

  it("awards base + perfect bonus + streak bonus on a perfect first-of-day attempt", () => {
    const reward = computeReward(100, true);
    expect(reward).toEqual({
      base: 10,
      perfect: 5,
      streakBonus: 20,
      milestoneBonus: 0,
    });
    // Total of all four rewards == 35 when no milestone is hit.
    expect(
      reward.base + reward.perfect + reward.streakBonus + reward.milestoneBonus,
    ).toBe(35);
  });

  it("treats 99 as passing but not perfect", () => {
    expect(computeReward(99, false)).toEqual({
      base: 10,
      perfect: 0,
      streakBonus: 0,
      milestoneBonus: 0,
    });
  });

  it("treats 100 as perfect even when not first of day", () => {
    expect(computeReward(100, false).perfect).toBe(5);
  });

  it("adds the milestone bonus on the day a streak reaches 7 (first-of-day pass)", () => {
    expect(computeReward(60, true, false, 7)).toEqual({
      base: 10,
      perfect: 0,
      streakBonus: 20,
      milestoneBonus: 30,
    });
  });

  it("adds no milestone bonus for a non-milestone streak length", () => {
    expect(computeReward(60, true, false, 8).milestoneBonus).toBe(0);
  });

  it("only awards the milestone on the first-of-day pass that advances the streak", () => {
    // Same streak length but not first-of-day → no streak/milestone bonus.
    expect(computeReward(100, false, false, 30).milestoneBonus).toBe(0);
    // Didn't pass → nothing, even first-of-day at a milestone length.
    expect(computeReward(59, true, false, 30).milestoneBonus).toBe(0);
  });

  it("defaults milestoneBonus to 0 when streakLength is omitted", () => {
    expect(computeReward(60, true).milestoneBonus).toBe(0);
  });
});

describe("applyEarnedGuard", () => {
  const full = { base: 10, perfect: 5, streakBonus: 20, milestoneBonus: 30 };

  it("returns rewards unchanged when the exercise was not already earned", () => {
    expect(applyEarnedGuard(full, false)).toEqual(full);
  });

  it("zeroes only the per-exercise rewards on a repeat pass, keeping the per-day streak rewards", () => {
    // Regression guard: a repeat exercise as the day's first pass must still
    // pay the streak + milestone bonus (the streak counter advances anyway),
    // or a milestone reached this way would be permanently lost.
    expect(applyEarnedGuard(full, true)).toEqual({
      base: 0,
      perfect: 0,
      streakBonus: 20,
      milestoneBonus: 30,
    });
  });

  it("still yields nothing when there were no streak rewards to keep", () => {
    expect(
      applyEarnedGuard(
        { base: 10, perfect: 5, streakBonus: 0, milestoneBonus: 0 },
        true,
      ),
    ).toEqual({ base: 0, perfect: 0, streakBonus: 0, milestoneBonus: 0 });
  });
});

describe("streakMilestoneBonus", () => {
  it("returns the configured bonus at exact milestone lengths", () => {
    expect(streakMilestoneBonus(7)).toBe(STREAK_MILESTONES[7]);
    expect(streakMilestoneBonus(30)).toBe(STREAK_MILESTONES[30]);
    expect(streakMilestoneBonus(365)).toBe(STREAK_MILESTONES[365]);
  });

  it("returns 0 between milestones and at day 0", () => {
    expect(streakMilestoneBonus(0)).toBe(0);
    expect(streakMilestoneBonus(6)).toBe(0);
    expect(streakMilestoneBonus(8)).toBe(0);
    expect(streakMilestoneBonus(29)).toBe(0);
  });

  it("escalates: each milestone bonus is larger than the previous", () => {
    const days = Object.keys(STREAK_MILESTONES)
      .map(Number)
      .sort((a, b) => a - b);
    for (let i = 1; i < days.length; i++) {
      expect(streakMilestoneBonus(days[i]!)).toBeGreaterThan(
        streakMilestoneBonus(days[i - 1]!),
      );
    }
  });
});

describe("isSameCalendarDay", () => {
  it("returns true for the same UTC date at different times", () => {
    const a = new Date(Date.UTC(2026, 4, 15, 0, 0, 0)); // 2026-05-15 00:00 UTC
    const b = new Date(Date.UTC(2026, 4, 15, 23, 59, 59)); // 2026-05-15 23:59 UTC
    expect(isSameCalendarDay(a, b)).toBe(true);
  });

  it("returns false for different UTC dates within the same month", () => {
    const a = new Date(Date.UTC(2026, 4, 15));
    const b = new Date(Date.UTC(2026, 4, 16));
    expect(isSameCalendarDay(a, b)).toBe(false);
  });

  it("returns false for dates in different months", () => {
    const a = new Date(Date.UTC(2026, 4, 31, 23, 59, 59));
    const b = new Date(Date.UTC(2026, 5, 1, 0, 0, 0));
    expect(isSameCalendarDay(a, b)).toBe(false);
  });

  it("returns false for dates in different years", () => {
    const a = new Date(Date.UTC(2025, 11, 31, 23, 59, 59));
    const b = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(isSameCalendarDay(a, b)).toBe(false);
  });

  it("is symmetric", () => {
    const a = new Date(Date.UTC(2026, 4, 15, 5, 0, 0));
    const b = new Date(Date.UTC(2026, 4, 15, 18, 0, 0));
    expect(isSameCalendarDay(a, b)).toBe(isSameCalendarDay(b, a));
  });

  it("uses UTC consistently (not the local timezone)", () => {
    // Two instants that are the same UTC calendar day but might cross a
    // local-time boundary in some zones. We expect UTC-based comparison,
    // so they must be considered same-day regardless of where the test
    // runs.
    const a = new Date(Date.UTC(2026, 4, 15, 1, 0, 0));
    const b = new Date(Date.UTC(2026, 4, 15, 22, 0, 0));
    expect(isSameCalendarDay(a, b)).toBe(true);
  });

  it("returns true when comparing a date to itself", () => {
    const a = new Date(Date.UTC(2026, 4, 15, 12, 0, 0));
    expect(isSameCalendarDay(a, a)).toBe(true);
  });
});
