/**
 * Career-track engine (Sprint 05) — pure, DB-free logic. The Prisma
 * side lives in ./queries.ts; everything here operates on plain data so
 * each branch is unit-testable (same split as lib/dashboard).
 */
import { isProfessionSlug } from "@wortschatz/config";

import { TRACKS, type TrackDefinition, type TrackUnit } from "@/content/tracks";

/** House passing rule — matches muenzen.ts / exercises/actions.ts. */
export const PASS_SCORE = 60;

export type UnitState = "done" | "current" | "locked" | "empty";

export interface UnitExercise {
  id: string;
  type: string;
  title: string;
}

export interface UnitProgress {
  unit: TrackUnit;
  /** Published exercises currently tagged into this unit. */
  total: number;
  /** Distinct exercises of this unit the user has passed. */
  passed: number;
  /**
   * Passes needed to complete the unit. `min(targetCount, total)` so a
   * unit stays completable while its content pool is still small.
   */
  target: number;
  completed: boolean;
  state: UnitState;
}

export interface TrackProgress {
  track: TrackDefinition;
  units: UnitProgress[];
  /** Index of the unit to work on now; -1 when every unit is done. */
  currentIndex: number;
  /** Sum of per-unit targets across content-bearing units. */
  totalTarget: number;
  /** Sum of per-unit passes, capped at each unit's target. */
  totalPassed: number;
  /** 0–100 integer. */
  percent: number;
}

export interface PlanItem {
  exercise: UnitExercise;
  unitSlug: string;
  /** Already passed today — renders as a checked-off plan line. */
  done: boolean;
}

/** The user's track, or null (no profession / slug no longer offered). */
export function resolveTrack(
  profession: string | null | undefined,
): TrackDefinition | null {
  if (!profession || !isProfessionSlug(profession)) return null;
  return TRACKS[profession];
}

/**
 * Fold the user's passes into per-unit progress with sequential unlock.
 * Units with no published content yet are "empty": they never block the
 * sequence and never count toward the totals.
 */
export function computeTrackProgress(
  track: TrackDefinition,
  exercisesByUnit: Record<string, UnitExercise[]>,
  passedIds: ReadonlySet<string>,
): TrackProgress {
  const units: UnitProgress[] = track.units.map((unit) => {
    const pool = exercisesByUnit[unit.slug] ?? [];
    const total = pool.length;
    const passed = pool.filter((e) => passedIds.has(e.id)).length;
    const target = Math.min(unit.targetCount, total);
    const completed = total > 0 && passed >= target;
    return {
      unit,
      total,
      passed,
      target,
      completed,
      state: total === 0 ? "empty" : "locked", // refined below
    };
  });

  const currentIndex = units.findIndex(
    (u) => u.state !== "empty" && !u.completed,
  );

  for (const [i, u] of units.entries()) {
    if (u.state === "empty") continue;
    u.state = u.completed ? "done" : i === currentIndex ? "current" : "locked";
  }

  const withContent = units.filter((u) => u.total > 0);
  const totalTarget = withContent.reduce((sum, u) => sum + u.target, 0);
  const totalPassed = withContent.reduce(
    (sum, u) => sum + Math.min(u.passed, u.target),
    0,
  );
  const percent =
    totalTarget === 0 ? 0 : Math.round((100 * totalPassed) / totalTarget);

  return { track, units, currentIndex, totalTarget, totalPassed, percent };
}

/**
 * Today's plan: what was already passed today (checked off, so the list
 * fills up satisfyingly as the learner works), then the next unpassed
 * exercises starting at the current unit — weak items (attempted but
 * never passed) before unseen ones, mirroring the runner's draw tiers —
 * spilling into later units until `dailyGoal` items are collected.
 */
export function buildDailyPlan(
  progress: TrackProgress,
  opts: {
    dailyGoal: number;
    passedIds: ReadonlySet<string>;
    attemptedIds: ReadonlySet<string>;
    passedTodayIds: ReadonlySet<string>;
    exercisesByUnit: Record<string, UnitExercise[]>;
  },
): PlanItem[] {
  const { dailyGoal, passedIds, attemptedIds, passedTodayIds, exercisesByUnit } =
    opts;
  const goal = Math.max(1, dailyGoal);
  const plan: PlanItem[] = [];

  // Checked-off lines: today's passes across the whole track, unit order.
  for (const u of progress.units) {
    for (const exercise of exercisesByUnit[u.unit.slug] ?? []) {
      if (plan.length >= goal) return plan;
      if (passedTodayIds.has(exercise.id)) {
        plan.push({ exercise, unitSlug: u.unit.slug, done: true });
      }
    }
  }

  // Fill the remaining slots from the current unit onward.
  const start = progress.currentIndex === -1 ? progress.units.length : progress.currentIndex;
  for (const u of progress.units.slice(start)) {
    const pool = (exercisesByUnit[u.unit.slug] ?? []).filter(
      (e) => !passedIds.has(e.id),
    );
    // Weak first (attempted, never passed), then unseen — stable within.
    const ordered = [
      ...pool.filter((e) => attemptedIds.has(e.id)),
      ...pool.filter((e) => !attemptedIds.has(e.id)),
    ];
    for (const exercise of ordered) {
      if (plan.length >= goal) return plan;
      plan.push({ exercise, unitSlug: u.unit.slug, done: false });
    }
  }

  return plan;
}
