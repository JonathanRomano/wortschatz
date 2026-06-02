/**
 * GET /api/admin/generation-sessions — paginated history of the current
 * admin's generation runs (newest first), filterable by type, level, saved
 * prompt, and a created-at date range. There is no DELETE: sessions are an
 * audit trail (Task 3.4).
 */
import { prisma } from "@wortschatz/database";
import type { Prisma } from "@wortschatz/database";

import { jsonError, jsonOk, requireAdmin } from "@/lib/admin/guard";
import { SessionListQuerySchema } from "@/lib/admin/schemas";

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const userId = guard.userId;

  const sp = new URL(request.url).searchParams;
  const parsed = SessionListQuerySchema.safeParse({
    type: sp.get("type") ?? undefined,
    level: sp.get("level") ?? undefined,
    savedPromptId: sp.get("savedPromptId") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    page: sp.get("page") ?? undefined,
    pageSize: sp.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("validation_error", 400, parsed.error.message);
  }
  const q = parsed.data;

  const createdAt: Prisma.DateTimeFilter = {};
  if (q.from) createdAt.gte = q.from;
  if (q.to) createdAt.lte = q.to;

  const where: Prisma.GenerationSessionWhereInput = {
    authorId: userId,
    ...(q.type ? { type: q.type } : {}),
    ...(q.level ? { level: q.level } : {}),
    ...(q.savedPromptId ? { savedPromptId: q.savedPromptId } : {}),
    ...(q.from || q.to ? { createdAt } : {}),
  };

  const [total, sessions] = await Promise.all([
    prisma.generationSession.count({ where }),
    prisma.generationSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        savedPrompt: { select: { name: true } },
        _count: { select: { exercises: true } },
      },
    }),
  ]);

  return jsonOk({
    page: q.page,
    pageSize: q.pageSize,
    total,
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
      source: s.source,
      provider: s.provider,
      modelUsed: s.modelUsed,
      type: s.type,
      level: s.level,
      topic: s.topic,
      requestedCount: s.requestedCount,
      successCount: s.successCount,
      failureCount: s.failureCount,
      durationMs: s.durationMs,
      customSystem: s.customSystem,
      customInstructions: s.customInstructions,
      savedPromptId: s.savedPromptId,
      savedPromptName: s.savedPrompt?.name ?? null,
      exerciseCount: s._count.exercises,
    })),
  });
}
