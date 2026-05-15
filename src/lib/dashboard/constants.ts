// Dashboard configuration knobs. Kept dependency-free so the
// aggregation helpers (and any future tests) can import them without
// pulling in Prisma or React. Task 6 will swap `DAILY_GOAL_DEFAULT`
// for `User.dailyGoal` once that column is added.

export const DAILY_GOAL_DEFAULT = 5;
export const HEATMAP_DAYS = 90;
export const MUENZEN_SERIES_DAYS = 30;
export const RADAR_LAST_N = 10;
// Cap on the most-recent attempts we pull for the radar chart. 10 types
// × ~10 attempts each = 100 rows in the steady state; doubled for slack.
export const RADAR_FETCH_LIMIT = 200;
