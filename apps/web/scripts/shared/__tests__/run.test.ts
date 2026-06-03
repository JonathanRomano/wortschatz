/**
 * Behavioural tests for the shared runGeneration loop. The per-item
 * ExerciseGenerator is injected (mocked) and prisma is mocked, so these pin
 * the orchestration the loop owns: CLI-vs-UI session lifecycle,
 * exercise→session linking, the per-item model coming from the generator,
 * recent-examples wiring, failure classification, and dry-run (no writes).
 *
 * Prompt assembly + validation now live in the generator (covered by
 * prompt-builder.test.ts / prompt-parity.test.ts), not in run.ts.
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
import { GenerationError, type ExerciseGenerator } from "../types";

const VALID_PAYLOAD = {
  title: "Lückentext",
  content: { sentence: "Ich ___ einen Apfel.", blanksCount: 1 },
  solution: { blanks: ["esse"] },
  explanation: { en: "e" },
  tags: ["food"],
  tip: { en: "hint" },
  modelUsed: "claude-test",
};

function generatorReturning(
  payload: Record<string, unknown> = VALID_PAYLOAD,
): ExerciseGenerator {
  return vi.fn().mockResolvedValue(payload);
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
    generate: generatorReturning(),
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
  it("opens a CLI session, links exercises to it with the per-item model, and finalizes", async () => {
    const result = await runGeneration(config({ request: { ...baseRequest, count: 2 } }));

    expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
    const sessionData = mocks.sessionCreate.mock.calls[0]![0].data;
    expect(sessionData.source).toBe("CLI");
    expect(sessionData.authorId).toBe("admin-seed");
    expect(sessionData.provider).toBe("claude");
    expect(sessionData.requestedCount).toBe(2);
    expect(sessionData.modelUsed).toBe("claude-default");

    expect(mocks.exerciseCreate).toHaveBeenCalledTimes(2);
    for (const call of mocks.exerciseCreate.mock.calls) {
      expect(call[0].data.generationSessionId).toBe("sess-cli");
      // The model persisted to the row is the one the generator reported.
      expect(call[0].data.model).toBe("claude-test");
    }

    expect(mocks.sessionUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.sessionUpdate.mock.calls[0]![0].data.successCount).toBe(2);

    expect(result.sessionId).toBe("sess-cli");
    expect(result.generated).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });
});

describe("runGeneration — generator wiring", () => {
  it("passes the resolved topic, recent examples, and customPrompt to the generator", async () => {
    mocks.exerciseFindMany.mockResolvedValueOnce([
      { title: "T", content: { sentence: "Alt." }, solution: {} },
    ]);
    const generate = generatorReturning();
    await runGeneration(
      config({ generate, request: { ...baseRequest, customPrompt: { system: "VOICE" } } }),
    );
    const arg = (generate as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg.type).toBe("FILL_IN_THE_BLANK");
    expect(arg.level).toBe("A2");
    expect(arg.topic).toBe("Essen");
    expect(arg.customPrompt).toEqual({ system: "VOICE" });
    expect(arg.recentExamples).toHaveLength(1);
  });

  it("skips the recent-examples fetch when noRecent is set", async () => {
    const generate = generatorReturning();
    await runGeneration(config({ generate, request: { ...baseRequest, noRecent: true } }));
    expect(mocks.exerciseFindMany).not.toHaveBeenCalled();
    expect((generate as ReturnType<typeof vi.fn>).mock.calls[0]![0].recentExamples).toEqual([]);
  });
});

describe("runGeneration — resilience", () => {
  it("records a validation failure and continues to the next item", async () => {
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new GenerationError("validation_error", "bad content"))
      .mockResolvedValueOnce(VALID_PAYLOAD);
    const result = await runGeneration(config({ generate, request: { ...baseRequest, count: 2 } }));
    expect(result.generated).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.code).toBe("validation_error");
    expect(mocks.sessionUpdate.mock.calls[0]![0].data.failureCount).toBe(1);
  });

  it("stops the batch and tags rate_limited when the generator throws AiRateLimitedError", async () => {
    const rateErr = Object.assign(new Error("limit"), { name: "AiRateLimitedError" });
    const generate = vi.fn().mockRejectedValue(rateErr);
    const result = await runGeneration(config({ generate, request: { ...baseRequest, count: 5 } }));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.generated).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.code).toBe("rate_limited");
  });

  it("stops the batch when a beforeEach hook throws a rate-limit error", async () => {
    const rateErr = Object.assign(new Error("limit"), { name: "AiRateLimitedError" });
    const beforeEachHook = vi.fn().mockRejectedValue(rateErr);
    const generate = generatorReturning();
    const result = await runGeneration(
      config({ generate, beforeEach: beforeEachHook, request: { ...baseRequest, count: 5 } }),
    );
    expect(generate).not.toHaveBeenCalled();
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
      config({ context: { sessionId: "sess-ui", authorId: "admin-1", source: "UI" } }),
    );
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.exerciseCreate.mock.calls[0]![0].data.generationSessionId).toBe("sess-ui");
    expect(mocks.sessionUpdate.mock.calls[0]![0].where.id).toBe("sess-ui");
    expect(result.sessionId).toBe("sess-ui");
  });
});
