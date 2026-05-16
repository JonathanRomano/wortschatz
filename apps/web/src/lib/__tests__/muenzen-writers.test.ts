import { vi, describe, it, expect, beforeEach } from "vitest";

// --- Prisma mock --------------------------------------------------------
//
// `credit` writes directly via the default `prisma` client (or a passed-in
// tx). `debit` and `adminAdjust` use `prisma.$transaction(async (tx) => …)`,
// so we hand-roll a tx with the same shape and have `$transaction` invoke
// the callback with it. `findUnique` is a stub we override per-test so we
// can simulate different balances.
//
// `vi.mock` is hoisted above all imports, so the mock factory can't close
// over module-level `const`s. We use `vi.hoisted` to declare the spies in
// a hoisted block, then `vi.mock` references them via the same handle.

const mocks = vi.hoisted(() => {
  const userUpdate = vi.fn();
  const userFindUnique = vi.fn();
  const txCreate = vi.fn();
  const txClient = {
    user: { update: userUpdate, findUnique: userFindUnique },
    muenzenTransaction: { create: txCreate },
  };
  const $transaction = vi.fn(
    async (fn: (tx: typeof txClient) => unknown) => fn(txClient),
  );
  return { userUpdate, userFindUnique, txCreate, txClient, $transaction };
});

const { userUpdate, userFindUnique, txCreate, $transaction } = mocks;

vi.mock("@wortschatz/database", () => ({
  prisma: {
    $transaction: mocks.$transaction,
    user: {
      update: mocks.userUpdate,
      findUnique: mocks.userFindUnique,
    },
    muenzenTransaction: { create: mocks.txCreate },
  },
}));

// IMPORTANT: import the SUT AFTER the mock is registered above.
import { credit, debit, adminAdjust, InsufficientFundsError } from "@/lib/muenzen";

beforeEach(() => {
  userUpdate.mockReset();
  userFindUnique.mockReset();
  txCreate.mockReset();
  $transaction.mockClear();
  // Default benign returns so tests that don't override get harmless no-ops.
  userUpdate.mockResolvedValue({});
  txCreate.mockResolvedValue({});
});

describe("credit", () => {
  it("increments the user's balance and writes a matching transaction", async () => {
    await credit("user-1", 10, "EXERCISE_COMPLETE", "exr-1");

    expect(userUpdate).toHaveBeenCalledTimes(1);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { muenzen: { increment: 10 } },
    });

    expect(txCreate).toHaveBeenCalledTimes(1);
    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: 10,
        reason: "EXERCISE_COMPLETE",
        refId: "exr-1",
      },
    });
  });

  it("stores refId as null when not provided", async () => {
    await credit("user-1", 5, "BONUS");

    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: 5,
        reason: "BONUS",
        refId: null,
      },
    });
  });

  it("throws when amount is zero", async () => {
    await expect(credit("user-1", 0, "BONUS")).rejects.toThrow(
      /positive amount/,
    );
    expect(userUpdate).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("throws when amount is negative", async () => {
    await expect(credit("user-1", -1, "BONUS")).rejects.toThrow(
      /positive amount/,
    );
    expect(userUpdate).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("uses the provided transaction client when given", async () => {
    const altUpdate = vi.fn().mockResolvedValue({});
    const altCreate = vi.fn().mockResolvedValue({});
    const altTx = {
      user: { update: altUpdate },
      muenzenTransaction: { create: altCreate },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    await credit("user-2", 7, "DAILY_STREAK", undefined, altTx);

    expect(altUpdate).toHaveBeenCalledTimes(1);
    expect(altCreate).toHaveBeenCalledTimes(1);
    // The default prisma mock must NOT have been touched.
    expect(userUpdate).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });
});

describe("debit", () => {
  it("decrements balance and writes a negative-amount transaction when funds suffice", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 100 });

    await debit("user-1", 30, "SPENT_AI_REVIEW", "review-1");

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { muenzen: true },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { muenzen: { decrement: 30 } },
    });
    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: -30,
        reason: "SPENT_AI_REVIEW",
        refId: "review-1",
      },
    });
  });

  it("throws InsufficientFundsError when balance is too low and writes nothing", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 10 });

    await expect(
      debit("user-1", 30, "SPENT_AI_REVIEW"),
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    expect(userUpdate).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("throws when the user doesn't exist and writes nothing", async () => {
    userFindUnique.mockResolvedValueOnce(null);

    await expect(debit("ghost", 5, "SPENT_AI_REVIEW")).rejects.toThrow(
      /User not found/,
    );
    expect(userUpdate).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("rejects non-positive amounts before touching the database", async () => {
    await expect(debit("user-1", 0, "SPENT_AI_REVIEW")).rejects.toThrow(
      /positive amount/,
    );
    await expect(debit("user-1", -5, "SPENT_AI_REVIEW")).rejects.toThrow(
      /positive amount/,
    );
    expect($transaction).not.toHaveBeenCalled();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("stores refId as null when omitted", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 50 });

    await debit("user-1", 30, "SPENT_AI_REVIEW");

    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: -30,
        reason: "SPENT_AI_REVIEW",
        refId: null,
      },
    });
  });
});

describe("adminAdjust", () => {
  it("credits a positive delta and writes an ADMIN_ADJUSTMENT transaction with the note as refId", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 0 });

    await adminAdjust("user-1", 50, "welcome bonus");

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { muenzen: { increment: 50 } },
    });
    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: 50,
        reason: "ADMIN_ADJUSTMENT",
        refId: "welcome bonus",
      },
    });
  });

  it("decrements when delta is negative and balance suffices", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 100 });

    await adminAdjust("user-1", -50, "correction");

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { muenzen: { increment: -50 } },
    });
    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: -50,
        reason: "ADMIN_ADJUSTMENT",
        refId: "correction",
      },
    });
  });

  it("throws InsufficientFundsError when a negative delta would drive the balance below zero", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 30 });

    await expect(adminAdjust("user-1", -50)).rejects.toBeInstanceOf(
      InsufficientFundsError,
    );
    expect(userUpdate).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("allows a negative delta that lands exactly on zero", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 50 });

    await adminAdjust("user-1", -50, "zero out");

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { muenzen: { increment: -50 } },
    });
  });

  it("rejects delta === 0 without touching the database", async () => {
    await expect(adminAdjust("user-1", 0, "noop")).rejects.toThrow(
      /non-zero integer/,
    );
    expect($transaction).not.toHaveBeenCalled();
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("rejects non-integer deltas", async () => {
    await expect(adminAdjust("user-1", 1.5)).rejects.toThrow(
      /non-zero integer/,
    );
    await expect(adminAdjust("user-1", Number.NaN)).rejects.toThrow(
      /non-zero integer/,
    );
    await expect(adminAdjust("user-1", Number.POSITIVE_INFINITY)).rejects.toThrow(
      /non-zero integer/,
    );
    expect($transaction).not.toHaveBeenCalled();
  });

  it("throws when the user doesn't exist", async () => {
    userFindUnique.mockResolvedValueOnce(null);

    await expect(adminAdjust("ghost", 10)).rejects.toThrow(/User not found/);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("stores refId as null when note is undefined", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 0 });

    await adminAdjust("user-1", 10);

    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: 10,
        reason: "ADMIN_ADJUSTMENT",
        refId: null,
      },
    });
  });

  it("stores refId as null when note is whitespace-only", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 0 });

    await adminAdjust("user-1", 10, "   ");

    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: 10,
        reason: "ADMIN_ADJUSTMENT",
        refId: null,
      },
    });
  });

  it("trims whitespace around the note before persisting", async () => {
    userFindUnique.mockResolvedValueOnce({ muenzen: 0 });

    await adminAdjust("user-1", 10, "  manual fix  ");

    expect(txCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: 10,
        reason: "ADMIN_ADJUSTMENT",
        refId: "manual fix",
      },
    });
  });
});
