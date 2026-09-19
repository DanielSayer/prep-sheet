-- Apply before deploying the stale-edit API and editor.
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
