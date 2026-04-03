-- Trusted admin devices table.
-- Stores hashed device tokens for admin access control.
-- Raw tokens are NEVER stored — only SHA-256 hashes.

CREATE TABLE IF NOT EXISTS trusted_admin_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT
);

-- Index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_tad_token_hash
  ON trusted_admin_devices (device_token_hash)
  WHERE revoked = false;

-- RLS: no client access (only supabaseAdmin / service role)
ALTER TABLE trusted_admin_devices ENABLE ROW LEVEL SECURITY;

-- No RLS policies = no access via anon/authenticated roles.
-- Only service_role (supabaseAdmin) can read/write.
