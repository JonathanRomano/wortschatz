# Wortschatz — Roadmap

This document captures everything that was scaffolded vs. left as TODO in the
foundational pass. Each item lists exact file paths and what the next session
needs to do.

---

## Sprint 02 (revised) — in progress

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
- [ ] **Task 3** — Real Anthropic API calls in `src/lib/ai.ts` with
  caching + a rate limiter (supersedes "What's NOT done" item 1 below).
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
- [ ] **Task 6** — Profile page expansion (preferences, CEFR level on
  `User`).
- [ ] **Task 7** — Exercise comments / discussion.
- [ ] **Task 8** — Per-exercise-type intros.

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
- `lib/ai.ts` with `generateExercise`, `evaluateAnswer`, `reviewText` —
  scaffolded with TODOs, returns deterministic stubs without the API key

---

## What's NOT done (and why)

### 1. Anthropic API calls (intentional, per task instructions)

**Status:** still pending — scheduled for **Task 3** of the revised
Sprint 02 (above), which will also add response caching and a rate
limiter.

`src/lib/ai.ts` exposes the right interface but never calls the network. The
three functions return placeholder responses and log a warning. To finish:

1. `npm install` then export `ANTHROPIC_API_KEY` in `.env`.
2. In `src/lib/ai.ts`:
   - Replace the body of `generateExercise` with an `Anthropic` client call.
     The system prompt should pin the schema for the requested
     `ExerciseType` (see `src/lib/exercises/schemas.ts`) and ask for JSON.
     Validate with the matching Zod schema before returning.
   - Replace `evaluateAnswer` with a Claude call that takes the exercise +
     user answer and returns `{ score: 0-100, feedback }`.
   - Replace `reviewText` with a teacher-persona call that returns Markdown
     review feedback at the requested CEFR level.
3. Re-run `npm run db:generate-exercises` — the script automatically uses
   real generation once `generateExercise` does.

The `@anthropic-ai/sdk` dependency is already declared in `package.json`.

### 2. Database wasn't actually started

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

### 3. `npm install` and typecheck not run here

The scaffold has not been verified with a real install in this environment.
On first run, watch for:

- `next-intl` v3 typings on `useTranslations` argument shapes (some calls
  pass `{days: ...}` etc., relying on the ICU plural form in the message —
  TS will be happy but missing keys would fail at runtime).
- The `sourceLanguage` Zod default uses `.default("en")` and is consumed
  with `as` casts — should be fine, but verify after first build.

If typecheck flags missing `@types` after install, add them then re-run
`npm run typecheck`.

### 4. Listening exercise audio is not wired

`ListeningComprehensionRenderer` shows the transcript when no `audioUrl`
is present. Once asset hosting is decided (S3, Vercel Blob, etc.):

- Update `ListeningComprehensionContent` schema in
  `src/lib/exercises/schemas.ts` to require `audioUrl`.
- Update the AI generation prompt to call a TTS service (e.g. ElevenLabs
  or OpenAI's `tts-1`) and upload the result before persisting the
  exercise.

### 5. Google OAuth requires real credentials

`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are blank in `.env`. Until set,
the "Continue with Google" button on `/login` will fail. Create OAuth
credentials at <https://console.cloud.google.com> and authorize the
redirect `http://localhost:3000/api/auth/callback/google`.

### 6. Vercel deployment

Not configured yet. Minimum required steps:

- Add a Postgres provider (Vercel Postgres, Neon, Supabase). Set
  `DATABASE_URL` in Vercel's env.
- Set `AUTH_SECRET`, `AUTH_URL` (your prod URL),
  `AUTH_GOOGLE_ID/SECRET`, `ANTHROPIC_API_KEY`.
- Add a `postinstall` hook that runs `prisma generate` (or set
  `"build": "prisma generate && next build"`).

### 7. Tests — partially done

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
`toUtcDayKey`) and the four chart components — total **179 tests** with
100 % coverage on `src/lib/dashboard/aggregations.ts`.

Still uncovered:

- Server actions (`src/app/[locale]/**/actions.ts` and friends) — Task 4
  covered admin adjust + history; the rest remain.
- Local grading in `src/lib/exercises/grade.ts`.
- `ButtonLink` / `InlineLink` shims and the named-palette branches of
  `ExerciseTypeIcon` (tracked under **Discovered debt** at the top).
- End-to-end: Playwright for the critical login → submit-exercise flow
  has not been added yet.

### 8. Admin UX is intentionally minimal

Just enough to approve/reject drafts and view users. Future work:

- Pagination, search, exercise CRUD, exercise preview before approval.
- Teacher submissions form (currently teachers can only approve drafts —
  there's no UI to *create* one yet, though the schema supports it via
  `Exercise.authorId`).

### 9. Münzen edge cases worth revisiting

- `submitExerciseAttempt` allows the same exercise to be repeated and
  re-rewarded. If exercises should only pay out once per user, add a
  unique `(userId, exerciseId)` index on `UserExercise` and short-circuit
  when one already exists.
- Streak bonus is awarded on the *first passing exercise of the calendar
  day in UTC* — consider per-user timezone once `User` has a tz field.

### 10. i18n caveats

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
