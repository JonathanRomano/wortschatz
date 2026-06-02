/**
 * GET /api/admin/generation-sessions/[id] — auth (401/403), ownership-scoped
 * 404 (missing or owned by another admin), and the 200 author-only success
 * body with mapped savedPromptName + exercises. prisma is mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@wortschatz/database", () => ({
  prisma: {
    generationSession: {
      findUnique: mocks.findUnique,
    },
  },
}));

import { GET } from "@/app/api/admin/generation-sessions/[id]/route";

const ADMIN = { user: { id: "admin-1", role: "ADMIN" } };

function req() {
  return new Request("http://test/api/admin/generation-sessions/s1");
}

const ctx = { params: Promise.resolve({ id: "s1" }) };

function session(over: Record<string, unknown> = {}) {
  return {
    id: "s1",
    authorId: "admin-1",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    completedAt: new Date("2026-05-01T10:05:00.000Z"),
    source: "UI",
    provider: "ANTHROPIC",
    modelUsed: "claude-test",
    type: "FILL_IN_THE_BLANK",
    level: "A2",
    topic: "Reisen",
    requestedCount: 2,
    successCount: 2,
    failureCount: 0,
    durationMs: 1234,
    customSystem: null,
    customInstructions: null,
    savedPromptId: "sp-1",
    savedPrompt: { name: "My Prompt" },
    failures: null,
    exercises: [
      {
        id: "ex-1",
        title: "Erste Aufgabe",
        type: "FILL_IN_THE_BLANK",
        level: "A2",
        status: "DRAFT",
        createdAt: new Date("2026-05-01T10:01:00.000Z"),
      },
      {
        id: "ex-2",
        title: "Zweite Aufgabe",
        type: "FILL_IN_THE_BLANK",
        level: "A2",
        status: "DRAFT",
        createdAt: new Date("2026-05-01T10:02:00.000Z"),
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue(ADMIN);
  mocks.findUnique.mockReset().mockResolvedValue(session());
});

describe("auth", () => {
  it("401 when not logged in", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("unauthorized");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("403 when not an admin", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "u", role: "USER" } });
    const res = await GET(req(), ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("forbidden");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});

describe("not found", () => {
  it("404 when the session does not exist", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("not_found");
  });

  it("404 when the session belongs to another admin", async () => {
    mocks.findUnique.mockResolvedValueOnce(session({ authorId: "other" }));
    const res = await GET(req(), ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("not_found");
  });
});

describe("happy path", () => {
  it("200 with the owned session, mapped savedPromptName and exercises", async () => {
    const res = await GET(req(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.session.id).toBe("s1");
    expect(body.session.exercises).toHaveLength(2);
    expect(body.session.exercises[0].id).toBe("ex-1");
    expect(body.session.savedPromptName).toBe("My Prompt");

    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.findUnique.mock.calls[0]![0].where).toEqual({ id: "s1" });
  });

  it("maps savedPromptName to null when there is no saved prompt", async () => {
    mocks.findUnique.mockResolvedValueOnce(
      session({ savedPrompt: null, savedPromptId: null }),
    );
    const res = await GET(req(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session.savedPromptName).toBeNull();
  });
});
