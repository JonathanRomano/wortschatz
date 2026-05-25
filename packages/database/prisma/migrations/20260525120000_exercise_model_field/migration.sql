-- Add `model` to Exercise to track which AI model generated each row
-- (e.g. "claude-sonnet-4-6"). Nullable on purpose: existing rows
-- predate this column, and human-authored exercises legitimately have
-- no model. Backfill is intentionally skipped — NULL accurately
-- represents "unknown / not recorded".

ALTER TABLE "Exercise"
  ADD COLUMN "model" TEXT;
