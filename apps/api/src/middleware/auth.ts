import type { NextFunction, Request, Response } from "express";

import { env } from "../env.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

/**
 * Shared-secret middleware. Trusts callers that supply both:
 *   - X-Internal-Secret: must equal INTERNAL_API_SECRET (constant-time).
 *   - X-User-Id:         the acting user's id. Web resolves this from
 *                        the NextAuth session before the call leaves
 *                        the server. Anonymous calls (admin scripts)
 *                        may omit the header — handlers that need a
 *                        user check req.userId explicitly.
 *
 * Picked over a NextAuth-issued JWT because NextAuth v5 uses JWE-encrypted
 * tokens by default and decrypting them in Express would mean shipping
 * @auth/core to the API. Shared-secret + header pair keeps the boundary
 * simple and machine-only — never expose this auth to a browser.
 */
export function sharedSecretAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const provided = req.header("x-internal-secret") ?? "";
  const expected = env.INTERNAL_API_SECRET;

  if (provided.length !== expected.length) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  // Constant-time compare. Length already matches.
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const userId = req.header("x-user-id");
  if (userId && typeof userId === "string" && userId.length > 0) {
    req.userId = userId;
  }
  next();
}
