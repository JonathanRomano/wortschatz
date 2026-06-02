-- Drop Exercise.instructions: the column held a localized
-- `{ en, pt, tr, uk }` blob that was identical for every row of a
-- given ExerciseType. The per-type prompt now lives in the i18n
-- bundle (`messages/*.json` → `exercises.instructionsByType`), so the
-- DB column was duplicated static UI copy across hundreds of rows.

ALTER TABLE "Exercise"
  DROP COLUMN "instructions";
