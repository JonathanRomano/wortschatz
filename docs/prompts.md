# Prompt curation

How the AI exercise-generation prompts work, who can edit them, and how to
recover when something goes wrong.

As of the prompt-curation sprint, the per-(exercise type, CEFR level) prompts
that drive generation live in the **database**, editable in production by a
curator — no code change, no deploy. The hardcoded prompt files remain as a
fallback.

## The big picture

```
hardcoded file ──seed──▶ BasePromptVersion (v1, ACTIVE) ──edit──▶ v2 DRAFT ──publish──▶ v2 ACTIVE
   (fallback)              in the database                          (test first)        (v1 → INACTIVE)
        │                        │
        └── used only when ◀─────┘  resolved at generation time:
            no ACTIVE row            getActiveBasePromptVoice(type, level)
            exists for (type,level)
```

- **`BasePrompt`** — one row per `(ExerciseType, CefrLevel)`. 40 rows today
  (10 types × A1/A2/B1/B2, the generator's supported levels).
- **`BasePromptVersion`** — an append-only chain of revisions per base prompt.
  Exactly one is `ACTIVE`; older ones are `INACTIVE`; unpublished edits are
  `DRAFT`. Versions are **never deleted**, only deactivated.
- **`Exercise.basePromptVersionId`** — every generated exercise points back to
  the exact version that produced it (nullable; null for pre-sprint rows or a
  file-fallback run).

## What a version stores (and what it does NOT)

A `BasePromptVersion` stores only the **editable voice**:

- `systemPrompt` — the model's role + the quality bar for this type and level.
- `userInstructions` — what to generate. May contain `{level}` and `{topic}`
  placeholders, interpolated at generation time.

It does **not** store the technical contract. `jsonShape` (the exact output
JSON) and `rules` stay **code-locked** in the per-type prompt file
(`packages/exercises/src/prompts/claude/<type>.ts`). This is deliberate: a bad
prompt edit can change the pedagogy but can **never** break the Zod validation
that downstream parsing depends on. The editor shows the locked blocks
read-only for reference.

## File → seed → DB → runtime

1. **File** — `packages/exercises/src/prompts/claude/<type>.ts` exports
   `promptParts` (system, instructions, jsonShape, rules, maxTokens). Level is a
   runtime parameter, not baked in. This file is the universal fallback.
2. **Seed** — `packages/database/prisma/seed.ts` creates the 40 `BasePrompt`
   rows + a `v1` `ACTIVE` `BasePromptVersion` each, from the authored per-level
   content in `prisma/seed-data/base-prompts.ts`. Idempotent: re-running never
   duplicates or clobbers edited rows.
3. **DB** — curators edit/version prompts via `/admin/prompts/base`.
4. **Runtime** — generation resolves the active version:
   - `getActiveBasePromptVoice(type, level)` (in `@wortschatz/database`) returns
     the one `ACTIVE` version, or `null`.
   - On `null`, generation uses the hardcoded file unchanged (the fallback).
   - The pure `applyPromptVoice(baseParts, voice)` (in `@wortschatz/exercises`)
     layers the stored system+instructions onto the file's locked
     jsonShape/rules. `{level}`/`{topic}` are interpolated.
   - This runs on the Express generate service (the live admin-UI + reachable-CLI
     path) **and** in the web CLI-offline generator, so both honor DB prompts.
     GPT generation always uses its hardcoded file (curation is Claude-only in
     v1).

## Roles: TEACHER vs ADMIN

The whole point of the sprint is to let a teacher curate prompts without code
access. Two privileged roles (`UserRole`):

| Action                                   | TEACHER | ADMIN |
| ---------------------------------------- | :-----: | :---: |
| List / read base prompts                 |   ✅    |  ✅   |
| Edit system + userInstructions (draft)   |   ✅    |  ✅   |
| Test-generate a draft                    |   ✅    |  ✅   |
| Publish a draft → ACTIVE                 |   ✅    |  ✅   |
| **Revert to a previous version**         |   ❌    |  ✅   |
| Edit jsonShape / rules                   |  n/a    | code  |

- `jsonShape`/`rules` are code-locked for everyone — there is no admin-only
  *editable field*; the ADMIN-only distinction is **revert**, the safety net.
- Guards live in `apps/web/src/lib/admin/guard.ts`: `requireAdminOrTeacher()`
  for the curation surface, `requireAdmin()` for revert. The older generator
  surface (generate-exercises, saved-prompts) stays ADMIN-only.

## The curator workflow (Draft → Test → Publish)

Editing does **not** immediately change the live prompt:

1. Edit `system` / `userInstructions` on `/admin/prompts/base/[id]`.
2. **Save as draft** → creates a new `DRAFT` version (versionNumber = max + 1).
3. **Test generate** → produces one real exercise from the draft's voice. It is
   not saved (no `Exercise` row, no `GenerationSession`), but it does spend
   tokens: the call counts against the `GENERATE_EXERCISE` rate limit and writes
   an `AiUsage` row tagged `source="test-generate"`. The UI shows the token cost.
4. **Publish** → flips the draft to `ACTIVE` and the previous `ACTIVE` to
   `INACTIVE` in one transaction. The next generation uses it immediately.

## Adding a new exercise type or level

`BasePrompt` is keyed on `(type, level)`, so growth is additive:

- **New level** (e.g. C1): add it to `GENERATOR_LEVELS`
  (`apps/web/src/lib/admin/schemas.ts`), add per-level content to
  `prisma/seed-data/base-prompts.ts`, and re-run the seed. Until a row exists,
  that level falls back to the hardcoded file.
- **New exercise type**: add the enum value + a hardcoded prompt file
  (`packages/exercises/src/prompts/{claude,gpt}/<type>.ts`) **first** (it is the
  fallback and the locked jsonShape/rules source), then seed its 4 levels.

The hardcoded file is always required — it is the contract of record and the
recovery path.

## Recovery — when a publish breaks generation

1. **Revert (ADMIN)** — on `/admin/prompts/base/[id]`, expand the version
   history and "Revert to this version" on the last good (INACTIVE) version. It
   becomes `ACTIVE` again immediately; no new version is created.
2. **Fall back to the file** — if every version of a base prompt is wrong,
   deleting/deactivating the rows makes generation use the hardcoded file again.
   `TRUNCATE "BasePromptVersion"` locally is fully recoverable: re-seed to
   restore v1.
3. **Nuclear** — the file fallback means a totally empty `BasePrompt*` set still
   generates correctly. Generation can never be bricked by DB prompt data.

## Key files

| Concern                         | File |
| ------------------------------- | ---- |
| Schema                          | `packages/database/prisma/schema.prisma` (BasePrompt, BasePromptVersion, PromptStatus) |
| Active-version resolver         | `packages/database/src/index.ts` (`getActiveBasePromptVoice`) |
| Pure override seam              | `packages/exercises/src/prompt-override.ts` (`applyPromptVoice`) |
| Generation injection (live)     | `apps/api/src/services/generate.ts` |
| Generation injection (CLI offline) | `apps/web/scripts/shared/generators.ts` |
| Seed + content                  | `packages/database/prisma/seed.ts`, `prisma/seed-data/base-prompts.ts` |
| API routes                      | `apps/web/src/app/api/admin/base-prompts/**` |
| UI                              | `apps/web/src/app/[locale]/admin/prompts/base/**` |
