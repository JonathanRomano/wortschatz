/**
 * GET /api/admin/generation-sessions/[id] — one session (author-only) with
 * the full list of exercises it produced. 404 when the session doesn't exist
 * or belongs to another admin.
 */
import { prisma } from "@wortschatz/database";

import { jsonError, jsonOk, requireAdmin } from "@/lib/admin/guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { id } = await params;

  const session = await prisma.generationSession.findUnique({
    where: { id },
    include: {
      savedPrompt: { select: { name: true } },
      exercises: {
        select: {
          id: true,
          title: true,
          type: true,
          level: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session || session.authorId !== guard.userId) {
    return jsonError("not_found", 404);
  }

  return jsonOk({
    session: {
      id: session.id,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      source: session.source,
      provider: session.provider,
      modelUsed: session.modelUsed,
      type: session.type,
      level: session.level,
      topic: session.topic,
      requestedCount: session.requestedCount,
      successCount: session.successCount,
      failureCount: session.failureCount,
      durationMs: session.durationMs,
      customSystem: session.customSystem,
      customInstructions: session.customInstructions,
      savedPromptId: session.savedPromptId,
      savedPromptName: session.savedPrompt?.name ?? null,
      failures: session.failures,
      exercises: session.exercises,
    },
  });
}
