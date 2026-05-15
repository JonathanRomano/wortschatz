import { vi, describe, it, expect, beforeEach } from "vitest";

// --- Mocks --------------------------------------------------------------
//
// `vi.mock` is hoisted above imports; the factories therefore can't close
// over module-level constants. Declare the spies inside `vi.hoisted` and
// reference them through that returned handle.

const mocks = vi.hoisted(() => {
  class InsufficientFundsErrorMock extends Error {
    constructor() {
      super("Insufficient Münzen.");
      this.name = "InsufficientFundsError";
    }
  }
  return {
    authMock: vi.fn(),
    adminAdjustMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    InsufficientFundsErrorMock,
  };
});

const { authMock, adminAdjustMock, revalidatePathMock } = mocks;
const InsufficientFundsErrorMock = mocks.InsufficientFundsErrorMock;

vi.mock("@/auth", () => ({ auth: mocks.authMock }));

vi.mock("@/lib/muenzen", () => ({
  adminAdjust: mocks.adminAdjustMock,
  InsufficientFundsError: mocks.InsufficientFundsErrorMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePathMock }));

// prisma is imported by actions.ts but not exercised by `adminAdjustUser`.
// Provide a benign stub so module load doesn't try to spin up a real client.
vi.mock("@/lib/db", () => ({
  prisma: {
    exercise: { update: vi.fn() },
  },
}));

import { adminAdjustUser } from "@/app/[locale]/admin/actions";

beforeEach(() => {
  authMock.mockReset();
  adminAdjustMock.mockReset();
  revalidatePathMock.mockReset();
  adminAdjustMock.mockResolvedValue(undefined);
});

describe("adminAdjustUser", () => {
  it("rejects non-authenticated callers with 'forbidden'", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await adminAdjustUser("user-1", 10);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(adminAdjustMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin users (TEACHER) with 'forbidden'", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "TEACHER", id: "u" } });

    const result = await adminAdjustUser("user-1", 10);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(adminAdjustMock).not.toHaveBeenCalled();
  });

  it("rejects ordinary users with 'forbidden'", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "STUDENT", id: "u" } });

    const result = await adminAdjustUser("user-1", 10);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(adminAdjustMock).not.toHaveBeenCalled();
  });

  it("credits a valid delta and revalidates the admin path", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN", id: "admin-1" } });

    const result = await adminAdjustUser("user-1", 25, "manual top-up");

    expect(result).toEqual({ ok: true });
    expect(adminAdjustMock).toHaveBeenCalledWith("user-1", 25, "manual top-up");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
  });

  it("rejects delta === 0 as 'invalid_amount'", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });

    const result = await adminAdjustUser("user-1", 0);

    expect(result).toEqual({ ok: false, error: "invalid_amount" });
    expect(adminAdjustMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects non-integer deltas as 'invalid_amount'", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });

    expect(await adminAdjustUser("user-1", 1.5)).toEqual({
      ok: false,
      error: "invalid_amount",
    });
    expect(await adminAdjustUser("user-1", Number.NaN)).toEqual({
      ok: false,
      error: "invalid_amount",
    });
    expect(await adminAdjustUser("user-1", Number.POSITIVE_INFINITY)).toEqual({
      ok: false,
      error: "invalid_amount",
    });
    expect(adminAdjustMock).not.toHaveBeenCalled();
  });

  it("rejects deltas with |delta| > 100_000 as 'invalid_amount'", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });

    expect(await adminAdjustUser("user-1", 100_001)).toEqual({
      ok: false,
      error: "invalid_amount",
    });
    expect(await adminAdjustUser("user-1", -100_001)).toEqual({
      ok: false,
      error: "invalid_amount",
    });
    expect(adminAdjustMock).not.toHaveBeenCalled();
  });

  it("accepts deltas at the |delta| === 100_000 boundary", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });

    expect(await adminAdjustUser("user-1", 100_000)).toEqual({ ok: true });
    expect(await adminAdjustUser("user-1", -100_000)).toEqual({ ok: true });
    expect(adminAdjustMock).toHaveBeenCalledTimes(2);
  });

  it("rejects notes longer than 280 characters as 'invalid_note'", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });

    const longNote = "x".repeat(281);
    const result = await adminAdjustUser("user-1", 5, longNote);

    expect(result).toEqual({ ok: false, error: "invalid_note" });
    expect(adminAdjustMock).not.toHaveBeenCalled();
  });

  it("accepts notes at the 280-character boundary", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });

    const note = "x".repeat(280);
    const result = await adminAdjustUser("user-1", 5, note);

    expect(result).toEqual({ ok: true });
    expect(adminAdjustMock).toHaveBeenCalledWith("user-1", 5, note);
  });

  it("translates InsufficientFundsError to 'insufficient_funds' and does not revalidate", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });
    adminAdjustMock.mockRejectedValueOnce(new InsufficientFundsErrorMock());

    const result = await adminAdjustUser("user-1", -50);

    expect(result).toEqual({ ok: false, error: "insufficient_funds" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("re-throws unknown errors instead of swallowing them", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });
    adminAdjustMock.mockRejectedValueOnce(new Error("DB exploded"));

    await expect(adminAdjustUser("user-1", 10)).rejects.toThrow(
      /DB exploded/,
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("performs role check before validating delta (forbidden wins over invalid_amount)", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "TEACHER" } });

    const result = await adminAdjustUser("user-1", 0);

    expect(result).toEqual({ ok: false, error: "forbidden" });
  });
});
