/**
 * Integration smoke test (Task 5.2). Unlike route.test.ts, this does NOT
 * mock runGeneration — it drives the real route → createSession →
 * runGeneration → buildPrompt → (offline stub client) → validate → insert →
 * finalize pipeline, with only prisma, the rate limiter, and the Anthropic
 * SDK client module mocked. With no ANTHROPIC_API_KEY the generator falls
 * back to the deterministic stub, so no network call happens.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkAndIncrement: vi.fn(),
  userFindUnique: vi.fn(),
  exerciseFindMany: vi.fn(),
  exerciseCreate: vi.fn(),
  sessionCreate: vi.fn(),
  sessionUpdate: vi.fn(),
  savedPromptFindUnique: vi.fn(),
  savedPromptUpdate: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/ai-rate-limit", () => ({ checkAndIncrement: mocks.checkAndIncrement }));
// Avoid importing the node-only Anthropic SDK under jsdom; the stub path
// (no key) means callClaude is never actually invoked.
vi.mock("@scripts/claude/client", () => ({
  callClaude: vi.fn(),
  CLAUDE_DEFAULT_MODEL: "claude-test",
}));
vi.mock("@wortschatz/database", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    exercise: { findMany: mocks.exerciseFindMany, create: mocks.exerciseCreate },
    generationSession: { create: mocks.sessionCreate, update: mocks.sessionUpdate },
    savedPrompt: { findUnique: mocks.savedPromptFindUnique, update: mocks.savedPromptUpdate },
  },
  Prisma: { JsonNull: Symbol("JsonNull") },
}));

import { POST } from "@/app/api/admin/generate-exercises/route";

const ADMIN = { user: { id: "admin-1", role: "ADMIN" } };

function req(body: unknown) {
  return new Request("http://test/api/admin/generate-exercises", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(() => {
  delete process.env.ANTHROPIC_API_KEY; // force the offline stub client
});

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue(ADMIN);
  mocks.checkAndIncrement.mockReset().mockResolvedValue(undefined);
  mocks.userFindUnique.mockReset().mockResolvedValue({ id: "admin-seed" });
  mocks.exerciseFindMany.mockReset().mockResolvedValue([]);
  let n = 0;
  mocks.exerciseCreate.mockReset().mockImplementation(() => Promise.resolve({ id: `ex-${++n}` }));
  mocks.sessionCreate.mockReset().mockResolvedValue({ id: "sess-smoke" });
  mocks.sessionUpdate.mockReset().mockResolvedValue({});
  mocks.savedPromptFindUnique.mockReset().mockResolvedValue(null);
  mocks.savedPromptUpdate.mockReset().mockResolvedValue({});
});

describe("generate-exercises smoke", () => {
  it("generates 2 exercises, all linked to one new session", async () => {
    const res = await POST(req({ type: "FILL_IN_THE_BLANK", level: "A1", count: 2 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.generated).toHaveLength(2);
    expect(body.result.sessionId).toBe("sess-smoke");

    // One session created (by the route), with UI source.
    expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
    expect(mocks.sessionCreate.mock.calls[0]![0].data.source).toBe("UI");

    // Two exercises inserted, each linked to that session.
    expect(mocks.exerciseCreate).toHaveBeenCalledTimes(2);
    for (const call of mocks.exerciseCreate.mock.calls) {
      expect(call[0].data.generationSessionId).toBe("sess-smoke");
      expect(call[0].data.status).toBe("PUBLISHED");
    }

    // Session finalized with the outcome.
    expect(mocks.sessionUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.sessionUpdate.mock.calls[0]![0].data.successCount).toBe(2);
  });

  it("increments useCount when a saved prompt is used", async () => {
    mocks.savedPromptFindUnique.mockResolvedValueOnce({
      id: "sp-1",
      authorId: "admin-1",
      type: "FILL_IN_THE_BLANK",
      systemPrompt: null,
      userInstructions: null,
    });
    const res = await POST(
      req({ type: "FILL_IN_THE_BLANK", level: "A1", count: 1, savedPromptId: "sp-1" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.savedPromptUpdate).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { useCount: { increment: 1 } },
    });
  });

  it("dry run writes nothing and creates no session", async () => {
    const res = await POST(req({ type: "FILL_IN_THE_BLANK", level: "A1", count: 1, dryRun: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.sessionId).toBe("");
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.exerciseCreate).not.toHaveBeenCalled();
    expect(mocks.sessionUpdate).not.toHaveBeenCalled();
  });
});
