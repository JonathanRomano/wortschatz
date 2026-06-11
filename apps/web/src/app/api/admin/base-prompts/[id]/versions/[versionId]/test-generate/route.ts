/**
 * POST /api/admin/base-prompts/[id]/versions/[versionId]/test-generate —
 * generate ONE exercise using a specific version's editable voice, WITHOUT
 * persisting it or creating a GenerationSession (Task 3.4). ADMIN or TEACHER.
 *
 * It DOES spend tokens: the request routes through apps/api with X-User-Id,
 * so it counts against the per-user GENERATE_EXERCISE rate limit and writes
 * an AiUsage row tagged source="test-generate". The draft's content is passed
 * as `promptVoiceOverride`, bypassing the ACTIVE-version lookup so a curator
 * can preview a DRAFT before publishing it.
 *
 * Body: { topic }. Always one exercise.
 */
import { prisma } from "@wortschatz/database";

import {
  GenerationValidationError,
  generateExerciseRemote,
} from "@/lib/api-client";
import { AiRateLimitedError } from "@/lib/ai-rate-limit";
import { jsonError, jsonOk, requireAdminOrTeacher } from "@/lib/admin/guard";
import { TestGenerateSchema } from "@/lib/admin/schemas";
import { fetchRecentExamples } from "@scripts/shared/recent-examples";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function POST(request: Request, { params }: Params) {
  const guard = await requireAdminOrTeacher();
  if (!guard.ok) return guard.res;
  const { id, versionId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_json", 400, "Request body must be valid JSON.");
  }
  const parsed = TestGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_error", 400, parsed.error.message);
  }
  const { topic } = parsed.data;

  const version = await prisma.basePromptVersion.findUnique({
    where: { id: versionId },
    include: { basePrompt: { select: { id: true, type: true, level: true } } },
  });
  if (!version || version.basePrompt.id !== id) {
    return jsonError("not_found", 404);
  }

  const { type, level } = version.basePrompt;
  const recentExamples = await fetchRecentExamples(type, level, 10);

  try {
    const dto = await generateExerciseRemote(
      {
        type,
        level,
        topic,
        recentExamples,
        provider: "claude",
        promptVoiceOverride: {
          systemPrompt: version.systemPrompt,
          userInstructions: version.userInstructions,
        },
        source: "test-generate",
      },
      guard.userId,
    );

    const tokenCost = (dto.inputTokens ?? 0) + (dto.outputTokens ?? 0);
    return jsonOk({
      exercise: {
        title: dto.title,
        content: dto.content,
        solution: dto.solution,
        explanation: dto.explanation,
        tags: dto.tags,
        tip: dto.tip,
        modelUsed: dto.modelUsed,
      },
      tokenCost,
    });
  } catch (err) {
    if (err instanceof AiRateLimitedError) {
      return jsonError("rate_limited", 429);
    }
    if (err instanceof GenerationValidationError) {
      return jsonError("validation_failed", 422, err.errors.join("; "));
    }
    return jsonError(
      "generate_failed",
      502,
      err instanceof Error ? err.message : String(err),
    );
  }
}
