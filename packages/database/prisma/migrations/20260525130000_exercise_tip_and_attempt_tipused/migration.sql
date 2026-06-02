-- Exercise tips + per-attempt tip-used flag.
--
-- `Exercise.tip` holds an optional localized hint (`{ en, pt, tr, uk }`),
-- same JSON shape as instructions/explanation. NULL = no tip available.
--
-- `UserExercise.tipUsed` records whether the learner revealed that tip
-- before submitting; the reward path is 10 Münzen normally vs 3 Münzen
-- when tipUsed = true. Defaulted to false so historical rows are treated
-- as "solved without the tip" (which they were — the feature didn't
-- exist).

ALTER TABLE "Exercise"
  ADD COLUMN "tip" JSONB;

ALTER TABLE "UserExercise"
  ADD COLUMN "tipUsed" BOOLEAN NOT NULL DEFAULT false;
