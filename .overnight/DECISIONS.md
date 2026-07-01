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
