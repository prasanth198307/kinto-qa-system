-- =============================================================================
-- Phase B Security: MFA/TOTP + Password Policy + Account Lockout + IP Allowlisting
-- Run: psql $DATABASE_URL -f db_scripts/2026-05-07_phase_b_mfa_password_policy.sql
-- =============================================================================

-- ─── 1. Password policy columns on users ─────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at    TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_history        TEXT[]      DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password    BOOLEAN     DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts   INTEGER     DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until            TIMESTAMPTZ;

-- ─── 2. MFA columns on users ─────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret             TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled            BOOLEAN     DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes       TEXT[]      DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enforced            BOOLEAN     DEFAULT false;

-- ─── 3. IP allowlisting on tenants ───────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS allowed_ip_ranges     TEXT[]      DEFAULT '{}';

-- ─── 4. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

SELECT 'Phase B schema: COMPLETE' AS status;
