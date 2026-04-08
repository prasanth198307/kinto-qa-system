-- ============================================================
-- SaaS Phase 2: Session persistence store
-- Date: 2026-04-08
-- Safe to re-run (uses IF NOT EXISTS)
-- Purpose: Stores Express sessions in PostgreSQL so logins
--          survive server restarts. Used by connect-pg-simple.
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSONB   NOT NULL,
  expire TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_sessions_expire ON sessions (expire);

SELECT 'sessions table ready' AS result;
