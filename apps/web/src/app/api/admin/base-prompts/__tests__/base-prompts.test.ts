/**
 * Base-prompt curation routes — RBAC + version-lifecycle behavior.
 *
 * Covers the security-critical matrix the sprint requires: USER is locked out
 * everywhere; TEACHER can list/draft/publish but NOT revert (ADMIN-only); the
 * publish/revert transactions deactivate the current ACTIVE and activate the
 * target atomically. `@/auth` is mocked (the real guards run against it);
 * prisma + its $transaction are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  bpFindMany: vi.fn(),
  bpFindUnique: vi.fn(),
  vFindUnique: vi.fn(),
  vAggregate: vi.fn(),
  vCreate: vi.fn(),
  vUpdateMany: vi.fn(),
  vUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: m.auth }));
vi.mock("@wortschatz/database", () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(msg: string, code: string) {
      super(msg);
      this.code = code;
    }
  }
  return {
    prisma: {
      basePrompt: { findMany: m.bpFindMany, findUnique: m.bpFindUnique },
      basePromptVersion: {
        findUnique: m.vFindUnique,
        aggregate: m.vAggregate,
        create: m.vCreate,
        updateMany: m.vUpdateMany,
        update: m.vUpdate,
      },
      $transaction: m.transaction,
    },
    Prisma: { PrismaClientKnownRequestError },
  };
});

import { GET as listGET } from "@/app/api/admin/base-prompts/route";
import { POST as createDraft } from "@/app/api/admin/base-prompts/[id]/versions/route";
import { POST as publish } from "@/app/api/admin/base-prompts/[id]/versions/[versionId]/publish/route";
import { POST as revert } from "@/app/api/admin/base-prompts/[id]/versions/[versionId]/revert/route";

const USER = { user: { id: "u1", role: "USER" } };
const TEACHER = { user: { id: "t1", role: "TEACHER" } };
const ADMIN = { user: { id: "admin-1", role: "ADMIN" } };
const TS = new Date("2026-06-10T10:00:00.000Z");

function version(over: Record<string, unknown> = {}) {
  return {
    id: "v1",
    versionNumber: 1,
    status: "ACTIVE",
    systemPrompt: "S",
    userInstructions: "U {level} {topic}",
    changeNote: null,
    authorId: "admin-1",
    author: { id: "admin-1", email: "admin@x", role: "ADMIN" },
    createdAt: TS,
    publishedAt: TS,
    deactivatedAt: null,
    ...over,
  };
}

function listReq() {
  return new Request("http://test/api/admin/base-prompts");
}
function bodyReq(body: unknown) {
  return new Request("http://test/api/admin/base-prompts/bp1/versions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function emptyReq() {
  return new Request("http://test/x", { method: "POST" });
}
const idParams = { params: Promise.resolve({ id: "bp1" }) };
const verParams = { params: Promise.resolve({ id: "bp1", versionId: "v2" }) };

beforeEach(() => {
  m.auth.mockReset().mockResolvedValue(ADMIN);
  m.bpFindMany.mockReset().mockResolvedValue([
    { id: "bp1", type: "FILL_IN_THE_BLANK", level: "A1", description: null, versions: [version()] },
  ]);
  m.bpFindUnique.mockReset().mockResolvedValue({ id: "bp1" });
  m.vFindUnique.mockReset();
  m.vAggregate.mockReset().mockResolvedValue({ _max: { versionNumber: 1 } });
  m.vCreate.mockReset().mockResolvedValue(version({ id: "v2", versionNumber: 2, status: "DRAFT" }));
  m.vUpdateMany.mockReset().mockResolvedValue({ count: 1 });
  m.vUpdate.mockReset().mockResolvedValue(version({ id: "v2", versionNumber: 2, status: "ACTIVE" }));
  m.transaction.mockReset().mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({ basePromptVersion: { updateMany: m.vUpdateMany, update: m.vUpdate } }),
  );
});

describe("GET /base-prompts (list)", () => {
  it("401 when not logged in", async () => {
    m.auth.mockResolvedValueOnce(null);
    expect((await listGET(listReq())).status).toBe(401);
  });
  it("403 for a USER", async () => {
    m.auth.mockResolvedValueOnce(USER);
    expect((await listGET(listReq())).status).toBe(403);
    expect(m.bpFindMany).not.toHaveBeenCalled();
  });
  it("200 for a TEACHER, with active-version metadata", async () => {
    m.auth.mockResolvedValueOnce(TEACHER);
    const res = await listGET(listReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prompts).toHaveLength(1);
    expect(body.prompts[0].activeVersionNumber).toBe(1);
    expect(body.prompts[0].hasDraftPending).toBe(false);
  });
  it("200 for an ADMIN", async () => {
    expect((await listGET(listReq())).status).toBe(200);
  });
});

describe("POST /versions (create draft)", () => {
  const VALID = { systemPrompt: "new sys", userInstructions: "new instr {level} {topic}" };

  it("403 for a USER", async () => {
    m.auth.mockResolvedValueOnce(USER);
    expect((await createDraft(bodyReq(VALID), idParams)).status).toBe(403);
    expect(m.vCreate).not.toHaveBeenCalled();
  });
  it("400 on an invalid body", async () => {
    const res = await createDraft(bodyReq({ systemPrompt: "" }), idParams);
    expect(res.status).toBe(400);
    expect(m.vCreate).not.toHaveBeenCalled();
  });
  it("404 when the base prompt does not exist", async () => {
    m.bpFindUnique.mockResolvedValueOnce(null);
    expect((await createDraft(bodyReq(VALID), idParams)).status).toBe(404);
  });
  it("201 for a TEACHER: DRAFT at max+1 authored by the session user", async () => {
    m.auth.mockResolvedValueOnce(TEACHER);
    const res = await createDraft(bodyReq(VALID), idParams);
    expect(res.status).toBe(201);
    const data = m.vCreate.mock.calls[0]![0].data;
    expect(data.status).toBe("DRAFT");
    expect(data.versionNumber).toBe(2); // max(1)+1
    expect(data.authorId).toBe("t1");
  });
});

describe("POST /publish", () => {
  it("403 for a USER", async () => {
    m.auth.mockResolvedValueOnce(USER);
    expect((await publish(emptyReq(), verParams)).status).toBe(403);
  });
  it("404 when the version is not under this base prompt", async () => {
    m.vFindUnique.mockResolvedValueOnce({ id: "v2", basePromptId: "OTHER", status: "DRAFT" });
    expect((await publish(emptyReq(), verParams)).status).toBe(404);
  });
  it("409 when the version is not a DRAFT", async () => {
    m.vFindUnique.mockResolvedValueOnce({ id: "v2", basePromptId: "bp1", status: "ACTIVE" });
    expect((await publish(emptyReq(), verParams)).status).toBe(409);
  });
  it("200 for a TEACHER: deactivates the current ACTIVE and activates the draft atomically", async () => {
    m.auth.mockResolvedValueOnce(TEACHER);
    m.vFindUnique.mockResolvedValueOnce({ id: "v2", basePromptId: "bp1", status: "DRAFT" });
    const res = await publish(emptyReq(), verParams);
    expect(res.status).toBe(200);
    expect(m.transaction).toHaveBeenCalledTimes(1);
    expect(m.vUpdateMany.mock.calls[0]![0].where).toEqual({ basePromptId: "bp1", status: "ACTIVE" });
    expect(m.vUpdateMany.mock.calls[0]![0].data.status).toBe("INACTIVE");
    expect(m.vUpdate.mock.calls[0]![0].data.status).toBe("ACTIVE");
    expect(m.vUpdate.mock.calls[0]![0].data.deactivatedAt).toBeNull();
  });
});

describe("POST /revert (ADMIN-only)", () => {
  it("403 for a USER", async () => {
    m.auth.mockResolvedValueOnce(USER);
    expect((await revert(emptyReq(), verParams)).status).toBe(403);
  });
  it("403 for a TEACHER — revert is the admin safety net", async () => {
    m.auth.mockResolvedValueOnce(TEACHER);
    const res = await revert(emptyReq(), verParams);
    expect(res.status).toBe(403);
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it("409 when reverting to an already-ACTIVE version", async () => {
    m.vFindUnique.mockResolvedValueOnce({ id: "v2", basePromptId: "bp1", status: "ACTIVE" });
    expect((await revert(emptyReq(), verParams)).status).toBe(409);
  });
  it("409 when targeting a DRAFT (publish it instead)", async () => {
    m.vFindUnique.mockResolvedValueOnce({ id: "v2", basePromptId: "bp1", status: "DRAFT" });
    expect((await revert(emptyReq(), verParams)).status).toBe(409);
  });
  it("200 for an ADMIN reactivating an INACTIVE version", async () => {
    m.vFindUnique.mockResolvedValueOnce({ id: "v2", basePromptId: "bp1", status: "INACTIVE" });
    const res = await revert(emptyReq(), verParams);
    expect(res.status).toBe(200);
    expect(m.vUpdateMany.mock.calls[0]![0].where).toEqual({ basePromptId: "bp1", status: "ACTIVE" });
    expect(m.vUpdate.mock.calls[0]![0].data.status).toBe("ACTIVE");
  });
});
