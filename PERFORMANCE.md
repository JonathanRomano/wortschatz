# Performance — Sprint 03.5 hotfix

After the Sprint 03 monorepo split, dev-mode page loads regressed from
sub-second to 3–10 s. This file tracks the baseline, the fixes
applied, and the resulting numbers. Methodology is small and
repeatable: nuke `apps/web/.next/`, start `pnpm --filter
@wortschatz/web dev`, cold-curl the same three URLs in order, touch a
leaf component, re-curl `/pt` for a hot-reload number.

## Methodology

```bash
rm -rf apps/web/.next
pnpm --filter @wortschatz/web dev   # background, capture log
# wait for "Ready in"
curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/pt
curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/pt/dashboard
curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/pt/exercises/FILL_IN_THE_BLANK
# touch a leaf component, re-curl the same /pt for hot-reload timing
```

All numbers below are the **Next.js-reported compile/serve times** from
the dev log. Module counts are also from the dev log. Single-run
samples — cold-compile times are noisy (±15% run-to-run).

Environment: WSL2 on ext4 (`/home/jonathan/wortschatz`), Node 22,
pnpm 9.15.9, Next 15.0.3.

## Baseline (before fixes)

Server ready: **1324 ms**

| Route                                           | Compile | Serve     | Modules |
| ----------------------------------------------- | ------- | --------- | ------- |
| `/pt` (cold)                                    | 5.5 s   | 6563 ms   | 2162    |
| `/pt/dashboard` (cold, 307)                     | 9.2 s   | 10112 ms  | 3167    |
| `/pt/exercises/FILL_IN_THE_BLANK` (cold, 307)   | 2.5 s   | 3436 ms   | 3943    |
| Hot reload (touch `MuenzenBadge.tsx` → `/pt`)   | 538 ms  | 263 ms    | 3957    |

Webpack also emits this warning on the dashboard compile, hinting at
expensive cache serialization:

```
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings
    (128kiB) impacts deserialization performance (consider using
    Buffer instead and decode when needed)
```

## After fixes

Server ready: **1270 ms** (essentially unchanged)

| Route                                           | Compile | Serve     | Modules | Δ vs baseline    |
| ----------------------------------------------- | ------- | --------- | ------- | ---------------- |
| `/pt` (cold)                                    | 6.6 s   | 7630 ms   | 2161    | +16% (run noise) |
| `/pt/dashboard` (cold, 307)                     | 9.5 s   | 10413 ms  | 3166    | +3% (run noise)  |
| `/pt/exercises/FILL_IN_THE_BLANK` (cold, 307)   | 1.6 s   | 2539 ms   | 3796    | **−26%**         |
| Hot reload (touch `MuenzenBadge.tsx` → `/pt`)   | 430 ms  | 203 ms    | 3810    | **−20% / −23%**  |

Tests: 422 passed (no regressions).

## What was applied (`apps/web/next.config.ts`)

1. **`serverExternalPackages`** for `@prisma/client`,
   `@anthropic-ai/sdk`, `sharp`, `bcryptjs`. These are all server-only;
   externalizing them keeps their internals out of the dev compile.
2. **`experimental.optimizePackageImports`** for `@mui/material`,
   `@mui/icons-material`, `recharts`. The biggest beneficiary is the
   dashboard's recharts barrel; MUI consumers were already deep-path.
3. **`experimental.webpackBuildWorker: true`** — runs webpack
   compilation in a worker thread so the main process stays responsive
   during on-demand route compiles.

Also applied: `turbo.json` cleanup (`globalDependencies` for env
files + `tsconfig*.json`, declare `.tsbuildinfo` and `coverage/`
outputs). This doesn't affect dev mode but tightens `pnpm test` /
`pnpm typecheck` caching for CI and local reruns.

## What was tried and rolled back

**Turbopack (`next dev --turbo`)** — failed on two fronts and was
reverted:

1. `@wortschatz/config` and friends ship source-only with NodeNext-
   style `.js` extensions in their internal imports
   (`from "./constants.js"`). Webpack handles this via the
   `extensionAlias` rule in `apps/web/next.config.ts`, but Turbopack
   doesn't read webpack config and doesn't rewrite the extensions
   itself even with `moduleResolution: "bundler"` in every tsconfig.
2. MUI v9 ships per-component `proxy.js` files under `.mjs`
   directories (e.g. `@mui/material/AppBar/AppBar.mjs/proxy.js`).
   Webpack resolves these via the package's `exports` field;
   Turbopack 15.0.3 throws on the unusual extension layout.

Both blockers require non-trivial work to clear: a `dist/` build for
every workspace package (eliminates the `.js` → `.ts` rewrite need)
and either a MUI upstream fix or a downgrade. Deferred — the webpack
config still works fine.

## What was deliberately not done

- **`rm -rf node_modules pnpm-lock.yaml`** — destructive,
  unlikely to help on a healthy install.
- **Pre-built `dist/` migration for `@wortschatz/*` packages.** This
  is the largest remaining lever for cold-compile time. Webpack would
  skip the SWC transpile pass on every package import and Turbopack
  would become reachable. It's also the largest single change
  (every package gets a `tsc` build step, every consumer's import
  path stays the same but the underlying file changes). Worth doing
  but doesn't fit in a hotfix; track in `ROADMAP.md`.
- **`postinstall: prisma generate`** in `@wortschatz/database`.
  Runs on every `pnpm install` across the whole repo, fragile.
- **`swcMinify`, `experimental.turbo` config object** — both stale
  options in Next 15.

## Where the time goes (honest assessment)

The cold-compile cost is dominated by:

1. **MUI module graph (~1500–2500 modules per route).** Even with
   deep-path imports, MUI's emotion + style-engine internals are
   pulled in eagerly. `optimizePackageImports` helps marginally.
2. **Workspace package transpile.** `@wortschatz/database` re-exports
   everything from `@prisma/client`; even with Prisma external the
   re-export expansion still walks a wide module graph.
3. **next-intl + NextAuth machinery.** Both pull a few hundred
   modules into the locale layout and middleware.

The fixes target (1) and (2) lightly and worker-pool the whole
thing. The remaining cold-compile cost is the real cost of compiling
those module graphs once per route per cold start.

## Recommended dev workflow

```bash
# first time / after pulls
pnpm install
pnpm db:generate     # generates Prisma client into node_modules/.prisma

# daily
pnpm dev             # turbo fans out to apps/web + apps/api

# tests / typecheck (cached by turbo where unchanged)
pnpm test
pnpm typecheck
```

If a single route is unusably slow during iteration, restart dev
with a warm `.next/cache/` (don't `rm -rf .next` unless you have to)
— route compiles after the first are much faster.

## Open questions / next levers

- **Pre-built package dist** — biggest remaining cold-compile lever
  (see "deliberately not done"). Estimated 30–50% cold-compile
  improvement and unblocks Turbopack.
- **MUI v6 → v7 upgrade.** v7 ships pre-bundled component entry
  points and trims emotion's runtime; would also unblock Turbopack.
- **Split the `@wortschatz/database` barrel** — re-exporting
  `* from "@prisma/client"` makes the whole client visible to every
  importer's type-resolver. A narrower public surface (just `prisma`
  + the enums actually used) would shrink the graph further.
