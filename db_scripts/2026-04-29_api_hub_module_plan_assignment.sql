-- ============================================================
--  API Hub — add as a separate plan module
--  Date: 2026-04-29
--  Safe to re-run (only appends if not already present)
--
--  Adds 'api_hub' module to Professional and Enterprise plans.
--  Basic and Trial plans intentionally excluded.
--
--  After running, the API Keys / Try It / Analytics features
--  will only appear in the sidebar for Professional & Enterprise
--  tenants. Super-admins can toggle it per-tenant from the
--  Billing / Plan management screen.
-- ============================================================

UPDATE subscription_plans
SET modules = modules || '["api_hub"]'::jsonb
WHERE name IN ('Professional', 'Enterprise')
  AND NOT (modules @> '["api_hub"]'::jsonb);
