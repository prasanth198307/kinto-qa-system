-- ============================================================
-- SaaS Phase 9: Deletion audit table
-- Date: 2026-04-08
-- Safe to re-run (uses IF NOT EXISTS)
-- Purpose: Every time a super-admin deletes a tenant's data,
--          a record is written here for compliance/audit.
--          A pre-deletion backup file path is stored in export_url.
-- ============================================================

CREATE TABLE IF NOT EXISTS deletion_audit (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER        NOT NULL,
  tenant_name       VARCHAR(255)   NOT NULL,
  tenant_slug       VARCHAR(100)   NOT NULL,
  owner_email       VARCHAR(255),
  deleted_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
  rows_deleted      JSONB          DEFAULT '{}',   -- { tableName: rowCount, ... }
  export_url        VARCHAR,                       -- path to the pre-deletion backup JSON
  export_expires_at TIMESTAMP,                     -- when the backup file will be cleaned up
  deleted_by        VARCHAR(255),                  -- super-admin username who triggered deletion
  reason            TEXT                           -- reason provided at time of deletion
);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_tenant_id  ON deletion_audit (tenant_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_at ON deletion_audit (deleted_at);

SELECT 'deletion_audit table ready' AS result;
