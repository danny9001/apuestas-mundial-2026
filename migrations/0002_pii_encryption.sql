-- PII encryption columns (item 15)
-- telefono_enc and email_enc store AES-256-GCM ciphertext
-- email_hash allows deterministic lookup without exposing plaintext
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telefono_enc TEXT,
  ADD COLUMN IF NOT EXISTS email_enc TEXT,
  ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users (email_hash);

-- push_subscriptions.endpoint_enc replaces plaintext endpoint for PII
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS endpoint_enc TEXT;
