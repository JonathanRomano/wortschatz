-- Prompt curation (Sprint) — versioned, DB-backed generation prompts.
-- Additive only: a new enum (PromptStatus), two new tables (BasePrompt,
-- BasePromptVersion), one new nullable FK column on Exercise
-- (basePromptVersionId) and one nullable column on AiUsage (source), plus
-- supporting indexes. No destructive changes; existing rows keep
-- basePromptVersionId / source NULL (they predate prompt curation).
--
-- UserRole.TEACHER already exists (since 0_init) — no enum change for the
-- role. jsonShape/rules are intentionally NOT stored: they stay code-locked
-- in the per-type prompt files (DB-first override seam).

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "basePromptVersionId" TEXT;

-- AlterTable
ALTER TABLE "AiUsage" ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "BasePrompt" (
    "id" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "level" "CefrLevel" NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasePrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasePromptVersion" (
    "id" TEXT NOT NULL,
    "basePromptId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "PromptStatus" NOT NULL DEFAULT 'DRAFT',
    "systemPrompt" TEXT NOT NULL,
    "userInstructions" TEXT NOT NULL,
    "changeNote" VARCHAR(500),
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "BasePromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BasePrompt_type_level_key" ON "BasePrompt"("type", "level");

-- CreateIndex
CREATE INDEX "BasePromptVersion_basePromptId_status_idx" ON "BasePromptVersion"("basePromptId", "status");

-- CreateIndex
CREATE INDEX "BasePromptVersion_authorId_idx" ON "BasePromptVersion"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "BasePromptVersion_basePromptId_versionNumber_key" ON "BasePromptVersion"("basePromptId", "versionNumber");

-- CreateIndex
CREATE INDEX "Exercise_basePromptVersionId_idx" ON "Exercise"("basePromptVersionId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_basePromptVersionId_fkey" FOREIGN KEY ("basePromptVersionId") REFERENCES "BasePromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasePromptVersion" ADD CONSTRAINT "BasePromptVersion_basePromptId_fkey" FOREIGN KEY ("basePromptId") REFERENCES "BasePrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasePromptVersion" ADD CONSTRAINT "BasePromptVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
