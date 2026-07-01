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
