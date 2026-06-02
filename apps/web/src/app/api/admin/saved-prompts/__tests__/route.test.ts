/**
 * GET  /api/admin/saved-prompts — auth, the ?type filter, and the derived
 * lastUsedAt mapping from generationSession.groupBy.
 * POST /api/admin/saved-prompts — auth, validation, and the 201 create path
 * (authorId stamped from the session).
 *
 * `@/auth` is mocked (the real `requireAdmin` guard runs against it); prisma
 * is mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  savedPromptFindMany: vi.fn(),
  savedPromptCreate: vi.fn(),
  generationSessionGroupBy: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@wortschatz/database", () => ({
  prisma: {
    savedPrompt: {
      findMany: mocks.savedPromptFindMany,
      create: mocks.savedPromptCreate,
    },
    generationSession: {
      groupBy: mocks.generationSessionGroupBy,
    },
  },
}));

import { GET, POST } from "@/app/api/admin/saved-prompts/route";

const ADMIN = { user: { id: "admin-1", role: "ADMIN" } };

const CREATED_AT = new Date("2026-05-01T10:00:00.000Z");
const UPDATED_AT = new Date("2026-05-10T10:00:00.000Z");
const LAST_USED_AT = new Date("2026-05-20T10:00:00.000Z");

function getReq(query = "") {
  return new Request(`http://test/api/admin/saved-prompts${query}`);
}

function postReq(body: unknown) {
  return new Request("http://test/api/admin/saved-prompts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function promptRow(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "My template",
    description: "A handy prompt",
    type: "FILL_IN_THE_BLANK",
    systemPrompt: null,
    userInstructions: null,
    useCount: 2,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...over,
  };
}

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue(ADMIN);
  mocks.savedPromptFindMany.mockReset().mockResolvedValue([promptRow()]);
  mocks.savedPromptCreate.mockReset().mockResolvedValue(promptRow());
  mocks.generationSessionGroupBy
    .mockReset()
    .mockResolvedValue([{ savedPromptId: "p1", _max: { createdAt: LAST_USED_AT } }]);
});

describe("GET auth", () => {
  it("401 when not logged in", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("unauthorized");
    expect(mocks.savedPromptFindMany).not.toHaveBeenCalled();
  });

  it("403 when the user is not an admin", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "u", role: "USER" } });
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("forbidden");
    expect(mocks.savedPromptFindMany).not.toHaveBeenCalled();
  });
});

describe("GET happy path", () => {
  it("200, lists the admin's prompts and derives lastUsedAt", async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.prompts).toHaveLength(1);

    const p = body.prompts[0];
    expect(p.id).toBe("p1");
    expect(p.type).toBe("FILL_IN_THE_BLANK");
    expect(p.systemPrompt).toBeNull();
    expect(p.userInstructions).toBeNull();
    expect(p.useCount).toBe(2);
    expect(p.lastUsedAt).toBe(LAST_USED_AT.toISOString());

    expect(mocks.savedPromptFindMany).toHaveBeenCalledTimes(1);
    const where = mocks.savedPromptFindMany.mock.calls[0]![0].where;
    expect(where.authorId).toBe("admin-1");
    expect(where.type).toBeUndefined();
  });

  it("200, passes the ?type filter through to findMany.where.type", async () => {
    const res = await GET(getReq("?type=FILL_IN_THE_BLANK"));
    expect(res.status).toBe(200);

    const where = mocks.savedPromptFindMany.mock.calls[0]![0].where;
    expect(where.authorId).toBe("admin-1");
    expect(where.type).toBe("FILL_IN_THE_BLANK");
  });
});

describe("POST auth", () => {
  const VALID = { name: "My template", type: "FILL_IN_THE_BLANK" };

  it("401 when not logged in", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(401);
    expect(mocks.savedPromptCreate).not.toHaveBeenCalled();
  });

  it("403 when the user is not an admin", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "u", role: "USER" } });
    const res = await POST(postReq(VALID));
    expect(res.status).toBe(403);
    expect(mocks.savedPromptCreate).not.toHaveBeenCalled();
  });
});

describe("POST validation", () => {
  it("400 on an invalid body (missing name)", async () => {
    const res = await POST(postReq({ type: "FILL_IN_THE_BLANK" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("validation_error");
    expect(mocks.savedPromptCreate).not.toHaveBeenCalled();
  });
});

describe("POST happy path", () => {
  it("201, creates the prompt with authorId from the session", async () => {
    const res = await POST(
      postReq({ name: "My template", type: "FILL_IN_THE_BLANK" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.prompt.id).toBe("p1");

    expect(mocks.savedPromptCreate).toHaveBeenCalledTimes(1);
    const data = mocks.savedPromptCreate.mock.calls[0]![0].data;
    expect(data.authorId).toBe("admin-1");
    expect(data.name).toBe("My template");
    expect(data.type).toBe("FILL_IN_THE_BLANK");
  });
});
