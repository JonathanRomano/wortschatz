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
