-- Admin Exercise Generator (v2) — generation sessions + saved prompts.
-- Additive only: a new enum, two new tables, one new nullable FK column on
-- Exercise, and supporting indexes. No destructive changes; existing rows
-- keep generationSessionId NULL (they predate sessions).

-- CreateEnum
CREATE TYPE "GenerationSource" AS ENUM ('UI', 'CLI');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "generationSessionId" TEXT;

-- CreateTable
CREATE TABLE "SavedPrompt" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "type" "ExerciseType" NOT NULL,
    "systemPrompt" TEXT,
    "userInstructions" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SavedPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationSession" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "source" "GenerationSource" NOT NULL,
    "provider" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "level" "CefrLevel" NOT NULL,
    "topic" TEXT,
    "requestedCount" INTEGER NOT NULL,
    "savedPromptId" TEXT,
    "customSystem" BOOLEAN NOT NULL DEFAULT false,
    "customInstructions" BOOLEAN NOT NULL DEFAULT false,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "failures" JSONB,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedPrompt_authorId_type_idx" ON "SavedPrompt"("authorId", "type");

-- CreateIndex
CREATE INDEX "GenerationSession_authorId_createdAt_idx" ON "GenerationSession"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationSession_type_level_idx" ON "GenerationSession"("type", "level");

-- CreateIndex
CREATE INDEX "GenerationSession_savedPromptId_idx" ON "GenerationSession"("savedPromptId");

-- CreateIndex
CREATE INDEX "Exercise_generationSessionId_idx" ON "Exercise"("generationSessionId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_generationSessionId_fkey" FOREIGN KEY ("generationSessionId") REFERENCES "GenerationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPrompt" ADD CONSTRAINT "SavedPrompt_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationSession" ADD CONSTRAINT "GenerationSession_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationSession" ADD CONSTRAINT "GenerationSession_savedPromptId_fkey" FOREIGN KEY ("savedPromptId") REFERENCES "SavedPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
