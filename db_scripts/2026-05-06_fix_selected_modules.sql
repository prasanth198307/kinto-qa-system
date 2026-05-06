-- Fix selected_modules for all tenants with subscription rows
-- Run this on production after restarting the server

-- KINTO (enterprise) — all 24 enterprise catalog modules
UPDATE subscriptions
SET selected_modules = '[
  "invoicing","accounting","expense_claims","tds_management",
  "inventory","purchase","warehouses","gatepasses",
  "production","quality","maintenance","projects",
  "hr_payroll","attendance","ess","appraisals",
  "crm","sales",
  "healthcare","education","logistics","real_estate","pos","agriculture"
]'::jsonb,
monthly_amount = 0
WHERE tenant_id = 1;

-- Trial tenants (Test Corp=4, Alpha Industries=5) — all trial catalog modules
UPDATE subscriptions
SET selected_modules = '[
  "invoicing","accounting","expense_claims",
  "inventory","purchase","warehouses","gatepasses",
  "production","quality","maintenance","projects",
  "hr_payroll","attendance","ess",
  "crm","sales",
  "healthcare","education","logistics","real_estate","pos","agriculture"
]'::jsonb,
monthly_amount = 0
WHERE tenant_id IN (4, 5);

-- Microgrid (hr_connect) — HR modules only
UPDATE subscriptions
SET selected_modules = '["hr_payroll","attendance","ess","appraisals"]'::jsonb,
monthly_amount = 0
WHERE tenant_id = 12;

SELECT t.id, t.name, COALESCE(s.plan_slug, t.plan) as plan,
       jsonb_array_length(s.selected_modules) as mod_count
FROM tenants t
LEFT JOIN subscriptions s ON s.tenant_id = t.id
WHERE s.tenant_id IS NOT NULL
ORDER BY t.id;
