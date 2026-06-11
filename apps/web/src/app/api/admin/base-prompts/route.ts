/**
 * GET /api/admin/base-prompts — list all 40 (type, level) base prompts with
 * their active-version metadata and draft-pending flag. ADMIN or TEACHER.
 *
 * Filters: ?type=, ?level=, ?hasDraft=true|false. There are only 40 rows, so
 * the draft filter is applied in memory after serialization.
 */
import { prisma } from "@wortschatz/database";

import { serializeListItem, versionAuthorSelect } from "@/lib/admin/base-prompts";
import { jsonError, jsonOk, requireAdminOrTeacher } from "@/lib/admin/guard";
import { BasePromptListQuerySchema } from "@/lib/admin/schemas";

export async function GET(request: Request) {
  const guard = await requireAdminOrTeacher();
  if (!guard.ok) return guard.res;

  const url = new URL(request.url);
  const parsed = BasePromptListQuerySchema.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    level: url.searchParams.get("level") ?? undefined,
    hasDraft: url.searchParams.get("hasDraft") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("validation_error", 400, parsed.error.message);
  }
  const { type, level, hasDraft } = parsed.data;

  const rows = await prisma.basePrompt.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(level ? { level } : {}),
    },
    include: { versions: { include: { author: versionAuthorSelect } } },
    orderBy: [{ type: "asc" }, { level: "asc" }],
  });

  let prompts = rows.map(serializeListItem);
  if (hasDraft === "true") prompts = prompts.filter((p) => p.hasDraftPending);
  if (hasDraft === "false") prompts = prompts.filter((p) => !p.hasDraftPending);

  return jsonOk({ prompts });
}
