-- Fix subscription_plans.modules to match PLAN_MODULES code constants
-- Issues found by test 21-plan-nav-validation:
--   1. restaurant_enterprise — DB missing 'production' and 'projects'
--   2. hotel_professional — DB has 'restaurant' (wrong vertical!), missing 'warehouses' and 'api_hub'

BEGIN;

-- Fix restaurant_enterprise: add missing production + projects
UPDATE subscription_plans
SET modules = (
  SELECT jsonb_agg(m ORDER BY m)
  FROM (
    SELECT jsonb_array_elements_text(modules) AS m
    UNION
    VALUES ('production'), ('projects')
  ) sub
)
WHERE slug = 'restaurant_enterprise';

-- Fix hotel_professional: remove restaurant module, add missing warehouses + api_hub
UPDATE subscription_plans
SET modules = (
  SELECT jsonb_agg(m ORDER BY m)
  FROM (
    SELECT m FROM jsonb_array_elements_text(modules) AS m
    WHERE m <> 'restaurant'
    UNION
    VALUES ('warehouses'), ('api_hub')
  ) sub
)
WHERE slug = 'hotel_professional';

COMMIT;

-- Verify
SELECT slug, modules::text FROM subscription_plans
WHERE slug IN ('restaurant_enterprise', 'hotel_professional')
ORDER BY slug;
