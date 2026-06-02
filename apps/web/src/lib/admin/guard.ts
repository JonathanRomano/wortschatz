/**
 * Admin route guards + JSON helpers shared by every /api/admin/* handler.
 *
 * The generator surface is ADMIN-only (TEACHER is intentionally excluded —
 * unlike the read-mostly /admin page which also admits teachers). Each
 * handler calls `requireAdmin()` first and bails on the returned response.
 */
import { NextResponse } from "next/server";

import { auth } from "@/auth";

export type AdminAuth =
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse };

/** Resolve the session and assert ADMIN, or hand back a 401/403 response. */
export async function requireAdmin(): Promise<AdminAuth> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, res: jsonError("unauthorized", 401) };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, res: jsonError("forbidden", 403) };
  }
  return { ok: true, userId: session.user.id };
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
