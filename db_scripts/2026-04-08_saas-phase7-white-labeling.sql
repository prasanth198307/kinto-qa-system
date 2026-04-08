-- ============================================================
-- PHASE 7: WHITE-LABELING & PER-TENANT NOTIFICATIONS
-- Adds branding columns to the tenants table (logo, colors)
-- and creates the notification_config table so each tenant
-- can configure their own WhatsApp / email sender settings.
-- ============================================================

-- ── Branding columns on tenants ──────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url      VARCHAR;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR DEFAULT '#1a56db';

-- ── Per-tenant notification / messaging configuration ─────────
-- Each tenant can have their own WhatsApp Business API credentials,
-- SendGrid key, or SMTP settings — fully isolated per tenant.
CREATE TABLE IF NOT EXISTS notification_config (
    id                   INTEGER PRIMARY KEY,   -- always 1 per tenant (singleton row)
    tenant_id            INTEGER DEFAULT 1 REFERENCES tenants(id),
    -- Channels
    whatsapp_enabled     INTEGER,               -- 0 = disabled, 1 = enabled
    email_enabled        INTEGER,               -- 0 = disabled, 1 = enabled
    test_mode            INTEGER,               -- 1 = send to test numbers only
    -- Email provider selection
    email_provider       VARCHAR DEFAULT 'SendGrid',  -- 'SendGrid' | 'SMTP'
    -- SendGrid
    sendgrid_sender_email VARCHAR,
    sender_email         VARCHAR,
    sender_name          VARCHAR,
    -- SMTP fallback
    smtp_host            VARCHAR,
    smtp_port            INTEGER DEFAULT 587,
    smtp_user            VARCHAR,
    smtp_password        TEXT,
    smtp_secure          INTEGER DEFAULT 0,     -- 0 = STARTTLS, 1 = TLS
    smtp_from_name       VARCHAR,
    -- Meta WhatsApp Business Cloud API
    meta_phone_number_id VARCHAR,
    meta_access_token    TEXT,
    meta_verify_token    VARCHAR,
    -- Legacy Twilio (deprecated — use Meta API instead)
    twilio_phone_number  VARCHAR,
    -- Audit
    record_status        INTEGER DEFAULT 1,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Seed a default notification config row for tenant 1 ──────
INSERT INTO notification_config (id, tenant_id, whatsapp_enabled, email_enabled, test_mode)
VALUES (1, 1, 0, 0, 1)
ON CONFLICT (id) DO NOTHING;

-- NOTE: Per-tenant WhatsApp credentials (meta_phone_number_id,
-- meta_access_token, meta_verify_token) are stored here so
-- multiple companies on the same Kinto instance can each have
-- their own WhatsApp Business number and sender identity.
