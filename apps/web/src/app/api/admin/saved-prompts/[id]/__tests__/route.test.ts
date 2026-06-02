/**
 * GET/PATCH/DELETE /api/admin/saved-prompts/[id] — author-only access.
 *
 * A prompt owned by another admin (or missing) is reported as 404 so existence
 * isn't leaked. Auth is mocked at @/auth (requireAdmin calls it); prisma is
 * mocked with savedPrompt.{findUnique,update,delete}.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@wortschatz/database", () => ({
  prisma: {
    savedPrompt: {
      findUnique: mocks.findUnique,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}));

import { DELETE, GET, PATCH } from "@/app/api/admin/saved-prompts/[id]/route";

const ADMIN = { user: { id: "admin-1", role: "ADMIN" } };

const NOW = new Date("2026-06-01T00:00:00.000Z");

const OWNED = {
  id: "p1",
  authorId: "admin-1",
  name: "My prompt",
  description: null,
  type: "FILL_IN_THE_BLANK",
  systemPrompt: null,
  userInstructions: null,
  useCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

function params(id = "p1") {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, body?: unknown) {
  return new Request("http://test/api/admin/saved-prompts/p1", {
    method,
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue(ADMIN);
  mocks.findUnique.mockReset();
  mocks.update.mockReset().mockResolvedValue(OWNED);
  mocks.delete.mockReset().mockResolvedValue(OWNED);
});

describe("GET", () => {
  it("404 when the prompt is missing", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    const res = await GET(req("GET"), params());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("not_found");
  });

  it("404 when the prompt belongs to another admin", async () => {
    mocks.findUnique.mockResolvedValueOnce({ ...OWNED, authorId: "other" });
    const res = await GET(req("GET"), params());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("not_found");
  });

  it("200 when owned, returns the prompt", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      id: "p1",
      authorId: "admin-1",
      name: "My prompt",
      type: "FILL_IN_THE_BLANK",
      systemPrompt: null,
      userInstructions: null,
    });
    const res = await GET(req("GET"), params());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.prompt.id).toBe("p1");
    expect(body.prompt.type).toBe("FILL_IN_THE_BLANK");
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

describe("PATCH", () => {
  it("404 when the prompt is not owned", async () => {
    mocks.findUnique.mockResolvedValueOnce({ ...OWNED, authorId: "other" });
    const res = await PATCH(req("PATCH", { name: "Renamed" }), params());
    expect(res.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("400 on an empty body (no fields to update)", async () => {
    const res = await PATCH(req("PATCH", {}), params());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("validation_error");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("400 on an invalid body", async () => {
    const res = await PATCH(req("PATCH", { type: "NOPE" }), params());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("validation_error");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("200 when owned, calls update and returns the row", async () => {
    mocks.findUnique.mockResolvedValueOnce(OWNED);
    mocks.update.mockResolvedValueOnce({ ...OWNED, name: "Renamed" });
    const res = await PATCH(req("PATCH", { name: "Renamed" }), params());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.prompt.name).toBe("Renamed");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    const arg = mocks.update.mock.calls[0]![0];
    expect(arg.where).toEqual({ id: "p1" });
    expect(arg.data).toEqual({ name: "Renamed" });
  });
});

describe("DELETE", () => {
  it("404 when the prompt is not owned", async () => {
    mocks.findUnique.mockResolvedValueOnce({ ...OWNED, authorId: "other" });
    const res = await DELETE(req("DELETE"), params());
    expect(res.status).toBe(404);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("200 when owned, deletes by id", async () => {
    mocks.findUnique.mockResolvedValueOnce(OWNED);
    const res = await DELETE(req("DELETE"), params());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(true);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

describe("auth", () => {
  it("401 when not logged in (GET)", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await GET(req("GET"), params());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("unauthorized");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("403 when not an admin (DELETE)", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "u", role: "USER" } });
    const res = await DELETE(req("DELETE"), params());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("forbidden");
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
