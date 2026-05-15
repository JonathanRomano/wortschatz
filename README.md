# Wortschatz

AI-powered German learning platform. Built with Next.js 15, Prisma,
PostgreSQL, NextAuth.js v5, next-intl, and (planned) Claude.

## Quick start

```bash
docker compose up -d              # PostgreSQL on :5432
npm install
cp .env.example .env              # already exists; fill in real secrets
npm run db:generate
npm run db:push                   # or db:migrate for migration files
npm run db:seed                   # admin + teacher accounts
npm run db:generate-exercises     # 50 stub exercises (or real if AI key set)
npm run dev
```

Then open <http://localhost:3000>. The default UI redirects to `/en` —
switch via the locale picker in the header (PT/EN/TR/UK).

## Default dev credentials

| Email                    | Password   | Role    |
| ------------------------ | ---------- | ------- |
| admin@wortschatz.app     | admin123   | ADMIN   |
| teacher@wortschatz.app   | teacher123 | TEACHER |

## Environment

See `.env.example` for the full list. `ANTHROPIC_API_KEY` is optional —
without it the app falls back to deterministic stub exercises and skips
real AI evaluation. See `ROADMAP.md` for what to wire up next.

## Project layout

```
src/
  app/[locale]/        Routed pages, all locale-prefixed
  app/api/auth/...     NextAuth handlers
  auth.ts              Full NextAuth config (server)
  auth.config.ts       Edge-safe NextAuth config (middleware)
  components/          Shared UI: layout chrome + exercise renderers
  i18n/                next-intl config + typed navigation helpers
  lib/
    ai.ts              Claude integration (currently stubbed)
    db.ts              Prisma client
    muenzen.ts         In-app currency rules
    exercises/         Schemas, grader, server actions
    review/            AI text review server action
  middleware.ts        Auth + locale routing

prisma/schema.prisma   All models + enums
messages/{en,pt,tr,uk}.json   UI translations
scripts/               seed + AI-generation scripts
```
