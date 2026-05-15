# CLAUDE.md

Operational notes for AI assistants working in this repo.

## Stack

- Next.js 15 (App Router, React 19 RC), Tailwind CSS v4
- next-intl for i18n (`en`, `pt`, `tr`, `uk`)
- Prisma + PostgreSQL, NextAuth.js v5
- Fonts: `next/font/google` → **Fraunces** (display) + **Inter** (body)

All routes nest under `src/app/[locale]/…`. The root layout is minimal —
locale HTML lives in `src/app/[locale]/layout.tsx`.

## Visual identity — "Tinte & Bernstein"

Warm-academic, like a beautifully bound German textbook. Serif headings,
paper-warm background, ink-blue primary, amber accent for Münzen / streaks.

**Tokens** (defined in `src/app/globals.css`): `--background --surface
--surface-alt --muted` (paper layers), `--foreground --muted-foreground`,
`--border`, `--primary` (ink blue), `--accent` (amber), `--success`,
`--danger`. Reference via Tailwind classes — never hardcode hex.

**Type**: headings use `font-display` (Fraunces, `text-balance` on long
titles); body defaults to Inter (`--font-sans`), 16px floor; mono is for
tiny labels only (CEFR chips, M amounts).

**Shape & motion**: inputs/buttons `rounded-md`, cards `rounded-xl`, pills
`rounded-full`. Raised surfaces get `shadow-sm`. Primary buttons use
`hover:-translate-y-px` + `shadow-sm`, never `hover:opacity-90`.

**Shared UI primitives** live in `src/components/ui/`: `MuenzenBadge`,
`StreakFlame`, `LevelChip`, `ExerciseTypeIcon`, `Card`, `buttonClasses`.
Extend, don't re-implement.

## Mobile-first responsiveness (mandatory)

- Works at 320 / 375 / 768 / 1024 / 1280+; no horizontal scroll.
- Touch targets ≥ 44×44px (`min-h-11`); inputs always 16px.
- Tailwind responsive prefixes only — no hardcoded widths.
- Wrap routed content in `mx-auto max-w-… px-4 sm:px-6`.
- Default 1 col on mobile; add columns at `sm:`/`md:`/`lg:`.
- Tables: `overflow-x-auto` **and** stacked card fallback (see admin page).

## Project layout

```
src/
  app/[locale]/                     Routed pages, locale-prefixed
  components/layout/                Header, Footer, LocaleSwitcher, MobileMenu
  components/ui/                    Shared design-system primitives
  components/exercises/renderers/   10 exercise type renderers
  i18n/                             next-intl config + typed nav helpers
  lib/                              db, ai, muenzen, exercises/, review/
prisma/schema.prisma                All models + enums
messages/*.json                     UI translations (incl. `renderers` block)
```

## Exercise system rules

- **`ExerciseType` enum** is English in the DB. Display names come from
  `messages/*.json` (`exerciseTypes`, `exerciseTypeDescriptions`).
- **i18n content.** `Exercise.instructions` and `Exercise.explanation` are
  JSON `{ en, pt, tr, uk }` — read with `pickLocalized(value, locale)`.
  German `content`/`solution` stays in German regardless of locale.
- **Münzen are awarded only on the FIRST passing attempt** (`score ≥ 60`)
  per user+exercise. `submitExerciseAttempt` always records the attempt.
- **No hardcoded English/German UI strings in renderers.** Labels live in
  the `renderers` block in `messages/*.json`. (German is allowed only for
  the _content being learned_.)

## What NOT to change without a request

- Prisma schema, API routes, grading, Münzen amounts, AI prompts
- No new npm dependencies — Tailwind + existing stack only
