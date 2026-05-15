import { vi, describe, it, expect, beforeEach } from "vitest";

// --- Mocks --------------------------------------------------------------
//
// `vi.mock` is hoisted above all imports, so the factory functions cannot
// close over module-level constants. Stash the spies in `vi.hoisted` and
// reference them through that returned handle (same pattern as the admin
// actions test).

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  userUpdateMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.authMock }));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { update: mocks.userUpdateMock },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePathMock }));

import { saveProfile } from "@/app/[locale]/profile/actions";

const { authMock, userUpdateMock, revalidatePathMock } = mocks;

// Default to an authenticated user; individual tests can override.
const DEFAULT_USER_ID = "user-123";

function makeFormData(
  overrides: Record<string, string | number | null | undefined> = {},
): FormData {
  const fd = new FormData();
  const defaults: Record<string, string | number> = {
    name: "Hans Müller",
    preferredLanguage: "EN",
    bio: "",
    nativeLanguage: "",
    learningLevel: "",
    dailyGoal: 5,
  };
  const merged = { ...defaults, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null) continue;
    fd.append(key, String(value));
  }
  return fd;
}

beforeEach(() => {
  authMock.mockReset();
  userUpdateMock.mockReset();
  revalidatePathMock.mockReset();
  authMock.mockResolvedValue({ user: { id: DEFAULT_USER_ID } });
  userUpdateMock.mockResolvedValue(undefined);
});

describe("saveProfile — auth", () => {
  it("returns 'not_authenticated' when the session is null", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await saveProfile(makeFormData());

    expect(result).toEqual({ ok: false, error: "not_authenticated" });
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 'not_authenticated' when the session has no user id", async () => {
    authMock.mockResolvedValueOnce({ user: { id: undefined } });

    const result = await saveProfile(makeFormData());

    expect(result).toEqual({ ok: false, error: "not_authenticated" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

describe("saveProfile — happy path", () => {
  it("calls prisma.user.update with parsed data and revalidates", async () => {
    const result = await saveProfile(
      makeFormData({
        name: "Hans Müller",
        preferredLanguage: "PT",
        bio: "Aprendendo alemão.",
        nativeLanguage: "pt",
        learningLevel: "B1",
        dailyGoal: 10,
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(userUpdateMock).toHaveBeenCalledTimes(1);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: DEFAULT_USER_ID },
      data: {
        name: "Hans Müller",
        preferredLanguage: "PT",
        bio: "Aprendendo alemão.",
        nativeLanguage: "pt",
        learningLevel: "B1",
        dailyGoal: 10,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  it("trims `name` before validation", async () => {
    await saveProfile(makeFormData({ name: "  Frieda  " }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Frieda" }),
      }),
    );
  });
});

describe("saveProfile — bio", () => {
  it("accepts bio at the 280-character boundary", async () => {
    const bio = "x".repeat(280);

    const result = await saveProfile(makeFormData({ bio }));

    expect(result).toEqual({ ok: true });
    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bio }),
      }),
    );
  });

  it("rejects bio longer than 280 characters", async () => {
    const result = await saveProfile(makeFormData({ bio: "x".repeat(281) }));

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("collapses an empty bio to null", async () => {
    await saveProfile(makeFormData({ bio: "" }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bio: null }),
      }),
    );
  });

  it("collapses a whitespace-only bio to null (trim → empty → null)", async () => {
    await saveProfile(makeFormData({ bio: "    " }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bio: null }),
      }),
    );
  });
});

describe("saveProfile — dailyGoal clamping", () => {
  it("clamps dailyGoal: 0 to 1", async () => {
    await saveProfile(makeFormData({ dailyGoal: 0 }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dailyGoal: 1 }),
      }),
    );
  });

  it("clamps dailyGoal: -5 to 1", async () => {
    await saveProfile(makeFormData({ dailyGoal: -5 }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dailyGoal: 1 }),
      }),
    );
  });

  it("clamps dailyGoal: 100 to 30", async () => {
    await saveProfile(makeFormData({ dailyGoal: 100 }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dailyGoal: 30 }),
      }),
    );
  });

  it("preserves an in-range dailyGoal: 15", async () => {
    await saveProfile(makeFormData({ dailyGoal: 15 }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dailyGoal: 15 }),
      }),
    );
  });

  it("rejects a non-integer dailyGoal", async () => {
    const result = await saveProfile(makeFormData({ dailyGoal: 5.5 }));

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

describe("saveProfile — nativeLanguage", () => {
  it("accepts each language in the allow-list", async () => {
    for (const lang of ["pt", "en", "tr", "uk", "de"] as const) {
      userUpdateMock.mockClear();
      const result = await saveProfile(
        makeFormData({ nativeLanguage: lang }),
      );
      expect(result).toEqual({ ok: true });
      expect(userUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nativeLanguage: lang }),
        }),
      );
    }
  });

  it("rejects 'fr' as not in the allow-list", async () => {
    const result = await saveProfile(makeFormData({ nativeLanguage: "fr" }));

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("collapses empty nativeLanguage to null", async () => {
    await saveProfile(makeFormData({ nativeLanguage: "" }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nativeLanguage: null }),
      }),
    );
  });
});

describe("saveProfile — learningLevel", () => {
  it("accepts each CEFR level", async () => {
    for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"] as const) {
      userUpdateMock.mockClear();
      const result = await saveProfile(
        makeFormData({ learningLevel: level }),
      );
      expect(result).toEqual({ ok: true });
      expect(userUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ learningLevel: level }),
        }),
      );
    }
  });

  it("rejects an invalid CEFR level ('D1')", async () => {
    const result = await saveProfile(makeFormData({ learningLevel: "D1" }));

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects a lowercase CEFR level ('b1') — enum is case-sensitive", async () => {
    const result = await saveProfile(makeFormData({ learningLevel: "b1" }));

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("collapses empty learningLevel to null", async () => {
    await saveProfile(makeFormData({ learningLevel: "" }));

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ learningLevel: null }),
      }),
    );
  });
});

describe("saveProfile — preferredLanguage", () => {
  it("rejects an invalid preferredLanguage ('FR')", async () => {
    const result = await saveProfile(
      makeFormData({ preferredLanguage: "FR" }),
    );

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects lowercase preferredLanguage ('en')", async () => {
    const result = await saveProfile(
      makeFormData({ preferredLanguage: "en" }),
    );

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

describe("saveProfile — name", () => {
  it("rejects an empty name", async () => {
    const result = await saveProfile(makeFormData({ name: "" }));

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 120 characters", async () => {
    const result = await saveProfile(
      makeFormData({ name: "x".repeat(121) }),
    );

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});
