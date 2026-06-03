/**
 * Integration smoke test. Unlike route.test.ts (which mocks runGeneration),
 * this drives the REAL web-side pipeline: route → createSession →
 * runGeneration → the real makeRemoteGenerator → insert → finalize. Only the
 * HTTP hop to apps/api is stubbed, at the api-client seam
 * (generateExerciseRemote), so no network call happens and the test stays in
 * apps/web. The Express side (prompt build + provider + validation) has its
 * own tests under apps/api.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  generateExerciseRemote: vi.fn(),
  userFindUnique: vi.fn(),
  exerciseFindMany: vi.fn(),
  exerciseCreate: vi.fn(),
  sessionCreate: vi.fn(),
  sessionUpdate: vi.fn(),
  savedPromptFindUnique: vi.fn(),
  savedPromptUpdate: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
// Stub the boundary: makeRemoteGenerator calls this; the api builds + validates
// for real, but here we return a ready exercise so the web pipeline runs offline.
vi.mock("@/lib/api-client", () => ({
  generateExerciseRemote: mocks.generateExerciseRemote,
}));
// claudeModelLabel/CLAUDE_DEFAULT_MODEL pull in @scripts/claude/client, which
// imports the node-only Anthropic SDK; stub it so jsdom doesn't load it.
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

const STUB_DTO = {
  title: "Lückentext: Essen",
  content: { sentence: "Ich ___ einen Apfel.", blanksCount: 1 },
  solution: { blanks: ["esse"] },
  explanation: { en: "stub" },
  tags: ["food", "a1"],
  tip: { en: "hint" },
  modelUsed: "claude-test",
};

function req(body: unknown) {
  return new Request("http://test/api/admin/generate-exercises", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue(ADMIN);
  mocks.generateExerciseRemote.mockReset().mockResolvedValue(STUB_DTO);
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
  it("generates 2 exercises via the api, all linked to one new session", async () => {
    const res = await POST(req({ type: "FILL_IN_THE_BLANK", level: "A1", count: 2 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.generated).toHaveLength(2);
    expect(body.result.sessionId).toBe("sess-smoke");

    // The api was called once per item, scoped to the acting admin.
    expect(mocks.generateExerciseRemote).toHaveBeenCalledTimes(2);
    expect(mocks.generateExerciseRemote.mock.calls[0]![1]).toBe("admin-1");

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
