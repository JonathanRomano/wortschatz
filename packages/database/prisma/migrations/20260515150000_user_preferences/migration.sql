-- Sprint 02 Task 8: per-exercise-type user preferences.
--
-- Backs the "don't show the intro again" toggle on the type runner.
-- A row exists per (user, exercise type) iff the user has opted out of
-- the intro for that type. `skipIntro` is a placeholder boolean — for
-- now its existence alone is the signal, but future preferences can
-- live on the same row without another migration.

CREATE TABLE "UserPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" "ExerciseType" NOT NULL,
  "skipIntro" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreference_userId_key_key" ON "UserPreference"("userId", "key");
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

ALTER TABLE "UserPreference"
  ADD CONSTRAINT "UserPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
