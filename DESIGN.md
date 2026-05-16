# Wortschatz Design System

The visual language for Wortschatz is **Tinte & Bernstein** — ink blue
and amber on a paper-warm background. Functional, restrained, with one
warm accent that carries reward + identity. Everything visual flows
through the MUI theme in `apps/web/src/theme/`; no component should
hardcode a color, shadow, radius, or font.

This document is the contract. If you change a token, change it here
and in the theme — not in a component.

## Palette

All tokens live in `apps/web/src/theme/palette.ts`. The theme exposes
both light and dark variants; consumers reference them by name
(`theme.palette.primary.main`, `sx={{ color: "text.secondary" }}`) and
never by hex.

### Light mode

| Token              | Hex          | Use                                                |
| ------------------ | ------------ | -------------------------------------------------- |
| `primary.main`     | `#1e3a5f`    | Tinte (ink blue) — structure, CTAs, headings       |
| `secondary.main`   | `#c2860a`    | Bernstein (amber) — reward, streak flame, accents  |
| `tertiary.main`    | `#78716c`    | Warm stone — muted text, de-emphasized chips       |
| `success.main`     | `#047857`    | Correct answers, positive scores                   |
| `warning.main`     | `#c2860a`    | Same amber as secondary — soft alerts              |
| `error.main`       | `#b91c1c`    | Wrong answers, destructive actions                 |
| `background.default` | `#fbf7ef`  | Paper-warm page background                         |
| `background.paper` | `#ffffff`    | Cards, modals, headers                             |
| `text.primary`     | `#1c1917`    | Body text                                          |
| `text.secondary`   | `#78716c`    | Captions, hints                                    |
| `divider`          | `#e3d9c5`    | Borders, separators                                |
| `accentSoft.main`  | `#f5e6c2`    | Glow / badge tint behind amber-coloured glyphs     |
| `successSoft.main` | `#d1fae5`    | Positive surface tint                              |
| `dangerSoft.main`  | `#fee2e2`    | Negative surface tint                              |
| `surfaceAlt.main`  | `#f3ece0`    | Hover backgrounds, subdued progress rails          |

### Dark mode

Dark uses **lighter** primary/secondary (sky-300, amber-400) on a
stone-950 base, so the warm accent stays warm against the cooler
night palette.

| Token              | Hex          |
| ------------------ | ------------ |
| `primary.main`     | `#93c5fd`    |
| `secondary.main`   | `#fbbf24`    |
| `background.default` | `#0c0a09`  |
| `background.paper` | `#1c1917`    |
| `text.primary`     | `#fafaf9`    |
| `text.secondary`   | `#a8a29e`    |
| `divider`          | `#3f3a32`    |
| `accentSoft.main`  | `#4d3d10`    |
| `surfaceAlt.main`  | `#292524`    |

Mode is chosen by the user (`light | dark`); see
[Color mode](#color-mode) below.

## Typography

Defined in `apps/web/src/theme/typography.ts`.

- **Fraunces** (`var(--font-fraunces)`) — display / headings. Optical
  axes `SOFT`, `WONK`, `opsz` for a slightly warmer crystal at large
  sizes.
- **Inter** (`var(--font-inter)`) — body, UI, captions.

| Variant | Family   | Size   | Use                              |
| ------- | -------- | ------ | -------------------------------- |
| `h1`    | Fraunces | 3rem   | Page titles. Sprint 04 commits scale this up to 3–4rem at md/lg for landing/dashboard. |
| `h2`    | Fraunces | 2.25rem| Section titles, exercise title  |
| `h3`    | Fraunces | 1.75rem| Stat values, prominent counts   |
| `h4`    | Fraunces | 1.375rem| Card titles, sub-section heads |
| `h5`    | Inter    | 1.125rem| Small headings                 |
| `body1` | Inter    | 1rem   | Body paragraphs                  |
| `body2` | Inter    | 0.875rem| UI text, list items             |
| `caption`| Inter   | 0.75rem | Hints, time stamps              |
| `overline`| Inter  | 0.75rem | Tag-like labels, ALL CAPS       |

**Rules**
- Never set `font-family` directly — use `<Typography variant=…>` or
  let MUI components inherit.
- Don't use Tailwind `font-*` classes; the theme controls type.
- For large display headings, bump `fontSize` via `sx` (as the landing
  and dashboard heroes do) rather than introducing new variants.

## Shape

`apps/web/src/theme/shape.ts`:

- `borderRadius: 6` — buttons, inputs.
- `RADIUS_CARD = 12` — Paper / Card components (set via `MuiPaper` and
  `MuiCard` overrides).
- `RADIUS_PILL = 9999` — chips, progress bars, badge dots.

## Spacing

Use `theme.spacing(n)`. The grid step is 8 px:

- `1` = 8 px (tight gaps inside a control)
- `2` = 16 px (between related items)
- `3` = 24 px (between sections inside a card)
- `4` = 32 px (between top-level page sections)
- `5+` = page-level whitespace on hero rows

Responsive prefixes from Tailwind (`px-4 sm:px-6`) are the **only**
Tailwind utilities allowed in components — layout, never color.

## Animation

Durations are short and uniform:

- **150 ms** — input/button micro-feedback (hover lift, color shift).
- **200–300 ms** — Fade / Grow / Collapse on result reveal, hover
  lifts on Cards.

Standard primitives:

- `MuiButton` hover: `translateY(-1px)` (theme override).
- Card hover (where interactive): `translateY(-4px)` + `boxShadow: 4`
  + `borderColor: secondary.main` (see exercise-type cards).
- Avatar (Profile): `scale(1.02)` + `boxShadow: 3` on hover.
- Comment like icon: pulses `scale(1.15)` on click.
- Exercise result block: `<Fade in timeout={300} />`.
- Profile saves: `<Snackbar>` with success/error severity.

**Never** use `hover:opacity-90` (Tailwind) or hand-rolled
`transition: all` — favor the patterns above.

## Component patterns

### Card

`apps/web/src/components/ui/Card.tsx` wraps `Paper`:

```tsx
<Card padding="md">…</Card>
<Card padding="lg" accent>…</Card>  // amber-tinted surface
```

For interactive type-picker cards, add hover lift inline:

```tsx
<Card
  sx={{
    transition:
      "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: 4,
      borderColor: "secondary.main",
    },
  }}
>
```

### Routed buttons

Across the RSC boundary, server pages use `<ButtonLink>` /
`<InlineLink>` (`src/components/ui/`) which wrap the next-intl `Link`.
Direct `<Button component={Link}>` doesn't cross client/server cleanly
in Next 15.

### Reward chips

- `MuenzenBadge` (currency)
- `StreakFlame` (consecutive days)
- `LevelChip` (CEFR level)

Both reward chips ship `size="sm" | "md" | "lg"` so they can sit in
the header (sm) or the dashboard hero (lg) without restyling.

### Forms

`TextField`, `Select`, `Slider` only. All MUI defaults; the theme sets
`variant="outlined"`, `size="medium"`, `fullWidth: true` for
`MuiTextField`. Inputs always render at 16 px (iOS Safari focus-zoom
defense).

## Layouts

- Pages live in `apps/web/src/app/[locale]/`.
- Routed content wraps in `<Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5 } }}>`
  — or `maxWidth="md"` for forms / dashboards, or a custom 800-px max
  for the exercise focus column.
- Grid: `<Box sx={{ display: "grid", gap: { xs: 2, sm: 3 }, gridTemplateColumns: ... }}>`
  rather than raw `<Grid>` for simple cases.
- Mobile-first: default to 1 column, add columns at `sm:`/`md:`/`lg:`.
- Touch targets ≥ 44 × 44 px (enforced by `MuiIconButton`,
  `MuiMenuItem`, `MuiListItemButton` defaults).

## Color mode

`apps/web/src/theme/Provider.tsx` owns the state; the choice is
persisted to `localStorage["wortschatz:color-mode"]` as `"light" |
"dark"`. The previous `"system"` option was removed in Sprint 04 to
simplify the toggle UX; old values migrate to `"light"`.

**FOUC + hydration safety contract** (load-bearing, do not loosen):

1. The locale layout (`apps/web/src/app/[locale]/layout.tsx`) injects
   a blocking inline script in `<head>` that reads localStorage and
   writes `<html data-color-mode="…">` plus `style.color-scheme="…"`
   before React hydrates.
2. `<html>` carries `suppressHydrationWarning` because that attribute
   is precisely the one the script adds after SSR.
3. `AppThemeProvider` keeps its `useState` initializer pure — both
   server and first client render produce a `"light"` tree so emotion
   emits the same class names. The user's actual choice is picked up
   in a `useLayoutEffect`, which runs synchronously **before** the
   browser paints, so the dark theme appears on the first visible
   frame for dark users.

This is the only correct way to combine emotion-hashed className SSR
with per-user theme preference; do not change it without rebuilding
the same guarantees.

## Dark mode rules

- Every new UI must work in both modes. Reference `palette.*`, never
  a specific mode.
- For elevation in dark, use `Paper` with the existing elevation
  scale; don't hand-mix RGBA shadows.
- Bright icon/emoji-style elements may need `opacity: 0.9` to avoid
  burning eyes on the dark bg.
- WCAG AA contrast: text.primary on background.default already
  exceeds 4.5:1 in both modes. text.secondary on background.paper is
  the closest edge — verify with browser DevTools when adding new
  muted text in dark.

## Banned

- Hex colors, `bg-*`, `text-* color variants` (Tailwind),
  `border-* color variants`, `rounded-*`, `shadow-*`, `font-*`
  outside `src/theme/`. The grep audit at the end of Sprint 04 was
  clean — keep it that way.
- Generic gradient backgrounds, glass / neumorphism, stock-photo
  hero imagery.
- `useState(() => readDocument…)` for theme — see "Color mode" above.
- Direct `localStorage` access for theme — use `useColorMode()`.

## Where things live

```
apps/web/src/
  theme/
    palette.ts            # color tokens
    typography.ts         # variant scale
    shape.ts              # radii
    shadows.ts            # elevation scale
    augmentation.ts       # custom palette key TS augmentation
    Provider.tsx          # AppThemeProvider + mode wiring
    ColorModeContext.tsx  # context + storage key
    index.ts              # createAppTheme + MUI component overrides
  components/
    ui/                   # design-system primitives
      Card.tsx, ButtonLink.tsx, InlineLink.tsx,
      MuenzenBadge.tsx, StreakFlame.tsx, LevelChip.tsx,
      ExerciseTypeIcon.tsx
    layout/               # header / footer / locale switcher / mobile drawer
    dashboard/            # chart wrappers
    exercises/renderers/  # 10 exercise type renderers
    comments/             # comment list / item / composer
```
