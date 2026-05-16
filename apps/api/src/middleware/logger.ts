import type { NextFunction, Request, Response } from "express";

/** Minimal stdout request logger. One line per request, completion-tagged. */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const uid = req.userId ?? "-";
    console.log(
      `[api] ${req.method} ${req.path} ${res.statusCode} ${ms}ms uid=${uid}`,
    );
  });
  next();
}
