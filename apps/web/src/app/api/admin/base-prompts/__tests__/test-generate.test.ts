/**
 * POST /base-prompts/[id]/versions/[versionId]/test-generate — RBAC, the
 * draft-voice override + source tag passed to the api, token-cost reporting,
 * and the 429/422 error mapping. The api-client, rate-limit error, and
 * recent-examples fetch are mocked; no network, no DB.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  class AiRateLimitedError extends Error {
    constructor() {
      super("rate limited");
      this.name = "AiRateLimitedError";
    }
  }
  class GenerationValidationError extends Error {
    errors: string[];
    constructor(errors: string[]) {
      super("invalid");
      this.name = "GenerationValidationError";
      this.errors = errors;
    }
  }
  return {
    auth: vi.fn(),
    vFindUnique: vi.fn(),
    generateRemote: vi.fn(),
    fetchRecent: vi.fn(),
    AiRateLimitedError,
    GenerationValidationError,
  };
});

vi.mock("@/auth", () => ({ auth: m.auth }));
vi.mock("@wortschatz/database", () => ({
  prisma: { basePromptVersion: { findUnique: m.vFindUnique } },
}));
vi.mock("@/lib/api-client", () => ({
  generateExerciseRemote: m.generateRemote,
  GenerationValidationError: m.GenerationValidationError,
}));
vi.mock("@/lib/ai-rate-limit", () => ({ AiRateLimitedError: m.AiRateLimitedError }));
vi.mock("@scripts/shared/recent-examples", () => ({ fetchRecentExamples: m.fetchRecent }));

import { POST as testGenerate } from "@/app/api/admin/base-prompts/[id]/versions/[versionId]/test-generate/route";

const TEACHER = { user: { id: "t1", role: "TEACHER" } };
const USER = { user: { id: "u1", role: "USER" } };
const params = { params: Promise.resolve({ id: "bp1", versionId: "v2" }) };

function req(body: unknown = { topic: "Essen" }) {
  return new Request("http://test/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const DRAFT = {
  id: "v2",
  systemPrompt: "draft sys",
  userInstructions: "draft instr {level} {topic}",
  basePrompt: { id: "bp1", type: "FILL_IN_THE_BLANK", level: "A1" },
};

beforeEach(() => {
  m.auth.mockReset().mockResolvedValue(TEACHER);
  m.vFindUnique.mockReset().mockResolvedValue(DRAFT);
  m.fetchRecent.mockReset().mockResolvedValue([]);
  m.generateRemote.mockReset().mockResolvedValue({
    title: "Lückentext: Essen",
    content: {},
    solution: {},
    explanation: {},
    tags: ["food"],
    tip: {},
    modelUsed: "claude-test",
    inputTokens: 12,
    outputTokens: 34,
  });
});

describe("test-generate", () => {
  it("403 for a USER", async () => {
    m.auth.mockResolvedValueOnce(USER);
    expect((await testGenerate(req(), params)).status).toBe(403);
    expect(m.generateRemote).not.toHaveBeenCalled();
  });

  it("400 when topic is missing", async () => {
    expect((await testGenerate(req({}), params)).status).toBe(400);
  });

  it("404 when the version is not under this base prompt", async () => {
    m.vFindUnique.mockResolvedValueOnce({ ...DRAFT, basePrompt: { ...DRAFT.basePrompt, id: "OTHER" } });
    expect((await testGenerate(req(), params)).status).toBe(404);
  });

  it("200 for a TEACHER: passes the draft voice + source, reports token cost", async () => {
    const res = await testGenerate(req(), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tokenCost).toBe(46); // 12 + 34
    expect(body.exercise.title).toBe("Lückentext: Essen");

    const sent = m.generateRemote.mock.calls[0]![0];
    expect(sent.source).toBe("test-generate");
    expect(sent.promptVoiceOverride).toEqual({
      systemPrompt: "draft sys",
      userInstructions: "draft instr {level} {topic}",
    });
    expect(sent.type).toBe("FILL_IN_THE_BLANK");
    expect(sent.level).toBe("A1");
    // userId threaded so the api enforces the rate limit + tags AiUsage
    expect(m.generateRemote.mock.calls[0]![1]).toBe("t1");
  });

  it("429 maps a rate-limit error", async () => {
    m.generateRemote.mockRejectedValueOnce(new m.AiRateLimitedError());
    const res = await testGenerate(req(), params);
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("rate_limited");
  });

  it("422 maps a generation validation error", async () => {
    m.generateRemote.mockRejectedValueOnce(new m.GenerationValidationError(["bad shape"]));
    const res = await testGenerate(req(), params);
    expect(res.status).toBe(422);
  });
});
