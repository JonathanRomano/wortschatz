-- AlterEnum: add new MuenzenReason values for the Sprint 02 Münzen-history feature.
--
-- Postgres requires `ALTER TYPE ... ADD VALUE` to run outside a transaction in
-- some versions, so we issue one statement per value with IF NOT EXISTS to keep
-- this idempotent and safe to re-run on partially-applied environments.
ALTER TYPE "MuenzenReason" ADD VALUE IF NOT EXISTS 'PERFECT_SCORE_BONUS';
ALTER TYPE "MuenzenReason" ADD VALUE IF NOT EXISTS 'ADMIN_ADJUSTMENT';
