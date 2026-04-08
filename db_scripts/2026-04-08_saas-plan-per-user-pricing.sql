-- ============================================================
-- ADD PER-USER ADD-ON PRICING TO SUBSCRIPTION PLANS
-- Adds base_users and per_user_price columns to support the
-- per-user add-on billing model where each plan includes a set
-- number of base users and charges per extra user beyond that.
--
-- Also updates plan pricing and user limits to the correct
-- production values (₹999 / ₹1,499 / ₹2,599 per month).
-- All prices stored in paise (INR × 100).
-- ============================================================

-- ── 1. Add new columns (idempotent) ──────────────────────────
ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS base_users     INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS per_user_price INTEGER NOT NULL DEFAULT 0;

-- ── 2. Update Trial plan ──────────────────────────────────────
UPDATE subscription_plans SET
    price_monthly   = 0,
    price_yearly    = 0,
    max_users       = 5,
    base_users      = 0,
    per_user_price  = 0,
    tagline         = 'Explore Kinto Smart Ops free for 14 days',
    trial_days      = 14,
    display_order   = 0,
    modules         = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders"]',
    features        = '["14-day free trial","Up to 5 users","Core modules only","Email support"]'
WHERE slug = 'trial';

-- ── 3. Update Basic plan ──────────────────────────────────────
-- ₹999/month · ₹9,990/year (2 months free) · 5 base users · ₹150/extra · max 50
UPDATE subscription_plans SET
    price_monthly   = 99900,
    price_yearly    = 999000,
    max_users       = 50,
    base_users      = 5,
    per_user_price  = 15000,
    tagline         = 'For small manufacturing units',
    trial_days      = 0,
    is_featured     = FALSE,
    display_order   = 1,
    modules         = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","expenses","documents"]',
    features        = '[
        "5 users included",
        "+₹150/extra user/month (max 50)",
        "GST-compliant invoicing",
        "Purchase & sales orders",
        "Inventory management",
        "Gatepass management",
        "Expense tracking",
        "Document management",
        "Email support"
    ]'
WHERE slug = 'basic';

-- ── 4. Update Professional plan ───────────────────────────────
-- ₹1,499/month · ₹14,990/year (2 months free) · 15 base users · ₹100/extra · max 100
UPDATE subscription_plans SET
    price_monthly   = 149900,
    price_yearly    = 1499000,
    max_users       = 100,
    base_users      = 15,
    per_user_price  = 10000,
    tagline         = 'For growing manufacturers',
    trial_days      = 0,
    is_featured     = TRUE,
    display_order   = 2,
    modules         = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","whatsapp","maintenance"]',
    features        = '[
        "15 users included",
        "+₹100/extra user/month (max 100)",
        "Everything in Basic",
        "Production & BOM management",
        "Quality control & returns",
        "Double-entry accounting",
        "Preventive maintenance",
        "WhatsApp integration",
        "MIS analytics dashboard",
        "Priority support"
    ]'
WHERE slug = 'professional';

-- ── 5. Update Enterprise plan ─────────────────────────────────
-- ₹2,599/month · ₹25,990/year (2 months free) · 20 base users · ₹130/extra · max 200
UPDATE subscription_plans SET
    price_monthly   = 259900,
    price_yearly    = 2599000,
    max_users       = 200,
    base_users      = 20,
    per_user_price  = 13000,
    tagline         = 'For large operations and multi-plant',
    trial_days      = 0,
    is_featured     = FALSE,
    display_order   = 3,
    modules         = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","whatsapp","maintenance"]',
    features        = '[
        "20 users included",
        "+₹130/extra user/month (max 200)",
        "Everything in Professional",
        "White-labeling & custom branding",
        "Advanced MIS & analytics",
        "Dedicated account manager",
        "SLA guarantee",
        "Data export & backups"
    ]'
WHERE slug = 'enterprise';
