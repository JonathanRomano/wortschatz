import { describe, it, expect } from "vitest";

import {
  computeReward,
  isSameCalendarDay,
  MUENZEN_RULES,
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
    });
  });

  it("returns zero reward when score is below the pass threshold, even on first of day", () => {
    // 59 didn't pass; no base AND no streak bonus.
    expect(computeReward(59, true)).toEqual({
      base: 0,
      perfect: 0,
      streakBonus: 0,
    });
  });

  it("awards base when score is exactly 60 (pass threshold, not first of day)", () => {
    expect(computeReward(60, false)).toEqual({
      base: 10,
      perfect: 0,
      streakBonus: 0,
    });
  });

  it("awards base + streak bonus on first pass of the day at the pass threshold", () => {
    expect(computeReward(60, true)).toEqual({
      base: 10,
      perfect: 0,
      streakBonus: 20,
    });
  });

  it("awards base + perfect bonus on a perfect score (not first of day)", () => {
    expect(computeReward(100, false)).toEqual({
      base: 10,
      perfect: 5,
      streakBonus: 0,
    });
  });

  it("awards base + perfect bonus + streak bonus on a perfect first-of-day attempt", () => {
    const reward = computeReward(100, true);
    expect(reward).toEqual({ base: 10, perfect: 5, streakBonus: 20 });
    // Total of all three rewards == 35.
    expect(reward.base + reward.perfect + reward.streakBonus).toBe(35);
  });

  it("treats 99 as passing but not perfect", () => {
    expect(computeReward(99, false)).toEqual({
      base: 10,
      perfect: 0,
      streakBonus: 0,
    });
  });

  it("treats 100 as perfect even when not first of day", () => {
    expect(computeReward(100, false).perfect).toBe(5);
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
