-- ============================================================
--  API Hub — external_api_definitions table
--  Date: 2026-04-29
--  Allows tenants to register custom API entries in the catalog
--  Safe to re-run (CREATE TABLE IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS external_api_definitions (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER       NOT NULL,
  api_id      VARCHAR(80)   NOT NULL,
  method      VARCHAR(10)   NOT NULL DEFAULT 'GET',
  path        VARCHAR(255)  NOT NULL,
  label       VARCHAR(120)  NOT NULL,
  description TEXT,
  category    VARCHAR(80)   DEFAULT 'Custom',
  params      JSONB         DEFAULT '[]',
  is_active   INTEGER       DEFAULT 1,
  created_by  VARCHAR(64),
  created_at  TIMESTAMP     DEFAULT NOW(),
  module      VARCHAR(80)   DEFAULT NULL,
  UNIQUE(tenant_id, api_id)
);

-- Add module column if this table was created before this column was introduced
-- (safe to run on both fresh and existing installs)
ALTER TABLE external_api_definitions
  ADD COLUMN IF NOT EXISTS module VARCHAR(80) DEFAULT NULL;
