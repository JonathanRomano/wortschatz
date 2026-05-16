import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AI_RATE_LIMITS } from "@wortschatz/config";

// --- Prisma mock --------------------------------------------------------
//
// $transaction(fn) calls the callback with a `tx` shaped like the real
// PrismaClient. Inside the SUT we use `tx.aiRateLimit.{findUnique,upsert,
// update}`, so the mock client gives us spies on each.

const mocks = vi.hoisted(() => {
  const findUnique = vi.fn();
  const upsert = vi.fn();
  const update = vi.fn();
  const txClient = {
    aiRateLimit: { findUnique, upsert, update },
  };
  const $transaction = vi.fn(
    async (fn: (tx: typeof txClient) => unknown) => fn(txClient),
  );
  return { findUnique, upsert, update, txClient, $transaction };
});

vi.mock("@wortschatz/database", () => ({
  prisma: {
    $transaction: mocks.$transaction,
    aiRateLimit: mocks.txClient.aiRateLimit,
  },
}));

import { AiRateLimitedError, checkAndIncrement } from "@/lib/ai-rate-limit";

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.upsert.mockReset();
  mocks.update.mockReset();
  mocks.$transaction.mockClear();
  mocks.upsert.mockResolvedValue({});
  mocks.update.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkAndIncrement", () => {
  it("runs inside a transaction (the callback receives a tx and uses it)", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);

    await checkAndIncrement("user-1", "REVIEW_TEXT");

    expect(mocks.$transaction).toHaveBeenCalledTimes(1);
    // The mock $transaction passes our txClient to the callback. Both the
    // findUnique and the upsert spies on that client should fire — proving
    // the SUT used the transaction-scoped client, not the bare prisma one.
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  it("creates a fresh row when none exists (count=1, windowStart=now)", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mocks.findUnique.mockResolvedValueOnce(null);

    await checkAndIncrement("user-1", "REVIEW_TEXT");

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { userId_endpoint: { userId: "user-1", endpoint: "REVIEW_TEXT" } },
    });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const args = mocks.upsert.mock.calls[0]?.[0] as {
      where: unknown;
      create: { userId: string; endpoint: string; count: number; windowStart: Date };
      update: { count: number; windowStart: Date };
    };
    expect(args.create.count).toBe(1);
    expect(args.create.userId).toBe("user-1");
    expect(args.create.endpoint).toBe("REVIEW_TEXT");
    expect(args.create.windowStart.getTime()).toBe(now.getTime());
    expect(args.update.count).toBe(1);
    expect(args.update.windowStart.getTime()).toBe(now.getTime());
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("resets the window when the existing row is older than 24h", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    // 25 hours ago — clearly stale.
    const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    mocks.findUnique.mockResolvedValueOnce({
      id: "row-1",
      userId: "user-1",
      endpoint: "REVIEW_TEXT",
      count: 19, // even a near-limit count must reset, not throw
      windowStart,
    });

    await checkAndIncrement("user-1", "REVIEW_TEXT");

    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const args = mocks.upsert.mock.calls[0]?.[0] as {
      update: { count: number; windowStart: Date };
    };
    expect(args.update.count).toBe(1);
    expect(args.update.windowStart.getTime()).toBe(now.getTime());
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("increments count when row is fresh and below the limit", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mocks.findUnique.mockResolvedValueOnce({
      id: "row-7",
      userId: "user-1",
      endpoint: "REVIEW_TEXT",
      count: 5,
      windowStart: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
    });

    await checkAndIncrement("user-1", "REVIEW_TEXT");

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "row-7" },
      data: { count: { increment: 1 } },
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("throws AiRateLimitedError when count is at the limit (fresh window)", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const limit = AI_RATE_LIMITS.REVIEW_TEXT.perDay;
    mocks.findUnique.mockResolvedValueOnce({
      id: "row-8",
      userId: "user-1",
      endpoint: "REVIEW_TEXT",
      count: limit,
      windowStart: new Date(now.getTime() - 60 * 60 * 1000),
    });

    await expect(
      checkAndIncrement("user-1", "REVIEW_TEXT"),
    ).rejects.toBeInstanceOf(AiRateLimitedError);

    // Re-run to inspect the error fields. Both spy state and timers are
    // shared, so we re-arrange the mock identically.
    mocks.findUnique.mockResolvedValueOnce({
      id: "row-8",
      userId: "user-1",
      endpoint: "REVIEW_TEXT",
      count: limit,
      windowStart: new Date(now.getTime() - 60 * 60 * 1000),
    });
    let caught: unknown;
    try {
      await checkAndIncrement("user-1", "REVIEW_TEXT");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AiRateLimitedError);
    const err = caught as AiRateLimitedError;
    expect(err.endpoint).toBe("REVIEW_TEXT");
    expect(err.count).toBe(limit);
    expect(err.limit).toBe(limit);
    expect(err.name).toBe("AiRateLimitedError");
    expect(err.message).toMatch(/REVIEW_TEXT/);
    expect(err.message).toMatch(new RegExp(`${limit}/${limit}`));

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("throws AiRateLimitedError when count exceeds the limit (defensive)", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const limit = AI_RATE_LIMITS.EVALUATE_ANSWER.perDay;
    mocks.findUnique.mockResolvedValueOnce({
      id: "row-9",
      userId: "user-2",
      endpoint: "EVALUATE_ANSWER",
      count: limit + 5,
      windowStart: new Date(now.getTime() - 60 * 60 * 1000),
    });

    await expect(
      checkAndIncrement("user-2", "EVALUATE_ANSWER"),
    ).rejects.toBeInstanceOf(AiRateLimitedError);
  });

  it("uses the correct per-endpoint limit when throwing", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    // Use GENERATE_EXERCISE which has a different perDay than REVIEW_TEXT.
    const limit = AI_RATE_LIMITS.GENERATE_EXERCISE.perDay;
    mocks.findUnique.mockResolvedValueOnce({
      id: "row-9",
      userId: "admin-1",
      endpoint: "GENERATE_EXERCISE",
      count: limit,
      windowStart: new Date(now.getTime() - 60 * 60 * 1000),
    });

    let caught: unknown;
    try {
      await checkAndIncrement("admin-1", "GENERATE_EXERCISE");
    } catch (e) {
      caught = e;
    }
    const err = caught as AiRateLimitedError;
    expect(err.limit).toBe(limit);
    expect(err.endpoint).toBe("GENERATE_EXERCISE");
  });

  it("treats a row exactly 24h old as stale (boundary)", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    // windowStart < oneDayAgo is the predicate; equal timestamps are NOT
    // stale (strict less-than). We use one millisecond older than 24h.
    const justOver = new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1);
    mocks.findUnique.mockResolvedValueOnce({
      id: "old",
      userId: "user-1",
      endpoint: "REVIEW_TEXT",
      count: 50,
      windowStart: justOver,
    });

    await checkAndIncrement("user-1", "REVIEW_TEXT");

    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
