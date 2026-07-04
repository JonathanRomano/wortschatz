import { prisma } from "@wortschatz/database";
import { professionTag, unitFromTags, unitTag } from "@wortschatz/config";
import type { CefrLevel } from "@wortschatz/database";

import {
  PASS_SCORE,
  buildDailyPlan,
  computeTrackProgress,
  resolveTrack,
  type PlanItem,
  type TrackProgress,
  type UnitExercise,
} from "./engine";

function utcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export type TrackData = {
  /** Null when the user has no (valid) profession — no track to show. */
  progress: TrackProgress | null;
  plan: PlanItem[];
  targetLevel: CefrLevel | null;
  dailyGoal: number;
};

/**
 * Everything the "Dein Weg" page and the dashboard track card need, in
 * one parallel batch (dashboard-charts rule: no ad-hoc Prisma on pages).
 * Exercises are matched by their `beruf:`/`unit:` tags via the GIN index.
 */
export async function fetchTrackData(
  userId: string,
  now: Date = new Date(),
): Promise<TrackData> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { profession: true, targetLevel: true, dailyGoal: true },
  });

  const track = resolveTrack(user.profession);
  if (!track) {
    return {
      progress: null,
      plan: [],
      targetLevel: user.targetLevel,
      dailyGoal: user.dailyGoal,
    };
  }

  const beruf = professionTag(track.profession);
  const unitTags = track.units.map((u) => unitTag(u.slug));

  const [exercises, attempts] = await Promise.all([
    prisma.exercise.findMany({
      where: {
        status: "PUBLISHED",
        tags: { has: beruf },
        AND: [{ tags: { hasSome: unitTags } }],
      },
      select: { id: true, type: true, title: true, tags: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userExercise.findMany({
      where: {
        userId,
        exercise: { tags: { has: beruf } },
      },
      select: { exerciseId: true, score: true, completedAt: true },
    }),
  ]);

  const exercisesByUnit: Record<string, UnitExercise[]> = {};
  for (const ex of exercises) {
    const slug = unitFromTags(ex.tags);
    if (!slug) continue;
    (exercisesByUnit[slug] ??= []).push({
      id: ex.id,
      type: ex.type,
      title: ex.title,
    });
  }

  const passedIds = new Set<string>();
  const attemptedIds = new Set<string>();
  const passedTodayIds = new Set<string>();
  const today = utcDayStart(now);
  for (const a of attempts) {
    attemptedIds.add(a.exerciseId);
    if (a.score >= PASS_SCORE) {
      passedIds.add(a.exerciseId);
      if (a.completedAt >= today) passedTodayIds.add(a.exerciseId);
    }
  }

  const progress = computeTrackProgress(track, exercisesByUnit, passedIds);
  const plan = buildDailyPlan(progress, {
    dailyGoal: user.dailyGoal,
    passedIds,
    attemptedIds,
    passedTodayIds,
    exercisesByUnit,
  });

  return {
    progress,
    plan,
    targetLevel: user.targetLevel,
    dailyGoal: user.dailyGoal,
  };
}
