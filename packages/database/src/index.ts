/**
 * @wortschatz/database — single source of truth for Prisma access.
 *
 * Re-exports every type from `@prisma/client` (so consumers can write
 * `import type { ExerciseType } from '@wortschatz/database'`) and
 * provides a `prisma` singleton that survives Next.js hot reload by
 * stashing the client on `globalThis`. This is the same pattern the
 * pre-monorepo `src/lib/db.ts` used; centralizing it here means web
 * and api both get an identical client without duplicating state.
 */
export * from "@prisma/client";
export { PrismaClient } from "@prisma/client";

import { PrismaClient } from "@prisma/client";
import type { CefrLevel, ExerciseType } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// --- Prompt curation -----------------------------------------------------

/** The editable strings the ACTIVE BasePromptVersion contributes. */
export interface ActiveBasePromptVoice {
  /** BasePromptVersion.id — recorded on Exercise.basePromptVersionId. */
  versionId: string;
  systemPrompt: string;
  userInstructions: string;
}

/**
 * Resolve the single ACTIVE BasePromptVersion for a (type, level), or `null`
 * when none exists (the caller then falls back to the hardcoded prompt file,
 * Decision 5). Shared by apps/api's live generate service and the web
 * CLI-offline generator so both honor DB-curated prompts identically
 * (Decision 6). Lives here — not in the Prisma-free @wortschatz/exercises —
 * because it touches the client.
 */
export async function getActiveBasePromptVoice(
  type: ExerciseType,
  level: CefrLevel,
): Promise<ActiveBasePromptVoice | null> {
  const version = await prisma.basePromptVersion.findFirst({
    where: { status: "ACTIVE", basePrompt: { type, level } },
    select: { id: true, systemPrompt: true, userInstructions: true },
  });
  return version
    ? {
        versionId: version.id,
        systemPrompt: version.systemPrompt,
        userInstructions: version.userInstructions,
      }
    : null;
}
