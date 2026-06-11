/**
 * POST /api/admin/base-prompts/[id]/versions — create a new DRAFT version.
 * ADMIN or TEACHER (Decision 3/8).
 *
 * Body: { systemPrompt, userInstructions, changeNote? } — the editable VOICE
 * only. There are no admin-only stored fields: jsonShape/rules are
 * code-locked in the per-type prompt file (DB-first decision), so there is
 * nothing to strip for TEACHER. The ADMIN-only gate is `revert`, not field
 * scope.
 *
 * versionNumber is max(existing)+1, monotonic per basePromptId. The
 * aggregate+create races are caught by the @@unique([basePromptId,
 * versionNumber]) constraint and retried.
 */
import { Prisma, prisma } from "@wortschatz/database";

import { serializeVersion, versionAuthorSelect } from "@/lib/admin/base-prompts";
import { jsonError, jsonOk, requireAdminOrTeacher } from "@/lib/admin/guard";
import { CreateDraftSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const guard = await requireAdminOrTeacher();
  if (!guard.ok) return guard.res;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_json", 400, "Request body must be valid JSON.");
  }
  const parsed = CreateDraftSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_error", 400, parsed.error.message);
  }
  const data = parsed.data;

  const bp = await prisma.basePrompt.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!bp) return jsonError("not_found", 404);

  for (let attempt = 0; attempt < 3; attempt++) {
    const agg = await prisma.basePromptVersion.aggregate({
      where: { basePromptId: id },
      _max: { versionNumber: true },
    });
    const next = (agg._max.versionNumber ?? 0) + 1;
    try {
      const created = await prisma.basePromptVersion.create({
        data: {
          basePromptId: id,
          versionNumber: next,
          status: "DRAFT",
          systemPrompt: data.systemPrompt,
          userInstructions: data.userInstructions,
          changeNote: data.changeNote ?? null,
          authorId: guard.userId,
        },
        include: { author: versionAuthorSelect },
      });
      return jsonOk({ version: serializeVersion(created) }, 201);
    } catch (err) {
      // Lost the race for this versionNumber — recompute and retry.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }
  return jsonError("conflict", 409, "Could not allocate a version number.");
}
