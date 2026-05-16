// Shape returned by the comments API + consumed by the React client.
// Soft-deleted rows are returned with `deleted: true`, no `content`, no
// `user`, no `editedAt` — the client renders a "[deleted]" placeholder.
export type CommentDTO = {
  id: string;
  createdAt: string;
  likeCount: number;
  viewerLiked: boolean;
  // Always false for soft-deleted rows below.
  isOwn: boolean;
  // Discriminated by `deleted`:
  deleted: boolean;
  content?: string;
  editedAt?: string | null;
  user?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
};

export type CommentListResponse = {
  comments: CommentDTO[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};
