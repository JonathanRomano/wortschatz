import { beforeEach, describe, expect, it, vi } from "vitest";

// Stateful in-memory like store so the toggle test mirrors real DB
// semantics (find / create / delete via a unique composite key).
const mocks = vi.hoisted(() => {
  const likes = new Map<string, string>(); // key = `${commentId}|${userId}` -> like id

  function key(commentId: string, userId: string) {
    return `${commentId}|${userId}`;
  }

  const tx = {
    commentLike: {
      findUnique: vi.fn(async ({ where }: any) => {
        const { commentId, userId } = where.commentId_userId;
        const id = likes.get(key(commentId, userId));
        return id ? { id } : null;
      }),
      delete: vi.fn(async ({ where }: any) => {
        for (const [k, v] of likes.entries()) {
          if (v === where.id) likes.delete(k);
        }
        return {};
      }),
      create: vi.fn(async ({ data }: any) => {
        const k = key(data.commentId, data.userId);
        if (likes.has(k)) {
          // Mimic the Prisma unique-violation error code so the route's
          // P2002 swallow path can be exercised.
          const err: any = new Error("Unique constraint failed");
          err.code = "P2002";
          err.constructor = { name: "PrismaClientKnownRequestError" };
          // Tag the prototype so `instanceof Prisma.PrismaClientKnownRequestError` works.
          Object.setPrototypeOf(err, ErrCtorPrototype);
          throw err;
        }
        const id = `like-${likes.size + 1}`;
        likes.set(k, id);
        return { id };
      }),
    },
  };

  // The `Prisma` namespace is mocked below; this is the prototype that
  // `instanceof Prisma.PrismaClientKnownRequestError` should match.
  const ErrCtorPrototype = {};

  return {
    auth: vi.fn(),
    commentFindUnique: vi.fn(),
    commentLikeCount: vi.fn(async ({ where }: any) => {
      const cid = where.commentId;
      let n = 0;
      for (const k of likes.keys()) if (k.startsWith(`${cid}|`)) n++;
      return n;
    }),
    transaction: vi.fn(async (fn: any) => fn(tx)),
    tx,
    likes,
    ErrCtorPrototype,
    resetLikes: () => likes.clear(),
  };
});

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/db", () => ({
  prisma: {
    exerciseComment: { findUnique: mocks.commentFindUnique },
    commentLike: { count: mocks.commentLikeCount },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@prisma/client", () => {
  // Build a class whose `.prototype` matches the prototype stamped on
  // the thrown error so `instanceof` succeeds.
  function PrismaClientKnownRequestError(this: any, message: string) {
    Error.call(this, message);
  }
  PrismaClientKnownRequestError.prototype = mocks.ErrCtorPrototype;

  return {
    Prisma: { PrismaClientKnownRequestError },
  };
});

import { POST } from "@/app/api/comments/[id]/like/route";

const COMMENT_ID = "cmt-1";
const USER_A = "user-a";
const USER_B = "user-b";

function paramPromise(id: string) {
  return Promise.resolve({ id });
}

function likeReq() {
  return new Request(`http://test/api/comments/${COMMENT_ID}/like`, {
    method: "POST",
  });
}

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.commentFindUnique.mockReset();
  mocks.tx.commentLike.findUnique.mockClear();
  mocks.tx.commentLike.create.mockClear();
  mocks.tx.commentLike.delete.mockClear();
  mocks.resetLikes();
});

describe("POST /api/comments/[id]/like", () => {
  it("returns 401 when there is no session", async () => {
    mocks.auth.mockResolvedValueOnce(null);

    const res = await POST(likeReq(), { params: paramPromise(COMMENT_ID) });

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("returns 404 when the comment doesn't exist", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_A } });
    mocks.commentFindUnique.mockResolvedValueOnce(null);

    const res = await POST(likeReq(), { params: paramPromise(COMMENT_ID) });

    expect(res.status).toBe(404);
  });

  it("returns 404 when the comment is soft-deleted", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_A } });
    mocks.commentFindUnique.mockResolvedValueOnce({
      id: COMMENT_ID,
      deletedAt: new Date(),
    });

    const res = await POST(likeReq(), { params: paramPromise(COMMENT_ID) });

    expect(res.status).toBe(404);
  });

  it("returns liked:true and increments the count on the first call", async () => {
    mocks.auth.mockResolvedValue({ user: { id: USER_A } });
    mocks.commentFindUnique.mockResolvedValue({
      id: COMMENT_ID,
      deletedAt: null,
    });

    const res = await POST(likeReq(), { params: paramPromise(COMMENT_ID) });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ liked: true, likeCount: 1 });
  });

  it("toggles off — second call from the same user returns liked:false and decrements", async () => {
    mocks.auth.mockResolvedValue({ user: { id: USER_A } });
    mocks.commentFindUnique.mockResolvedValue({
      id: COMMENT_ID,
      deletedAt: null,
    });

    const first = await POST(likeReq(), {
      params: paramPromise(COMMENT_ID),
    });
    expect(await first.json()).toEqual({ liked: true, likeCount: 1 });

    const second = await POST(likeReq(), {
      params: paramPromise(COMMENT_ID),
    });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ liked: false, likeCount: 0 });
  });

  it("counts likes per comment, not per user (independent toggle states)", async () => {
    mocks.commentFindUnique.mockResolvedValue({
      id: COMMENT_ID,
      deletedAt: null,
    });

    mocks.auth.mockResolvedValueOnce({ user: { id: USER_A } });
    const a = await POST(likeReq(), { params: paramPromise(COMMENT_ID) });
    expect(await a.json()).toEqual({ liked: true, likeCount: 1 });

    mocks.auth.mockResolvedValueOnce({ user: { id: USER_B } });
    const b = await POST(likeReq(), { params: paramPromise(COMMENT_ID) });
    expect(await b.json()).toEqual({ liked: true, likeCount: 2 });

    mocks.auth.mockResolvedValueOnce({ user: { id: USER_A } });
    const a2 = await POST(likeReq(), { params: paramPromise(COMMENT_ID) });
    // A toggles off; B's like remains.
    expect(await a2.json()).toEqual({ liked: false, likeCount: 1 });
  });
});
