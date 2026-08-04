-- Fix currency_symbol for regional restaurant QA tenants
-- Previously all had ₹ (INR symbol) incorrectly in seed data

UPDATE tenants SET currency_symbol = 'د.إ' WHERE slug = 'qa-rst-ae';
UPDATE tenants SET currency_symbol = 'A$'  WHERE slug = 'qa-rst-au';
UPDATE tenants SET currency_symbol = '€'   WHERE slug = 'qa-rst-eu';
UPDATE tenants SET currency_symbol = 'S$'  WHERE slug = 'qa-rst-sg';
UPDATE tenants SET currency_symbol = '$'   WHERE slug = 'qa-rst-us';
