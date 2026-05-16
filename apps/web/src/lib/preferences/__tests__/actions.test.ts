import { vi, describe, it, expect, beforeEach } from "vitest";
import type { ExerciseType } from "@wortschatz/database";

// --- Mocks --------------------------------------------------------------
//
// `vi.mock` is hoisted above all imports, so the factory functions cannot
// close over module-level constants. Stash the spies in `vi.hoisted` and
// reference them through that returned handle.

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  userPrefUpsertMock: vi.fn(),
  userPrefDeleteManyMock: vi.fn(),
  userPrefFindUniqueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.authMock }));

vi.mock("@wortschatz/database", () => ({
  prisma: {
    userPreference: {
      upsert: mocks.userPrefUpsertMock,
      deleteMany: mocks.userPrefDeleteManyMock,
      findUnique: mocks.userPrefFindUniqueMock,
    },
  },
}));

import { setSkipIntro, getSkipIntro } from "@/lib/preferences/actions";

const {
  authMock,
  userPrefUpsertMock,
  userPrefDeleteManyMock,
  userPrefFindUniqueMock,
} = mocks;

const USER_ID = "user-abc";
const TYPE: ExerciseType = "FILL_IN_THE_BLANK";

beforeEach(() => {
  authMock.mockReset();
  userPrefUpsertMock.mockReset();
  userPrefDeleteManyMock.mockReset();
  userPrefFindUniqueMock.mockReset();

  authMock.mockResolvedValue({ user: { id: USER_ID } });
  userPrefUpsertMock.mockResolvedValue(undefined);
  userPrefDeleteManyMock.mockResolvedValue({ count: 0 });
  userPrefFindUniqueMock.mockResolvedValue(null);
});

describe("setSkipIntro — unauthenticated", () => {
  it("returns { ok: false } when session is null", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await setSkipIntro(TYPE, true);

    expect(result).toEqual({ ok: false });
    expect(userPrefUpsertMock).not.toHaveBeenCalled();
    expect(userPrefDeleteManyMock).not.toHaveBeenCalled();
  });

  it("returns { ok: false } when session has no user", async () => {
    authMock.mockResolvedValueOnce({});

    const result = await setSkipIntro(TYPE, true);

    expect(result).toEqual({ ok: false });
    expect(userPrefUpsertMock).not.toHaveBeenCalled();
    expect(userPrefDeleteManyMock).not.toHaveBeenCalled();
  });

  it("returns { ok: false } when user has no id", async () => {
    authMock.mockResolvedValueOnce({ user: { id: undefined } });

    const result = await setSkipIntro(TYPE, false);

    expect(result).toEqual({ ok: false });
    expect(userPrefUpsertMock).not.toHaveBeenCalled();
    expect(userPrefDeleteManyMock).not.toHaveBeenCalled();
  });
});

describe("setSkipIntro — authenticated, skip=true", () => {
  it("upserts a row with skipIntro: true and returns { ok: true }", async () => {
    const result = await setSkipIntro(TYPE, true);

    expect(result).toEqual({ ok: true });
    expect(userPrefUpsertMock).toHaveBeenCalledTimes(1);
    expect(userPrefUpsertMock).toHaveBeenCalledWith({
      where: { userId_key: { userId: USER_ID, key: TYPE } },
      create: { userId: USER_ID, key: TYPE, skipIntro: true },
      update: { skipIntro: true },
    });
    expect(userPrefDeleteManyMock).not.toHaveBeenCalled();
  });

  it("uses the exact ExerciseType passed as `key`", async () => {
    await setSkipIntro("MULTIPLE_CHOICE", true);

    expect(userPrefUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_key: { userId: USER_ID, key: "MULTIPLE_CHOICE" } },
        create: expect.objectContaining({ key: "MULTIPLE_CHOICE" }),
      }),
    );
  });
});

describe("setSkipIntro — authenticated, skip=false", () => {
  it("deletes the row via deleteMany and returns { ok: true }", async () => {
    const result = await setSkipIntro(TYPE, false);

    expect(result).toEqual({ ok: true });
    expect(userPrefDeleteManyMock).toHaveBeenCalledTimes(1);
    expect(userPrefDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: USER_ID, key: TYPE },
    });
    expect(userPrefUpsertMock).not.toHaveBeenCalled();
  });

  it("scopes the delete to the caller's userId (no cross-user wipe)", async () => {
    await setSkipIntro("TRANSLATION", false);

    expect(userPrefDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: USER_ID, key: "TRANSLATION" },
    });
  });
});

describe("getSkipIntro", () => {
  it("returns true when prisma returns a row", async () => {
    userPrefFindUniqueMock.mockResolvedValueOnce({ id: "pref-1" });

    const result = await getSkipIntro(USER_ID, TYPE);

    expect(result).toBe(true);
    expect(userPrefFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(userPrefFindUniqueMock).toHaveBeenCalledWith({
      where: { userId_key: { userId: USER_ID, key: TYPE } },
      select: { id: true },
    });
  });

  it("returns false when prisma returns null", async () => {
    userPrefFindUniqueMock.mockResolvedValueOnce(null);

    const result = await getSkipIntro(USER_ID, TYPE);

    expect(result).toBe(false);
  });

  it("queries with the exact (userId, type) tuple supplied", async () => {
    userPrefFindUniqueMock.mockResolvedValueOnce({ id: "pref-2" });

    await getSkipIntro("other-user", "WORD_ORDER");

    expect(userPrefFindUniqueMock).toHaveBeenCalledWith({
      where: { userId_key: { userId: "other-user", key: "WORD_ORDER" } },
      select: { id: true },
    });
  });

  it("does not consult `auth()` (caller passes a known userId)", async () => {
    userPrefFindUniqueMock.mockResolvedValueOnce(null);

    await getSkipIntro(USER_ID, TYPE);

    expect(authMock).not.toHaveBeenCalled();
  });
});
