import type { CommentDTO } from "./types";

// Server-side row shape that `serializeComment` expects. The query that
// builds it lives in `loadComments`, but the helper is exported so
// route handlers and the page-level fetch can share one source of truth.
export type CommentRow = {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  _count: { likes: number };
  // Only the viewer's own like row (if any) — used to derive viewerLiked.
  likes: Array<{ id: string }>;
};

/**
 * Convert a Prisma row into the public DTO. Soft-deleted rows are
 * returned without `content` or `user` so we never accidentally leak
 * the deleted content to the wire.
 */
export function serializeComment(
  row: CommentRow,
  viewerId: string | null,
): CommentDTO {
  const likeCount = row._count.likes;
  const viewerLiked = row.likes.length > 0;
  const isOwn = viewerId !== null && row.userId === viewerId;

  if (row.deletedAt) {
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      likeCount,
      viewerLiked,
      isOwn: false,
      deleted: true,
    };
  }

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    content: row.content,
    user: {
      id: row.user.id,
      name: row.user.name,
      avatarUrl: row.user.avatarUrl,
    },
    likeCount,
    viewerLiked,
    isOwn,
    deleted: false,
  };
}
