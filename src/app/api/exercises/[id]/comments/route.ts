// List + create comments for an exercise.
//
// GET — public read. Sorted by like count DESC, then createdAt DESC.
// POST — auth required. Trim + max-500 + blocklist + 5/min/user rate
// limit (counted from `ExerciseComment.createdAt` so it survives a
// server restart; we don't need a separate window row).

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  COMMENT_MAX_LENGTH,
  COMMENT_RATE_LIMIT,
  findBlockedWord,
} from "@/config/moderation";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  loadComments,
} from "@/lib/comments/queries";
import { serializeComment, type CommentRow } from "@/lib/comments/serialize";

const createSchema = z.object({
  content: z.string(),
});

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function parsePositiveInt(
  raw: string | null,
  fallback: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(
    url.searchParams.get("pageSize"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );

  // Confirm the exercise exists so we don't return an empty list for a
  // typo. Keeps the API honest about 404s.
  const exists = await prisma.exercise.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return errorResponse("not_found", 404);

  const result = await loadComments({
    exerciseId: id,
    page,
    pageSize,
    viewerId,
  });
  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return errorResponse("unauthorized", 401);
  const userId = session.user.id;

  // Confirm the exercise exists. Avoids stranded comment rows from a
  // typo'd id (Prisma's FK CASCADE would still keep things tidy, but
  // a 404 here is friendlier).
  const exists = await prisma.exercise.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return errorResponse("not_found", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", 400);
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return errorResponse("invalid_body", 400);

  const content = parsed.data.content.trim();
  if (content.length === 0) return errorResponse("empty", 400);
  if (content.length > COMMENT_MAX_LENGTH) {
    return errorResponse("too_long", 400);
  }

  const blocked = findBlockedWord(content);
  if (blocked) return errorResponse("blocked_word", 400);

  // Rate limit: count the user's recent comments. We do a count then
  // create — strictly best-effort under high concurrency, but the
  // ceiling (5/min) is low enough that a one-comment overshoot from a
  // race is fine and not worth a row-level lock.
  const since = new Date(Date.now() - COMMENT_RATE_LIMIT.WINDOW_MS);
  const recent = await prisma.exerciseComment.count({
    where: { userId, createdAt: { gt: since } },
  });
  if (recent >= COMMENT_RATE_LIMIT.PER_MINUTE) {
    return errorResponse("rate_limited", 429);
  }

  const created = await prisma.exerciseComment.create({
    data: { exerciseId: id, userId, content },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { id: true } },
    },
  });

  const dto = serializeComment(created as unknown as CommentRow, userId);
  return NextResponse.json(dto, { status: 201 });
}
