-- ============================================================
--  API Hub — scoped keys + call logging
--  Date: 2026-04-29
--  Safe to re-run (uses IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

-- 1. Add scopes and description columns to external_api_keys
--    scopes: JSON array of API IDs this key is allowed to call (NULL = full access)
--    description: optional human-readable note about the key's purpose

ALTER TABLE external_api_keys
  ADD COLUMN IF NOT EXISTS scopes      text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

-- 2. Create api_call_logs table
--    Logs every call to an external API endpoint.
--    key_id:     which API key was used (NULL if called via session/Try It)
--    api_id:     catalogue ID e.g. 'customer_outstanding', 'allocate_cash_sales'
--    status_code: HTTP response code sent to caller
--    duration_ms: wall-clock time in milliseconds
--    is_try_it:  1 if the call came from the in-browser "Try It" panel, 0 otherwise

CREATE TABLE IF NOT EXISTS api_call_logs (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER      NOT NULL,
  key_id      VARCHAR(64),
  api_id      VARCHAR(64)  NOT NULL,
  method      VARCHAR(10)  NOT NULL,
  status_code INTEGER      NOT NULL,
  duration_ms INTEGER,
  is_try_it   INTEGER      DEFAULT 0,
  called_at   TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_tenant
  ON api_call_logs(tenant_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_key
  ON api_call_logs(key_id, called_at DESC);
