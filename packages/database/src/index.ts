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
