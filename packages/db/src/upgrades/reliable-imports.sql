-- Additive upgrade for existing installations. Apply before deploying the new worker and web app.
BEGIN;
ALTER TABLE recipe_import ALTER COLUMN source_url DROP NOT NULL;
ALTER TABLE recipe_import ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'captured';
ALTER TABLE recipe_import ADD COLUMN IF NOT EXISTS usage_released boolean NOT NULL DEFAULT false;
ALTER TABLE recipe_import ADD COLUMN IF NOT EXISTS worker_token uuid;
COMMIT;
