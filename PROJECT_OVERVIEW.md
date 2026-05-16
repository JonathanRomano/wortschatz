# Wortschatz — Project Overview

> Single source of truth for the Wortschatz codebase. Read this before
> changing the schema, the AI surface, the Münzen rules, the theme system,
> or the deployment story. For per-task implementation notes see
> [`SPRINT_02.md`](./SPRINT_02.md); for forward-looking work see
> [`ROADMAP.md`](./ROADMAP.md); for AI-assistant operational rules see
> [`CLAUDE.md`](./CLAUDE.md).

## Table of contents

1. [Purpose & status](#1-purpose--status)
2. [Technical architecture](#2-technical-architecture)
3. [Database schema](#3-database-schema)
4. [Domains & features](#4-domains--features)
5. [Code conventions](#5-code-conventions)
6. [Palette system & theme](#6-palette-system--theme)
7. [Environment variables](#7-environment-variables)
8. [Useful scripts](#8-useful-scripts)
9. [Deployment](#9-deployment)
10. [Technical debt & open issues](#10-technical-debt--open-issues)
11. [Critical user flows](#11-critical-user-flows)
12. [Tests](#12-tests)
13. [Key dependencies & rationale](#13-key-dependencies--rationale)
14. [Local quickstart](#14-local-quickstart)
15. [Test users](#15-test-users)
16. [Architectural decisions (implicit ADRs)](#16-architectural-decisions-implicit-adrs)
17. [Glossary](#17-glossary)

---

## 1. Purpose & status

**Wortschatz** ("word treasure" in German) is a German-learning web app
that mixes ten interactive exercise types with a Claude-powered
exercise-generation and text-review pipeline. It rewards practice with
**Münzen** — an internal currency — and tracks progress through CEFR
levels, daily streaks, dashboards, and a per-exercise discussion thread.

**Problem it solves.** Generic flashcard apps don't expose the *shape* of
German grammar (cases, verb position, separable prefixes); generic LLM
chat doesn't gamify or persist progress. Wortschatz is the middle path:
typed, scored exercises with a CEFR ladder, plus optional AI feedback
when the learner wants it.

**Audience.** Self-directed German learners (A1–C2). The UI is
localized to **PT, EN, TR, UK** so the *interface* meets learners in
their native language while the *exercise content* stays in German.

**Stage.** Active development, post-Sprint 02. The visual identity, MUI
migration, dark mode, dashboard charts, real Claude integration, profile
expansion, intros, and comments all shipped — see
[`SPRINT_02.md`](./SPRINT_02.md). 427 tests across 33 files,
`npm run build` and `npx tsc --noEmit` clean. **Not production-ready
yet** because the avatar pipeline writes to the local filesystem and
five hand-written migrations have never been applied to a live database
(see [Technical debt](#10-technical-debt--open-issues)).

---

## 2. Technical architecture

### Stack (with versions from `package.json`)

| Layer | Choice | Version |
| --- | --- | --- |
| Runtime / framework | Next.js (App Router) | `15.0.3` |
| UI runtime | React | `19.0.0-rc-66855b96-20241106` |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | `^5.6.3` |
| Component library | Material UI v9 + emotion | `@mui/material@^9.0.1` |
| MUI Next.js bridge | `@mui/material-nextjs` | `^9.0.1` |
| Layout utilities | Tailwind CSS v4 (beta) | `^4.0.0-beta.7` |
| Database | PostgreSQL | `16-alpine` (docker-compose) |
| ORM | Prisma | `^5.22.0` |
| Auth | NextAuth.js v5 (beta) | `5.0.0-beta.25` |
| i18n | next-intl | `^3.26.0` |
| Charts | Recharts | `^3.8.1` |
| Image processing | sharp | `^0.34.5` |
| AI client | `@anthropic-ai/sdk` | `^0.32.1` |
| Validation | Zod | `^3.23.8` |
| Hashing | bcryptjs | `^2.4.3` |
| Test runner | Vitest + jsdom + Testing Library | `vitest@^4.1.6` |
| Display fonts | Fraunces + Inter (`next/font/google`) | bundled |

### Key architectural decisions

- **Next.js App Router (not Pages Router).** Picked at scaffolding for
  React Server Components, the file-based locale segment
  (`src/app/[locale]/…`), nested layouts, and server actions. All routed
  pages are RSC by default; renderers and chart wrappers opt into client
  rendering with `"use client"`.
- **MUI v9 + Tailwind v4 coexistence (Sprint 02 Task 1).** MUI owns
  every component with state/variant/color/surface semantics (Buttons,
  Cards, Inputs, Tabs, Typography, etc.) and *all* color, typography,
  radius, shadow, and shape values flow through `src/theme/`. Tailwind
  is kept **only for layout utilities** (`flex`, `grid`, `gap-*`,
  `mx-auto`, `max-w-*`, spacing, responsive prefixes). See
  [Palette system](#6-palette-system--theme) for the rule and
  [ADRs](#16-architectural-decisions-implicit-adrs) for the rationale.
- **PostgreSQL via Prisma.** Picked for its native JSON columns
  (`Exercise.content/solution/instructions/explanation` are typed
  per-locale or per-shape JSON), strong consistency for the Münzen
  ledger, and the `@auth/prisma-adapter` integration. SQLite was
  rejected because of weak JSON typing and no `Decimal`-grade integer
  support; MongoDB was rejected because the Münzen ledger benefits
  from transactional `prisma.$transaction` semantics.
- **NextAuth.js v5 (beta).** Picked over Auth.js v4 because v5 ships
  the `auth()` helper, the edge-compatible split (`auth.config.ts` for
  middleware, `auth.ts` for the full handler), and stable JWT + session
  callbacks. Credentials + Google providers, JWT sessions
  (`session.strategy: 'jwt'`), Prisma adapter for OAuth account
  persistence.
- **Real Claude calls behind feature flag (Sprint 02 Task 3).** The
  Anthropic SDK is gated by `AI_CONFIGURED` (which reads
  `ANTHROPIC_API_KEY`). When the key is missing, every public function
  in `src/lib/ai.ts` returns deterministic stubs — local dev never
  hits the network and never burns tokens. See
  [Claude integration](#claude-integrations).
- **Hand-written SQL migrations (Sprint 02).** Five Sprint-02
  migrations were authored by hand at
  `prisma/migrations/2026051512…/`–`2026051516…/` because the dev
  environment had no live PostgreSQL. They will apply on the next
  `prisma migrate dev/deploy`. The original `0_init` migration is
  also present but currently **untracked** in git — verify before
  applying.

### Folder layout

```
prisma/
  schema.prisma                  All models + enums
  migrations/
    0_init/                      Initial schema (untracked in git)
    20260515120000_muenzen_reason_extension/
    20260515130000_ai_tables/
    20260515140000_user_profile_fields/
    20260515150000_user_preferences/
    20260515160000_exercise_comments/
    migration_lock.toml          provider = "postgresql"

scripts/
  seed.ts                        Admin + teacher accounts
  generate-exercises.ts          50 stub or real exercises (uses ANTHROPIC_API_KEY)
  migrate-exercise-i18n.ts       One-shot fixer for legacy single-locale fields
  seed-muenzen-history.ts        Backfills ADMIN_ADJUSTMENT rows for existing balances

messages/
  en.json  pt.json  tr.json  uk.json     Full UI translations (renderers, dashboard,
                                          comments, exerciseIntros, profile, …)

src/
  app/
    layout.tsx                   Root: wires <html>, fonts, the anti-FOUC inline script
    globals.css                  Token CSS vars + paper-grain effect
    [locale]/
      layout.tsx                 NextIntl + AppThemeProvider + Header/Footer chrome
      page.tsx                   Landing
      login/  register/          Auth pages (server actions in actions.ts)
      dashboard/                 4 charts + recent activity
      exercises/
        page.tsx                 Browse grid (card per exercise, filterable)
        [slug]/                  Type runner (TypeRunner) AND single-exercise (ExerciseRunner)
        mistakes/                Recent low-score attempts
      profile/
        page.tsx                 ProfileForm (avatar, bio, language, level, daily goal)
        historico/               Paginated MuenzenTransaction history (all locales)
      review/                    AI text review (debits 30 Münzen)
      admin/                     Approve drafts, adjust user balances
      not-found.tsx              Localized 404
    api/
      auth/[...nextauth]/        NextAuth handlers
      exercises/[id]/comments/   GET (public), POST (auth)
      comments/[id]/             PATCH (author only), DELETE (author or admin)
      comments/[id]/like/        POST (toggle, P2002-safe)
      profile/avatar/            POST (multipart upload), DELETE (remove)

  auth.ts                        Full NextAuth config (Prisma + bcrypt)
  auth.config.ts                 Edge-safe NextAuth config (used by middleware)
  middleware.ts                  Auth + locale routing
  components/
    layout/                      Header, Footer, LocaleSwitcher, MobileMenu, ColorModeToggle
    ui/                          MuenzenBadge, StreakFlame, LevelChip, ExerciseTypeIcon,
                                  Card, ButtonLink, InlineLink (do NOT re-implement)
    exercises/
      renderers/                 10 type-specific renderers + index registry
      ExerciseResult.tsx         Shared result panel (score ring + reward callout)
      IntroScreen.tsx            Per-type intro body
      IntroModal.tsx             Dialog wrapper around IntroScreen
    dashboard/                   4 chart components (Recharts wrappers + SVG heatmap)
    comments/                    CommentsSection, CommentList, CommentItem, CommentComposer
  config/
    limits.ts                    AI rate limits, cache TTLs, model pricing
    moderation.ts                Comment blocklist + length + rate limit
  content/
    exercise-intros/             Per-type static intro content (one .ts per type)
  hooks/
    useColorMode.tsx             Reads/sets light|dark|system mode
  i18n/
    config.ts                    Locale list + types
    navigation.ts                Typed Link / redirect / usePathname
    request.ts                   getRequestConfig (loads messages/<locale>.json)
  lib/
    db.ts                        Prisma client singleton
    ai.ts                        Only file that imports the Anthropic SDK
    ai-cache.ts                  SHA-256 keyed response cache (AiCache table)
    ai-rate-limit.ts             Atomic per-user 24h rolling window (AiRateLimit)
    ai-stubs.ts                  Deterministic responses when AI_CONFIGURED is false
    muenzen.ts                   credit / debit / adminAdjust / computeReward
    exercises/
      schemas.ts                 10 Zod schemas (content + answer + solution)
      grade.ts                   Local rule-based grader for closed-form types
      i18n.ts                    LocalizedText + pickLocalized helper
      actions.ts                 submitExerciseAttempt server action
      constants.ts
    dashboard/
      constants.ts               DAILY_GOAL_DEFAULT, HEATMAP_DAYS, RADAR_LAST_N, …
      aggregations.ts            buildMuenzenSeries, buildHeatmap, buildRadar, …
      queries.ts                 fetchDashboardChartData (single Promise.all batch)
    comments/
      types.ts  serialize.ts  queries.ts
    preferences/
      actions.ts                 setSkipIntro / getSkipIntro
    profile/
      avatar.ts                  Sharp pipeline + spoof defense
    review/
      actions.ts                 reviewText server action (debits Münzen)
  test/
    renderWithTheme.tsx          Mounts components inside the real theme
    setup.ts                     vitest + jest-dom matchers
  theme/
    palette.ts                   Light + dark palettes
    typography.ts                Fraunces + Inter via CSS vars
    shape.ts  shadows.ts
    augmentation.ts              Adds tertiary, accentSoft, dangerSoft, surfaceAlt
    ColorModeContext.tsx         Provider + localStorage persistence
    Provider.tsx                 AppThemeProvider (wraps everything)
    index.ts                     createAppTheme(mode) — all MUI overrides live here
  types/
    next-auth.d.ts               Augments Session.user with id/role/avatarUrl
```

### Rendering model

| Surface | Mode | Notes |
| --- | --- | --- |
| Routed pages (`src/app/[locale]/**/page.tsx`) | **RSC** | Default. Uses `auth()` + Prisma directly. |
| Server actions (`actions.ts`) | **Server** | `"use server"`. Mutations + `revalidatePath`. |
| API routes (`src/app/api/**/route.ts`) | **Server** | Used for auth + REST surfaces (comments, avatar). |
| Forms / interactive UI | **Client** | `"use client"` at file top. Dispatch into server actions. |
| Renderers (10 exercise types) | **Client** | All require local state and event handlers. |
| Recharts chart bodies | **Client (`ssr: false`)** | Wrapped in `*.client.tsx` via `next/dynamic` because `ResponsiveContainer` touches `ResizeObserver`. |
| SVG heatmap, `CircularProgress` ring | **Server-safe** | No DOM-only imports → render in RSC. |
| Header/Footer | **Mixed** | Server-rendered shell with small `"use client"` shims (`HeaderLinks`, `ColorModeToggle`, `MobileMenu`). |
| Cross-RSC links to MUI Buttons | `<ButtonLink>` / `<InlineLink>` | Tiny client shims that wrap MUI's polymorphic `component={Link}` with the next-intl typed `Link`. |

---

## 3. Database schema

All models live in [`prisma/schema.prisma`](./prisma/schema.prisma).
PostgreSQL 16. Source of truth — read it whenever you doubt this
section.

### Enums

| Enum | Values | Notes |
| --- | --- | --- |
| `UserRole` | `USER`, `TEACHER`, `ADMIN` | Default `USER`. Admin bypasses some checks. |
| `UiLanguage` | `PT`, `EN`, `TR`, `UK` | Stored on `User.preferredLanguage`; default `EN`. |
| `CefrLevel` | `A1`, `A2`, `B1`, `B2`, `C1`, `C2` | On `Exercise.level` (required) and `User.learningLevel` (optional). |
| `ExerciseType` | `FILL_IN_THE_BLANK`, `MULTIPLE_CHOICE`, `TRANSLATION`, `WORD_ORDER`, `MATCHING`, `LISTENING_COMPREHENSION`, `READING_COMPREHENSION`, `VERB_CONJUGATION`, `ERROR_CORRECTION`, `FREE_WRITING` | Display names in `messages/<locale>.json` (`exerciseTypes`). Currently overloaded as `UserPreference.key` — **debt**. |
| `ExerciseStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Browse page filters to `PUBLISHED`. |
| `MuenzenReason` | `EXERCISE_COMPLETE`, `PERFECT_SCORE_BONUS`, `DAILY_STREAK`, `SPENT_AI_REVIEW`, `ADMIN_ADJUSTMENT`, `BONUS` | `BONUS` is legacy, retained so old rows validate. |

### Tables (text diagram)

```
                      ┌─────────────────────┐
                      │  User               │
                      │─────────────────────│
                      │ id (cuid) PK        │
                      │ email UNIQUE        │
                      │ password? (bcrypt)  │
                      │ role UserRole       │
                      │ preferredLanguage   │
                      │ muenzen Int         │
                      │ streak Int          │
                      │ lastActiveAt?       │
                      │ bio? (≤280)         │
                      │ nativeLanguage?     │
                      │ learningLevel?      │
                      │ dailyGoal Int=5     │
                      │ avatarUrl?          │
                      │ createdAt updatedAt │
                      └──────────┬──────────┘
                                 │ 1:N
   ┌─────────────────────────────┼──────────────────────────────────────┐
   │                             │                                       │
   ▼                             ▼                                       ▼
┌──────────┐    ┌─────────────────────┐    ┌─────────────────────────┐
│ Account  │    │ MuenzenTransaction  │    │ AIReviewRequest         │
│ Session  │    │ amount (±)          │    │ inputText feedback      │
│ Verif.T. │    │ reason MuenzenReason│    │ muenzenCost             │
└──────────┘    │ refId? createdAt    │    └─────────────────────────┘
 (NextAuth)     └─────────────────────┘
                                                ┌────────────────────┐
                ┌─────────────────────┐         │ UserPreference     │
                │ UserExercise        │         │ key: ExerciseType  │
                │ answer JSON         │         │ skipIntro Boolean  │
                │ score 0-100         │         │ UNIQUE (userId,key)│
                │ feedback            │         └────────────────────┘
                │ completedAt         │
                └──────────┬──────────┘
                           │ N:1
                           ▼
                ┌─────────────────────┐
                │ Exercise            │
                │─────────────────────│
                │ id (cuid)           │
                │ type ExerciseType   │
                │ title               │
                │ instructions JSON   │  ← {en, pt, tr, uk}
                │ targetLanguage="de" │
                │ level CefrLevel     │
                │ content JSON        │  ← shape per type (Zod)
                │ solution JSON       │
                │ explanation JSON    │  ← {en, pt, tr, uk}
                │ tags String[]       │
                │ status              │
                │ authorId? (User)    │
                └──────────┬──────────┘
                           │ 1:N
                           ▼
                ┌─────────────────────┐         ┌─────────────────────┐
                │ ExerciseComment     │ 1:N     │ CommentLike         │
                │ content (≤500)      │────────▶│ UNIQUE (commentId,  │
                │ createdAt editedAt? │         │         userId)     │
                │ deletedAt? (soft)   │         └─────────────────────┘
                └─────────────────────┘

AI infrastructure (no FK to User on AiCache; AiUsage.userId is nullable):

  AiCache         key (sha256) UNIQUE · endpoint · model · response JSON · expiresAt
  AiRateLimit     UNIQUE(userId, endpoint) · count · windowStart  (rolling 24h)
  AiUsage         userId? · endpoint · model · in/out tokens · costMicrocents · cacheHit
```

### Critical business rules

- **Münzen are awarded only on the FIRST passing attempt** (`score ≥ 60`)
  per user+exercise. `submitExerciseAttempt` always records the
  `UserExercise` row but only credits Münzen the first time. (Repeat
  attempts pay out today — see [debt](#10-technical-debt--open-issues).)
- **Perfect-score and daily-streak bonuses are itemized.** A 100-score
  first-pass-of-the-day writes three transactions:
  `EXERCISE_COMPLETE` (10) + `PERFECT_SCORE_BONUS` (5) + `DAILY_STREAK`
  (20) = 35 total. (Sprint 02 Task 4 split a single `BONUS` row into
  these three reasons.)
- **Münzen never go negative.** `debit` runs inside `prisma.$transaction`
  with a balance check; `adminAdjust` uses the same guard for negative
  deltas. Both throw `InsufficientFundsError`.
- **Comments are soft-deleted** via `deletedAt`. The serializer in
  `src/lib/comments/serialize.ts` masks both content and author on
  deleted rows, and `loadComments` / `loadComment` filter
  `deletedAt: null` so deleted rows never escape the boundary.
- **AI cache TTLs differ per endpoint.** `GENERATE_EXERCISE`: 30 days
  (exercises are reusable). `EVALUATE_ANSWER`: 1h (dedupe rapid
  repeats). `REVIEW_TEXT`: 0 — never cached (personalized to the user).
  Live in `src/config/limits.ts → AI_CACHE_TTL_MS`.
- **Per-user, per-endpoint rolling 24h rate limits.** `REVIEW_TEXT`:
  20/day. `EVALUATE_ANSWER`: 200/day. `GENERATE_EXERCISE`: 50/day.
  Cache hits do **not** count.
- **`Exercise.instructions` and `Exercise.explanation` are i18n JSON
  blobs** (`{ en, pt, tr, uk }`). Read with `pickLocalized(value, locale)`
  from `src/lib/exercises/i18n.ts`. `Exercise.content` and
  `Exercise.solution` stay German regardless of UI locale (it's the
  language being learned).
- **Avatars are always normalized to 512×512 WebP.** The original is
  re-decoded by sharp before write to defeat MIME spoofing.

### Pending migration debt

Five Sprint-02 migrations live in `prisma/migrations/` but **were never
applied to a live DB** (the dev environment had no Postgres):

- `20260515120000_muenzen_reason_extension/` — adds `PERFECT_SCORE_BONUS`
  and `ADMIN_ADJUSTMENT` to `MuenzenReason` (idempotent
  `ALTER TYPE … ADD VALUE IF NOT EXISTS`).
- `20260515130000_ai_tables/` — `AiCache`, `AiRateLimit`, `AiUsage`.
- `20260515140000_user_profile_fields/` — `bio`, `nativeLanguage`,
  `learningLevel`, `dailyGoal`, `avatarUrl` on `User`.
- `20260515150000_user_preferences/` — `UserPreference` table.
- `20260515160000_exercise_comments/` — `ExerciseComment` + `CommentLike`.

`prisma/migrations/0_init/` is also present but **untracked in git** —
inspect before applying. Run `prisma migrate dev` (or `deploy` in CI)
to bring a fresh DB in line with the schema.

---

## 4. Domains & features

### Authentication & users

- **Providers.** Credentials (email + bcrypt password) + Google OAuth.
  Both registered in [`src/auth.ts`](./src/auth.ts) (full config) and
  [`src/auth.config.ts`](./src/auth.config.ts) (edge-safe slice for
  middleware — no Prisma, no bcrypt).
- **Roles.** `USER`, `TEACHER`, `ADMIN`. Currently consumed only by
  the admin pages (gate at the top of `/admin/**/page.tsx`). Teacher
  doesn't yet have a UI to *create* exercises (the schema supports it
  via `Exercise.authorId` — see [debt](#10-technical-debt--open-issues)).
- **Session.** JWT (`session.strategy: 'jwt'`). The token carries `id`,
  `role`, and `avatarUrl`. Augmented in `src/types/next-auth.d.ts`.
- **Profile fields** (Sprint 02 Task 6): `bio` (≤280), `nativeLanguage`
  (ISO 639-1 free-form for now), `learningLevel` (`CefrLevel?`),
  `dailyGoal` (Int, default 5), `avatarUrl`. Edited at `/profile`,
  saved via the server action in
  `src/app/[locale]/profile/actions.ts`.
- **Protected routes** (defined in `auth.config.ts → authorized`):
  `/dashboard`, `/exercises`, `/review`, `/profile`, `/admin`. Anything
  else is public.
- **Middleware.** [`src/middleware.ts`](./src/middleware.ts) chains
  next-intl's locale routing with NextAuth's session check.

### Exercise system

The 10 exercise types and their per-type Zod schemas live in
[`src/lib/exercises/schemas.ts`](./src/lib/exercises/schemas.ts):

| Type | What it asks | Grader |
| --- | --- | --- |
| `FILL_IN_THE_BLANK` | German sentence with `___`; user types each blank. | Local rule grader. |
| `MULTIPLE_CHOICE` | Question + 4 options; pick one. | Local rule grader. |
| `TRANSLATION` | Source text in EN/PT; type the German translation. | Local fuzzy match against `acceptedTranslations[]`. |
| `WORD_ORDER` | Scrambled tokens; tap to build the sentence. | Local exact-match. |
| `MATCHING` | German words ↔ translations; pair them. | Local pair-by-pair. |
| `LISTENING_COMPREHENSION` | (Audio TODO) transcript + question; type the answer. | Local string compare with normalization. |
| `READING_COMPREHENSION` | Passage + question; type the answer. | Local string compare. |
| `VERB_CONJUGATION` | infinitive + pronoun + tense; type the conjugated form. | Local exact-match. |
| `ERROR_CORRECTION` | Sentence with one error; type the corrected version. | Local string compare. |
| `FREE_WRITING` | Prompt + minWords; write a short paragraph. | **AI-only** (`evaluateAnswer`). Falls back to a simple length+effort heuristic when AI is rate-limited. |

- **Renderers.** One file per type in
  [`src/components/exercises/renderers/`](./src/components/exercises/renderers/),
  registered in `index.tsx` and dispatched by `<ExerciseRenderer>` based
  on `exercise.type`. All renderers are `"use client"`.
- **Pages.** `/exercises` (browse grid),
  `/exercises/<TYPE>` (TypeRunner — picks a random exercise of the
  type, optionally filtered by CEFR level), and
  `/exercises/<id>` (ExerciseRunner — single exercise, retryable). Both
  share the result UI through `ExerciseResult.tsx`.
- **Creation.**
  - **AI generation** via `scripts/generate-exercises.ts` (`npm run
    db:generate-exercises`). Prints `AI mode: real|stub`. With
    `ANTHROPIC_API_KEY`, calls `generateExercise`; without, returns
    deterministic stubs. Bulk runs pass `userId: undefined` so they
    skip per-user rate-limiting (still log usage with `userId: null`).
  - **Manual.** Schema supports `Exercise.authorId` and `status:
    DRAFT`, but there's no teacher-facing creation UI yet — drafts must
    be inserted via `prisma studio` or a script.
- **Approval.** Admins approve/reject drafts at
  [`/admin`](./src/app/[locale]/admin/) via the actions in `actions.ts`.
- **Scoring.** `0–100` integer on `UserExercise.score`. Local grader
  in `src/lib/exercises/grade.ts` for everything except `FREE_WRITING`.
  `submitExerciseAttempt` also calls `evaluateAnswer` from
  `src/lib/ai.ts` for AI feedback when configured; if rate-limited,
  the local grade is used and the attempt is still recorded.

### Münzen system

The internal currency. Earned by practising, spent on AI text review.

| Reason | Amount | When |
| --- | --- | --- |
| `EXERCISE_COMPLETE` | +10 | First passing attempt (`score ≥ 60`) on a given exercise. |
| `PERFECT_SCORE_BONUS` | +5 | First passing attempt and `score == 100`. |
| `DAILY_STREAK` | +20 | First passing attempt of the calendar day (UTC). |
| `SPENT_AI_REVIEW` | −30 | Each `/review` submission that produces AI feedback. |
| `ADMIN_ADJUSTMENT` | ± any int | Admin adjusts a balance via `/admin`. Note stored in `refId`. |
| `BONUS` | +N | **Legacy.** Retained so old rows validate; not written by current code. |

Rules live in [`src/lib/muenzen.ts`](./src/lib/muenzen.ts):

- **Always go through `credit` / `debit` / `adminAdjust`.** Never mutate
  `user.muenzen` directly — every change must write a `MuenzenTransaction`.
- `debit` is atomic via `prisma.$transaction` and refuses to drive the
  balance below zero (throws `InsufficientFundsError`).
- `computeReward(score, isFirstOfDay)` returns
  `{ base, perfect, streakBonus }`; the caller writes one transaction
  per non-zero component.
- The user-facing history page at
  [`/profile/historico`](./src/app/[locale]/profile/historico/) (same
  path across all four locales) paginates the ledger with a single-value
  type filter and `Intl.DateTimeFormat(locale)` dates.

### Claude integrations

[`src/lib/ai.ts`](./src/lib/ai.ts) is the **only** file in the codebase
that imports `@anthropic-ai/sdk`. Three public endpoints:

- `generateExercise(type, level, userId?)` → DB-shaped exercise body.
  Used by `scripts/generate-exercises.ts`.
- `evaluateAnswer({ exercise, answer, userLevel }, userId?)` →
  `{ score, feedback }`. Called from `submitExerciseAttempt`.
- `reviewText({ text, level }, userId?)` → free-text feedback. Called
  from `src/lib/review/actions.ts`.

Behaviour:

- Gated by `AI_CONFIGURED` (true iff `ANTHROPIC_API_KEY` is set).
- When false, returns deterministic stubs from `src/lib/ai-stubs.ts`,
  writes **nothing** to the DB (no cache row, no rate-limit row, no
  usage row).
- When true:
  - **Cache** (`src/lib/ai-cache.ts`): SHA-256 over
    `endpoint:model:canonicalPrompt`. TTLs in
    [`src/config/limits.ts`](./src/config/limits.ts) →
    `AI_CACHE_TTL_MS`. `set` swallows DB errors (a doomed cache write
    never breaks the caller); `ttlMs === 0` skips the write entirely.
    Expired rows are best-effort deleted on read.
  - **Rate limits** (`src/lib/ai-rate-limit.ts`): atomic
    `prisma.$transaction` over a rolling 24h window per (user,
    endpoint). Throws `AiRateLimitedError`. Cache hits don't count.
  - **Usage logging.** Every call writes an `AiUsage` row with
    `cacheHit` flag and integer-microcents cost via
    `estimateCostMicrocents(model, in, out)` (1 cent = 100 µ¢; USD
    × 100 000 — kept as `Int` to avoid float drift).
- **Error surfacing.**
  - Review returns `{ ok: false, error: 'rate_limited' }` and the form
    shows `review.rateLimited` localized.
  - Submit **soft-falls-back** to the local grade and still records the
    `UserExercise` row when `evaluateAnswer` is throttled.
- **Prompt invalidation.** The cache key includes the prompt body, so
  changing a prompt yields a new key automatically — but old rows for
  the old prompt linger until their TTL expires. Bump the model name
  or `DELETE FROM "AiCache" WHERE endpoint = '<endpoint>'` for an
  immediate refresh.

### Social: comments + likes

Per-exercise discussion thread. Auth-gated for write, public for read.

- **Tables.** `ExerciseComment` (soft delete via `deletedAt`) and
  `CommentLike` (composite unique `(commentId, userId)`).
- **REST surface** under `src/app/api/`:
  - `GET  /api/exercises/[id]/comments` — public, ordered by like count
    desc + `createdAt` desc.
  - `POST /api/exercises/[id]/comments` — auth · 401/400/429/201.
  - `PATCH  /api/comments/[id]` — auth + **author only** (admins do
    not have edit privilege on others' comments) · 401/403/404/400/200.
  - `DELETE /api/comments/[id]` — auth + author **OR admin** · soft
    delete · 401/403/404/200.
  - `POST /api/comments/[id]/like` — toggle. `prisma.$transaction` +
    P2002-catch on `(commentId, userId)` makes double-likes idempotent.
    Returns `{ liked, likeCount }`.
- **Moderation knobs** in
  [`src/config/moderation.ts`](./src/config/moderation.ts):
  `COMMENT_WORD_BLOCKLIST` (currently empty), `COMMENT_MAX_LENGTH`
  (500), `COMMENT_RATE_LIMIT` (5 per 60 s per user, counted directly
  from `createdAt`), and the `findBlockedWord` helper (normalizes
  whitespace + lowercase).
- **Rendering.** Always React text children with
  `whiteSpace: 'pre-wrap'`. **Never** `dangerouslySetInnerHTML`. The
  `serializeComment` helper masks both content and author on deleted
  rows.
- **UI.** `CommentsSection` is collapsed by default (MUI Accordion)
  below the runner so the discussion doesn't compete with the exercise.

### Exercise intros

- **Per-type static intro screen** explaining what the type asks, how to
  interact, and a worked example. Content lives in
  `src/content/exercise-intros/<type>.ts` (one file per type, aggregated
  into `EXERCISE_INTROS: Record<ExerciseType, ExerciseIntro>`). Every
  field is `LocalizedText` (en/pt/tr/uk).
- **"Don't show again"** is per-user-per-type, stored in the
  `UserPreference` table. Always go through
  `setSkipIntro` / `getSkipIntro` from
  [`src/lib/preferences/actions.ts`](./src/lib/preferences/actions.ts).
- **Surfaces.**
  - On `/exercises/<TYPE>` the intro renders inline on first visit.
  - On `/exercises/<id>` the page header shows `<ExerciseHelpButton>`
    (a `?` icon) that opens the intro in a `<IntroModal>`.
  - The `?` keyboard shortcut (Shift+/) opens the intro from either
    context. **Suppressed** while focus is on `input`/`textarea`/
    `contentEditable` so users can still type a literal `?`.

### Dashboard & charts

The dashboard at `/dashboard` pulls all data through one parallel batch
in `fetchDashboardChartData(userId, now)` — `src/lib/dashboard/queries.ts`.
**Don't add ad-hoc Prisma calls on the dashboard page.**

Four charts (constants in `src/lib/dashboard/constants.ts`):

| Chart | Source | Library | Notes |
| --- | --- | --- | --- |
| 30-day Münzen running balance (area) | `MuenzenTransaction` | Recharts | `secondary.main` (amber) fill. Clamped at ≥ 0. |
| 90-day activity heatmap | `UserExercise.completedAt` | **Hand-rolled SVG** | One cell per UTC day. ICU-plural tooltip. |
| 10-axis proficiency radar | last 10 graded attempts bucketed by `ExerciseType` | Recharts | `primary.main` (ink) stroke. |
| Daily-goal ring | today's count vs. `User.dailyGoal ?? DAILY_GOAL_DEFAULT` (5) | MUI `CircularProgress` | Stacked track + ring. |

- Pure aggregations live in `src/lib/dashboard/aggregations.ts`
  (`buildMuenzenSeries`, `buildHeatmap`, `buildRadar`, `countToday`,
  `toUtcDayKey`). 100% test coverage. **If you add a new chart, add a
  pure helper alongside.**
- Recharts charts use a `*Chart.tsx` (chart body) plus a
  `*.client.tsx` `next/dynamic({ ssr: false })` wrapper because
  `ResponsiveContainer` touches `ResizeObserver` on import.
- All colors flow through `theme.palette`. **Zero hex** anywhere in
  `src/components/dashboard/` or `src/lib/dashboard/`.

### Profile + avatar

- **Endpoint.** `POST /api/profile/avatar` (auth required,
  `multipart/form-data`, field name `file`). `DELETE` on the same path
  removes the current avatar.
- **Storage.** Local filesystem at `public/uploads/avatars/`. **Must be
  swapped for Vercel Blob or S3 before deploying on an ephemeral
  filesystem.** Marked with `TODO` in the route handler.
- **Pipeline** (in
  [`src/lib/profile/avatar.ts`](./src/lib/profile/avatar.ts)):
  1. Size check (2 MB cap).
  2. MIME allowlist (`image/jpeg`, `image/png`, `image/webp`,
     `image/gif`).
  3. **Spoof defense.** Re-decode header via `sharp().metadata()` and
     reject mismatched content.
  4. `rotate()` (honor EXIF) → `resize(512, 512, { fit: 'cover' })` →
     `webp({ quality: 88 })`.
  5. Write to disk with a random 6-byte hex filename suffix.
- **Path traversal hardening.** Route handler rejects any filename
  segment containing `/` or `..`.
- **JWT not refreshed after upload** — see
  [debt](#10-technical-debt--open-issues).

### Internationalization

- **Library.** [`next-intl`](https://next-intl-docs.vercel.app/) v3.
- **Locales.** `pt`, `en`, `tr`, `uk` (defined in
  `src/i18n/config.ts`).
- **Default.** `NEXT_PUBLIC_DEFAULT_LOCALE=en`.
- **Pages live under `src/app/[locale]/…`** and the locale segment is
  enforced by `src/middleware.ts`.
- **Messages** in `messages/<locale>.json` — flat ICU MessageFormat
  blocks: `nav`, `common`, `home`, `dashboard.*`, `exercises.*`,
  `renderers`, `filters`, `review`, `profile.*`, `admin.*`,
  `comments.*`, `exerciseIntros.*`, `notFound`, etc.
- **Typed navigation.** Use `Link`, `redirect`, `usePathname`,
  `useRouter` from `src/i18n/navigation.ts` — they are typed against
  the locale list.
- **Caveats.**
  - `notFound()` is used in `i18n/request.ts`; per-locale `not-found.tsx`
    files exist.
  - All exercise *content* is German regardless of UI locale (it's the
    language being learned). UI chrome and `Exercise.instructions` /
    `explanation` are i18n JSON blobs.

---

## 5. Code conventions

> Many of these rules are encoded in [`CLAUDE.md`](./CLAUDE.md). When
> in doubt, read it.

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`,
  `noImplicitOverride: true` (see
  [`tsconfig.json`](./tsconfig.json)). No `any`; index access is
  `T | undefined` — handle it.
- Path alias `@/* → src/*`. Always use `@/…` over relative paths
  beyond a single hop.
- Source files are `.ts` / `.tsx`. No `.js` or `.cjs` in `src/`.
- `tsx` is used for one-shot scripts under `scripts/`.

### Components

- **Default to RSC.** Add `"use client"` only when you need state,
  effects, browser APIs, or event handlers.
- **Cross-RSC links to MUI Buttons** must use
  `<ButtonLink>` / `<InlineLink>` from `src/components/ui/`.
- **Shared primitives** in `src/components/ui/` are the *only* place
  for Münzen badges, streak flames, level chips, and the 10 exercise
  type icons. Extend, don't re-implement.
- **Renderers** live in `src/components/exercises/renderers/` and are
  registered in `index.tsx`. Adding a type touches:
  1. `prisma/schema.prisma` (`ExerciseType` enum).
  2. `src/lib/exercises/schemas.ts` (content + answer + solution
     schemas + the three registries).
  3. A new renderer file + entry in `renderers/index.tsx`.
  4. `src/lib/exercises/grade.ts` (local grader, if applicable).
  5. `src/content/exercise-intros/<type>.ts` (intro copy).

### State & data

- **Server-first.** Data fetching happens in RSC pages or server
  actions, never in `useEffect`. Pass plain data into client
  components.
- **Mutations are server actions** (`actions.ts` files). They call
  `revalidatePath` to invalidate any RSC pages that depend on the
  mutated data.
- **Münzen mutations always go through `credit` / `debit` /
  `adminAdjust`** — never touch `user.muenzen` directly.
- **AI calls always go through `src/lib/ai.ts`** — never read
  `process.env.ANTHROPIC_API_KEY` elsewhere; gate on the exported
  `AI_CONFIGURED` instead.
- **Comments always go through `serializeComment` / `loadComments` /
  `loadComment`** so soft-deleted rows can never leak.

### Validation & error handling

- All external input (forms, request bodies, query params) is parsed
  with **Zod** before use.
- Server actions return discriminated unions
  (`{ ok: true, … } | { ok: false, error: 'rate_limited' | … }`)
  rather than throwing.
- API routes return appropriate HTTP status codes
  (401 / 403 / 404 / 400 / 429 / 200 / 201).
- Trust internal code; only validate at boundaries (user input,
  external APIs).

### i18n

- **No hardcoded UI strings** outside `messages/<locale>.json`. The
  exception is *content being learned* (German exercise content).
- Use `useTranslations("namespace")` in client components and
  `getTranslations({ locale, namespace })` in server components.

### Tests

- **Vitest** + jsdom + `@testing-library/react`. Tests live in
  `__tests__/` directories beside the source they cover.
- Mount UI inside the real theme using the `renderWithTheme` helper in
  `src/test/`.
- Coverage v8. Run `npm run test:coverage` for an HTML report under
  `coverage/`.

### Commits

- **One semantic commit per task** in the multi-agent flow:
  `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. The body
  uses `Co-Authored-By: Claude …` when commits are produced via the
  AI pipeline.

### Multi-agent workflow

Each task flows `@coder → @reviewer → @tester → @docs`. Coder writes
production code; reviewer audits (no tests, no docs); tester writes
tests (no production code); docs updates `CLAUDE.md`, `SPRINT_02.md`,
`ROADMAP.md`, etc.

---

## 6. Palette system & theme

All color, typography, radius, shadow, and shape tokens live in
[`src/theme/`](./src/theme/). Pages and components receive the theme
via `<AppThemeProvider>` in `src/app/[locale]/layout.tsx`, which calls
`createAppTheme(mode)` from [`@/theme`](./src/theme/index.ts).

### Hex policy

**Never hardcode hex anywhere outside `src/theme/`.** Use
`theme.palette.X`, `sx={{ color: 'text.primary' }}`, or MUI's
`color="X"` prop.

### Palettes

- [`src/theme/palette.ts`](./src/theme/palette.ts) defines both
  `lightPalette` and `darkPalette`.
- **Tinte & Bernstein** (light): ink-blue primary `#1e3a5f`, amber
  secondary `#c2860a`, paper background `#fbf7ef`. Typographic, warm,
  scholarly.
- **Dark mode** uses sky-300 + amber-400 over stone-950 for the same
  identity at night.
- **Custom keys** (augmented in `src/theme/augmentation.ts`):
  - `tertiary` — muted stone for de-emphasized chips.
  - `accentSoft` — pale amber background.
  - `successSoft` / `dangerSoft` — pale tints for status surfaces.
  - `surfaceAlt` — alternate panel background (heatmap zero bucket,
    code blocks).
- Use them via `theme.palette.X` or `color="X"` where supported.

### Typography

- Headings → **Fraunces** via CSS var `--font-fraunces`.
- Body / UI → **Inter** via CSS var `--font-inter`.
- Mono (CEFR tags, Münzen counts) → system `ui-monospace`.
- Loaded with `next/font/google` — no extra dep.
- **Always use MUI's `<Typography>`** to set type — never Tailwind
  `font-*` classes.

### Shape & elevation

- Inputs/buttons use the small radius from `shape`; cards use
  `RADIUS_CARD`; pills/chips use `borderRadius: 999`.
- Buttons lift with `translateY(-1px)` + shadow on hover via the
  `MuiButton` style override. **Never** use `hover:opacity-90`.
- Touch targets ≥ 44×44px enforced for `IconButton`, `MenuItem`,
  `ListItemButton`. Size-medium `Button` is 44px.
- Inputs always render at 16px (defeats iOS Safari focus-zoom).

### Color modes

- The user picks `'light' | 'dark' | 'system'`. Default `'system'`.
- Persisted in `localStorage` under
  `wortschatz:color-mode` (exported as `COLOR_MODE_STORAGE_KEY` from
  [`src/theme/ColorModeContext.tsx`](./src/theme/ColorModeContext.tsx)).
- **Use `useColorMode()`** from `@/hooks/useColorMode` — returns
  `{ mode, resolvedMode, setMode, toggle }`. Never access
  `localStorage` directly.
- **Anti-FOUC.** A blocking inline script in
  `src/app/[locale]/layout.tsx` writes `<html data-color-mode="…">`
  and `<html style="color-scheme: …">` before React hydrates, so the
  first paint matches the user's preference. Errors are swallowed
  (Safari private mode).
- All new UI must work in both modes — never reference a specific
  palette mode in a component.
- Header `<ColorModeToggle />` cycles `light → dark → system → light`
  with a distinct icon and localized aria-label/tooltip per state.

### MUI ↔ Tailwind coexistence (mandatory)

**MUI owns** Button, IconButton, Card/Paper, Chip, Avatar, TextField,
Dialog, Drawer, AppBar, Toolbar, Menu, Tooltip, Tabs, Typography.

**Tailwind owns** layout utilities only: `flex`, `grid`, `gap-*`,
`mx-auto`, `max-w-*`, `px-*`, `py-*`, `space-*`, `min-h-*`/`min-w-*`,
and responsive prefixes. Complex layouts can also use MUI
`<Box sx={{}}>` or `<Stack>`.

**Banned anywhere outside `src/theme/`:** hex colors, `bg-*`,
`text-*` (color variants — alignment utilities like `text-center`/
`text-left` are fine), `border-*`, `rounded-*`, `shadow-*`,
`font-display`/`font-sans`/`font-mono` Tailwind classes.

### Mobile-first responsiveness (mandatory)

- Works at 320 / 375 / 768 / 1024 / 1280+; **no horizontal scroll**.
- Wrap routed content in `mx-auto max-w-… px-4 sm:px-6`.
- Default 1 col on mobile; add columns at `sm:`/`md:`/`lg:`.
- Tables: `overflow-x-auto` **and** stacked card fallback.

---

## 7. Environment variables

All of these live (or should live) in `.env`. See
[`.env.example`](./.env.example) for the canonical list.

| Variable | Required | Purpose | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | **yes** | Postgres connection string. | `postgresql://wortschatz:wortschatz_dev@localhost:5432/wortschatz?schema=public` |
| `AUTH_SECRET` | **yes** | Signs JWTs / session tokens. | Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | **yes** in prod | Trusted base URL for callbacks. | `http://localhost:3000` (dev) / `https://wortschatz.app` (prod) |
| `AUTH_GOOGLE_ID` | optional | Google OAuth client ID. | Obtained at <https://console.cloud.google.com>. Without it, the "Continue with Google" button on `/login` fails. |
| `AUTH_GOOGLE_SECRET` | optional | Google OAuth client secret. | Pair with the ID above. |
| `ANTHROPIC_API_KEY` | optional (recommended) | Enables real Claude calls. Without it, `src/lib/ai.ts` returns deterministic stubs and writes nothing to the DB. | `sk-ant-…` |
| `ANTHROPIC_MODEL` | optional | Override the model for all three endpoints. **Add an entry to `AI_MODEL_PRICING_MICROCENTS_PER_TOKEN` in `src/config/limits.ts` for any new model id**, otherwise the cost estimate falls back to `0`. | `claude-sonnet-4-6` (default) |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | optional | Default UI locale. | `en` |
| `STORAGE_DRIVER` | reserved | Will pick the avatar storage backend once `vercel-blob`/`s3` is wired up. Currently no-op (avatars always write to `public/uploads/avatars/`). | `local` |

### Authorization redirect for Google OAuth

`http://localhost:3000/api/auth/callback/google` (dev) or
`https://<your-domain>/api/auth/callback/google` (prod).

---

## 8. Useful scripts

All run via `npm run …` (or `npx …` where indicated).

### App

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local dev server on `:3000`. |
| `npm run build` | Production build. |
| `npm run start` | Run the production build. |
| `npm run lint` | `next lint`. |
| `npm run typecheck` | `tsc --noEmit`. |

### Tests

| Script | Purpose |
| --- | --- |
| `npm test` | Run vitest once. |
| `npm run test:watch` | Vitest watch mode. |
| `npm run test:coverage` | Vitest + coverage v8 → `coverage/index.html`. |

### Database

| Script | Purpose |
| --- | --- |
| `npm run db:push` | Push the Prisma schema to the DB without a migration (fast local iteration). |
| `npm run db:migrate` | Generate + apply a migration (`prisma migrate dev`). Use this before commits. |
| `npm run db:generate` | Regenerate the Prisma Client (after schema edits). |
| `npm run db:studio` | Prisma Studio — browser UI for the DB. |
| `npm run db:seed` | Seed admin + teacher accounts. |
| `npm run db:generate-exercises` | Generate 50 exercises. Uses real Claude when `ANTHROPIC_API_KEY` is set; logs `AI mode: real|stub`. |
| `npm run db:migrate-exercise-i18n` | One-shot fixer to convert legacy single-locale `instructions`/`explanation` to the `{ en, pt, tr, uk }` shape. |
| `npm run db:seed-muenzen-history` | Backfill `ADMIN_ADJUSTMENT` rows for users with `muenzen > 0` and no transactions, so historical balances get an audit trail. |

---

## 9. Deployment

**Target.** Vercel (assumed; not yet configured).

**Branch.** `main`.

### Pre-flight checklist

- [ ] **Postgres provider configured** (Vercel Postgres, Neon,
      Supabase). `DATABASE_URL` set in the Vercel project env.
- [ ] **All required env vars set** in the Vercel UI (see
      [Environment variables](#7-environment-variables)). At minimum:
      `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` (your prod URL),
      `ANTHROPIC_API_KEY`. Add `AUTH_GOOGLE_ID/SECRET` if you want
      Google OAuth in prod.
- [ ] **Google OAuth redirect** set to
      `https://<your-domain>/api/auth/callback/google`.
- [ ] **Migrations applied.** All five Sprint-02 migrations plus
      `0_init` (verify the latter, currently untracked) must run on
      the prod DB before traffic. `npm run db:migrate` locally against
      a dev branch first; in CI, `prisma migrate deploy`.
- [ ] **Avatar storage migrated** to Vercel Blob or S3. The local FS
      under `public/uploads/avatars/` does **not** survive Vercel's
      ephemeral filesystem. Swap site is marked `TODO` in
      `src/app/api/profile/avatar/route.ts`.
- [ ] **Build hook.** Set `"build": "prisma generate && next build"`
      (or add a `postinstall` running `prisma generate`) so the Prisma
      Client is fresh on every deploy.
- [ ] **Default credentials changed.** Rotate the seed accounts
      (`admin@wortschatz.app` / `admin123`,
      `teacher@wortschatz.app` / `teacher123`) before exposing the DB.

### Deploy

```bash
# Install Vercel CLI once
npm i -g vercel

vercel link                    # Link the local repo to a Vercel project
vercel env pull .env.production.local
vercel deploy --prod
```

A push to `main` (after `vercel link`) will trigger a deploy
automatically.

---

## 10. Technical debt & open issues

Compiled from `ROADMAP.md` ("Discovered debt") and the carry-over
section of `SPRINT_02.md`. Sorted by severity.

### Critical (must fix before production)

| Item | Impact | Fix |
| --- | --- | --- |
| **5 Sprint-02 migrations + `0_init` not applied to a live DB** | App will not run against a fresh Postgres. | `prisma migrate dev` on dev DB; `prisma migrate deploy` on prod. Verify the untracked `0_init/` folder before applying. |
| **Avatar storage on local filesystem** (`public/uploads/avatars/`) | Won't survive Vercel/Netlify ephemeral filesystems — uploads vanish on every deploy. | Swap to Vercel Blob or S3. `TODO` in `src/app/api/profile/avatar/route.ts`. Wire `STORAGE_DRIVER` env var. |
| **`prisma/migrations/0_init/` is untracked in git** | Risk of being missed on a fresh checkout; can lead to a divergent prod schema. | `git add prisma/migrations/0_init/` after verifying contents. |

### Moderate (track, fix soon)

| Item | Impact | Fix |
| --- | --- | --- |
| **JWT not refreshed after avatar upload** | Header chip only picks up the new avatar at next sign-in. Dashboard already revalidates. | Trigger a session refresh from the upload route, or call NextAuth's `update()` from the client. |
| **`submitExerciseAttempt` allows the same exercise to be re-rewarded** | Users can grind one exercise for unlimited Münzen. | Add unique `(userId, exerciseId)` index on `UserExercise` (or a "rewarded" flag) and short-circuit `credit` when one already exists. |
| **Comments rate-limit count race** | Two concurrent submits from the same user can both observe `count = 5` and both succeed. | Wrap the count + insert in a single `prisma.$transaction`, or use a counter table. Acceptable for v1. |
| **Like-toggle P2002 race-catch branch untested** | The handler catches Prisma's `P2002` on `(commentId, userId)` to make double-likes idempotent, but no test exercises the catch path. | Add a vitest case that mocks the Prisma client to throw `P2002`. |

### Low (cosmetic / nice-to-have)

| Item | Impact | Fix |
| --- | --- | --- |
| **`UserPreference.key` overloads `ExerciseType`** | When a second preference kind arrives, we'll either expand `ExerciseType` (wrong) or migrate the column. | Promote `key` to a dedicated `Pref` enum the moment a non-intro preference appears. |
| **Comments `editedAt` always bumps** | A no-op edit still shows an "edited" indicator. | Compare `data.content === existing.content` and short-circuit. |
| **`ButtonLink` / `InlineLink` shims at 0% test coverage** | Small surface area but uncovered. | Add a render-and-click test for each. |
| **`ExerciseTypeIcon` branch coverage at 82.6%** | Only the `primary` color mapping is exercised; named-palette branches uncovered. | Add a parameterized test over all color variants. |
| **`computeReward` only credits first attempt** | (See "moderate" item above — same root cause.) | Same fix. |
| **`getRandomExerciseOfType` regression risk** | Was patched in Sprint 02 to no longer silently fall back when a level filter returns zero — protect with a regression test. | Add a vitest case. |

### Carry-over (from before Sprint 02)

| Item | Impact | Fix |
| --- | --- | --- |
| **Listening-exercise audio not wired** | All listening exercises render the transcript instead of audio. | Pick a TTS (ElevenLabs / OpenAI `tts-1`) + an asset host. Update `ListeningComprehensionContent` to require `audioUrl`. |
| **Google OAuth credentials blank in dev** | "Continue with Google" fails until set. | Create OAuth credentials at <https://console.cloud.google.com>, fill `AUTH_GOOGLE_ID/SECRET`. |
| **Per-user time zones for streaks not modeled** | The daily-streak bonus is awarded on the first passing exercise of the calendar *UTC* day. | Add `User.timezone` and use it in `isSameCalendarDay`. |
| **Server actions outside Tasks 4 / 6 / 8 still uncovered by tests** | Risk of regressions on `register` / `login` / `submit` / `review`. | Add vitest cases for each. |
| **Local grading (`src/lib/exercises/grade.ts`) untested** | Closed-form correctness rests on the local grader; bugs would silently mis-score. | Add cases per type. |
| **Playwright end-to-end missing** | No automated coverage of login → submit-exercise. | Add Playwright + a single golden flow. |
| **Admin UX minimal** | No pagination, search, exercise CRUD, or teacher submission form. | Build out as needed. |

---

## 11. Critical user flows

### A. New user (Credentials)

1. Hits `/` → landing page in their browser locale (or `en` by
   default).
2. Clicks **Sign up** → `/register`.
3. Submits email + password. `actions.ts` hashes with bcrypt and
   creates a `User` with `role: USER`.
4. Auto-signs them in (Credentials provider) and redirects to
   `/dashboard`.
5. Dashboard renders four chart placeholders (no data yet).
6. Visits `/exercises/<TYPE>` for the first time → sees the
   `IntroScreen` for that type. Can tick "Don't show again" before
   clicking **Let's go** (writes a `UserPreference` row).

### B. Submit an exercise

1. Dashboard or `/exercises` → picks a type or a specific exercise.
2. (Type runner) `IntroScreen` if `getSkipIntro(userId, type)` is
   `false` for that type; otherwise jump straight to the exercise.
3. The renderer for that type mounts; user fills the answer.
4. **Submit** dispatches `submitExerciseAttempt` (server action).
   - Local grade via `src/lib/exercises/grade.ts`.
   - If `AI_CONFIGURED`, also calls `evaluateAnswer` for AI feedback.
     If rate-limited → soft-fall back to local grade and still record.
   - Always inserts a `UserExercise` row with `score`, `feedback`,
     `answer` JSON.
   - If `score ≥ 60` AND it's the first passing attempt for this user
     × exercise: write `EXERCISE_COMPLETE` (+10) via `credit`.
   - If `score === 100`: also `PERFECT_SCORE_BONUS` (+5).
   - If first passing exercise of the calendar day:
     `DAILY_STREAK` (+20).
5. UI flips to `<ExerciseResult>` — score ring + reward callout +
   feedback. Below it, `CommentsSection` (collapsed accordion) is
   available for discussion.

### C. AI text review

1. User visits `/review` (auth required).
2. Pastes German text + selects a level (defaults to
   `user.learningLevel ?? 'B1'`).
3. **Submit** dispatches `reviewText` server action.
   - Refuses if balance < 30 Münzen.
   - Calls `reviewText` from `src/lib/ai.ts` with the `userId`.
     Cache TTL is 0, so every call hits Anthropic.
   - On success: `debit(userId, 30, 'SPENT_AI_REVIEW',
     <reviewRequestId>)` and inserts an `AIReviewRequest` row.
   - On `AiRateLimitedError`: returns
     `{ ok: false, error: 'rate_limited' }`; UI shows the
     `review.rateLimited` localized string. Münzen are **not**
     debited.
4. Feedback renders inline.

### D. Admin approves a draft

1. Admin signs in → `/admin` (page rejects with 404 for non-admin).
2. List of `Exercise.status === 'DRAFT'` rows. Admin reviews each.
3. **Approve** → `actions.ts` flips `status` to `PUBLISHED`. The
   exercise becomes visible on `/exercises` and to all type runners.
4. **Reject** → flip `status` to `ARCHIVED` (kept for audit, hidden
   from learners).
5. Admin can also adjust any user's Münzen balance from the same page
   via `<AdminAdjustForm>` (delta capped at ±100 000, optional 280-char
   note). Writes an `ADMIN_ADJUSTMENT` row.

### E. Comment on an exercise

1. User opens an exercise → `CommentsSection` accordion at the bottom.
2. Expands → `CommentList` fetches `GET /api/exercises/[id]/comments`
   (public; ordered by like count desc + `createdAt` desc).
3. Writes a comment in `CommentComposer` (live char counter against
   `COMMENT_MAX_LENGTH = 500`).
4. **Submit** → `POST /api/exercises/[id]/comments`:
   - 401 if unauth.
   - 400 if empty / too long / contains a blocked word
     (`findBlockedWord`).
   - 429 if more than 5 comments in the last 60 s.
   - 201 on success; the row is appended to the list.
5. Hearts → `POST /api/comments/[id]/like` (toggle, P2002-safe).
6. **Edit** is **author only** (admins do not have edit privilege).
   **Delete** is author OR admin (soft delete; the row stays with
   masked content).

---

## 12. Tests

### Stack

- **Runner.** [Vitest](https://vitest.dev) `^4.1.6`.
- **DOM.** `jsdom` `^29.1.1`.
- **Component utilities.** `@testing-library/react` `^16.3.2`,
  `@testing-library/dom` `^10.4.1`, `@testing-library/jest-dom`
  `^6.9.1`, `@testing-library/user-event` `^14.6.1`.
- **Coverage.** `@vitest/coverage-v8` `^4.1.6`. Output to
  `coverage/index.html`.

### Layout

- Test files live under `__tests__/` directories beside the source
  they cover.
- Helpers in `src/test/`:
  - `renderWithTheme(ui)` — mounts `ui` inside a real
    `<AppThemeProvider>`. Use this for any component that touches the
    palette / typography.
  - `setup.ts` — registers `@testing-library/jest-dom` matchers.
- `vitest.config.ts` configures the alias `@ → src` and the jsdom
  environment.

### Current status

- **427 tests across 33 files**, all green (post-Sprint 02).
- **100% coverage** on:
  - `src/theme/**`
  - `src/config/limits.ts`, `src/lib/ai-cache.ts`,
    `src/lib/ai-rate-limit.ts`
  - `src/lib/muenzen.ts`
  - `src/lib/dashboard/aggregations.ts`
  - `src/lib/profile/avatar.ts` and `src/app/[locale]/profile/actions.ts`
  - `src/lib/comments/serialize.ts`, `src/lib/comments/queries.ts`,
    `PATCH` and `DELETE` routes for comments
  - `src/lib/preferences/actions.ts`
  - `src/hooks/useColorMode`, `src/theme/ColorModeContext`,
    `<ColorModeToggle>`
- **96%+** on `src/lib/ai.ts`.

### Known gaps

- `src/lib/exercises/grade.ts` (local grader)
- Server actions outside Tasks 4 / 6 / 8 (`register`, `login`,
  `submit`, `review`)
- `ButtonLink` / `InlineLink` shims (0% — low risk)
- `ExerciseTypeIcon` named-palette branches (82.6% branch cover)
- Like-toggle P2002 race-catch branch
- Playwright end-to-end (none yet)

### Running

```bash
npm test               # one-shot
npm run test:watch     # watch
npm run test:coverage  # + HTML coverage report
```

---

## 13. Key dependencies & rationale

| Package | Why |
| --- | --- |
| `next@15` | App Router (RSC, nested layouts, server actions, file-based locale segment). The Pages Router was rejected for the friction of mixing RSC and locale routing. |
| `@mui/material@9` + `@emotion/react/styled` | Component breadth (Buttons, Selects, Tabs, Dialog) with built-in a11y and a strong theming model. Token discipline (Sprint 02 Task 1) keeps colors out of components. |
| `@mui/material-nextjs@9` | Cache provider that lets MUI play nicely with App Router RSC. |
| `tailwindcss@4` (beta) | Layout utilities only. Coexistence rule defined in Sprint 02 Task 1; rewriting flex/grid wrappers as MUI `<Stack>`/`<Box>` would inflate the diff without value. |
| `prisma@5` | Type-safe ORM, transparent migrations, excellent JSON column support, Postgres-first feature set, mature `@auth/prisma-adapter`. |
| `@prisma/client` | Generated client; instantiated as a singleton in `src/lib/db.ts`. |
| `next-auth@5` (beta) | `auth()` helper, edge-safe split (config used in middleware), JWT sessions, Google + Credentials providers. v4 had a clumsier session model. |
| `@auth/prisma-adapter` | Persists OAuth `Account`/`Session`/`VerificationToken` rows automatically. |
| `next-intl@3` | Locale-segment routing, ICU plurals, typed navigation helpers. |
| `recharts@3` (Task 5) | Plays nicely with MUI's emotion theming because colors come in as `stroke`/`fill` props (read from `useTheme()`). Tremor was rejected because it's Tailwind-first and would have undermined the MUI-owns-theming rule. Lazy-loaded via `next/dynamic({ ssr: false })`. |
| `sharp@0.34` (Task 6) | Avatar pipeline: rotate → cover-resize → WebP encode + spoof defense via `metadata()` re-decode. |
| `@anthropic-ai/sdk@0.32` (Task 3) | Claude client. Imported in **only** `src/lib/ai.ts`. Modeled around `messages.create`. |
| `bcryptjs@2` | Password hashing for the Credentials provider. Pure JS so it ships in the edge runtime if needed. |
| `zod@3` | Schema validation for env, request bodies, exercise content/answer/solution shapes, and form data. |
| `vitest@4` + `@vitest/coverage-v8@4` | Fast Jest-compatible runner; v8 coverage for accurate branch counts. |
| `jsdom@29` | DOM shim for vitest. |
| `@testing-library/*` | Idiomatic component testing. |
| `tsx@4` | Run TypeScript scripts (`scripts/seed.ts` etc.) without a separate build step. |

### React 19 RC + MUI v9

`React 19 RC` was required by Next.js 15. `--legacy-peer-deps` was
needed to install MUI v9 + emotion alongside it on first install.
Document if friction recurs.

---

## 14. Local quickstart

```bash
# 1. Clone
git clone <repo-url> wortschatz
cd wortschatz

# 2. Install deps (use --legacy-peer-deps if you hit a peer-dep error
#    from MUI v9 + React 19 RC)
npm install

# 3. Start Postgres
docker compose up -d           # PostgreSQL 16 on :5432
                                # Volume: wortschatz_pg_data

# 4. Configure env
cp .env.example .env
# Then edit .env:
#   - AUTH_SECRET → openssl rand -base64 32
#   - ANTHROPIC_API_KEY → optional but recommended
#   - AUTH_GOOGLE_ID/SECRET → optional, only if you want Google OAuth

# 5. Generate the Prisma client
npm run db:generate

# 6. Apply schema (push for fast iteration, or migrate to track
#    history)
npm run db:push                # OR: npm run db:migrate

# 7. Seed the test users (admin + teacher)
npm run db:seed

# 8. (Optional) Generate exercises — uses real Claude when
#    ANTHROPIC_API_KEY is set; deterministic stubs otherwise.
npm run db:generate-exercises

# 9. Run the dev server
npm run dev                    # http://localhost:3000
```

The default landing redirects to `/en`. Switch via the locale picker
in the header.

### Verifying things work

- Run `npm run typecheck` and `npm test` — both should be clean.
- Open Prisma Studio: `npm run db:studio`.
- Sign in as `admin@wortschatz.app / admin123` → visit `/admin` to
  approve drafts.
- Sign in as a fresh user → submit an exercise → confirm a
  `UserExercise` row and one or more `MuenzenTransaction` rows appear.

---

## 15. Test users

Seeded by `npm run db:seed`. **Change before exposing the DB beyond
localhost.**

| Email | Password | Role |
| --- | --- | --- |
| `admin@wortschatz.app` | `admin123` | `ADMIN` |
| `teacher@wortschatz.app` | `teacher123` | `TEACHER` |

---

## 16. Architectural decisions (implicit ADRs)

> No formal ADR folder; these are the rationales stored in `CLAUDE.md`
> and `SPRINT_02.md`, distilled here.

### Why MUI + Tailwind coexistence?

Decided in **Sprint 02 Task 1**. MUI dominates components with state /
variant / color / surface semantics — Buttons, Cards, Inputs, Tabs,
Typography — to inherit a11y, focus rings, and theme tokens for free.
Tailwind is kept for layout utilities (`flex`, `grid`, spacing,
responsive prefixes) because rewriting every wrapper as
`<Stack>` / `<Box>` would inflate the diff without value. Color,
typography, radius, shadow, and shape always flow through
`src/theme/`. **Banned anywhere outside `src/theme/`:** hex,
`bg-*`, `text-*` (color), `border-*`, `rounded-*`, `shadow-*`,
`font-*`.

### Why MUI v9 + emotion (not Tailwind alone)?

The original Sprint 02 plan was Tailwind-only. Mid-flight it was
revised to MUI to inherit accessibility primitives and a real theme
system before the surface area grew further — keeping the existing
"Tinte & Bernstein" identity but moving its delivery into MUI tokens.

### Why Recharts (not Tremor or Visx)?

Recharts plays nicely with MUI's emotion-based theming because it
exposes `stroke`/`fill` as plain props (so colors come from
`useTheme()` cleanly). Tremor is Tailwind-first and would have
undermined the MUI-owns-theming rule. Visx requires more wiring.
Recharts is lazy-loaded via `next/dynamic({ ssr: false })` because
`ResponsiveContainer` touches `ResizeObserver`. The 90-day heatmap is
hand-rolled SVG (no extra dep).

### Why Postgres for the AI cache (not Redis)?

The cache is a simple `(key) → response JSON + expiresAt` lookup with
modest write rates. Adding Redis would mean another moving part in dev
and prod for what is effectively one indexed table. Postgres also lets
the cache, rate-limit, and usage rows live in the same transactional
boundary as the rest of the app, which simplifies reasoning. Revisit if
cache hit latency becomes a problem at scale.

### Why integer microcents (not float USD)?

Float drift on cumulative cost is unacceptable for billing tracking.
Microcents (1 USD = 100 000 µ¢) keep `AiUsage.costMicrocents` as `Int`
and compose cleanly with Postgres aggregates.

### Why JWT sessions (not database sessions)?

Edge-runtime middleware can read JWTs without a Prisma round-trip,
which keeps the locale + auth gate fast. The trade-off is that profile
fields like `avatarUrl` carry on the token and only refresh on
sign-in — see [debt](#10-technical-debt--open-issues).

### Why soft delete on comments?

Reply chains keep their context even when a parent is removed. A
tombstone with masked content + author preserves the conversation
shape. The serializer and the queries both filter `deletedAt: null`
to avoid leaks.

### Why a separate `MuenzenTransaction` row per reason?

Audit trail. The dashboard, the `/profile/historico` page, and any
future "why did I get +35 Münzen?" UI all read the ledger directly. An
itemized ledger also keeps `adminAdjust` honest — admin actions are
visible without a special audit table.

### Why hand-written migrations during Sprint 02?

The dev environment had no live Postgres, so `prisma migrate dev`
couldn't generate them. The hand-written SQL is idempotent
(`ALTER TYPE … ADD VALUE IF NOT EXISTS`) and will be picked up on the
next `prisma migrate dev/deploy`.

---

## 17. Glossary

| Term | Meaning |
| --- | --- |
| **Wortschatz** | German for "word treasure" — the app name. |
| **Münzen** | German for "coins" — the in-app currency. Earned by completing exercises, spent on AI text review. |
| **Tinte & Bernstein** | The visual identity. *Tinte* (ink) is the primary blue; *Bernstein* (amber) is the secondary accent. |
| **Streak** | Consecutive calendar days (UTC) on which the user completed at least one passing exercise. |
| **Score** | 0–100 integer on `UserExercise`. `≥ 60` is "passing". `100` triggers the perfect-score bonus. |
| **CEFR level** | A1 / A2 / B1 / B2 / C1 / C2. Set on every `Exercise.level` and (optionally) on `User.learningLevel`. The `/review` page uses the user's level (default `B1`). |
| **ExerciseType** | One of 10 enum values driving renderer + grader + intro selection. See [Exercise system](#exercise-system). |
| **MuenzenReason** | Enum on `MuenzenTransaction`. Determines how a row is shown in the history. |
| **`pickLocalized(value, locale)`** | Reads a `{ en, pt, tr, uk }` JSON blob from `Exercise.instructions` / `explanation` with English fallback. |
| **`AI_CONFIGURED`** | Boolean exported from `src/lib/ai.ts`. True iff `ANTHROPIC_API_KEY` is set. The only correct way to gate AI behavior. |
| **AiCache / AiRateLimit / AiUsage** | The three Postgres tables that back the Claude integration. See [Claude integrations](#claude-integrations). |
| **Soft delete** | Setting `deletedAt = now()` on a row instead of removing it. Used on `ExerciseComment`. |
| **RSC** | React Server Components. Default rendering mode for everything under `src/app/[locale]/**/page.tsx` unless the file declares `"use client"`. |
| **Server action** | A function exported from a `actions.ts` file with `"use server"` at the top. Called from client components; runs on the server. |
| **`renderWithTheme`** | Test helper in `src/test/` that mounts a component inside the real `<AppThemeProvider>`. |
| **Multi-agent flow** | The Sprint-02 working pattern: `@coder → @reviewer → @tester → @docs`, one semantic commit per task. |
