import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  userUpdateMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  cookieSetMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.authMock }));

vi.mock("@wortschatz/database", () => ({
  prisma: {
    user: { update: mocks.userUpdateMock },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePathMock }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.cookieSetMock }),
}));

import { completeSetup, skipSetup } from "@/app/[locale]/setup/actions";
import { SETUP_SEEN_COOKIE } from "@/lib/track/flags";

const { authMock, userUpdateMock, revalidatePathMock, cookieSetMock } = mocks;

const USER_ID = "user-42";

function makeFormData(
  overrides: Record<string, string | number> = {},
): FormData {
  const fd = new FormData();
  const merged: Record<string, string | number> = {
    profession: "pflege",
    learningLevel: "B1",
    targetLevel: "B2",
    dailyGoal: 5,
    ...overrides,
  };
  for (const [key, value] of Object.entries(merged)) {
    fd.append(key, String(value));
  }
  return fd;
}

beforeEach(() => {
  authMock.mockReset();
  userUpdateMock.mockReset();
  revalidatePathMock.mockReset();
  cookieSetMock.mockReset();
  authMock.mockResolvedValue({ user: { id: USER_ID } });
  userUpdateMock.mockResolvedValue(undefined);
});

describe("completeSetup", () => {
  it("requires authentication", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await completeSetup(makeFormData());

    expect(result).toEqual({ ok: false, error: "not_authenticated" });
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("saves profession, levels, and goal, then stamps the seen-cookie", async () => {
    const result = await completeSetup(makeFormData());

    expect(result).toEqual({ ok: true });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: {
        profession: "pflege",
        learningLevel: "B1",
        targetLevel: "B2",
        dailyGoal: 5,
      },
    });
    expect(cookieSetMock).toHaveBeenCalledWith(
      SETUP_SEEN_COOKIE,
      "1",
      expect.objectContaining({ path: "/" }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  it("requires a valid profession (unlike the profile action)", async () => {
    const result = await completeSetup(makeFormData({ profession: "" }));

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown profession slug", async () => {
    const result = await completeSetup(
      makeFormData({ profession: "astronaut" }),
    );

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it('treats "not sure" levels as null and clamps the goal', async () => {
    await completeSetup(
      makeFormData({ learningLevel: "", targetLevel: "", dailyGoal: 100 }),
    );

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          learningLevel: null,
          targetLevel: null,
          dailyGoal: 30,
        }),
      }),
    );
  });
});

describe("skipSetup", () => {
  it("requires authentication", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await skipSetup();

    expect(result).toEqual({ ok: false, error: "not_authenticated" });
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("stamps only the seen-cookie — the profile stays untouched", async () => {
    const result = await skipSetup();

    expect(result).toEqual({ ok: true });
    expect(cookieSetMock).toHaveBeenCalledWith(
      SETUP_SEEN_COOKIE,
      "1",
      expect.objectContaining({ path: "/" }),
    );
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});
