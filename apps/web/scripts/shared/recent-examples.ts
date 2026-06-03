/**
 * Anti-duplication DB helper. Fetches the most recent N exercises of the
 * same type + level and reduces each to one representative line (via the
 * pure `excerptFor` in @wortschatz/exercises) so the prompt can tell the
 * model "generate something different from these".
 *
 * The query is live every iteration — exercises inserted earlier in the
 * same run are visible to later iterations, so a single bulk run won't
 * repeat itself. The pure rendering (`renderRecentBlock` / `excerptFor`)
 * lives in the shared package so the Express endpoint composes the same
 * block; only this Prisma query stays web-side.
 */
import { prisma } from "@wortschatz/database";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import { excerptFor, type RecentExample } from "@wortschatz/exercises";

export async function fetchRecentExamples(
  type: ExerciseType,
  level: CefrLevel,
  limit = 10,
): Promise<RecentExample[]> {
  const rows = await prisma.exercise.findMany({
    where: { type, level },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { title: true, content: true, solution: true },
  });

  return rows.map((row) => ({
    title: row.title,
    excerpt: excerptFor(
      type,
      (row.content ?? {}) as Record<string, unknown>,
      (row.solution ?? {}) as Record<string, unknown>,
      row.title,
    ),
  }));
}
