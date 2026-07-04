# Candidate Improvement Queue

Researched ideas, pre-scored, ready for future iterations. When the queue already holds
high-scored, migration-free items, an iteration skips fresh research and pulls from here.

Scoring (0–5 each): **Impact** (for a CEFR-aligned German learner) · **Size** (5 = tiny,
1 = large; prefer < ~300 LOC) · **Risk** (5 = safe/isolated, 1 = risky) · **Indep**
(5 = standalone). `MIG` = needs a DB migration (heavily penalized — see DECISIONS preamble).
`Σ` = sum (max 20). Picked items move to DECISIONS.md; rejected stay here with scores.

## Ready — migration-free (ranked)

- [x] **A. Umlaut/eszett-tolerant grading** — Σ20 — **DONE iter 2** (flag `UMLAUT_TOLERANT_GRADING`).
- [ ] **A2. Stricter German-fold / ß-homograph handling** — Impact 3 / Size 4 / Risk 4 / Indep 4 — Σ15 — MIG:no
  — iter 2's ß↔ss fold accepts real homographs (Maße/Masse, Buße/Busse, in Maßen/in Massen). Optional
  follow-up: umlaut-only strict mode, or a small homograph blocklist that forces exact ß, or fold-only-
  as-partial-credit. Operator may instead just flip the flag. — files: `lib/exercises/grade.ts`.
- [x] **B. Don't re-serve already-passed exercises** — Σ18 — **DONE iter 3** (flag `PREFER_UNSEEN_EXERCISES`).
- [x] **C. Escalating streak milestone bonuses** — Σ17 — **DONE iter 5** (flag `STREAK_MILESTONE_REWARDS`).
- [x] **BUG2. Streak-award concurrency hardening** — Σ15 — **DONE iter 6** (conditional-claim updateMany).
- [ ] **BUG3. base/perfect first-completion race** — Impact 2 / Size 3 / Risk 3 / Indep 3 — Σ11 — MIG:no
  — smaller pre-existing race: `priorSuccess`/`alreadyEarned` is read outside the tx, so two concurrent
  first completions of the SAME exercise can each award base+perfect (10+5). Fix likely needs a per-
  (user,exercise) idempotency key or an in-tx guard. Lower value than BUG2 (small amounts, same-exercise
  concurrency only). — files: `lib/exercises/actions.ts`. Noted during iter 6.
- [x] **C2. Streak celebration in the result panel** — Σ15 — **DONE iter 12** (🔥 streak line when the
  streak advances). Milestone-specific banner (distinguishing a 7/30/100 moment) still open as **C3**.
- [x] **C3. Milestone-specific celebration** — Σ14 — **DONE iter 18** (🎉 milestone line via `streakMilestone`).
- [x] **F. WORD_ORDER partial credit** — Σ17 — **DONE iter 4** (LCS-based, folding-aware).
- [ ] **D. Daily-goal reward hook** — Impact 4 / Size 4 / Risk 3 / Indep 4 — Σ15 — MIG:no*
  — one-time Münzen bonus when countToday hits dailyGoal (reuse BONUS reason, refId=`daily-goal:<UTCday>`).
  — files: `lib/exercises/actions.ts`, `lib/muenzen.ts` — src: Duolingo daily chest.
  — ⚠ *idempotency: exact-count + in-tx prior-BONUS check is racy under concurrent submits (same class as
  BUG2); a fully race-free version wants a unique index on (userId, reason, refId) = migration. Do with
  operator sign-off, or accept the documented narrow race.*
- [x] **J. Relative activity-heatmap buckets** — Σ16 — **DONE iter 9** (pure `heatmapThresholds`).
- [x] **P. TTS for listening when audioUrl null** — Σ15 — **DONE iter 8** (flag `LISTENING_TTS`).
- [x] **E. Reveal correct answer in result panel** — Σ15 — **DONE iter 7** (flag `REVEAL_CORRECT_ANSWER`).
  Scoped to an additive "Correct answer" line in ExerciseResult (no renderer changes). Per-blank inline
  highlighting in the renderers (the richer version) remains available as a follow-up (**E2**).
- [x] **E2. Per-blank mismatch feedback** — Σ12 — **DONE iter 19** (grade.ts `mismatches` → result panel;
  shows "you wrote X → correct Y" per wrong blank). In-renderer colour highlighting remains a follow-up.
- [x] **S. Week-over-week recap line** — Σ15 — **DONE iter 17** (hero caption, this-week vs last-week count).
  Avg-score delta would need a 14-day score fetch (deferred); count is derived from the existing heatmap.
- [ ] **G. Typo tolerance (Levenshtein ≤1 / length-scaled)** — Impact 4 / Size 4 / Risk 3 / Indep 4 — Σ15 — MIG:no
  — near-miss = partial credit + "careful with spelling"; builds on A. — files: `lib/exercises/grade.ts`.
- [ ] **V. Dashboard groupBy perf fix** — Impact 2 / Size 5 / Risk 4 / Indep 4 — Σ15 — MIG:no
  — replace two unbounded findMany with groupBy. — files: `dashboard/page.tsx`, `lib/dashboard/queries.ts`.
- [x] **K. Longest-streak + goal-met-days stats** — Σ15 — **DONE iter 10** (windowed, pure aggregations).
- [x] **H. Weakness-weighted selection (resurface mistakes)** — Σ14 — **DONE iter 13** (flag `PREFER_WEAK_EXERCISES`).
- [x] **I. Bounded practice session + completion screen** — Σ14 — **DONE iter 11** (flag `PRACTICE_SESSIONS`).
- [ ] **R. Radar trend (recent vs previous window)** — Impact 3 / Size 3 / Risk 4 / Indep 4 — Σ14 — MIG:no
  — files: `lib/dashboard/aggregations.ts`, `components/dashboard/ProficiencyRadar.tsx`.
- [x] **T. Tap-to-pair matching board** — Σ14 — **DONE iter 14** (flag `MATCHING_TAP_TO_PAIR`; dropdown retained).
- [x] **N. Derived XP-level system** — Σ13 — **DONE iter 15** (flag `XP_LEVELS_ENABLED`; hero level badge).
- [ ] **M. "Practice these mistakes" queue runner** — Impact 4 / Size 3 / Risk 3 / Indep 3 — Σ13 — MIG:no
  — sequential player over getMistakes rows. — files: mistakes/page.tsx, TypeRunner.tsx, actions.ts.
- [x] **L. Derived achievements/badges shelf** — Σ13 — **DONE iter 16** (6 badges, read-only derivation).
  Persisted unlock timestamps + toasts = migration follow-up (**L2**).
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
- [ ] **BUG4. Streak on first PASS regardless of an earlier same-day fail** — decouple the activity
  timestamp from the streak-day claim with a dedicated `User.lastStreakDay` (Date) column, so a failed
  first attempt no longer "uses up" the day. Migration-gated. Low severity (matches current sequential
  semantics; no phantom reward). Noted during iter 6 review.
- [ ] Streak freeze / repair — new `User.streakFreezes`/`frozenUntil` + `SPENT_STREAK_FREEZE` reason.
- [ ] True SM-2/FSRS SRS — interval/ease/dueAt columns on UserExercise or a ReviewState table.
- [ ] Daily/weekly quests — Quest/UserQuest tables.
- [ ] Persisted error-tag mistakes — errorTags column/table on UserExercise.
- [ ] Persisted achievements (unlock timestamps + toasts) — Achievement table.

## Rough implementation order (Judge confirms per-iteration)
iter2=A · iter3=B · iter4=F · iter5=C · iter6=D · iter7=E · iter8=G · then J/P/S/K/V …
