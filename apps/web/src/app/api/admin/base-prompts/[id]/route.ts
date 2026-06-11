/**
 * GET /api/admin/base-prompts/[id] — one base prompt with its active version,
 * full version history (latest first), and the code-locked jsonShape/rules
 * rendered for read-only display. ADMIN or TEACHER.
 */
import { prisma } from "@wortschatz/database";

import { serializeDetail, versionAuthorSelect } from "@/lib/admin/base-prompts";
import { jsonError, jsonOk, requireAdminOrTeacher } from "@/lib/admin/guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const guard = await requireAdminOrTeacher();
  if (!guard.ok) return guard.res;

  const { id } = await params;
  const bp = await prisma.basePrompt.findUnique({
    where: { id },
    include: { versions: { include: { author: versionAuthorSelect } } },
  });
  if (!bp) return jsonError("not_found", 404);

  return jsonOk({ prompt: serializeDetail(bp) });
}
