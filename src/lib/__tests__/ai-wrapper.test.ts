import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted mocks ------------------------------------------------------
//
// Need spies on:
//   - the Anthropic SDK constructor + messages.create
//   - prisma.aiUsage.create  (usage logging)
//   - aiCache.get / aiCache.set
//   - ai-rate-limit.checkAndIncrement

const mocks = vi.hoisted(() => {
  const messagesCreate = vi.fn();
  // Plain class so `new Anthropic(...)` works correctly when the test
  // module is re-imported via vi.resetModules(). Using vi.fn() as a
  // constructor sometimes resolves to its inner mockImplementation
  // function instead of the spy wrapper after a reset.
  class AnthropicMock {
    messages = { create: messagesCreate };
    constructor(_args?: unknown) {}
  }
  const AnthropicCtor = AnthropicMock as unknown as ReturnType<typeof vi.fn>;
  const aiUsageCreate = vi.fn();
  const cacheGet = vi.fn();
  const cacheSet = vi.fn();
  const checkAndIncrement = vi.fn();
  return {
    messagesCreate,
    AnthropicCtor,
    aiUsageCreate,
    cacheGet,
    cacheSet,
    checkAndIncrement,
  };
});

vi.mock("@anthropic-ai/sdk", () => {
  // Vitest will re-evaluate this factory after vi.resetModules(). Returning
  // the *hoisted* spy (not a fresh function) keeps assertions stable across
  // the dynamic re-imports of @/lib/ai. The `__esModule: true` flag tells
  // the interop layer that this module has a real default export, so the
  // `import Anthropic from "@anthropic-ai/sdk"` line in ai.ts resolves to
  // the constructor itself (and not the namespace object).
  return {
    __esModule: true,
    default: mocks.AnthropicCtor,
    Anthropic: mocks.AnthropicCtor,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    aiUsage: { create: mocks.aiUsageCreate },
  },
}));

vi.mock("@/lib/ai-cache", () => ({
  get: mocks.cacheGet,
  set: mocks.cacheSet,
}));

// Mock ai-rate-limit but keep the real AiRateLimitedError class so
// `instanceof` checks still work for the consumer.
vi.mock("@/lib/ai-rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai-rate-limit")>(
    "@/lib/ai-rate-limit",
  );
  return {
    ...actual,
    checkAndIncrement: mocks.checkAndIncrement,
  };
});

// Helpers --------------------------------------------------------------

/** Build a faux Anthropic Messages.Message with the given text body. */
function fakeMessage(text: string, input = 100, output = 50) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-6",
    stop_reason: "end_turn",
    stop_sequence: null,
    content: [{ type: "text", text }],
    usage: { input_tokens: input, output_tokens: output },
  };
}

/** Valid FILL_IN_THE_BLANK exercise payload matching the Zod schema. */
const VALID_FITB_PAYLOAD = {
  title: "Lückentext: food",
  instructions: { en: "Fill", pt: "P", tr: "T", uk: "U" },
  content: { sentence: "Ich ___ einen Apfel.", blanksCount: 1, hint: "essen" },
  solution: { blanks: ["esse"] },
  explanation: { en: "Verb essen.", pt: "p", tr: "t", uk: "u" },
  tags: ["food", "a1"],
};

beforeEach(() => {
  mocks.messagesCreate.mockReset();
  mocks.aiUsageCreate.mockReset();
  mocks.aiUsageCreate.mockResolvedValue({});
  mocks.cacheGet.mockReset();
  mocks.cacheSet.mockReset();
  mocks.cacheSet.mockResolvedValue(undefined);
  mocks.checkAndIncrement.mockReset();
  mocks.checkAndIncrement.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.resetModules();
});

// =====================================================================
// Stub path: AI_CONFIGURED === false (no API key)
// =====================================================================

describe("ai wrapper — stub path (ANTHROPIC_API_KEY missing)", () => {
  const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    // Silence the one-time missing-key warn.
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
    }
  });

  it("generateExercise returns a deterministic stub and writes nothing", async () => {
    vi.resetModules();
    const ai = await import("@/lib/ai");

    expect(ai.AI_CONFIGURED).toBe(false);

    const result = await ai.generateExercise("FILL_IN_THE_BLANK", "A1", "food", "user-1");
    expect(result.type).toBe("FILL_IN_THE_BLANK");
    expect(result.level).toBe("A1");
    expect(result.tags).toContain("stub");

    expect(mocks.messagesCreate).not.toHaveBeenCalled();
    expect(mocks.aiUsageCreate).not.toHaveBeenCalled();
    expect(mocks.cacheGet).not.toHaveBeenCalled();
    expect(mocks.cacheSet).not.toHaveBeenCalled();
    expect(mocks.checkAndIncrement).not.toHaveBeenCalled();
  });

  it("evaluateAnswer returns the stub evaluation and writes nothing", async () => {
    vi.resetModules();
    const ai = await import("@/lib/ai");

    const result = await ai.evaluateAnswer(
      {
        type: "MULTIPLE_CHOICE",
        content: { question: "?", options: ["a", "b", "c", "d"] },
        solution: { correctIndex: 0 },
        explanation: { en: "" },
      },
      { selectedIndex: 0 },
      "user-1",
    );

    expect(result.score).toBe(50);
    expect(result.feedback).toMatch(/AI evaluation is disabled/);

    expect(mocks.messagesCreate).not.toHaveBeenCalled();
    expect(mocks.aiUsageCreate).not.toHaveBeenCalled();
    expect(mocks.cacheSet).not.toHaveBeenCalled();
    expect(mocks.checkAndIncrement).not.toHaveBeenCalled();
  });

  it("reviewText returns the stub review and writes nothing", async () => {
    vi.resetModules();
    const ai = await import("@/lib/ai");

    const result = await ai.reviewText("Ich gehe.", "A1", "user-1");
    expect(result.feedback).toMatch(/Stub review/);

    expect(mocks.messagesCreate).not.toHaveBeenCalled();
    expect(mocks.aiUsageCreate).not.toHaveBeenCalled();
    expect(mocks.cacheSet).not.toHaveBeenCalled();
    expect(mocks.checkAndIncrement).not.toHaveBeenCalled();
  });
});

// =====================================================================
// Real path: AI_CONFIGURED === true (key present, SDK mocked)
// =====================================================================

describe("ai wrapper — real path (ANTHROPIC_API_KEY set, SDK mocked)", () => {
  const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "sk-test-fake";
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
    }
  });

  // ------------ generateExercise ----------------------------------

  describe("generateExercise", () => {
    it("returns the cached response on hit; skips SDK + rate-limit but logs usage with cacheHit=true", async () => {
      vi.resetModules();

      // Pre-seed the cache with a previously-stored GeneratedExercise.
      mocks.cacheGet.mockResolvedValueOnce({
        response: {
          type: "FILL_IN_THE_BLANK",
          level: "A1",
          title: "cached",
          instructions: { en: "x", pt: "x", tr: "x", uk: "x" },
          content: { sentence: "Ich ___.", blanksCount: 1 },
          solution: { blanks: ["esse"] },
          explanation: { en: "x", pt: "x", tr: "x", uk: "x" },
          tags: ["cached"],
        },
        inputTokens: 11,
        outputTokens: 22,
      });

      const ai = await import("@/lib/ai");
      expect(ai.AI_CONFIGURED).toBe(true);

      const result = await ai.generateExercise(
        "FILL_IN_THE_BLANK",
        "A1",
        "food",
        "user-1",
      );

      expect(result.title).toBe("cached");
      expect(mocks.messagesCreate).not.toHaveBeenCalled();
      expect(mocks.checkAndIncrement).not.toHaveBeenCalled();
      expect(mocks.cacheSet).not.toHaveBeenCalled();

      expect(mocks.aiUsageCreate).toHaveBeenCalledTimes(1);
      const usageArg = mocks.aiUsageCreate.mock.calls[0]?.[0] as {
        data: {
          userId: string | null;
          endpoint: string;
          cacheHit: boolean;
          inputTokens: number;
          outputTokens: number;
          costMicrocents: number;
        };
      };
      expect(usageArg.data.cacheHit).toBe(true);
      expect(usageArg.data.userId).toBe("user-1");
      expect(usageArg.data.endpoint).toBe("GENERATE_EXERCISE");
      expect(usageArg.data.inputTokens).toBe(11);
      expect(usageArg.data.outputTokens).toBe(22);
      // 30 * 11 + 150 * 22 = 330 + 3300 = 3630
      expect(usageArg.data.costMicrocents).toBe(3630);
    });

    it("on cache miss: calls SDK, parses, increments rate limit, writes cache + usage", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce(null);
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage(JSON.stringify(VALID_FITB_PAYLOAD), 200, 80),
      );

      const ai = await import("@/lib/ai");
      const result = await ai.generateExercise(
        "FILL_IN_THE_BLANK",
        "A1",
        "food",
        "user-1",
      );

      expect(result.type).toBe("FILL_IN_THE_BLANK");
      expect(result.level).toBe("A1");
      expect(result.content).toMatchObject({ sentence: "Ich ___ einen Apfel." });
      expect(result.solution).toMatchObject({ blanks: ["esse"] });
      expect(result.tags).toEqual(["food", "a1"]);

      expect(mocks.checkAndIncrement).toHaveBeenCalledTimes(1);
      expect(mocks.checkAndIncrement).toHaveBeenCalledWith(
        "user-1",
        "GENERATE_EXERCISE",
      );
      expect(mocks.messagesCreate).toHaveBeenCalledTimes(1);

      expect(mocks.cacheSet).toHaveBeenCalledTimes(1);
      const setArg = mocks.cacheSet.mock.calls[0]?.[0] as {
        endpoint: string;
        ttlMs: number;
        inputTokens: number;
        outputTokens: number;
      };
      expect(setArg.endpoint).toBe("GENERATE_EXERCISE");
      // GENERATE_EXERCISE TTL is 30 days.
      expect(setArg.ttlMs).toBe(30 * 24 * 60 * 60 * 1000);
      expect(setArg.inputTokens).toBe(200);
      expect(setArg.outputTokens).toBe(80);

      expect(mocks.aiUsageCreate).toHaveBeenCalledTimes(1);
      const usageArg = mocks.aiUsageCreate.mock.calls[0]?.[0] as {
        data: { cacheHit: boolean; inputTokens: number; outputTokens: number };
      };
      expect(usageArg.data.cacheHit).toBe(false);
      expect(usageArg.data.inputTokens).toBe(200);
      expect(usageArg.data.outputTokens).toBe(80);
    });

    it("propagates AiRateLimitedError; does NOT call SDK or write cache", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce(null);

      const { AiRateLimitedError } = await import("@/lib/ai-rate-limit");
      mocks.checkAndIncrement.mockRejectedValueOnce(
        new AiRateLimitedError("GENERATE_EXERCISE", 50, 50),
      );

      const ai = await import("@/lib/ai");
      await expect(
        ai.generateExercise("FILL_IN_THE_BLANK", "A1", "food", "user-1"),
      ).rejects.toBeInstanceOf(AiRateLimitedError);

      expect(mocks.messagesCreate).not.toHaveBeenCalled();
      expect(mocks.cacheSet).not.toHaveBeenCalled();
      expect(mocks.aiUsageCreate).not.toHaveBeenCalled();
    });

    it("rejects malformed JSON from the model", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce(null);
      // Bare prose with no JSON braces at all.
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage("sorry, no can do", 10, 5),
      );

      const ai = await import("@/lib/ai");
      await expect(
        ai.generateExercise("FILL_IN_THE_BLANK", "A1", "food", "user-1"),
      ).rejects.toThrow(/not valid JSON|valid JSON|invalid content/i);

      // Cache must NOT be poisoned with a bad response.
      expect(mocks.cacheSet).not.toHaveBeenCalled();
    });

    it("rejects when content fails the Zod schema (e.g. blanksCount=0)", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce(null);
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage(
          JSON.stringify({
            ...VALID_FITB_PAYLOAD,
            content: { sentence: "Ich ___.", blanksCount: 0 },
          }),
          50,
          10,
        ),
      );

      const ai = await import("@/lib/ai");
      await expect(
        ai.generateExercise("FILL_IN_THE_BLANK", "A1", "food", "user-1"),
      ).rejects.toThrow(/invalid content/);
      expect(mocks.cacheSet).not.toHaveBeenCalled();
    });

    it("skips rate-limit check when userId is not provided", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce(null);
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage(JSON.stringify(VALID_FITB_PAYLOAD), 10, 5),
      );

      const ai = await import("@/lib/ai");
      await ai.generateExercise("FILL_IN_THE_BLANK", "A1", "food");

      expect(mocks.checkAndIncrement).not.toHaveBeenCalled();
      // Usage row still recorded with userId=null.
      expect(mocks.aiUsageCreate).toHaveBeenCalledTimes(1);
      const usageArg = mocks.aiUsageCreate.mock.calls[0]?.[0] as {
        data: { userId: string | null };
      };
      expect(usageArg.data.userId).toBeNull();
    });
  });

  // ------------ evaluateAnswer ------------------------------------

  describe("evaluateAnswer", () => {
    it("returns the cached evaluation on cache hit", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce({
        response: { score: 95, feedback: "cached feedback" },
        inputTokens: 5,
        outputTokens: 5,
      });

      const ai = await import("@/lib/ai");
      const result = await ai.evaluateAnswer(
        {
          type: "MULTIPLE_CHOICE",
          content: { question: "?", options: ["a", "b", "c", "d"] },
          solution: { correctIndex: 0 },
          explanation: { en: "" },
        },
        { selectedIndex: 0 },
        "user-1",
      );

      expect(result.score).toBe(95);
      expect(result.feedback).toBe("cached feedback");
      expect(mocks.messagesCreate).not.toHaveBeenCalled();
      expect(mocks.checkAndIncrement).not.toHaveBeenCalled();
      const usageArg = mocks.aiUsageCreate.mock.calls[0]?.[0] as {
        data: { cacheHit: boolean };
      };
      expect(usageArg.data.cacheHit).toBe(true);
    });

    it("on cache miss: calls SDK, clamps score to 0-100, writes cache with EVALUATE TTL", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce(null);
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage(
          JSON.stringify({ score: 150, feedback: "great" }),
          30,
          10,
        ),
      );

      const ai = await import("@/lib/ai");
      const result = await ai.evaluateAnswer(
        {
          type: "MULTIPLE_CHOICE",
          content: { question: "?", options: ["a", "b", "c", "d"] },
          solution: { correctIndex: 0 },
          explanation: { en: "" },
        },
        { selectedIndex: 0 },
        "user-1",
      );

      // 150 clamps to 100.
      expect(result.score).toBe(100);
      expect(result.feedback).toBe("great");

      expect(mocks.checkAndIncrement).toHaveBeenCalledWith(
        "user-1",
        "EVALUATE_ANSWER",
      );

      const setArg = mocks.cacheSet.mock.calls[0]?.[0] as {
        endpoint: string;
        ttlMs: number;
      };
      expect(setArg.endpoint).toBe("EVALUATE_ANSWER");
      expect(setArg.ttlMs).toBe(60 * 60 * 1000);
    });

    it("throws when response has no numeric score", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce(null);
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage(
          JSON.stringify({ score: "not-a-number", feedback: "x" }),
          10,
          5,
        ),
      );

      const ai = await import("@/lib/ai");
      await expect(
        ai.evaluateAnswer(
          {
            type: "MULTIPLE_CHOICE",
            content: { question: "?", options: ["a", "b", "c", "d"] },
            solution: { correctIndex: 0 },
            explanation: { en: "" },
          },
          { selectedIndex: 0 },
          "user-1",
        ),
      ).rejects.toThrow(/malformed/);
      expect(mocks.cacheSet).not.toHaveBeenCalled();
    });

    it("throws when feedback is empty", async () => {
      vi.resetModules();
      mocks.cacheGet.mockResolvedValueOnce(null);
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage(JSON.stringify({ score: 80, feedback: "" }), 10, 5),
      );

      const ai = await import("@/lib/ai");
      await expect(
        ai.evaluateAnswer(
          {
            type: "MULTIPLE_CHOICE",
            content: { question: "?", options: ["a", "b", "c", "d"] },
            solution: { correctIndex: 0 },
            explanation: { en: "" },
          },
          { selectedIndex: 0 },
          "user-1",
        ),
      ).rejects.toThrow(/malformed/);
      expect(mocks.cacheSet).not.toHaveBeenCalled();
    });
  });

  // ------------ reviewText ----------------------------------------

  describe("reviewText", () => {
    it("calls SDK and increments rate limit (no cache lookup)", async () => {
      vi.resetModules();
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage("## Grammar\nLooks good.", 50, 30),
      );

      const ai = await import("@/lib/ai");
      const result = await ai.reviewText("Ich gehe heim.", "A1", "user-1");

      expect(result.feedback).toContain("Grammar");
      expect(mocks.checkAndIncrement).toHaveBeenCalledWith(
        "user-1",
        "REVIEW_TEXT",
      );
      // REVIEW_TEXT skips the cache lookup entirely.
      expect(mocks.cacheGet).not.toHaveBeenCalled();
    });

    it("calls aiCache.set with ttlMs=0 (REVIEW_TEXT TTL is zero)", async () => {
      // Per the source comment, set() is invoked for symmetry but the
      // cache module is responsible for short-circuiting on ttlMs=0. The
      // wrapper-level test here only confirms the ttlMs argument is 0.
      vi.resetModules();
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage("## Grammar\nfeedback body", 50, 30),
      );

      const ai = await import("@/lib/ai");
      await ai.reviewText("Ich gehe heim.", "A1", "user-1");

      expect(mocks.cacheSet).toHaveBeenCalledTimes(1);
      const setArg = mocks.cacheSet.mock.calls[0]?.[0] as { ttlMs: number };
      expect(setArg.ttlMs).toBe(0);
    });

    it("logs usage with cacheHit=false and the model's token counts", async () => {
      vi.resetModules();
      mocks.messagesCreate.mockResolvedValueOnce(
        fakeMessage("## Grammar\nfine.", 77, 33),
      );

      const ai = await import("@/lib/ai");
      await ai.reviewText("Ich gehe heim.", "B1", "user-1");

      const usageArg = mocks.aiUsageCreate.mock.calls[0]?.[0] as {
        data: {
          cacheHit: boolean;
          inputTokens: number;
          outputTokens: number;
          endpoint: string;
        };
      };
      expect(usageArg.data.cacheHit).toBe(false);
      expect(usageArg.data.endpoint).toBe("REVIEW_TEXT");
      expect(usageArg.data.inputTokens).toBe(77);
      expect(usageArg.data.outputTokens).toBe(33);
    });

    it("throws when Claude returns an empty response", async () => {
      vi.resetModules();
      mocks.messagesCreate.mockResolvedValueOnce(fakeMessage("   ", 10, 5));

      const ai = await import("@/lib/ai");
      await expect(
        ai.reviewText("Ich gehe.", "A1", "user-1"),
      ).rejects.toThrow(/empty/);
      expect(mocks.aiUsageCreate).not.toHaveBeenCalled();
    });

    it("propagates AiRateLimitedError; does NOT call SDK", async () => {
      vi.resetModules();
      const { AiRateLimitedError } = await import("@/lib/ai-rate-limit");
      mocks.checkAndIncrement.mockRejectedValueOnce(
        new AiRateLimitedError("REVIEW_TEXT", 20, 20),
      );

      const ai = await import("@/lib/ai");
      await expect(
        ai.reviewText("Ich gehe.", "A1", "user-1"),
      ).rejects.toBeInstanceOf(AiRateLimitedError);
      expect(mocks.messagesCreate).not.toHaveBeenCalled();
      expect(mocks.aiUsageCreate).not.toHaveBeenCalled();
    });
  });
});
