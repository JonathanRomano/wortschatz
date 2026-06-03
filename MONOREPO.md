# MONOREPO.md

How the Wortschatz monorepo is laid out, how to run it locally, and how
the pieces fit together. Read this before reaching for `npm`, `prisma`,
or `next` directly.

## Why a monorepo

Two apps, both writing to the same Postgres:

- **`apps/web`** — Next.js 15 (App Router) UI + lightweight CRUD. Stays
  on Vercel.
- **`apps/api`** — Express service for heavy/long-running work (Claude
  calls today; image processing and background jobs next). VPS-ready.

Sharing three packages so the two stay in lock-step:

- **`packages/database`** — Prisma schema + migrations + `prisma`
  singleton.
- **`packages/types`** — wire formats (`GeneratedExercise`,
  `AIEvaluation`, `ReviewResult`, `LocalizedText`, …).
- **`packages/config`** — pure constants (Münzen, AI rate limits,
  comment moderation, locales), zod schemas, `pickLocalized` /
  `estimateCostMicrocents` / `findBlockedWord` utilities.

## Layout

```
wortschatz/
├── apps/
│   ├── web/                  Next.js 15 + MUI v9 + next-intl. Vercel target.
│   └── api/                  Express 4 + helmet + zod. ESM.
├── packages/
│   ├── database/             @wortschatz/database — prisma + schema
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/index.ts      PrismaClient singleton
│   ├── types/                @wortschatz/types
│   │   └── src/{exercise,ai,user,muenzen,locale}.ts
│   └── config/               @wortschatz/config
│       └── src/{constants,env,validators,utils}.ts
├── docker-compose.yml        Postgres for dev
├── pnpm-workspace.yaml
├── turbo.json                Turbo 2.x `tasks` config
├── package.json              Workspace root + delegator scripts
└── MONOREPO.md / CLAUDE.md / PROJECT_OVERVIEW.md / SPRINT_02.md / SPRINT_03.md
```

## Tooling

- **Node ≥ 18**, **pnpm ≥ 9**. The root `package.json` pins
  `packageManager: pnpm@9.15.9` and `engines: { node: ">=18", pnpm:
  ">=9" }`.
- **Turborepo 2.x** orchestrates per-package `dev` / `build` / `test`
  / `typecheck` / `lint`. The config uses the 2.x `tasks` key (not the
  legacy `pipeline`).
- **pnpm workspaces** wire `@wortschatz/*` deps together via the
  `workspace:*` protocol. `.npmrc` sets `shamefully-hoist=true` to
  mirror npm's flat layout so Next.js / MUI / emotion peer-dep
  assumptions keep working through the transition.

## First-time setup

```bash
# 1. Install pnpm globally if you don't have it
npm install -g pnpm@9

# 2. Install all workspaces
pnpm install

# 3. Generate the Prisma client (writes into node_modules/.prisma/client)
pnpm db:generate

# 4. Start Postgres
docker compose up -d

# 5. Apply migrations + seed
pnpm db:migrate         # creates / updates schema
pnpm db:seed            # admin + teacher accounts

# 6. Per-app env files — both are gitignored
cp apps/web/.env.example apps/web/.env  # fill in NEXTAUTH_SECRET etc
cp apps/api/.env.example apps/api/.env  # fill in INTERNAL_API_SECRET

# The web's INTERNAL_API_SECRET MUST equal the api's. Use the same
# value or one app will 401 every call. Generate with:
#   openssl rand -base64 32
```

## Running locally

Two terminals (or one with `pnpm run dev` to start both via turbo):

```bash
# Terminal 1 — Express on :4000
pnpm dev:api

# Terminal 2 — Next.js on :3000
pnpm dev:web

# Or both in parallel:
pnpm dev          # turbo run dev across all workspaces
```

Smoke-test the api directly:

```bash
curl http://localhost:4000/health
# { "status": "ok", "database": "connected" }

SECRET=$(grep INTERNAL_API_SECRET apps/api/.env | cut -d'"' -f2)
curl -X POST http://localhost:4000/ai/review-text \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: $SECRET" \
  -H "X-User-Id: dev-user" \
  -d '{"text":"Ich bin nach Berlin gefahren.","level":"B1"}'
```

## Common commands

All run from repo root:

| Command                          | What it does                                   |
| -------------------------------- | ---------------------------------------------- |
| `pnpm dev`                       | `turbo run dev` — web + api in parallel        |
| `pnpm dev:web` / `pnpm dev:api`  | Run just one                                   |
| `pnpm build`                     | `turbo run build` — typechecks and builds      |
| `pnpm test`                      | `turbo run test` — vitest suites across apps   |
| `pnpm typecheck`                 | `turbo run typecheck` — tsc --noEmit on each   |
| `pnpm db:generate`               | Regenerate Prisma client                       |
| `pnpm db:migrate`                | `prisma migrate dev` against packages/database |
| `pnpm db:push`                   | `prisma db push` for fast iteration            |
| `pnpm db:seed`                   | Run packages/database/prisma/seed.ts           |
| `pnpm db:studio`                 | Open Prisma Studio                             |
| `pnpm db:generate-exercises`     | Admin: generate 50 exercises via Claude (web)  |

Target a single workspace:

```bash
pnpm --filter @wortschatz/web run test
pnpm --filter @wortschatz/api run dev
pnpm --filter @wortschatz/database run generate
```

## Imports

Always prefer the package barrel over the in-tree alias:

```ts
// ✅ Good
import { prisma } from "@wortschatz/database";
import type { ExerciseType } from "@wortschatz/database";
import { MUENZEN_REWARDS, pickLocalized } from "@wortschatz/config";
import type { ReviewResult, LocalizedText } from "@wortschatz/types";

// ❌ Avoid — these in-tree modules were deleted in Sprint 03
import { prisma } from "@/lib/db";
import { findBlockedWord } from "@/config/moderation";
import { LocalizedText } from "@/lib/exercises/i18n";
```

Note that `@prisma/client` types are re-exported from
`@wortschatz/database`, so you never need to import directly from
`@prisma/client` (and shouldn't — that path doesn't exist in the api's
node_modules layout once the api goes to a VPS).

## web ↔ api boundary

Web calls api via `apps/web/src/lib/api-client.ts`. Every request ships:

- `X-Internal-Secret`: must equal both sides' `INTERNAL_API_SECRET`.
  Constant-time compared on the api with `sharedSecretAuth`.
- `X-User-Id`: the acting user's id (resolved server-side from the
  NextAuth session before the request leaves the web). Omitted for
  admin/system calls; the api then skips per-user rate limits.

Why shared-secret + header rather than a JWT:

- NextAuth v5 sessions are JWE-encrypted by default; verifying them in
  Express would mean shipping `@auth/core` to the api.
- The two services run in the same trust zone (private network in
  prod). A shared secret + the web's session-resolved user-id header
  is the simplest correct boundary.
- **Never expose this auth to browsers** — the api isn't designed to
  validate browser sessions.

A 429 from the api maps back to `AiRateLimitedError` in the web so
callers' existing `err instanceof AiRateLimitedError` branches keep
working.

## API Boundary Rules

Two HTTP surfaces exist. Where new code goes is not a matter of preference.
The full version (with a decision tree and the generation flow) lives in
[ARCHITECTURE.md](./ARCHITECTURE.md); the rules in brief:

### Next.js (`apps/web`) — owns:
- Authentication and session handling
- Lightweight DB CRUD (sub-100ms operations)
- Read-only queries and pagination
- Server actions tied to user sessions
- UI rendering

### Express (`apps/api`) — owns:
- Any operation that calls an LLM provider (Anthropic, OpenAI, etc.)
- Any operation expected to take > 5 seconds
- Any operation that processes binary data (images, audio, PDFs, etc.)
- Background jobs and cron-style work

### Hard rules
1. No file under `apps/web/src/` may import `@anthropic-ai/sdk` or `openai`
   directly. CLI scripts under `apps/web/scripts/` may, for local-only
   iteration. Enforced by `apps/web/src/__tests__/architecture.test.ts`.
2. No file under `apps/web/src/` may run `sharp` on user-uploaded content.
   (The existing avatar route is a known violation, tracked in ARCHITECTURE.md.)
3. When adding a route, the first question is "does this take longer than 5
   seconds or call an LLM?" If yes → Express.
4. When a route in Next.js needs an LLM result, it calls Express via
   `api-client.ts`. Period.
5. Schemas needed by both tiers live in a shared package, never in
   `apps/web/src/`. The exercise-generation domain (schemas, prompt-builder,
   per-type prompts, validation) is `@wortschatz/exercises`.

All three AI operations — `review-text`, `evaluate-answer`, and (since the
API-boundary sprint) `generate-exercise` — now run on apps/api. The admin
"Generate" UI and the `gen:claude` / `gen:gpt` CLIs both call
`POST /ai/generate-exercise`; the CLI falls back to the in-process SDK only
when apps/api is unreachable.

## Adding a new shared package

```bash
mkdir -p packages/<name>/src
cd packages/<name>
```

`package.json` template (mirror the existing three):

```json
{
  "name": "@wortschatz/<name>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

Then declare it as a dep on the consuming app:

```jsonc
// apps/web/package.json
"@wortschatz/<name>": "workspace:*"
```

…and `pnpm install` to wire the symlink.

## Production deployment

**Today:**

- **`apps/web` → Vercel.** Treat `apps/web/` as the project root in
  Vercel's UI. The Vercel build will run `pnpm install` from the repo
  root and pick up the `transpilePackages` setting in `next.config.ts`
  so `@wortschatz/*` source compiles into the bundle.
- **`apps/api`** is not deployed yet. Until the user base grows, the
  api can run on a developer's machine. Once it needs an address,
  the cleanest move is a small VPS (Hetzner / DO / Fly).

**Known follow-ups before the api can ship to prod:**

1. **Compile the shared packages.** They currently ship source-only
   with `main: "./src/index.ts"`. Apps/api works via `tsx` and apps/web
   via the `next.config.ts` webpack hook, but production node-on-dist
   needs real `.js`. The clean fix: add `tsc` build scripts, point
   `main` → `./dist/index.js`, drop the `transpilePackages` hack.
2. **Switch the avatar storage driver.** `apps/web/src/lib/profile/avatar.ts`
   writes to the local filesystem under `apps/web/public/uploads/avatars/`.
   Vercel's filesystem is ephemeral — swap to Vercel Blob or S3 first.
3. **Move `apps/web/src/app/api/profile/avatar/route.ts` to apps/api.**
   The plan called for it during Sprint 03 but it was deferred so the
   sprint stayed scoped. The handler is self-contained (already uses
   `@wortschatz/database` + `sharp` + `multer`-style multipart parsing)
   so the port is mechanical.
4. **Extract per-type exercise schemas into a shared package** so
   `generateExercise` can move into apps/api. Today the api returns
   501 for `/ai/generate-exercise` and the admin script
   `apps/web/scripts/generate-exercises.ts` calls Claude directly via
   the in-process `apps/web/src/lib/ai.ts`.

## Dev-mode performance

The Sprint 03 split introduced a real cost: cold page compiles jumped
from sub-second to 3–10 s because webpack now transpiles every
`@wortschatz/*` workspace package on every cold start. Sprint 03.5
tuned the obvious knobs (see [`PERFORMANCE.md`](./PERFORMANCE.md) for
numbers and methodology):

- **`serverExternalPackages`** keeps `@prisma/client`,
  `@anthropic-ai/sdk`, `sharp`, `bcryptjs` out of the dev bundle —
  they're `require()`d at runtime instead.
- **`experimental.optimizePackageImports`** trims recharts barrels
  (MUI was already deep-path).
- **`experimental.webpackBuildWorker`** moves webpack to a worker so
  the main process stays responsive.

Net effect after the hotfix: hot reload **~20 % faster** (538 ms →
430 ms compile, 263 ms → 203 ms response); cold compiles still vary
3–10 s depending on route depth. The remaining cost is structural —
see "Open questions / next levers" in PERFORMANCE.md.

If a route feels unusably slow during iteration:

- **Don't `rm -rf .next`** unless you have to; route compiles after
  the first are much faster with a warm `.next/cache/`.
- The `<w> [webpack.cache.PackFileCacheStrategy] Serializing big
  strings (128kiB)…` warning is webpack's own grumble about cache
  format, not your code — leave it.
- Turbopack (`next dev --turbo`) does not currently work in this
  repo: it can't follow the source-only packages' `.js → .ts`
  rewrite and chokes on MUI v9 `proxy.js` barrels. Reachable only
  after the packages ship compiled `dist/`.

## Where the bodies are buried

- **`shamefully-hoist=true`** in `.npmrc`. Needed for Next.js + MUI
  during the Sprint 03 transition. Tighten to per-package node_modules
  once each app has been audited for direct deps.
- **`next.config.ts` `extensionAlias` hack** maps `.js` → `.ts` for
  webpack so it can follow the `.js` extensions inside the source-only
  packages. Goes away once the packages compile to dist.
- **`apps/api`'s `start` uses `tsx`** rather than `node dist/index.js`
  for the same reason.
- **Two AI codepaths.** `evaluateAnswer` / `reviewText` go through the
  api. `generateExercise` is still in-process inside apps/web. Both
  routes share the same `AiCache` / `AiUsage` / `AiRateLimit` tables
  via `@wortschatz/database`.
- **MAX_TOKENS in apps/web/src/lib/ai.ts** declares all three
  endpoints because the `Record<AiEndpoint, number>` type requires it,
  but only `GENERATE_EXERCISE` is actually consumed there now.
