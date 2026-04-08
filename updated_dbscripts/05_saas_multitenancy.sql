-- ============================================================
-- KINTO Smart Ops — SaaS Multitenancy & Subscription Tables
-- ============================================================
-- This script adds all tables introduced in the SaaS multi-
-- tenancy refactor (Phases 1–4) and the subscription management
-- system.
--
-- Safe to run on any environment — all statements are idempotent
-- (CREATE TABLE IF NOT EXISTS / INSERT ... ON CONFLICT DO NOTHING).
--
-- Applies to: Mac localhost, OCI production, fresh deployments
-- NOTE: Neon/Replit dev DB already has these tables created
--       via Drizzle ORM and raw SQL during development.
--
-- Run order: after 04_nov26_schema_additions.sql
-- Created: April 2026
-- ============================================================


-- ============================================================
-- SECTION 1: TENANTS TABLE
-- One row per company account (SaaS tenant).
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(100) NOT NULL UNIQUE,       -- URL-safe company identifier
    plan              VARCHAR(50)  DEFAULT 'trial',       -- trial | basic | professional | enterprise
    status            VARCHAR(50)  DEFAULT 'trial',       -- trial | active | suspended | expired
    trial_ends_at     TIMESTAMP,
    max_users         INTEGER      DEFAULT 5,
    logo_url          VARCHAR,
    primary_color     VARCHAR(20)  DEFAULT '#1a56db',
    billing_email     VARCHAR,
    contact_name      VARCHAR(255),
    contact_phone     VARCHAR(20),
    gst_number        VARCHAR(20),
    address           TEXT,
    is_super_admin    BOOLEAN      DEFAULT FALSE,
    created_at        TIMESTAMP    DEFAULT NOW(),
    updated_at        TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug   ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_plan   ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

COMMENT ON TABLE  tenants                IS 'SaaS tenant (company) accounts';
COMMENT ON COLUMN tenants.slug           IS 'URL-safe company identifier used in the two-step login';
COMMENT ON COLUMN tenants.plan           IS 'Active subscription plan: trial | basic | professional | enterprise';
COMMENT ON COLUMN tenants.status         IS 'Account status: trial | active | suspended | expired';
COMMENT ON COLUMN tenants.is_super_admin IS 'When TRUE the tenant record belongs to the platform super-admin';


-- ============================================================
-- SECTION 2: SUBSCRIPTION PLANS TABLE
-- Master list of all available pricing plans.
-- Editable by super-admin at /super-admin/plans.
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    slug           VARCHAR(50)  NOT NULL UNIQUE,         -- trial | basic | professional | enterprise
    tagline        VARCHAR(255),
    description    TEXT,
    price_monthly  INTEGER      DEFAULT 0    NOT NULL,   -- monthly price in paise (₹ × 100)
    price_yearly   INTEGER      DEFAULT 0    NOT NULL,   -- discounted annual price in paise
    max_users      INTEGER      DEFAULT 5    NOT NULL,
    modules        JSONB        DEFAULT '[]'::JSONB,     -- module slugs included in this plan
    features       JSONB        DEFAULT '[]'::JSONB,     -- human-readable feature bullet strings
    is_active      BOOLEAN      DEFAULT TRUE NOT NULL,
    is_featured    BOOLEAN      DEFAULT FALSE NOT NULL,  -- highlight on public pricing page
    display_order  INTEGER      DEFAULT 0    NOT NULL,   -- left-to-right order on pricing page
    trial_days     INTEGER      DEFAULT 0    NOT NULL,
    created_at     TIMESTAMP    DEFAULT NOW(),
    updated_at     TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug   ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

COMMENT ON TABLE  subscription_plans              IS 'Master list of SaaS subscription plans, editable via super-admin UI';
COMMENT ON COLUMN subscription_plans.slug         IS 'Must match tenant.plan values: trial | basic | professional | enterprise';
COMMENT ON COLUMN subscription_plans.price_monthly IS 'Price in paise (multiply rupees by 100). 0 = free.';
COMMENT ON COLUMN subscription_plans.modules      IS 'JSON array of module slugs. Controls nav gating for tenants on this plan.';
COMMENT ON COLUMN subscription_plans.features     IS 'JSON array of display strings shown on public pricing page cards.';


-- ============================================================
-- SECTION 3: SUBSCRIPTIONS TABLE
-- One active subscription record per tenant.
-- Tracks current plan, billing cycle, and period dates.
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id                   SERIAL PRIMARY KEY,
    tenant_id            INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id              INTEGER      NOT NULL REFERENCES subscription_plans(id),
    plan_slug            VARCHAR(50)  NOT NULL,           -- denormalized from plan for fast reads
    billing_cycle        VARCHAR(20)  DEFAULT 'monthly' NOT NULL, -- monthly | yearly | trial | custom
    status               VARCHAR(30)  DEFAULT 'active'  NOT NULL, -- active | cancelled | expired | trial | pending
    started_at           TIMESTAMP    DEFAULT NOW()     NOT NULL,
    current_period_start TIMESTAMP,
    current_period_end   TIMESTAMP,
    trial_ends_at        TIMESTAMP,
    cancelled_at         TIMESTAMP,
    cancel_reason        TEXT,
    notes                TEXT,
    created_at           TIMESTAMP    DEFAULT NOW(),
    updated_at           TIMESTAMP    DEFAULT NOW(),

    CONSTRAINT subscriptions_tenant_unique UNIQUE (tenant_id)   -- one active sub per tenant
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id   ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status    ON subscriptions(status);

COMMENT ON TABLE  subscriptions               IS 'Active subscription for each tenant';
COMMENT ON COLUMN subscriptions.plan_slug     IS 'Denormalized copy of plan slug for fast reads without joins';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'monthly | yearly | trial | custom';
COMMENT ON COLUMN subscriptions.status        IS 'active | cancelled | expired | trial | pending';


-- ============================================================
-- SECTION 4: BILLING EVENTS TABLE
-- Immutable audit log of all subscription lifecycle events
-- and payment records.
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_events (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id INTEGER      REFERENCES subscriptions(id),
    event_type      VARCHAR(50)  NOT NULL,
    -- event_type values:
    --   trial_started | plan_activated | upgraded | downgraded | renewed
    --   cancelled | payment_received | upgrade_requested | trial_expired
    --   plan_reactivated | downgraded
    from_plan       VARCHAR(50),                          -- previous plan slug (for changes)
    to_plan         VARCHAR(50),                          -- new plan slug (for changes)
    billing_cycle   VARCHAR(20),
    amount          INTEGER      DEFAULT 0    NOT NULL,   -- in paise; 0 for non-payment events
    currency        VARCHAR(10)  DEFAULT 'INR',
    notes           TEXT,
    metadata        JSONB        DEFAULT '{}'::JSONB,     -- extra event-specific data
    created_by      VARCHAR(255),                         -- username or 'system'
    created_at      TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_id  ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);

COMMENT ON TABLE  billing_events            IS 'Immutable audit log of all subscription and billing events';
COMMENT ON COLUMN billing_events.amount     IS 'Amount in paise (rupees × 100). 0 for non-payment events.';
COMMENT ON COLUMN billing_events.created_by IS 'Username of admin who made the change, or "system" for automated events.';


-- ============================================================
-- SECTION 4B: DELETION AUDIT TABLE
-- Permanent legal compliance record of every tenant data deletion.
-- NEVER delete rows from this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS deletion_audit (
    id                SERIAL PRIMARY KEY,
    tenant_id         INTEGER      NOT NULL,
    tenant_name       VARCHAR(255) NOT NULL,
    tenant_slug       VARCHAR(100) NOT NULL,
    owner_email       VARCHAR(255),
    deleted_at        TIMESTAMP    DEFAULT NOW() NOT NULL,
    rows_deleted      JSONB        DEFAULT '{}',
    export_url        VARCHAR,
    export_expires_at TIMESTAMP,
    deleted_by        VARCHAR(255),
    reason            TEXT
);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_tenant_id  ON deletion_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_at ON deletion_audit(deleted_at);

COMMENT ON TABLE  deletion_audit            IS 'PERMANENT legal compliance log. Never delete rows.';
COMMENT ON COLUMN deletion_audit.rows_deleted IS 'JSON: { tableName: rowCount } snapshot taken before deletion';
COMMENT ON COLUMN deletion_audit.deleted_by   IS 'Super-admin username who triggered the deletion';

-- ============================================================
-- SECTION 5: TENANT_ID COLUMNS ON BUSINESS TABLES
-- All 94 business tables have a tenant_id column added for
-- row-level data isolation between tenants.
--
-- These were added incrementally during the multitenancy
-- refactor. If any column is missing, run the ALTER statements
-- below. Each is idempotent — safe to re-run.
-- ============================================================

-- Core operational tables
ALTER TABLE roles               ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE users               ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE role_permissions    ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE machines            ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE machine_types       ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE uom                 ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE vendors             ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE vendor_types        ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE vendor_vendor_types ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Products & inventory
ALTER TABLE products            ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE product_bom         ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE product_categories  ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE product_types       ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE raw_materials       ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE raw_material_types  ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE raw_material_transactions ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE finished_goods      ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE spare_parts_catalog ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Production
ALTER TABLE raw_material_issuance       ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE production_entries          ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE production_reconciliations  ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Invoicing & sales
ALTER TABLE invoices             ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE invoice_items        ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE invoice_payments     ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE payment_evidence     ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE sales_orders         ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE sales_order_items    ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE sales_returns        ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE sales_return_items   ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE credit_notes         ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE credit_note_items    ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE debit_notes          ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE debit_note_items     ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE vendor_debit_notes        ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE vendor_debit_note_items   ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE vendor_debit_note_adjustments ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Dispatch
ALTER TABLE gatepasses           ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE gatepass_items       ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Purchase orders
ALTER TABLE purchase_orders      ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Accounting / COA
ALTER TABLE chart_of_accounts    ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE journal_entries      ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE journal_lines        ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE bank_transactions    ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE budgets              ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Expenses & cash register
ALTER TABLE expense_categories   ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE expense_vouchers     ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE expense_items        ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE expense_attachments  ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE monthly_expenses     ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE cash_register_days   ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE cash_register_transactions ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Documents
ALTER TABLE document_categories  ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE documents            ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- WhatsApp / checklists
ALTER TABLE checklist_templates  ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE checklist_assignments ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE checklist_submissions ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE submission_tasks     ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE template_tasks       ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE notification_configs ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE whatsapp_conversation_sessions ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Maintenance
ALTER TABLE maintenance_plans    ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE pm_template_tasks    ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE pm_executions        ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE pm_execution_tasks   ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Scrap / sales officers
ALTER TABLE scrap_inventory      ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE sales_officers       ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Indexes for tenant isolation (add for tables queried frequently)
CREATE INDEX IF NOT EXISTS idx_users_tenant_id    ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant_id  ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_id ON journal_entries(tenant_id);


-- ============================================================
-- SECTION 6: DEFAULT TENANT SEED DATA
-- Tenant #1 = KINTO (the production company).
-- All pre-existing data belongs to tenant_id = 1.
-- ============================================================

INSERT INTO tenants (
    id, name, slug, plan, status, max_users, primary_color, is_super_admin, created_at
) VALUES (
    1, 'KINTO', 'kinto', 'enterprise', 'active', 999, '#1a56db', FALSE, NOW()
) ON CONFLICT (id) DO UPDATE SET
    name          = EXCLUDED.name,
    slug          = EXCLUDED.slug,
    plan          = EXCLUDED.plan,
    status        = EXCLUDED.status,
    max_users     = EXCLUDED.max_users;

-- Reset sequence to avoid ID conflicts if rows already exist
SELECT setval('tenants_id_seq', GREATEST((SELECT MAX(id) FROM tenants), 1));


-- ============================================================
-- SECTION 7: SUBSCRIPTION PLANS SEED DATA
-- Four standard tiers. Pricing in paise (₹ × 100).
-- These are the default plans; super-admin can edit them
-- via /super-admin/plans.
-- ============================================================

INSERT INTO subscription_plans (
    name, slug, tagline, description,
    price_monthly, price_yearly, max_users,
    modules, features,
    is_active, is_featured, display_order, trial_days
) VALUES
(
    'Trial', 'trial',
    'Explore Kinto Smart Ops free for 14 days',
    'Full access to core invoicing and inventory modules. No credit card required.',
    0, 0, 5,
    '["invoicing","purchase_orders","basic_inventory"]'::JSONB,
    '["GST-compliant invoicing","Purchase order management","Raw material & finished goods inventory","Up to 5 users","14-day free trial"]'::JSONB,
    TRUE, FALSE, 1, 14
),
(
    'Basic', 'basic',
    'For small manufacturers getting started',
    'Everything in Trial plus dispatch management and sales orders.',
    299900, 2999900, 10,
    '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders"]'::JSONB,
    '["All Trial features","Gatepass & dispatch tracking","Sales order management","Up to 10 users","Email support"]'::JSONB,
    TRUE, FALSE, 2, 0
),
(
    'Professional', 'professional',
    'For growing manufacturing operations',
    'Full production, accounting, MIS analytics, and more.',
    699900, 6999900, 25,
    '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents"]'::JSONB,
    '["All Basic features","BOM-driven production","Double-entry accounting & P&L","MIS analytics dashboard","Quality & sales returns","Expense & cash register","Document management","Up to 25 users","Priority support"]'::JSONB,
    TRUE, TRUE, 3, 0
),
(
    'Enterprise', 'enterprise',
    'For large-scale industrial operations',
    'Complete platform including WhatsApp checklists and preventive maintenance.',
    1499900, 14999900, 999,
    '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","whatsapp","maintenance"]'::JSONB,
    '["All Professional features","WhatsApp interactive checklists","Machine startup reminders","Preventive maintenance (PM)","Unlimited users","Dedicated account manager","Custom integrations on request"]'::JSONB,
    TRUE, FALSE, 4, 0
)
ON CONFLICT (slug) DO UPDATE SET
    name          = EXCLUDED.name,
    tagline       = EXCLUDED.tagline,
    description   = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly  = EXCLUDED.price_yearly,
    max_users     = EXCLUDED.max_users,
    modules       = EXCLUDED.modules,
    features      = EXCLUDED.features,
    is_active     = EXCLUDED.is_active,
    is_featured   = EXCLUDED.is_featured,
    display_order = EXCLUDED.display_order,
    trial_days    = EXCLUDED.trial_days;


-- ============================================================
-- SECTION 8: CREATE SUBSCRIPTION FOR DEFAULT TENANT
-- Tenant #1 (KINTO) gets an enterprise subscription.
-- ============================================================

INSERT INTO subscriptions (
    tenant_id, plan_id, plan_slug, billing_cycle, status, started_at
)
SELECT
    1,
    sp.id,
    'enterprise',
    'monthly',
    'active',
    NOW()
FROM subscription_plans sp
WHERE sp.slug = 'enterprise'
ON CONFLICT (tenant_id) DO NOTHING;

-- Log the initial billing event
INSERT INTO billing_events (
    tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, notes, created_by, created_at
)
SELECT
    1, 'plan_activated', NULL, 'enterprise', 'monthly', 0,
    'Default enterprise plan assigned to primary KINTO tenant', 'system', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM billing_events WHERE tenant_id = 1 AND event_type = 'plan_activated'
);


-- ============================================================
-- SECTION 9: VERIFICATION QUERIES
-- ============================================================

SELECT 'tenants' AS table_name, COUNT(*) AS row_count FROM tenants
UNION ALL
SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'billing_events', COUNT(*) FROM billing_events;

SELECT 'SaaS multitenancy tables created/verified successfully!' AS status;

-- ============================================================
-- END OF SCRIPT
-- ============================================================
