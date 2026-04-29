-- ============================================================
--  PATCH: Add missing `module` column to external_api_definitions
--  Date: 2026-04-29
--  Run this on ANY server that already has the
--  external_api_definitions table but is missing the module column.
--  Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- ============================================================

ALTER TABLE external_api_definitions
  ADD COLUMN IF NOT EXISTS module VARCHAR(80) DEFAULT NULL;
