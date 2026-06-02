/**
 * GenerationSession lifecycle, shared by the CLI runner and the admin API.
 *
 * Every real generation run (Decision 8) is one GenerationSession row: the
 * API route creates it up front to record the UI metadata and obtain the id,
 * while the CLI lets `runGeneration` open one itself (source "CLI", authored
 * by the seed admin). Either way the runner links the produced exercises to
 * the session and finalizes it with the outcome. Dry runs create nothing.
 */
import { prisma, Prisma } from "@wortschatz/database";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";

import type { GenerationFailure, GenerationSource } from "./types";

const ADMIN_EMAIL = "admin@wortschatz.app";

let cachedAdminId: string | null = null;

/** The seed admin's id — author of CLI-generated sessions and exercises. */
export async function seedAdminId(): Promise<string> {
  if (cachedAdminId) return cachedAdminId;
  const admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  if (!admin) {
    throw new Error(
      `Seed admin (${ADMIN_EMAIL}) not found. Run \`pnpm db:seed\` first.`,
    );
  }
  cachedAdminId = admin.id;
  return cachedAdminId;
}

export interface CreateSessionInput {
  authorId: string;
  source: GenerationSource;
  /** "claude" | "gpt". */
  provider: string;
  modelUsed: string;
  type: ExerciseType;
  level: CefrLevel;
  topic?: string;
  requestedCount: number;
  savedPromptId?: string;
  customSystem: boolean;
  customInstructions: boolean;
}

/** Open a new session and return its id. */
export async function createGenerationSession(
  input: CreateSessionInput,
): Promise<string> {
  const row = await prisma.generationSession.create({
    data: {
      authorId: input.authorId,
      source: input.source,
      provider: input.provider,
      modelUsed: input.modelUsed,
      type: input.type,
      level: input.level,
      topic: input.topic ?? null,
      requestedCount: input.requestedCount,
      savedPromptId: input.savedPromptId ?? null,
      customSystem: input.customSystem,
      customInstructions: input.customInstructions,
    },
    select: { id: true },
  });
  return row.id;
}

export interface FinalizeSessionInput {
  successCount: number;
  failureCount: number;
  failures: GenerationFailure[];
  durationMs: number;
}

/** Record the outcome of a run and stamp completedAt. */
export async function finalizeGenerationSession(
  sessionId: string,
  input: FinalizeSessionInput,
): Promise<void> {
  await prisma.generationSession.update({
    where: { id: sessionId },
    data: {
      successCount: input.successCount,
      failureCount: input.failureCount,
      failures:
        input.failures.length > 0
          ? (input.failures as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      durationMs: input.durationMs,
      completedAt: new Date(),
    },
  });
}
