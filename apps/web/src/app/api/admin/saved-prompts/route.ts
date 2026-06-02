/**
 * GET  /api/admin/saved-prompts        — list the current admin's templates
 * POST /api/admin/saved-prompts        — create a template
 *
 * Saved prompts are private to their author (Decision 3). The list includes
 * `useCount` and a derived `lastUsedAt` (the createdAt of the most recent
 * session that referenced the prompt).
 */
import { prisma } from "@wortschatz/database";

import { jsonError, jsonOk, requireAdmin } from "@/lib/admin/guard";
import {
  ExerciseTypeSchema,
  SavedPromptCreateSchema,
} from "@/lib/admin/schemas";

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const userId = guard.userId;

  const typeParam = new URL(request.url).searchParams.get("type");
  let type: string | undefined;
  if (typeParam) {
    const parsed = ExerciseTypeSchema.safeParse(typeParam);
    if (!parsed.success) return jsonError("validation_error", 400, "Unknown type filter.");
    type = parsed.data;
  }

  const prompts = await prisma.savedPrompt.findMany({
    where: { authorId: userId, ...(type ? { type: type as never } : {}) },
    orderBy: { updatedAt: "desc" },
  });

  const ids = prompts.map((p) => p.id);
  const lastUsed = ids.length
    ? await prisma.generationSession.groupBy({
        by: ["savedPromptId"],
        where: { savedPromptId: { in: ids } },
        _max: { createdAt: true },
      })
    : [];
  const lastUsedMap = new Map(
    lastUsed.map((g) => [g.savedPromptId, g._max.createdAt]),
  );

  return jsonOk({
    prompts: prompts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      systemPrompt: p.systemPrompt,
      userInstructions: p.userInstructions,
      useCount: p.useCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      lastUsedAt: lastUsedMap.get(p.id) ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const userId = guard.userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_json", 400, "Request body must be valid JSON.");
  }

  const parsed = SavedPromptCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_error", 400, parsed.error.message);
  }
  const data = parsed.data;

  const prompt = await prisma.savedPrompt.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      systemPrompt: data.systemPrompt ?? null,
      userInstructions: data.userInstructions ?? null,
      authorId: userId,
    },
  });

  return jsonOk({ prompt }, 201);
}
