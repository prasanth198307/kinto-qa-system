-- ============================================================
-- PHASE 6: SUBSCRIPTION LIFECYCLE
-- Creates the per-tenant subscriptions table and adds
-- lifecycle columns to the tenants table (plan, status,
-- trial_ends_at, max_users, billing_email, contact info).
-- Run AFTER phase5 (subscription_plans must exist).
-- ============================================================

-- ── Lifecycle columns on tenants ─────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan           VARCHAR NOT NULL DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status         VARCHAR NOT NULL DEFAULT 'trial';
-- Possible statuses: trial | active | expired | suspended | cancelled
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at  TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users      INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email  VARCHAR;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_name   VARCHAR;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone  VARCHAR;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gst_number     VARCHAR;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address        TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP DEFAULT NOW();
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP DEFAULT NOW();

-- ── Per-tenant subscription records ──────────────────────────
-- Tracks which plan a tenant is on, billing cycle, and period dates.
CREATE TABLE IF NOT EXISTS subscriptions (
    id                   SERIAL PRIMARY KEY,
    tenant_id            INTEGER NOT NULL REFERENCES tenants(id),
    plan_id              INTEGER NOT NULL REFERENCES subscription_plans(id),
    plan_slug            VARCHAR NOT NULL,
    billing_cycle        VARCHAR NOT NULL DEFAULT 'monthly',  -- monthly | yearly
    status               VARCHAR NOT NULL DEFAULT 'active',   -- active | cancelled | expired
    started_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    current_period_start TIMESTAMP,
    current_period_end   TIMESTAMP,
    trial_ends_at        TIMESTAMP,
    cancelled_at         TIMESTAMP,
    cancel_reason        TEXT,
    notes                TEXT,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);

-- Only one active subscription per tenant at a time
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_tenant_active_unique
    ON subscriptions (tenant_id)
    WHERE status = 'active';

-- ── Seed a trial subscription for the demo tenant (id=1) ─────
INSERT INTO subscriptions (tenant_id, plan_id, plan_slug, billing_cycle, status, started_at, trial_ends_at)
SELECT
    1,
    sp.id,
    'trial',
    'monthly',
    'active',
    NOW(),
    NOW() + INTERVAL '14 days'
FROM subscription_plans sp
WHERE sp.slug = 'trial'
  AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE tenant_id = 1)
LIMIT 1;
