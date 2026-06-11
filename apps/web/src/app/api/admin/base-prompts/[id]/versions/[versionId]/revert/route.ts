/**
 * POST /api/admin/base-prompts/[id]/versions/[versionId]/revert — reactivate a
 * previously-active (INACTIVE) version. ADMIN-only (Task 3.6) — the safety net
 * that lets an admin roll back a TEACHER publish in one click. No new version
 * is created; the historical row is flipped back to ACTIVE and the current
 * ACTIVE is demoted to INACTIVE in the same transaction.
 */
import { prisma } from "@wortschatz/database";

import { serializeVersion, versionAuthorSelect } from "@/lib/admin/base-prompts";
import { jsonError, jsonOk, requireAdmin } from "@/lib/admin/guard";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function POST(_request: Request, { params }: Params) {
  // ADMIN-only: requireAdmin returns 403 for TEACHER.
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { id, versionId } = await params;

  const version = await prisma.basePromptVersion.findUnique({
    where: { id: versionId },
    select: { id: true, basePromptId: true, status: true },
  });
  if (!version || version.basePromptId !== id) {
    return jsonError("not_found", 404);
  }
  if (version.status === "ACTIVE") {
    return jsonError("already_active", 409, "That version is already active.");
  }
  if (version.status === "DRAFT") {
    return jsonError(
      "cannot_revert_draft",
      409,
      "Publish a draft instead of reverting to it.",
    );
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
