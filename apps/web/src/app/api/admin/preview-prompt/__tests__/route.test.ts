/**
 * POST /api/admin/preview-prompt — auth, validation, and the prompt-building
 * happy paths. The prompt builder (@scripts/*) runs for real; only @/auth and
 * prisma are mocked. exercise.findMany returns [] so no recent-examples block
 * is injected, keeping the assertions about the locked JSON shape + rules
 * stable.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  exerciseFindMany: vi.fn(),
  savedPromptFindUnique: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@wortschatz/database", () => ({
  prisma: {
    exercise: { findMany: mocks.exerciseFindMany },
    savedPrompt: { findUnique: mocks.savedPromptFindUnique },
  },
}));

import { POST } from "@/app/api/admin/preview-prompt/route";

const ADMIN = { user: { id: "admin-1", role: "ADMIN" } };

function req(body: unknown) {
  return new Request("http://test/api/admin/preview-prompt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue(ADMIN);
  mocks.exerciseFindMany.mockReset().mockResolvedValue([]);
  mocks.savedPromptFindUnique.mockReset();
});

const VALID = { type: "FILL_IN_THE_BLANK", level: "A2", topic: "Reisen" };

describe("auth", () => {
  it("401 when not logged in", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await POST(req(VALID));
    expect(res.status).toBe(401);
    expect(mocks.exerciseFindMany).not.toHaveBeenCalled();
  });

  it("403 when not an admin", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "u", role: "USER" } });
    const res = await POST(req(VALID));
    expect(res.status).toBe(403);
    expect(mocks.exerciseFindMany).not.toHaveBeenCalled();
  });
});

describe("validation", () => {
  it("400 on an invalid body (missing type)", async () => {
    const res = await POST(req({ level: "A2", topic: "Reisen" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("validation_error");
  });
});

describe("happy path", () => {
  it("200, builds the real system + user prompt", async () => {
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.system).toBe("string");
    expect(body.system.length).toBeGreaterThan(0);
    expect(typeof body.user).toBe("string");
    expect(body.user).toContain(
      "Output a single JSON object with this exact shape:",
    );
    expect(body.user).toContain("Rules:");
    expect(typeof body.estimatedTokens).toBe("number");
  });

  it("keeps the locked JSON shape header even with custom userInstructions", async () => {
    const res = await POST(
      req({ ...VALID, customPrompt: { userInstructions: "XYZ" } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // The editable instructions portion is replaced by the override...
    expect(body.user.startsWith("XYZ")).toBe(true);
    // ...but the locked JSON shape + rules are still injected.
    expect(body.user).toContain(
      "Output a single JSON object with this exact shape:",
    );
    expect(body.user).toContain("Rules:");
  });
});
