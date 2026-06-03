# @wortschatz/api

The Express service that owns Wortschatz's heavy / long-running work — today,
every LLM provider call. See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the
boundary rules and [MONOREPO.md](../../MONOREPO.md#web--api-boundary) for the
web ↔ api auth.

Runs on `tsx` in dev (`pnpm dev:api`); `tsc` build → `node dist/index.js` in
prod.

## AI endpoints

All under `/ai`, all gated by `sharedSecretAuth` (constant-time
`X-Internal-Secret` compare + optional `X-User-Id`). The error handler maps
`ZodError` → 400, `AiRateLimitedError` → 429, anything else → 500.

| Method & path | What it does | Provider | DB |
|---|---|---|---|
| `POST /ai/review-text` | Markdown feedback on a user's text at their CEFR level | Claude | cache / usage / rate-limit |
| `POST /ai/evaluate-answer` | Grade one answer → `{ score, feedback }` | Claude | cache / usage / rate-limit |
| `POST /ai/evaluate-answer-by-id` | Same, fetching the exercise by id first | Claude | reads `Exercise` + cache / usage / rate-limit |
| `POST /ai/generate-exercise` | Build prompt → generate → validate one exercise → the validated exercise | Claude **or** GPT | usage / rate-limit (no cache) |
| `GET /health` | Liveness + `SELECT 1` DB probe | — | read |

`generate-exercise` is the newest (API-boundary sprint). It builds the prompt
with `@wortschatz/exercises`, calls the chosen provider (`provider: "claude" |
"gpt"`, default `claude`), validates the output against the per-type Zod
schemas, logs usage, and returns the validated exercise — or **422** with
`code: "validation_failed"` on a content miss, **429** when the per-user daily
limit is hit. The web's `runGeneration` orchestrates the batch (topic rotation,
recent-examples, DB insert, `GenerationSession`) and calls this once per item.
It is **not cached**: generation must stay fresh so the recent-examples
anti-duplication block actually varies the output.

When the relevant provider key is missing, the endpoint returns a deterministic
stub and writes nothing (same offline behavior as review/evaluate).

## Env

`apiEnvSchema` (`@wortschatz/config`) validates `process.env` at boot and
exits on failure. Required: `DATABASE_URL`, `INTERNAL_API_SECRET` (≥ 32 chars,
shared with apps/web), plus `WEB_URL` / `PORT` (defaulted). Optional:
`ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`, `OPENAI_API_KEY` / `OPENAI_MODEL`
(GPT generation), `HELICONE_API_KEY` (LLM-call logging). See `.env.example`.

## Tests

`pnpm --filter @wortschatz/api test` (vitest). The SDKs, prisma, env, and the
rate limiter are mocked — no network, no DB.
