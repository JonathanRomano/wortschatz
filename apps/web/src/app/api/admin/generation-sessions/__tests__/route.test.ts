/**
 * GET /api/admin/generation-sessions — auth (401/403), the default paginated
 * list, query-param filters (type/level/page), and validation (400 on a bad
 * filter). prisma is mocked; the route fans count + findMany via Promise.all.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@wortschatz/database", () => ({
  prisma: {
    generationSession: {
      count: mocks.count,
      findMany: mocks.findMany,
    },
  },
}));

import { GET } from "@/app/api/admin/generation-sessions/route";

const ADMIN = { user: { id: "admin-1", role: "ADMIN" } };

const ROW = {
  id: "s1",
  createdAt: new Date("2026-05-01T10:00:00.000Z"),
  completedAt: null,
  source: "UI",
  provider: "claude",
  modelUsed: "m",
  type: "FILL_IN_THE_BLANK",
  level: "A2",
  topic: "x",
  requestedCount: 5,
  successCount: 5,
  failureCount: 0,
  durationMs: 1000,
  customSystem: false,
  customInstructions: false,
  savedPromptId: null,
  savedPrompt: null,
  _count: { exercises: 5 },
};

function req(query = "") {
  return new Request(`http://test/api/admin/generation-sessions${query}`);
}

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue(ADMIN);
  mocks.count.mockReset().mockResolvedValue(1);
  mocks.findMany.mockReset().mockResolvedValue([ROW]);
});

describe("auth", () => {
  it("401 when not logged in", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("unauthorized");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("403 when not an admin", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "u", role: "USER" } });
    const res = await GET(req());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("forbidden");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("default list", () => {
  it("200, returns the mapped session page", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].exerciseCount).toBe(5);
    expect(body.sessions[0].savedPromptName).toBe(null);

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    const arg = mocks.findMany.mock.calls[0]![0];
    expect(arg.where.authorId).toBe("admin-1");
    expect(arg.orderBy).toEqual({ createdAt: "desc" });
    expect(arg.take).toBe(20);
    expect(arg.skip).toBe(0);
  });
});

describe("filters", () => {
  it("200, applies type/level filters and paginates", async () => {
    const res = await GET(req("?type=FILL_IN_THE_BLANK&level=A2&page=2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(2);

    const arg = mocks.findMany.mock.calls[0]![0];
    expect(arg.where.type).toBe("FILL_IN_THE_BLANK");
    expect(arg.where.level).toBe("A2");
    expect(arg.skip).toBe(20);
  });
});

describe("validation", () => {
  it("400 on an invalid filter value", async () => {
    const res = await GET(req("?type=BOGUS"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("validation_error");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
