# Sprint 05 — Beruf (the professional pivot)

Wortschatz stops being "another German practice app" and becomes a **career
tool**: the user tells us what job they do, and the app trains them with the
German of *that* job until they're ready to work in Germany.

> **Positioning in one line:** Duolingo teaches you German.
> Wortschatz gets you **job-ready**.

## Sprint goal

A new user can pick their **profession** and **target level** during setup,
land on a guided **track** ("Dein Weg") of profession-tagged exercises, and
see progress toward their goal — end-to-end, in all four locales, behind
feature flags, in one sprint.

## Product decisions (recorded 2026-07-04)

These were decided with Jonathan — don't silently revisit:

1. **Profession is a profile choice, content flows through tags.** No
   hardcoded verticals. The user picks their work on their profile;
   exercises reach them because they carry matching profession tags.
2. **Four professions seeded at launch:** healthcare/care work,
   IT/engineering, hospitality/gastronomy, construction/trades/logistics.
   Adding a fifth later = add a slug + i18n names + generate tagged
   content. **No migration.**
3. **The promise is twofold:** (a) job-ready German for *your* job —
   workplace scenarios and field vocabulary; (b) progress toward the
   level/exam they need (B1/B2). v1 tracks the level goal; a real
   exam-prep mode is deferred (see "After this sprint").
4. **Centerpiece = foundation + guided track.** Tag plumbing PLUS a
   track page with units and a daily plan. AI roleplay and mock exams
   are explicitly out of scope this sprint.
5. **One-sprint scope.** Ship for real; roadmap sketch at the end.

## Design overview

### Profession tags — reuse `Exercise.tags`, don't add an enum

`Exercise.tags String[] @default([])` already exists. Profession tags are
**config-validated slugs stored in that column with a `beruf:` prefix**
(e.g. `beruf:pflege`). Precedent: `User.nativeLanguage` is a free-form ISO
code precisely "so future locales don't require a migration" — professions
get the same treatment. A Prisma enum was considered and rejected: every
new profession would need a migration, and the whole point of decision 2
is that adding professions is a content operation, not a schema operation.

Canonical definition lives in `@wortschatz/config`:

```ts
// packages/config/src/professions.ts
export const PROFESSION_TAG_PREFIX = "beruf:";
export const UNIT_TAG_PREFIX = "unit:";
export const PROFESSION_SLUGS = [
  "pflege",   // healthcare / care work
  "it",       // IT / engineering
  "gastro",   // hospitality / gastronomy
  "handwerk", // construction / trades / logistics
] as const;
export type ProfessionSlug = (typeof PROFESSION_SLUGS)[number];
export const professionTag = (slug: ProfessionSlug) => `${PROFESSION_TAG_PREFIX}${slug}`;
export const isProfessionSlug = (v: unknown): v is ProfessionSlug => …;
// + unitTag, professionsFromTags, unitFromTags
```

Icons stay out of `@wortschatz/config` (it's consumed by apps/api too);
the glyph map lives in the web `ProfessionChip` component, following the
`ExerciseTypeIcon` pattern.

Display names live in `messages/*.json` under a new `professions` block
(same pattern as `exerciseTypes`) — **never** in the DB or in components.

### Schema (one migration, hand-written per repo convention)

- `User.profession String?` — a `ProfessionSlug`, validated in the save
  action against `isProfessionSlug`. Null = not chosen yet.
- `User.targetLevel CefrLevel?` — the goal level (the exam they need).
  Complements the existing `learningLevel` (where they are now).
- GIN index on `Exercise.tags` (`@@index([tags], type: Gin)`) — profession
  filtering queries `tags: { has: "beruf:pflege" }`.

No `Exercise` column changes. No new tables. Migration is forward-only
(repo convention), written to `packages/database/prisma/migrations/`,
**not applied** in environments without a live DB.

### Track curricula — static content files, not DB rows

Same pattern as `src/content/exercise-intros/`: one file per profession at
`apps/web/src/content/tracks/<slug>.ts`, aggregated into
`TRACKS: Record<ProfessionSlug, TrackDefinition>`.

```ts
export interface TrackUnit {
  slug: string;              // stable id, doubles as the generation topic key
  title: LocalizedText;      // { en, pt, tr, uk }
  level: CefrLevel;          // v1: all B1
  topic: string;             // German topic string fed to generation, e.g.
                             // "Pflege: Übergabe an die Nachtschicht"
  targetCount: number;       // exercises to pass for unit completion (v1: 6)
}
export interface TrackDefinition {
  profession: ProfessionSlug;
  units: TrackUnit[];        // v1: 5 units per profession
}
```

**Unit ↔ exercise mapping:** an exercise belongs to a unit when it carries
the profession tag **and** a `unit:<unit-slug>` tag (stamped at generation
time). Two tags, one column, no join table. Unit progress = distinct
exercises in that set the user has **passed** (existing `score ≥ 60` rule).

v1 curricula are 5 units × 4 professions, all at B1 (the job-readiness
sweet spot and the app's existing default level). Expanding to A2/B2 later
is pure content: more units in the same files.

### Profession context rides inside `topic` — zero prompt-seam changes

The generation pipeline already threads `topic` end-to-end: `runGeneration`
→ `{topic}` placeholder in the (DB-backed or file) prompt voice →
`GenerationSession.topic` audit. Workplace context is encoded **in the
topic string itself** ("Pflege: Medikamente verabreichen — Wortschatz und
Dialoge aus dem Stationsalltag"). This means:

- `promptParts` / locked `jsonShape`+`rules` untouched — the
  **prompt-parity test stays green with no baseline regeneration**.
- `BasePromptVersion` rows untouched.
- Tagging (`beruf:<slug>`, `unit:<slug>`) happens at **save time** in
  `runGeneration`, not in the model output — the model can't break it.

## Tasks

Flow per task: `@coder` → `@reviewer` → `@tester` → `@docs`, one semantic
commit each. All UI in 4 locales, both color modes, mobile-first (320px+),
theme tokens only.

### Task 1 — Foundation: config, schema, primitives

- `packages/config/src/professions.ts` as above; export from the barrel.
- Prisma: `User.profession`, `User.targetLevel`, GIN index on
  `Exercise.tags`; hand-written migration.
- `messages/*.json`: `professions.<slug>` names + one-line descriptions ×4.
- New UI primitive `ProfessionChip` in `src/components/ui/` (icon + name,
  built on MUI `Chip`; icon map lives in the component, colors from theme).
- **Accepts when:** typecheck/test/build green; `pickLocalized`-style
  lookups covered by tests; primitive rendered in both modes.

### Task 2 — Profile + setup flow

- Profile page gains a **"Meine Arbeit" (Career)** section: profession
  select, current level (existing `learningLevel`), target level.
  Extends the existing `saveProfile` action + validation (unknown slug →
  rejected).
- New `/[locale]/setup` page: 3 short steps — profession → current level →
  target level + daily goal (reuses `dailyGoal`). Shown via a dashboard
  redirect when `profession == null` **and** the `CAREER_TRACKS` flag is
  on; fully skippable ("I'm learning for myself" → stays null, app behaves
  exactly as today).
- **Accepts when:** a fresh user can complete setup on a 320px screen;
  skipping never traps the user; action tests cover valid/invalid slugs.

### Task 3 — Track curricula content

- `apps/web/src/content/tracks/{pflege,it,gastro,handwerk}.ts` + `index.ts`
  aggregation. 5 units each, B1, localized titles ×4, German `topic`
  strings written for generation quality (concrete workplace scenes:
  shift handover, standup meeting, customer complaint, safety briefing…).
- **Accepts when:** a content test pins every track to 5 units, unique
  slugs, all 4 locales present, valid levels.

### Task 4 — Profession-aware generation + seed script

- `runGeneration` request gains optional `professionSlug` +
  `unitSlug`: stamps `beruf:<slug>` / `unit:<slug>` into `Exercise.tags`
  on save; `topic` passed through as-is (see design). Admin generate UI
  gains a profession select (optional); CLI gains `--profession` /
  `--unit` flags.
- New CLI `pnpm gen:seed-tracks [--profession <slug>]`: walks the
  curricula, generates each unit's exercises (mix of types per unit —
  vocab-heavy: `FILL_IN_THE_BLANK`, `MATCHING`, `MULTIPLE_CHOICE`;
  scenario: `READING_COMPREHENSION`, `WORD_ORDER`; production:
  `FREE_WRITING` with AI review).
- **Seeding volume note:** 4 professions × 5 units × ~8 exercises ≈ 160
  generations. `AI_RATE_LIMITS.GENERATE_EXERCISE` is already 5000/day on
  current `main`, so the whole seed fits in a single run — no limit bump
  needed. (An earlier draft of this spec assumed the old 50/day limit.)
- **Accepts when:** generated rows carry both tags; `GenerationSession`
  audit rows unchanged in shape; prompt-parity test green **without**
  baseline regeneration; dry-run supported.

### Task 5 — Track engine (`src/lib/track/`)

- Pure helpers + batched queries, mirroring `src/lib/dashboard/`:
  - `resolveTrack(user)` → track definition or null.
  - `computeTrackProgress(units, passedByUnit)` → per-unit + overall
    progress (pure, fully tested).
  - `buildDailyPlan(user, track, attempts)` → today's `dailyGoal`-sized
    plan from the first incomplete unit: unpassed first, then weak-item
    resurfacing (reuse the overnight `PREFER_WEAK_EXERCISES` /
    `PREFER_UNSEEN_EXERCISES` logic — **this sprint builds on the
    `feature/overnight-competitive-loop` branch**, merge it first).
  - One `Promise.all` query batch; no ad-hoc Prisma on pages.
- Feature flag: `CAREER_TRACKS` (same flag mechanism as the overnight
  work). Off → nothing changes anywhere.
- **Accepts when:** 100% coverage on the pure helpers (house standard for
  `lib/` aggregations); plan is deterministic given fixed inputs.

### Task 6 — Track UI: "Dein Weg" page + dashboard card

- New `/[locale]/track` page:
  - Header: `ProfessionChip`, goal line ("Ziel: B2"), overall progress bar.
  - Unit list: title, per-unit progress (`3/6`), locked/next/done states —
    sequential unlock, current unit highlighted.
  - "Today" card: the daily plan with direct links into the existing
    exercise runner (attempts, Münzen, streaks, celebrations all flow
    through the existing submit path untouched).
  - Empty states: no profession → setup CTA; unit has no published
    exercises yet → friendly "coming soon" + fallback link to general
    practice at the user's level.
- Dashboard hero gains a compact track card (progress + "continue"
  button) — data funneled through `fetchDashboardChartData`'s existing
  parallel batch per the dashboard rule.
- **Accepts when:** works at 320/375/768/1024+; both modes; all four
  locales; zero hex outside `src/theme/`; component tests via
  `renderWithTheme`.

### Task 7 — Discovery: browse filter + next-draw preference

- Exercises browse: profession filter chips (multi-off, single-on) driven
  by the `tags has` query; exercise cards show `ProfessionChip`s.
- "Next exercise" draw prefers the user's profession tag behind a new
  `PREFER_PROFESSION_MATCH` flag (profession-tagged first, then general —
  never an empty result if no tagged content matches).
- **Accepts when:** filter is URL-state (shareable/back-button safe);
  draw preference covered by selection tests alongside the overnight ones.

### Task 8 — Docs + wrap-up

- Update `CLAUDE.md` (profession tags section, track engine, new flag
  list), `ROADMAP.md`, this file's results section; i18n audit; a11y pass
  (labels on selects/chips, focus order in setup).

## Non-goals (this sprint)

- AI interview/roleplay simulator, mock exams / readiness scoring,
  monetization, CV/cover-letter review, per-profession leaderboards.
- No `Track`/`Unit`/`Tag` DB tables — static content + tags carry v1.
- No new exercise types; no changes to grading, Münzen amounts, or the
  AI endpoint surface.

## Risks / open questions

- **Content quality per profession.** Generated Fach-German needs a human
  skim before publishing (exercises stay `DRAFT` → admin approves; that
  pipeline already exists). Healthcare terminology especially.
- **Tag-string coupling.** `beruf:`/`unit:` conventions are enforced only
  in code. Mitigation: single source (`professionTag()` helper +
  validators in `@wortschatz/config`), never inline strings.
- **`learningLevel` vs track level.** v1 tracks are B1-only; an A1 user
  gets B1 content. Acceptable for launch (the fallback link offers
  level-appropriate general practice); A2 units are the first content
  follow-up.

## After this sprint (roadmap sketch, in order)

1. **A2 + B2 units** for the two most-used professions (pure content).
2. **Exam-prep mode** — telc/Goethe-format mock sections + "you'd likely
   score…" readiness estimate, feeding off `targetLevel`.
3. **AI workplace roleplay** — interview/patient/customer chat on the
   Express AI tier (new endpoint, per-session cost controls).
4. **CV + cover-letter review** — a profession-aware preset on the
   existing `/ai/review-text` pipeline (cheapest big win).
5. Promote tags to a `Tag` table only when admins need to manage them in
   the UI.

---

## Results (sprint wrap-up, 2026-07-04)

All eight tasks shipped, one semantic commit each, every commit green on
typecheck + tests + build. Web test count 662 → **752**.

| Task | Commit | Delivered |
| --- | --- | --- |
| 1 | `feat(beruf): … profession foundation` | config slugs + helpers, `User.profession`/`targetLevel`, GIN index migration, i18n ×4, `ProfessionChip` |
| 2 | `feat(beruf): … profile career section + setup flow` | Career section on the profile, 3-step skippable `/setup`, seen-cookie redirect |
| 3 | `feat(beruf): … track curricula` | 4 professions × 5 B1 units, localized titles, German topics, content test |
| 4 | `feat(beruf): … profession-aware generation` | save-time `beruf:`/`unit:` stamping, CLI flags, admin select, `gen:seed-tracks` |
| 5 | `feat(beruf): … track engine` | progress + sequential unlock + daily plan (pure, 100% branch), batched queries |
| 6 | `feat(beruf): … Dein Weg page + dashboard card` | `/track` with plan + unit list + empty states, dashboard teaser card |
| 7 | `feat(beruf): … filter + profession-first draw` | `?beruf=` browse filter, `PREFER_PROFESSION_MATCH` draw tiers, detail-page chips |
| 8 | `docs(beruf): …` | CLAUDE.md section, ROADMAP note, this results section, i18n parity audit (482 keys ×4, identical) |

**Deviations from the spec (all recorded inline as they happened):**

- Icons moved out of `@wortschatz/config` into `ProfessionChip`
  (config is UI-agnostic and consumed by apps/api).
- The old 50/day seeding concern was moot — `GENERATE_EXERCISE` is
  5000/day on current main; the whole seed fits one run.
- "Exercise cards show ProfessionChips" landed on the exercise *detail*
  header — the browse page lists types, not individual exercises.
- The browse filter scopes the per-type availability counts; the
  per-type runner is scoped via the draw preference rather than a query
  param.

**Left deliberately undone (next sprints):** actually running
`gen:seed-tracks` against the live DB (needs `ANTHROPIC_API_KEY` + a
human skim of the drafts), applying the migration, a header nav link to
`/track`, A2/B2 units, exam-prep mode, AI roleplay, CV review preset.
