-- ============================================================
-- PHASE 5: SUBSCRIPTION PLANS CATALOG
-- Creates the subscription_plans table — the product catalog
-- that defines what each plan tier includes (modules, limits,
-- pricing). This is a global table, not per-tenant.
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR NOT NULL,
    slug           VARCHAR NOT NULL UNIQUE,
    tagline        VARCHAR,
    description    TEXT,
    price_monthly  INTEGER NOT NULL DEFAULT 0,   -- in paise (INR × 100)
    price_yearly   INTEGER NOT NULL DEFAULT 0,   -- in paise (INR × 100)
    max_users      INTEGER NOT NULL DEFAULT 5,
    modules        JSONB DEFAULT '[]',            -- list of module keys included
    features       JSONB DEFAULT '[]',            -- marketing feature bullet points
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
    display_order  INTEGER NOT NULL DEFAULT 0,
    trial_days     INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

-- ── Seed the four standard plan tiers ────────────────────────
INSERT INTO subscription_plans
    (name, slug, tagline, price_monthly, price_yearly, max_users, trial_days, is_featured, display_order, modules, features)
VALUES
(
    'Trial', 'trial',
    'Explore Kinto Smart Ops free for 14 days',
    0, 0, 3, 14, FALSE, 0,
    '["dashboard","inventory","invoicing"]',
    '["14-day free trial","Up to 3 users","Core modules only","Email support"]'
),
(
    'Basic', 'basic',
    'For small manufacturing units',
    29900, 299000, 10, 0, FALSE, 1,
    '["dashboard","inventory","invoicing","gatepasses","purchase-orders","sales-orders","vendors","reports"]',
    '["Up to 10 users","Invoicing & GST","Purchase & sales orders","Inventory management","Gatepass management","Email support"]'
),
(
    'Professional', 'professional',
    'For growing manufacturers',
    69900, 699000, 25, 0, TRUE, 2,
    '["dashboard","inventory","invoicing","gatepasses","purchase-orders","sales-orders","vendors","production","quality","accounting","maintenance","expenses","cash-register","documents","reports","mis","whatsapp"]',
    '["Up to 25 users","Everything in Basic","Production & BOM","Quality & returns","Double-entry accounting","Preventive maintenance","Expense tracking","WhatsApp integration","MIS analytics","Priority support"]'
),
(
    'Enterprise', 'enterprise',
    'For large operations & multi-plant',
    149900, 1499000, 100, 0, FALSE, 3,
    '["dashboard","inventory","invoicing","gatepasses","purchase-orders","sales-orders","vendors","production","quality","accounting","maintenance","expenses","cash-register","documents","reports","mis","whatsapp","tds","purchase-returns","spare-parts","scrap-management","advanced-reports"]',
    '["Unlimited users (up to 100)","Everything in Professional","TDS management","Purchase returns","Spare parts","Scrap management","Advanced MIS","White-labeling","Dedicated support","SLA guarantee"]'
)
ON CONFLICT (slug) DO NOTHING;
