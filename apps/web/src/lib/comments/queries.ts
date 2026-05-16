import { prisma } from "@/lib/db";
import { serializeComment, type CommentRow } from "./serialize";
import type { CommentListResponse } from "./types";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/**
 * Fetch one page of comments for an exercise. Sort order: most-liked
 * first, then `createdAt` DESC for ties. Soft-deleted rows are still
 * counted toward `total` but their `content`/`user` are hidden by
 * `serializeComment`. Excluding them entirely would orphan any future
 * reply threads, hence the inclusive query.
 */
export async function loadComments(params: {
  exerciseId: string;
  page: number;
  pageSize: number;
  viewerId: string | null;
}): Promise<CommentListResponse> {
  const { exerciseId, viewerId } = params;
  const pageSize = Math.min(
    Math.max(1, params.pageSize | 0),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, params.page | 0);
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.exerciseComment.findMany({
      where: { exerciseId, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true } },
        likes: viewerId
          ? { where: { userId: viewerId }, select: { id: true } }
          : { where: { id: "__never__" }, select: { id: true } },
      },
      orderBy: [
        { likes: { _count: "desc" } },
        { createdAt: "desc" },
      ],
      skip,
      take: pageSize,
    }),
    prisma.exerciseComment.count({
      where: { exerciseId, deletedAt: null },
    }),
  ]);

  const comments = (rows as unknown as CommentRow[]).map((row) =>
    serializeComment(row, viewerId),
  );

  return {
    comments,
    page,
    pageSize,
    total,
    hasMore: skip + comments.length < total,
  };
}

/**
 * Load a single comment by id, returning the DTO. Returns null if the
 * row is missing OR soft-deleted — the API surface treats deletes as
 * if the row didn't exist for write paths.
 */
export async function loadComment(
  id: string,
  viewerId: string | null,
): Promise<{ row: CommentRow; dto: ReturnType<typeof serializeComment> } | null> {
  const row = (await prisma.exerciseComment.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { likes: true } },
      likes: viewerId
        ? { where: { userId: viewerId }, select: { id: true } }
        : { where: { id: "__never__" }, select: { id: true } },
    },
  })) as unknown as CommentRow | null;
  if (!row || row.deletedAt) return null;
  return { row, dto: serializeComment(row, viewerId) };
}
