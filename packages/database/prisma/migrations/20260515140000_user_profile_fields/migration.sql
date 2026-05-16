-- Sprint 02 Task 6: extend User with profile fields.
--
-- `bio`            short free-form bio, capped to 280 chars in the
--                  server action (no DB-side length check so a future
--                  copy bump doesn't require another migration).
-- `nativeLanguage` ISO 639-1 (e.g. "pt", "en", "tr", "uk", "de"). Stored
--                  as TEXT instead of an enum so additional UI locales
--                  don't force schema changes.
-- `learningLevel`  optional CEFR level. Falls back to "B1" anywhere we
--                  need a level (AI review prompt, etc.) until the user
--                  picks one.
-- `dailyGoal`      number of exercises per day; defaults to 5, matching
--                  the previous DAILY_GOAL_DEFAULT constant so existing
--                  users see no behavior change.
-- `avatarUrl`      public URL for the user's avatar (e.g.
--                  "/uploads/avatars/<id>-<rand>.webp"). NULL = use the
--                  initials fallback in the header.

ALTER TABLE "User"
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "nativeLanguage" TEXT,
  ADD COLUMN "learningLevel" "CefrLevel",
  ADD COLUMN "dailyGoal" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "avatarUrl" TEXT;
