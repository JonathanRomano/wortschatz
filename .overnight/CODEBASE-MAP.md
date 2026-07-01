# Codebase Map — gamification / exercises / eval / review / progress

Baseline reference for every iteration's Cartographer (from the startup recon workflow).
"What we have today"; the QUEUE holds "what best apps do that we don't".

## Gamification & economy
- **Currency:** single int `User.muenzen`; every change writes a `MuenzenTransaction`
  (amount, `reason` enum, free-form `refId`, `createdAt`). Writers ONLY in
  `apps/web/src/lib/muenzen.ts`: `credit` / `debit` (InsufficientFundsError) / `adminAdjust`.
- **Reasons enum (fixed):** `EXERCISE_COMPLETE, PERFECT_SCORE_BONUS, DAILY_STREAK,
  SPENT_AI_REVIEW, ADMIN_ADJUSTMENT, BONUS` (BONUS is legacy/unused). **Adding a new reason =
  migration** (Postgres enum) — reuse existing ones to stay migration-free.
- **Rewards** (`MUENZEN_RULES` in muenzen.ts, mirrored `MUENZEN_REWARDS` in `@wortschatz/config`):
  exerciseComplete=10, exerciseCompleteWithTip=3, perfectBonus=5, dailyStreak=20 (flat, first pass
  of a UTC day). Only sink: aiReviewCost=30.
- **`computeReward(score, isFirstOfDay, tipUsed)`** → `{base, perfect, streakBonus}`. Does NOT
  receive streak length → streak bonus never scales. Awards only on FIRST passing attempt
  (score≥60) per (user, exercise).
- **Streak** (`submitExerciseAttempt` in `lib/exercises/actions.ts`): `isSameCalendarDay` (UTC);
  first-of-day pass → `streak = wasYesterday ? streak+1 : 1`. No freeze, no longest-streak record.
- **Daily goal** `User.dailyGoal` (default 5) drives `DailyGoalRing` only — hitting it awards nothing.
- **Absent entirely:** XP/levels (LevelChip = CEFR proficiency, not XP), achievements/badges,
  leaderboards/leagues, quests, streak freeze, social layer.

## Exercise system
- **10 `ExerciseType`s**, each with: zod schema (`packages/exercises/src/schemas.ts`), renderer
  (`components/exercises/renderers/`, registered in `renderers/index.tsx`), static intro
  (`content/exercise-intros/`), and a grading branch in `lib/exercises/grade.ts`.
- **Selection = pure random, no personalization:** `getRandomExerciseOfType(type, excludeId?, level?)`
  = count + random skip/take(1). Filters only {type, PUBLISHED, level?, id≠excludeId}. Does NOT
  exclude already-passed items, does NOT weight by weakness/recency. Every "Next" is an independent draw.
- **No session/sequencing concept.** TypeRunner is an infinite same-type "Next" loop; no length,
  no progress bar, no completion screen, no dailyGoal awareness, no mixed types.
- **Levels:** UI hardcodes `['A1','A2','B1']`; `?level=` is a hard filter; `user.learningLevel`
  is NOT used to pick exercises.
- **Mistakes** (`/exercises/mistakes`): raw SQL DISTINCT ON latest attempt WHERE score<60, grouped
  by type, static list with per-row Retry. Not interleaved into practice.

## Answer evaluation & feedback
- **Two-stage:** `gradeLocally` first; if `!deterministic && AI_CONFIGURED` → Express `evaluateAnswer`
  (Claude). Pass threshold = **score ≥ 60** everywhere.
- **`norm()`** = NFKC + lowercase + strip `[.,!?;:"']` + collapse whitespace. **`eq` = exact match
  after norm.** NO umlaut/eszett folding (ä↔ae, ö↔oe, ü↔ue, ß↔ss), NO diacritic strip, NO typo/edit
  distance, NO article leniency.  ← biggest German-specific gap.
- Partial credit: FILL_IN_THE_BLANK & MATCHING (correct/total). MULTIPLE_CHOICE/WORD_ORDER/
  VERB_CONJUGATION = all-or-nothing. TRANSLATION/ERROR_CORRECTION deterministic only on match
  (a miss → AI). READING/LISTENING/FREE_WRITING always AI.
- **Feedback UX** (`ExerciseResult.tsx`): score ring + one English `feedback` string + explanation +
  Münzen. Learner never sees WHICH blank was wrong or the correct answer; renderers get no correctness map.
- Grader feedback strings in grade.ts are **hardcoded English** (bypass next-intl).

## Review / SRS
- **NO spaced repetition** anywhere (no interval/ease/dueAt/box). `/review` is the paid AI-text
  feature, not item review. Only mistakes surface = the static list above.

## Progress & data model
- Dashboard funnels through `fetchDashboardChartData` (`lib/dashboard/queries.ts`) →
  `aggregations.ts` pure helpers (`buildMuenzenSeries`, `buildHeatmap`, `buildRadar`, `countToday`).
- Radar = avg of last 10 attempts/type (no time trend). Heatmap buckets hardcoded 0/1/2/3/4+.
  by-level/by-type on the dashboard page load ALL UserExercise rows (unbounded fetch).
- **Key learning fields:** `User.{streak,lastActiveAt,dailyGoal,learningLevel,nativeLanguage}`,
  `UserExercise.{answer,score,feedback,tipUsed,completedAt}` — the only per-item history (no
  scheduling columns).

## Constraints for this loop
- **Migrations never run.** New Prisma column/table/enum value ⇒ migration ⇒ penalized/deferred.
- **Inspector gate:** typecheck + test + build (lint non-functional on baseline). Reset `.next/`
  if a stale route-validator error appears.
