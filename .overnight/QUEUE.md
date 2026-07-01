# Candidate Improvement Queue

Researched ideas, pre-scored, ready for future iterations. When the queue already holds
high-scored, migration-free items, an iteration skips fresh research and pulls from here.

Scoring (0–5 each): **Impact** (for a CEFR-aligned German learner) · **Size** (5 = tiny,
1 = large; prefer < ~300 LOC) · **Risk** (5 = safe/isolated, 1 = risky) · **Indep**
(5 = standalone). `MIG` = needs a DB migration (heavily penalized — see DECISIONS preamble).
`Σ` = sum (max 20). Picked items move to DECISIONS.md; rejected stay here with scores.

## Ready — migration-free (ranked)

- [ ] **A. Umlaut/eszett-tolerant grading** — Impact 5 / Size 5 / Risk 5 / Indep 5 — **Σ20** — MIG:no
  — fold ä↔ae, ö↔oe, ü↔ue, ß↔ss in `norm()`/`eq()`; accept as correct, flag "watch the umlaut".
  — files: `lib/exercises/grade.ts` — source: Duolingo accent tolerance, Clozemaster. **← iter 2**
- [ ] **B. Don't re-serve already-passed exercises** — Impact 4 / Size 5 / Risk 4 / Indep 5 — Σ18 — MIG:no
  — in `getRandomExerciseOfType`, exclude ids the user already passed (UserExercise score≥60), fall back
  when pool exhausted. — files: `lib/exercises/actions.ts` — source: Anki/Duolingo mastered-leave-queue.
- [ ] **C. Escalating streak milestone bonuses** — Impact 4 / Size 5 / Risk 4 / Indep 4 — Σ17 — MIG:no
  — pass `newStreak` into `computeReward`; milestone bonus at 7/30/100 (reuse DAILY_STREAK reason).
  — files: `lib/muenzen.ts`, `lib/exercises/actions.ts`, `packages/config/src/constants.ts` — src: Duolingo.
- [ ] **F. WORD_ORDER partial credit** — Impact 3 / Size 5 / Risk 4 / Indep 5 — Σ17 — MIG:no
  — LCS / correct-relative-position instead of 0/100. — files: `lib/exercises/grade.ts` — src: Clozemaster.
- [ ] **D. Daily-goal reward hook** — Impact 4 / Size 4 / Risk 4 / Indep 4 — Σ16 — MIG:no
  — one-time Münzen bonus when countToday hits dailyGoal (reuse BONUS reason, refId=`daily-goal:<UTCday>`
  for idempotency). — files: `lib/exercises/actions.ts`, `lib/muenzen.ts` — src: Duolingo daily chest.
- [ ] **J. Relative activity-heatmap buckets** — Impact 2 / Size 5 / Risk 4 / Indep 5 — Σ16 — MIG:no
  — quantile thresholds from the user's own 90d data vs hardcoded 0/1/2/3/4+. — files:
  `components/dashboard/ActivityHeatmap.tsx`, `lib/dashboard/aggregations.ts` — src: GitHub graph.
- [ ] **P. TTS for listening when audioUrl null** — Impact 4 / Size 3 / Risk 3 / Indep 5 — Σ15 — MIG:no
  — SpeechSynthesis (de-DE); hide transcript behind a toggle (no dep). — files:
  `components/exercises/renderers/ListeningComprehension.tsx` — src: Duolingo/Babbel TTS.
- [ ] **E. Per-item correctness + reveal correct answer** — Impact 5 / Size 3 / Risk 3 / Indep 4 — Σ15 — MIG:no
  — return `perItem`/`expected` from `gradeLocally`, highlight wrong blanks + show right token.
  — files: grade.ts, actions.ts, `ExerciseResult.tsx`, renderers — src: Duolingo/Busuu inline correction.
- [ ] **S. Weekly recap card** — Impact 3 / Size 4 / Risk 4 / Indep 4 — Σ15 — MIG:no — this-week vs
  last-week attempts + avg-score delta. — files: `dashboard/page.tsx`, `lib/dashboard/aggregations.ts`.
- [ ] **G. Typo tolerance (Levenshtein ≤1 / length-scaled)** — Impact 4 / Size 4 / Risk 3 / Indep 4 — Σ15 — MIG:no
  — near-miss = partial credit + "careful with spelling"; builds on A. — files: `lib/exercises/grade.ts`.
- [ ] **V. Dashboard groupBy perf fix** — Impact 2 / Size 5 / Risk 4 / Indep 4 — Σ15 — MIG:no
  — replace two unbounded findMany with groupBy. — files: `dashboard/page.tsx`, `lib/dashboard/queries.ts`.
- [ ] **K. Longest-streak + goal-met-days stats** — Impact 3 / Size 4 / Risk 4 / Indep 4 — Σ15 — MIG:no
  — pure aggregation from attempt history. — files: `lib/dashboard/aggregations.ts`, `dashboard/page.tsx`.
- [ ] **H. Weakness-weighted selection** — Impact 4 / Size 3 / Risk 3 / Indep 4 — Σ14 — MIG:no (overlaps B)
  — bias draw toward unseen + last-failed items. — files: `lib/exercises/actions.ts`.
- [ ] **I. Bounded session + completion screen (dailyGoal)** — Impact 4 / Size 3 / Risk 3 / Indep 4 — Σ14 — MIG:no
  — TypeRunner counts to a session length, shows progress + celebrate. — files: TypeRunner.tsx.
- [ ] **R. Radar trend (recent vs previous window)** — Impact 3 / Size 3 / Risk 4 / Indep 4 — Σ14 — MIG:no
  — files: `lib/dashboard/aggregations.ts`, `components/dashboard/ProficiencyRadar.tsx`.
- [ ] **T. Tap-to-pair matching board** — Impact 3 / Size 3 / Risk 3 / Indep 5 — Σ14 — MIG:no
  — keep {pairs} answer shape. — files: `components/exercises/renderers/Matching.tsx`.
- [ ] **N. Derived XP-level system** — Impact 4 / Size 3 / Risk 3 / Indep 3 — Σ13 — MIG:no
  — level from Σ positive txns; level ring + progress. — files: aggregations, LevelChip, header/dashboard.
- [ ] **M. "Practice these mistakes" queue runner** — Impact 4 / Size 3 / Risk 3 / Indep 3 — Σ13 — MIG:no
  — sequential player over getMistakes rows. — files: mistakes/page.tsx, TypeRunner.tsx, actions.ts.
- [ ] **L. Derived achievements/badges shelf** — Impact 4 / Size 2 / Risk 3 / Indep 4 — Σ13 — MIG:no
  — read-time derivation, no persistence. — files: aggregations, dashboard/profile.
- [ ] **O. Weekly leaderboard (read-only)** — Impact 3 / Size 3 / Risk 3 / Indep 4 — Σ13 — MIG:no
  — rolling 7d sum of positive txns; mind privacy/opt-in. — files: queries, dashboard page.
- [ ] **U. "Review due today" CTA + Leitner-ish mistakes ordering** — Impact 4 / Size 3 / Risk 3 / Indep 3 — Σ13 — MIG:no
  — computed recency/box from completedAt+score. — files: dashboard, mistakes, queries.
- [ ] **W. Accuracy-based level nudge** — Impact 4 / Size 3 / Risk 3 / Indep 3 — Σ13 — MIG:no
  — "Ready for A2/B1?" when recent accuracy ≥85%. — files: exercises/page.tsx, actions.ts.
- [ ] **Q. Localize grader feedback strings** — Impact 3 / Size 3 / Risk 3 / Indep 3 — Σ12 — MIG:no
  — move grade.ts English strings to messages/*.json. — files: grade.ts, ExerciseResult, messages.
- [ ] **X. Second Münzen sink** — Impact 3 / Size 3 / Risk 3 / Indep 3 — Σ12 — MIG:no — spend to
  un-penalize a tip / buy review credits. — files: actions.ts, muenzen.ts, TypeRunner.tsx.
- [ ] **Y. AI errorTags structured feedback** — Impact 4 / Size 3 / Risk 2 / Indep 3 — Σ11 — MIG:no
  — extend EVALUATE_SYSTEM for error categories (case/gender/verb-position). ⚠ prompt change → AI
  cache/versioning care (see CLAUDE.md). — files: `apps/api/src/services/claude.ts`, ExerciseResult.

## Deferred — needs a migration (write file only, never run)
- [ ] Streak freeze / repair — new `User.streakFreezes`/`frozenUntil` + `SPENT_STREAK_FREEZE` reason.
- [ ] True SM-2/FSRS SRS — interval/ease/dueAt columns on UserExercise or a ReviewState table.
- [ ] Daily/weekly quests — Quest/UserQuest tables.
- [ ] Persisted error-tag mistakes — errorTags column/table on UserExercise.
- [ ] Persisted achievements (unlock timestamps + toasts) — Achievement table.

## Rough implementation order (Judge confirms per-iteration)
iter2=A · iter3=B · iter4=F · iter5=C · iter6=D · iter7=E · iter8=G · then J/P/S/K/V …
