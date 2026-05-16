-- Sprint 02 Task 3: AI cache, rate-limit, and usage-log tables.
--
-- Wires the real Claude SDK in src/lib/ai.ts to durable infrastructure:
--   * AiCache: SHA-256-keyed response cache (TTLs in src/config/limits.ts).
--   * AiRateLimit: rolling 24h per-user per-endpoint counter.
--   * AiUsage: append-only log of every Claude call (cache hits included)
--     with estimated cost in microcents to avoid float drift.

-- CreateTable
CREATE TABLE "AiCache" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRateLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costMicrocents" INTEGER NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiCache_key_key" ON "AiCache"("key");

-- CreateIndex
CREATE INDEX "AiCache_expiresAt_idx" ON "AiCache"("expiresAt");

-- CreateIndex
CREATE INDEX "AiCache_endpoint_idx" ON "AiCache"("endpoint");

-- CreateIndex
CREATE INDEX "AiRateLimit_windowStart_idx" ON "AiRateLimit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "AiRateLimit_userId_endpoint_key" ON "AiRateLimit"("userId", "endpoint");

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_endpoint_createdAt_idx" ON "AiUsage"("endpoint", "createdAt");
