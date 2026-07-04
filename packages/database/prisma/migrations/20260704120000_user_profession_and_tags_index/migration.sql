-- Sprint 05 Task 1: the professional pivot ("Beruf").
--
-- `profession`   config-validated slug from PROFESSION_SLUGS in
--                @wortschatz/config (e.g. "pflege", "it"). Stored as
--                TEXT instead of an enum — same reasoning as
--                `nativeLanguage` — so adding a profession is a config
--                + content change, never a migration. NULL = the user
--                is learning for themselves; nothing changes for them.
-- `targetLevel`  the goal CEFR level (the exam/level they need for the
--                job), alongside `learningLevel` (where they are now).
--
-- The GIN index backs profession/unit filtering on the existing
-- `Exercise.tags` array (`tags: { has: 'beruf:pflege' }`).

ALTER TABLE "User"
  ADD COLUMN "profession" TEXT,
  ADD COLUMN "targetLevel" "CefrLevel";

CREATE INDEX "Exercise_tags_idx" ON "Exercise" USING GIN ("tags");
