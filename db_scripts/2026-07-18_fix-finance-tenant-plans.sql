-- Fix Finance ERP tenant plans — map generic plans → finance-specific plans
-- Tenants were seeded with generic plan names; tests expect finance_* plans

UPDATE tenants SET plan = 'finance_enterprise'   WHERE id IN (8300, 8322, 8323, 8324, 8325, 8326);
UPDATE tenants SET plan = 'finance_starter'       WHERE id = 8320;
UPDATE tenants SET plan = 'finance_professional'  WHERE id = 8321;
