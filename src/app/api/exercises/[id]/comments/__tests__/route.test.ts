import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks -----------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  exerciseFindUnique: vi.fn(),
  commentFindMany: vi.fn(),
  commentCount: vi.fn(),
  commentCreate: vi.fn(),
  findBlockedWord: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/db", () => ({
  prisma: {
    exercise: { findUnique: mocks.exerciseFindUnique },
    exerciseComment: {
      findMany: mocks.commentFindMany,
      count: mocks.commentCount,
      create: mocks.commentCreate,
    },
  },
}));

// The route imports `findBlockedWord` directly. Mock it so we can flip the
// blocklist on/off in a single test rather than mutating production config.
vi.mock("@/config/moderation", async () => {
  const actual = await vi.importActual<typeof import("@/config/moderation")>(
    "@/config/moderation",
  );
  return {
    ...actual,
    findBlockedWord: mocks.findBlockedWord,
  };
});

import { GET, POST } from "@/app/api/exercises/[id]/comments/route";

const EX_ID = "ex-1";
const USER_ID = "user-1";

function paramPromise(id: string) {
  return Promise.resolve({ id });
}

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.exerciseFindUnique.mockReset();
  mocks.commentFindMany.mockReset();
  mocks.commentCount.mockReset();
  mocks.commentCreate.mockReset();
  mocks.findBlockedWord.mockReset();

  // Sensible defaults that individual tests can override.
  mocks.findBlockedWord.mockReturnValue(null);
  mocks.exerciseFindUnique.mockResolvedValue({ id: EX_ID });
  mocks.commentFindMany.mockResolvedValue([]);
  mocks.commentCount.mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// GET — list comments
// ---------------------------------------------------------------------------

describe("GET /api/exercises/[id]/comments", () => {
  it("returns the paginated list shape", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    mocks.commentFindMany.mockResolvedValueOnce([
      {
        id: "c-1",
        userId: "u-a",
        content: "x",
        createdAt: new Date("2026-04-01T00:00:00Z"),
        editedAt: null,
        deletedAt: null,
        user: { id: "u-a", name: "Anna", avatarUrl: null },
        _count: { likes: 0 },
        likes: [],
      },
    ]);
    mocks.commentCount.mockResolvedValueOnce(1);

    const res = await GET(
      new Request(`http://test/api/exercises/${EX_ID}/comments`),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      hasMore: false,
    });
    expect(Array.isArray(body.comments)).toBe(true);
    expect(body.comments).toHaveLength(1);
    expect(body.comments[0].id).toBe("c-1");
  });

  it("returns 404 when the exercise doesn't exist", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    mocks.exerciseFindUnique.mockResolvedValueOnce(null);

    const res = await GET(
      new Request(`http://test/api/exercises/missing/comments`),
      { params: paramPromise("missing") },
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not_found");
  });

  it("forwards viewerId from session into the query include", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });

    await GET(
      new Request(`http://test/api/exercises/${EX_ID}/comments`),
      { params: paramPromise(EX_ID) },
    );

    expect(mocks.commentFindMany).toHaveBeenCalledTimes(1);
    const arg = mocks.commentFindMany.mock.calls[0]![0];
    expect(arg.include.likes).toEqual({
      where: { userId: USER_ID },
      select: { id: true },
    });
  });
});

// ---------------------------------------------------------------------------
// POST — create comment
// ---------------------------------------------------------------------------

function makeCreatedRow(content: string) {
  return {
    id: "new-c",
    userId: USER_ID,
    content,
    createdAt: new Date("2026-04-01T00:00:00Z"),
    editedAt: null,
    deletedAt: null,
    user: { id: USER_ID, name: "Me", avatarUrl: null },
    _count: { likes: 0 },
    likes: [],
  };
}

describe("POST /api/exercises/[id]/comments — happy path", () => {
  it("returns 201 with the new comment DTO when the body is valid", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });
    mocks.commentCreate.mockResolvedValueOnce(makeCreatedRow("hallo"));

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "  hallo  " },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      id: "new-c",
      content: "hallo",
      isOwn: true,
      deleted: false,
    });
    // Content is trimmed before being stored.
    expect(mocks.commentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { exerciseId: EX_ID, userId: USER_ID, content: "hallo" },
      }),
    );
  });
});

describe("POST /api/exercises/[id]/comments — auth & validation", () => {
  it("returns 401 when there is no session", async () => {
    mocks.auth.mockResolvedValueOnce(null);

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "anything" },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
    expect(mocks.commentCreate).not.toHaveBeenCalled();
  });

  it("returns 401 when the session has no user id", async () => {
    mocks.auth.mockResolvedValueOnce({ user: {} });

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "anything" },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when the exercise does not exist", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });
    mocks.exerciseFindUnique.mockResolvedValueOnce(null);

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/missing/comments`,
        { content: "x" },
      ),
      { params: paramPromise("missing") },
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid JSON body", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });

    const req = new Request(
      `http://test/api/exercises/${EX_ID}/comments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json{",
      },
    );

    const res = await POST(req, { params: paramPromise(EX_ID) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("returns 400 when content is missing from the body", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { wrong: "field" },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  it("returns 400 when trimmed content is empty", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "    \n  " },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("empty");
    expect(mocks.commentCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when content exceeds 500 chars after trim", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "a".repeat(501) },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("too_long");
    expect(mocks.commentCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when the moderation matcher flags a blocked word", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });
    mocks.findBlockedWord.mockReturnValueOnce("forbidden");

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "contains forbidden text" },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("blocked_word");
    expect(mocks.commentCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/exercises/[id]/comments — rate limiting", () => {
  it("returns 429 when the user already has 5 recent comments", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });
    mocks.commentCount.mockResolvedValueOnce(5);

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "another" },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("rate_limited");
    expect(mocks.commentCreate).not.toHaveBeenCalled();
  });

  it("returns 429 when the count exceeds the limit (defence in depth)", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });
    mocks.commentCount.mockResolvedValueOnce(7);

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "another" },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(429);
  });

  it("allows creation when the count is at the boundary minus one", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });
    mocks.commentCount.mockResolvedValueOnce(4);
    mocks.commentCreate.mockResolvedValueOnce(makeCreatedRow("ok"));

    const res = await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "ok" },
      ),
      { params: paramPromise(EX_ID) },
    );

    expect(res.status).toBe(201);
    expect(mocks.commentCreate).toHaveBeenCalledTimes(1);
  });

  it("scopes the rate-limit count to the caller's userId", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: USER_ID } });
    mocks.commentCreate.mockResolvedValueOnce(makeCreatedRow("ok"));

    await POST(
      jsonRequest(
        `http://test/api/exercises/${EX_ID}/comments`,
        { content: "ok" },
      ),
      { params: paramPromise(EX_ID) },
    );

    const call = mocks.commentCount.mock.calls[0]![0];
    expect(call.where.userId).toBe(USER_ID);
    expect(call.where.createdAt.gt).toBeInstanceOf(Date);
  });
});
