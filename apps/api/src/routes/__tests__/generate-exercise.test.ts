/**
 * POST /ai/generate-exercise (apps/api) — route-level tests via supertest.
 *
 * Mocks the Anthropic/OpenAI SDKs (no network), prisma (no DB), env (so
 * importing the route doesn't validate/exit on the real process.env), and the
 * rate limiter. Covers: missing shared secret → 401, bad body → 400, a valid
 * model response → 200 + the validated exercise, a schema-failing model
 * response → 422, and a rate-limit → 429.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const SECRET = "test-internal-secret-test-internal-secret";

// Everything the (hoisted) vi.mock factories reference must itself be hoisted.
const hoisted = vi.hoisted(() => {
  class AiRateLimitedError extends Error {
    endpoint: string;
    count: number;
    limit: number;
    constructor(endpoint: string, count: number, limit: number) {
      super(`Rate limit exceeded for ${endpoint}: ${count}/${limit}.`);
      this.name = "AiRateLimitedError";
      this.endpoint = endpoint;
      this.count = count;
      this.limit = limit;
    }
  }
  return {
    messagesCreate: vi.fn(),
    completionsCreate: vi.fn(),
    aiUsageCreate: vi.fn(),
    checkAndIncrement: vi.fn(),
    AiRateLimitedError,
  };
});

// env: avoid the real apiEnvSchema.safeParse(process.env) + process.exit.
vi.mock("../../env.js", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 4000,
    WEB_URL: "http://localhost:3000",
    // Inlined (not `SECRET`): this factory is hoisted above the const.
    INTERNAL_API_SECRET: "test-internal-secret-test-internal-secret",
    DATABASE_URL: "postgresql://test",
  },
  AI_CONFIGURED: true,
  MODEL: "claude-test",
}));

// SDKs: never hit the network.
vi.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: class {
    messages = { create: hoisted.messagesCreate };
    constructor(_args?: unknown) {}
  },
}));
vi.mock("openai", () => ({
  __esModule: true,
  default: class {
    chat = { completions: { create: hoisted.completionsCreate } };
    constructor(_args?: unknown) {}
  },
}));

// prisma: capture usage writes; nothing else is touched.
vi.mock("@wortschatz/database", () => ({
  prisma: { aiUsage: { create: hoisted.aiUsageCreate } },
}));

// rate limiter: the same error class the errorHandler does `instanceof` against.
vi.mock("../../services/rateLimit.js", () => ({
  AiRateLimitedError: hoisted.AiRateLimitedError,
  checkAndIncrement: hoisted.checkAndIncrement,
}));

import { aiRouter } from "../ai.js";
import { errorHandler } from "../../middleware/errorHandler.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/ai", aiRouter);
  app.use(errorHandler);
  return app;
}

function claudeText(payload: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: 12, output_tokens: 34 },
  };
}

const VALID_FITB = {
  title: "Lückentext: Essen",
  content: { sentence: "Ich ___ einen Apfel.", blanksCount: 1 },
  solution: { blanks: ["esse"] },
  explanation: { en: "Present tense of essen." },
  tags: ["food"],
  tip: { en: "Conjugate the verb." },
};

const VALID_BODY = {
  type: "FILL_IN_THE_BLANK",
  level: "A2",
  topic: "Essen",
  recentExamples: [],
};

beforeEach(() => {
  hoisted.messagesCreate.mockReset().mockResolvedValue(claudeText(VALID_FITB));
  hoisted.completionsCreate.mockReset();
  hoisted.aiUsageCreate.mockReset().mockResolvedValue({});
  hoisted.checkAndIncrement.mockReset().mockResolvedValue(undefined);
});

describe("POST /ai/generate-exercise", () => {
  it("401 without the shared secret", async () => {
    const res = await request(makeApp()).post("/ai/generate-exercise").send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(hoisted.messagesCreate).not.toHaveBeenCalled();
  });

  it("400 on an invalid exercise type", async () => {
    const res = await request(makeApp())
      .post("/ai/generate-exercise")
      .set("X-Internal-Secret", SECRET)
      .send({ ...VALID_BODY, type: "NOPE" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("bad_request");
  });

  it("200 with the validated exercise on a good model response", async () => {
    const res = await request(makeApp())
      .post("/ai/generate-exercise")
      .set("X-Internal-Secret", SECRET)
      .send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Lückentext: Essen");
    expect(res.body.content.sentence).toBe("Ich ___ einen Apfel.");
    expect(res.body.solution.blanks).toEqual(["esse"]);
    expect(res.body.modelUsed).toBe("claude-test");
    expect(hoisted.aiUsageCreate).toHaveBeenCalledTimes(1);
  });

  it("422 when the model output fails the per-type schema", async () => {
    // blanksCount says 2 but the sentence has one marker → custom check fails.
    hoisted.messagesCreate.mockResolvedValueOnce(
      claudeText({
        ...VALID_FITB,
        content: { sentence: "Ich ___ einen Apfel.", blanksCount: 2 },
      }),
    );
    const res = await request(makeApp())
      .post("/ai/generate-exercise")
      .set("X-Internal-Secret", SECRET)
      .send(VALID_BODY);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("validation_failed");
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("429 when the per-user rate limit is exceeded", async () => {
    hoisted.checkAndIncrement.mockRejectedValueOnce(
      new hoisted.AiRateLimitedError("GENERATE_EXERCISE", 50, 50),
    );
    const res = await request(makeApp())
      .post("/ai/generate-exercise")
      .set("X-Internal-Secret", SECRET)
      .set("X-User-Id", "user-1")
      .send(VALID_BODY);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("rate_limited");
    expect(hoisted.messagesCreate).not.toHaveBeenCalled();
  });
});
