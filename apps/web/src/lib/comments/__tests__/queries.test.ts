import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted Prisma mock so `vi.mock` factory can reach the spies.
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@wortschatz/database", () => ({
  prisma: {
    exerciseComment: {
      findMany: mocks.findMany,
      count: mocks.count,
      findUnique: mocks.findUnique,
    },
  },
}));

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  loadComment,
  loadComments,
} from "@/lib/comments/queries";

const CREATED = new Date("2026-04-01T00:00:00.000Z");

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cmt-1",
    userId: "user-author",
    content: "hallo",
    createdAt: CREATED,
    editedAt: null,
    deletedAt: null,
    user: {
      id: "user-author",
      name: "Anna",
      avatarUrl: null,
    },
    _count: { likes: 0 },
    likes: [],
    ...overrides,
  };
}

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.count.mockReset();
  mocks.findUnique.mockReset();
});

describe("loadComments — Prisma query shape", () => {
  it("filters by exerciseId and deletedAt:null, ordered by likes desc then createdAt desc", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.count.mockResolvedValueOnce(0);

    await loadComments({
      exerciseId: "ex-1",
      page: 1,
      pageSize: 20,
      viewerId: "viewer-1",
    });

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    const arg = mocks.findMany.mock.calls[0]![0];

    expect(arg.where).toEqual({ exerciseId: "ex-1", deletedAt: null });
    expect(arg.orderBy).toEqual([
      { likes: { _count: "desc" } },
      { createdAt: "desc" },
    ]);
    expect(arg.include._count).toEqual({ select: { likes: true } });
    expect(arg.include.user).toEqual({
      select: { id: true, name: true, avatarUrl: true },
    });
  });

  it("includes a viewer-scoped likes filter when viewerId is provided", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.count.mockResolvedValueOnce(0);

    await loadComments({
      exerciseId: "ex-1",
      page: 1,
      pageSize: 20,
      viewerId: "viewer-1",
    });

    const arg = mocks.findMany.mock.calls[0]![0];
    expect(arg.include.likes).toEqual({
      where: { userId: "viewer-1" },
      select: { id: true },
    });
  });

  it("uses a never-match likes filter when viewerId is null (degrades safely)", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.count.mockResolvedValueOnce(0);

    await loadComments({
      exerciseId: "ex-1",
      page: 1,
      pageSize: 20,
      viewerId: null,
    });

    const arg = mocks.findMany.mock.calls[0]![0];
    // Anonymous viewers can never have a viewerLiked=true row, so the
    // implementation passes a sentinel that returns zero matches.
    expect(arg.include.likes).toEqual({
      where: { id: "__never__" },
      select: { id: true },
    });
  });

  it("counts only non-deleted comments for the exercise", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.count.mockResolvedValueOnce(0);

    await loadComments({
      exerciseId: "ex-2",
      page: 1,
      pageSize: 20,
      viewerId: null,
    });

    expect(mocks.count).toHaveBeenCalledTimes(1);
    expect(mocks.count).toHaveBeenCalledWith({
      where: { exerciseId: "ex-2", deletedAt: null },
    });
  });

  it("computes skip/take from page+pageSize", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.count.mockResolvedValueOnce(0);

    await loadComments({
      exerciseId: "ex-3",
      page: 3,
      pageSize: 10,
      viewerId: null,
    });

    const arg = mocks.findMany.mock.calls[0]![0];
    expect(arg.skip).toBe(20);
    expect(arg.take).toBe(10);
  });

  it("clamps pageSize to [1, MAX_PAGE_SIZE]", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.count.mockResolvedValueOnce(0);

    await loadComments({
      exerciseId: "ex-3",
      page: 1,
      pageSize: 9_999,
      viewerId: null,
    });

    expect(mocks.findMany.mock.calls[0]![0].take).toBe(MAX_PAGE_SIZE);

    mocks.findMany.mockResolvedValueOnce([]);
    mocks.count.mockResolvedValueOnce(0);

    await loadComments({
      exerciseId: "ex-3",
      page: 1,
      pageSize: 0,
      viewerId: null,
    });
    expect(mocks.findMany.mock.calls[1]![0].take).toBe(1);
  });

  it("clamps negative / zero page to 1 (skip becomes 0)", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.count.mockResolvedValueOnce(0);

    await loadComments({
      exerciseId: "ex-3",
      page: -7,
      pageSize: DEFAULT_PAGE_SIZE,
      viewerId: null,
    });

    expect(mocks.findMany.mock.calls[0]![0].skip).toBe(0);
  });
});

describe("loadComments — response shape", () => {
  it("maps each Prisma row through serializeComment", async () => {
    mocks.findMany.mockResolvedValueOnce([
      makeRow({ id: "a" }),
      makeRow({ id: "b", _count: { likes: 5 } }),
    ]);
    mocks.count.mockResolvedValueOnce(2);

    const result = await loadComments({
      exerciseId: "ex-1",
      page: 1,
      pageSize: 20,
      viewerId: null,
    });

    expect(result.comments).toHaveLength(2);
    expect(result.comments[0]!.id).toBe("a");
    expect(result.comments[1]!.id).toBe("b");
    expect(result.comments[1]!.likeCount).toBe(5);
  });

  it("reports pagination metadata + hasMore", async () => {
    mocks.findMany.mockResolvedValueOnce([makeRow({ id: "a" })]);
    mocks.count.mockResolvedValueOnce(50);

    const result = await loadComments({
      exerciseId: "ex-1",
      page: 1,
      pageSize: 20,
      viewerId: null,
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(50);
    expect(result.hasMore).toBe(true);
  });

  it("hasMore is false on the last page", async () => {
    mocks.findMany.mockResolvedValueOnce([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
    ]);
    mocks.count.mockResolvedValueOnce(2);

    const result = await loadComments({
      exerciseId: "ex-1",
      page: 1,
      pageSize: 20,
      viewerId: null,
    });

    expect(result.hasMore).toBe(false);
  });

  it("does not throw when viewerId is null and rows have empty likes", async () => {
    mocks.findMany.mockResolvedValueOnce([makeRow()]);
    mocks.count.mockResolvedValueOnce(1);

    await expect(
      loadComments({
        exerciseId: "ex-1",
        page: 1,
        pageSize: 20,
        viewerId: null,
      }),
    ).resolves.toBeDefined();
  });
});

describe("loadComment (single)", () => {
  it("returns null when the row is missing", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);

    const result = await loadComment("nope", "viewer-1");
    expect(result).toBeNull();
  });

  it("returns null when the row is soft-deleted", async () => {
    mocks.findUnique.mockResolvedValueOnce(
      makeRow({ deletedAt: new Date() }),
    );

    const result = await loadComment("cmt-1", "viewer-1");
    expect(result).toBeNull();
  });

  it("returns { row, dto } for an active row, with dto via serializeComment", async () => {
    const row = makeRow({
      id: "cmt-1",
      userId: "user-author",
      content: "live",
      _count: { likes: 1 },
      likes: [{ id: "lk-1" }],
    });
    mocks.findUnique.mockResolvedValueOnce(row);

    const result = await loadComment("cmt-1", "user-viewer");
    expect(result).not.toBeNull();
    expect(result!.row.id).toBe("cmt-1");
    expect(result!.dto).toMatchObject({
      id: "cmt-1",
      content: "live",
      likeCount: 1,
      viewerLiked: true,
      isOwn: false,
      deleted: false,
    });
  });

  it("queries with the right shape (id where + viewer likes filter)", async () => {
    mocks.findUnique.mockResolvedValueOnce(makeRow());

    await loadComment("cmt-x", "viewer-1");

    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    const arg = mocks.findUnique.mock.calls[0]![0];
    expect(arg.where).toEqual({ id: "cmt-x" });
    expect(arg.include.likes).toEqual({
      where: { userId: "viewer-1" },
      select: { id: true },
    });
  });

  it("queries with the never-match sentinel when viewerId is null", async () => {
    mocks.findUnique.mockResolvedValueOnce(makeRow());

    await loadComment("cmt-x", null);

    const arg = mocks.findUnique.mock.calls[0]![0];
    expect(arg.include.likes).toEqual({
      where: { id: "__never__" },
      select: { id: true },
    });
  });
});
