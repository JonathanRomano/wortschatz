/**
 * Postgres-backed cache for Claude responses. Mirrors the web-side
 * apps/web/src/lib/ai-cache.ts during the Sprint 03 transition — the
 * AiCache table is shared, so both apps speak the same wire format.
 * Once Task 7 deletes the web-side copy this becomes the only writer.
 */
import { prisma } from "@wortschatz/database";
import type { AiEndpoint } from "@wortschatz/config";

export interface CachedResponse {
  response: unknown;
  inputTokens: number;
  outputTokens: number;
}

/** Read a cache entry by key. Returns null on miss or when expired. */
export async function get(key: string): Promise<CachedResponse | null> {
  const row = await prisma.aiCache.findUnique({ where: { key } });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    // Best-effort expire-on-read. A doomed delete must not bubble.
    prisma.aiCache.delete({ where: { key } }).catch(() => undefined);
    return null;
  }
  return {
    response: row.response,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
  };
}

/** Persist a cache entry. Skipped silently when ttlMs <= 0. */
export async function set(args: {
  key: string;
  endpoint: AiEndpoint;
  model: string;
  response: unknown;
  inputTokens: number;
  outputTokens: number;
  ttlMs: number;
}): Promise<void> {
  if (args.ttlMs <= 0) return;
  const expiresAt = new Date(Date.now() + args.ttlMs);
  try {
    await prisma.aiCache.upsert({
      where: { key: args.key },
      create: {
        key: args.key,
        endpoint: args.endpoint,
        model: args.model,
        response: args.response as object,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        expiresAt,
      },
      update: {
        response: args.response as object,
        model: args.model,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        expiresAt,
      },
    });
  } catch {
    // Intentionally swallowed — the response is already in hand.
  }
}
