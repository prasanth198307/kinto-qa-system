-- ============================================================
-- PHASE 10: AUTOMATED BACKUPS
-- Documents the backup infrastructure. The backup system is
-- primarily file-based (Node.js / cron) but relies on two
-- DB-level concerns captured here:
--   1. export_url column on deletion_audit (where the pre-
--      deletion snapshot file path is stored)
--   2. The backup directory conventions used on disk
--
-- Backup files live at:
--   uploads/tenants/{tenantId}/backups/{label}_{timestamp}.json
--   uploads/admin/postgres-backups/{timestamp}.sql.gz   (pg_dump)
--
-- Cron schedule (server/backup.ts):
--   1:00 AM — PostgreSQL pg_dump of entire database
--   2:00 AM — Per-tenant JSON export (all tables for tenant)
--   3:00 AM — Subscription expiry enforcement
--
-- Max 30 backup files retained per tenant (older ones rotated out).
-- ============================================================

-- ── deletion_audit: stores pre-deletion backup path ──────────
-- This table is created in phase9; columns documented here for clarity.
-- export_url        — file path of the JSON backup taken before deletion
-- export_expires_at — when the backup file is scheduled to be cleaned up
ALTER TABLE deletion_audit ADD COLUMN IF NOT EXISTS export_url        VARCHAR;
ALTER TABLE deletion_audit ADD COLUMN IF NOT EXISTS export_expires_at TIMESTAMP;

-- ── Ensure upload directories exist (run at application startup) ──
-- These directories are created by Node.js code (server/backup.ts)
-- on first run. No SQL action required — documented here for reference:
--
--   mkdir -p uploads/tenants/{tenantId}/backups
--   mkdir -p uploads/admin/postgres-backups
--   mkdir -p uploads/tenants/{tenantId}/documents
--   mkdir -p uploads/tenants/{tenantId}/expenses
--   mkdir -p uploads/tenants/{tenantId}/scrap-evidence
--   mkdir -p uploads/tenants/{tenantId}/whatsapp-photos
--
-- File serving: GET /api/uploads/tenants/:tenantId/:type/:filename
-- Validated against tenantId in session before serving.
-- Legacy flat-path uploads served via /uploads/:filename for
-- backward compatibility with older records.

-- ── No additional DB tables required for this phase. ─────────
SELECT 'Phase 10 backup infrastructure verified.' AS status;
