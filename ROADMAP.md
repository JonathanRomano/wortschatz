# Wortschatz — Roadmap

This document captures everything that was scaffolded vs. left as TODO in the
foundational pass. Each item lists exact file paths and what the next session
needs to do.

> **Sprint 02 completed** — all 8 tasks shipped across roughly 8 `feat:`
> commits + 1 initial `chore:` (git init). **427 tests across 33 files,
> all green**; `npm run build` and `npx tsc --noEmit` both clean. See
> `SPRINT_02.md` for the per-task breakdown and the "Sprint 02 — Final
> results" wrap-up.

---

## Sprint 02 (revised) — complete

The MUI + Palette System migration replaces the original Tailwind-only
visual sprint. Eight tasks total; the multi-agent flow is
`@coder` → `@reviewer` → `@tester` → `@docs` with one semantic commit
per task.

- [x] **Task 1** — MUI v9 migration + centralized Palette System
  (`src/theme/`), full UI re-skin, `vitest` setup, 80 tests, 100%
  coverage on `src/theme/**`.
- [x] **Task 2** — Dark mode toggle: `useColorMode` hook +
  `ColorModeContext` + `ColorModeToggle` (three-state light/dark/system
  cycle), `localStorage` persistence under `wortschatz:color-mode`, a
  blocking inline script in the root layout for anti-FOUC, header +
  mobile-menu toggle, and `nav.colorMode.*` i18n in all four locales.
  18 new tests (98 total).
- [x] **Task 3** — Real Anthropic API calls in `src/lib/ai.ts` via
  `@anthropic-ai/sdk` when `ANTHROPIC_API_KEY` is set (stubs preserved
  when missing). Three new tables (`AiCache`, `AiRateLimit`, `AiUsage`)
  with hand-written migration SQL at
  `prisma/migrations/20260515130000_ai_tables/` — **not yet applied**
  (no live DB). Cache (SHA-256 keyed, per-endpoint TTL — `REVIEW_TEXT: 0`,
  `EVALUATE_ANSWER: 1h`, `GENERATE_EXERCISE: 30d`), per-user rate
  limits (`20/200/50` per day, rolling 24h window via
  `prisma.$transaction`), and `AiUsage` rows with `cacheHit` flag +
  integer-microcents cost estimate. Review surfaces a 429 via
  `review.rateLimited`; exercise submit soft-falls-back to the local
  grade when `evaluateAnswer` is throttled. `scripts/generate-exercises.ts`
  logs `AI mode: real|stub`. **47 new tests (226 total)**; 100 %
  coverage on `src/config/limits.ts`, `src/lib/ai-cache.ts`,
  `src/lib/ai-rate-limit.ts`; 96 %+ on `src/lib/ai.ts`. **Prompt
  invalidation note:** the cache key includes the prompt body, so old
  rows for an old prompt linger until their TTL expires — bump the
  model name or `DELETE FROM "AiCache"` if you need an immediate
  refresh.
- [x] **Task 4** — Münzen extension: `MuenzenReason` gained
  `PERFECT_SCORE_BONUS` + `ADMIN_ADJUSTMENT` (legacy `BONUS` retained);
  `computeReward` now returns `{ base, perfect, streakBonus }` and
  `submitExerciseAttempt` writes three itemized transactions;
  `adminAdjust(userId, delta, note?)` helper + admin adjust form (caps
  ±100 000 delta, 280-char note); paginated `/profile/historico` page
  with single-value type filter and localized dates; one-shot
  `db:seed-muenzen-history` backfill. 49 new tests (147 total); 100 %
  coverage on `src/lib/muenzen.ts`.

  **Notes for Task 4**
  - The migration SQL (`prisma/migrations/20260515120000_muenzen_reason_extension/`)
    is **not yet applied** — no live DB in this environment. It will
    apply on the next `prisma migrate dev/deploy`.
  - `/profile/historico` uses the Portuguese-flavored path for *all*
    locales, not per-locale variants. The brief specified PT-flavored
    naming but didn't address per-locale aliases — flag for a revisit
    if we want `/profile/history` on `en` etc.
  - A `description` column on `MuenzenTransaction` was discussed but
    skipped; admin notes are overloaded onto `refId` instead.
- [x] **Task 5** — Dashboard charts: Münzen 30-day area, 90-day SVG
  activity heatmap, 10-axis proficiency radar, and a daily-goal
  `CircularProgress` ring, all fed by a single `Promise.all` in
  `fetchDashboardChartData` with pure aggregators alongside.
  **Recharts 3.8.1** added as a dep (lazy-loaded via
  `next/dynamic({ ssr: false })`). 32 new tests (179 total); 100 %
  coverage on `src/lib/dashboard/aggregations.ts`.
- [x] **Task 6** — Profile expansion + avatar upload: five new `User`
  columns (`bio`, `nativeLanguage`, `learningLevel`, `dailyGoal`,
  `avatarUrl`) with a hand-written migration at
  `prisma/migrations/20260515140000_user_profile_fields/` (**not yet
  applied** — no live DB). Avatar pipeline in
  `src/lib/profile/avatar.ts` (2 MB cap, mime allowlist + sharp
  re-decode spoof defense, rotate → 512×512 cover → WebP quality 88,
  random 6-byte hex filename) behind `POST/DELETE /api/profile/avatar`;
  path-traversal hardened during review. Local FS storage at
  `public/uploads/avatars/` — **swap to Vercel Blob/S3 before deploying
  on an ephemeral filesystem** (TODO in the route handler). Profile
  page redesigned around MUI primitives (Avatar, bio with char counter,
  native-language + CEFR Selects, daily-goal Slider, Snackbar feedback)
  plus a stats card. Daily-goal wiring: dashboard reads
  `user.dailyGoal ?? DAILY_GOAL_DEFAULT` and `saveProfile` revalidates
  `/dashboard`. Review page now reads `user.learningLevel ?? 'B1'`
  instead of hardcoding `'B1'`. Session augmented with `avatarUrl`
  (JWT + session callbacks). 47 new tests (273 total); 100 % coverage
  on `src/lib/profile/avatar.ts` and the profile `actions.ts`.
- [x] **Task 7** — Exercise comments / discussion: two new tables
  (`ExerciseComment` + `CommentLike`) with hand-written migration at
  `prisma/migrations/20260515160000_exercise_comments/` (**not yet
  applied** — no live DB). Soft delete via `deletedAt`; CASCADE FKs on
  both tables; composite unique `(commentId, userId)` on `CommentLike`.
  Moderation knobs in `src/config/moderation.ts`
  (`COMMENT_WORD_BLOCKLIST` empty today, `COMMENT_MAX_LENGTH = 500`,
  `COMMENT_RATE_LIMIT = 5/min`, normalized `findBlockedWord`).
  `src/lib/comments/` library: `serializeComment` strips content + user
  on soft-deleted rows, `loadComments` / `loadComment` filter
  `deletedAt: null`. Five REST endpoints —
  `GET /api/exercises/[id]/comments` (public, ordered by like count
  desc + `createdAt` desc), `POST` (auth · 401/400/429/201),
  `PATCH /api/comments/[id]` (auth + **author only**, no admin edit ·
  401/403/404/400/200), `DELETE` (auth + author OR admin, soft delete ·
  401/403/404/200), `POST /api/comments/[id]/like`
  (`prisma.$transaction` + P2002-catch, returns `{ liked, likeCount }`).
  UI in `src/components/comments/` — `CommentsSection` (collapsed MUI
  Accordion below the runner), `CommentList`, `CommentItem`,
  `CommentComposer`. New `comments` i18n block in all four locales with
  ICU-plural `count`. 79 new tests (**427 total**); 100 % coverage on
  `serialize.ts`, `queries.ts`, and the `PATCH` / `DELETE` route.
- [x] **Task 8** — Per-exercise-type intros: new `UserPreference` table
  (`userId`, `key: ExerciseType`, `skipIntro`, unique on `(userId, key)`,
  FK to `User` with `ON DELETE CASCADE`) with hand-written migration at
  `prisma/migrations/20260515150000_user_preferences/` (**not yet applied**
  — no live DB). Static intro content per type × 4 locales in
  `src/content/exercise-intros/` (one file per type, aggregated into
  `EXERCISE_INTROS`, each entry `whatItAsks` / `howToInteract` /
  `example.prompt` / `example.solvedExplanation` as `LocalizedText`).
  `setSkipIntro` / `getSkipIntro` server action in
  `src/lib/preferences/actions.ts`. `IntroScreen` + `IntroModal`
  components: the type runner renders the intro inline on first visit;
  the single-exercise page exposes a help-icon button in its header; the
  `?` keyboard shortcut (Shift+/, suppressed in form fields) opens the
  intro from either context. New `exerciseIntros.*` i18n block across
  all four locales. Heading-hierarchy fix applied during review
  (h1→h2, h2→h3). 75 new tests (348 total); 100 % coverage on
  `src/lib/preferences/actions.ts`.

### New dependencies

- **Recharts 3.8.1** (Task 5) — used for the Münzen area chart and the
  proficiency radar; lazy-loaded via `next/dynamic({ ssr: false })`
  from `.client.tsx` wrappers because `ResponsiveContainer` touches
  `ResizeObserver`. The 90-day heatmap is hand-rolled SVG (no extra
  dep). The original sprint's "no new deps" rule is officially relaxed —
  any further additions should still be justified in the task brief.

### Discovered debt

- `ButtonLink` and `InlineLink` shipped with 0% test coverage — small
  surface area, but worth a follow-up.
- `ExerciseTypeIcon` branch coverage at 82.6%: only the `primary` color
  mapping is exercised, the named-palette branches are uncovered.
- React 19 RC + MUI v9 required `--legacy-peer-deps` on install. Friction
  to document in the repo README if it recurs.
- **Avatar storage (Task 6)** is local-FS only. Migrate to Vercel Blob
  or S3 before deploying on an ephemeral filesystem. The swap site is
  marked with a `TODO` in `src/app/api/profile/avatar/route.ts`.
- **JWT not refreshed after avatar upload (Task 6).** `saveProfile`
  calls `revalidatePath('/dashboard')` so the dashboard picks up the
  new image, but the Header chip — which reads `session.user.avatarUrl`
  from the JWT — only updates at the next sign-in.
- **`UserPreference.key` overloads `ExerciseType` (Task 8).** Intros are
  currently the only preference type, so the `key` column reuses the
  `ExerciseType` enum. When a second preference kind arrives, promote
  `key` to a dedicated `Pref` enum rather than further overloading
  `ExerciseType`.
- **Like-toggle P2002 branch coverage gap (Task 7).** The
  `POST /api/comments/[id]/like` handler wraps the toggle in
  `prisma.$transaction` and catches Prisma's `P2002` on the
  `(commentId, userId)` unique to make double-likes idempotent. The
  success path and the "already liked → unlike" path are tested; the
  simulated `P2002` race catch isn't covered by a direct test.
- **Comments rate-limit count race (Task 7).** The 5-per-60 s check is
  a separate `count()` immediately before the insert, not wrapped in
  the same transaction as the insert. Two concurrent submits from the
  same user can both observe `count = 5` and both succeed. Acceptable
  for v1 — promote to an atomic check + insert if abuse appears.
- **Comments `editedAt` always bumps (Task 7).** `PATCH /api/comments/[id]`
  sets `editedAt = now()` on every successful update, even when the
  posted `content` is identical to the stored value. A no-op edit
  therefore still shows an "edited" indicator in the UI; cheap to
  short-circuit if it matters.

---

## What's done

- Next.js 15 (App Router) + TypeScript strict + Tailwind CSS v4 project shell
- PostgreSQL 16 via `docker-compose.yml` (no live DB started — Docker isn't
  installed in this environment)
- Prisma schema with all required models: `User`, `Exercise`, `UserExercise`,
  `MuenzenTransaction`, `AIReviewRequest` + NextAuth tables
- NextAuth.js v5 with Credentials + Google OAuth, Prisma adapter, JWT sessions
- next-intl with PT/EN/TR/UK locales and full UI translations
- All 10 exercise types: per-type Zod schemas, renderer components, and a
  registry-based `<ExerciseRenderer>`
- Local rule-based grader (`src/lib/exercises/grade.ts`) for closed-form
  exercises
- Münzen system with credit/debit, transaction logging, balance validation,
  daily-streak bonus, and the AI-review-cost wiring
- All required pages: landing, login, register, dashboard, exercises browse,
  exercise runner, AI text review, profile, admin
- Server actions for register, login, exercise submit, profile save, review
  request, admin status changes
- Seed script (admin + teacher) and exercise generation script (uses the
  deterministic stub AI)
- `lib/ai.ts` makes real Claude calls via `@anthropic-ai/sdk` when
  `ANTHROPIC_API_KEY` is set; falls back to deterministic stubs without
  the key. Backed by `AiCache` / `AiRateLimit` / `AiUsage` tables and
  the config in `src/config/limits.ts`. (See Task 3 above.)

---

## What's NOT done (and why)

### 1. Database wasn't actually started

Docker isn't installed in the scaffolding environment. To bring up the DB:

```bash
docker compose up -d
npm install
npm run db:generate
npm run db:push       # or `npm run db:migrate -- --name init`
npm run db:seed
npm run db:generate-exercises
npm run dev
```

### 2. `npm install` and typecheck not run here

The scaffold has not been verified with a real install in this environment.
On first run, watch for:

- `next-intl` v3 typings on `useTranslations` argument shapes (some calls
  pass `{days: ...}` etc., relying on the ICU plural form in the message —
  TS will be happy but missing keys would fail at runtime).
- The `sourceLanguage` Zod default uses `.default("en")` and is consumed
  with `as` casts — should be fine, but verify after first build.

If typecheck flags missing `@types` after install, add them then re-run
`npm run typecheck`.

### 3. Listening exercise audio is not wired

`ListeningComprehensionRenderer` shows the transcript when no `audioUrl`
is present. Once asset hosting is decided (S3, Vercel Blob, etc.):

- Update `ListeningComprehensionContent` schema in
  `src/lib/exercises/schemas.ts` to require `audioUrl`.
- Update the AI generation prompt to call a TTS service (e.g. ElevenLabs
  or OpenAI's `tts-1`) and upload the result before persisting the
  exercise.

### 4. Google OAuth requires real credentials

`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are blank in `.env`. Until set,
the "Continue with Google" button on `/login` will fail. Create OAuth
credentials at <https://console.cloud.google.com> and authorize the
redirect `http://localhost:3000/api/auth/callback/google`.

### 5. Vercel deployment

Not configured yet. Minimum required steps:

- Add a Postgres provider (Vercel Postgres, Neon, Supabase). Set
  `DATABASE_URL` in Vercel's env.
- Set `AUTH_SECRET`, `AUTH_URL` (your prod URL),
  `AUTH_GOOGLE_ID/SECRET`, `ANTHROPIC_API_KEY`.
- Add a `postinstall` hook that runs `prisma generate` (or set
  `"build": "prisma generate && next build"`).

### 6. Tests — partially done

**Status:** `vitest` is wired (jsdom + `@testing-library/react` +
coverage v8) as of Sprint 02 Task 1, with helpers in `src/test/` and
tests under `__tests__/` directories beside source. The theme
(`src/theme/**`) and the shared UI primitives are covered. Task 2 added
the color-mode surface — `useColorMode` hook, `ColorModeContext`,
`ColorModeToggle`, and the `Provider` mode-resolution logic — bringing
the count to 98 (100 % on the hook/context/toggle, 87.7 % statements on
`Provider.tsx`). Task 4 added 49 more across `src/lib/muenzen.ts`
(`computeReward`, `credit`, `debit`, `adminAdjust`), the admin adjust
form + action, and the `/profile/historico` page — bringing the count
to 147 with 100 % coverage on `muenzen.ts`. Task 5 added **32 more**
across the dashboard data plumbing — `src/lib/dashboard/aggregations.ts`
(`buildMuenzenSeries`, `buildHeatmap`, `buildRadar`, `countToday`,
`toUtcDayKey`) and the four chart components — bringing the count to
179 with 100 % coverage on `src/lib/dashboard/aggregations.ts`. Task 3
added **47 more** across the AI surface — three new test files
(`src/config/__tests__/limits.test.ts`,
`src/lib/__tests__/ai-cache.test.ts`,
`src/lib/__tests__/ai-rate-limit.test.ts`) plus expanded coverage of
`src/lib/ai.ts` — bringing the count to **226** with 100 % coverage on
`src/config/limits.ts`, `src/lib/ai-cache.ts`, `src/lib/ai-rate-limit.ts`
and 96 %+ on `src/lib/ai.ts`. Task 6 added **47 more** across the
profile + avatar surface (`src/lib/profile/avatar.ts` and the profile
`actions.ts`) — bringing the count to 273 with 100 % coverage on
`src/lib/profile/avatar.ts` and `actions.ts`. Task 8 added **75 more**
across the exercise-intros surface (`src/lib/preferences/actions.ts`,
the static intro content, and the `IntroScreen` / `IntroModal`
components) — bringing the count to 348 with 100 % coverage on
`src/lib/preferences/actions.ts`. Task 7 added **79 more** across the
comments surface — `src/lib/comments/__tests__/serialize.test.ts`,
`src/lib/comments/__tests__/queries.test.ts`, the comments route
handlers (`src/app/api/exercises/[id]/comments/__tests__/*`,
`src/app/api/comments/[id]/__tests__/*`,
`src/app/api/comments/[id]/like/__tests__/*`), and the four UI
components under `src/components/comments/__tests__/` — total
**427 tests across 33 files** with 100 % coverage on
`src/lib/comments/serialize.ts`, `src/lib/comments/queries.ts`, and the
`PATCH` / `DELETE` route handlers.

Still uncovered:

- Server actions (`src/app/[locale]/**/actions.ts` and friends) —
  Tasks 4 / 6 / 8 covered admin adjust + history, profile + avatar, and
  intro preferences; the rest remain.
- Local grading in `src/lib/exercises/grade.ts`.
- `ButtonLink` / `InlineLink` shims and the named-palette branches of
  `ExerciseTypeIcon` (tracked under **Discovered debt** at the top).
- Comments: the `POST /api/comments/[id]/like` P2002 race-catch branch
  isn't directly exercised by a test (tracked under **Discovered debt**).
- End-to-end: Playwright for the critical login → submit-exercise flow
  has not been added yet.

### 7. Admin UX is intentionally minimal

Just enough to approve/reject drafts and view users. Future work:

- Pagination, search, exercise CRUD, exercise preview before approval.
- Teacher submissions form (currently teachers can only approve drafts —
  there's no UI to *create* one yet, though the schema supports it via
  `Exercise.authorId`).

### 8. Münzen edge cases worth revisiting

- `submitExerciseAttempt` allows the same exercise to be repeated and
  re-rewarded. If exercises should only pay out once per user, add a
  unique `(userId, exerciseId)` index on `UserExercise` and short-circuit
  when one already exists.
- Streak bonus is awarded on the *first passing exercise of the calendar
  day in UTC* — consider per-user timezone once `User` has a tz field.

### 9. i18n caveats

- `notFound()` from `next-intl` is used in `request.ts` — make sure
  `not-found.tsx` exists per-locale (it does).
- All exercise *content* is German regardless of UI locale. The UI chrome
  and instructions are translated; consider also translating the static
  parts of `Exercise.instructions` later.

---

## Default credentials (dev only)

```
admin@wortschatz.app    / admin123    (role: ADMIN)
teacher@wortschatz.app  / teacher123  (role: TEACHER)
```

Change these immediately if you ever expose this DB beyond localhost.
