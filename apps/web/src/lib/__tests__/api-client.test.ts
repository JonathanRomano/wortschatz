import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.API_URL = "http://api.test";
  process.env.INTERNAL_API_SECRET = "test-secret";
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

function mockFetch(impl: typeof fetch) {
  global.fetch = vi.fn(impl) as unknown as typeof fetch;
}

describe("api-client.reviewTextRemote", () => {
  it("POSTs the right URL with the shared secret + user id, returns the parsed body", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    mockFetch(async (url, init) => {
      captured = { url: String(url), init: init! };
      return new Response(JSON.stringify({ feedback: "# Looks good" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const { reviewTextRemote } = await import("@/lib/api-client");
    const result = await reviewTextRemote("Ich gehe.", "A1", "user-7");

    expect(result).toEqual({ feedback: "# Looks good" });
    expect(captured!.url).toBe("http://api.test/ai/review-text");
    const headers = captured!.init.headers as Record<string, string>;
    expect(headers["X-Internal-Secret"]).toBe("test-secret");
    expect(headers["X-User-Id"]).toBe("user-7");
    expect(JSON.parse(captured!.init.body as string)).toEqual({
      text: "Ich gehe.",
      level: "A1",
    });
  });

  it("omits X-User-Id when userId is undefined (admin/system call)", async () => {
    let captured: RequestInit | null = null;
    mockFetch(async (_url, init) => {
      captured = init!;
      return new Response(JSON.stringify({ feedback: "x" }), { status: 200 });
    });

    const { reviewTextRemote } = await import("@/lib/api-client");
    await reviewTextRemote("hi", "B1");

    const headers = captured!.headers as Record<string, string>;
    expect(headers["X-User-Id"]).toBeUndefined();
  });

  it("on 429 throws AiRateLimitedError carrying the api's count/limit", async () => {
    mockFetch(async () => {
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          endpoint: "REVIEW_TEXT",
          count: 20,
          limit: 20,
        }),
        { status: 429 },
      );
    });

    const { reviewTextRemote } = await import("@/lib/api-client");
    const { AiRateLimitedError } = await import("@/lib/ai-rate-limit");

    await expect(reviewTextRemote("hi", "A1", "u")).rejects.toBeInstanceOf(
      AiRateLimitedError,
    );
  });

  it("throws when INTERNAL_API_SECRET is not configured", async () => {
    delete process.env.INTERNAL_API_SECRET;
    mockFetch(async () => new Response("never", { status: 200 }));

    const { reviewTextRemote } = await import("@/lib/api-client");
    await expect(reviewTextRemote("hi", "A1")).rejects.toThrow(
      /INTERNAL_API_SECRET/,
    );
  });

  it("surfaces non-2xx, non-429 errors with body context", async () => {
    mockFetch(
      async () =>
        new Response("upstream blew up", {
          status: 502,
          statusText: "Bad Gateway",
        }),
    );

    const { reviewTextRemote } = await import("@/lib/api-client");
    await expect(reviewTextRemote("hi", "A1")).rejects.toThrow(/502/);
  });
});

describe("api-client.evaluateAnswerRemote", () => {
  it("POSTs the exercise + userAnswer in the body and returns the api result", async () => {
    let body: string | null = null;
    mockFetch(async (_url, init) => {
      body = init!.body as string;
      return new Response(
        JSON.stringify({ score: 80, feedback: "Almost — der vs den" }),
        { status: 200 },
      );
    });

    const { evaluateAnswerRemote } = await import("@/lib/api-client");
    const result = await evaluateAnswerRemote(
      {
        type: "MULTIPLE_CHOICE",
        content: { question: "?", options: ["a", "b"] },
        solution: { correctIndex: 0 },
      },
      { selectedIndex: 0 },
      "user-3",
    );

    expect(result).toEqual({ score: 80, feedback: "Almost — der vs den" });
    const parsed = JSON.parse(body!);
    expect(parsed.exercise.type).toBe("MULTIPLE_CHOICE");
    expect(parsed.userAnswer).toEqual({ selectedIndex: 0 });
  });
});
