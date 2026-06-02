/**
 * GET    /api/admin/saved-prompts/[id]  — fetch one (author-only)
 * PATCH  /api/admin/saved-prompts/[id]  — update (author-only)
 * DELETE /api/admin/saved-prompts/[id]  — delete (author-only)
 *
 * A prompt owned by another admin is reported as 404 (existence isn't
 * leaked). Deleting a prompt leaves its sessions intact — the FK is
 * onDelete: SetNull, so the history keeps the run, just without the link.
 */
import { prisma } from "@wortschatz/database";

import { jsonError, jsonOk, requireAdmin } from "@/lib/admin/guard";
import { SavedPromptUpdateSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

/** Load a prompt only if it belongs to the caller. */
async function ownedPrompt(id: string, userId: string) {
  const row = await prisma.savedPrompt.findUnique({ where: { id } });
  if (!row || row.authorId !== userId) return null;
  return row;
}

export async function GET(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { id } = await params;

  const prompt = await ownedPrompt(id, guard.userId);
  if (!prompt) return jsonError("not_found", 404);
  return jsonOk({ prompt });
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_json", 400, "Request body must be valid JSON.");
  }

  const parsed = SavedPromptUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_error", 400, parsed.error.message);
  }

  const existing = await ownedPrompt(id, guard.userId);
  if (!existing) return jsonError("not_found", 404);

  const data = parsed.data;
  const prompt = await prisma.savedPrompt.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description ?? null } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.systemPrompt !== undefined ? { systemPrompt: data.systemPrompt ?? null } : {}),
      ...(data.userInstructions !== undefined
        ? { userInstructions: data.userInstructions ?? null }
        : {}),
    },
  });

  return jsonOk({ prompt });
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { id } = await params;

  const existing = await ownedPrompt(id, guard.userId);
  if (!existing) return jsonError("not_found", 404);

  await prisma.savedPrompt.delete({ where: { id } });
  return jsonOk({ deleted: true });
}
