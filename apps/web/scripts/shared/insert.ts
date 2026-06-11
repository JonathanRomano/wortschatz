/**
 * Prisma write for a validated exercise. Mirrors the column choices in
 * the legacy generate-exercises.ts: authored by the seed admin, status
 * PUBLISHED, targetLanguage "de", `model` set to the actual provider
 * model, `tip` omitted entirely when absent so the column stays SQL NULL.
 * When a generation session id is supplied the row is linked to it for the
 * history/audit trail.
 */
import { prisma } from "@wortschatz/database";
import type { CefrLevel, ExerciseType, Prisma } from "@wortschatz/database";

import { seedAdminId } from "./session";

export interface InsertArgs {
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  content: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanation: Record<string, unknown>;
  tip?: Record<string, unknown>;
  tags: string[];
  /** e.g. "claude-sonnet-4-6" or "gpt-4o" — persisted to Exercise.model. */
  modelUsed: string;
  /** Links the exercise to the run that produced it. */
  generationSessionId?: string;
  /** The ACTIVE prompt version that produced it (Decision 7). NULL when the
   *  hardcoded file fallback was used. */
  basePromptVersionId?: string | null;
}

export async function insertExercise(args: InsertArgs): Promise<string> {
  const authorId = await seedAdminId();
  const row = await prisma.exercise.create({
    data: {
      authorId,
      type: args.type,
      title: args.title,
      targetLanguage: "de",
      level: args.level,
      content: args.content as Prisma.InputJsonValue,
      solution: args.solution as Prisma.InputJsonValue,
      explanation: args.explanation as Prisma.InputJsonValue,
      tags: args.tags,
      status: "PUBLISHED",
      model: args.modelUsed,
      ...(args.tip ? { tip: args.tip as Prisma.InputJsonValue } : {}),
      ...(args.generationSessionId
        ? { generationSessionId: args.generationSessionId }
        : {}),
      ...(args.basePromptVersionId
        ? { basePromptVersionId: args.basePromptVersionId }
        : {}),
    },
    select: { id: true },
  });
  return row.id;
}
