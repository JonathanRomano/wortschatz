/**
 * Admin route guards + JSON helpers shared by every /api/admin/* handler.
 *
 * The generator surface (generate-exercises, saved-prompts, preview-prompt)
 * is ADMIN-only via `requireAdmin()` — TEACHER is intentionally excluded.
 * The prompt-curation surface (base-prompts) admits TEACHER too via
 * `requireAdminOrTeacher()`; the success arm carries the resolved role so a
 * handler can still gate ADMIN-only actions (e.g. revert) on top. Each
 * handler calls a guard first and bails on the returned response.
 */
import { NextResponse } from "next/server";

import { auth } from "@/auth";

/** The two privileged roles. `session.user.role` is a free-form string. */
export type AdminRole = "ADMIN" | "TEACHER";

export type AdminAuth =
  | { ok: true; userId: string; role: AdminRole }
  | { ok: false; res: NextResponse };

/** Resolve the session and assert membership in `allowed`, or hand back a
 *  401 (no session) / 403 (wrong role) response. */
async function requireRole(allowed: readonly AdminRole[]): Promise<AdminAuth> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, res: jsonError("unauthorized", 401) };
  }
  const role = session.user.role;
  if ((role !== "ADMIN" && role !== "TEACHER") || !allowed.includes(role)) {
    return { ok: false, res: jsonError("forbidden", 403) };
  }
  return { ok: true, userId: session.user.id, role };
}

/** Assert ADMIN, or hand back a 401/403 response. */
export async function requireAdmin(): Promise<AdminAuth> {
  return requireRole(["ADMIN"]);
}

/** Assert ADMIN or TEACHER — the prompt-curation surface. The returned
 *  `role` lets a handler keep finer actions (revert) ADMIN-only. */
export async function requireAdminOrTeacher(): Promise<AdminAuth> {
  return requireRole(["ADMIN", "TEACHER"]);
}

/** Structured error body: `{ ok: false, error, code }`. */
export function jsonError(
  code: string,
  status: number,
  error?: string,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: error ?? code, code },
    { status },
  );
}

/** Success body. Defaults to 200. */
export function jsonOk<T extends object>(body: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...body }, { status });
}
