// Dashboard-specific tuning knobs. Kept dependency-free so the
// aggregation helpers (and tests) can import them without pulling in
// Prisma or React.
//
// DAILY_GOAL_DEFAULT moved to @wortschatz/config during Sprint 03 since
// apps/api also needs it; import it from there.

export const HEATMAP_DAYS = 90;
export const MUENZEN_SERIES_DAYS = 30;
export const RADAR_LAST_N = 10;
// Cap on the most-recent attempts we pull for the radar chart. 10 types
// × ~10 attempts each = 100 rows in the steady state; doubled for slack.
export const RADAR_FETCH_LIMIT = 200;
