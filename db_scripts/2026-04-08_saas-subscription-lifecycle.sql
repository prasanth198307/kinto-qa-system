-- ============================================================
-- SaaS Subscription Lifecycle: unique constraint + price fix
-- Date: 2026-04-08
-- Safe to re-run
-- ============================================================

-- 1. Ensure only one subscription row per tenant (required for ON CONFLICT upsert)
ALTER TABLE subscriptions ADD CONSTRAINT IF NOT EXISTS subscriptions_tenant_id_unique UNIQUE (tenant_id);

-- 2. Fix subscription_plans prices that were seeded 10x too high.
--    All prices are in paise (100 paise = 1 INR).
--    Basic = ₹299/mo, Professional = ₹699/mo, Enterprise = ₹1499/mo
UPDATE subscription_plans
SET price_monthly = 29900, price_yearly = 299000
WHERE slug = 'basic' AND price_monthly > 30000;

UPDATE subscription_plans
SET price_monthly = 69900, price_yearly = 699000
WHERE slug = 'professional' AND price_monthly > 70000;

UPDATE subscription_plans
SET price_monthly = 149900, price_yearly = 1499000
WHERE slug = 'enterprise' AND price_monthly > 150000;

SELECT slug, price_monthly, price_yearly FROM subscription_plans ORDER BY id;

SELECT 'Subscription lifecycle constraints and price corrections applied' AS result;
