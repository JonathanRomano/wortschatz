# Exercise generators (v2)

Per-type, per-provider German exercise generation. Each provider (Claude,
GPT) owns its own prompt set and SDK client; they share only the `shared/`
helpers (validation, DB write, anti-duplication, CLI parsing, the run
loop). Output is validated against the canonical Zod schemas in
`src/lib/exercises/schemas.ts` before anything is inserted.

> The same `runGeneration` loop now also powers the **admin generator UI**
> at `/admin/generate` (the web API imports it directly — no CLI spawn).
> Every run, CLI or UI, records one `GenerationSession` row (see
> "Generation sessions" below).
>
> **Where the model call runs (API-boundary sprint).** `runGeneration`
> orchestrates, but the heavy per-item work — prompt build + provider call +
> validation — now happens on **apps/api** (`POST /ai/generate-exercise`), not
> in the Next.js process. The admin UI always uses it; the CLI prefers it when
> apps/api is reachable and `INTERNAL_API_SECRET` is set, and **falls back to
> the in-process SDK** otherwise (logging which path it took). The shared
> prompts + schemas live in `@wortschatz/exercises` so both paths produce
> identical prompts. See [ARCHITECTURE.md](../../../ARCHITECTURE.md).

## Quick start

```bash
# Claude (ANTHROPIC_API_KEY already configured)
pnpm gen:claude --type FILL_IN_THE_BLANK --level A2 --count 5 --topic food

# GPT (needs OPENAI_API_KEY in apps/web/.env)
pnpm gen:gpt --type MULTIPLE_CHOICE --level B1 --count 5

# Preview without writing to the DB
pnpm gen:claude --type ERROR_CORRECTION --level B1 --count 3 --dry-run
```

Run from the repo root (the root `gen:claude` / `gen:gpt` scripts proxy
into `apps/web`). You can also run directly with
`pnpm tsx apps/web/scripts/claude/generate.ts …`.

## Flags

| Flag | Required | Default | Description |
|---|---|---|---|
| `--type` | yes | — | `ExerciseType` enum value (case-insensitive) |
| `--level` | yes | — | `A1`, `A2`, `B1`, `B2` |
| `--count` | no | `5` | how many to generate this run |
| `--topic` | no | auto | fixed topic; if omitted, cycles `TOPICS_BY_LEVEL[level]` |
| `--model` | no | provider default | override the model (e.g. `claude-opus-4-7`, `gpt-4o`) |
| `--delay-ms` | no | `500` | pause between provider calls to dodge rate limits |
| `--dry-run` | no | off | generate + validate but don't insert; prints JSON |
| `--no-recent` | no | off | skip the anti-duplication step (use on empty buckets) |
| `--verbose` | no | off | also print the recent-examples block that was sent |

Default models come from env: `ANTHROPIC_MODEL` (→ `claude-sonnet-4-6`) and
`OPENAI_MODEL` (→ `gpt-4o`). `--model` overrides per run.

## What a run does

For each of `--count` items:

1. Pick a topic (`--topic` or rotate the canonical list).
2. Fetch the last 10 exercises of the same type+level (`--no-recent` skips
   this) and embed a "make it different from these" block in the prompt.
3. Generate one exercise: the web sends the resolved topic + recent examples
   to **apps/api** (`POST /ai/generate-exercise`), which builds the prompt
   (`@wortschatz/exercises`), calls the provider, extracts JSON, and validates
   it against the type's Zod content/solution schemas + structural checks + a
   required English `explanation`. The CLI runs the same steps in-process when
   apps/api is unreachable.
4. Insert as `PUBLISHED`, authored by the seed admin, `targetLanguage`
   `"de"`, with `model` set to the actual provider model and
   `generationSessionId` set to this run's session. A revealed-tip field is
   written only when present.

Before the loop the runner opens a `GenerationSession` (CLI runs author it
as the seed admin with `source: "CLI"`; the UI pre-creates it and passes the
id in); after the loop it finalizes the session with the success/failure
counts and duration. A `--dry-run` creates no session and writes nothing.

Failures (provider error, parse error, or validation) log a warning, count
as failed, and the run continues — except a rate-limit error, which stops
the batch. `runGeneration` returns a structured `GenerationResult`
(`{ sessionId, generated[], failed[], totalDurationMs, cacheHits }`); the
CLI entrypoints pass an `onProgress` sink that prints the per-item log and
totals.

## Layout

```
scripts/
├── claude/                 # Anthropic provider client (SDK)
│   ├── client.ts            # callClaude (direct-SDK fallback)
│   └── generate.ts          # CLI entrypoint  (pnpm gen:claude)
├── gpt/                    # OpenAI provider client (SDK, JSON mode)
│   ├── client.ts            # callGPT (direct-SDK fallback)
│   └── generate.ts          # CLI entrypoint  (pnpm gen:gpt)
└── shared/
    ├── types.ts             # CliArgs, Generation* types + the ExerciseGenerator seam
    ├── topics.ts            # TOPICS_BY_LEVEL + topicForIndex
    ├── cli.ts               # hand-rolled arg parser
    ├── recent-examples.ts   # fetchRecentExamples (DB query)
    ├── generators.ts        # makeRemoteGenerator (apps/api) + makeDirectGenerator (SDK)
    ├── express-health.ts    # is apps/api reachable? (CLI fallback probe)
    ├── insert.ts            # Prisma write (seed admin author, links the session)
    ├── session.ts           # GenerationSession create/finalize + seed admin id
    └── run.ts               # provider-agnostic, session-aware generation loop
```

The prompt machinery + schemas moved to **`@wortschatz/exercises`** so both
apps/api and the CLI share one copy: `schemas.ts`, `prompt-types.ts`,
`prompt-builder.ts`, `recent-block.ts` (`renderRecentBlock` + `excerptFor`),
`validate.ts`, `json.ts`, and `prompts/{claude,gpt}/<type>.ts`.

The web API reaches these via the `@scripts/*` path alias (wired in
`tsconfig.json` + `vitest.config.ts`), e.g. `@scripts/shared/run`.

## Prompt file contract

Each per-type prompt file in `@wortschatz/exercises`
(`packages/exercises/src/prompts/<provider>/<type>.ts`) exports a single
`promptParts: PromptParts` split into four named pieces. `system` +
`instructions` are the **editable "voice"**; `jsonShape` + `rules` are
**locked** (see "Locked vs editable"):

```ts
import type { PromptParts } from "../../prompt-types.js";

const SYSTEM = `…role, quality bar, localized-fields requirement…`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  // EDITABLE: intro + level/topic/target header (everything before the recent block).
  instructions: ({ level, topic }) => `Write ONE … exercise.\n\nCEFR level: ${level}\nTopic: ${topic}\nTarget language: German`,
  // LOCKED: the canonical output contract.
  jsonShape: ({ topic }) => `Output a single JSON object with this exact shape:\n{ … }`,
  // LOCKED: per-level + per-type constraints.
  rules: ({ level }) => `Rules:\n- …`,
};
```

The `@wortschatz/exercises` prompt-builder reassembles these
(`instructions · recentBlock · jsonShape · rules`) via `buildFinalUserPrompt`
/ `buildPrompt`, injecting the recent-examples block between the instructions
and the JSON shape. The assembly reproduces the legacy monolithic prompt
**byte-for-byte** — `shared/__tests__/prompt-parity.test.ts` pins every type +
provider against a captured baseline, so a refactor can't silently change what
the CLI sends. After an *intentional* prompt edit, regenerate the baseline with
`shared/__tests__/__fixtures__/regenerate.ts`.

### Locked vs editable

The admin generator (and the `customPrompt` field on `runGeneration`) may
override `system` and the `instructions` portion only. `jsonShape` and `rules`
are always taken from the per-type file, so a custom prompt can't break
downstream Zod validation. A whitespace-only override falls back to the
default.

Conventions (keep these consistent across prompts):

- Describe the **exact JSON shape** in the prompt — don't rely on the
  model inferring it from the schema. Verbose beats ambiguous.
- German is the *learned content*; `explanation` and `tip` are localized
  `{ en, pt, tr, uk }`.
- Claude prompts say "single JSON object, no markdown fences". GPT prompts
  must contain the word **JSON** (the client runs OpenAI JSON mode).
- The Claude and GPT variant of a type describe the same shape; GPT's can
  be terser.

## Tweaking a prompt

Edit the relevant prompt file in `@wortschatz/exercises`
(`packages/exercises/src/prompts/<provider>/<type>.ts`) and re-run. Nothing is
cached — every run hits the provider fresh, so iteration is immediate.

## Adding a new exercise type

1. Add the enum value in `packages/database/prisma/schema.prisma`
   (`ExerciseType`).
2. Add `<Name>Content` / `<Name>Answer` / `<Name>Solution` in
   `@wortschatz/exercises` (`packages/exercises/src/schemas.ts`) and wire the
   registries there.
3. Add an excerpt case in `@wortschatz/exercises` `recent-block.ts`
   (`excerptFor`).
4. (Optional) Add a structural check in `@wortschatz/exercises` `validate.ts`.
5. Add `src/prompts/claude/<type>.ts` and `src/prompts/gpt/<type>.ts` in
   `@wortschatz/exercises`, then wire both `prompts/<provider>/index.ts`
   files. The `PromptRegistry` type turns a missing key into a compile error,
   so `pnpm typecheck` will tell you what's left.

> Validation catches schema drift immediately — if you change a schema and
> forget to update a prompt, generated items fail the Zod gate and are
> skipped (not inserted).

## Generation sessions

Every non-dry run writes one `GenerationSession` row — the long-term unit of
analysis for "who generated what, with which prompt, how successfully". It's
written for CLI runs (`source: "CLI"`, authored by the seed admin) and UI runs
(`source: "UI"`, authored by the admin who clicked Generate), so history and
future quality dashboards see both. Exercises link back via
`Exercise.generationSessionId`. Sessions are an audit trail — never deleted —
and deleting a `SavedPrompt` leaves its sessions intact (`onDelete: SetNull`).
The admin UI surfaces them at `/admin/generate/history`.

## Providers

Generation runs on **apps/api** (`POST /ai/generate-exercise`), which holds
the provider keys and the cache/rate-limit/usage pipeline. The SDK clients
below are the **CLI's offline fallback** (and what apps/api's own generate
service mirrors):

- **Claude** (`claude/client.ts`): Anthropic SDK. No JSON-mode flag; the
  tolerant `extractJson` strips the occasional ```json fence.
- **GPT** (`gpt/client.ts`): OpenAI SDK with `response_format: { type:
  "json_object" }`, which forces a valid JSON object. Sends
  `max_completion_tokens` (newer models reject `max_tokens`). Throws a
  clear error if `OPENAI_API_KEY` is missing.

## Observability with Helicone

Every LLM call the app makes (exercise generation here in `scripts/`, plus
`reviewText` / `evaluateAnswer` in `apps/api`, and `generateExercise` in
`apps/web/src/lib/ai.ts`) can optionally be routed through
[Helicone](https://helicone.ai), a pass-through proxy that logs the full
prompt, the completion, token counts, cost, and latency for each request in
its own dashboard. It complements — does not replace — our internal `AiUsage`
table, which stays the canonical metadata log. There's no SDK to install: a
provider client just points its `baseURL` at Helicone and adds a few headers.

**Enable it.** Create a free account at [helicone.ai](https://helicone.ai)
(10,000 requests/month on the free tier), copy your API key, and set it in the
relevant `.env`:

```bash
HELICONE_API_KEY=sk-helicone-...
```

That's the only switch. With the key set, the Anthropic and OpenAI clients in
both apps construct against the Helicone proxy
(`https://anthropic.helicone.ai`, `https://oai.helicone.ai/v1`) and tag each
request with filterable properties:

| Header | Value | Purpose |
|---|---|---|
| `Helicone-Property-Environment` | `production` / `preview` / `development` (from `NODE_ENV`) | separate deploy environments in the dashboard |
| `Helicone-Property-App` | `wortschatz` | future-proof if another app shares the key |
| `Helicone-Property-Source` | `scripts-claude`, `scripts-gpt`, `scripts-fitb`, `web-ai-lib`, `api-service` | which code path made the call |
| `Helicone-User-Id` | the Wortschatz user id (when one is in scope) | per-user usage in the dashboard |
| `Helicone-Async` | `true` (always) | log out-of-band — a Helicone outage never blocks the provider call |

**Disable it.** Unset `HELICONE_API_KEY` (or leave it empty). The routing
helpers (`heliconeAnthropicOverrides` / `heliconeOpenAIOverrides` in
`@wortschatz/config`) then return `{}`, so each client is byte-for-byte what it
was before Helicone existed and talks to the provider directly. The
integration is entirely opt-in and reversible — no schema change, no new
dependency.

> **Privacy note.** Prompts sent to Helicone today are German exercises and
> admin-authored content — no end-user PII. If a future prompt ever carries
> user-identifying free text, revisit this before enabling Helicone in
> production. The key is read only server-side (`process.env.HELICONE_API_KEY`,
> no `NEXT_PUBLIC_` prefix), so it never reaches the browser bundle.

**Verify the wiring (manual).**

1. Sign up at [helicone.ai](https://helicone.ai) and copy your API key.
2. Add `HELICONE_API_KEY=...` to `apps/web/.env`.
3. Run a single generation:
   `pnpm gen:claude --type FILL_IN_THE_BLANK --level A1 --count 1 --dry-run`.
4. Open the Helicone dashboard and confirm the request appears with the prompt
   and response visible, and `Helicone-Property-Source` = `scripts-claude`.

## Relationship to the old scripts

`generate-exercises.ts` (one generic prompt for all 10 types via the old
in-process `src/lib/ai.ts` path) was **removed** in the API-boundary sprint,
along with its `db:generate-exercises` npm script — exercise generation now
runs through `gen:claude` / `gen:gpt` and the admin UI, which delegate to
apps/api. `generate-fitb-exercises.ts` (the FITB prototype this v2
generalizes) remains **deprecated** and kept only until a cleanup pass.
