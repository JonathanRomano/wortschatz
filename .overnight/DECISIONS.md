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
