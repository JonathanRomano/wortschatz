// Dashboard configuration knobs. Kept dependency-free so the
// aggregation helpers (and any future tests) can import them without
// pulling in Prisma or React. As of Sprint 02 Task 6 the per-user
// `dailyGoal` column on `User` is the source of truth — this constant
// is the fallback the dashboard reaches for if that value is somehow
// null/undefined, and also the DB-side default for new accounts.

export const DAILY_GOAL_DEFAULT = 5;
export const HEATMAP_DAYS = 90;
export const MUENZEN_SERIES_DAYS = 30;
export const RADAR_LAST_N = 10;
// Cap on the most-recent attempts we pull for the radar chart. 10 types
// × ~10 attempts each = 100 rows in the steady state; doubled for slack.
export const RADAR_FETCH_LIMIT = 200;
