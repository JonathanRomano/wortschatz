# Sprint 02 — Tinte & Bernstein

A visual identity sprint. Wortschatz currently looks like a Vercel template:
generic Tailwind blue, system fonts, flat cards. This sprint gives it the
soul of a beautifully bound German textbook — warm paper background, ink-blue
typography, amber Münzen — without losing the modern, mobile-first feel.

## Sprint Goal

Make Wortschatz look and feel like a premium German learning product so that
a new user, in the first five seconds, can tell this is a deliberate piece
of craft and not a starter scaffold.

## Visual Identity Redefinition

### Personality

**Warm, scholarly, and confident.** Equal parts old-world bookshop and modern
productivity app. The two anchor words are **Tinte** (ink) and **Bernstein**
(amber) — a cool, serious primary for typography and structure, paired with
a warm accent for rewards, streaks, and moments of celebration.

### Color palette

Light mode (the primary mode — German textbooks are paper, not screens):

| Token | Hex | Use |
| --- | --- | --- |
| `--background` | `#fbf7ef` | Page background — warm off-white "Papier" |
| `--surface` | `#ffffff` | Card / panel surface |
| `--surface-alt` | `#f3ece0` | Subtle alt background (input bg, code) |
| `--foreground` | `#1c1917` | Body text (stone-900) |
| `--muted` | `#efe6d6` | Muted surface |
| `--muted-foreground` | `#78716c` | Secondary text (stone-500) |
| `--border` | `#e3d9c5` | Borders, dividers — warm sand |
| `--primary` | `#1e3a5f` | Ink-blue — buttons, links, headings |
| `--primary-foreground` | `#fbf7ef` | Text on primary |
| `--accent` | `#c2860a` | Amber — Münzen, streak flame |
| `--accent-foreground` | `#1c1917` | Text on accent |
| `--success` | `#047857` | Correct answers, positive states |
| `--danger` | `#b91c1c` | Errors |

Dark mode (preserved, derived from stone palette):

| Token | Hex |
| --- | --- |
| `--background` | `#0c0a09` (stone-950) |
| `--surface` | `#1c1917` (stone-900) |
| `--foreground` | `#fafaf9` |
| `--muted` | `#1c1917` |
| `--muted-foreground` | `#a8a29e` |
| `--border` | `#292524` |
| `--primary` | `#93c5fd` (sky-300, readable on dark) |
| `--accent` | `#fbbf24` (amber-400) |

### Typography

Loaded via `next/font/google` (no new dependency — built into Next.js):

- **Display (headings)**: **Fraunces** — variable serif. Bookish, distinctive,
  reads beautifully at large sizes. Used for h1/h2 and landing/dashboard heroes.
- **Body / UI**: **Inter** — clean, neutral, supports Latin + Cyrillic
  diacritics needed for `tr` and `uk` locales.
- Mono (CEFR tags, Münzen counts): system `ui-monospace`.

CSS variable: `--font-display` for Fraunces, `--font-sans` for Inter.

### Spacing & shape system

- Base radius scale: `rounded-md` (6px) for inputs/buttons, `rounded-xl`
  (12px) for cards, `rounded-full` for pills/badges.
- Soft shadows: a `shadow-sm` baseline on raised cards, no neon glows.
- Buttons get a `transition-all` with a subtle `hover:-translate-y-px` lift,
  not just `hover:opacity-90`.

### Components to redesign

- **Header.** Reduce visual weight on desktop by grouping Profile + Sign out
  under a single user pill. Add a small Münzen + streak chip.
- **MuenzenBadge.** New pill: amber dot + balance, used in header, dashboard,
  and review page.
- **StreakFlame.** Inline flame SVG + day count, amber accent.
- **LevelChip.** A1–C2 in a small uppercase mono pill so progression reads.
- **ExerciseTypeIcon.** 10 lightweight inline SVG glyphs — one per exercise
  type — used on the exercises browse page and dashboard.
- **Card.** Replace the ad-hoc `rounded-lg border border-border p-N` recipe
  with a single styled surface using the new tokens.
- **Buttons.** A shared variant set (`primary`, `secondary`, `ghost`) via a
  tiny `buttonClasses(variant)` helper — kept as a class util, not a
  component, so server components stay snappy.

---

## Tasks (ordered by priority)

### 🎨 Visual — must do first

- [x] Load Fraunces + Inter via `next/font/google`; wire CSS variables in the
  locale layout | Effort: S
- [x] Rewrite `src/app/globals.css` with the new token palette, dark variant,
  font variables, and refined base styles | Effort: S
- [x] Refresh Header — paper background, amber Münzen chip + streak when authed,
  Fraunces wordmark | Effort: M
- [x] Refresh Footer — softer copy, two-column layout on desktop | Effort: S
- [x] Build `src/components/ui/MuenzenBadge.tsx` + `StreakFlame.tsx` +
  `LevelChip.tsx` + `ExerciseTypeIcon.tsx` | Effort: M
- [x] Redesign landing page: hero with serif h1, amber-accented CTA, three
  feature cards using new surface + icons, a small "ten exercise types"
  proof strip | Effort: M
- [x] Redesign dashboard: hero greeting, Münzen + streak chips, progress
  cards using new surface, ranked progress bars with amber fill, recent
  activity list with level chips | Effort: M
- [x] Redesign exercises browse: card grid with type icons, accuracy meter,
  level filter row | Effort: M
- [x] Redesign exercise runner (both `/exercises/[type]` and
  `/exercises/[id]`): cleaner header with level chip, larger reading text,
  unified result card with score ring + reward callout | Effort: M
- [x] Refresh login/register/profile/admin/review pages with the new card +
  button language | Effort: M
- [x] Update the 10 exercise renderers to use new surfaces, spacing, and
  i18n'd helper labels | Effort: M

### ⚙️ Functionality

- [x] Add a CEFR level filter to `/exercises/[type]` pages — pick A1–C2 (or
  All), persisted in the URL query, used by `fetchNextExerciseOfType` | Effort: M
- [x] Localize the not-found page | Effort: S
- [x] i18n the hardcoded English strings inside renderers (`Hint:`, `Original`,
  `Prompt`, `Tense`, `Undo`, `Reset`, `Build the sentence by tapping…`,
  `— pick a translation —`, etc.) — add a new `renderers` block to all 4
  message files | Effort: M
- [x] Replace plain numeric Münzen / streak displays with the new badge
  components throughout | Effort: S

### 🐛 Bug Fixes

- [x] Landing page's third feature card has a fragile `sm:col-span-2 lg:col-span-1`
  hack — fix layout properly | Effort: S
- [x] `ReviewForm` `Balance: … · Cost: …` line is hardcoded English; thread
  it through i18n | Effort: S
- [x] `getRandomExerciseOfType` falls back to "any exercise of the type"
  when a level filter returns zero — confusing because the user picked a
  level deliberately. Return null instead and show an empty state with a
  "clear filter" link | Effort: S

### 📋 Technical Debt

- [x] Pull the result-card UI out of `ExerciseRunner` and `TypeRunner` into
  a shared `<ExerciseResult>` component | Effort: M
- [x] Drop the redundant `as { role?: string }` casts now that `next-auth.d.ts`
  declares the type | Effort: S
- [x] Update `CLAUDE.md` with the new design system rules and remove anything
  that's been generalized into the components | Effort: S

---

## Out of Scope (save for Sprint 03)

- **Audio for listening exercises.** Needs TTS provider + asset hosting
  decision. Tracked in `ROADMAP.md`.
- **CEFR level on the User model.** Schema changes are forbidden in this
  sprint; reviewer continues to hardcode B1.
- **Real Anthropic calls in `lib/ai.ts`.** Visual sprint doesn't need it.
- **Pagination & search on the admin page.** Out of scope.
- **Toast / notification system.** Inline feedback is sufficient for now.
- **Per-user time zones for streaks.** Tracked in `ROADMAP.md`.

## Definition of Done

- `npm run build` passes
- `npx tsc --noEmit` passes
- All checklist tasks above are checked
- `CLAUDE.md` reflects the new visual identity rules
- `SPRINT_02.md` (this file) has a "Results" section appended with
  what shipped vs. what slipped

---

## Results

**Status:** All planned tasks shipped. `npm run build` passes (39 static
pages generated, zero TypeScript errors). `npx tsc --noEmit` passes.

### What shipped

**Visual identity — established.** A complete "Tinte & Bernstein" design
system landed:

- `src/app/globals.css` rewritten with the new token palette (paper
  background, ink-blue primary, amber accent) plus a soft radial paper-grain
  effect behind the page.
- Fraunces (display serif) + Inter (body) loaded via `next/font/google` in
  `src/app/[locale]/layout.tsx` and exposed as `--font-display` /
  `--font-sans` CSS variables — no new npm dependency.
- Six new shared primitives in `src/components/ui/`: `MuenzenBadge`,
  `StreakFlame`, `LevelChip`, `ExerciseTypeIcon` (10 hand-tuned inline
  glyphs), `Card`, and a `buttonClasses(variant, size)` utility.
- New `src/components/exercises/ExerciseResult.tsx` — shared result panel
  with a score ring SVG, used by both the random-of-type runner and the
  single-exercise retry runner.

**Pages — all touched.** Landing, dashboard, exercises browse,
`[slug]` runner, mistakes, login, register, profile, review, admin, and
the localized 404 all use the new tokens, Fraunces headings, Card
primitive, and `buttonClasses` helper. Landing now leads with a styled
"sample exercise" card peek next to the hero and ends with a 10-icon
proof strip of exercise types.

**Functionality — added.**

- CEFR **level filter** on `/exercises/[type]` via a new `LevelFilter`
  client component. The current level is persisted in the URL query
  (`?level=A2`) and threaded through `fetchNextExerciseOfType` so the
  "Next exercise" button respects it.
- Fixed `getRandomExerciseOfType` so a level filter is never silently
  ignored when the bucket is empty — instead the page renders a clear
  "no exercises" state with a "show all levels" reset link.
- Replaced raw Münzen / streak numbers with `MuenzenBadge` and
  `StreakFlame` chips in the Header (desktop and mobile rails), dashboard,
  review page, and admin user table.

**i18n — expanded.** Added two new blocks (`renderers` + `filters`) to all
four message files (`en.json`, `pt.json`, `tr.json`, `uk.json`) plus a
`notFound` block and a `home` key on `common`. All renderer labels
(`Hint`, `Original`, `Prompt`, `Undo`, `Reset`, the matching dropdown
placeholder, listening transcript fallback, free-writing word count, etc.)
now go through `useTranslations("renderers")` — verified by a final grep.
The Review page's `Balance: … · Cost: …` line is now `review.balanceLine`.

**Technical debt — cleaned.**

- Shared `ExerciseResult` removes the duplicate result UI that used to
  live in both `ExerciseRunner.tsx` and `TypeRunner.tsx`.
- Dropped the redundant `as { role?: string }` casts in
  `src/auth.config.ts` now that `src/types/next-auth.d.ts` declares both
  the `User.role` and `Session.user.role` augmentations.
- The fragile `sm:col-span-2 lg:col-span-1` hack on the landing feature
  grid is gone — three cards in a clean `sm:grid-cols-2 lg:grid-cols-3`.

### What slipped

Nothing from the planned scope.

### Notes for the next sprint

- This workspace is not initialized as a git repository (the sprint plan's
  per-task `git commit` step was therefore skipped). `git init` + an
  initial commit would be a one-line addition before Sprint 03.
- Listening exercises still lean on the transcript fallback. The new
  styling makes that fallback look intentional, but real audio + the
  `audioUrl`-required schema change is still on `ROADMAP.md`.
- No CEFR level is stored on the User; the review page continues to
  hardcode `B1`. Adding a column requires a schema change and was
  deliberately out of scope.
- `npm run build` reports one webpack warning: *"Serializing big strings
  (128kiB) impacts deserialization performance"*. Cosmetic and unrelated
  to anything this sprint touched.

---

# Sprint 02 — Revision (MUI Migration)

> The original Tinte & Bernstein visual sprint shipped above. This revision
> migrates the visual layer to Material UI v9 with a centralized Palette
> System while preserving the same color identity (ink-blue primary, amber
> accent, warm-paper background). Tinte & Bernstein lives on as the theme's
> palette values; only the runtime delivery changed.

## Decision: MUI + Tailwind coexistence

**MUI owns** every component with state / variant / color / surface
semantics: Button, IconButton, Card/Paper, Chip, Avatar, TextField,
Dialog, Drawer, AppBar, Toolbar, Menu, Tooltip, Tabs, Typography. All
color, typography, radius, shadow, and shape values flow through the
theme in `src/theme/`.

**Tailwind owns** layout utilities only — `flex`, `grid`, `gap-*`,
`mx-auto`, `max-w-*`, `px-*`, `py-*`, `space-*`, `min-h-*`/`min-w-*`,
and responsive prefixes. Complex layouts can also use MUI `<Box sx={{}}>`
or `<Stack>`.

**Banned anywhere outside `src/theme/`**: hex colors, `bg-*`, `text-*`
(color variants — `text-center`/`text-left` alignment is fine),
`border-*`, `rounded-*`, `shadow-*`, `font-display`/`font-sans`/
`font-mono`.

**Routing across the RSC boundary**: server pages use `<ButtonLink>` /
`<InlineLink>` from `src/components/ui/` — small client shims that wrap
MUI's polymorphic `component={Link}` with the next-intl typed `Link`.

Rationale: MUI owns theming so color, typography, and shape never leak
outside `src/theme/`; Tailwind is retained for layout-only utility
classes because rewriting flex/grid wrappers as `<Stack>` / `<Box>`
would have inflated the diff without value.

## What shipped (Task 1)

- `src/theme/` — Palette System with light + dark variants:
  - `palette.ts` (both palettes, with the augmented custom keys)
  - `typography.ts` (Fraunces + Inter via CSS vars)
  - `shape.ts`, `shadows.ts`, `augmentation.ts`
  - `Provider.tsx` (wraps `AppRouterCacheProvider` + `ThemeProvider` +
    `CssBaseline` + paper-grain `GlobalStyles`)
  - `index.ts` (`createAppTheme(mode)` with all MUI component overrides)
- Full repo refactor: 6 UI primitives, 4 layout components, 20 routed
  pages, and 10 exercise renderers re-skinned on MUI.
- 3 small `"use client"` shims to bridge MUI's polymorphic
  `component={Link}` across the RSC boundary: `ButtonLink`, `InlineLink`,
  `HeaderLinks`.
- `vitest` test runner set up from scratch (jsdom +
  `@testing-library/react` + coverage v8); helper `renderWithTheme` in
  `src/test/`.
- 80 tests across 11 files; 100% coverage on `src/theme/**`.
- `npm run build` passes, `npm run typecheck` passes, `npm test` green.

## Quality gates (all passing)

- Zero hex outside `src/theme/`.
- Zero color-bearing Tailwind classes anywhere.
- Zero new `any`.
- All `<IconButton>` have `aria-label`; touch targets ≥ 44px via theme
  defaults.
- Accessibility: 7 `<TextField>`s had aria-labels added during the
  `@reviewer` pass.

## Notes for next tasks

- Light mode is hardcoded in `Provider.tsx` for Task 1. **Task 2** adds
  the toggle, persistence (`localStorage` + `prefers-color-scheme`), and
  the header switch — the wiring is already a single `mode` prop.
- Tasks 3 (AI cache / rate-limit), 4 (Münzen extension), 5 (charts),
  6 (profile), 7 (comments), 8 (intros) are still ahead.
- `ButtonLink.tsx` and `InlineLink.tsx` shipped with 0% test coverage —
  small enough to be low-risk, but worth a follow-up test in the next
  sprint.
- `ExerciseTypeIcon.tsx` branch coverage sits at 82.6% — only the
  `primary` color mapping is exercised; the named-palette branches are
  uncovered.
- React 19 RC + MUI v9 required `--legacy-peer-deps` on install.
  Document in the repo README if friction returns.

## Task 2 — Dark mode (shipped)

- New: `useColorMode` hook, `ColorModeContext`, `ColorModeToggle`. Three-state cycle (light/dark/system).
- `localStorage` key: `wortschatz:color-mode`.
- Anti-FOUC: blocking inline script in the root layout writes `<html data-color-mode>` and `color-scheme` before hydration; the Provider seeds `systemMode` from that DOM attribute so dark-mode users never see a light flash even during React hydration.
- i18n: new `nav.colorMode.{toggle,light,dark,system}` keys across en/pt/tr/uk.
- Tests added: 18 new (98 total). Coverage on Task-2 files: hook 100 %, context 100 %, toggle 100 %, Provider 87.7 % statements.

### Bugs fixed during review/test
1. Mount effect was unconditionally overwriting `defaultMode`/legacy `mode` props with `readStoredMode()`. Fixed by only applying the stored value when one is actually present.
2. Same mount effect was clobbering the DOM-seeded `systemMode` even when `matchMedia` was unavailable. Fixed by leaving `systemMode` alone when the live system query has nothing to report.

## Task 4 — Münzen transactions (shipped)

Extends the Münzen system with richer transaction reasons, an admin
adjustment surface, and a paginated user-facing history view.

- **Enum extension.** `MuenzenReason` in `prisma/schema.prisma` now
  includes `PERFECT_SCORE_BONUS` and `ADMIN_ADJUSTMENT`. The legacy
  `BONUS` value is retained so existing rows keep validating.
  `prisma/migrations/20260515120000_muenzen_reason_extension/migration.sql`
  uses idempotent `ALTER TYPE ... ADD VALUE IF NOT EXISTS` for both new
  values. `prisma/migrations/migration_lock.toml` was added with
  `provider = "postgresql"`.
- **`computeReward` shape change.** `src/lib/muenzen.ts`'s `computeReward`
  now returns `{ base, perfect, streakBonus }` instead of a single
  number. `submitExerciseAttempt` in `src/lib/exercises/actions.ts`
  consumes the split and writes **three separate transactions**
  (`EXERCISE_COMPLETE`, `PERFECT_SCORE_BONUS`, `DAILY_STREAK`) on a
  100-score first-pass that's also the first of the day — total still
  35 Münzen, but now itemized.
- **`adminAdjust` helper.** New `adminAdjust(userId, delta, note?)` in
  `src/lib/muenzen.ts`: atomic, balance-checked, optional note stored in
  `refId`. Zero and non-integer deltas are rejected.
- **Admin UI row.** `src/app/[locale]/admin/AdminAdjustForm.tsx` +
  `actions.ts` + the admin page expose a delta + note + apply control
  per user, with validation caps (±100 000 delta, 280-char note).
- **`/profile/historico`.** New page at
  `src/app/[locale]/profile/historico/page.tsx` with pagination
  (20/page), a single-value type filter, and `Intl.DateTimeFormat(locale)`
  date rendering. The profile page (`profile/page.tsx`) links to it.
- **Backfill script.** `scripts/seed-muenzen-history.ts` (npm script
  `db:seed-muenzen-history`) writes a one-shot `ADMIN_ADJUSTMENT` row
  equal to `user.muenzen` for users with `> 0` balance and no
  transactions, so historical balances get an audit trail.
- **i18n.** `messages/{en,pt,tr,uk}.json` gained `profile.history.*`,
  `profile.historyLink`, and `admin.adjust.*` blocks.
- **Live DB caveat.** No live Postgres in this environment — the
  migration SQL was written by hand under `prisma/migrations/` and will
  be picked up on the next `prisma migrate dev/deploy`.
- **Tests.** 49 new tests landed; 147 total. `src/lib/muenzen.ts` is at
  100 % coverage.

## Task 5 — Dashboard charts (shipped)

Four charts now live on the dashboard, fed by a single parallel data
fetch and pure aggregation helpers.

### Library decision: Recharts 3.8.1

Recharts plays nicely with MUI's emotion-based theming because it
exposes `stroke`/`fill` as plain props, so colors come from `useTheme()`
cleanly. Tremor was the alternative but is Tailwind-first and would have
undermined the MUI-owns-theming coexistence rule established in Task 1.
Recharts is also significantly smaller and lazy-loadable.

### What landed

- **Münzen evolution area chart** — 30-day running balance with
  amber fill, clamped at ≥ 0.
- **90-day SVG activity heatmap** — hand-rolled (no extra dep), one
  cell per UTC day, ICU-plural tooltip ("1 exercise" / "N exercises").
- **10-axis proficiency radar** — last 10 graded attempts bucketed by
  exercise type, Recharts `RadarChart`.
- **Daily-goal ring** — MUI `CircularProgress` stacked (track + ring)
  with the daily count vs. `DAILY_GOAL_DEFAULT` (5).

Dashboard layout: row 1 = Münzen series + daily-goal ring (md+ side
by side), row 2 = heatmap full-width, row 3 = radar + by-level card
(md+ side by side); full type breakdown and recent activity below.

### Code shape

- `src/lib/dashboard/constants.ts` — `DAILY_GOAL_DEFAULT = 5`,
  `HEATMAP_DAYS = 90`, `MUENZEN_SERIES_DAYS = 30`, `RADAR_LAST_N = 10`,
  `RADAR_FETCH_LIMIT = 200`.
- `src/lib/dashboard/aggregations.ts` — `buildMuenzenSeries`,
  `buildHeatmap`, `buildRadar`, `countToday`, `toUtcDayKey`. All UTC-day
  bucketing. `buildMuenzenSeries` clamps the running balance at ≥ 0.
  100 % test coverage.
- `src/lib/dashboard/queries.ts` — `fetchDashboardChartData(userId, now)`
  runs five DB calls in **one `Promise.all`**; the page hands the result
  straight to the pure aggregators.
- `src/components/dashboard/` — four chart components plus a `ChartCard`
  wrapper.

### SSR strategy

Recharts charts are split into a base `*Chart.tsx` plus a
`*.client.tsx` `next/dynamic({ ssr: false })` wrapper, because
`ResponsiveContainer` touches `ResizeObserver` on import. The SVG
heatmap and `CircularProgress` ring render server-safe and do not need
the wrapper.

### Theming

Every color flows through `theme.palette`: `secondary.main` for amber
(Münzen series, heatmap activity), `primary.main` for ink-blue (radar
stroke), `surfaceAlt.main` for the heatmap zero bucket. Zero hex in
`src/components/dashboard/` or `src/lib/dashboard/`. Light and dark mode
both work without component-level branching.

### Notes

- Daily goal is hardcoded to 5 via `DAILY_GOAL_DEFAULT`. **Task 6** will
  swap it for `User.dailyGoal` once the column lands.
- i18n: new `dashboard.charts.*` block across `en/pt/tr/uk`, including
  an ICU plural for `activity.tooltip`.
- **32 new tests; 179 total.** 100 % coverage on
  `src/lib/dashboard/aggregations.ts`.

## Task 3 — AI activation + cache + rate limiting (shipped)

`src/lib/ai.ts` now makes real Claude calls via `@anthropic-ai/sdk`
when `ANTHROPIC_API_KEY` is present, with response caching, per-user
rate limiting, and usage logging. Deterministic stubs are preserved
verbatim and used when the env var is missing — no behavior change for
local dev without a key.

### What landed

- **Real Anthropic calls.** `generateExercise`, `evaluateAnswer`, and
  `reviewText` in `src/lib/ai.ts` now dispatch to the SDK when
  `AI_CONFIGURED` is true. The public function signatures kept their
  shape and gained an optional trailing `userId?: string` argument.
- **Three new tables** in `prisma/schema.prisma`: `AiCache`,
  `AiRateLimit`, `AiUsage`. Hand-written migration at
  `prisma/migrations/20260515130000_ai_tables/migration.sql` — **not
  yet applied** (no live DB in this environment); it will run on the
  next `prisma migrate dev/deploy`.
- **Cache.** `src/lib/ai-cache.ts` — `get(key)` / `set(args)`, SHA-256
  over `endpoint:model:canonicalPrompt`. Expired rows are best-effort
  deleted on read; `set` swallows errors so a doomed cache write never
  breaks the caller; `ttlMs === 0` skips the write entirely.
- **Rate limits.** `src/lib/ai-rate-limit.ts` —
  `checkAndIncrement(userId, endpoint)` runs atomically inside
  `prisma.$transaction` over a rolling 24h window and throws
  `AiRateLimitedError` when the daily ceiling is hit. Cache hits do not
  count.
- **Limits + pricing config.** `src/config/limits.ts` —
  `AI_RATE_LIMITS` (`REVIEW_TEXT: 20/day`,
  `EVALUATE_ANSWER: 200/day`, `GENERATE_EXERCISE: 50/day`),
  `AI_CACHE_TTL_MS` (`REVIEW_TEXT: 0` never cached;
  `EVALUATE_ANSWER: 1h`; `GENERATE_EXERCISE: 30 days`),
  `AI_MODEL_PRICING_MICROCENTS_PER_TOKEN`, and
  `estimateCostMicrocents(model, in, out)`. Integer microcents
  (1 cent = 100 µ¢; USD × 100 000) keep `AiUsage.costMicrocents` away
  from float drift.
- **Usage logging.** Every AI call writes an `AiUsage` row with
  `cacheHit` flag and `costMicrocents` estimate, regardless of whether
  the user is anonymous (`userId: null`).
- **Rate-limit surfacing.**
  - `src/lib/review/actions.ts` returns
    `{ ok: false, error: 'rate_limited' }` on `AiRateLimitedError`;
    `ReviewForm` renders the new `review.rateLimited` localized message
    in all four locales.
  - `src/lib/exercises/actions.ts` **soft-fails**: if `evaluateAnswer`
    rate-limits, the local rule-based grade is used and the attempt is
    still recorded — submission never blocks on AI availability.
- **Generation script.** `scripts/generate-exercises.ts` opens with an
  `AI mode: real|stub (model: <model>)` log line and passes
  `userId: undefined` so admin runs skip per-user rate limits while
  still logging usage with `userId: null`.

### Important: prompt invalidation

The cache key includes the canonical prompt body, so a prompt change
yields a new key automatically — but **old rows for the old prompt
remain in `AiCache` until their TTL expires**. If you change a prompt
in `ai.ts` and need fresh results immediately, either bump the model
name (forces a new key) or run a one-shot
`DELETE FROM "AiCache" WHERE endpoint = '<endpoint>'`.

### Tests

47 new tests; **226 total**. 100 % coverage on `src/config/limits.ts`,
`src/lib/ai-cache.ts`, and `src/lib/ai-rate-limit.ts`; 96 %+ on
`src/lib/ai.ts`.
