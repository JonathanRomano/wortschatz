/**
 * POST /api/admin/base-prompts/[id]/versions/[versionId]/publish — promote a
 * DRAFT to ACTIVE. ADMIN or TEACHER (publishing is the point of the role,
 * Task 3.5). The previous ACTIVE version is demoted to INACTIVE in the SAME
 * transaction so a (type, level) never has two active versions.
 */
import { prisma } from "@wortschatz/database";

import { serializeVersion, versionAuthorSelect } from "@/lib/admin/base-prompts";
import { jsonError, jsonOk, requireAdminOrTeacher } from "@/lib/admin/guard";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const guard = await requireAdminOrTeacher();
  if (!guard.ok) return guard.res;
  const { id, versionId } = await params;

  const version = await prisma.basePromptVersion.findUnique({
    where: { id: versionId },
    select: { id: true, basePromptId: true, status: true },
  });
  if (!version || version.basePromptId !== id) {
    return jsonError("not_found", 404);
  }
  if (version.status !== "DRAFT") {
    return jsonError("not_a_draft", 409, "Only a DRAFT version can be published.");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    await tx.basePromptVersion.updateMany({
      where: { basePromptId: id, status: "ACTIVE" },
      data: { status: "INACTIVE", deactivatedAt: now },
    });
    return tx.basePromptVersion.update({
      where: { id: versionId },
      data: { status: "ACTIVE", publishedAt: now, deactivatedAt: null },
      include: { author: versionAuthorSelect },
    });
  });

  return jsonOk({ version: serializeVersion(updated) });
}
