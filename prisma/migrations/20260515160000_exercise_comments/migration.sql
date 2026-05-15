-- Sprint 02 Task 7: per-exercise comments + likes with light moderation.
--
-- ExerciseComment rows are kept on delete (soft-delete via `deletedAt`).
-- The API hides content and author for soft-deleted rows but keeps the
-- id + createdAt so any future reply thread retains structural context.
-- CommentLike is a join table with a composite unique on (commentId,
-- userId) so the toggle endpoint can't double-like under concurrency.

CREATE TABLE "ExerciseComment" (
  "id" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ExerciseComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExerciseComment_exerciseId_createdAt_idx"
  ON "ExerciseComment"("exerciseId", "createdAt");
CREATE INDEX "ExerciseComment_userId_idx"
  ON "ExerciseComment"("userId");

ALTER TABLE "ExerciseComment"
  ADD CONSTRAINT "ExerciseComment_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExerciseComment"
  ADD CONSTRAINT "ExerciseComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommentLike" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentLike_commentId_userId_key"
  ON "CommentLike"("commentId", "userId");
CREATE INDEX "CommentLike_commentId_idx"
  ON "CommentLike"("commentId");

ALTER TABLE "CommentLike"
  ADD CONSTRAINT "CommentLike_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "ExerciseComment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentLike"
  ADD CONSTRAINT "CommentLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
