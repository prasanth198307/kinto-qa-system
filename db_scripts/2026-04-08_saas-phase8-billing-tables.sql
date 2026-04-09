-- ============================================================
-- SaaS Phase 8: Billing tables — subscription plans,
--               active subscriptions, and billing event log
-- Date: 2026-04-08
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================

-- 1. Subscription Plans (plan catalogue — one row per tier)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  slug          VARCHAR(50)   NOT NULL UNIQUE,
  tagline       VARCHAR(255),
  description   TEXT,
  price_monthly INTEGER       NOT NULL DEFAULT 0,   -- in paise (INR)
  price_yearly  INTEGER       NOT NULL DEFAULT 0,   -- in paise (INR)
  max_users     INTEGER       NOT NULL DEFAULT 5,
  modules       JSONB                  DEFAULT '[]',
  features      JSONB                  DEFAULT '[]',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  is_featured   BOOLEAN       NOT NULL DEFAULT FALSE,
  display_order INTEGER       NOT NULL DEFAULT 0,
  trial_days    INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMP              DEFAULT NOW(),
  updated_at    TIMESTAMP              DEFAULT NOW()
);

-- 2. Seed plan catalogue
-- Prices are in paise (1 INR = 100 paise).
-- Basic = ₹299/mo, Professional = ₹699/mo, Enterprise = ₹1499/mo
INSERT INTO subscription_plans (id, slug, name, tagline, price_monthly, price_yearly, max_users, trial_days, is_active, is_featured, display_order, features)
VALUES
  (1, 'trial',        'Trial',        'Try before you buy',          0,      0,        5,   14, TRUE,  FALSE, 1,
   '["Up to 5 users","GST Invoicing","Purchase Orders","Inventory Management","14-day free trial","Email support"]'),
  (2, 'basic',        'Basic',        'Perfect for small businesses', 29900,  299000,   10,  0,  TRUE,  FALSE, 2,
   '["Up to 10 users","GST Invoicing & Credit Notes","Purchase Orders & Vendor Management","Inventory Management","Gatepasses & Dispatch Tracking","Sales Orders","Email + Phone support"]'),
  (3, 'professional', 'Professional', 'For growing manufacturers',    69900,  699000,   25,  0,  TRUE,  TRUE,  3,
   '["Up to 25 users","Everything in Basic","Production & BOM Management","Quality Control & Returns","Double-Entry Accounting & Ledger","MIS Analytics Dashboard","Expense & Cash Register","Document Management","Priority support"]'),
  (4, 'enterprise',   'Enterprise',   'For large-scale operations',   149900, 1499000,  100, 0,  TRUE,  FALSE, 4,
   '["Unlimited users (up to 100)","Everything in Professional","WhatsApp Checklist Integration","Machine Startup Reminders","Preventive Maintenance (PM)","Custom branding & white-labeling","Dedicated account manager","SLA-backed support"]')
ON CONFLICT (id) DO NOTHING;

SELECT setval('subscription_plans_id_seq', GREATEST(4, (SELECT MAX(id) FROM subscription_plans)));

-- 3. Fix any pre-existing plans that were seeded with 10x wrong prices
-- (Previous seed incorrectly stored 299900 instead of 29900 for basic, etc.)
UPDATE subscription_plans SET price_monthly = 29900,  price_yearly = 299000  WHERE slug = 'basic'        AND price_monthly = 299900;
UPDATE subscription_plans SET price_monthly = 69900,  price_yearly = 699000  WHERE slug = 'professional' AND price_monthly = 699900;
UPDATE subscription_plans SET price_monthly = 149900, price_yearly = 1499000 WHERE slug = 'enterprise'   AND price_monthly = 1499900;

-- 4. Active Subscriptions (one row per tenant — tracks current billing period)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   SERIAL PRIMARY KEY,
  tenant_id            INTEGER       NOT NULL,
  plan_id              INTEGER       NOT NULL,
  plan_slug            VARCHAR(50)   NOT NULL,
  billing_cycle        VARCHAR(20)   NOT NULL DEFAULT 'monthly', -- monthly | yearly
  status               VARCHAR(30)   NOT NULL DEFAULT 'active',  -- active | cancelled | expired | trial | pending
  started_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMP,
  current_period_end   TIMESTAMP,    -- when the paid period ends
  trial_ends_at        TIMESTAMP,
  cancelled_at         TIMESTAMP,    -- set when customer cancels; plan stays active until current_period_end
  cancel_reason        TEXT,
  notes                TEXT,
  created_at           TIMESTAMP     DEFAULT NOW(),
  updated_at           TIMESTAMP     DEFAULT NOW()
);

-- Unique: one subscription record per tenant (upserted on payment)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_tenant_id_unique'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tenant_id_unique UNIQUE (tenant_id);
  END IF;
END $$;

-- 5. Billing Events (immutable audit log of every plan change and payment)
-- event_type values: trial_started | plan_activated | plan_upgraded | plan_downgraded |
--                    subscription_renewed | subscription_cancelled | subscription_expired |
--                    upgrade_requested | payment_received
CREATE TABLE IF NOT EXISTS billing_events (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER       NOT NULL,
  subscription_id INTEGER,
  event_type      VARCHAR(50)   NOT NULL,
  from_plan       VARCHAR(50),
  to_plan         VARCHAR(50),
  billing_cycle   VARCHAR(20),
  amount          INTEGER       NOT NULL DEFAULT 0,   -- in paise
  currency        VARCHAR(10)   DEFAULT 'INR',
  notes           TEXT,
  metadata        JSONB         DEFAULT '{}',
  created_by      VARCHAR(255),
  created_at      TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_id  ON billing_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events (created_at DESC);

SELECT 'Billing tables ready: subscription_plans, subscriptions, billing_events' AS result;
