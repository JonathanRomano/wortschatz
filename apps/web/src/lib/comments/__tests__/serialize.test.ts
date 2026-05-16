import { describe, expect, it } from "vitest";

import { serializeComment, type CommentRow } from "@/lib/comments/serialize";

const CREATED = new Date("2026-04-01T12:00:00.000Z");
const EDITED = new Date("2026-04-02T08:30:00.000Z");
const DELETED = new Date("2026-04-03T09:00:00.000Z");

function makeRow(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: "cmt-1",
    userId: "user-author",
    content: "hallo welt",
    createdAt: CREATED,
    editedAt: null,
    deletedAt: null,
    user: {
      id: "user-author",
      name: "Author Anna",
      avatarUrl: "https://example.test/a.png",
    },
    _count: { likes: 3 },
    likes: [],
    ...overrides,
  };
}

describe("serializeComment — active row", () => {
  it("returns content, user, editedAt, likeCount, and deleted:false", () => {
    const row = makeRow({ editedAt: EDITED });
    const dto = serializeComment(row, "user-viewer");

    expect(dto).toEqual({
      id: "cmt-1",
      createdAt: CREATED.toISOString(),
      editedAt: EDITED.toISOString(),
      content: "hallo welt",
      user: {
        id: "user-author",
        name: "Author Anna",
        avatarUrl: "https://example.test/a.png",
      },
      likeCount: 3,
      viewerLiked: false,
      isOwn: false,
      deleted: false,
    });
  });

  it("editedAt is null on the DTO when the row has not been edited", () => {
    const row = makeRow({ editedAt: null });
    const dto = serializeComment(row, "user-viewer");

    expect(dto.deleted).toBe(false);
    expect(dto.editedAt).toBeNull();
  });

  it("viewerLiked is false when the likes array is empty", () => {
    const dto = serializeComment(makeRow({ likes: [] }), "user-viewer");
    expect(dto.viewerLiked).toBe(false);
  });

  it("viewerLiked is true when the viewer's like row is in the array", () => {
    const dto = serializeComment(
      makeRow({ likes: [{ id: "like-1" }] }),
      "user-viewer",
    );
    expect(dto.viewerLiked).toBe(true);
  });

  it("isOwn is true when viewerId matches the comment's userId", () => {
    const dto = serializeComment(
      makeRow({ userId: "user-self" }),
      "user-self",
    );
    expect(dto.isOwn).toBe(true);
  });

  it("isOwn is false when viewerId differs from the author", () => {
    const dto = serializeComment(
      makeRow({ userId: "user-author" }),
      "user-other",
    );
    expect(dto.isOwn).toBe(false);
  });

  it("isOwn is false when viewerId is null (anonymous viewer)", () => {
    const dto = serializeComment(makeRow(), null);
    expect(dto.isOwn).toBe(false);
  });

  it("passes through the underlying likeCount from _count.likes", () => {
    const dto = serializeComment(makeRow({ _count: { likes: 42 } }), null);
    expect(dto.likeCount).toBe(42);
  });
});

describe("serializeComment — soft-deleted row", () => {
  it("strips content and user, keeps id/createdAt/likeCount", () => {
    const row = makeRow({
      deletedAt: DELETED,
      content: "secret content",
      _count: { likes: 7 },
    });
    const dto = serializeComment(row, "user-author");

    expect(dto).toEqual({
      id: "cmt-1",
      createdAt: CREATED.toISOString(),
      likeCount: 7,
      viewerLiked: false,
      isOwn: false,
      deleted: true,
    });
    // Explicitly assert the redacted fields are absent.
    expect(dto.content).toBeUndefined();
    expect(dto.user).toBeUndefined();
    expect(dto.editedAt).toBeUndefined();
  });

  it("forces isOwn to false even when the viewer is the original author", () => {
    const row = makeRow({
      deletedAt: DELETED,
      userId: "user-author",
    });
    const dto = serializeComment(row, "user-author");
    expect(dto.isOwn).toBe(false);
    expect(dto.deleted).toBe(true);
  });

  it("still reports viewerLiked from the likes array on a deleted row", () => {
    // viewerLiked is a UI hint; a deleted comment can still surface the
    // current viewer's prior like state if the like row survives.
    const row = makeRow({
      deletedAt: DELETED,
      likes: [{ id: "like-1" }],
    });
    const dto = serializeComment(row, "user-viewer");
    expect(dto.viewerLiked).toBe(true);
    expect(dto.deleted).toBe(true);
  });
});
