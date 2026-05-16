/**
 * Per-user, per-endpoint rolling 24h rate limiter. Shared with apps/web
 * (same AiRateLimit table) during the Sprint 03 transition.
 *
 * The window resets in one shot once the existing row is older than 24h
 * — simpler than a sliding window and good enough for "20 reviews per
 * day" style limits.
 */
import { prisma } from "@wortschatz/database";
import { AI_RATE_LIMITS, type AiEndpoint } from "@wortschatz/config";

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
 * AiRateLimitedError when the daily ceiling is reached. A transaction
 * guards against two near-simultaneous calls both observing count = limit - 1.
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
