# Architecture — API boundary

Wortschatz has **two HTTP surfaces**. Where new code goes is not a matter of
preference — it follows the rules below. This file is the single source of
truth for both humans and AI agents; [MONOREPO.md](./MONOREPO.md) has the full
deployment story and [CLAUDE.md](./CLAUDE.md) links here.

```
                                Browser
                                   │
                                   ▼
                            Next.js (apps/web, Vercel)
                            ──────────────────────────
                            • Auth, sessions (NextAuth)
                            • Comments, likes
                            • Saved-prompt CRUD
                            • Generation-history reads
                            • Profile, dashboard, exercises UI
                            • Admin generate UI (thin orchestrator)

                                   │
                  thin api-client (X-Internal-Secret + X-User-Id)
                  apps/web/src/lib/api-client.ts
                                   │
                                   ▼
                            Express (apps/api, VPS)
                            ───────────────────────
                            • POST /ai/review-text
                            • POST /ai/evaluate-answer
                            • POST /ai/generate-exercise   ← all 3 LLM calls

                                   │
                          Anthropic / OpenAI SDK
                            (optionally via Helicone)
```

Both tiers talk to Postgres directly via `@wortschatz/database`. **Express owns
every LLM provider call.** Next.js owns the session and the UI. Domain logic
both tiers need (the per-type Zod schemas, the prompt-builder, the per-type
prompts, validation) lives in `@wortschatz/exercises` so neither tier
duplicates it.

## Hard rules

Two HTTP surfaces exist. Where new code goes is not a matter of preference.

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
   iteration (the generators' offline fallback). Enforced by
   `apps/web/src/__tests__/architecture.test.ts`.
2. No file under `apps/web/src/` may run `sharp` on user-uploaded content.
   (The existing avatar route is a known violation, tracked below.)
3. When adding a route, the first question is "does this take longer than 5
   seconds or call an LLM?" If yes → Express.
4. When a route in Next.js needs an LLM result, it calls Express via
   `api-client.ts`. Period.
5. Schemas (and other logic) needed by both tiers live in a shared package
   (`@wortschatz/exercises`, `@wortschatz/config`, `@wortschatz/types`), never
   in `apps/web/src/`.

## Decision tree — "I want to add X, where does it go?"

1. **A new LLM-backed feature** (summarize, hint, translate, grade, generate…)
   → Express. Add a service in `apps/api/src/services/`, a route under
   `/ai/*`, and a thin caller in `apps/web/src/lib/api-client.ts`. The
   Next.js side (route handler or server action) calls the api-client.

2. **A new piece of session-bound CRUD** (a setting, a bookmark, a reaction…)
   → Next.js. A route handler under `apps/web/src/app/api/…` or a server
   action, talking to Prisma directly. No api-client hop.

3. **A read-only query / list / dashboard aggregation** → Next.js (server
   component or route handler). Sub-100ms Prisma reads belong with the UI.

4. **A heavy/long-running or binary job** (image processing, audio
   transcoding, PDF export, a batch that loops for tens of seconds) →
   Express, even if no LLM is involved. Vercel serverless timeouts are the
   reason the boundary exists.

5. **A schema or pure helper both tiers need** → a shared package. If it's
   exercise-generation domain logic, that's `@wortschatz/exercises`; shared
   constants/env/validators go in `@wortschatz/config`; pure wire types in
   `@wortschatz/types`.

## How generation flows (the canonical example)

`POST /api/admin/generate-exercises` (Next.js) is a **thin orchestrator**:

1. Auth (ADMIN), validate the body, resolve a saved prompt, create the
   `GenerationSession` (UI metadata + audit trail).
2. `runGeneration` (`apps/web/scripts/shared/run.ts`) loops `count` times. Per
   item it resolves the topic, fetches recent examples (a Prisma read — the
   anti-duplication context), then calls the **remote generator**
   (`makeRemoteGenerator` → `api-client.generateExerciseRemote` → Express).
3. **Express** (`POST /ai/generate-exercise`) builds the prompt with the
   shared prompt-builder, calls the provider, parses + validates the output
   against the per-type schemas, applies the per-user rate limit, logs usage,
   and returns the validated exercise (or 422 on a content miss / 429 on a
   limit).
4. Next.js inserts the row (linked to the session) and finalizes the session.

So the heavy work (N sequential 5–15s provider calls) runs on apps/api, off
the Vercel timeout. The Next.js function only orchestrates short DB writes.

The **CLI** (`pnpm gen:claude` / `gen:gpt`) uses the same `runGeneration`. It
prefers the Express endpoint when reachable, and falls back to the in-process
SDK (`makeDirectGenerator`) when apps/api isn't running locally — the only
path that uses the SDK, and it lives under `apps/web/scripts/`, never `src/`.

## Known violations (tracked, not yet moved)

- **Avatar image processing** — `POST /api/profile/avatar` runs the `sharp`
  pipeline in the Next.js process (rule 2). It's bounded work (a single ≤2 MB
  image, hard caps) and entangled with a separate local-FS → Vercel Blob/S3
  storage migration, so it's deferred to a future sprint rather than moved
  here. When that migration happens, move the `sharp` pipeline to Express at
  the same time.
