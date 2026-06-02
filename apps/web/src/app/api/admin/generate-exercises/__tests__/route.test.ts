/**
 * POST /api/admin/generate-exercises — auth, validation, session creation,
 * saved-prompt resolution + useCount, and the rate-limited 429 path. The
 * runner is mocked (no Anthropic, no DB writes); prisma is mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  runGeneration: vi.fn(),
  createSession: vi.fn(),
  checkAndIncrement: vi.fn(),
  savedPromptFindUnique: vi.fn(),
  savedPromptUpdate: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@scripts/shared/run", () => ({ runGeneration: mocks.runGeneration }));
vi.mock("@scripts/shared/session", () => ({ createGenerationSession: mocks.createSession }));
vi.mock("@scripts/claude/prompts", () => ({ claudePrompts: {} }));
vi.mock("@/lib/ai-rate-limit", () => ({ checkAndIncrement: mocks.checkAndIncrement }));
vi.mock("@/lib/admin/claude-client", () => ({
  CLAUDE_DEFAULT_MODEL: "claude-test",
  claudeModelLabel: () => "claude-test",
  selectClaudeClient: () => vi.fn(),
}));
vi.mock("@wortschatz/database", () => ({
  prisma: {
    savedPrompt: {
      findUnique: mocks.savedPromptFindUnique,
      update: mocks.savedPromptUpdate,
    },
  },
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

function okResult(over: Record<string, unknown> = {}) {
  return {
    sessionId: "sess-1",
    generated: [{ id: "ex-1", type: "FILL_IN_THE_BLANK", level: "A2", title: "t", topic: "x", modelUsed: "m", content: {}, solution: {}, explanation: {}, tags: [] }],
    failed: [],
    totalDurationMs: 100,
    cacheHits: 0,
    ...over,
  };
}

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue(ADMIN);
  mocks.runGeneration.mockReset().mockResolvedValue(okResult());
  mocks.createSession.mockReset().mockResolvedValue("sess-1");
  mocks.checkAndIncrement.mockReset().mockResolvedValue(undefined);
  mocks.savedPromptFindUnique.mockReset();
  mocks.savedPromptUpdate.mockReset().mockResolvedValue({});
});

const VALID = { type: "FILL_IN_THE_BLANK", level: "A2", count: 1 };

describe("auth", () => {
  it("401 when not logged in", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await POST(req(VALID));
    expect(res.status).toBe(401);
  });

  it("403 when not an admin", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "u", role: "USER" } });
    const res = await POST(req(VALID));
    expect(res.status).toBe(403);
    expect(mocks.runGeneration).not.toHaveBeenCalled();
  });
});

describe("validation", () => {
  it("400 on an invalid body", async () => {
    const res = await POST(req({ type: "NOPE", level: "A2", count: 0 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("validation_error");
  });
});

describe("happy path", () => {
  it("200, creates a UI session, runs, returns the result", async () => {
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.sessionId).toBe("sess-1");

    expect(mocks.createSession).toHaveBeenCalledTimes(1);
    const sessionInput = mocks.createSession.mock.calls[0]![0];
    expect(sessionInput.source).toBe("UI");
    expect(sessionInput.authorId).toBe("admin-1");
    expect(sessionInput.requestedCount).toBe(1);

    const runCfg = mocks.runGeneration.mock.calls[0]![0];
    expect(runCfg.context).toEqual({ sessionId: "sess-1", authorId: "admin-1", source: "UI" });
    expect(typeof runCfg.beforeEach).toBe("function");
  });
});

describe("rate limiting", () => {
  it("429 when the whole batch is rate-limited", async () => {
    mocks.runGeneration.mockResolvedValueOnce(
      okResult({
        generated: [],
        failed: [{ index: 0, topic: "x", reason: "limit", code: "rate_limited" }],
      }),
    );
    const res = await POST(req(VALID));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("rate_limited");
  });
});

describe("saved prompts", () => {
  it("increments useCount when a saved prompt is used", async () => {
    mocks.savedPromptFindUnique.mockResolvedValueOnce({
      id: "sp-1",
      authorId: "admin-1",
      type: "FILL_IN_THE_BLANK",
      systemPrompt: null,
      userInstructions: null,
    });
    const res = await POST(req({ ...VALID, savedPromptId: "sp-1" }));
    expect(res.status).toBe(200);
    expect(mocks.savedPromptUpdate).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { useCount: { increment: 1 } },
    });
  });

  it("404 when the saved prompt belongs to another admin", async () => {
    mocks.savedPromptFindUnique.mockResolvedValueOnce({
      id: "sp-1",
      authorId: "someone-else",
      type: "FILL_IN_THE_BLANK",
    });
    const res = await POST(req({ ...VALID, savedPromptId: "sp-1" }));
    expect(res.status).toBe(404);
    expect(mocks.runGeneration).not.toHaveBeenCalled();
  });

  it("400 when the saved prompt is for a different type", async () => {
    mocks.savedPromptFindUnique.mockResolvedValueOnce({
      id: "sp-1",
      authorId: "admin-1",
      type: "MULTIPLE_CHOICE",
    });
    const res = await POST(req({ ...VALID, savedPromptId: "sp-1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("saved_prompt_type_mismatch");
  });
});

describe("dry run", () => {
  it("does not create a session", async () => {
    mocks.runGeneration.mockResolvedValueOnce(
      okResult({ sessionId: "", generated: [{ id: null }] }),
    );
    const res = await POST(req({ ...VALID, dryRun: true }));
    expect(res.status).toBe(200);
    expect(mocks.createSession).not.toHaveBeenCalled();
    const runCfg = mocks.runGeneration.mock.calls[0]![0];
    expect(runCfg.context).toBeUndefined();
  });
});
