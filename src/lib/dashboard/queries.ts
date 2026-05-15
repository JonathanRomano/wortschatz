import { prisma } from "@/lib/db";
import {
  HEATMAP_DAYS,
  MUENZEN_SERIES_DAYS,
  RADAR_FETCH_LIMIT,
} from "./constants";

// Thin Prisma wrappers that pull only the columns each chart needs.
// Centralizing them keeps the dashboard server component readable and
// makes it obvious what data leaves the DB. All queries are scoped by
// `userId` and use the existing indexes (`UserExercise.userId+completedAt`,
// `MuenzenTransaction.userId+createdAt`).

const MS_PER_DAY = 86_400_000;

function utcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export type DashboardChartData = {
  now: Date;
  muenzenWindowStart: Date;
  muenzenWindowEnd: Date;
  muenzenTxnsInWindow: { amount: number; createdAt: Date }[];
  muenzenStartingBalance: number;
  heatmapAttempts: { completedAt: Date }[];
  radarAttempts: {
    score: number;
    completedAt: Date;
    exercise: { type: import("@prisma/client").ExerciseType };
  }[];
  todayCount: number;
};

/**
 * Fetch every raw row the four dashboard charts need in a single
 * Promise.all. Aggregation is done in `aggregations.ts` so the
 * shaping logic stays pure and testable.
 */
export async function fetchDashboardChartData(
  userId: string,
  now: Date = new Date(),
): Promise<DashboardChartData> {
  // Münzen series window: last MUENZEN_SERIES_DAYS days, inclusive of
  // today. The "start" boundary in the DB query is *not* day-aligned —
  // we round it down to UTC midnight so the aggregate (sum of older
  // transactions) is exact.
  const todayUtc = utcDayStart(now);
  const muenzenWindowEnd = todayUtc;
  const muenzenWindowStart = new Date(
    todayUtc.getTime() - (MUENZEN_SERIES_DAYS - 1) * MS_PER_DAY,
  );
  const heatmapWindowStart = new Date(
    todayUtc.getTime() - (HEATMAP_DAYS - 1) * MS_PER_DAY,
  );
  const todayStart = todayUtc;

  const [
    muenzenTxnsInWindow,
    startingAgg,
    heatmapAttempts,
    radarAttempts,
    todayCount,
  ] = await Promise.all([
    prisma.muenzenTransaction.findMany({
      where: { userId, createdAt: { gte: muenzenWindowStart } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.muenzenTransaction.aggregate({
      where: { userId, createdAt: { lt: muenzenWindowStart } },
      _sum: { amount: true },
    }),
    prisma.userExercise.findMany({
      where: { userId, completedAt: { gte: heatmapWindowStart } },
      select: { completedAt: true },
    }),
    prisma.userExercise.findMany({
      where: { userId },
      select: {
        score: true,
        completedAt: true,
        exercise: { select: { type: true } },
      },
      orderBy: { completedAt: "desc" },
      take: RADAR_FETCH_LIMIT,
    }),
    prisma.userExercise.count({
      where: { userId, completedAt: { gte: todayStart } },
    }),
  ]);

  return {
    now,
    muenzenWindowStart,
    muenzenWindowEnd,
    muenzenTxnsInWindow,
    muenzenStartingBalance: startingAgg._sum.amount ?? 0,
    heatmapAttempts,
    radarAttempts,
    todayCount,
  };
}
