import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AiRateLimitedError } from "../services/rateLimit.js";

/**
 * Last-resort error handler. Translates known error classes into HTTP
 * status codes and a small JSON envelope. Unknown errors are logged and
 * surfaced as 500 with a generic message — never leak stack traces.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "bad_request", issues: err.issues });
    return;
  }

  if (err instanceof AiRateLimitedError) {
    res.status(429).json({
      error: "rate_limited",
      endpoint: err.endpoint,
      count: err.count,
      limit: err.limit,
    });
    return;
  }

  console.error("[api] unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
}
