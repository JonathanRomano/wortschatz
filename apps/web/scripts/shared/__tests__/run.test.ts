/**
 * Behavioural tests for the shared runGeneration loop. The provider client
 * is injected (mocked), prisma is mocked, and the real claude PromptParts +
 * validators run so we exercise the actual prompt assembly and validation.
 *
 * Covers the Task 1.1 / 5.1 invariants: default vs custom prompts, locked
 * JSON shape, CLI-vs-UI session lifecycle, exercise→session linking,
 * failure tolerance, and dry-run (no writes).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  exerciseFindMany: vi.fn(),
  exerciseCreate: vi.fn(),
  sessionCreate: vi.fn(),
  sessionUpdate: vi.fn(),
}));

vi.mock("@wortschatz/database", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    exercise: { findMany: mocks.exerciseFindMany, create: mocks.exerciseCreate },
    generationSession: { create: mocks.sessionCreate, update: mocks.sessionUpdate },
  },
  Prisma: { JsonNull: Symbol("JsonNull") },
}));

import { runGeneration } from "../run";
import { claudePrompts } from "../../claude/prompts";
import type { ProviderClient } from "../types";

const VALID_FITB = JSON.stringify({
  title: "Lückentext",
  content: { sentence: "Ich ___ einen Apfel.", blanksCount: 1 },
  solution: { blanks: ["esse"] },
  explanation: { en: "e", pt: "p", tr: "t", uk: "u" },
  tags: ["food"],
  tip: { en: "hint" },
});

function clientReturning(text: string): ProviderClient {
  return vi.fn().mockResolvedValue({ text, modelUsed: "claude-test" });
}

const baseRequest = {
  type: "FILL_IN_THE_BLANK" as const,
  level: "A2" as const,
  topic: "Essen",
  count: 1,
};

function config(overrides: Record<string, unknown> = {}) {
  return {
    providerLabel: "claude",
    client: clientReturning(VALID_FITB),
    prompts: claudePrompts,
    defaultModel: "claude-default",
    request: baseRequest,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.userFindUnique.mockReset().mockResolvedValue({ id: "admin-seed" });
  mocks.exerciseFindMany.mockReset().mockResolvedValue([]);
  let n = 0;
  mocks.exerciseCreate.mockReset().mockImplementation(() => Promise.resolve({ id: `ex-${++n}` }));
  mocks.sessionCreate.mockReset().mockResolvedValue({ id: "sess-cli" });
  mocks.sessionUpdate.mockReset().mockResolvedValue({});
});

describe("runGeneration — CLI mode (no context)", () => {
  it("opens a CLI session, links exercises to it, and finalizes", async () => {
    const cfg = config({ request: { ...baseRequest, count: 2 } });
    const result = await runGeneration(cfg);

    expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
    const sessionData = mocks.sessionCreate.mock.calls[0]![0].data;
    expect(sessionData.source).toBe("CLI");
    expect(sessionData.authorId).toBe("admin-seed");
    expect(sessionData.provider).toBe("claude");
    expect(sessionData.requestedCount).toBe(2);
    expect(sessionData.modelUsed).toBe("claude-default");

    // Each exercise links to the created session.
    expect(mocks.exerciseCreate).toHaveBeenCalledTimes(2);
    for (const call of mocks.exerciseCreate.mock.calls) {
      expect(call[0].data.generationSessionId).toBe("sess-cli");
    }

    expect(mocks.sessionUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.sessionUpdate.mock.calls[0]![0].data.successCount).toBe(2);

    expect(result.sessionId).toBe("sess-cli");
    expect(result.generated).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });
});

describe("runGeneration — prompts", () => {
  it("uses the default system prompt when no customPrompt is given", async () => {
    const client = clientReturning(VALID_FITB);
    await runGeneration(config({ client }));
    const sent = (client as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sent.system).toContain("German-language exercise author");
    expect(sent.user).toContain("Output a single JSON object with this exact shape:");
    expect(sent.user).toContain("Rules:");
  });

  it("applies a custom system override but keeps the JSON shape + rules locked", async () => {
    const client = clientReturning(VALID_FITB);
    await runGeneration(
      config({ client, request: { ...baseRequest, customPrompt: { system: "CUSTOM VOICE" } } }),
    );
    const sent = (client as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sent.system).toBe("CUSTOM VOICE");
    // Locked pieces still present.
    expect(sent.user).toContain("Output a single JSON object with this exact shape:");
    expect(sent.user).toContain("Rules:");
  });

  it("applies custom instructions but still injects the locked JSON shape", async () => {
    const client = clientReturning(VALID_FITB);
    await runGeneration(
      config({
        client,
        request: { ...baseRequest, customPrompt: { userInstructions: "DO EXACTLY THIS" } },
      }),
    );
    const sent = (client as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sent.user.startsWith("DO EXACTLY THIS")).toBe(true);
    expect(sent.user).not.toContain("Write ONE FILL_IN_THE_BLANK exercise.");
    expect(sent.user).toContain("Output a single JSON object with this exact shape:");
    expect(sent.user).toContain("Rules:");
  });
});

describe("runGeneration — resilience", () => {
  it("records a failure and continues when one item is unparseable", async () => {
    // First call: garbage; second: valid.
    const client = vi
      .fn()
      .mockResolvedValueOnce({ text: "not json at all", modelUsed: "m" })
      .mockResolvedValueOnce({ text: VALID_FITB, modelUsed: "m" });
    const result = await runGeneration(config({ client, request: { ...baseRequest, count: 2 } }));
    expect(result.generated).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.code).toBe("parse_error");
    // The run still finalized the session with the partial outcome.
    expect(mocks.sessionUpdate.mock.calls[0]![0].data.failureCount).toBe(1);
  });

  it("stops the batch and tags rate_limited when beforeEach throws", async () => {
    const rateErr = Object.assign(new Error("limit"), { name: "AiRateLimitedError" });
    const beforeEach = vi.fn().mockRejectedValue(rateErr);
    const client = clientReturning(VALID_FITB);
    const result = await runGeneration(
      config({ client, beforeEach, request: { ...baseRequest, count: 5 } }),
    );
    expect(client).not.toHaveBeenCalled();
    expect(result.generated).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.code).toBe("rate_limited");
  });
});

describe("runGeneration — dry run", () => {
  it("creates no session and writes nothing", async () => {
    const result = await runGeneration(config({ request: { ...baseRequest, dryRun: true } }));
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.exerciseCreate).not.toHaveBeenCalled();
    expect(mocks.sessionUpdate).not.toHaveBeenCalled();
    expect(result.sessionId).toBe("");
    expect(result.generated).toHaveLength(1);
    expect(result.generated[0]!.id).toBeNull();
  });
});

describe("runGeneration — UI context", () => {
  it("reuses a provided session and links exercises to it", async () => {
    const result = await runGeneration(
      config({
        context: { sessionId: "sess-ui", authorId: "admin-1", source: "UI" },
      }),
    );
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.exerciseCreate.mock.calls[0]![0].data.generationSessionId).toBe("sess-ui");
    expect(mocks.sessionUpdate.mock.calls[0]![0].where.id).toBe("sess-ui");
    expect(result.sessionId).toBe("sess-ui");
  });
});
