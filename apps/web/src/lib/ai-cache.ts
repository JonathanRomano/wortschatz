/**
 * Postgres-backed cache for Claude responses.
 *
 * Keyed by SHA-256 of `endpoint:model:canonicalPromptString` (computed in
 * `src/lib/ai.ts`). The cache is opportunistic: a miss never blocks the
 * caller and a stale row is best-effort deleted on read so the table
 * doesn't grow without bound.
 */

import { prisma } from "@wortschatz/database";
import type { AiEndpoint } from "@wortschatz/config";

export type CachedResponse = {
  response: unknown;
  inputTokens: number;
  outputTokens: number;
};

/** Read a cache entry by key. Returns null on miss or when expired. */
export async function get(key: string): Promise<CachedResponse | null> {
  const row = await prisma.aiCache.findUnique({ where: { key } });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    // Best-effort expire-on-read. Swallow errors: a doomed delete must not
    // bubble up and fail the caller.
    prisma.aiCache.delete({ where: { key } }).catch(() => undefined);
    return null;
  }
  return {
    response: row.response,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
  };
}

/** Persist a cache entry. Skipped silently when `ttlMs <= 0`. */
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
  // upsert so concurrent writers for the same key resolve to one row.
  // Swallow errors — a failed cache write must never break the caller's
  // primary path (the response is already in hand).
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
    // Intentionally swallowed.
  }
}
