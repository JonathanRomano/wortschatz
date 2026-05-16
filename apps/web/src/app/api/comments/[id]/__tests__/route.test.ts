import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  commentFindUnique: vi.fn(),
  commentUpdate: vi.fn(),
  findBlockedWord: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@wortschatz/database", () => ({
  prisma: {
    exerciseComment: {
      findUnique: mocks.commentFindUnique,
      update: mocks.commentUpdate,
    },
  },
}));

vi.mock("@wortschatz/config", async () => {
  const actual = await vi.importActual<typeof import("@wortschatz/config")>(
    "@wortschatz/config",
  );
  return {
    ...actual,
    findBlockedWord: mocks.findBlockedWord,
  };
});

import { DELETE, PATCH } from "@/app/api/comments/[id]/route";

const COMMENT_ID = "cmt-1";
const AUTHOR = "user-author";
const OTHER = "user-other";
const ADMIN = "user-admin";

function paramPromise(id: string) {
  return Promise.resolve({ id });
}

function patchReq(body: unknown) {
  return new Request(`http://test/api/comments/${COMMENT_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.commentFindUnique.mockReset();
  mocks.commentUpdate.mockReset();
  mocks.findBlockedWord.mockReset();

  mocks.findBlockedWord.mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// PATCH — edit
// ---------------------------------------------------------------------------

describe("PATCH /api/comments/[id]", () => {
  it("returns 200 with the updated DTO when the author edits", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: AUTHOR } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });
    mocks.commentUpdate.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      content: "new content",
      createdAt: new Date("2026-04-01T00:00:00Z"),
      editedAt: new Date("2026-04-02T00:00:00Z"),
      deletedAt: null,
      user: { id: AUTHOR, name: "Anna", avatarUrl: null },
      _count: { likes: 0 },
      likes: [],
    });

    const res = await PATCH(patchReq({ content: "  new content  " }), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: COMMENT_ID,
      content: "new content",
      isOwn: true,
    });
    expect(mocks.commentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COMMENT_ID },
        data: expect.objectContaining({ content: "new content" }),
      }),
    );
    // editedAt is set on the update.
    const dataArg = mocks.commentUpdate.mock.calls[0]![0].data;
    expect(dataArg.editedAt).toBeInstanceOf(Date);
  });

  it("returns 401 when there is no session", async () => {
    mocks.auth.mockResolvedValueOnce(null);

    const res = await PATCH(patchReq({ content: "x" }), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the comment doesn't exist", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: AUTHOR } });
    mocks.commentFindUnique.mockResolvedValueOnce(null);

    const res = await PATCH(patchReq({ content: "x" }), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });

  it("returns 404 when the comment is soft-deleted", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: AUTHOR } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: new Date(),
    });

    const res = await PATCH(patchReq({ content: "x" }), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(404);
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when a non-author tries to edit", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: OTHER } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });

    const res = await PATCH(patchReq({ content: "evil" }), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: AUTHOR } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });

    const req = new Request(`http://test/api/comments/${COMMENT_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const res = await PATCH(req, { params: paramPromise(COMMENT_ID) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("returns 400 on body shape mismatch (validation)", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: AUTHOR } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });

    const res = await PATCH(patchReq({ wrong: 1 }), {
      params: paramPromise(COMMENT_ID),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  it("returns 400 when trimmed content is empty", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: AUTHOR } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });

    const res = await PATCH(patchReq({ content: "   " }), {
      params: paramPromise(COMMENT_ID),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("empty");
  });

  it("returns 400 when content exceeds 500 chars", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: AUTHOR } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });

    const res = await PATCH(patchReq({ content: "a".repeat(501) }), {
      params: paramPromise(COMMENT_ID),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("too_long");
  });

  it("returns 400 when an edit smuggles a blocked word", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: AUTHOR } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });
    mocks.findBlockedWord.mockReturnValueOnce("nope");

    const res = await PATCH(patchReq({ content: "smuggled nope" }), {
      params: paramPromise(COMMENT_ID),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("blocked_word");
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE — soft delete
// ---------------------------------------------------------------------------

function deleteReq() {
  return new Request(`http://test/api/comments/${COMMENT_ID}`, {
    method: "DELETE",
  });
}

describe("DELETE /api/comments/[id]", () => {
  it("returns 200 and soft-deletes when the author deletes", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: AUTHOR, role: "USER" },
    });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });
    mocks.commentUpdate.mockResolvedValueOnce({});

    const res = await DELETE(deleteReq(), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.commentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COMMENT_ID },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it("returns 200 when an ADMIN deletes someone else's comment", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: ADMIN, role: "ADMIN" },
    });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });
    mocks.commentUpdate.mockResolvedValueOnce({});

    const res = await DELETE(deleteReq(), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(200);
    expect(mocks.commentUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when there is no session", async () => {
    mocks.auth.mockResolvedValueOnce(null);

    const res = await DELETE(deleteReq(), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(401);
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when a non-author non-admin tries to delete", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: OTHER, role: "USER" },
    });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: null,
    });

    const res = await DELETE(deleteReq(), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the comment doesn't exist", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: AUTHOR, role: "USER" },
    });
    mocks.commentFindUnique.mockResolvedValueOnce(null);

    const res = await DELETE(deleteReq(), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(404);
  });

  it("returns 404 when the comment is already soft-deleted", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: AUTHOR, role: "USER" },
    });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      userId: AUTHOR,
      deletedAt: new Date(),
    });

    const res = await DELETE(deleteReq(), {
      params: paramPromise(COMMENT_ID),
    });

    expect(res.status).toBe(404);
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });
});
