-- Apply before deploying the web app and import worker. Safe to re-run.
BEGIN;
CREATE TABLE IF NOT EXISTS billing_account (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  customer_id text UNIQUE,
  status text NOT NULL DEFAULT 'free',
  valid_until timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_used boolean NOT NULL DEFAULT false,
  synced_at timestamptz,
  checkout_url text,
  checkout_expires_at timestamptz
);
CREATE TABLE IF NOT EXISTS ai_spend (
  import_id uuid PRIMARY KEY,
  reserved_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE recipe_import ADD COLUMN IF NOT EXISTS usage_bucket text NOT NULL DEFAULT 'free';
COMMIT;
