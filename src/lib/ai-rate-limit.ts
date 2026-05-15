/**
 * Per-user, per-endpoint rolling 24h rate limiter for Claude calls.
 *
 * Backed by the `AiRateLimit` row keyed by `(userId, endpoint)`. We don't
 * use a sliding window — the window resets in one shot once the existing
 * row is older than 24h, which is simpler and good enough for "20 reviews
 * per day" style limits without a queue.
 */

import { prisma } from "@/lib/db";
import { AI_RATE_LIMITS, type AiEndpoint } from "@/config/limits";

/**
 * Thrown by `checkAndIncrement` when the caller has exhausted their daily
 * quota. `src/lib/ai.ts` re-exports this so server actions can branch on
 * `err instanceof AiRateLimitedError` without importing this module.
 */
export class AiRateLimitedError extends Error {
  readonly endpoint: AiEndpoint;
  readonly count: number;
  readonly limit: number;

  constructor(endpoint: AiEndpoint, count: number, limit: number) {
    super(
      `Rate limit exceeded for ${endpoint}: ${count}/${limit} in the last 24h.`,
    );
    this.name = "AiRateLimitedError";
    this.endpoint = endpoint;
    this.count = count;
    this.limit = limit;
  }
}

/**
 * Atomically check the user's window and bump the counter. Throws
 * `AiRateLimitedError` when the daily ceiling is reached, otherwise
 * resolves to void.
 *
 * The operation runs inside a transaction so two near-simultaneous calls
 * can't both observe `count = limit - 1` and overshoot.
 */
export async function checkAndIncrement(
  userId: string,
  endpoint: AiEndpoint,
): Promise<void> {
  const limit = AI_RATE_LIMITS[endpoint].perDay;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.aiRateLimit.findUnique({
      where: { userId_endpoint: { userId, endpoint } },
    });
    if (!existing || existing.windowStart < oneDayAgo) {
      // Window expired or first-ever call for this user+endpoint pair.
      // Reset to count=1 atomically via upsert so a race between two
      // window-expired calls can't insert twice.
      await tx.aiRateLimit.upsert({
        where: { userId_endpoint: { userId, endpoint } },
        update: { count: 1, windowStart: new Date() },
        create: { userId, endpoint, count: 1, windowStart: new Date() },
      });
      return;
    }
    if (existing.count >= limit) {
      throw new AiRateLimitedError(endpoint, existing.count, limit);
    }
    await tx.aiRateLimit.update({
      where: { id: existing.id },
      data: { count: { increment: 1 } },
    });
  });
}
