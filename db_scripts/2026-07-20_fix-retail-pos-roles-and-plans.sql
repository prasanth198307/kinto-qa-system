-- 2026-07-20: Fix Retail/POS QA user roles and subscription_plans modules
-- Fixes COALESCE(r.name, u.role) override by setting role_id=NULL and correct users.role

-- ── 1. Enterprise tenant (8100) specialist user role fixes ───────────────────
UPDATE users SET role = 'reviewer', role_id = NULL
WHERE username = 'qa_rtl_stock_clerk' AND tenant_id = 8100;

UPDATE users SET role = 'manager', role_id = NULL
WHERE username = 'qa_rtl_hr' AND tenant_id = 8100;

UPDATE users SET role = 'operator', role_id = NULL
WHERE username = 'qa_rtl_crm' AND tenant_id = 8100;

UPDATE users SET role = 'manager', role_id = NULL
WHERE username = 'qa_rtl_sales' AND tenant_id = 8100;

UPDATE users SET role = 'reviewer', role_id = NULL
WHERE username = 'qa_rtl_mis' AND tenant_id = 8100;

UPDATE users SET role = 'manager', role_id = NULL
WHERE username = 'qa_rtl_wh' AND tenant_id = 8100;

UPDATE users SET role = 'manager', role_id = NULL
WHERE username = 'qa_rtl_prod' AND tenant_id = 8100;

UPDATE users SET role = 'manager', role_id = NULL
WHERE username = 'qa_rtl_assets' AND tenant_id = 8100;

-- ── 2. Professional tenant (8121) specialist user role fixes ─────────────────
UPDATE users SET role = 'operator', role_id = NULL
WHERE username = 'qa_rtl_p_crm' AND tenant_id = 8121;

UPDATE users SET role = 'reviewer', role_id = NULL
WHERE username = 'qa_rtl_p_mis' AND tenant_id = 8121;

UPDATE users SET role = 'manager', role_id = NULL
WHERE username = 'qa_rtl_p_hr' AND tenant_id = 8121;

-- ── 3. Starter tenant (8120) billing staff role fix ──────────────────────────
UPDATE users SET role = 'operator', role_id = NULL
WHERE username = 'qa_rtl_s_billing' AND tenant_id = 8120;

-- ── 4. Add production module to pos_enterprise plan ─────────────────────────
UPDATE subscription_plans
SET modules = modules || '["production"]'::jsonb
WHERE slug = 'pos_enterprise' AND NOT modules @> '["production"]'::jsonb;

-- ── 5. Add documents module to pos_starter plan ──────────────────────────────
UPDATE subscription_plans
SET modules = modules || '["documents"]'::jsonb
WHERE slug = 'pos_starter' AND NOT modules @> '["documents"]'::jsonb;

-- ── 7. Verify ─────────────────────────────────────────────────────────────────
SELECT username, tenant_id, role, role_id FROM users
WHERE username IN (
  'qa_rtl_stock_clerk','qa_rtl_hr','qa_rtl_crm','qa_rtl_sales',
  'qa_rtl_mis','qa_rtl_wh','qa_rtl_prod','qa_rtl_assets',
  'qa_rtl_p_crm','qa_rtl_p_mis','qa_rtl_p_hr','qa_rtl_s_billing'
) ORDER BY tenant_id, username;

SELECT slug, modules FROM subscription_plans
WHERE slug IN ('retail_enterprise','retail_professional','retail_starter');
