import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Prisma mock --------------------------------------------------------
//
// Hoist the mock spies so the `vi.mock` factory can reference them even
// though it runs before the module-level imports below. Mirrors the
// pattern used in muenzen-writers.test.ts.

const mocks = vi.hoisted(() => {
  const findUnique = vi.fn();
  const upsert = vi.fn();
  const del = vi.fn();
  return { findUnique, upsert, del };
});

vi.mock("@wortschatz/database", () => ({
  prisma: {
    aiCache: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
      delete: mocks.del,
    },
  },
}));

// IMPORTANT: import the SUT AFTER the mock is registered.
import { get, set } from "@/lib/ai-cache";

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.upsert.mockReset();
  mocks.del.mockReset();
  // Sane defaults.
  mocks.upsert.mockResolvedValue({});
  mocks.del.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ai-cache.get", () => {
  it("returns the row when present and not expired", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mocks.findUnique.mockResolvedValueOnce({
      key: "abc",
      response: { foo: "bar" },
      inputTokens: 12,
      outputTokens: 34,
      expiresAt: new Date(now.getTime() + 1000 * 60), // 1 minute in the future
    });

    const result = await get("abc");
    expect(result).toEqual({
      response: { foo: "bar" },
      inputTokens: 12,
      outputTokens: 34,
    });
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { key: "abc" } });
    expect(mocks.del).not.toHaveBeenCalled();
  });

  it("returns null when the row is missing", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);

    const result = await get("missing");
    expect(result).toBeNull();
    expect(mocks.del).not.toHaveBeenCalled();
  });

  it("returns null AND best-effort deletes when the row is expired", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mocks.findUnique.mockResolvedValueOnce({
      key: "stale",
      response: { foo: "bar" },
      inputTokens: 1,
      outputTokens: 1,
      expiresAt: new Date(now.getTime() - 1), // 1 ms ago
    });

    const result = await get("stale");
    expect(result).toBeNull();
    expect(mocks.del).toHaveBeenCalledTimes(1);
    expect(mocks.del).toHaveBeenCalledWith({ where: { key: "stale" } });
  });

  it("returns null AND best-effort deletes when expiresAt is exactly now", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mocks.findUnique.mockResolvedValueOnce({
      key: "boundary",
      response: { foo: "bar" },
      inputTokens: 1,
      outputTokens: 1,
      expiresAt: now, // exactly the cutoff — the code uses `<= Date.now()`
    });

    const result = await get("boundary");
    expect(result).toBeNull();
    expect(mocks.del).toHaveBeenCalledTimes(1);
  });

  it("swallows errors from the best-effort delete", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mocks.findUnique.mockResolvedValueOnce({
      key: "stale",
      response: null,
      inputTokens: 0,
      outputTokens: 0,
      expiresAt: new Date(now.getTime() - 100),
    });
    mocks.del.mockRejectedValueOnce(new Error("db on fire"));

    // Must NOT throw.
    await expect(get("stale")).resolves.toBeNull();
  });
});

describe("ai-cache.set", () => {
  it("is a no-op when ttlMs === 0", async () => {
    await set({
      key: "k",
      endpoint: "REVIEW_TEXT",
      model: "claude-sonnet-4-6",
      response: { foo: "bar" },
      inputTokens: 5,
      outputTokens: 5,
      ttlMs: 0,
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("is a no-op when ttlMs is negative", async () => {
    await set({
      key: "k",
      endpoint: "REVIEW_TEXT",
      model: "claude-sonnet-4-6",
      response: { foo: "bar" },
      inputTokens: 5,
      outputTokens: 5,
      ttlMs: -1,
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("upserts with expiresAt ≈ now + ttlMs and the full payload", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const ttlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    const response = { hello: "world" };

    await set({
      key: "abc",
      endpoint: "GENERATE_EXERCISE",
      model: "claude-sonnet-4-6",
      response,
      inputTokens: 100,
      outputTokens: 50,
      ttlMs,
    });

    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const args = mocks.upsert.mock.calls[0]?.[0] as {
      where: { key: string };
      create: {
        key: string;
        endpoint: string;
        model: string;
        response: unknown;
        inputTokens: number;
        outputTokens: number;
        expiresAt: Date;
      };
      update: {
        response: unknown;
        model: string;
        inputTokens: number;
        outputTokens: number;
        expiresAt: Date;
      };
    };
    expect(args.where).toEqual({ key: "abc" });
    expect(args.create).toEqual({
      key: "abc",
      endpoint: "GENERATE_EXERCISE",
      model: "claude-sonnet-4-6",
      response,
      inputTokens: 100,
      outputTokens: 50,
      expiresAt: new Date(now.getTime() + ttlMs),
    });
    expect(args.update).toEqual({
      response,
      model: "claude-sonnet-4-6",
      inputTokens: 100,
      outputTokens: 50,
      expiresAt: new Date(now.getTime() + ttlMs),
    });
  });

  it("swallows upsert errors so a doomed cache write never breaks the caller", async () => {
    mocks.upsert.mockRejectedValueOnce(new Error("boom"));

    await expect(
      set({
        key: "k",
        endpoint: "GENERATE_EXERCISE",
        model: "claude-sonnet-4-6",
        response: {},
        inputTokens: 1,
        outputTokens: 1,
        ttlMs: 1000,
      }),
    ).resolves.toBeUndefined();
  });
});
