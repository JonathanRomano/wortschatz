# Overnight Competitive Improvement Loop — Decision Log

Branch: `feature/overnight-competitive-loop` (based on `main`).
Each iteration = exactly one commit. One improvement per iteration, researched from
best-in-class language apps, mapped to our codebase, scored, built, and QA-gated.

## Preamble — Environment baseline (established at startup)

- **Base branch:** branched from `main`. `main` is 6 commits behind `sprint/prompt-curation`;
  it already contains the merged API-boundary work and does **not** contain the in-progress
  prompt-curation commits (the SPEC's out-of-scope zone). Morning review: `git log --oneline main..HEAD`.
- **Green baseline gates** (must stay green after every iteration):
  - `pnpm typecheck` ✓ — after clearing a stale `apps/web/.next/` cache that referenced
    prompt-curation routes absent on `main` (`.next/` is a gitignored build artifact).
  - `pnpm test` ✓ — 532 passed / 47 files (~9s).
  - build ✓ — `@wortschatz/api` (tsc, ~2s) + `@wortschatz/web` (`next build`, ~39s; no live DB needed).
- **Lint is NON-FUNCTIONAL on this baseline** → not an Inspector gate. `apps/web` has no ESLint
  config and neither `eslint` nor `eslint-config-next` is installed, so `next lint` drops into an
  interactive setup prompt and exits non-zero. Installing/configuring ESLint would be a new heavy
  dependency + monorepo-tooling change (out of scope / Hard Rule 6) and would surface pre-existing
  lint debt across the codebase. **Inspector gate = typecheck + test + build.**
- **Migration constraint (load-bearing for prioritization):** migrations are never executed. The
  Judge heavily penalizes improvements needing new Prisma columns/tables. When a schema change is
  unavoidable, the migration file is *written but never run*, and the code guards the
  not-yet-migrated state behind a feature flag so the app still builds and runs green.

---

## Iteration 1 — 2026-07-01 22:19 CEST — Codebase recon + seeded improvement queue
**Status:** RESEARCH (no code change)
**Inspired by:** the loop's own SCOUT/CARTOGRAPHER phases — build the map before building features.
**What I did:** Ran a 5-agent parallel recon workflow mapping gamification/economy, exercise system,
answer-evaluation, review/SRS, and progress/data-model. Synthesized `.overnight/CODEBASE-MAP.md`
(the reusable "what we have" reference) and seeded `.overnight/QUEUE.md` with 25 migration-free
candidates (pre-scored Impact/Size/Risk/Indep) plus 5 migration-gated ones deferred.
**Headline findings:** no SRS, no XP levels, no achievements, no leaderboards, no quests, no
streak-freeze; exercise selection is pure-random with no memory (re-serves passed items); grading has
**no umlaut/eszett folding and no typo tolerance** (ä/ae, ß/ss mismatch → score 0) — the biggest
German-specific gap; learners never see which blank was wrong. Most high-value mechanics are reachable
migration-free by deriving from existing `UserExercise`/`MuenzenTransaction` data.
**Files touched:** `.overnight/{CODEBASE-MAP.md, QUEUE.md, DECISIONS.md, PROGRESS.md}` (docs only).
**Feature flag:** n/a
**Risk / open questions:** adding a `MuenzenReason` value or any Prisma column = migration → avoid;
reuse `BONUS`/`DAILY_STREAK` reasons. `apps/api` prompt edits carry AI-cache/versioning caveats.
**Verification:** docs-only; baseline gates unchanged (tc ✓ test ✓ build ✓ from startup).
**Next:** iter 2 = candidate **A** (umlaut/eszett-tolerant grading).

---

## Iteration 2 — 2026-07-01 22:30 CEST — Umlaut/eszett-tolerant answer grading
**Status:** IMPLEMENTED
**Inspired by:** Duolingo accent/typo forgiveness, Clozemaster accent tolerance (queue item A, Σ20).
**What they do:** Best apps don't hard-fail a learner who can't type ä/ö/ü/ß on their keyboard —
`Tuer` is accepted for `Tür`, `Strasse` for `Straße`, with a gentle "watch the accent" nudge.
**What we had:** `gradeLocally`'s `norm()`/`eq()` did exact string match only. `ae/oe/ue/ss`
transliterations scored 0, and for TRANSLATION/ERROR_CORRECTION a near-miss wasted a paid AI call.
Non-German-keyboard learners hard-failed on spelling they arguably got right.
**What I changed:** Added a `foldGerman` (ä↔ae, ö↔oe, ü↔ue, ß↔ss) and a `compare()` that tries an
exact normalized match FIRST (byte-identical to before), then falls back to a folded match. Rewired
all seven closed-form grading branches to `compare`; a folded-only match still counts correct but
appends an English "it's spelled with ä/ö/ü/ß" hint. TRANSLATION/ERROR_CORRECTION now stay
deterministic (no AI) when folding resolves them. Added the first-ever `grade.test.ts` (17 tests).
**Files touched:** `apps/web/src/lib/exercises/grade.ts` (+~65/-20),
`apps/web/src/lib/exercises/__tests__/grade.test.ts` (new, 17 tests).
**Feature flag:** `UMLAUT_TOLERANT_GRADING` (exported const in grade.ts, default **on**). Set to
`false` to restore byte-identical strict exact-match grading.
**Risk / open questions:** Adversarial review (2nd opinion) confirmed no code bug, symmetric folding,
preserved exact-match feedback, safe null/NFKC handling. ONE product tradeoff it flagged: ß↔ss folding
accepts genuine homographs — `Maße`(dimensions)/`Masse`(mass), `Buße`/`Busse`, `in Maßen`/`in Massen`
(opposite meaning) — as correct, awarding first-pass Münzen. Trigger is narrow (expected must contain
ß + a real homograph must exist + learner must type it). Kept because the dominant case is a learner
who simply can't type ß/umlauts (and `Strasse`=valid Swiss spelling); umlaut folds don't collide
(`schön`≠`schon`). Stricter mode queued as **A2**; the flag is the immediate escape hatch.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 549/48, api 5, +17 new) · build ✓ (60/60 pages).
Lint n/a (non-functional baseline).
**Next:** iter 3 = candidate **B** (don't re-serve already-passed exercises).

---

## Iteration 3 — 2026-07-01 22:36 CEST — Prefer unseen exercises in the "Next" draw
**Status:** IMPLEMENTED
**Inspired by:** Anki/Duolingo — mastered items leave the active queue (queue item B, Σ18).
**What they do:** Practice surfaces material you haven't nailed yet; you don't get handed a prompt you
just aced two draws ago.
**What we had:** `getRandomExerciseOfType` was uniform-random over the whole published pool with no
learner memory — it could immediately re-serve an exercise the user had already passed, and never
prioritized fresh material.
**What I changed:** Added a pure, DB-free `buildSelectionWheres` (new `lib/exercises/selection.ts`)
that returns tiered `where` clauses: tier 1 = the filter minus every already-passed exercise id
("unseen"), tier 2 = the full pool (unchanged). The action now resolves the current user via `auth()`,
loads their passed ids (score≥60) for this type/level, and tries each tier in order; the original
cross-level fallback (`excludeId && !level`) is preserved verbatim. When there's no user or nothing
passed, behavior is byte-equivalent to before. Added `selection.test.ts` (7 tests on the tiering).
**Files touched:** `apps/web/src/lib/exercises/selection.ts` (new), `.../actions.ts` (+48/-27),
`.../__tests__/selection.test.ts` (new, 7 tests).
**Feature flag:** `PREFER_UNSEEN_EXERCISES` (exported const in selection.ts, default **on**). Off =
pure uniform-random over the full pool (pre-iter-3).
**Risk / open questions:** the helper is `"use server"`-safe (lives in a plain module — a sync export
from actions.ts would be rejected by Next). Adversarial review (2nd opinion) checked the new `auth()`
call across call sites, fallback equivalence, and dead-end safety. Extra per-draw queries (auth + passed
lookup + count/tier) are acceptable; a groupBy/perf pass is queued separately (V).
**Verification:** typecheck ✓ (7/7) · test ✓ (web 49 files, +7 new; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 4 = candidate **F** (WORD_ORDER partial credit).

---

## Iteration 4 — 2026-07-02 00:31 CEST — WORD_ORDER partial credit (LCS)
**Status:** IMPLEMENTED
**Inspired by:** Clozemaster/Duolingo partial scoring of word-bank ordering (queue item F, Σ17).
**What they do:** Rearranging a word bank and getting one pair swapped shouldn't zero the whole item —
you get credit for the words you did place in the right relative order.
**What we had:** WORD_ORDER was all-or-nothing — exact ordered-array match = 100, anything else = 0,
even a single transposition. (FILL_IN_THE_BLANK and MATCHING already gave partial credit; WORD_ORDER
was the outlier.)
**What I changed:** Added a pure `lcsLength` helper (1-D rolling DP) and scored WORD_ORDER by the
longest common subsequence of expected vs submitted tokens, normalized by the longer length
(`round(LCS / max(len) · 100)`). Equality is folding-aware (iter-2 umlaut tolerance still applies), and
a folded-only match still appends the umlaut hint. Exact order still yields 100 with the original
"Correct word order." wording; extra/missing/transposed words now yield graded partial credit. Added
4 WORD_ORDER cases (updated the old "wrong order = 0" case → 67; total grade tests 17→21).
**Files touched:** `apps/web/src/lib/exercises/grade.ts` (+~40), `.../__tests__/grade.test.ts` (+~35).
**Feature flag:** `WORD_ORDER_PARTIAL_CREDIT` (exported const, default **on**). Off = strict 100/0
exact-order grading.
**Risk / open questions:** Pure function, hand-verified against all six test cases; no DB/auth/money
touched, so self-reviewed rather than sent to an adversarial subagent. Note: partial credit means a
mostly-correct order (≥60%) can now pass and award first-attempt Münzen — intentional and consistent
with the other partial-credit types. Also learned this repo has `noUncheckedIndexedAccess` on (fixed a
first-pass `dp[]` typecheck error); future array indexing must guard with `?? 0`/`!`.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 49 files, grade 21; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 5 = candidate **C** (escalating streak milestone bonuses) — touches Münzen, will get an
adversarial review.

---

## Iteration 5 — 2026-07-02 00:38 CEST — Escalating streak milestone bonuses
**Status:** IMPLEMENTED
**Inspired by:** Duolingo streak milestones / Memrise streak rewards (queue item C, Σ17).
**What they do:** Hitting a 7/30/100-day streak is a celebrated moment with a bigger reward, not the
same flat trickle every day — it makes the streak worth protecting.
**What we had:** a flat `dailyStreak = 20` bonus on the first pass of each calendar day; `computeReward`
never even saw the streak length, so a 100-day streak rewarded exactly like day 2.
**What I changed:** `computeReward` now takes `streakLength` and returns a fourth component
`milestoneBonus`, looked up from a `STREAK_MILESTONES` table (7→30, 14→50, 30→100, 50→150, 100→300,
200→600, 365→1000) via `streakMilestoneBonus`, gated on the same first-of-day passing attempt as the
flat bonus so it fires exactly once as the streak climbs. `submitExerciseAttempt` passes `newStreak`,
writes the milestone as its own `DAILY_STREAK` transaction (distinct `refId=streak-milestone:<n>` for
the history page), and folds it into the returned `streakBonus` so the result badge's total reflects it
with no UI change. Reused the DAILY_STREAK reason → **no migration**. Also added a pure
`applyEarnedGuard` helper (see next) to fix a bug the adversarial review found.
**Correctness fix (review BUG 1):** the streak/milestone bonuses are per-DAY but were being zeroed by
the per-EXERCISE `alreadyEarned` guard. If the day's first passing attempt was a *repeat* exercise, the
streak counter still advanced but the milestone bonus was dropped — and a milestone missed that way is
permanently lost. `applyEarnedGuard` now zeroes only `base`/`perfect` on a repeat, keeping the day-level
streak + milestone bonuses. (This also fixes a latent one-day loss of the flat streak bonus.)
**Files touched:** `apps/web/src/lib/muenzen.ts` (+~75: milestones + applyEarnedGuard),
`.../exercises/actions.ts` (+~12), `.../__tests__/muenzen.test.ts` (+~90: computeReward shape,
7 milestone tests, 3 applyEarnedGuard tests).
**Feature flag:** `STREAK_MILESTONE_REWARDS` (exported const in muenzen.ts, default **on**). Off =
flat-bonus-only. (The applyEarnedGuard correctness fix is a bugfix, not gated — revert the commit for
the exact pre-iter-5 behavior.)
**Risk / open questions:** money path → adversarial review checked double-award/replay, first-of-day
gating, `$transaction` atomicity, UI-vs-DB double-count (all correct). It surfaced **BUG 1** (fixed
above) and **BUG 2**: a *pre-existing* TOCTOU race — the streak/priorSuccess reads happen outside the
`$transaction`, so two concurrent same-day submits can both compute `newStreak=7` and double-award. The
milestone amplifies the doubled amount (up to 2×1000 at day 365). Not introduced here; a migration-free
fix (in-tx conditional `updateMany` "claim the day") is queued as **iter 6** and taken next. Flag off
disables the amplification. Milestone celebration UI queued as **C2**.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 49 files, muenzen suite 46; api 5) · build ✓ (60/60).
Lint n/a.
**Next:** iter 6 = **streak-award concurrency hardening** (fixes review BUG 2); then iter 7 = candidate D.

---

## Iteration 6 — 2026-07-02 00:52 CEST — Streak-award concurrency: atomic "claim the day"
**Status:** IMPLEMENTED
**Inspired by:** the iter-5 adversarial review (BUG 2) — a pre-existing double-award race the milestone
amplified.
**What they do:** n/a (correctness hardening, not a competitor feature). Awarding a daily reward must be
idempotent under concurrent requests.
**What we had:** `submitExerciseAttempt` read `{lastActiveAt, streak}` OUTSIDE the `$transaction`, then
unconditionally wrote `streak = newStreak` and paid the streak/milestone bonus whenever `streakBonus>0`.
Two concurrent same-day submits both read `lastActiveAt=yesterday`, both computed `newStreak=7`, and both
paid — doubling the flat 20 + the milestone (up to 2×1000 at day 365).
**What I changed:** the streak advance is now an atomic conditional claim inside the transaction:
`tx.user.updateMany({ where: { id, OR:[lastActiveAt null, lastActiveAt < startOfUtcDay(now)] }, data:{
lastActiveAt: now, streak: newStreak }})`. Under READ COMMITTED the second concurrent writer re-checks
the WHERE after the first commits, sees `lastActiveAt = today`, matches 0 rows, and skips — so the streak
and its bonuses are granted exactly once. Streak/milestone credits are gated on `claim.count === 1`;
`streakAwarded` (surfaced as the result's `streakBonus`) is 0 for the race loser so the badge is
accurate. Non-first-of-day submits take an `else` that just refreshes `lastActiveAt`. Added a pure
`startOfUtcDay` helper (unit-tested). Base/perfect credits are unchanged. **No migration.**
**Files touched:** `apps/web/src/lib/exercises/actions.ts` (+~48/-12), `.../muenzen.ts` (+startOfUtcDay),
`.../__tests__/muenzen.test.ts` (+3 startOfUtcDay tests).
**Feature flag:** none — it's a correctness fix; `git revert` restores the prior (racy) path.
**Risk / open questions:** the DB race itself isn't unit-testable in the jsdom/no-DB harness, so the
concurrency logic is validated by reasoning + an adversarial review confirming exactly-once award and
equivalence on the reset/gap, second-of-day, failed-first, new-user (null lastActiveAt), and race-loser
paths. Review found ONE narrow edge (not a regression): a concurrent *failed* first-of-day attempt that
commits first bumps `lastActiveAt`, so a near-simultaneous *pass* won't claim the streak that day — this
matches the existing *sequential* "first activity claims the day" semantics, awards no phantom coins, and
`newStreak` isn't shown in the UI. A full fix (streak on first PASS regardless of an earlier fail) needs
a dedicated streak-day column → migration; queued as **BUG4** (deferred). Also unaddressed: the smaller
pre-existing base/perfect same-exercise race (**BUG3**, queued).
**Verification:** typecheck ✓ (7/7) · test ✓ (web 49 files, muenzen 49; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 7 = candidate **D** (daily-goal reward hook).

---

## Iteration 7 — 2026-07-02 01:05 CEST — Reveal the correct answer in the result panel
**Status:** IMPLEMENTED
**Inspired by:** Duolingo/Busuu inline correction (queue item E, Σ15). Deferred candidate **D**
(daily-goal reward) because a correct idempotent implementation needs either a new award-race (which I
just spent iters 5–6 removing) or a migration — so I picked the highest-value *safe* item instead.
**What they do:** after a miss, good apps show you the right answer, not just a score, so you actually
learn from the attempt.
**What we had:** `ExerciseResult` showed only a score ring + prose feedback + explanation. For a
closed-form miss (e.g. 2/3 blanks, wrong multiple-choice) the learner never saw the correct token(s).
**What I changed:** `gradeLocally` now attaches a `correctAnswer` string for *deterministic* grades
scored < 100, built by a new `solutionText` helper per type (blanks joined, the correct option text,
the joined word order, the conjugated form, `key → value` pairs). `submitExerciseAttempt` threads it
into `SubmitResult`; `ExerciseResult` renders an additive "Correct answer" line (green, `success.main`)
between feedback and explanation. Added the `exercises.correctAnswer` label to all four locales
(en/pt/tr/uk). No renderer changes — the input components are untouched.
**Files touched:** `grade.ts` (+solutionText/wrapper), `actions.ts` (SubmitResult + thread),
`ExerciseResult.tsx`, `TypeRunner.tsx`, `ExerciseRunner.tsx`, `messages/{en,pt,tr,uk}.json`,
`__tests__/grade.test.ts` (+8 tests, 21→29).
**Feature flag:** `REVEAL_CORRECT_ANSWER` (exported const in grade.ts, default **on**). Off = no
correctAnswer computed/shown (scores/feedback unchanged).
**Risk / open questions:** additive UI, no money/concurrency — self-reviewed (i18n key parity verified
across 4 locales; index access guarded). TRANSLATION/ERROR_CORRECTION intentionally don't reveal (they
go to AI on a miss); open-ended types have none. Richer per-blank inline highlighting in the renderers
is queued as **E2**.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 49 files, grade 29; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 8 = candidate **P** (TTS for listening when audioUrl is null) or **J**/**K** — a safe UI
/ read-only item.

---

## Iteration 8 — 2026-07-02 01:13 CEST — Text-to-speech for listening exercises
**Status:** IMPLEMENTED
**Inspired by:** Duolingo/Babbel TTS, Clozemaster listening mode (queue item P, Σ15).
**What they do:** listening practice actually plays audio; you don't read the answer off the screen.
**What we had:** when a `LISTENING_COMPREHENSION` exercise had no `audioUrl` (the common case), the
renderer just **printed the German transcript** — turning every listening item into a reading item and
removing all listening value.
**What I changed:** in the no-audio branch, `ListeningComprehensionRenderer` now speaks the transcript
via the browser `SpeechSynthesis` API (`de-DE`, rate 0.9) behind a "Play audio" button, with the
transcript hidden behind a "Show/Hide transcript" toggle so the learner listens first. TTS support is
resolved after mount (hydration-safe: SSR and first client render are identical — controls with the
play button disabled, no transcript — then it enables post-mount). When TTS is unavailable (old browser
/ SSR) or the flag is off, it falls back to showing the transcript (original behavior). No new
dependency (SpeechSynthesis is built into browsers). Added 4 i18n keys × 4 locales and a component test
mocking `speechSynthesis`/`SpeechSynthesisUtterance` (play → speaks de-DE, toggle reveals transcript,
no-TTS fallback, audioUrl path unchanged).
**Files touched:** `renderers/ListeningComprehension.tsx` (rewrite), `messages/{en,pt,tr,uk}.json`
(+3 keys each), `renderers/__tests__/ListeningComprehension.test.tsx` (new, 4 tests).
**Feature flag:** `LISTENING_TTS` (exported const in the renderer, default **on**). Off = original
always-show-transcript fallback.
**Risk / open questions:** isolated to one renderer; no money/data. Main subtlety (hydration) verified.
Browser voice availability varies (de-DE voice may be absent on some OSes) — the API still speaks with a
default voice; a voice-picker/rate control is a possible follow-up. Self-reviewed (not sent to an
adversarial agent) given the low blast radius and test coverage.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 50 files, +4; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 9 = a safe read-only dashboard item — candidate **K** (longest-streak + goal-met-days) or
**J** (relative heatmap buckets).

---

## Iteration 9 — 2026-07-02 01:18 CEST — Relative activity-heatmap buckets
**Status:** IMPLEMENTED
**Inspired by:** the GitHub contribution graph's relative shading (queue item J, Σ16).
**What they do:** the activity calendar's colour intensity is relative to your own volume, so the
gradient means something whether you're a light or heavy user.
**What we had:** `ActivityHeatmap.colorFor` used hardcoded absolute buckets (0 / 1 / 2 / 3–4 / 5+). A
heavy user who does 15 exercises a day saturates the top colour every day (no gradient); a light user
barely leaves the first two buckets.
**What I changed:** added a pure `heatmapThresholds(counts)` in `aggregations.ts` returning three
ascending cut points scaled to ~25/50/75% of the learner's busiest day (kept strictly increasing so no
bucket collapses), with the intuitive `[1,2,3]` absolute scale retained for light activity (max ≤ 4).
`ActivityHeatmap` computes the thresholds from its own data (memoised) and `colorFor` uses them. The
now-inaccurate `0`/`5+` legend labels became localised **Less**/**More** (GitHub-style) — added those
two keys to `dashboard.charts.activity` in all four locales.
**Files touched:** `lib/dashboard/aggregations.ts` (+heatmapThresholds), `components/dashboard/
ActivityHeatmap.tsx`, `messages/{en,pt,tr,uk}.json` (+2 keys each), `__tests__/aggregations.test.ts`
(+3 tests, incl. a strictly-increasing property test over max 5–200).
**Feature flag:** none — a visual refinement; the absolute-scale path (max ≤ 4) preserves the prior look
for light users, and `git revert` restores the fixed buckets.
**Risk / open questions:** pure aggregation + presentational; no money/data. Self-reviewed. Uses `Math.round`
half-up which is fine here. Existing heatmap tests (which don't assert colours) still pass.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 50 files, aggregations +3; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 10 = candidate **K** (longest-streak + goal-met-days stats) or **S** (weekly recap) —
another safe pure-aggregation dashboard win.

---

## Iteration 10 — 2026-07-02 01:24 CEST — Longest-streak + goal-met-days stat cards
**Status:** IMPLEMENTED
**Inspired by:** Duolingo's longest-streak badge + Habitica goal-hit history (queue item K, Σ15).
**What they do:** show your best streak and how consistently you hit your daily goal — long-horizon
motivation beyond the current streak number.
**What we had:** the highlights grid showed only week / month / total / to-review counts. The current
streak lives in the hero, but there was no "best streak" and no goal-consistency signal at all.
**What I changed:** two pure helpers in `aggregations.ts` — `longestStreak(days)` (longest consecutive
run of active days) and `goalMetDays(days, dailyGoal)` (days at/above the goal) — both computed from the
already-fetched 90-day heatmap, so **no new query**. Added two `<Stat>` cards to the dashboard and
rebalanced the highlights grid to 3 columns (6 cards → a clean 2×3 on desktop). Added `longestStreak` /
`goalMetDays` labels to all four locales.
**Files touched:** `lib/dashboard/aggregations.ts` (+2 helpers), `app/[locale]/dashboard/page.tsx`,
`messages/{en,pt,tr,uk}.json` (+2 keys each), `__tests__/aggregations.test.ts` (+6 tests, 30→36).
**Feature flag:** none — additive presentational stats; `git revert` removes them.
**Risk / open questions:** pure + presentational, no money/data. Both stats are **windowed to 90 days**
(honest: `longestStreak` complements `User.streak`, it isn't an all-time record — an all-time version
needs a stored column = migration). Self-reviewed.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 50 files, aggregations 36; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 11 = a learning-side item for variety — candidate **T** (tap-to-pair matching) or **I**
(bounded practice session + completion screen).

---

## Iteration 11 — 2026-07-02 01:30 CEST — Bounded practice session + completion screen
**Status:** IMPLEMENTED
**Inspired by:** Duolingo fixed-length lessons / Babbel bite-size sessions (queue item I, Σ14).
**What they do:** practice comes in finite chunks with a progress bar and a satisfying "done!" screen —
a natural stopping point instead of an endless grind.
**What we had:** `TypeRunner` was an infinite same-type "Next" loop — no session length, no progress,
no completion state (the single biggest structural gap the recon flagged).
**What I changed:** a new pure `lib/exercises/session.ts` (flag `PRACTICE_SESSIONS`, `SESSION_LENGTH=5`,
`recordSubmission`/`isSessionComplete`/`sessionProgressPct`, all unit-tested). `TypeRunner` tracks a
`{completed, passed}` tally, shows a `LinearProgress` bar + "n of N" caption in the header, and after the
Nth submission replaces the "Next" button with a celebratory completion panel ("Session complete!",
"{passed} of {total} correct", "Practice again" which resets the session and loads a fresh exercise).
Added 4 i18n keys × 4 locales. Grading/rewards are untouched — this is pure session flow.
**Files touched:** `lib/exercises/session.ts` (new), `app/[locale]/exercises/[slug]/TypeRunner.tsx`,
`messages/{en,pt,tr,uk}.json` (+4 keys each), `__tests__/session.test.ts` (new, 7 tests).
**Feature flag:** `PRACTICE_SESSIONS` (exported const, default **on**). Off = the original infinite
"Next" loop (no progress bar, no completion screen).
**Risk / open questions:** touches the core runner but is UI-flow only (no money/data). Pure session
logic is unit-tested; the stateful component wiring is verified by typecheck/build + traced paths
(start, mid-session, completion, practice-again, flag-off; the single-exercise `ExerciseRunner` for
mistake retries is intentionally left session-less). No component test — there's no existing TypeRunner
test harness (would need to mock the server actions + transitions). The progress bar reads completion
(0 of 5 at the start); tying the length to `user.dailyGoal` instead of a constant is a possible
follow-up.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 51 files, +7; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 12 = candidate **T** (tap-to-pair matching) or another safe item.

---

## Iteration 12 — 2026-07-02 01:36 CEST — Streak celebration in the result panel
**Status:** IMPLEMENTED
**Inspired by:** Duolingo streak moments (queue item C2). Completes the streak arc (iters 5/6).
**What they do:** the moment your streak ticks up gets a little celebration, which is what makes a streak
feel worth protecting.
**What we had:** iters 5–6 award and correctly (idempotently) credit the streak/milestone bonus and fold
it into the reward badge total — but there was no explicit "your streak went up" moment in the UI.
**What I changed:** `ExerciseResult` takes `newStreak` and shows a "🔥 {days}-day streak!" line exactly
when the streak advanced this attempt (`streakBonus > 0`, i.e. the first pass of the day — which after
iter 5 shows even on a repeat exercise). Both runners pass `result.newStreak`. Added the `streakDays`
i18n key × 4 locales, and the first-ever `ExerciseResult` test (4 cases: shows on advance, hidden with no
bonus / no streak, correct-answer line still renders). No money path touched — purely presentational off
existing `SubmitResult` fields. (Chose this over a Recharts radar-trend overlay I couldn't visually
verify, and it avoids pulling `muenzen.ts`/Prisma into a client component.)
**Files touched:** `ExerciseResult.tsx`, `TypeRunner.tsx`, `ExerciseRunner.tsx`,
`messages/{en,pt,tr,uk}.json` (+1 key each), `__tests__/ExerciseResult.test.tsx` (new, 4 tests).
**Feature flag:** none — additive UI reading existing result fields; `git revert` removes it.
**Risk / open questions:** trivial/additive. A milestone-specific banner (distinguishing a 7/30/100-day
moment, which currently only shows as extra coins) is queued as **C3** — it needs the milestone value
threaded through `SubmitResult` from `actions.ts`.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 52 files, +4; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 13 = candidate **T** (tap-to-pair matching) or **R** (radar trend) / **L** (achievements).

---

## Iteration 13 — 2026-07-02 01:42 CEST — Weak-first selection (auto-resurface mistakes)
**Status:** IMPLEMENTED
**Inspired by:** Anki/Memrise "difficult words", Duolingo personalized practice (queue item H, Σ14).
Builds on iter 3's tiered selection.
**What they do:** the items you keep getting wrong come back to you automatically during practice — you
don't have to remember to go drill your mistakes.
**What we had:** iter 3 preferred *unseen* exercises but treated a failed item like any other unseen one;
mistakes only resurfaced if the learner manually visited `/exercises/mistakes`.
**What I changed:** extended the pure `buildSelectionWheres` with a **weak-first tier** (`id IN weakIds`)
ahead of the unseen and full tiers, gated by a new `PREFER_WEAK_EXERCISES` flag. `getRandomExerciseOfType`
now derives both sets from a single `groupBy(exerciseId, _max: score)` scoped to the type/level: passed =
best-ever ≥ 60, weak = attempted but best < 60 (never passed). Draw order: weak → unseen → full, so
mistakes surface first, then fresh material, then anything (never dead-ends). Passing a weak item moves it
to the passed set on the next draw, so the weak pool converges; `excludeId` prevents immediately repeating
the same one.
**Files touched:** `lib/exercises/selection.ts` (+weak tier/flag), `.../actions.ts` (groupBy split),
`.../__tests__/selection.test.ts` (+5 tests, 7→12).
**Feature flag:** `PREFER_WEAK_EXERCISES` (exported const in selection.ts, default **on**). Off = iter-3
behavior (unseen-preferred, no weak tier).
**Risk / open questions:** DB hot-path → adversarial review checking groupBy+relation-filter validity, the
passed/weak split (disjoint; a passed-then-failed item counts as passed, not weak — acceptable), tier
ordering / dead-end, and flags-off equivalence. `weakIds`/`passedIds` are also unbounded in principle
(all attempted exercises of a type) but bounded by the published pool size; fine.
**Verification:** typecheck ✓ (7/7, validates the groupBy) · test ✓ (web 52 files, selection 12; api 5) ·
build ✓ (60/60). Lint n/a.
**Next:** iter 14 = candidate **T** (tap-to-pair matching) or another safe item.

---

## Iteration 14 — 2026-07-02 01:50 CEST — Tap-to-pair matching board
**Status:** IMPLEMENTED
**Inspired by:** Duolingo tap-pairs / Memrise matching (queue item T, Σ14).
**What they do:** matching is a two-column tap board (tap a word, tap its pair) — fast and thumb-friendly
on mobile.
**What we had:** `MatchingRenderer` used a native `<select>` dropdown per German term — slow on mobile and
it leaks the option set.
**What I changed:** rewrote it as a tap-to-pair two-column board — tap a German term to select it, tap a
translation to assign it; translations stay 1:1 (reassigning moves it off the previous term), and tapping
an already-assigned translation unmatches it. Selected/matched states use theme colours (primary /
success). The stored answer shape (`{ pairs: { german: translation } }`) is **unchanged**, so
`gradeLocally` and the zod schema are untouched. The original dropdown implementation is retained behind
the flag. Added `matchingTapHint` × 4 locales and a component test asserting the interaction (assign, 1:1
reassignment, unmatch, disabled-until-selected).
**Files touched:** `renderers/Matching.tsx` (rewrite + retained fallback), `messages/{en,pt,tr,uk}.json`
(+1 key each), `renderers/__tests__/Matching.test.tsx` (new, 5 tests).
**Feature flag:** `MATCHING_TAP_TO_PAIR` (exported const, default **on**). Off = the original dropdowns.
**Risk / open questions:** isolated renderer, answer shape preserved → no grading risk; interaction logic
is unit-tested. Visual styling isn't verifiable in the headless harness (no browser), but behaviour is
correct and theme-token based. Drag-to-pair and matched-pair "lock/vanish" animations are possible
follow-ups.
**Verification:** typecheck ✓ (7/7) · test ✓ (web 53 files, +5; api 5) · build ✓ (60/60). Lint n/a.
**Next:** iter 15 = a safe pure item — candidate **S** (weekly recap) or **V** (dashboard groupBy perf).
