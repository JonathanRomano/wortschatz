# Wortschatz

AI-powered German learning platform. Monorepo with a Next.js 15 web app
and an Express API, sharing Prisma + a few small packages, calling
Claude for review and evaluation.

> **New here?** Start with [`MONOREPO.md`](./MONOREPO.md) for layout,
> setup, commands, and the web ↔ api boundary. Then read
> [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) for the schema,
> domains, conventions, env, deployment checklist, and critical user
> flows. AI-assistant operational rules live in
> [`CLAUDE.md`](./CLAUDE.md); per-task implementation notes are in
> [`SPRINT_02.md`](./SPRINT_02.md); forward-looking work is in
> [`ROADMAP.md`](./ROADMAP.md).

## Quick start

```bash
npm install -g pnpm@9                 # if you don't already have it
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL on :5432
pnpm install
pnpm db:generate
pnpm db:migrate                       # creates / updates schema
pnpm db:seed                          # admin + teacher accounts
pnpm db:generate-exercises            # 50 stub exercises (or real if AI key set)

# Per-app env files — both gitignored
cp apps/web/.env.example apps/web/.env  # fill in NEXTAUTH_SECRET, INTERNAL_API_SECRET
cp apps/api/.env.example apps/api/.env  # fill in INTERNAL_API_SECRET (same value!)

# Two terminals (or `pnpm dev` runs both via turbo)
pnpm dev:api                          # Express on :4000
pnpm dev:web                          # Next.js on :3000
```

Then open <http://localhost:3000>. The default UI redirects to `/en` —
switch via the locale picker in the header (PT/EN/TR/UK).

## Default dev credentials

| Email                    | Password   | Role    |
| ------------------------ | ---------- | ------- |
| admin@wortschatz.app     | admin123   | ADMIN   |
| teacher@wortschatz.app   | teacher123 | TEACHER |

## Environment

Each app has its own `.env`. See `apps/web/.env.example` and
`apps/api/.env.example` for the full list, or
[`PROJECT_OVERVIEW.md` § Environment variables](./PROJECT_OVERVIEW.md#7-environment-variables)
for what each one does. `INTERNAL_API_SECRET` must be the same value in
both apps; generate with `openssl rand -base64 32`. `ANTHROPIC_API_KEY`
is optional everywhere — without it the AI routes return deterministic
stubs and write nothing to the DB. See `ROADMAP.md` for what to wire
up next.

## Project layout

See [`MONOREPO.md`](./MONOREPO.md) for the full layout and per-package
purpose. Quick orientation:

```
apps/
  web/     Next.js 15 + MUI v9 + next-intl. Vercel target.
  api/     Express 4 (ESM, tsx). VPS target (not deployed yet).
packages/
  database/   @wortschatz/database — Prisma client + schema + migrations
  types/      @wortschatz/types    — cross-app wire formats
  config/     @wortschatz/config   — constants, env schemas, utilities
```
