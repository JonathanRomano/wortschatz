# CLAUDE.md

Operational notes for AI assistants working in this repo.

## Stack

- Next.js 15 (App Router, React 19 RC)
- **Material UI v9 + emotion** — the styling and component system
- Tailwind CSS v4 — kept for layout-utility classes only (see coexistence rule)
- next-intl for i18n (`en`, `pt`, `tr`, `uk`)
- Prisma + PostgreSQL, NextAuth.js v5
- Fonts: `next/font/google` → **Fraunces** (display) + **Inter** (body)
- vitest + jsdom + `@testing-library/react` for tests

All routes nest under `src/app/[locale]/…`. The root layout is minimal —
locale HTML lives in `src/app/[locale]/layout.tsx`.

## Palette System + Material UI

All color, typography, radius, shadow, and shape tokens live in
`src/theme/`. Pages and components receive the theme via the
`<AppThemeProvider>` in `src/app/[locale]/layout.tsx`, which calls
`createAppTheme(mode)` from `@/theme`. **Never hardcode hex anywhere
outside `src/theme/`.**

- **Palettes.** `src/theme/palette.ts` defines both `lightPalette` and
  `darkPalette`. Light is active for now; the mode toggle (persistence +
  `prefers-color-scheme` + header switch) ships in Task 2.
- **Typography.** Headings use Fraunces via CSS var `--font-fraunces`,
  body uses Inter via `--font-inter`. MUI's `<Typography>` is the only
  way to set type — do not use Tailwind `font-*` classes.
- **Custom palette keys** (already augmented in `src/theme/augmentation.ts`):
  `tertiary`, `accentSoft`, `successSoft`, `dangerSoft`, `surfaceAlt`.
  Use them via `theme.palette.X` or MUI's `color="X"` where supported.
- **Hover behavior.** Buttons lift with `translateY(-1px)` + shadow on
  hover via the `MuiButton` style override in `src/theme/index.ts`. Never
  use `hover:opacity-90`.
- **Shape.** Inputs/buttons use the small radius from `shape`; cards use
  `RADIUS_CARD`; pills/chips use `borderRadius: 999` via MUI defaults.

## MUI ↔ Tailwind coexistence (mandatory rule)

**MUI owns** every component with state / variant / color / surface
semantics: Button, IconButton, Card/Paper, Chip, Avatar, TextField,
Dialog, Drawer, AppBar, Toolbar, Menu, Tooltip, Tabs, Typography. All
color, typography, radius, shadow, and shape values flow through the
theme.

**Tailwind owns** layout utilities only: `flex`, `grid`, `gap-*`,
`mx-auto`, `max-w-*`, `px-*`, `py-*`, `space-*`, `min-h-*`/`min-w-*`,
and responsive prefixes. Complex layouts can also use MUI `<Box sx={{}}>`
or `<Stack>` instead.

**Banned anywhere outside `src/theme/`**: hex colors, `bg-*`, `text-*`
(color variants — alignment utilities like `text-center`/`text-left` are
fine), `border-*`, `rounded-*`, `shadow-*`, `font-display`/`font-sans`/
`font-mono` Tailwind classes. Reach for the theme instead.

**Routing across the RSC boundary**: when a server page needs a
`<Button>` that navigates, use `<ButtonLink>` from
`src/components/ui/ButtonLink.tsx` — a client-side polymorphic shim that
wraps MUI's `Button` with the next-intl `Link`. Same for inline links
via `<InlineLink>`.

## Mobile-first responsiveness (mandatory)

- Works at 320 / 375 / 768 / 1024 / 1280+; no horizontal scroll.
- Touch targets ≥ 44×44px — enforced for `<IconButton>`, `<MenuItem>`,
  and `<ListItemButton>` via the theme defaults; size-medium `<Button>`
  is 44px too.
- Inputs always render at 16px (set in `MuiOutlinedInput` / `MuiInputBase`
  to defeat iOS Safari focus-zoom).
- Tailwind responsive prefixes only — no hardcoded widths.
- Wrap routed content in `mx-auto max-w-… px-4 sm:px-6`.
- Default 1 col on mobile; add columns at `sm:`/`md:`/`lg:`.
- Tables: `overflow-x-auto` **and** stacked card fallback.

## Shared UI primitives

Live in `src/components/ui/`: `MuenzenBadge`, `StreakFlame`, `LevelChip`,
`ExerciseTypeIcon`, `Card`, `ButtonLink`, `InlineLink`. Extend, don't
re-implement.

## Project layout

```
src/
  app/[locale]/                     Routed pages, locale-prefixed
  components/layout/                Header, Footer, LocaleSwitcher, MobileMenu
  components/ui/                    Shared design-system primitives
  components/exercises/renderers/   10 exercise type renderers
  theme/                            Palette system: palette, typography,
                                    shape, shadows, augmentation, Provider
  test/                             vitest setup + renderWithTheme helper
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

## Testing

`vitest` is the runner; tests live under `__tests__/` directories beside
the source they cover. Run `npm test`, `npm run test:watch`, or
`npm run test:coverage`. Theme + UI primitives are covered as of
Sprint 02 Task 1. Use the `renderWithTheme` helper from `src/test/` to
mount components inside the real theme.

## Multi-agent workflow (Sprint 02+)

Each task flows `@coder` → `@reviewer` → `@tester` → `@docs`. Coder
writes production code; reviewer audits (no tests, no docs); tester
writes tests (no production code); docs updates `CLAUDE.md`,
`SPRINT_02.md`, `ROADMAP.md`, etc. One semantic commit per task.

## What NOT to change without a request

- Prisma schema, API routes, grading, Münzen amounts, AI prompts
