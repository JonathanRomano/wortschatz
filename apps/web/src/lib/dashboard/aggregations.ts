import type { ExerciseType } from "@wortschatz/database";

// Pure aggregation helpers feeding the dashboard charts. None of these
// touch Prisma or React — they take plain rows and return plain data so
// they're trivially unit-testable and safe to call from any environment.
//
// Day strings are ISO `YYYY-MM-DD` in UTC. Using UTC throughout avoids
// the off-by-one bucketing bugs that show up the moment the server runs
// in a timezone different from the user. The frontend formats the
// labels using the user's locale, so the underlying UTC bucketing is
// invisible to them.

export type MuenzenSeriesPoint = {
  date: string;
  balance: number;
};

export type HeatmapDay = {
  date: string;
  count: number;
};

export type RadarPoint = {
  type: ExerciseType;
  typeLabel: string;
  avgScore: number;
  attempts: number;
};

const MS_PER_DAY = 86_400_000;

/**
 * `YYYY-MM-DD` for the UTC day containing `date`. Stable regardless of
 * the server's local timezone.
 */
export function toUtcDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Truncate a Date to its UTC-day midnight. */
function utcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Cumulative Münzen balance, one point per UTC day in [windowStart,
 * windowEnd] inclusive. Each point's `balance` is the balance at
 * end-of-day after every transaction stamped that day has been applied.
 *
 * `startingBalanceAtWindowStart` is the user's balance immediately
 * before the first day in the window — i.e. the sum of every
 * transaction with `createdAt < windowStart`. The caller fetches that
 * separately via `prisma.muenzenTransaction.aggregate`.
 */
export function buildMuenzenSeries(
  transactions: { amount: number; createdAt: Date }[],
  startingBalanceAtWindowStart: number,
  windowStart: Date,
  windowEnd: Date,
): MuenzenSeriesPoint[] {
  const start = utcDayStart(windowStart);
  const end = utcDayStart(windowEnd);
  if (end.getTime() < start.getTime()) return [];

  // Sum deltas per UTC day. Transactions outside the window are
  // ignored — the caller is expected to have prefiltered, but being
  // defensive here keeps the helper self-contained.
  const dailyDelta = new Map<string, number>();
  for (const tx of transactions) {
    const day = utcDayStart(tx.createdAt);
    if (day.getTime() < start.getTime() || day.getTime() > end.getTime()) {
      continue;
    }
    const key = toUtcDayKey(day);
    dailyDelta.set(key, (dailyDelta.get(key) ?? 0) + tx.amount);
  }

  const out: MuenzenSeriesPoint[] = [];
  let running = startingBalanceAtWindowStart;
  for (
    let t = start.getTime();
    t <= end.getTime();
    t += MS_PER_DAY
  ) {
    const day = new Date(t);
    const key = toUtcDayKey(day);
    running += dailyDelta.get(key) ?? 0;
    // Balance can't display negative — clamp at zero so the y-axis
    // stays positive even if seed data is messy.
    out.push({ date: key, balance: Math.max(0, running) });
  }
  return out;
}

/**
 * Dense daily exercise counts for the heatmap. Returns exactly
 * `windowDays` entries: the oldest day first, today (UTC) last. Days
 * with no attempts get `count: 0`.
 */
export function buildHeatmap(
  attempts: { completedAt: Date }[],
  windowDays: number,
  now: Date,
): HeatmapDay[] {
  if (windowDays <= 0) return [];

  const end = utcDayStart(now);
  const start = new Date(end.getTime() - (windowDays - 1) * MS_PER_DAY);

  const counts = new Map<string, number>();
  for (const a of attempts) {
    const day = utcDayStart(a.completedAt);
    if (day.getTime() < start.getTime() || day.getTime() > end.getTime()) {
      continue;
    }
    const key = toUtcDayKey(day);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: HeatmapDay[] = [];
  for (let i = 0; i < windowDays; i++) {
    const day = new Date(start.getTime() + i * MS_PER_DAY);
    const key = toUtcDayKey(day);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

/**
 * Colour-bucket cut points for the activity heatmap, relative to the learner's
 * own activity so both a light user (peaks at ~2/day) and a heavy user (~20/day)
 * get a meaningful gradient instead of everyone saturating the top bucket.
 *
 * Returns three ascending thresholds [t1, t2, t3] for the four non-zero buckets:
 * `count ≤ 0 → 0, ≤ t1 → 1, ≤ t2 → 2, ≤ t3 → 3, else → 4`. For light activity
 * (max ≤ 4) it keeps the intuitive absolute scale [1, 2, 3]; above that the cut
 * points scale to ~25/50/75% of the busiest day and are kept strictly
 * increasing so no bucket collapses.
 */
export function heatmapThresholds(counts: number[]): [number, number, number] {
  const max = counts.reduce((m, c) => Math.max(m, c), 0);
  if (max <= 4) return [1, 2, 3];
  const t1 = Math.max(1, Math.round(max * 0.25));
  const t2 = Math.max(t1 + 1, Math.round(max * 0.5));
  const t3 = Math.max(t2 + 1, Math.round(max * 0.75));
  return [t1, t2, t3];
}

/**
 * Longest run of consecutive days with at least one attempt within the given
 * (chronologically-ordered) heatmap window. A *windowed* best streak — it can't
 * see activity older than the window, so it complements `User.streak` (the
 * live ongoing streak) rather than replacing an all-time record.
 */
export function longestStreak(days: HeatmapDay[]): number {
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** Number of days in the window on which the learner met their daily goal. */
export function goalMetDays(days: HeatmapDay[], dailyGoal: number): number {
  if (dailyGoal <= 0) return 0;
  return days.reduce((n, d) => (d.count >= dailyGoal ? n + 1 : n), 0);
}

/**
 * Per-type average score over the most-recent `lastN` attempts of that
 * type. Types with zero attempts are still returned (so the radar
 * always renders all 10 axes) with `avgScore: 0, attempts: 0`. Input
 * order doesn't matter — we sort by `completedAt` descending internally.
 */
export function buildRadar(
  attempts: { type: ExerciseType; score: number; completedAt: Date }[],
  labels: Record<ExerciseType, string>,
  lastN: number,
): RadarPoint[] {
  const allTypes = Object.keys(labels) as ExerciseType[];
  if (lastN <= 0) {
    return allTypes.map((type) => ({
      type,
      typeLabel: labels[type],
      avgScore: 0,
      attempts: 0,
    }));
  }

  // Bucket then sort each bucket descending by completedAt. We sort
  // each bucket independently so an unsorted input is fine.
  const byType = new Map<
    ExerciseType,
    { score: number; completedAt: Date }[]
  >();
  for (const a of attempts) {
    const list = byType.get(a.type) ?? [];
    list.push({ score: a.score, completedAt: a.completedAt });
    byType.set(a.type, list);
  }

  return allTypes.map<RadarPoint>((type) => {
    const rows = byType.get(type) ?? [];
    if (rows.length === 0) {
      return { type, typeLabel: labels[type], avgScore: 0, attempts: 0 };
    }
    rows.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    const taken = rows.slice(0, lastN);
    const sum = taken.reduce((acc, r) => acc + r.score, 0);
    const avg = sum / taken.length;
    return {
      type,
      typeLabel: labels[type],
      avgScore: avg,
      attempts: taken.length,
    };
  });
}

/**
 * Count of attempts on the same UTC day as `now`. Used by the
 * daily-goal ring.
 */
export function countToday(
  attempts: { completedAt: Date }[],
  now: Date,
): number {
  const today = utcDayStart(now).getTime();
  const tomorrow = today + MS_PER_DAY;
  let n = 0;
  for (const a of attempts) {
    const t = a.completedAt.getTime();
    if (t >= today && t < tomorrow) n += 1;
  }
  return n;
}
