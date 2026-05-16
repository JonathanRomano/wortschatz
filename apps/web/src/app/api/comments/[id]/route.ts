// Edit + soft-delete a single comment.
//
// PATCH — author only. Re-runs the word filter so an edit can't smuggle
// banned content past moderation. `createdAt` is preserved; `editedAt`
// is set to now so the UI can show "(edited)".
// DELETE — author or admin. Soft delete: set `deletedAt`. Row stays so
// any like counts / future replies keep their context, but the API
// response shape redacts content and author.

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  COMMENT_MAX_LENGTH,
  findBlockedWord,
} from "@/config/moderation";
import { serializeComment, type CommentRow } from "@/lib/comments/serialize";

const patchSchema = z.object({
  content: z.string(),
});

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return errorResponse("unauthorized", 401);
  const userId = session.user.id;

  const existing = await prisma.exerciseComment.findUnique({
    where: { id },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) return errorResponse("not_found", 404);
  if (existing.userId !== userId) return errorResponse("forbidden", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", 400);
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("invalid_body", 400);

  const content = parsed.data.content.trim();
  if (content.length === 0) return errorResponse("empty", 400);
  if (content.length > COMMENT_MAX_LENGTH) {
    return errorResponse("too_long", 400);
  }
  if (findBlockedWord(content)) return errorResponse("blocked_word", 400);

  const updated = await prisma.exerciseComment.update({
    where: { id },
    data: { content, editedAt: new Date() },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { id: true } },
    },
  });

  const dto = serializeComment(updated as unknown as CommentRow, userId);
  return NextResponse.json(dto);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return errorResponse("unauthorized", 401);
  const userId = session.user.id;
  const role = session.user.role;

  const existing = await prisma.exerciseComment.findUnique({
    where: { id },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) return errorResponse("not_found", 404);

  const isAuthor = existing.userId === userId;
  const isAdmin = role === "ADMIN";
  if (!isAuthor && !isAdmin) return errorResponse("forbidden", 403);

  await prisma.exerciseComment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
