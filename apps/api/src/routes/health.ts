import { Router } from "express";

import { prisma } from "@wortschatz/database";

const router = Router();

/**
 * Liveness + DB connectivity probe. Returns 200 only when both the
 * process is up AND a trivial SELECT 1 against the shared database
 * succeeds — useful as a Kubernetes-style readiness check.
 */
router.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

export { router as healthRouter };
